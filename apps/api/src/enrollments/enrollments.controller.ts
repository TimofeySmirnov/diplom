import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateCourseStudentDto } from './dto/create-course-student.dto';
import { SearchCourseStudentsQueryDto } from './dto/search-course-students.query.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('my')
  my(@CurrentUser() user: AuthUser) {
    return this.enrollmentsService.listMyEnrollments(user.userId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('course/:courseId')
  byCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.enrollmentsService.listCourseEnrollments(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('course/:courseId/students/search')
  searchStudentsForCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Query() query: SearchCourseStudentsQueryDto,
  ) {
    return this.enrollmentsService.searchStudentsForCourse(
      user.userId,
      courseId,
      query,
    );
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post('course/:courseId/students')
  createStudentForCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: CreateCourseStudentDto,
  ) {
    return this.enrollmentsService.createStudentForCourse(
      user.userId,
      courseId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post('course/:courseId/students/:studentId')
  enrollExistingStudentForCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Param('studentId', new ParseUUIDPipe()) studentId: string,
  ) {
    return this.enrollmentsService.enrollExistingStudentForCourse(
      user.userId,
      courseId,
      studentId,
    );
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Delete(':enrollmentId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('enrollmentId', new ParseUUIDPipe()) enrollmentId: string,
  ) {
    return this.enrollmentsService.removeStudentFromCourse(user.userId, enrollmentId);
  }
}
