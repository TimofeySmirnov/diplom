import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  group: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findMany(role?: UserRole) {
    return this.prisma.user.findMany({
      where: role ? { role } : undefined,
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async listTeachers() {
    return this.findMany(UserRole.TEACHER);
  }

  async listStudents() {
    return this.findMany(UserRole.STUDENT);
  }

  async createTeacher(dto: CreateTeacherDto) {
    return this.createUserWithRole(dto, UserRole.TEACHER);
  }

  async createStudent(dto: CreateStudentDto) {
    return this.createUserWithRole(dto, UserRole.STUDENT);
  }

  private async createUserWithRole(
    dto: { email: string; password: string; fullName: string; group?: string | null },
    role: UserRole,
  ) {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName.trim(),
        group: dto.group ?? null,
        role,
      },
      select: publicUserSelect,
    });
  }

  async updateStudent(id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User is not a student');
    }

    const nextEmail = dto.email?.toLowerCase();
    if (nextEmail && nextEmail !== student.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('User with this email already exists');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: nextEmail,
        fullName: dto.fullName?.trim(),
        group: dto.group === undefined ? undefined : dto.group,
      },
      select: publicUserSelect,
    });
  }

  async updateTeacher(id: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('User is not a teacher');
    }

    const nextEmail = dto.email?.toLowerCase();
    if (nextEmail && nextEmail !== teacher.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('User with this email already exists');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        email: nextEmail,
        fullName: dto.fullName?.trim(),
      },
      select: publicUserSelect,
    });
  }

  async removeTeacher(id: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        _count: {
          select: {
            teacherCourses: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (teacher.role !== UserRole.TEACHER) {
      throw new BadRequestException('User is not a teacher');
    }
    if (teacher._count.teacherCourses > 0) {
      throw new BadRequestException(
        'Cannot delete teacher with existing courses',
      );
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { success: true };
  }
}
