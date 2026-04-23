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
  TestAttemptStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ProgressRow = {
  lessonId: string;
  status: LessonProgressStatus;
  startedAt: Date | null;
  lastViewedAt: Date | null;
  completedAt: Date | null;
  bestTestScore: number | null;
  bestTestMaxScore: number | null;
  attemptsCount: number;
  updatedAt: Date;
};

type SubmittedAttemptRow = {
  testLessonId: string;
  score: number | null;
  maxScore: number | null;
  scorePercent: number | null;
  submittedAt: Date | null;
};

type PublishedCourseModule = {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: Array<{
    id: string;
    title: string;
    type: LessonType;
    orderIndex: number;
    moduleId: string;
  }>;
};

type TestMetrics = {
  attemptsCount: number;
  bestScore: number | null;
  bestMaxScore: number | null;
  bestScorePercent: number | null;
  latestSubmittedAt: Date | null;
};

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyCourseProgress(studentId: string, courseId: string) {
    return this.prisma.lessonProgress.findMany({
      where: {
        studentId,
        enrollment: {
          courseId,
          status: EnrollmentStatus.ACTIVE,
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            type: true,
            orderIndex: true,
            module: {
              select: {
                id: true,
                title: true,
                orderIndex: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMyCourseProgressOverview(studentId: string, courseId: string) {
    const snapshot = await this.buildStudentProgressSnapshot(courseId, studentId);

    return {
      course: snapshot.course,
      student: {
        id: snapshot.student.id,
      },
      summary: snapshot.summary,
      tests: snapshot.tests,
      modules: snapshot.modules,
      lastActivityAt: snapshot.lastActivityAt,
    };
  }

  async markStarted(studentId: string, lessonId: string) {
    const context = await this.resolveContext(studentId, lessonId);
    const now = new Date();

    const existing = await this.prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
    });

    if (existing) {
      return this.prisma.lessonProgress.update({
        where: { id: existing.id },
        data: {
          status:
            existing.status === LessonProgressStatus.COMPLETED
              ? LessonProgressStatus.COMPLETED
              : LessonProgressStatus.IN_PROGRESS,
          startedAt: existing.startedAt ?? now,
          lastViewedAt: now,
        },
      });
    }

    return this.prisma.lessonProgress.create({
      data: {
        enrollmentId: context.enrollmentId,
        studentId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        startedAt: now,
        lastViewedAt: now,
      },
    });
  }

  async markCompleted(studentId: string, lessonId: string) {
    const context = await this.resolveContext(studentId, lessonId);
    const now = new Date();

    if (context.lessonType === LessonType.TEST) {
      throw new BadRequestException(
        'Test lessons are completed automatically after test submission',
      );
    }

    return this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId } },
      create: {
        enrollmentId: context.enrollmentId,
        studentId,
        lessonId,
        status: LessonProgressStatus.COMPLETED,
        startedAt: now,
        lastViewedAt: now,
        completedAt: now,
      },
      update: {
        status: LessonProgressStatus.COMPLETED,
        lastViewedAt: now,
        completedAt: now,
      },
    });
  }

  async getTeacherCourseProgressOverview(teacherId: string, courseId: string) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const [course, modules] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true },
      }),
      this.getPublishedModulesWithLessons(courseId),
    ]);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    const totalLessons = lessonIds.length;

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        lessonProgress:
          lessonIds.length > 0
            ? {
                where: {
                  lessonId: { in: lessonIds },
                },
                select: {
                  lessonId: true,
                  status: true,
                  startedAt: true,
                  lastViewedAt: true,
                  completedAt: true,
                  bestTestScore: true,
                  bestTestMaxScore: true,
                  attemptsCount: true,
                  updatedAt: true,
                },
              }
            : {
                select: {
                  lessonId: true,
                  status: true,
                  startedAt: true,
                  lastViewedAt: true,
                  completedAt: true,
                  bestTestScore: true,
                  bestTestMaxScore: true,
                  attemptsCount: true,
                  updatedAt: true,
                },
              },
        testAttempts: {
          where: {
            status: TestAttemptStatus.SUBMITTED,
          },
          select: {
            testLessonId: true,
            score: true,
            maxScore: true,
            scorePercent: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        enrolledAt: 'asc',
      },
    });

    const students = enrollments
      .map((enrollment) => {
        const stats = this.calculateStudentProgressStats(
          modules,
          enrollment.lessonProgress,
          enrollment.testAttempts,
        );

        return {
          enrollmentId: enrollment.id,
          student: enrollment.student,
          progress: {
            totalLessons,
            completedLessons: stats.completedLessons,
            inProgressLessons: stats.inProgressLessons,
            notStartedLessons: stats.notStartedLessons,
            completionRatePercent: stats.completionRatePercent,
            status: stats.status,
            lastActivityAt: stats.lastActivityAt,
          },
          tests: {
            submittedAttempts: stats.submittedAttempts,
            averageScorePercent: stats.averageTestScorePercent,
            bestScorePercent: stats.bestTestScorePercent,
          },
        };
      })
      .sort((a, b) => {
        if (a.progress.completionRatePercent !== b.progress.completionRatePercent) {
          return a.progress.completionRatePercent - b.progress.completionRatePercent;
        }

        return a.student.fullName.localeCompare(b.student.fullName);
      });

    const lessonTypeTotals = this.countLessonTypes(modules);
    const completedLessonProgress = students.reduce(
      (sum, row) => sum + row.progress.completedLessons,
      0,
    );
    const inProgressLessonProgress = students.reduce(
      (sum, row) => sum + row.progress.inProgressLessons,
      0,
    );
    const notStartedLessonProgress = students.reduce(
      (sum, row) => sum + row.progress.notStartedLessons,
      0,
    );
    const totalStudents = students.length;
    const totalPossibleProgress = totalStudents * totalLessons;
    const completionRatePercent =
      totalPossibleProgress === 0
        ? 0
        : Number(((completedLessonProgress / totalPossibleProgress) * 100).toFixed(2));
    const averageStudentCompletionPercent =
      students.length === 0
        ? 0
        : Number(
            (
              students.reduce(
                (sum, row) => sum + row.progress.completionRatePercent,
                0,
              ) / students.length
            ).toFixed(2),
          );
    const studentsCompletedCourse = students.filter(
      (row) => row.progress.status === LessonProgressStatus.COMPLETED,
    ).length;
    const studentsAtRisk = students.filter(
      (row) => row.progress.totalLessons > 0 && row.progress.completionRatePercent < 40,
    ).length;
    const submittedTestAttempts = students.reduce(
      (sum, row) => sum + row.tests.submittedAttempts,
      0,
    );
    const averageBestTestScorePercent = this.averageNullable(
      students.map((row) => row.tests.bestScorePercent),
    );

    return {
      course: {
        id: course.id,
        title: course.title,
      },
      summary: {
        students: totalStudents,
        lessons: {
          total: totalLessons,
          lecture: lessonTypeTotals.lecture,
          webinar: lessonTypeTotals.webinar,
          test: lessonTypeTotals.test,
        },
        completedLessonProgress,
        inProgressLessonProgress,
        notStartedLessonProgress,
        totalPossibleProgress,
        completionRatePercent,
        averageStudentCompletionPercent,
        studentsCompletedCourse,
        studentsAtRisk,
      },
      tests: {
        submittedAttempts: submittedTestAttempts,
        averageBestScorePercent: averageBestTestScorePercent,
      },
      students,
    };
  }

  async getTeacherStudentProgressByCourse(
    teacherId: string,
    courseId: string,
    studentId: string,
  ) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const snapshot = await this.buildStudentProgressSnapshot(courseId, studentId);

    return {
      course: snapshot.course,
      student: snapshot.student,
      enrollment: snapshot.enrollment,
      summary: snapshot.summary,
      tests: snapshot.tests,
      modules: snapshot.modules,
      lastActivityAt: snapshot.lastActivityAt,
    };
  }

  private async buildStudentProgressSnapshot(courseId: string, studentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
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

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new NotFoundException('Active enrollment not found for this student');
    }

    const [course, modules] = await Promise.all([
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true },
      }),
      this.getPublishedModulesWithLessons(courseId),
    ]);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lessonIds = modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));

    const [progressRows, submittedAttempts] = await this.prisma.$transaction([
      lessonIds.length > 0
        ? this.prisma.lessonProgress.findMany({
            where: {
              studentId,
              lessonId: {
                in: lessonIds,
              },
              enrollment: {
                courseId,
                status: EnrollmentStatus.ACTIVE,
              },
            },
            select: {
              lessonId: true,
              status: true,
              startedAt: true,
              lastViewedAt: true,
              completedAt: true,
              bestTestScore: true,
              bestTestMaxScore: true,
              attemptsCount: true,
              updatedAt: true,
            },
          })
        : this.prisma.lessonProgress.findMany({
            where: {
              studentId,
              enrollment: {
                courseId,
                status: EnrollmentStatus.ACTIVE,
              },
              lessonId: '__never__',
            },
            select: {
              lessonId: true,
              status: true,
              startedAt: true,
              lastViewedAt: true,
              completedAt: true,
              bestTestScore: true,
              bestTestMaxScore: true,
              attemptsCount: true,
              updatedAt: true,
            },
          }),
      this.prisma.testAttempt.findMany({
        where: {
          studentId,
          status: TestAttemptStatus.SUBMITTED,
          enrollment: {
            courseId,
            status: EnrollmentStatus.ACTIVE,
          },
        },
        select: {
          testLessonId: true,
          score: true,
          maxScore: true,
          scorePercent: true,
          submittedAt: true,
        },
      }),
    ]);

    const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]));
    const testMetricsByLesson = this.mapTestMetricsByLesson(submittedAttempts);

    const totalLessons = lessonIds.length;
    let completedLessons = 0;
    let inProgressLessons = 0;
    let notStartedLessons = 0;

    const modulesPayload = modules.map((module) => {
      let moduleCompleted = 0;
      let moduleInProgress = 0;
      let moduleNotStarted = 0;

      const lessonsPayload = module.lessons.map((lesson) => {
        const progress = progressMap.get(lesson.id);
        const testMetrics = testMetricsByLesson.get(lesson.id);
        const status = this.resolveLessonStatus(
          lesson.type,
          progress?.status ?? null,
          testMetrics?.attemptsCount ?? 0,
        );

        if (status === LessonProgressStatus.COMPLETED) {
          completedLessons += 1;
          moduleCompleted += 1;
        } else if (status === LessonProgressStatus.IN_PROGRESS) {
          inProgressLessons += 1;
          moduleInProgress += 1;
        } else {
          notStartedLessons += 1;
          moduleNotStarted += 1;
        }

        return {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          orderIndex: lesson.orderIndex,
          status,
          startedAt: progress?.startedAt ?? null,
          lastViewedAt: progress?.lastViewedAt ?? testMetrics?.latestSubmittedAt ?? null,
          completedAt: progress?.completedAt ?? testMetrics?.latestSubmittedAt ?? null,
          tests:
            lesson.type === LessonType.TEST
              ? {
                  attemptsCount:
                    testMetrics?.attemptsCount ?? progress?.attemptsCount ?? 0,
                  bestScore: testMetrics?.bestScore ?? progress?.bestTestScore ?? null,
                  bestMaxScore:
                    testMetrics?.bestMaxScore ?? progress?.bestTestMaxScore ?? null,
                  bestScorePercent: testMetrics?.bestScorePercent ?? null,
                }
              : null,
        };
      });

      const moduleCompletionRatePercent =
        module.lessons.length === 0
          ? 0
          : Number(((moduleCompleted / module.lessons.length) * 100).toFixed(2));

      return {
        id: module.id,
        title: module.title,
        description: module.description,
        orderIndex: module.orderIndex,
        progress: {
          completedLessons: moduleCompleted,
          inProgressLessons: moduleInProgress,
          notStartedLessons: moduleNotStarted,
          totalLessons: module.lessons.length,
          completionRatePercent: moduleCompletionRatePercent,
          status: this.resolveAggregateStatus(
            moduleCompleted,
            moduleInProgress,
            module.lessons.length,
          ),
        },
        lessons: lessonsPayload,
      };
    });

    const completionRatePercent =
      totalLessons === 0
        ? 0
        : Number(((completedLessons / totalLessons) * 100).toFixed(2));

    const testsAverageScorePercent = this.averageNullable(
      submittedAttempts.map((attempt) => attempt.scorePercent),
    );
    const testsBestScorePercent = this.maxNullable(
      submittedAttempts.map((attempt) => attempt.scorePercent),
    );

    return {
      course,
      student: enrollment.student,
      enrollment: {
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
      },
      summary: {
        completedLessons,
        inProgressLessons,
        notStartedLessons,
        totalLessons,
        completionRatePercent,
        status: this.resolveAggregateStatus(
          completedLessons,
          inProgressLessons,
          totalLessons,
        ),
      },
      tests: {
        submittedAttempts: submittedAttempts.length,
        averageScorePercent: testsAverageScorePercent,
        bestScorePercent: testsBestScorePercent,
      },
      modules: modulesPayload,
      lastActivityAt: this.resolveLastActivityAt(progressRows, submittedAttempts),
    };
  }

  private calculateStudentProgressStats(
    modules: PublishedCourseModule[],
    lessonProgress: ProgressRow[],
    submittedAttempts: SubmittedAttemptRow[],
  ) {
    const progressMap = new Map(lessonProgress.map((row) => [row.lessonId, row]));
    const testMetricsByLesson = this.mapTestMetricsByLesson(submittedAttempts);

    let completedLessons = 0;
    let inProgressLessons = 0;
    let notStartedLessons = 0;

    const allLessons = modules.flatMap((module) => module.lessons);
    const totalLessons = allLessons.length;

    for (const lesson of allLessons) {
      const progress = progressMap.get(lesson.id);
      const testMetrics = testMetricsByLesson.get(lesson.id);
      const status = this.resolveLessonStatus(
        lesson.type,
        progress?.status ?? null,
        testMetrics?.attemptsCount ?? 0,
      );

      if (status === LessonProgressStatus.COMPLETED) {
        completedLessons += 1;
      } else if (status === LessonProgressStatus.IN_PROGRESS) {
        inProgressLessons += 1;
      } else {
        notStartedLessons += 1;
      }
    }

    const completionRatePercent =
      totalLessons === 0
        ? 0
        : Number(((completedLessons / totalLessons) * 100).toFixed(2));

    const bestTestScorePercent = this.maxNullable(
      submittedAttempts.map((attempt) => attempt.scorePercent),
    );

    const averageTestScorePercent = this.averageNullable(
      submittedAttempts.map((attempt) => attempt.scorePercent),
    );

    return {
      completedLessons,
      inProgressLessons,
      notStartedLessons,
      completionRatePercent,
      status: this.resolveAggregateStatus(
        completedLessons,
        inProgressLessons,
        totalLessons,
      ),
      submittedAttempts: submittedAttempts.length,
      bestTestScorePercent,
      averageTestScorePercent,
      lastActivityAt: this.resolveLastActivityAt(lessonProgress, submittedAttempts),
    };
  }

  private mapTestMetricsByLesson(attempts: SubmittedAttemptRow[]) {
    const map = new Map<string, TestMetrics>();

    for (const attempt of attempts) {
      const existing = map.get(attempt.testLessonId) ?? {
        attemptsCount: 0,
        bestScore: null,
        bestMaxScore: null,
        bestScorePercent: null,
        latestSubmittedAt: null,
      };

      existing.attemptsCount += 1;

      if (
        attempt.scorePercent !== null &&
        (existing.bestScorePercent === null ||
          attempt.scorePercent > existing.bestScorePercent)
      ) {
        existing.bestScorePercent = attempt.scorePercent;
        existing.bestScore = attempt.score;
        existing.bestMaxScore = attempt.maxScore;
      }

      if (
        attempt.submittedAt &&
        (!existing.latestSubmittedAt || attempt.submittedAt > existing.latestSubmittedAt)
      ) {
        existing.latestSubmittedAt = attempt.submittedAt;
      }

      map.set(attempt.testLessonId, existing);
    }

    return map;
  }

  private resolveLessonStatus(
    lessonType: LessonType,
    progressStatus: LessonProgressStatus | null,
    submittedAttemptsCount: number,
  ): LessonProgressStatus {
    if (lessonType === LessonType.TEST) {
      if (submittedAttemptsCount > 0) {
        return LessonProgressStatus.COMPLETED;
      }

      if (
        progressStatus === LessonProgressStatus.IN_PROGRESS ||
        progressStatus === LessonProgressStatus.COMPLETED
      ) {
        return LessonProgressStatus.IN_PROGRESS;
      }

      return LessonProgressStatus.NOT_STARTED;
    }

    return progressStatus ?? LessonProgressStatus.NOT_STARTED;
  }

  private resolveAggregateStatus(
    completed: number,
    inProgress: number,
    total: number,
  ): LessonProgressStatus {
    if (total === 0) {
      return LessonProgressStatus.NOT_STARTED;
    }

    if (completed === total) {
      return LessonProgressStatus.COMPLETED;
    }

    if (completed > 0 || inProgress > 0) {
      return LessonProgressStatus.IN_PROGRESS;
    }

    return LessonProgressStatus.NOT_STARTED;
  }

  private resolveLastActivityAt(
    lessonProgress: Array<Pick<ProgressRow, 'updatedAt'>>,
    submittedAttempts: Array<Pick<SubmittedAttemptRow, 'submittedAt'>>,
  ) {
    let maxDate: Date | null = null;

    for (const row of lessonProgress) {
      if (!maxDate || row.updatedAt > maxDate) {
        maxDate = row.updatedAt;
      }
    }

    for (const attempt of submittedAttempts) {
      if (
        attempt.submittedAt &&
        (!maxDate || attempt.submittedAt > maxDate)
      ) {
        maxDate = attempt.submittedAt;
      }
    }

    return maxDate ? maxDate.toISOString() : null;
  }

  private averageNullable(values: Array<number | null | undefined>) {
    const numbers = values.filter((value): value is number => value !== null && value !== undefined);

    if (numbers.length === 0) {
      return null;
    }

    return Number(
      (numbers.reduce((sum, value) => sum + value, 0) / numbers.length).toFixed(2),
    );
  }

  private maxNullable(values: Array<number | null | undefined>) {
    const numbers = values.filter((value): value is number => value !== null && value !== undefined);

    if (numbers.length === 0) {
      return null;
    }

    return Math.max(...numbers);
  }

  private countLessonTypes(modules: PublishedCourseModule[]) {
    let lecture = 0;
    let webinar = 0;
    let test = 0;

    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (lesson.type === LessonType.LECTURE) {
          lecture += 1;
        } else if (lesson.type === LessonType.WEBINAR) {
          webinar += 1;
        } else if (lesson.type === LessonType.TEST) {
          test += 1;
        }
      }
    }

    return { lecture, webinar, test };
  }

  private async getPublishedModulesWithLessons(courseId: string): Promise<PublishedCourseModule[]> {
    return this.prisma.courseModule.findMany({
      where: {
        courseId,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        orderIndex: true,
        lessons: {
          where: {
            isPublished: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
          select: {
            id: true,
            title: true,
            type: true,
            orderIndex: true,
            moduleId: true,
          },
        },
      },
    });
  }

  private async resolveContext(studentId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        type: true,
        isPublished: true,
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (!lesson.isPublished) {
      throw new ForbiddenException('Lesson is not published');
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

    return {
      enrollmentId: enrollment.id,
      courseId: lesson.module.courseId,
      lessonType: lesson.type,
    };
  }

  private async assertTeacherOwnsCourse(
    teacherId: string,
    courseId: string,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You can view progress only for your own courses');
    }
  }
}
