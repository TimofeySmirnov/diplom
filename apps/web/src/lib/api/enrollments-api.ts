import { CourseEnrollment, PublicUser } from '@/types/domain';
import { apiRequest } from './client';

export type TeacherCreateStudentPayload = {
  fullName: string;
  email: string;
  password: string;
  group?: string;
};

export type TeacherCreateStudentResult = {
  enrollment: CourseEnrollment;
  student: PublicUser;
  credentials: {
    email: string;
    password: string;
  };
};

export type TeacherStudentSearchParams = {
  fullName?: string;
  group?: string;
  limit?: number;
};

export type TeacherStudentSearchResult = Pick<
  PublicUser,
  'id' | 'fullName' | 'email' | 'group'
> & {
  isEnrolled: boolean;
};

function buildQuery(params: TeacherStudentSearchParams) {
  const query = new URLSearchParams();

  if (params.fullName?.trim()) {
    query.set('fullName', params.fullName.trim());
  }
  if (params.group?.trim()) {
    query.set('group', params.group.trim());
  }
  if (params.limit && Number.isFinite(params.limit)) {
    query.set('limit', String(params.limit));
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export const enrollmentsApi = {
  listMy: (token: string) =>
    apiRequest<CourseEnrollment[]>('/enrollments/my', {
      token,
    }),

  listByCourse: (token: string, courseId: string) =>
    apiRequest<CourseEnrollment[]>(`/enrollments/course/${courseId}`, {
      token,
    }),

  searchCourseStudents: (
    token: string,
    courseId: string,
    params: TeacherStudentSearchParams,
  ) =>
    apiRequest<TeacherStudentSearchResult[]>(
      `/enrollments/course/${courseId}/students/search${buildQuery(params)}`,
      {
        token,
      },
    ),

  createStudentForCourse: (
    token: string,
    courseId: string,
    payload: TeacherCreateStudentPayload,
  ) =>
    apiRequest<TeacherCreateStudentResult>(`/enrollments/course/${courseId}/students`, {
      method: 'POST',
      token,
      body: payload,
    }),

  enrollExistingStudentForCourse: (
    token: string,
    courseId: string,
    studentId: string,
  ) =>
    apiRequest<CourseEnrollment>(`/enrollments/course/${courseId}/students/${studentId}`, {
      method: 'POST',
      token,
    }),

  remove: (token: string, enrollmentId: string) =>
    apiRequest<CourseEnrollment>(`/enrollments/${enrollmentId}`, {
      method: 'DELETE',
      token,
    }),
};
