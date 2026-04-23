import { Lesson, LessonType } from '@/types/domain';
import { apiRequest } from './client';

export type LessonLecturePayload = {
  content: Record<string, unknown>;
};

export type LessonTestPayload = {
  passingScore?: number;
  allowMultipleAttempts?: boolean;
  maxAttempts?: number;
  timeLimitMinutes?: number;
};

export type LessonWebinarPayload = {
  meetingLink: string;
  scheduledAt: string;
  durationMinutes?: number;
};

export type CreateLessonPayload = {
  moduleId: string;
  type: LessonType;
  title: string;
  description?: string;
  orderIndex?: number;
  isPublished?: boolean;
  lecture?: LessonLecturePayload;
  test?: LessonTestPayload;
  webinar?: LessonWebinarPayload;
};

export type UpdateLessonPayload = {
  type?: LessonType;
  title?: string;
  description?: string;
  orderIndex?: number;
  isPublished?: boolean;
  lecture?: LessonLecturePayload;
  test?: LessonTestPayload;
  webinar?: Partial<LessonWebinarPayload>;
};

export type ReorderLessonItem = {
  lessonId: string;
  orderIndex: number;
};

export type ReorderLessonsPayload = {
  moduleId: string;
  items: ReorderLessonItem[];
};

export type CreateLectureLessonPayload = {
  moduleId: string;
  title: string;
  description?: string;
  orderIndex?: number;
  isPublished?: boolean;
  content: Record<string, unknown>;
};

export type UpdateLectureLessonPayload = {
  title?: string;
  description?: string;
  orderIndex?: number;
  isPublished?: boolean;
  content?: Record<string, unknown>;
};

export type CreateWebinarLessonPayload = {
  moduleId: string;
  title: string;
  description?: string;
  orderIndex?: number;
  isPublished?: boolean;
  meetingLink: string;
  scheduledAt: string;
  durationMinutes?: number;
};

export type UpdateWebinarLessonPayload = {
  title?: string;
  description?: string;
  orderIndex?: number;
  isPublished?: boolean;
  meetingLink?: string;
  scheduledAt?: string;
  durationMinutes?: number;
};

export type StudentLessonProgress = {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt?: string | null;
  lastViewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StudentLectureProgress = StudentLessonProgress;

export type StudentLecturePayload = {
  lesson: Lesson & {
    module: {
      id: string;
      title: string;
      courseId: string;
      course: {
        id: string;
        title: string;
      };
    };
  };
  progress: StudentLessonProgress | null;
};

export type StudentWebinarPayload = {
  lesson: Lesson & {
    module: {
      id: string;
      title: string;
      courseId: string;
      course: {
        id: string;
        title: string;
      };
    };
  };
  progress: StudentLessonProgress | null;
};

export const lessonsApi = {
  getById: (lessonId: string, token: string) =>
    apiRequest<Lesson>(`/lessons/${lessonId}`, { token }),

  listByModule: (moduleId: string, token: string) =>
    apiRequest<Lesson[]>(`/lessons/module/${moduleId}`, { token }),

  listStudentModuleLessons: (moduleId: string, token: string) =>
    apiRequest<Lesson[]>(`/lessons/student/module/${moduleId}`, { token }),

  getTeacherLectureById: (lessonId: string, token: string) =>
    apiRequest<Lesson>(`/lessons/lecture/${lessonId}`, { token }),

  getStudentLectureById: (lessonId: string, token: string) =>
    apiRequest<StudentLecturePayload>(`/lessons/student/lecture/${lessonId}`, {
      token,
    }),

  getTeacherWebinarById: (lessonId: string, token: string) =>
    apiRequest<Lesson>(`/lessons/webinar/${lessonId}`, { token }),

  getStudentWebinarById: (lessonId: string, token: string) =>
    apiRequest<StudentWebinarPayload>(`/lessons/student/webinar/${lessonId}`, {
      token,
    }),

  create: (token: string, payload: CreateLessonPayload) =>
    apiRequest<Lesson>('/lessons', {
      method: 'POST',
      token,
      body: payload,
    }),

  createLecture: (token: string, payload: CreateLectureLessonPayload) =>
    apiRequest<Lesson>('/lessons/lecture', {
      method: 'POST',
      token,
      body: payload,
    }),

  createWebinar: (token: string, payload: CreateWebinarLessonPayload) =>
    apiRequest<Lesson>('/lessons/webinar', {
      method: 'POST',
      token,
      body: payload,
    }),

  update: (token: string, lessonId: string, payload: UpdateLessonPayload) =>
    apiRequest<Lesson>(`/lessons/${lessonId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  updateLecture: (
    token: string,
    lessonId: string,
    payload: UpdateLectureLessonPayload,
  ) =>
    apiRequest<Lesson>(`/lessons/lecture/${lessonId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  updateWebinar: (
    token: string,
    lessonId: string,
    payload: UpdateWebinarLessonPayload,
  ) =>
    apiRequest<Lesson>(`/lessons/webinar/${lessonId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  remove: (token: string, lessonId: string) =>
    apiRequest<{ success: true }>(`/lessons/${lessonId}`, {
      method: 'DELETE',
      token,
    }),

  reorder: (token: string, payload: ReorderLessonsPayload) =>
    apiRequest<Lesson[]>('/lessons/reorder', {
      method: 'PATCH',
      token,
      body: payload,
    }),
};
