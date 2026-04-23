import { AuthResponse } from '@/types/api';
import { PublicUser, UserRole } from '@/types/domain';
import { apiRequest } from './client';

export type RegisterPayload = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: payload,
    }),

  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: payload,
    }),

  me: (token: string) =>
    apiRequest<PublicUser>('/auth/me', {
      token,
    }),
};