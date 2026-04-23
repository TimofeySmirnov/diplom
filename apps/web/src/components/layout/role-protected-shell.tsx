'use client';

import { ReactNode } from 'react';
import { useAuthRedirect } from '@/hooks/use-auth-redirect';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types/domain';
import { NavItem } from '@/types/navigation';
import { SideNav } from './side-nav';
import { Topbar } from './topbar';

type RoleProtectedShellProps = {
  role: UserRole;
  title: string;
  subtitle: string;
  navItems: NavItem[];
  children: ReactNode;
};

export function RoleProtectedShell({
  role,
  title,
  subtitle,
  navItems,
  children,
}: RoleProtectedShellProps) {
  const { hydrated, isAuthenticated, user } = useAuth();

  useAuthRedirect(role);

  if (!hydrated || !isAuthenticated || user?.role !== role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Загрузка рабочего пространства...</p>
      </div>
    );
  }

  return (
    <div className="shell-grid min-h-screen">
      <SideNav title={title} subtitle={subtitle} items={navItems} />
      <div className="min-w-0">
        <Topbar title={title} />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
