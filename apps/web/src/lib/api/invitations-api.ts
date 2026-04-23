import { CourseEnrollment, CourseInvitation } from '@/types/domain';
import { apiRequest } from './client';

export type CreateInvitationPayload = {
  expiresAt?: string;
  maxUses?: number;
};

export const invitationsApi = {
  create: (token: string, courseId: string, payload: CreateInvitationPayload = {}) =>
    apiRequest<CourseInvitation>(`/invitations/course/${courseId}`, {
      method: 'POST',
      token,
      body: payload,
    }),

  listByCourse: (token: string, courseId: string) =>
    apiRequest<CourseInvitation[]>(`/invitations/course/${courseId}`, {
      token,
    }),

  deactivate: (token: string, invitationId: string) =>
    apiRequest<CourseInvitation>(`/invitations/${invitationId}/deactivate`, {
      method: 'PATCH',
      token,
    }),

  accept: (token: string, invitationToken: string) =>
    apiRequest<CourseEnrollment>('/invitations/accept', {
      method: 'POST',
      token,
      body: { token: invitationToken },
    }),
};
