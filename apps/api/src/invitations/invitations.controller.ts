import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { RedeemInvitationDto } from './dto/redeem-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post('course/:courseId')
  create(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(user.userId, courseId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('course/:courseId')
  list(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.invitationsService.listForCourse(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch(':invitationId/deactivate')
  deactivate(
    @CurrentUser() user: AuthUser,
    @Param('invitationId', new ParseUUIDPipe()) invitationId: string,
  ) {
    return this.invitationsService.deactivate(user.userId, invitationId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Post('accept')
  accept(@CurrentUser() user: AuthUser, @Body() dto: RedeemInvitationDto) {
    return this.invitationsService.redeem(user.userId, dto.token);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Post('redeem')
  redeem(@CurrentUser() user: AuthUser, @Body() dto: RedeemInvitationDto) {
    return this.invitationsService.redeem(user.userId, dto.token);
  }
}
