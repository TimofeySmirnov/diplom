import { UserRole } from '../enums/user-role.enum';

export type AuthUser = {
  userId: string;
  email: string;
  role: UserRole;
};