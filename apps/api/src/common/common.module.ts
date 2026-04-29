import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { RolesGuard } from './guards/roles.guard';
import { StudentRoleGuard } from './guards/student-role.guard';
import { TeacherRoleGuard } from './guards/teacher-role.guard';

@Global()
@Module({
  providers: [
    JwtAuthGuard,
    RolesGuard,
    StudentRoleGuard,
    TeacherRoleGuard,
    AdminRoleGuard,
  ],
  exports: [
    JwtAuthGuard,
    RolesGuard,
    StudentRoleGuard,
    TeacherRoleGuard,
    AdminRoleGuard,
  ],
})
export class CommonModule {}
