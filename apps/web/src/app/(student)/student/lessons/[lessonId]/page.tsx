'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { LectureRichTextEditor } from '@/features/lessons/components/lecture-rich-text-editor';
import { useAuth } from '@/hooks/use-auth';
import { lessonsApi, progressApi, StudentLecturePayload } from '@/lib/api';

type StudentLessonPageProps = {
  params: { lessonId: string };
};

export default function StudentLessonPage({ params }: StudentLessonPageProps) {
  const { accessToken, hydrated } = useAuth();

  const [lectureData, setLectureData] = useState<StudentLecturePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLecture = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const data = await lessonsApi.getStudentLectureById(params.lessonId, accessToken);
      setLectureData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить лекцию');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.lessonId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    const run = async () => {
      await loadLecture();
      try {
        const progress = await progressApi.markStarted(accessToken, params.lessonId);
        setLectureData((prev) => (prev ? { ...prev, progress } : prev));
      } catch {
        // Не блокируем отображение лекции.
      }
    };

    void run();
  }, [hydrated, accessToken, params.lessonId, loadLecture]);

  const markCompleted = async () => {
    if (!accessToken || !lectureData) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const progress = await progressApi.markCompleted(accessToken, lectureData.lesson.id);
      setLectureData((prev) => (prev ? { ...prev, progress } : prev));
      setNotice('Лекция отмечена как завершенная.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить лекцию как завершенную');
    } finally {
      setSaving(false);
    }
  };

  const completionStatus = useMemo(
    () => lectureData?.progress?.status ?? 'NOT_STARTED',
    [lectureData],
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title={lectureData?.lesson.title ?? 'Лекция'}
        description={
          lectureData
            ? `${lectureData.lesson.module.course.title} | ${lectureData.lesson.module.title}`
            : 'Откройте лекцию и отметьте завершение'
        }
        actions={
          lectureData ? (
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
          title="Не удалось открыть лекцию"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadLecture()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && lectureData ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">Лекция</Badge>
                <Badge tone="accent">{lectureData.lesson.module.title}</Badge>
              </div>
              <Link href={`/student/courses/${lectureData.lesson.module.courseId}`}>
                <Button variant="ghost" size="sm">
                  Назад к курсу
                </Button>
              </Link>
            </div>

            {lectureData.lesson.description ? (
              <p className="mt-3 text-sm text-gray-500">{lectureData.lesson.description}</p>
            ) : null}
          </Card>

          <Card>
            <LectureRichTextEditor content={lectureData.lesson.lecture?.content ?? null} editable={false} />
          </Card>

          {notice ? <p className="text-sm text-emerald-500">{notice}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
