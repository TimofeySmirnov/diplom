import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('my/course/:courseId')
  myCourseProgress(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.progressService.listMyCourseProgress(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('my/course/:courseId/overview')
  myCourseProgressOverview(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.progressService.getMyCourseProgressOverview(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Post('lessons/:lessonId/start')
  markStarted(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.progressService.markStarted(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Post('lessons/:lessonId/complete')
  markCompleted(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.progressService.markCompleted(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('teacher/courses/:courseId')
  teacherCourseProgress(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.progressService.getTeacherCourseProgressOverview(
      user.userId,
      courseId,
    );
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('teacher/courses/:courseId/students/:studentId')
  teacherStudentProgress(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.progressService.getTeacherStudentProgressByCourse(
      user.userId,
      courseId,
      studentId,
    );
  }
}
