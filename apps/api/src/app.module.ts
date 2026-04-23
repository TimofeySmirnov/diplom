import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { InvitationsModule } from './invitations/invitations.module';
import { LessonsModule } from './lessons/lessons.module';
import { ModulesModule } from './modules/modules.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    ModulesModule,
    LessonsModule,
    EnrollmentsModule,
    InvitationsModule,
    ProgressModule,
    TestsModule,
    StatisticsModule,
  ],
})
export class AppModule {}