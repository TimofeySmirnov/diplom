import { PaginatedResponse } from '@/types/api';
import {
  Course,
  CourseDetails,
  CourseListItem,
  CourseStatus,
  StudentCourseDetails,
} from '@/types/domain';
import { apiRequest } from './client';

export type CreateCoursePayload = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  coverImageUrl?: string;
  status?: CourseStatus;
};

export type UpdateCoursePayload = {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  coverImageUrl?: string | null;
  status?: CourseStatus;
};

export const coursesApi = {
  listPublic: (page = 1, limit = 12) =>
    apiRequest<PaginatedResponse<CourseListItem>>(
      `/courses/public?page=${page}&limit=${limit}`,
    ),

  getPublicById: (courseId: string) =>
    apiRequest<CourseDetails>(`/courses/public/${courseId}`),

  listMyTeacherCourses: (token: string) =>
    apiRequest<CourseListItem[]>('/courses/my', {
      token,
    }),

  getStudentById: (token: string, courseId: string) =>
    apiRequest<StudentCourseDetails>(`/courses/student/${courseId}`, {
      token,
    }),

  getMyTeacherCourseById: (token: string, courseId: string) =>
    apiRequest<CourseDetails>(`/courses/my/${courseId}`, {
      token,
    }),

  create: (token: string, payload: CreateCoursePayload) =>
    apiRequest<Course>('/courses', {
      method: 'POST',
      token,
      body: payload,
    }),

  update: (token: string, courseId: string, payload: UpdateCoursePayload) =>
    apiRequest<Course>(`/courses/my/${courseId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  remove: (token: string, courseId: string) =>
    apiRequest<{ success: true }>(`/courses/my/${courseId}`, {
      method: 'DELETE',
      token,
    }),
};
