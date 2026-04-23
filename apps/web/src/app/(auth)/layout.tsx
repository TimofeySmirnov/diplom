'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hydrated, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!hydrated || !isAuthenticated) {
      return;
    }

    router.replace(user?.role === 'TEACHER' ? '/teacher/courses' : '/student/dashboard');
  }, [hydrated, isAuthenticated, router, user?.role]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6">{children}</Card>
    </div>
  );
}
