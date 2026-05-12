import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ImportStudentsDto } from './dto/import-students.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { StudentImportService } from './student-import.service';
import { UsersService } from './users.service';

const csvFilePipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({ maxSize: 1024 * 1024 * 5 })
  .build({ fileIsRequired: true });

type UploadedCsvFile = {
  buffer: Buffer;
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly studentImportService: StudentImportService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.getCurrentProfile(user.userId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.findMany(query.role);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get('admin/teachers')
  listTeachers() {
    return this.usersService.listTeachers();
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Get('admin/students')
  listStudents() {
    return this.usersService.listStudents();
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('admin/teachers')
  createTeacher(@Body() dto: CreateTeacherDto) {
    return this.usersService.createTeacher(dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('admin/students')
  createStudentByAdmin(@Body() dto: CreateStudentDto) {
    return this.usersService.createStudent(dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('admin/students/import/preview')
  @UseInterceptors(FileInterceptor('file'))
  previewStudentsImportByAdmin(
    @UploadedFile(csvFilePipe) file: UploadedCsvFile,
  ) {
    return this.studentImportService.preview(file.buffer);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Post('admin/students/import')
  @UseInterceptors(FileInterceptor('file'))
  importStudentsByAdmin(
    @CurrentUser() user: AuthUser,
    @UploadedFile(csvFilePipe) file: UploadedCsvFile,
    @Body() _: ImportStudentsDto,
  ) {
    return this.studentImportService.importStudents(file.buffer, {
      importedById: user.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('students/import/download/:downloadId')
  downloadStudentsImportResult(
    @CurrentUser() user: AuthUser,
    @Param('downloadId', new ParseUUIDPipe()) downloadId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = this.studentImportService.getCredentialsFile(downloadId, user.userId);

    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);

    return new StreamableFile(file.content);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch('admin/teachers/:id')
  updateTeacher(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.usersService.updateTeacher(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Patch('admin/students/:id')
  updateStudent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.usersService.updateStudent(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @Delete('admin/teachers/:id')
  removeTeacher(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.removeTeacher(id);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get(':id')
  byId(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findById(id);
  }
}

