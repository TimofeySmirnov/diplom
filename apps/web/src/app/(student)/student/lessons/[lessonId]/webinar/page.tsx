'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/hooks/use-auth';
import { lessonsApi, progressApi, StudentWebinarPayload } from '@/lib/api';

type StudentWebinarPageProps = {
  params: { lessonId: string };
};

export default function StudentWebinarPage({ params }: StudentWebinarPageProps) {
  const { accessToken, hydrated } = useAuth();

  const [webinarData, setWebinarData] = useState<StudentWebinarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadWebinar = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const data = await lessonsApi.getStudentWebinarById(params.lessonId, accessToken);
      setWebinarData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить вебинар');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.lessonId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    const run = async () => {
      await loadWebinar();
      try {
        const progress = await progressApi.markStarted(accessToken, params.lessonId);
        setWebinarData((prev) => (prev ? { ...prev, progress } : prev));
      } catch {
        // Не блокируем отображение вебинара.
      }
    };

    void run();
  }, [hydrated, accessToken, params.lessonId, loadWebinar]);

  const markCompleted = async () => {
    if (!accessToken || !webinarData) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const progress = await progressApi.markCompleted(accessToken, webinarData.lesson.id);
      setWebinarData((prev) => (prev ? { ...prev, progress } : prev));
      setNotice('Вебинар отмечен как завершенный.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить вебинар как завершенный');
    } finally {
      setSaving(false);
    }
  };

  const completionStatus = useMemo(
    () => webinarData?.progress?.status ?? 'NOT_STARTED',
    [webinarData],
  );

  const webinarStatus = useMemo(() => {
    const scheduledAt = webinarData?.lesson.webinar?.scheduledAt;
    if (!scheduledAt) {
      return { label: 'Не запланирован', tone: 'warning' as const };
    }

    const startsAt = new Date(scheduledAt);
    if (Number.isNaN(startsAt.getTime())) {
      return { label: 'Не запланирован', tone: 'warning' as const };
    }

    const now = new Date();
    const durationMinutes = webinarData?.lesson.webinar?.durationMinutes ?? null;
    const endsAt =
      durationMinutes && durationMinutes > 0
        ? new Date(startsAt.getTime() + durationMinutes * 60_000)
        : null;

    if (now < startsAt) {
      return { label: 'Скоро', tone: 'accent' as const };
    }

    if (endsAt && now <= endsAt) {
      return { label: 'Идет сейчас', tone: 'success' as const };
    }

    return { label: 'Сессия завершена', tone: 'neutral' as const };
  }, [webinarData]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={webinarData?.lesson.title ?? 'Вебинар'}
        description={
          webinarData
            ? `${webinarData.lesson.module.course.title} | ${webinarData.lesson.module.title}`
            : 'Откройте информацию о вебинаре и отметьте завершение после посещения'
        }
        actions={
          webinarData ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={completionStatus === 'COMPLETED' ? 'success' : 'warning'}>
                {completionStatus === 'COMPLETED' ? 'Завершено' : 'В процессе'}
              </Badge>
              <Button
                variant={completionStatus === 'COMPLETED' ? 'secondary' : 'primary'}
                onClick={() => void markCompleted()}
                disabled={saving || completionStatus === 'COMPLETED'}
              >
                {saving
                  ? 'Сохранение...'
                  : completionStatus === 'COMPLETED'
                    ? 'Завершено'
                    : 'Отметить как завершено'}
              </Button>
            </div>
          ) : null
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось открыть вебинар"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadWebinar()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && webinarData ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Вебинар</Badge>
                <Badge tone={webinarStatus.tone}>{webinarStatus.label}</Badge>
              </div>
              <Link href={`/student/courses/${webinarData.lesson.module.courseId}`}>
                <Button variant="ghost" size="sm">
                  Назад к курсу
                </Button>
              </Link>
            </div>

            {webinarData.lesson.description ? (
              <p className="mt-3 text-sm text-gray-500">{webinarData.lesson.description}</p>
            ) : null}

            <div className="mt-4 grid gap-2 text-sm text-gray-700">
              <p>
                <span className="font-medium">Запланировано:</span>{' '}
                {formatDateTime(webinarData.lesson.webinar?.scheduledAt ?? '')}
              </p>
              <p>
                <span className="font-medium">Длительность:</span>{' '}
                {webinarData.lesson.webinar?.durationMinutes
                  ? `${webinarData.lesson.webinar.durationMinutes} мин`
                  : 'Не указана'}
              </p>
            </div>
          </Card>

          <Card className="bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-700">Данные для подключения</h2>
            <p className="mt-1 text-sm text-gray-500">Подключитесь к вебинару по ссылке ниже.</p>

            <div className="mt-4 rounded-xl border border-gray-200 bg-white/80 p-4">
              <p className="truncate text-sm text-gray-700">
                {webinarData.lesson.webinar?.meetingLink ?? 'Ссылка на встречу недоступна'}
              </p>
              {webinarData.lesson.webinar?.meetingLink ? (
                <a
                  href={webinarData.lesson.webinar.meetingLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-block"
                >
                  <Button>Подключиться к вебинару</Button>
                </a>
              ) : null}
            </div>
          </Card>

          {notice ? <p className="text-sm text-emerald-500">{notice}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Не запланирован';
  return parsed.toLocaleString();
}

function LoadingBlock() {
  return <div className="h-[360px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
