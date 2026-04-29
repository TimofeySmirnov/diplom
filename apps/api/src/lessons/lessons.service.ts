import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, LessonType, Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTestContentDto } from '../tests/dto/upsert-test-content.dto';
import { TestsService } from '../tests/tests.service';
import { CreateLectureLessonDto } from './dto/create-lecture-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateWebinarLessonDto } from './dto/create-webinar-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLectureLessonDto } from './dto/update-lecture-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateWebinarLessonDto } from './dto/update-webinar-lesson.dto';
import {
  LESSON_TRANSFER_FORMAT,
  LESSON_TRANSFER_VERSION,
  LessonTransferPayload,
  TestLessonTransfer,
  TestQuestionTransfer,
} from './types/lesson-transfer.type';


const lessonInclude = {
  lecture: true,
  test: true,
  webinar: true,
} satisfies Prisma.LessonInclude;

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly testsService: TestsService,
  ) {}

  async createLecture(teacherId: string, dto: CreateLectureLessonDto) {
    return this.create(teacherId, {
      moduleId: dto.moduleId,
      type: LessonType.LECTURE,
      title: dto.title,
      description: dto.description,
      orderIndex: dto.orderIndex,
      isPublished: dto.isPublished ?? false,
      lecture: {
        content: dto.content,
      },
    });
  }

  async getLectureById(teacherId: string, lessonId: string) {
    const lesson = await this.getById(teacherId, lessonId);
    this.assertLectureType(lesson.type);

    if (!lesson.lecture) {
      throw new NotFoundException('Lecture content not found');
    }

    return lesson;
  }

  async updateLecture(
    teacherId: string,
    lessonId: string,
    dto: UpdateLectureLessonDto,
  ) {
    const lesson = await this.getOwnedLesson(teacherId, lessonId);
    this.assertLectureType(lesson.type);

    return this.update(teacherId, lessonId, {
      title: dto.title,
      description: dto.description,
      orderIndex: dto.orderIndex,
      isPublished: dto.isPublished,
      lecture:
        dto.content !== undefined
          ? {
              content: dto.content,
            }
          : undefined,
    });
  }

  async createWebinar(teacherId: string, dto: CreateWebinarLessonDto) {
    return this.create(teacherId, {
      moduleId: dto.moduleId,
      type: LessonType.WEBINAR,
      title: dto.title,
      description: dto.description,
      orderIndex: dto.orderIndex,
      isPublished: dto.isPublished ?? false,
      webinar: {
        meetingLink: dto.meetingLink,
        scheduledAt: dto.scheduledAt,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async getWebinarById(teacherId: string, lessonId: string) {
    const lesson = await this.getById(teacherId, lessonId);
    this.assertWebinarType(lesson.type);

    if (!lesson.webinar) {
      throw new NotFoundException('Webinar details not found');
    }

    return lesson;
  }

  async updateWebinar(
    teacherId: string,
    lessonId: string,
    dto: UpdateWebinarLessonDto,
  ) {
    const lesson = await this.getOwnedLesson(teacherId, lessonId);
    this.assertWebinarType(lesson.type);

    return this.update(teacherId, lessonId, {
      title: dto.title,
      description: dto.description,
      orderIndex: dto.orderIndex,
      isPublished: dto.isPublished,
      webinar: {
        meetingLink: dto.meetingLink,
        scheduledAt: dto.scheduledAt,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async getWebinarByIdForStudent(studentId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        webinar: true,
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    this.assertWebinarType(lesson.type);

    if (!lesson.webinar) {
      throw new NotFoundException('Webinar details not found');
    }

    if (!lesson.isPublished) {
      throw new ForbiddenException('Webinar is not published');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: lesson.module.courseId,
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

    const progress = await this.prisma.lessonProgress.findUnique({
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
        lastViewedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      lesson,
      progress,
    };
  }

  async getLectureByIdForStudent(studentId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        lecture: true,
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    this.assertLectureType(lesson.type);

    if (!lesson.lecture) {
      throw new NotFoundException('Lecture content not found');
    }

    if (!lesson.isPublished) {
      throw new ForbiddenException('Lecture is not published');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: lesson.module.courseId,
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

    const progress = await this.prisma.lessonProgress.findUnique({
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
        lastViewedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      lesson,
      progress,
    };
  }

  async listPublishedByModuleForStudent(studentId: string, moduleId: string) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      select: {
        courseId: true,
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: module.courseId,
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

    return this.prisma.lesson.findMany({
      where: {
        moduleId,
        isPublished: true,
      },
      orderBy: { orderIndex: 'asc' },
      include: lessonInclude,
    });
  }

  async listByModule(teacherId: string, moduleId: string) {
    await this.assertTeacherOwnsModule(teacherId, moduleId);

    return this.prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: 'asc' },
      include: lessonInclude,
    });
  }

  async getById(teacherId: string, lessonId: string) {
    await this.getOwnedLesson(teacherId, lessonId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: lessonInclude,
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async exportLesson(teacherId: string, lessonId: string): Promise<LessonTransferPayload> {
    await this.getOwnedLesson(teacherId, lessonId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        lecture: true,
        test: {
          include: {
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
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.type === LessonType.LECTURE) {
      if (!lesson.lecture) {
        throw new NotFoundException('Lecture content not found');
      }

      return {
        format: LESSON_TRANSFER_FORMAT,
        version: LESSON_TRANSFER_VERSION,
        lessonType: 'lecture',
        lesson: {
          title: lesson.title,
          description: lesson.description ?? undefined,
          orderIndex: lesson.orderIndex,
          isPublished: lesson.isPublished,
        },
        lecture: {
          content: lesson.lecture.content as Record<string, unknown>,
        },
      };
    }

    if (lesson.type === LessonType.TEST) {
      if (!lesson.test) {
        throw new NotFoundException('Test settings not found');
      }

      const questions = lesson.test.questions.map((question) =>
        this.mapTestQuestionToExport(question),
      );

      return {
        format: LESSON_TRANSFER_FORMAT,
        version: LESSON_TRANSFER_VERSION,
        lessonType: 'test',
        lesson: {
          title: lesson.title,
          description: lesson.description ?? undefined,
          orderIndex: lesson.orderIndex,
          isPublished: lesson.isPublished,
        },
        test: {
          settings: {
            passingScore: lesson.test.passingScore ?? undefined,
            allowMultipleAttempts: lesson.test.allowMultipleAttempts,
            maxAttempts: lesson.test.maxAttempts ?? undefined,
            timeLimitMinutes: lesson.test.timeLimitMinutes ?? undefined,
          },
          questions,
        },
      };
    }

    throw new BadRequestException(
      'Only lecture and test lessons can be exported',
    );
  }

  async importLessonToModule(
    teacherId: string,
    moduleId: string,
    payload: unknown,
  ) {
    await this.assertTeacherOwnsModule(teacherId, moduleId);
    const parsed = this.parseLessonTransferPayload(payload);

    if (parsed.lessonType === 'lecture') {
      return this.create(teacherId, {
        moduleId,
        type: LessonType.LECTURE,
        title: parsed.lesson.title,
        description: parsed.lesson.description,
        orderIndex: parsed.lesson.orderIndex,
        isPublished: parsed.lesson.isPublished ?? false,
        lecture: {
          content: parsed.lecture.content,
        },
      });
    }

    const created = await this.create(teacherId, {
      moduleId,
      type: LessonType.TEST,
      title: parsed.lesson.title,
      description: parsed.lesson.description,
      orderIndex: parsed.lesson.orderIndex,
      isPublished: parsed.lesson.isPublished ?? false,
      test: {
        passingScore: parsed.test.settings.passingScore,
        allowMultipleAttempts: parsed.test.settings.allowMultipleAttempts ?? true,
        maxAttempts: parsed.test.settings.maxAttempts,
        timeLimitMinutes: parsed.test.settings.timeLimitMinutes,
      },
    });

    const upsertDto: UpsertTestContentDto = {
      passingScore: parsed.test.settings.passingScore,
      allowMultipleAttempts: parsed.test.settings.allowMultipleAttempts ?? true,
      maxAttempts: parsed.test.settings.maxAttempts,
      timeLimitMinutes: parsed.test.settings.timeLimitMinutes,
      questions: parsed.test.questions.map((question) => ({
        text: question.text,
        explanation: question.explanation,
        type: question.type,
        points: question.points,
        options: question.options?.map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        })),
        acceptedAnswers: question.acceptedAnswers,
        matchingPairs: question.matchingPairs?.map((pair) => ({
          left: pair.left,
          right: pair.right,
        })),
        orderingItems: question.orderingItems?.map((item) => ({
          text: item,
        })),
      })),
    };

    await this.testsService.upsertLessonTestContentForTeacher(
      teacherId,
      created.id,
      upsertDto,
    );

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: created.id },
      include: lessonInclude,
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found after import');
    }

    return lesson;
  }

  async create(teacherId: string, dto: CreateLessonDto) {
    await this.assertTeacherOwnsModule(teacherId, dto.moduleId);

    const existing = await this.prisma.lesson.findMany({
      where: { moduleId: dto.moduleId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true },
    });

    const nextOrderIndex = existing.length + 1;
    const targetOrderIndex = dto.orderIndex
      ? Math.max(1, Math.min(dto.orderIndex, nextOrderIndex))
      : nextOrderIndex;

    return this.prisma.$transaction(async (tx) => {
      const lesson = await tx.lesson.create({
        data: {
          moduleId: dto.moduleId,
          type: dto.type,
          title: dto.title,
          description: dto.description,
          orderIndex: nextOrderIndex,
          isPublished: dto.isPublished ?? false,
        },
      });

      await this.createTypeSpecificRecord(tx, lesson.id, dto.type, {
        lecture: dto.lecture,
        test: dto.test,
        webinar: dto.webinar,
      });

      if (targetOrderIndex !== nextOrderIndex) {
        const reorderedIds = [...existing.map((item) => item.id)];
        reorderedIds.splice(targetOrderIndex - 1, 0, lesson.id);
        await this.applyOrderIndexes(tx, dto.moduleId, reorderedIds);
      }

      const created = await tx.lesson.findUnique({
        where: { id: lesson.id },
        include: lessonInclude,
      });

      if (!created) {
        throw new NotFoundException('Lesson not found after creation');
      }

      return created;
    });
  }

  async update(teacherId: string, lessonId: string, dto: UpdateLessonDto) {
    const ownedLesson = await this.getOwnedLesson(teacherId, lessonId);
    const nextType = dto.type ?? ownedLesson.type;

    return this.prisma.$transaction(async (tx) => {
      if (dto.orderIndex !== undefined) {
        const lessons = await tx.lesson.findMany({
          where: { moduleId: ownedLesson.moduleId },
          orderBy: { orderIndex: 'asc' },
          select: { id: true },
        });

        const boundedTarget = Math.max(
          1,
          Math.min(dto.orderIndex, lessons.length),
        );

        const reorderedIds = lessons
          .map((item) => item.id)
          .filter((id) => id !== lessonId);
        reorderedIds.splice(boundedTarget - 1, 0, lessonId);

        await this.applyOrderIndexes(tx, ownedLesson.moduleId, reorderedIds);
      }

      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          type: nextType,
          title: dto.title,
          description: dto.description,
          isPublished: dto.isPublished,
        },
      });

      if (nextType !== ownedLesson.type) {
        await this.deleteTypeSpecificRecords(tx, lessonId);
        await this.createTypeSpecificRecord(tx, lessonId, nextType, {
          lecture: dto.lecture,
          test: dto.test,
          webinar: dto.webinar,
        });
      } else {
        await this.updateTypeSpecificRecord(tx, lessonId, nextType, {
          lecture: dto.lecture,
          test: dto.test,
          webinar: dto.webinar,
        });
      }

      const updated = await tx.lesson.findUnique({
        where: { id: lessonId },
        include: lessonInclude,
      });

      if (!updated) {
        throw new NotFoundException('Lesson not found after update');
      }

      return updated;
    });
  }

  async reorder(teacherId: string, dto: ReorderLessonsDto) {
    await this.assertTeacherOwnsModule(teacherId, dto.moduleId);

    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId: dto.moduleId },
      select: { id: true },
      orderBy: { orderIndex: 'asc' },
    });

    if (lessons.length !== dto.items.length) {
      throw new BadRequestException(
        'Reorder payload must include all module lessons',
      );
    }

    const lessonIds = lessons.map((item) => item.id);
    const payloadIds = dto.items.map((item) => item.lessonId);

    const hasDuplicates = new Set(payloadIds).size !== payloadIds.length;
    if (hasDuplicates) {
      throw new BadRequestException('Reorder payload contains duplicate lesson IDs');
    }

    const orderIndexes = dto.items.map((item) => item.orderIndex);
    const hasDuplicateOrderIndexes =
      new Set(orderIndexes).size !== orderIndexes.length;
    if (hasDuplicateOrderIndexes) {
      throw new BadRequestException(
        'Reorder payload contains duplicate order indexes',
      );
    }

    const allBelongToModule = payloadIds.every((id) => lessonIds.includes(id));
    if (!allBelongToModule) {
      throw new BadRequestException('Reorder payload contains foreign lesson IDs');
    }

    const orderedLessonIds = [...dto.items]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item) => item.lessonId);

    await this.prisma.$transaction(async (tx) => {
      await this.applyOrderIndexes(tx, dto.moduleId, orderedLessonIds);
    });

    return this.prisma.lesson.findMany({
      where: { moduleId: dto.moduleId },
      orderBy: { orderIndex: 'asc' },
      include: lessonInclude,
    });
  }

  async remove(teacherId: string, lessonId: string) {
    const ownedLesson = await this.getOwnedLesson(teacherId, lessonId);

    await this.prisma.$transaction(async (tx) => {
      await tx.lesson.delete({
        where: { id: lessonId },
      });

      const remaining = await tx.lesson.findMany({
        where: { moduleId: ownedLesson.moduleId },
        orderBy: { orderIndex: 'asc' },
        select: { id: true },
      });

      await this.applyOrderIndexes(
        tx,
        ownedLesson.moduleId,
        remaining.map((item) => item.id),
      );
    });

    return { success: true };
  }

  private mapTestQuestionToExport(
    question: Prisma.TestQuestionGetPayload<{
      include: {
        options: true;
      };
    }>,
  ): TestQuestionTransfer {
    const base: TestQuestionTransfer = {
      text: question.text,
      explanation: question.explanation ?? undefined,
      type: question.type,
      points: question.points,
    };

    if (
      question.type === QuestionType.SINGLE_CHOICE ||
      question.type === QuestionType.MULTIPLE_CHOICE
    ) {
      base.options = question.options
        .sort((a, b) => a.order - b.order)
        .map((option) => ({
          text: option.text,
          isCorrect: option.isCorrect,
        }));
      return base;
    }

    if (question.type === QuestionType.FREE_TEXT) {
      base.acceptedAnswers = this.parseAcceptedAnswersFromJson(
        question.freeTextAcceptedAnswers,
      );
      return base;
    }

    if (question.type === QuestionType.MATCHING) {
      base.matchingPairs = this.parseMatchingPairsFromJson(question.matchingPairs);
      return base;
    }

    base.orderingItems = this.parseOrderingItemsFromJson(question.orderingItems);
    return base;
  }

  private parseLessonTransferPayload(payload: unknown): LessonTransferPayload {
    const root = this.assertObject(payload, 'payload');
    const format = this.assertString(root.format, 'format');
    if (format !== LESSON_TRANSFER_FORMAT) {
      throw new BadRequestException(
        `Unsupported lesson import format: ${format}`,
      );
    }

    const version = this.assertNumber(root.version, 'version');
    if (version !== LESSON_TRANSFER_VERSION) {
      throw new BadRequestException(
        `Unsupported lesson import version: ${version}`,
      );
    }

    const lessonType = this.assertString(root.lessonType, 'lessonType');
    if (lessonType !== 'lecture' && lessonType !== 'test') {
      throw new BadRequestException(
        'lessonType must be "lecture" or "test"',
      );
    }

    const lessonRaw = this.assertObject(root.lesson, 'lesson');
    const lesson = {
      title: this.assertString(lessonRaw.title, 'lesson.title').trim(),
      description: this.optionalString(lessonRaw.description, 'lesson.description')?.trim(),
      orderIndex: this.optionalInteger(lessonRaw.orderIndex, 'lesson.orderIndex'),
      isPublished: this.optionalBoolean(lessonRaw.isPublished, 'lesson.isPublished'),
    };

    if (lesson.title.length < 2) {
      throw new BadRequestException('lesson.title must be at least 2 characters');
    }

    if (lesson.orderIndex !== undefined && lesson.orderIndex < 1) {
      throw new BadRequestException('lesson.orderIndex must be >= 1');
    }

    if (lessonType === 'lecture') {
      const lectureRaw = this.assertObject(root.lecture, 'lecture');
      const content = this.assertObject(lectureRaw.content, 'lecture.content');

      return {
        format: LESSON_TRANSFER_FORMAT,
        version: LESSON_TRANSFER_VERSION,
        lessonType: 'lecture',
        lesson,
        lecture: {
          content,
        },
      };
    }

    const testRaw = this.assertObject(root.test, 'test');
    const settingsRaw = this.assertObject(testRaw.settings, 'test.settings');
    const questionsRaw = this.assertArray(testRaw.questions, 'test.questions');
    if (questionsRaw.length === 0) {
      throw new BadRequestException('test.questions must contain at least one item');
    }

    const settings = {
      passingScore: this.optionalInteger(
        settingsRaw.passingScore,
        'test.settings.passingScore',
      ),
      allowMultipleAttempts: this.optionalBoolean(
        settingsRaw.allowMultipleAttempts,
        'test.settings.allowMultipleAttempts',
      ),
      maxAttempts: this.optionalInteger(
        settingsRaw.maxAttempts,
        'test.settings.maxAttempts',
      ),
      timeLimitMinutes: this.optionalInteger(
        settingsRaw.timeLimitMinutes,
        'test.settings.timeLimitMinutes',
      ),
    };

    if (settings.passingScore !== undefined && settings.passingScore < 0) {
      throw new BadRequestException('test.settings.passingScore must be >= 0');
    }
    if (settings.maxAttempts !== undefined && settings.maxAttempts < 1) {
      throw new BadRequestException('test.settings.maxAttempts must be >= 1');
    }
    if (
      settings.timeLimitMinutes !== undefined &&
      settings.timeLimitMinutes < 1
    ) {
      throw new BadRequestException(
        'test.settings.timeLimitMinutes must be >= 1',
      );
    }

    const questions = questionsRaw.map((item, index) =>
      this.parseTransferredTestQuestion(item, index),
    );

    return {
      format: LESSON_TRANSFER_FORMAT,
      version: LESSON_TRANSFER_VERSION,
      lessonType: 'test',
      lesson,
      test: {
        settings,
        questions,
      },
    };
  }

  private parseTransferredTestQuestion(
    value: unknown,
    index: number,
  ): TestQuestionTransfer {
    const question = this.assertObject(value, `test.questions[${index}]`);
    const typeValue = this.assertString(
      question.type,
      `test.questions[${index}].type`,
    );

    const supportedTypes = new Set<string>([
      QuestionType.SINGLE_CHOICE,
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.FREE_TEXT,
      QuestionType.MATCHING,
      QuestionType.ORDERING,
    ]);
    if (!supportedTypes.has(typeValue)) {
      throw new BadRequestException(
        `test.questions[${index}].type is not supported`,
      );
    }

    const parsed: TestQuestionTransfer = {
      text: this.assertString(question.text, `test.questions[${index}].text`).trim(),
      explanation: this.optionalString(
        question.explanation,
        `test.questions[${index}].explanation`,
      )?.trim(),
      type: typeValue as QuestionType,
      points:
        this.optionalInteger(question.points, `test.questions[${index}].points`) ?? 1,
    };

    if (parsed.text.length < 2) {
      throw new BadRequestException(
        `test.questions[${index}].text must be at least 2 characters`,
      );
    }
    if ((parsed.points ?? 1) < 1) {
      throw new BadRequestException(
        `test.questions[${index}].points must be >= 1`,
      );
    }

    if (parsed.type === QuestionType.SINGLE_CHOICE || parsed.type === QuestionType.MULTIPLE_CHOICE) {
      const options = this.assertArray(question.options, `test.questions[${index}].options`).map(
        (item, optionIndex) => {
          const option = this.assertObject(
            item,
            `test.questions[${index}].options[${optionIndex}]`,
          );
          return {
            text: this.assertString(
              option.text,
              `test.questions[${index}].options[${optionIndex}].text`,
            ).trim(),
            isCorrect: this.assertBoolean(
              option.isCorrect,
              `test.questions[${index}].options[${optionIndex}].isCorrect`,
            ),
          };
        },
      );

      if (options.length < 2) {
        throw new BadRequestException(
          `test.questions[${index}].options must contain at least two options`,
        );
      }
      if (options.some((option) => option.text.length === 0)) {
        throw new BadRequestException(
          `test.questions[${index}].options contains empty text`,
        );
      }

      const correctCount = options.filter((option) => option.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestException(
          `test.questions[${index}] must have at least one correct option`,
        );
      }
      if (parsed.type === QuestionType.SINGLE_CHOICE && correctCount !== 1) {
        throw new BadRequestException(
          `test.questions[${index}] must have exactly one correct option`,
        );
      }
      if (parsed.type === QuestionType.MULTIPLE_CHOICE && correctCount < 2) {
        throw new BadRequestException(
          `test.questions[${index}] must have at least two correct options`,
        );
      }

      parsed.options = options;
      return parsed;
    }

    if (parsed.type === QuestionType.FREE_TEXT) {
      const acceptedAnswers = this.assertArray(
        question.acceptedAnswers,
        `test.questions[${index}].acceptedAnswers`,
      )
        .map((item, answerIndex) =>
          this.assertString(
            item,
            `test.questions[${index}].acceptedAnswers[${answerIndex}]`,
          ).trim(),
        )
        .filter((item) => item.length > 0);

      if (acceptedAnswers.length === 0) {
        throw new BadRequestException(
          `test.questions[${index}] must have at least one accepted answer`,
        );
      }
      parsed.acceptedAnswers = acceptedAnswers;
      return parsed;
    }

    if (parsed.type === QuestionType.MATCHING) {
      const matchingPairs = this.assertArray(
        question.matchingPairs,
        `test.questions[${index}].matchingPairs`,
      ).map((item, pairIndex) => {
        const pair = this.assertObject(
          item,
          `test.questions[${index}].matchingPairs[${pairIndex}]`,
        );
        return {
          left: this.assertString(
            pair.left,
            `test.questions[${index}].matchingPairs[${pairIndex}].left`,
          ).trim(),
          right: this.assertString(
            pair.right,
            `test.questions[${index}].matchingPairs[${pairIndex}].right`,
          ).trim(),
        };
      });

      if (matchingPairs.length < 2) {
        throw new BadRequestException(
          `test.questions[${index}].matchingPairs must contain at least two pairs`,
        );
      }
      if (
        matchingPairs.some((pair) => pair.left.length === 0 || pair.right.length === 0)
      ) {
        throw new BadRequestException(
          `test.questions[${index}].matchingPairs contains empty values`,
        );
      }
      parsed.matchingPairs = matchingPairs;
      return parsed;
    }

    const orderingItems = this.assertArray(
      question.orderingItems,
      `test.questions[${index}].orderingItems`,
    )
      .map((item, itemIndex) =>
        this.assertString(
          item,
          `test.questions[${index}].orderingItems[${itemIndex}]`,
        ).trim(),
      )
      .filter((item) => item.length > 0);

    if (orderingItems.length < 2) {
      throw new BadRequestException(
        `test.questions[${index}].orderingItems must contain at least two items`,
      );
    }

    parsed.orderingItems = orderingItems;
    return parsed;
  }

  private parseAcceptedAnswersFromJson(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private parseMatchingPairsFromJson(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const entry = item as Record<string, unknown>;
        const left = typeof entry.left === 'string' ? entry.left.trim() : '';
        const right = typeof entry.right === 'string' ? entry.right.trim() : '';
        if (!left || !right) return null;
        return { left, right };
      })
      .filter((item): item is { left: string; right: string } => Boolean(item));
  }

  private parseOrderingItemsFromJson(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (!item || typeof item !== 'object') return '';
        const entry = item as Record<string, unknown>;
        return typeof entry.text === 'string' ? entry.text.trim() : '';
      })
      .filter((item) => item.length > 0);
  }

  private assertObject(value: unknown, path: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(`${path} must be an object`);
    }
    return value as Record<string, unknown>;
  }

  private assertArray(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${path} must be an array`);
    }
    return value;
  }

  private assertString(value: unknown, path: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${path} must be a string`);
    }
    return value;
  }

  private assertBoolean(value: unknown, path: string): boolean {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${path} must be a boolean`);
    }
    return value;
  }

  private assertNumber(value: unknown, path: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new BadRequestException(`${path} must be a finite number`);
    }
    return value;
  }

  private optionalString(value: unknown, path: string): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return this.assertString(value, path);
  }

  private optionalBoolean(value: unknown, path: string): boolean | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    return this.assertBoolean(value, path);
  }

  private optionalInteger(value: unknown, path: string): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const numeric = this.assertNumber(value, path);
    if (!Number.isInteger(numeric)) {
      throw new BadRequestException(`${path} must be an integer`);
    }
    return numeric;
  }

  private async assertTeacherOwnsModule(
    teacherId: string,
    moduleId: string,
  ): Promise<void> {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          select: {
            teacherId: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    if (module.course.teacherId !== teacherId) {
      throw new ForbiddenException(
        'You can manage lessons only in your own courses',
      );
    }
  }

  private async getOwnedLesson(teacherId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              select: { teacherId: true },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.module.course.teacherId !== teacherId) {
      throw new ForbiddenException('You can manage only your own lessons');
    }

    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      type: lesson.type,
    };
  }

  private async createTypeSpecificRecord(
    tx: Prisma.TransactionClient,
    lessonId: string,
    type: LessonType,
    payload: {
      lecture?: CreateLessonDto['lecture'] | UpdateLessonDto['lecture'];
      test?: CreateLessonDto['test'] | UpdateLessonDto['test'];
      webinar?: CreateLessonDto['webinar'] | UpdateLessonDto['webinar'];
    },
  ) {
    if (type === LessonType.LECTURE) {
      await tx.lectureLesson.create({
        data: {
          lessonId,
          content: payload.lecture?.content as Prisma.InputJsonValue ?? { blocks: [] },
        },
      });
      return;
    }

    if (type === LessonType.TEST) {
      await tx.testLesson.create({
        data: {
          lessonId,
          passingScore: payload.test?.passingScore,
          allowMultipleAttempts: payload.test?.allowMultipleAttempts ?? true,
          maxAttempts: payload.test?.maxAttempts,
          timeLimitMinutes: payload.test?.timeLimitMinutes,
        },
      });
      return;
    }

    if (type === LessonType.WEBINAR) {
      if (!payload.webinar?.meetingLink || !payload.webinar?.scheduledAt) {
        throw new BadRequestException(
          'Webinar lesson requires meetingLink and scheduledAt',
        );
      }

      await tx.webinarLesson.create({
        data: {
          lessonId,
          meetingLink: payload.webinar.meetingLink,
          scheduledAt: this.parseDateOrThrow(payload.webinar.scheduledAt),
          durationMinutes: payload.webinar.durationMinutes,
        },
      });
    }
  }

  private async updateTypeSpecificRecord(
    tx: Prisma.TransactionClient,
    lessonId: string,
    type: LessonType,
    payload: {
      lecture?: UpdateLessonDto['lecture'];
      test?: UpdateLessonDto['test'];
      webinar?: UpdateLessonDto['webinar'];
    },
  ) {
    if (type === LessonType.LECTURE && payload.lecture) {
      await tx.lectureLesson.upsert({
        where: { lessonId },
        create: {
          lessonId,
          content: payload.lecture.content as Prisma.InputJsonValue,
        },
        update: {
          content: payload.lecture.content as Prisma.InputJsonValue,
        },
      });
      return;
    }

    if (type === LessonType.TEST && payload.test) {
      await tx.testLesson.upsert({
        where: { lessonId },
        create: {
          lessonId,
          passingScore: payload.test.passingScore,
          allowMultipleAttempts: payload.test.allowMultipleAttempts ?? true,
          maxAttempts: payload.test.maxAttempts,
          timeLimitMinutes: payload.test.timeLimitMinutes,
        },
        update: {
          passingScore: payload.test.passingScore,
          allowMultipleAttempts: payload.test.allowMultipleAttempts,
          maxAttempts: payload.test.maxAttempts,
          timeLimitMinutes: payload.test.timeLimitMinutes,
        },
      });
      return;
    }

    if (type === LessonType.WEBINAR && payload.webinar) {
      const existing = await tx.webinarLesson.findUnique({
        where: { lessonId },
        select: { lessonId: true },
      });

      if (existing) {
        await tx.webinarLesson.update({
          where: { lessonId },
          data: {
            meetingLink: payload.webinar.meetingLink,
            scheduledAt: payload.webinar.scheduledAt
              ? this.parseDateOrThrow(payload.webinar.scheduledAt)
              : undefined,
            durationMinutes: payload.webinar.durationMinutes,
          },
        });
        return;
      }

      if (!payload.webinar.meetingLink || !payload.webinar.scheduledAt) {
        throw new BadRequestException(
          'Webinar lesson requires meetingLink and scheduledAt',
        );
      }

      await tx.webinarLesson.create({
        data: {
          lessonId,
          meetingLink: payload.webinar.meetingLink,
          scheduledAt: this.parseDateOrThrow(payload.webinar.scheduledAt),
          durationMinutes: payload.webinar.durationMinutes,
        },
      });
    }
  }

  private async deleteTypeSpecificRecords(
    tx: Prisma.TransactionClient,
    lessonId: string,
  ) {
    await tx.lectureLesson.deleteMany({
      where: { lessonId },
    });
    await tx.testLesson.deleteMany({
      where: { lessonId },
    });
    await tx.webinarLesson.deleteMany({
      where: { lessonId },
    });
  }

  private async applyOrderIndexes(
    tx: Prisma.TransactionClient,
    moduleId: string,
    orderedLessonIds: string[],
  ): Promise<void> {
    for (let i = 0; i < orderedLessonIds.length; i += 1) {
      await tx.lesson.update({
        where: { id: orderedLessonIds[i] },
        data: { orderIndex: 10_000 + i },
      });
    }

    for (let i = 0; i < orderedLessonIds.length; i += 1) {
      await tx.lesson.update({
        where: { id: orderedLessonIds[i] },
        data: { orderIndex: i + 1 },
      });
    }

    const normalized = await tx.lesson.findMany({
      where: { moduleId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true },
    });

    if (normalized.length !== orderedLessonIds.length) {
      throw new BadRequestException('Failed to apply order indexes consistently');
    }
  }

  private parseDateOrThrow(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return parsed;
  }

  private assertLectureType(type: LessonType) {
    if (type !== LessonType.LECTURE) {
      throw new BadRequestException('Lesson is not a lecture');
    }
  }

  private assertWebinarType(type: LessonType) {
    if (type !== LessonType.WEBINAR) {
      throw new BadRequestException('Lesson is not a webinar');
    }
  }
}
