import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCourseStudentDto } from './dto/create-course-student.dto';
import { SearchCourseStudentsQueryDto } from './dto/search-course-students.query.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

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
          select: { id: true, fullName: true, email: true, group: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async searchStudentsForCourse(
    teacherId: string,
    courseId: string,
    filters: SearchCourseStudentsQueryDto,
  ) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);

    const students = await this.prisma.user.findMany({
      where: {
        role: UserRole.STUDENT,
        ...(filters.fullName
          ? {
              fullName: {
                contains: filters.fullName,
                mode: 'insensitive',
              },
            }
          : {}),
        ...(filters.group
          ? {
              group: {
                contains: filters.group,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        group: true,
      },
      orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });

    if (students.length === 0) {
      return [];
    }

    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: EnrollmentStatus.ACTIVE,
        studentId: {
          in: students.map((student) => student.id),
        },
      },
      select: {
        studentId: true,
      },
    });

    const enrolledStudentIds = new Set(
      activeEnrollments.map((enrollment) => enrollment.studentId),
    );

    return students.map((student) => ({
      ...student,
      isEnrolled: enrolledStudentIds.has(student.id),
    }));
  }

  async createStudentForCourse(
    teacherId: string,
    courseId: string,
    dto: CreateCourseStudentDto,
  ) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const createdStudent = await this.usersService.createStudent(dto);

    const enrollment = await this.prisma.enrollment.create({
      data: {
        courseId,
        studentId: createdStudent.id,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, group: true },
        },
      },
    });

    if (!enrollment.student) {
      throw new BadRequestException('Failed to enroll created student');
    }

    return {
      enrollment,
      student: createdStudent,
      credentials: {
        email: createdStudent.email,
        password: dto.password,
      },
    };
  }

  async enrollExistingStudentForCourse(
    teacherId: string,
    courseId: string,
    studentId: string,
  ) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingEnrollment?.status === EnrollmentStatus.ACTIVE) {
      throw new BadRequestException('Student is already enrolled in this course');
    }

    if (existingEnrollment) {
      return this.prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: EnrollmentStatus.ACTIVE,
          enrolledAt: new Date(),
          removedAt: null,
          removedById: null,
        },
        include: {
          student: {
            select: { id: true, fullName: true, email: true, group: true },
          },
        },
      });
    }

    return this.prisma.enrollment.create({
      data: {
        courseId,
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, group: true },
        },
      },
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
