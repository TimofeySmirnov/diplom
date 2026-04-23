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
import { LectureRichTextEditor } from '@/features/lessons/components/lecture-rich-text-editor';
import { useAuth } from '@/hooks/use-auth';
import { lessonsApi } from '@/lib/api';
import { Lesson } from '@/types/domain';

type TeacherLectureEditorPageProps = {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
};

const EMPTY_CONTENT: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export default function TeacherLectureEditorPage({ params }: TeacherLectureEditorPageProps) {
  const { accessToken, hydrated } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [content, setContent] = useState<Record<string, unknown>>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadLecture = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await lessonsApi.getTeacherLectureById(params.lessonId, accessToken);
      setLesson(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setIsPublished(data.isPublished);
      setContent(
        data.lecture?.content && typeof data.lecture.content === 'object'
          ? data.lecture.content
          : EMPTY_CONTENT,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить лекцию');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.lessonId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadLecture();
  }, [hydrated, accessToken, loadLecture]);

  const saveLecture = async () => {
    if (!accessToken || !lesson) return;
    if (title.trim().length < 2) {
      setError('Название должно быть не короче 2 символов');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await lessonsApi.updateLecture(accessToken, lesson.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        isPublished,
        content,
      });

      setLesson(updated);
      setSuccessMessage('Лекция успешно сохранена.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить лекцию');
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
        title={lesson ? `Редактор лекции: ${lesson.title}` : 'Редактор лекции'}
        description="Редактируйте содержание урока и управляйте его доступностью для студентов."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={backHref as Route}>
              <Button variant="secondary">Назад к модулю</Button>
            </Link>
            <Button onClick={() => void saveLecture()} disabled={saving || loading}>
              {saving ? 'Сохранение...' : 'Сохранить лекцию'}
            </Button>
          </div>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить лекцию"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadLecture()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && lesson ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">Лекция</Badge>
              <Badge tone={isPublished ? 'success' : 'warning'}>
                {isPublished ? 'Опубликован' : 'Черновик'}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Название лекции"
              />
              <Textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Описание лекции (необязательно)"
              />
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-200 text-emerald-500 focus:ring-emerald-500"
                />
                Публиковать лекцию для студентов
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Текст лекции</h2>
            <p className="mt-1 text-sm text-gray-500">
              Пишите структурированные учебные материалы: заголовки, списки, форматирование.
            </p>

            <div className="mt-4">
              <LectureRichTextEditor
                content={content}
                editable
                onChange={(nextContent) => setContent(nextContent)}
              />
            </div>
          </Card>

          {successMessage ? <p className="text-sm text-emerald-500">{successMessage}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
