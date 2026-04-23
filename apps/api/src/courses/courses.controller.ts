import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListPublicCoursesQueryDto } from './dto/list-public-courses.query.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('public')
  listPublic(@Query() query: ListPublicCoursesQueryDto) {
    return this.coursesService.listPublic(query.page, query.limit);
  }

  @Get('public/:courseId')
  publicById(@Param('courseId', new ParseUUIDPipe()) courseId: string) {
    return this.coursesService.getPublicById(courseId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('my')
  myCourses(@CurrentUser() user: AuthUser) {
    return this.coursesService.listTeacherCourses(user.userId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('student/:courseId')
  studentCourseById(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.coursesService.getStudentCourseById(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('my/:courseId')
  myCourseById(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.coursesService.getTeacherCourseById(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch('my/:courseId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(user.userId, courseId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Delete('my/:courseId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.coursesService.remove(user.userId, courseId);
  }
}
