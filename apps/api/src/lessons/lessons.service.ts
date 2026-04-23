import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, LessonType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLectureLessonDto } from './dto/create-lecture-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateWebinarLessonDto } from './dto/create-webinar-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLectureLessonDto } from './dto/update-lecture-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateWebinarLessonDto } from './dto/update-webinar-lesson.dto';


const lessonInclude = {
  lecture: true,
  test: true,
  webinar: true,
} satisfies Prisma.LessonInclude;

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

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
