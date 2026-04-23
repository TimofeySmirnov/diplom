import { PublicUser } from './domain';

export type ApiErrorShape = {
  message: string | string[];
  error?: string;
  statusCode?: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};