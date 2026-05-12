import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { ImportStudentsDto } from '../users/dto/import-students.dto';
import { CreateCourseStudentDto } from './dto/create-course-student.dto';
import { SearchCourseStudentsQueryDto } from './dto/search-course-students.query.dto';
import { EnrollmentsService } from './enrollments.service';

const csvFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
  .build({ fileIsRequired: true });

type UploadedCsvFile = {
  buffer: Buffer;
};

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
  @Post('course/:courseId/students/import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewCourseStudentsImport(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @UploadedFile(csvFilePipe) file: UploadedCsvFile,
  ) {
    return this.enrollmentsService.previewCourseStudentImport(
      user.userId,
      courseId,
      file.buffer,
    );
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post('course/:courseId/students/import')
  @UseInterceptors(FileInterceptor('file'))
  importCourseStudents(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @UploadedFile(csvFilePipe) file: UploadedCsvFile,
    @Body() dto: ImportStudentsDto,
  ) {
    return this.enrollmentsService.importStudentsForCourse(
      user.userId,
      courseId,
      file.buffer,
      dto.enrollToCourse ?? false,
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
