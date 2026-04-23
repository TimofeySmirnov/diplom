import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
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

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get(':id')
  byId(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findById(id);
  }
}