'use client';

import { Copy, Link as LinkIcon, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { enrollmentsApi, invitationsApi } from '@/lib/api';
import { CourseEnrollment, CourseInvitation } from '@/types/domain';

type CourseAccessManagerProps = {
  courseId: string;
  accessToken: string | null;
};

export function CourseAccessManager({ courseId, accessToken }: CourseAccessManagerProps) {
  const [invitations, setInvitations] = useState<CourseInvitation[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const [nextInvitations, nextEnrollments] = await Promise.all([
        invitationsApi.listByCourse(accessToken, courseId),
        enrollmentsApi.listByCourse(accessToken, courseId),
      ]);

      setInvitations(nextInvitations);
      setEnrollments(nextEnrollments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные по доступу');
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseId]);

  useEffect(() => {
    if (!accessToken) return;
    void loadData();
  }, [accessToken, loadData]);

  const invitationBase = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const buildInviteLink = (token: string) =>
    invitationBase ? `${invitationBase}/join/${token}` : `/join/${token}`;

  const copyInviteLink = async (token: string) => {
    const inviteLink = buildInviteLink(token);

    try {
      await navigator.clipboard.writeText(inviteLink);
      setNotice('Ссылка приглашения скопирована.');
      setError(null);
    } catch {
      setError('Не удалось скопировать ссылку.');
    }
  };

  const createInvitation = async () => {
    if (!accessToken) return;

    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const created = await invitationsApi.create(accessToken, courseId);
      setInvitations((prev) => [created, ...prev]);
      setNotice('Ссылка приглашения создана.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать приглашение');
    } finally {
      setGenerating(false);
    }
  };

  const deactivateInvitation = async (invitationId: string) => {
    if (!accessToken) return;

    setBusyId(invitationId);
    setError(null);
    setNotice(null);

    try {
      const updated = await invitationsApi.deactivate(accessToken, invitationId);
      setInvitations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Приглашение деактивировано.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось деактивировать приглашение');
    } finally {
      setBusyId(null);
    }
  };

  const removeStudent = async (enrollment: CourseEnrollment) => {
    if (!accessToken) return;

    const studentName = enrollment.student?.fullName ?? 'студента';
    const confirmed = window.confirm(`Удалить ${studentName} из курса?`);
    if (!confirmed) return;

    setBusyId(enrollment.id);
    setError(null);
    setNotice(null);

    try {
      await enrollmentsApi.remove(accessToken, enrollment.id);
      setEnrollments((prev) => prev.filter((item) => item.id !== enrollment.id));
      setNotice('Студент удален из курса.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить студента');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LinkIcon size={18} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-700">Ссылки приглашения</h3>
          </div>
          <Button onClick={() => void createInvitation()} disabled={generating || loading}>
            {generating ? 'Создание...' : 'Создать ссылку'}
          </Button>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Создавайте ссылки и отправляйте студентам для быстрого вступления в курс.
        </p>

        <div className="mt-4 grid gap-3">
          {loading ? (
            <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ) : invitations.length === 0 ? (
            <p className="text-sm text-gray-500">Пока нет приглашений для этого курса.</p>
          ) : (
            invitations.map((invitation) => (
              <div key={invitation.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={invitation.isActive ? 'success' : 'warning'}>
                      {invitation.isActive ? 'Активно' : 'Неактивно'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Создано: {formatDateTime(invitation.createdAt)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Использовано: {invitation.usesCount}
                    {invitation.maxUses ? ` / ${invitation.maxUses}` : ''}
                  </span>
                </div>

                <p className="mt-2 truncate text-sm text-gray-700">{buildInviteLink(invitation.token)}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyInviteLink(invitation.token)}
                  >
                    <Copy size={18} className="mr-1 text-gray-500" />
                    Копировать
                  </Button>
                  {invitation.isActive ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void deactivateInvitation(invitation.id)}
                      disabled={busyId === invitation.id}
                    >
                      Деактивировать
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-gray-700">Записанные студенты</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Список текущих участников курса с возможностью удаления.
        </p>

        <div className="mt-4 grid gap-3">
          {loading ? (
            <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-gray-500">Пока нет записанных студентов.</p>
          ) : (
            enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {enrollment.student?.fullName ?? 'Студент'}
                    </p>
                    <p className="text-xs text-gray-500">{enrollment.student?.email ?? 'Email не указан'}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Записан: {formatDateTime(enrollment.enrolledAt)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void removeStudent(enrollment)}
                    disabled={busyId === enrollment.id}
                  >
                    <Trash2 size={18} className="mr-1 text-gray-500" />
                    Удалить
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {error ? <p className="text-sm text-red-500 lg:col-span-2">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-500 lg:col-span-2">{notice}</p> : null}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}
