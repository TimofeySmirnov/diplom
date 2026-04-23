import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard, TeacherRoleGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('courses/:courseId')
  byCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.statisticsService.getCourseStatistics(user.userId, courseId);
  }

  @Get('courses/:courseId/students')
  studentsByCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.statisticsService.listCourseStudentsStatistics(
      user.userId,
      courseId,
    );
  }

  @Get('courses/:courseId/students/:studentId')
  byStudent(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.statisticsService.getStudentStatistics(
      user.userId,
      courseId,
      studentId,
    );
  }
}
