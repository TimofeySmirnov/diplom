import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, courseId: string, dto: CreateInvitationDto) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Invitation expiration must be in the future');
    }

    return this.prisma.courseInvitation.create({
      data: {
        courseId,
        createdById: teacherId,
        token: randomBytes(16).toString('hex'),
        expiresAt,
        maxUses: dto.maxUses,
      },
    });
  }

  async listForCourse(teacherId: string, courseId: string) {
    await this.assertTeacherOwnsCourse(teacherId, courseId);

    return this.prisma.courseInvitation.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivate(teacherId: string, invitationId: string) {
    const invitation = await this.prisma.courseInvitation.findUnique({
      where: { id: invitationId },
      include: { course: { select: { teacherId: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.course.teacherId !== teacherId) {
      throw new ForbiddenException('You can manage only your own invitations');
    }

    return this.prisma.courseInvitation.update({
      where: { id: invitationId },
      data: { isActive: false },
    });
  }

  async redeem(studentId: string, token: string) {
    const invitation = await this.prisma.courseInvitation.findUnique({
      where: { token },
      include: {
        course: { select: { id: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (!invitation.isActive) {
      throw new BadRequestException('Invitation is inactive');
    }

    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invitation has expired');
    }

    if (
      invitation.maxUses !== null &&
      invitation.maxUses !== undefined &&
      invitation.usesCount >= invitation.maxUses
    ) {
      throw new BadRequestException('Invitation usage limit reached');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.enrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: invitation.courseId,
            studentId,
          },
        },
      });

      if (existing?.status === EnrollmentStatus.ACTIVE) {
        return existing;
      }

      const enrollment = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: {
              status: EnrollmentStatus.ACTIVE,
              invitationId: invitation.id,
              enrolledAt: new Date(),
              removedAt: null,
              removedById: null,
            },
          })
        : await tx.enrollment.create({
            data: {
              courseId: invitation.courseId,
              studentId,
              invitationId: invitation.id,
              status: EnrollmentStatus.ACTIVE,
            },
          });

      await tx.courseInvitation.update({
        where: { id: invitation.id },
        data: {
          usesCount: { increment: 1 },
        },
      });

      return enrollment;
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
      throw new ForbiddenException('You can manage invitations only for your own courses');
    }
  }
}
