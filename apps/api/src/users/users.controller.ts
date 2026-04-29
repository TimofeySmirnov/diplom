import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
