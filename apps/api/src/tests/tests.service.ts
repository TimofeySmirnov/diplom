import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  LessonProgressStatus,
  LessonType,
  Prisma,
  QuestionType,
  TestAttemptStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubmitQuestionAnswerDto,
  SubmitTestAttemptDto,
} from './dto/submit-test-attempt.dto';
import { UpsertTestContentDto } from './dto/upsert-test-content.dto';

@Injectable()
export class TestsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLessonTestContentForTeacher(teacherId: string, lessonId: string) {
    await this.getOwnedTestLessonForTeacher(teacherId, lessonId);

    const testLesson = await this.prisma.testLesson.findUnique({
      where: { lessonId },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            description: true,
            isPublished: true,
            orderIndex: true,
            moduleId: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!testLesson) {
      throw new NotFoundException('Test lesson content not found');
    }

    return testLesson;
  }

  async upsertLessonTestContentForTeacher(
    teacherId: string,
    lessonId: string,
    dto: UpsertTestContentDto,
  ) {
    await this.getOwnedTestLessonForTeacher(teacherId, lessonId);
    this.validateTestContent(dto);

    await this.prisma.$transaction(async (tx) => {
      const attemptsCount = await tx.testAttempt.count({
        where: { testLessonId: lessonId },
      });

      if (attemptsCount > 0) {
        throw new BadRequestException(
          'Cannot edit test questions after students started attempts',
        );
      }

      await tx.testLesson.upsert({
        where: { lessonId },
        create: {
          lessonId,
          passingScore: dto.passingScore,
          allowMultipleAttempts: dto.allowMultipleAttempts ?? true,
          maxAttempts: dto.maxAttempts,
          timeLimitMinutes: dto.timeLimitMinutes,
        },
        update: {
          passingScore: dto.passingScore,
          allowMultipleAttempts: dto.allowMultipleAttempts ?? true,
          maxAttempts: dto.maxAttempts,
          timeLimitMinutes: dto.timeLimitMinutes,
        },
      });

      const existingQuestions = await tx.testQuestion.findMany({
        where: { testLessonId: lessonId },
        select: { id: true },
      });

      const existingQuestionIds = existingQuestions.map((item) => item.id);
      if (existingQuestionIds.length > 0) {
        await tx.testQuestionOption.deleteMany({
          where: {
            questionId: {
              in: existingQuestionIds,
            },
          },
        });

        await tx.testQuestion.deleteMany({
          where: {
            id: {
              in: existingQuestionIds,
            },
          },
        });
      }

      for (let questionIndex = 0; questionIndex < dto.questions.length; questionIndex += 1) {
        const question = dto.questions[questionIndex];
        const createdQuestion = await tx.testQuestion.create({
          data: {
            testLessonId: lessonId,
            text: question.text,
            explanation: question.explanation,
            type: question.type,
            order: questionIndex + 1,
            points: question.points ?? 1,
          },
        });

        await tx.testQuestionOption.createMany({
          data: question.options.map((option, optionIndex) => ({
            questionId: createdQuestion.id,
            text: option.text,
            isCorrect: option.isCorrect,
            order: optionIndex + 1,
          })),
        });
      }
    });

    return this.getLessonTestContentForTeacher(teacherId, lessonId);
  }

