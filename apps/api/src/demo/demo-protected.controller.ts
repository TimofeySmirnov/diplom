import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { AuthUser } from '../common/types/auth-user.type';

@Controller('protected')
export class DemoProtectedController {
  @UseGuards(JwtAuthGuard)
  @Get('any-authenticated')
  anyAuthenticated(@CurrentUser() user: AuthUser) {
    return {
      message: 'Authenticated route',
      user,
    };
  }

  // Generic roles guard + @Roles decorator
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Get('student-only')
  studentOnly(@CurrentUser() user: AuthUser) {
    return {
      message: 'Student route (RolesGuard)',
      user,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER)
  @Get('teacher-only')
  teacherOnly(@CurrentUser() user: AuthUser) {
    return {
      message: 'Teacher route (RolesGuard)',
      user,
    };
  }

  // Explicit role-specific guards
  @UseGuards(JwtAuthGuard, StudentRoleGuard)
  @Get('student-only-direct-guard')
  studentOnlyDirect(@CurrentUser() user: AuthUser) {
    return {
      message: 'Student route (StudentRoleGuard)',
      user,
    };
  }

  @UseGuards(JwtAuthGuard, TeacherRoleGuard)
  @Get('teacher-only-direct-guard')
  teacherOnlyDirect(@CurrentUser() user: AuthUser) {
    return {
      message: 'Teacher route (TeacherRoleGuard)',
      user,
    };
  }
}