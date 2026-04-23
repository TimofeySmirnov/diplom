import { LessonProgressStatus, LessonType } from '@/types/domain';
import { apiRequest } from './client';

export type LessonProgressItem = {
  id: string;
  enrollmentId: string;
  studentId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt?: string | null;
  lastViewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProgressSummary = {
  completedLessons: number;
  inProgressLessons: number;
  notStartedLessons: number;
  totalLessons: number;
  completionRatePercent: number;
  status: LessonProgressStatus;
};

export type StudentCourseProgressOverview = {
  course: {
    id: string;
    title: string;
  };
  student: {
    id: string;
  };
  summary: ProgressSummary;
  tests: {
    submittedAttempts: number;
    averageScorePercent: number | null;
    bestScorePercent: number | null;
  };
  modules: Array<{
    id: string;
    title: string;
    description?: string | null;
    orderIndex: number;
    progress: ProgressSummary;
    lessons: Array<{
      id: string;
      title: string;
      type: LessonType;
      orderIndex: number;
      status: LessonProgressStatus;
      startedAt?: string | null;
      lastViewedAt?: string | null;
      completedAt?: string | null;
      tests?: {
        attemptsCount: number;
        bestScore: number | null;
        bestMaxScore: number | null;
        bestScorePercent: number | null;
      } | null;
    }>;
  }>;
  lastActivityAt: string | null;
};

export type TeacherCourseProgressOverview = {
  course: {
    id: string;
    title: string;
  };
  summary: {
    students: number;
    lessons: {
      total: number;
      lecture: number;
      webinar: number;
      test: number;
    };
    completedLessonProgress: number;
    inProgressLessonProgress: number;
    notStartedLessonProgress: number;
    totalPossibleProgress: number;
    completionRatePercent: number;
    averageStudentCompletionPercent: number;
    studentsCompletedCourse: number;
    studentsAtRisk: number;
  };
  tests: {
    submittedAttempts: number;
    averageBestScorePercent: number | null;
  };
  students: Array<{
    enrollmentId: string;
    student: {
      id: string;
      fullName: string;
      email: string;
    };
    progress: ProgressSummary & {
      lastActivityAt: string | null;
    };
    tests: {
      submittedAttempts: number;
      averageScorePercent: number | null;
      bestScorePercent: number | null;
    };
  }>;
};

export type TeacherStudentProgressDetails = {
  course: {
    id: string;
    title: string;
  };
  student: {
    id: string;
    fullName: string;
    email: string;
  };
  enrollment: {
    id: string;
    enrolledAt: string;
  };
  summary: ProgressSummary;
  tests: {
    submittedAttempts: number;
    averageScorePercent: number | null;
    bestScorePercent: number | null;
  };
  modules: StudentCourseProgressOverview['modules'];
  lastActivityAt: string | null;
};

export const progressApi = {
  listMyCourseProgress: (token: string, courseId: string) =>
    apiRequest<LessonProgressItem[]>(`/progress/my/course/${courseId}`, { token }),

  getMyCourseOverview: (token: string, courseId: string) =>
    apiRequest<StudentCourseProgressOverview>(
      `/progress/my/course/${courseId}/overview`,
      {
        token,
      },
    ),

  getTeacherCourseOverview: (token: string, courseId: string) =>
    apiRequest<TeacherCourseProgressOverview>(
      `/progress/teacher/courses/${courseId}`,
      {
        token,
      },
    ),

  getTeacherStudentProgress: (token: string, courseId: string, studentId: string) =>
    apiRequest<TeacherStudentProgressDetails>(
      `/progress/teacher/courses/${courseId}/students/${studentId}`,
      {
        token,
      },
    ),

  markStarted: (token: string, lessonId: string) =>
    apiRequest<LessonProgressItem>(`/progress/lessons/${lessonId}/start`, {
      method: 'POST',
      token,
    }),

  markCompleted: (token: string, lessonId: string) =>
    apiRequest<LessonProgressItem>(`/progress/lessons/${lessonId}/complete`, {
      method: 'POST',
      token,
    }),
};
