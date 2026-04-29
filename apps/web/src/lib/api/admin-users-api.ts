import { PublicUser } from '@/types/domain';
import { apiRequest } from './client';

export type AdminCreateTeacherPayload = {
  email: string;
  password: string;
  fullName: string;
};

export type AdminUpdateTeacherPayload = {
  email?: string;
  fullName?: string;
};

export type AdminCreateStudentPayload = {
  email: string;
  password: string;
  fullName: string;
  group?: string;
};

export type AdminUpdateStudentPayload = {
  email?: string;
  fullName?: string;
  group?: string | null;
};

export const adminUsersApi = {
  listTeachers: (token: string) =>
    apiRequest<PublicUser[]>('/users/admin/teachers', {
      token,
    }),

  listStudents: (token: string) =>
    apiRequest<PublicUser[]>('/users/admin/students', {
      token,
    }),

  createTeacher: (token: string, payload: AdminCreateTeacherPayload) =>
    apiRequest<PublicUser>('/users/admin/teachers', {
      method: 'POST',
      token,
      body: payload,
    }),

  createStudent: (token: string, payload: AdminCreateStudentPayload) =>
    apiRequest<PublicUser>('/users/admin/students', {
      method: 'POST',
      token,
      body: payload,
    }),

  updateTeacher: (
    token: string,
    teacherId: string,
    payload: AdminUpdateTeacherPayload,
  ) =>
    apiRequest<PublicUser>(`/users/admin/teachers/${teacherId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  updateStudent: (
    token: string,
    studentId: string,
    payload: AdminUpdateStudentPayload,
  ) =>
    apiRequest<PublicUser>(`/users/admin/students/${studentId}`, {
      method: 'PATCH',
      token,
      body: payload,
    }),

  removeTeacher: (token: string, teacherId: string) =>
    apiRequest<{ success: true }>(`/users/admin/teachers/${teacherId}`, {
      method: 'DELETE',
      token,
    }),
};
