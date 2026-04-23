'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { lessonsApi } from '@/lib/api';
import { Lesson } from '@/types/domain';

type TeacherWebinarEditorPageProps = {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
};

export default function TeacherWebinarEditorPage({ params }: TeacherWebinarEditorPageProps) {
  const { accessToken, hydrated } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
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
      const data = await lessonsApi.getTeacherWebinarById(params.lessonId, accessToken);
      if (data.type !== 'WEBINAR' || !data.webinar) {
        throw new Error('Выбранный урок не является вебинаром');
      }

      setLesson(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setIsPublished(data.isPublished);
      setMeetingLink(data.webinar.meetingLink);
      setScheduledAt(toDateTimeLocalValue(data.webinar.scheduledAt));
      setDurationMinutes(
        data.webinar.durationMinutes === null || data.webinar.durationMinutes === undefined
          ? ''
          : String(data.webinar.durationMinutes),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить вебинар');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.lessonId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadWebinar();
  }, [hydrated, accessToken, loadWebinar]);

  const saveWebinar = async () => {
    if (!accessToken || !lesson) return;
    if (title.trim().length < 2) {
      setError('Название должно быть не короче 2 символов');
      return;
    }
    if (!meetingLink.trim()) {
      setError('Требуется ссылка на встречу');
      return;
    }

    const isoScheduledAt = toIsoDateTime(scheduledAt);
    if (!isoScheduledAt) {
      setError('Требуется дата и время');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await lessonsApi.updateWebinar(accessToken, lesson.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        isPublished,
        meetingLink: meetingLink.trim(),
        scheduledAt: isoScheduledAt,
        durationMinutes: toOptionalInt(durationMinutes),
      });
      setLesson(updated);
      setNotice('Вебинар успешно обновлен.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить вебинар');
    } finally {
      setSaving(false);
    }
  };

  const backHref = useMemo(
    () => `/teacher/courses/${params.courseId}/modules/${params.moduleId}/edit`,
    [params.courseId, params.moduleId],
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title={lesson ? `Редактор вебинара: ${lesson.title}` : 'Редактор вебинара'}
        description="Настраивайте расписание вебинара и данные подключения для студентов."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={backHref as Route}>
              <Button variant="secondary">Назад к модулю</Button>
            </Link>
            <Button onClick={() => void saveWebinar()} disabled={loading || saving}>
              {saving ? 'Сохранение...' : 'Сохранить вебинар'}
            </Button>
          </div>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить вебинар"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadWebinar()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && lesson ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Вебинар</Badge>
              <Badge tone={isPublished ? 'success' : 'warning'}>
                {isPublished ? 'Опубликован' : 'Черновик'}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Название вебинара"
              />
              <Textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Что студент получит на этой сессии"
              />
              <Input
                value={meetingLink}
                onChange={(event) => setMeetingLink(event.target.value)}
                placeholder="Ссылка на встречу (например, https://meet.google.com/...)"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Дата и время</p>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    Длительность, минуты (необязательно)
                  </p>
                  <Input
                    type="number"
                    min={1}
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    placeholder="например, 90"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-200 text-emerald-500 focus:ring-emerald-500"
                />
                Публиковать вебинар для студентов
              </label>
            </div>
          </Card>

          <Card className="bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-700">Предпросмотр для студента</h2>
            <p className="mt-1 text-sm text-gray-500">
              Так информация о расписании и подключении будет выглядеть для студента.
            </p>
            <div className="mt-4 grid gap-2 rounded-xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-700">
              <p>
                <span className="font-medium">Начало:</span>{' '}
                {formatDateTime(toIsoDateTime(scheduledAt) ?? '')}
              </p>
              <p>
                <span className="font-medium">Длительность:</span>{' '}
                {toOptionalInt(durationMinutes) ?? 'Не задано'} мин
              </p>
              <p className="truncate">
                <span className="font-medium">Встреча:</span> {meetingLink.trim() || 'Не указана'}
              </p>
            </div>
          </Card>

          {notice ? <p className="text-sm text-emerald-500">{notice}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function toIsoDateTime(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toOptionalInt(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Не запланирован';
  return parsed.toLocaleString();
}

function LoadingBlock() {
  return <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
