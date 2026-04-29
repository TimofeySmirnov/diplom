'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { invitationsApi } from '@/lib/api';

type JoinByInvitePageProps = {
  params: { token: string };
};

type JoinStatus = 'idle' | 'joining' | 'success' | 'error';

export default function JoinByInvitePage({ params }: JoinByInvitePageProps) {
  const router = useRouter();
  const { accessToken, hydrated, isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<JoinStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  const nextPath = useMemo(() => `/join/${params.token}`, [params.token]);

  const getCabinetRoute = useCallback((): Route => {
    if (user?.role === 'ADMIN') return '/admin/teachers';
    if (user?.role === 'TEACHER') return '/teacher/courses';
    return '/student/dashboard';
  }, [user?.role]);

  const getRoleLabel = useCallback(() => {
    if (user?.role === 'ADMIN') return 'Роль: администратор';
    if (user?.role === 'TEACHER') return 'Роль: преподаватель';
    return 'Роль: студент';
  }, [user?.role]);

  const acceptInvitation = useCallback(async () => {
    if (!accessToken) return;

    setStatus('joining');
    setMessage(null);

    try {
      const enrollment = await invitationsApi.accept(accessToken, params.token);
      setCourseId(enrollment.courseId);
      setStatus('success');
      setMessage('Вы успешно записаны на курс.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Не удалось принять приглашение');
    }
  }, [accessToken, params.token]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;

    if (user?.role !== 'STUDENT') {
      setStatus('error');
      setMessage('Приглашение может принять только студент.');
      return;
    }

    if (status === 'idle') {
      void acceptInvitation();
    }
  }, [hydrated, isAuthenticated, user?.role, status, acceptInvitation]);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <h1 className="text-2xl font-semibold text-gray-700">Приглашение на курс</h1>
        <p className="mt-2 break-all text-sm text-gray-500">Токен: {params.token}</p>

        {!hydrated ? <p className="mt-4 text-sm text-gray-500">Проверяем сессию...</p> : null}

        {hydrated && !isAuthenticated ? (
          <div className="mt-4 grid gap-3">
            <p className="text-sm text-gray-500">
              Чтобы присоединиться к курсу, войдите как студент. Если аккаунта нет, обратитесь к
              преподавателю или администратору.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/login?next=${encodeURIComponent(nextPath)}` as Route}>
                <Button>Войти и присоединиться</Button>
              </Link>
            </div>
          </div>
        ) : null}

        {hydrated && isAuthenticated ? (
          <div className="mt-4 grid gap-3">
            <div className="flex items-center gap-2">
              <Badge tone={status === 'success' ? 'success' : status === 'error' ? 'warning' : 'accent'}>
                {status === 'joining'
                  ? 'Подключение'
                  : status === 'success'
                    ? 'Готово'
                    : status === 'error'
                      ? 'Ошибка'
                      : 'Ожидание'}
              </Badge>
              <span className="text-sm text-gray-500">{getRoleLabel()}</span>
            </div>

            {status === 'joining' ? <p className="text-sm text-gray-500">Записываем вас на курс...</p> : null}
            {message ? (
              <p className={status === 'error' ? 'text-sm text-red-500' : 'text-sm text-emerald-500'}>
                {message}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {status === 'error' && user?.role === 'STUDENT' ? (
                <Button onClick={() => void acceptInvitation()}>Попробовать снова</Button>
              ) : null}

              {status === 'success' && courseId ? (
                <Button onClick={() => router.replace(`/student/courses/${courseId}` as Route)}>
                  Перейти к курсу
                </Button>
              ) : null}

              <Link href={getCabinetRoute()}>
                <Button variant="secondary">В кабинет</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
