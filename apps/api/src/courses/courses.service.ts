import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, EnrollmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublic(page = 1, limit = 12) {
    const safeLimit = Math.min(limit, 50);
    const skip = (page - 1) * safeLimit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where: { status: CourseStatus.PUBLISHED },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          title: true,
          shortDescription: true,
          coverImageUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
            select: { id: true, fullName: true },
          },
          _count: {
            select: { modules: true, enrollments: true },
          },
        },
      }),
      this.prisma.course.count({
        where: { status: CourseStatus.PUBLISHED },
      }),
    ]);

    return {
      items,
      page,
      limit: safeLimit,
      total,
    };
  }

  async getPublicById(courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
      },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                orderIndex: true,
                isPublished: true,
              },
            },
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Published course not found');
    }

    return course;
  }

  async listTeacherCourses(teacherId: string) {
    return this.prisma.course.findMany({
      where: { teacherId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        shortDescription: true,
        coverImageUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { modules: true, enrollments: true },
        },
      },
    });
  }

  async getStudentCourseById(studentId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId,
        },
      },
      select: {
        id: true,
        status: true,
        enrolledAt: true,
      },
    });

    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                moduleId: true,
                type: true,
                title: true,
                description: true,
                orderIndex: true,
                isPublished: true,
                progress: {
                  where: { studentId },
                  select: {
                    id: true,
                    status: true,
                    completedAt: true,
                    updatedAt: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      ...course,
      enrollment: {
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
      },
    };
  }

  async getTeacherCourseById(teacherId: string, courseId: string) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    return this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        _count: {
          select: { modules: true, enrollments: true },
        },
      },
    });
  }

  async create(teacherId: string, dto: CreateCourseDto) {
    const slug = await this.generateUniqueSlug(dto.title);

    return this.prisma.course.create({
      data: {
        teacherId,
        title: dto.title,
        shortDescription: dto.shortDescription,
        fullDescription: dto.fullDescription,
        coverImageUrl: dto.coverImageUrl,
        slug,
        status: dto.status ?? CourseStatus.DRAFT,
      },
    });
  }

  async update(teacherId: string, courseId: string, dto: UpdateCourseDto) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const data: Prisma.CourseUpdateInput = {
      title: dto.title,
      shortDescription: dto.shortDescription,
      fullDescription: dto.fullDescription,
      coverImageUrl:
        dto.coverImageUrl === undefined ? undefined : dto.coverImageUrl,
      status: dto.status,
    };

    if (dto.title) {
      data.slug = await this.generateUniqueSlug(dto.title, courseId);
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data,
    });
  }

  async remove(teacherId: string, courseId: string) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    await this.prisma.course.delete({
      where: { id: courseId },
    });

    return { success: true };
  }

  private async assertTeacherOwnsCourse(
    teacherId: string,
    courseId: string,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, teacherId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenException('You can manage only your own courses');
    }
  }

  private async generateUniqueSlug(
    title: string,
    excludeCourseId?: string,
  ): Promise<string> {
    const base = this.buildSlug(title);
    let slug = base;
    let counter = 2;

    // Ensure slug uniqueness while preserving readability for teacher-friendly URLs.
    while (true) {
      const existing = await this.prisma.course.findFirst({
        where: {
          slug,
          ...(excludeCourseId ? { NOT: { id: excludeCourseId } } : {}),
        },
        select: { id: true },
      });

      if (!existing) {
        return slug;
      }

      slug = `${base}-${counter}`;
      counter += 1;
    }
  }

  private buildSlug(title: string): string {
    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    return slug.length > 0 ? slug : 'course';
  }
}
