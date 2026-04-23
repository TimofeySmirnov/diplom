import { apiRequest } from './client';
import {
  TeacherCourseProgressOverview,
  TeacherStudentProgressDetails,
} from './progress-api';

export type CourseAnalyticsOverview = TeacherCourseProgressOverview;

export type CourseAnalyticsStudentsList = {
  course: CourseAnalyticsOverview['course'];
  summary: CourseAnalyticsOverview['summary'];
  tests: CourseAnalyticsOverview['tests'];
  students: CourseAnalyticsOverview['students'];
};

export type StudentAnalyticsDetails = TeacherStudentProgressDetails;

export const statisticsApi = {
  byCourse: (courseId: string, token: string) =>
    apiRequest<CourseAnalyticsOverview>(`/statistics/courses/${courseId}`, { token }),

  studentsByCourse: (courseId: string, token: string) =>
    apiRequest<CourseAnalyticsStudentsList>(`/statistics/courses/${courseId}/students`, {
      token,
    }),

  byStudent: (courseId: string, studentId: string, token: string) =>
    apiRequest<StudentAnalyticsDetails>(
      `/statistics/courses/${courseId}/students/${studentId}`,
      {
        token,
      },
    ),
};
