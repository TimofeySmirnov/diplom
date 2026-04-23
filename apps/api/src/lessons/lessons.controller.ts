import {
  Body,
  Controller,
  Delete,
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
import { CreateLectureLessonDto } from './dto/create-lecture-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateWebinarLessonDto } from './dto/create-webinar-lesson.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
import { UpdateLectureLessonDto } from './dto/update-lecture-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateWebinarLessonDto } from './dto/update-webinar-lesson.dto';
import { LessonsService } from './lessons.service';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post('lecture')
  createLecture(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLectureLessonDto,
  ) {
    return this.lessonsService.createLecture(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('lecture/:lessonId')
  getLectureById(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.lessonsService.getLectureById(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch('lecture/:lessonId')
  updateLecture(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: UpdateLectureLessonDto,
  ) {
    return this.lessonsService.updateLecture(user.userId, lessonId, dto);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('student/lecture/:lessonId')
  getStudentLecture(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.lessonsService.getLectureByIdForStudent(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post('webinar')
  createWebinar(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateWebinarLessonDto,
  ) {
    return this.lessonsService.createWebinar(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('webinar/:lessonId')
  getWebinarById(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.lessonsService.getWebinarById(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch('webinar/:lessonId')
  updateWebinar(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: UpdateWebinarLessonDto,
  ) {
    return this.lessonsService.updateWebinar(user.userId, lessonId, dto);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('student/webinar/:lessonId')
  getStudentWebinar(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.lessonsService.getWebinarByIdForStudent(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('student/module/:moduleId')
  listStudentModuleLessons(
    @CurrentUser() user: AuthUser,
    @Param('moduleId', new ParseUUIDPipe()) moduleId: string,
  ) {
    return this.lessonsService.listPublishedByModuleForStudent(
      user.userId,
      moduleId,
    );
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('module/:moduleId')
  listByModule(
    @CurrentUser() user: AuthUser,
    @Param('moduleId', new ParseUUIDPipe()) moduleId: string,
  ) {
    return this.lessonsService.listByModule(user.userId, moduleId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get(':lessonId')
  getById(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.lessonsService.getById(user.userId, lessonId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch('reorder')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderLessonsDto) {
    return this.lessonsService.reorder(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch(':lessonId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(user.userId, lessonId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Delete(':lessonId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
  ) {
    return this.lessonsService.remove(user.userId, lessonId);
  }
}
