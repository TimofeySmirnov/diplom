import { CourseEnrollment } from '@/types/domain';
import { apiRequest } from './client';

export const enrollmentsApi = {
  listMy: (token: string) =>
    apiRequest<CourseEnrollment[]>('/enrollments/my', {
      token,
    }),

  listByCourse: (token: string, courseId: string) =>
    apiRequest<CourseEnrollment[]>(`/enrollments/course/${courseId}`, {
      token,
    }),

  remove: (token: string, enrollmentId: string) =>
    apiRequest<CourseEnrollment>(`/enrollments/${enrollmentId}`, {
      method: 'DELETE',
      token,
    }),
};
