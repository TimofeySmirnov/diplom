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
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';
import { CreateModuleDto } from './dto/create-module.dto';
import { ReorderModulesDto } from './dto/reorder-modules.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModulesService } from './modules.service';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('course/:courseId')
  listByCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
  ) {
    return this.modulesService.listByCourse(user.userId, courseId);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateModuleDto) {
    return this.modulesService.create(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch('reorder')
  reorder(@CurrentUser() user: AuthUser, @Body() dto: ReorderModulesDto) {
    return this.modulesService.reorder(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Patch(':moduleId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('moduleId', new ParseUUIDPipe()) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.modulesService.update(user.userId, moduleId, dto);
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Delete(':moduleId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('moduleId', new ParseUUIDPipe()) moduleId: string,
  ) {
    return this.modulesService.remove(user.userId, moduleId);
  }
}
