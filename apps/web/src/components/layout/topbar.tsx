'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

type TopbarProps = {
  title: string;
};

export function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const { user, clearSession } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-gray-700">{user?.fullName ?? 'Пользователь'}</p>
            <p className="text-xs text-gray-500">
              {user?.role === 'TEACHER'
                ? 'Преподаватель'
                : user?.role === 'STUDENT'
                  ? 'Студент'
                  : 'Гость'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              clearSession();
              router.replace('/login');
            }}
          >
            <LogOut size={18} className="mr-1" />
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
}