  async getStudentTestForPassing(studentId: string, lessonId: string) {
    const context = await this.getStudentTestContext(studentId, lessonId);

    const questions = await this.prisma.testQuestion.findMany({
      where: {
        testLessonId: lessonId,
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        text: true,
        explanation: true,
        type: true,
        order: true,
        points: true,
        options: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            order: true,
          },
        },
      },
    });

    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        studentId,
        testLessonId: lessonId,
      },
      orderBy: { attemptNumber: 'desc' },
      select: {
        id: true,
        attemptNumber: true,
        status: true,
        score: true,
        maxScore: true,
        scorePercent: true,
        isPassed: true,
        startedAt: true,
        submittedAt: true,
      },
    });

    return {
      lesson: {
        id: context.testLesson.lesson.id,
        title: context.testLesson.lesson.title,
        description: context.testLesson.lesson.description,
        module: {
          id: context.testLesson.lesson.module.id,
          title: context.testLesson.lesson.module.title,
          courseId: context.testLesson.lesson.module.course.id,
          courseTitle: context.testLesson.lesson.module.course.title,
        },
      },
      settings: {
        passingScore: context.testLesson.passingScore,
        allowMultipleAttempts: context.testLesson.allowMultipleAttempts,
        maxAttempts: context.testLesson.maxAttempts,
        timeLimitMinutes: context.testLesson.timeLimitMinutes,
      },
      questions,
      attempts,
    };
  }

  async startAttempt(studentId: string, lessonId: string) {
    const context = await this.getStudentTestContext(studentId, lessonId);

    const existingInProgress = await this.prisma.testAttempt.findFirst({
      where: {
        studentId,
        testLessonId: lessonId,
        status: TestAttemptStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existingInProgress) {
      return existingInProgress;
    }

    const questionsCount = await this.prisma.testQuestion.count({
      where: {
        testLessonId: lessonId,
      },
    });

    if (questionsCount === 0) {
      throw new BadRequestException('Test has no questions yet');
    }

    const attemptsCount = await this.prisma.testAttempt.count({
      where: {
        studentId,
        testLessonId: lessonId,
      },
    });

    if (!context.testLesson.allowMultipleAttempts && attemptsCount > 0) {
      throw new BadRequestException('Multiple attempts are not allowed for this test');
    }

    if (
      context.testLesson.maxAttempts !== null &&
      context.testLesson.maxAttempts !== undefined &&
      attemptsCount >= context.testLesson.maxAttempts
    ) {
      throw new BadRequestException('Maximum number of attempts reached');
    }

    const attempt = await this.prisma.testAttempt.create({
      data: {
        testLessonId: lessonId,
        studentId,
        enrollmentId: context.enrollment.id,
        attemptNumber: attemptsCount + 1,
        status: TestAttemptStatus.IN_PROGRESS,
      },
    });

    const now = new Date();
    const existingProgress = await this.prisma.lessonProgress.findUnique({
      where: {
        studentId_lessonId: {
          studentId,
          lessonId,
        },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
      },
    });

    if (!existingProgress) {
      await this.prisma.lessonProgress.create({
        data: {
          enrollmentId: context.enrollment.id,
          studentId,
          lessonId,
          status: LessonProgressStatus.IN_PROGRESS,
          startedAt: now,
          lastViewedAt: now,
        },
      });
    } else if (existingProgress.status !== LessonProgressStatus.COMPLETED) {
      await this.prisma.lessonProgress.update({
        where: { id: existingProgress.id },
        data: {
          status: LessonProgressStatus.IN_PROGRESS,
          startedAt: existingProgress.startedAt ?? now,
          lastViewedAt: now,
        },
      });
    } else {
      await this.prisma.lessonProgress.update({
        where: { id: existingProgress.id },
        data: {
          lastViewedAt: now,
        },
      });
    }

    return attempt;
  }

  async submitAttempt(
    studentId: string,
    attemptId: string,
    dto: SubmitTestAttemptDto,
  ) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        testLesson: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { options: true },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Test attempt not found');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('You can submit only your own attempts');
    }

    if (attempt.status === TestAttemptStatus.SUBMITTED) {
      throw new BadRequestException('This attempt is already submitted');
    }

    const scoreResult = this.calculateScore(attempt.testLesson.questions, dto.answers);

    return this.prisma.$transaction(async (tx) => {
      await tx.testAttemptAnswer.deleteMany({
        where: { attemptId: attempt.id },
      });

      for (const answerResult of scoreResult.answerResults) {
        const createdAnswer = await tx.testAttemptAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: answerResult.questionId,
            isCorrect: answerResult.isCorrect,
            pointsAwarded: answerResult.pointsAwarded,
          },
        });

        if (answerResult.optionIds.length > 0) {
          await tx.testAttemptAnswerOption.createMany({
            data: answerResult.optionIds.map((optionId) => ({
              attemptAnswerId: createdAnswer.id,
              optionId,
            })),
          });
        }
      }

      const updatedAttempt = await tx.testAttempt.update({
        where: { id: attempt.id },
        data: {
          status: TestAttemptStatus.SUBMITTED,
          submittedAt: new Date(),
          score: scoreResult.score,
          maxScore: scoreResult.maxScore,
          scorePercent: scoreResult.scorePercent,
          isPassed:
            attempt.testLesson.passingScore === null ||
            scoreResult.score >= attempt.testLesson.passingScore,
        },
        include: {
          answers: {
            include: {
              selectedOptions: true,
            },
          },
        },
      });

      const existingProgress = await tx.lessonProgress.findUnique({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId: attempt.testLessonId,
          },
        },
      });

      const hasBetterScore =
        existingProgress?.bestTestScore === null ||
        existingProgress?.bestTestScore === undefined ||
        scoreResult.score > existingProgress.bestTestScore;

      await tx.lessonProgress.upsert({
        where: {
          studentId_lessonId: {
            studentId,
            lessonId: attempt.testLessonId,
          },
        },
        create: {
          enrollmentId: attempt.enrollmentId,
          studentId,
          lessonId: attempt.testLessonId,
          status: LessonProgressStatus.COMPLETED,
          startedAt: attempt.startedAt,
          lastViewedAt: new Date(),
          completedAt: new Date(),
          attemptsCount: 1,
          bestTestScore: scoreResult.score,
          bestTestMaxScore: scoreResult.maxScore,
        },
        update: {
          status: LessonProgressStatus.COMPLETED,
          lastViewedAt: new Date(),
          completedAt: new Date(),
          attemptsCount: { increment: 1 },
          bestTestScore: hasBetterScore
            ? scoreResult.score
            : existingProgress?.bestTestScore,
          bestTestMaxScore: hasBetterScore
            ? scoreResult.maxScore
            : existingProgress?.bestTestMaxScore,
        },
      });

      const result = this.buildResultPayload(
        attempt.testLesson.questions,
        scoreResult.answerResults,
      );

      return {
        attempt: updatedAttempt,
        result: {
          score: scoreResult.score,
          maxScore: scoreResult.maxScore,
          scorePercent: scoreResult.scorePercent,
          isPassed:
            attempt.testLesson.passingScore === null ||
            scoreResult.score >= attempt.testLesson.passingScore,
          questions: result,
        },
      };
    });
  }

  async listMyAttempts(studentId: string, lessonId: string) {
    return this.prisma.testAttempt.findMany({
      where: {
        studentId,
        testLessonId: lessonId,
      },
      orderBy: { attemptNumber: 'desc' },
      include: {
        answers: {
          include: {
            selectedOptions: {
              include: {
                option: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
            question: {
              select: {
                id: true,
                text: true,
                explanation: true,
                type: true,
                points: true,
              },
            },
          },
        },
      },
    });
  }

  async getAttemptResult(studentId: string, attemptId: string) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        testLesson: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        answers: {
          include: {
            selectedOptions: {
              include: {
                option: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
            question: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('You can view only your own attempt results');
    }

    if (attempt.status !== TestAttemptStatus.SUBMITTED) {
      throw new BadRequestException('Attempt is not submitted yet');
    }

    const answersMap = new Map(
      attempt.answers.map((answer) => [
        answer.questionId,
        {
          isCorrect: answer.isCorrect,
          pointsAwarded: answer.pointsAwarded,
          selectedOptionIds: answer.selectedOptions.map((item) => item.option.id),
        },
      ]),
    );

    return {
      attempt: {
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        score: attempt.score,
        maxScore: attempt.maxScore,
        scorePercent: attempt.scorePercent,
        isPassed: attempt.isPassed,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      },
      lesson: {
        id: attempt.testLesson.lesson.id,
        title: attempt.testLesson.lesson.title,
        description: attempt.testLesson.lesson.description,
        moduleTitle: attempt.testLesson.lesson.module.title,
        courseId: attempt.testLesson.lesson.module.course.id,
        courseTitle: attempt.testLesson.lesson.module.course.title,
      },
      questions: attempt.testLesson.questions.map((question) => {
        const answer = answersMap.get(question.id);
        const correctOptionIds = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id);

        return {
          questionId: question.id,
          text: question.text,
          explanation: question.explanation,
          type: question.type,
          points: question.points,
          isCorrect: answer?.isCorrect ?? false,
          pointsAwarded: answer?.pointsAwarded ?? 0,
          selectedOptionIds: answer?.selectedOptionIds ?? [],
          correctOptionIds,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
          })),
        };
      }),
    };
  }

  async listLessonAttemptsForTeacher(teacherId: string, lessonId: string) {
    await this.getOwnedTestLessonForTeacher(teacherId, lessonId);

    return this.prisma.testAttempt.findMany({
      where: {
        testLessonId: lessonId,
      },
      orderBy: [{ attemptNumber: 'desc' }, { submittedAt: 'desc' }],
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  private async getStudentTestContext(studentId: string, lessonId: string) {
    const testLesson = await this.prisma.testLesson.findUnique({
      where: { lessonId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!testLesson) {
      throw new NotFoundException('Test lesson not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: testLesson.lesson.module.course.id,
          studentId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    if (!testLesson.lesson.isPublished) {
      throw new ForbiddenException('Test lesson is not published');
    }

    return { testLesson, enrollment };
  }

  private calculateScore(
    questions: Array<
      Prisma.TestQuestionGetPayload<{
        include: { options: true };
      }>
    >,
    answers: SubmitQuestionAnswerDto[],
  ) {
    const answersMap = new Map(
      answers.map((item) => [item.questionId, Array.from(new Set(item.optionIds))]),
    );

    const answerResults = questions.map((question) => {
      const selectedOptionIds =
        answersMap.get(question.id)?.filter((id) =>
          question.options.some((option) => option.id === id),
        ) ?? [];

      const correctOptionIds = question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.id)
        .sort();

      const submittedSorted = [...selectedOptionIds].sort();

      const isCorrect =
        submittedSorted.length === correctOptionIds.length &&
        submittedSorted.every((optionId, index) => optionId === correctOptionIds[index]);

      const pointsAwarded = isCorrect ? question.points : 0;

      return {
        questionId: question.id,
        optionIds: selectedOptionIds,
        isCorrect,
        pointsAwarded,
      };
    });

    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
    const score = answerResults.reduce((sum, answer) => sum + answer.pointsAwarded, 0);
    const scorePercent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);

    return {
      maxScore,
      score,
      scorePercent,
      answerResults,
    };
  }

  private validateTestContent(dto: UpsertTestContentDto) {
    for (let i = 0; i < dto.questions.length; i += 1) {
      const question = dto.questions[i];
      const correctCount = question.options.filter((option) => option.isCorrect).length;

      if (correctCount === 0) {
        throw new BadRequestException(
          `Question ${i + 1} must have at least one correct option`,
        );
      }

      if (question.type === QuestionType.SINGLE_CHOICE && correctCount !== 1) {
        throw new BadRequestException(
          `Question ${i + 1} must have exactly one correct option`,
        );
      }

      if (question.type === QuestionType.MULTIPLE_CHOICE && correctCount < 2) {
        throw new BadRequestException(
          `Question ${i + 1} must have at least two correct options`,
        );
      }
    }
  }

  private buildResultPayload(
    questions: Array<
      Prisma.TestQuestionGetPayload<{
        include: { options: true };
      }>
    >,
    answerResults: Array<{
      questionId: string;
      optionIds: string[];
      isCorrect: boolean;
      pointsAwarded: number;
    }>,
  ) {
    const answerMap = new Map(
      answerResults.map((answer) => [answer.questionId, answer]),
    );

    return questions.map((question) => {
      const answer = answerMap.get(question.id);
      const correctOptionIds = question.options
        .filter((option) => option.isCorrect)
        .map((option) => option.id);

      return {
        questionId: question.id,
        text: question.text,
        explanation: question.explanation,
        type: question.type,
        points: question.points,
        pointsAwarded: answer?.pointsAwarded ?? 0,
        isCorrect: answer?.isCorrect ?? false,
        selectedOptionIds: answer?.optionIds ?? [],
        correctOptionIds,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      };
    });
  }

  private async getOwnedTestLessonForTeacher(teacherId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              select: {
                teacherId: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.type !== LessonType.TEST) {
      throw new BadRequestException('Lesson is not a test lesson');
    }

    if (lesson.module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You can manage tests only in your own courses');
    }

    return lesson;
  }
}
