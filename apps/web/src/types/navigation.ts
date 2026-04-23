import { UserRole } from './domain';

export type NavItem = {
  href: string;
  label: string;
  role?: UserRole;
  badge?: string;
};