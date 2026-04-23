import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyEnrollments(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, fullName: true } },
            modules: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                orderIndex: true,
                lessons: {
                  where: { isPublished: true },
                  orderBy: { orderIndex: 'asc' },
                  select: {
                    id: true,
                    moduleId: true,
                    title: true,
                    description: true,
                    type: true,
                    orderIndex: true,
                    isPublished: true,
                  },
                },
              },
            },
          },
        },
        lessonProgress: {
          select: {
            lessonId: true,
            status: true,
            completedAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async listCourseEnrollments(teacherId: string, courseId: string) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    return this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async removeStudentFromCourse(teacherId: string, enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { select: { id: true, teacherId: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    if (enrollment.course.teacherId !== teacherId) {
      throw new ForbiddenException('You can remove students only from your own courses');
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: EnrollmentStatus.REMOVED,
        removedAt: new Date(),
        removedById: teacherId,
      },
    });
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
      throw new ForbiddenException('You can access only your own courses');
    }
  }
}
