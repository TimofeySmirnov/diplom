import { CourseModule, ReorderModuleItem } from '@/types/domain';
import { apiRequest } from './client';

export type CreateModulePayload = {
  courseId: string;
  title: string;
  description?: string;
  orderIndex?: number;
};

export type UpdateModulePayload = {
  title?: string;
  description?: string;
  orderIndex?: number;
};

export type ReorderModulesPayload = {
  courseId: string;
  items: ReorderModuleItem[];
};

export const modulesApi = {
  listByCourse: (token: string, courseId: string) =>
    apiRequest<CourseModule[]>(`/modules/course/${courseId}`, {
      token,
    }),

  create: (token: string, payload: CreateModulePayload) =>
    apiRequest<CourseModule>('/modules', {
      method: 'POST',
      token,
      body: payload,
    }),

  update: (token: string, moduleId: string, payload: UpdateModulePayload) =>
    apiRequest<CourseModule>(`/modules/${moduleId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  remove: (token: string, moduleId: string) =>
    apiRequest<{ success: true }>(`/modules/${moduleId}`, {
      method: 'DELETE',
      token,
    }),

  reorder: (token: string, payload: ReorderModulesPayload) =>
    apiRequest<CourseModule[]>('/modules/reorder', {
      method: 'PATCH',
      token,
      body: payload,
    }),
};