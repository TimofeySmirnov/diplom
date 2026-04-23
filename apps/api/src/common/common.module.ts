import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { StudentRoleGuard } from './guards/student-role.guard';
import { TeacherRoleGuard } from './guards/teacher-role.guard';

@Global()
@Module({
  providers: [JwtAuthGuard, RolesGuard, StudentRoleGuard, TeacherRoleGuard],
  exports: [JwtAuthGuard, RolesGuard, StudentRoleGuard, TeacherRoleGuard],
})
export class CommonModule {}