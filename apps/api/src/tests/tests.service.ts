import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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

type MatchingPairItem = {
  leftId: string;
  left: string;
  rightId: string;
  right: string;
};

type OrderingItem = {
  id: string;
  text: string;
};

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

    return this.mapTeacherTestContent(testLesson);
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
        const prepared = this.prepareQuestionContentForPersistence(question);

        const createdQuestion = await tx.testQuestion.create({
          data: {
            testLessonId: lessonId,
            text: question.text,
            explanation: question.explanation,
            type: question.type,
            order: questionIndex + 1,
            points: question.points ?? 1,
            freeTextAcceptedAnswers: prepared.acceptedAnswers ?? undefined,
            matchingPairs: prepared.matchingPairs ?? undefined,
            orderingItems: prepared.orderingItems ?? undefined,
          },
        });

        if (prepared.options.length > 0) {
          await tx.testQuestionOption.createMany({
            data: prepared.options.map((option, optionIndex) => ({
              questionId: createdQuestion.id,
              text: option.text,
              isCorrect: option.isCorrect,
              order: optionIndex + 1,
            })),
          });
        }
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
        freeTextAcceptedAnswers: true,
        matchingPairs: true,
        orderingItems: true,
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

    const mappedQuestions = questions.map((question) => {
      if (question.type === QuestionType.MATCHING) {
        const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
        return {
          id: question.id,
          text: question.text,
          explanation: question.explanation,
          type: question.type,
          order: question.order,
          points: question.points,
          options: [] as Array<{ id: string; text: string; order: number }>,
          matchingLeftItems: matchingPairs.map((pair) => ({
            id: pair.leftId,
            text: pair.left,
          })),
          matchingRightItems: this.shuffleArray(
            matchingPairs.map((pair) => ({
              id: pair.rightId,
              text: pair.right,
            })),
          ),
        };
      }

      if (question.type === QuestionType.ORDERING) {
        const orderingItems = this.parseOrderingItems(question.orderingItems);
        return {
          id: question.id,
          text: question.text,
          explanation: question.explanation,
          type: question.type,
          order: question.order,
          points: question.points,
          options: [] as Array<{ id: string; text: string; order: number }>,
          orderingItems: this.shuffleArray(orderingItems),
        };
      }

      if (question.type === QuestionType.FREE_TEXT) {
        return {
          id: question.id,
          text: question.text,
          explanation: question.explanation,
          type: question.type,
          order: question.order,
          points: question.points,
          options: [] as Array<{ id: string; text: string; order: number }>,
        };
      }

      return {
        id: question.id,
        text: question.text,
        explanation: question.explanation,
        type: question.type,
        order: question.order,
        points: question.points,
        options: question.options,
      };
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
      questions: mappedQuestions,
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
            textAnswer: answerResult.textAnswer,
            matchingAnswer: answerResult.matchingPairs,
            orderingAnswer: answerResult.orderingItemIds,
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
          textAnswer: answer.textAnswer,
          matchingPairs: this.parseSubmittedMatchingPairs(answer.matchingAnswer),
          orderingItemIds: this.parseSubmittedOrderingItemIds(answer.orderingAnswer),
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
        const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
        const orderingItems = this.parseOrderingItems(question.orderingItems);
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
          selectedTextAnswer: answer?.textAnswer ?? null,
          acceptedAnswers:
            question.type === QuestionType.FREE_TEXT
              ? this.parseAcceptedAnswers(question.freeTextAcceptedAnswers)
              : [],
          selectedMatchingPairs:
            question.type === QuestionType.MATCHING
              ? this.expandMatchingSelection(
                  matchingPairs,
                  answer?.matchingPairs ?? [],
                )
              : [],
          correctMatchingPairs:
            question.type === QuestionType.MATCHING ? matchingPairs : [],
          selectedOrderingItemIds:
            question.type === QuestionType.ORDERING
              ? answer?.orderingItemIds ?? []
              : [],
          correctOrderingItemIds:
            question.type === QuestionType.ORDERING
              ? orderingItems.map((item) => item.id)
              : [],
          orderingItems:
            question.type === QuestionType.ORDERING ? orderingItems : [],
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
    const answersMap = new Map<string, SubmitQuestionAnswerDto>();
    for (const item of answers) {
      if (answersMap.has(item.questionId)) {
        throw new BadRequestException(
          `Duplicate answer for question ${item.questionId}`,
        );
      }
      answersMap.set(item.questionId, item);
    }

    const answerResults = questions.map((question) => {
      const submitted = answersMap.get(question.id);

      if (
        question.type === QuestionType.SINGLE_CHOICE ||
        question.type === QuestionType.MULTIPLE_CHOICE
      ) {
        const selectedOptionIds = Array.from(new Set(submitted?.optionIds ?? [])).filter((id) =>
          question.options.some((option) => option.id === id),
        );

        const correctOptionIds = question.options
          .filter((option) => option.isCorrect)
          .map((option) => option.id)
          .sort();

        const submittedSorted = [...selectedOptionIds].sort();
        const isCorrect =
          submittedSorted.length === correctOptionIds.length &&
          submittedSorted.every((optionId, index) => optionId === correctOptionIds[index]);

        return {
          questionId: question.id,
          optionIds: selectedOptionIds,
          textAnswer: null,
          matchingPairs: [] as Array<{ leftId: string; rightId: string }>,
          orderingItemIds: [] as string[],
          isCorrect,
          pointsAwarded: isCorrect ? question.points : 0,
        };
      }

      if (question.type === QuestionType.FREE_TEXT) {
        const acceptedAnswers = this.parseAcceptedAnswers(question.freeTextAcceptedAnswers);
        const normalizedAcceptedAnswers = new Set(
          acceptedAnswers.map((item) => this.normalizeComparableText(item)),
        );
        const textAnswer = submitted?.textAnswer?.trim() ?? '';
        const normalizedSubmitted = this.normalizeComparableText(textAnswer);
        const isCorrect =
          normalizedSubmitted.length > 0 &&
          normalizedAcceptedAnswers.has(normalizedSubmitted);

        return {
          questionId: question.id,
          optionIds: [] as string[],
          textAnswer,
          matchingPairs: [] as Array<{ leftId: string; rightId: string }>,
          orderingItemIds: [] as string[],
          isCorrect,
          pointsAwarded: isCorrect ? question.points : 0,
        };
      }

      if (question.type === QuestionType.MATCHING) {
        const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
        const normalizedSubmittedPairs = this.normalizeSubmittedMatchingPairs(
          submitted?.matchingPairs ?? [],
          matchingPairs,
        );
        const submittedMap = new Map(
          normalizedSubmittedPairs.map((pair) => [pair.leftId, pair.rightId]),
        );

        const isCorrect =
          submittedMap.size === matchingPairs.length &&
          matchingPairs.every((pair) => submittedMap.get(pair.leftId) === pair.rightId);

        return {
          questionId: question.id,
          optionIds: [] as string[],
          textAnswer: null,
          matchingPairs: normalizedSubmittedPairs,
          orderingItemIds: [] as string[],
          isCorrect,
          pointsAwarded: isCorrect ? question.points : 0,
        };
      }

      const orderingItems = this.parseOrderingItems(question.orderingItems);
      const normalizedOrderingItemIds = this.normalizeSubmittedOrderingItemIds(
        submitted?.orderingItemIds ?? [],
        orderingItems,
      );

      const expectedOrderIds = orderingItems.map((item) => item.id);
      const isCorrect =
        normalizedOrderingItemIds.length === expectedOrderIds.length &&
        normalizedOrderingItemIds.every((itemId, index) => itemId === expectedOrderIds[index]);

      return {
        questionId: question.id,
        optionIds: [] as string[],
        textAnswer: null,
        matchingPairs: [] as Array<{ leftId: string; rightId: string }>,
        orderingItemIds: normalizedOrderingItemIds,
        isCorrect,
        pointsAwarded: isCorrect ? question.points : 0,
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
      if (
        question.type === QuestionType.SINGLE_CHOICE ||
        question.type === QuestionType.MULTIPLE_CHOICE
      ) {
        const options = question.options ?? [];
        if (options.length < 2) {
          throw new BadRequestException(
            `Question ${i + 1} must have at least two options`,
          );
        }

        const hasEmptyOption = options.some((option) => option.text.trim().length === 0);
        if (hasEmptyOption) {
          throw new BadRequestException(
            `Question ${i + 1} has empty option text`,
          );
        }

        const correctCount = options.filter((option) => option.isCorrect).length;

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
        continue;
      }

      if (question.type === QuestionType.FREE_TEXT) {
        const acceptedAnswers = (question.acceptedAnswers ?? [])
          .map((item) => item.trim())
          .filter((item) => item.length > 0);

        if (acceptedAnswers.length === 0) {
          throw new BadRequestException(
            `Question ${i + 1} must have at least one accepted answer`,
          );
        }

        const normalized = acceptedAnswers.map((item) =>
          this.normalizeComparableText(item),
        );
        const hasDuplicates = new Set(normalized).size !== normalized.length;
        if (hasDuplicates) {
          throw new BadRequestException(
            `Question ${i + 1} has duplicated accepted answers`,
          );
        }
        continue;
      }

      if (question.type === QuestionType.MATCHING) {
        const pairs = question.matchingPairs ?? [];
        if (pairs.length < 2) {
          throw new BadRequestException(
            `Question ${i + 1} must have at least two matching pairs`,
          );
        }

        const normalizedLeft = pairs.map((pair) => this.normalizeComparableText(pair.left));
        const normalizedRight = pairs.map((pair) => this.normalizeComparableText(pair.right));
        if (
          normalizedLeft.some((item) => item.length === 0) ||
          normalizedRight.some((item) => item.length === 0)
        ) {
          throw new BadRequestException(
            `Question ${i + 1} has empty matching pair values`,
          );
        }

        if (new Set(normalizedLeft).size !== normalizedLeft.length) {
          throw new BadRequestException(
            `Question ${i + 1} has duplicated left matching values`,
          );
        }
        if (new Set(normalizedRight).size !== normalizedRight.length) {
          throw new BadRequestException(
            `Question ${i + 1} has duplicated right matching values`,
          );
        }
        continue;
      }

      if (question.type === QuestionType.ORDERING) {
        const orderingItems = question.orderingItems ?? [];
        if (orderingItems.length < 2) {
          throw new BadRequestException(
            `Question ${i + 1} must have at least two ordering items`,
          );
        }

        const normalizedItems = orderingItems.map((item) =>
          this.normalizeComparableText(item.text),
        );
        if (normalizedItems.some((item) => item.length === 0)) {
          throw new BadRequestException(
            `Question ${i + 1} has empty ordering item`,
          );
        }

        if (new Set(normalizedItems).size !== normalizedItems.length) {
          throw new BadRequestException(
            `Question ${i + 1} has duplicated ordering items`,
          );
        }
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
      textAnswer: string | null;
      matchingPairs: Array<{ leftId: string; rightId: string }>;
      orderingItemIds: string[];
      isCorrect: boolean;
      pointsAwarded: number;
    }>,
  ) {
    const answerMap = new Map(
      answerResults.map((answer) => [answer.questionId, answer]),
    );

    return questions.map((question) => {
      const answer = answerMap.get(question.id);
      const matchingPairs = this.parseMatchingPairs(question.matchingPairs);
      const orderingItems = this.parseOrderingItems(question.orderingItems);
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
        selectedTextAnswer: answer?.textAnswer ?? null,
        acceptedAnswers:
          question.type === QuestionType.FREE_TEXT
            ? this.parseAcceptedAnswers(question.freeTextAcceptedAnswers)
            : [],
        selectedMatchingPairs:
          question.type === QuestionType.MATCHING
            ? this.expandMatchingSelection(
                matchingPairs,
                answer?.matchingPairs ?? [],
              )
            : [],
        correctMatchingPairs:
          question.type === QuestionType.MATCHING ? matchingPairs : [],
        selectedOrderingItemIds:
          question.type === QuestionType.ORDERING
            ? answer?.orderingItemIds ?? []
            : [],
        correctOrderingItemIds:
          question.type === QuestionType.ORDERING
            ? orderingItems.map((item) => item.id)
            : [],
        orderingItems:
          question.type === QuestionType.ORDERING ? orderingItems : [],
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      };
    });
  }

  private mapTeacherTestContent(
    testLesson: Prisma.TestLessonGetPayload<{
      include: {
        lesson: {
          select: {
            id: true;
            title: true;
            description: true;
            isPublished: true;
            orderIndex: true;
            moduleId: true;
          };
        };
        questions: {
          include: {
            options: true;
          };
        };
      };
    }>,
  ) {
    return {
      lessonId: testLesson.lessonId,
      passingScore: testLesson.passingScore,
      allowMultipleAttempts: testLesson.allowMultipleAttempts,
      maxAttempts: testLesson.maxAttempts,
      timeLimitMinutes: testLesson.timeLimitMinutes,
      lesson: testLesson.lesson,
      questions: testLesson.questions.map((question) => ({
        id: question.id,
        text: question.text,
        explanation: question.explanation,
        type: question.type,
        order: question.order,
        points: question.points,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          order: option.order,
        })),
        acceptedAnswers:
          question.type === QuestionType.FREE_TEXT
            ? this.parseAcceptedAnswers(question.freeTextAcceptedAnswers)
            : [],
        matchingPairs:
          question.type === QuestionType.MATCHING
            ? this.parseMatchingPairs(question.matchingPairs)
            : [],
        orderingItems:
          question.type === QuestionType.ORDERING
            ? this.parseOrderingItems(question.orderingItems)
            : [],
      })),
    };
  }

  private prepareQuestionContentForPersistence(
    question: UpsertTestContentDto['questions'][number],
  ) {
    const options = (question.options ?? []).map((option) => ({
      text: option.text.trim(),
      isCorrect: option.isCorrect,
    }));

    const acceptedAnswers =
      question.type === QuestionType.FREE_TEXT
        ? this.uniqueNormalizedStrings(question.acceptedAnswers ?? [])
        : null;

    const matchingPairs =
      question.type === QuestionType.MATCHING
        ? (question.matchingPairs ?? []).map((pair) => ({
            leftId: pair.leftId ?? randomUUID(),
            left: pair.left.trim(),
            rightId: pair.rightId ?? randomUUID(),
            right: pair.right.trim(),
          }))
        : null;

    const orderingItems =
      question.type === QuestionType.ORDERING
        ? (question.orderingItems ?? []).map((item) => ({
            id: item.id ?? randomUUID(),
            text: item.text.trim(),
          }))
        : null;

    return {
      options:
        question.type === QuestionType.SINGLE_CHOICE ||
        question.type === QuestionType.MULTIPLE_CHOICE
          ? options
          : [],
      acceptedAnswers,
      matchingPairs,
      orderingItems,
    };
  }

  private parseAcceptedAnswers(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private parseMatchingPairs(value: Prisma.JsonValue | null): MatchingPairItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null;
        const record = item as Record<string, unknown>;
        const left = typeof record.left === 'string' ? record.left.trim() : '';
        const right = typeof record.right === 'string' ? record.right.trim() : '';
        const leftId =
          typeof record.leftId === 'string' && this.isUuid(record.leftId)
            ? record.leftId
            : null;
        const rightId =
          typeof record.rightId === 'string' && this.isUuid(record.rightId)
            ? record.rightId
            : null;

        if (!left || !right || !leftId || !rightId) {
          return null;
        }

        return {
          leftId,
          left,
          rightId,
          right,
        };
      })
      .filter((item): item is MatchingPairItem => Boolean(item));
  }

  private parseOrderingItems(value: Prisma.JsonValue | null): OrderingItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null;
        const record = item as Record<string, unknown>;
        const text = typeof record.text === 'string' ? record.text.trim() : '';
        const id =
          typeof record.id === 'string' && this.isUuid(record.id)
            ? record.id
            : null;

        if (!id || !text) {
          return null;
        }

        return {
          id,
          text,
        };
      })
      .filter((item): item is OrderingItem => Boolean(item));
  }

  private parseSubmittedMatchingPairs(
    value: Prisma.JsonValue | null,
  ): Array<{ leftId: string; rightId: string }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null;
        const record = item as Record<string, unknown>;
        const leftId =
          typeof record.leftId === 'string' && this.isUuid(record.leftId)
            ? record.leftId
            : null;
        const rightId =
          typeof record.rightId === 'string' && this.isUuid(record.rightId)
            ? record.rightId
            : null;
        if (!leftId || !rightId) return null;
        return { leftId, rightId };
      })
      .filter((item): item is { leftId: string; rightId: string } => Boolean(item));
  }

  private parseSubmittedOrderingItemIds(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private normalizeSubmittedMatchingPairs(
    submittedPairs: Array<{ leftId: string; rightId: string }>,
    matchingPairs: MatchingPairItem[],
  ) {
    const validLeftIds = new Set(matchingPairs.map((pair) => pair.leftId));
    const validRightIds = new Set(matchingPairs.map((pair) => pair.rightId));
    const seenLeftIds = new Set<string>();
    const normalizedPairs: Array<{ leftId: string; rightId: string }> = [];

    for (const pair of submittedPairs) {
      if (!validLeftIds.has(pair.leftId) || !validRightIds.has(pair.rightId)) {
        continue;
      }
      if (seenLeftIds.has(pair.leftId)) {
        continue;
      }
      seenLeftIds.add(pair.leftId);
      normalizedPairs.push(pair);
    }

    return normalizedPairs;
  }

  private normalizeSubmittedOrderingItemIds(
    submittedIds: string[],
    orderingItems: OrderingItem[],
  ) {
    const validIds = new Set(orderingItems.map((item) => item.id));
    const seenIds = new Set<string>();
    const normalizedIds: string[] = [];

    for (const id of submittedIds) {
      if (!validIds.has(id) || seenIds.has(id)) {
        continue;
      }
      seenIds.add(id);
      normalizedIds.push(id);
    }

    return normalizedIds;
  }

  private expandMatchingSelection(
    matchingPairs: MatchingPairItem[],
    selectedPairs: Array<{ leftId: string; rightId: string }>,
  ) {
    const selectedMap = new Map(selectedPairs.map((pair) => [pair.leftId, pair.rightId]));
    const rightById = new Map(
      matchingPairs.map((pair) => [pair.rightId, pair.right]),
    );

    return matchingPairs.map((pair) => {
      const selectedRightId = selectedMap.get(pair.leftId) ?? null;
      return {
        leftId: pair.leftId,
        left: pair.left,
        correctRightId: pair.rightId,
        correctRight: pair.right,
        selectedRightId,
        selectedRight:
          selectedRightId && rightById.has(selectedRightId)
            ? rightById.get(selectedRightId)
            : null,
      };
    });
  }

  private normalizeComparableText(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private uniqueNormalizedStrings(values: string[]) {
    const result: string[] = [];
    const seen = new Set<string>();

    for (const value of values) {
      const trimmed = value.trim();
      if (!trimmed) continue;

      const normalized = this.normalizeComparableText(trimmed);
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      result.push(trimmed);
    }

    return result;
  }

  private shuffleArray<T>(items: T[]) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
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
