import { Module } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentRoleGuard } from '../common/guards/student-role.guard';
import { TeacherRoleGuard } from '../common/guards/teacher-role.guard';
import { DemoProtectedController } from './demo-protected.controller';

@Module({
  controllers: [DemoProtectedController],
  providers: [RolesGuard, StudentRoleGuard, TeacherRoleGuard],
})
export class DemoProtectedModule {}