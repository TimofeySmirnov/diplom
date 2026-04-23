'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { UserRole } from '@/types/domain';
import { useAuth } from './use-auth';

export function useAuthRedirect(requiredRole?: UserRole) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole && user?.role !== requiredRole) {
      router.replace(user?.role === 'TEACHER' ? '/teacher/courses' : '/student/dashboard');
    }
  }, [hydrated, isAuthenticated, pathname, requiredRole, router, user?.role]);
}
