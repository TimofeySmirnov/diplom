import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { SubmitTestAttemptDto } from './dto/submit-test-attempt.dto';
import { UpsertTestContentDto } from './dto/upsert-test-content.dto';
import { TestsService } from './tests.service';

@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('lessons/:lessonId/content')
  lessonContentForTeacher(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.testsService.getLessonTestContentForTeacher(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Put('lessons/:lessonId/content')
  upsertLessonContentForTeacher(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: UpsertTestContentDto,
  ) {
    return this.testsService.upsertLessonTestContentForTeacher(
      user.userId,
      lessonId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('student/lessons/:lessonId')
  studentLessonForPassing(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.testsService.getStudentTestForPassing(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Post('lessons/:lessonId/attempts')
  startAttempt(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.testsService.startAttempt(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Post('attempts/:attemptId/submit')
  submitAttempt(
    @CurrentUser() user: AuthUser,
    @Param('attemptId', new ParseUUIDPipe()) attemptId: string,
    @Body() dto: SubmitTestAttemptDto,
  ) {
    return this.testsService.submitAttempt(user.userId, attemptId, dto);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('lessons/:lessonId/attempts/my')
  myAttempts(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.testsService.listMyAttempts(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('attempts/:attemptId/result')
  attemptResult(
    @CurrentUser() user: AuthUser,
    @Param('attemptId', new ParseUUIDPipe()) attemptId: string,
  ) {
    return this.testsService.getAttemptResult(user.userId, attemptId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('lessons/:lessonId/attempts')
  lessonAttempts(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.testsService.listLessonAttemptsForTeacher(user.userId, lessonId);
  }
}
