import { Injectable } from '@nestjs/common';
import { ProgressService } from '../progress/progress.service';

@Injectable()
export class StatisticsService {
  constructor(private readonly progressService: ProgressService) {}

  async getCourseStatistics(teacherId: string, courseId: string) {
    return this.progressService.getTeacherCourseProgressOverview(
      teacherId,
      courseId,
    );
  }

  async listCourseStudentsStatistics(teacherId: string, courseId: string) {
    const overview = await this.progressService.getTeacherCourseProgressOverview(
      teacherId,
      courseId,
    );

    return {
      course: overview.course,
      summary: overview.summary,
      tests: overview.tests,
      students: overview.students,
    };
  }

  async getStudentStatistics(
    teacherId: string,
    courseId: string,
    studentId: string,
  ) {
    return this.progressService.getTeacherStudentProgressByCourse(
      teacherId,
      courseId,
      studentId,
    );
  }
}
