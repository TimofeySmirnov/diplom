'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress-bar';
import { CourseLessonsSidebar } from '@/features/student/components/course-lessons-sidebar';
import {
  getLessonStatusMeta,
  getStudentLessonStatus,
  summarizeStudentModuleProgress,
} from '@/features/student/utils/progress-utils';
import { useAuth } from '@/hooks/use-auth';
import { coursesApi } from '@/lib/api';
import { LessonType, StudentCourseDetails } from '@/types/domain';

type StudentModulePageProps = {
  params: { courseId: string; moduleId: string };
};

export default function StudentModulePage({ params }: StudentModulePageProps) {
  const { accessToken, hydrated } = useAuth();
  const [course, setCourse] = useState<StudentCourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await coursesApi.getStudentById(accessToken, params.courseId);
      setCourse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить модуль');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.courseId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    void loadCourse();
  }, [hydrated, accessToken, loadCourse]);

  const module = useMemo(
    () => course?.modules.find((item) => item.id === params.moduleId) ?? null,
    [course, params.moduleId],
  );

  const moduleProgress = useMemo(
    () => (module ? summarizeStudentModuleProgress(module) : null),
    [module],
  );

  const description = useMemo(() => {
    if (!course || !module) {
      return 'Материалы модуля и доступные уроки.';
    }

    return `${course.title} | ${module.lessons.length} уроков`;
  }, [course, module]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={module?.title ?? 'Модуль'}
        description={description}
        actions={
          <Link href={`/student/courses/${params.courseId}` as Route}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="mr-2" size={18} />
              Назад к курсу
            </Button>
          </Link>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить модуль"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadCourse()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && course && module && moduleProgress ? (
        <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
          <CourseLessonsSidebar course={course} activeModuleId={module.id} />

          <div className="grid gap-4">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="text-emerald-500" size={20} />
                  <h2 className="text-xl font-semibold text-gray-700">
                    Прогресс по модулю
                  </h2>
                </div>
                <Badge tone={moduleProgress.percent === 100 ? 'success' : 'warning'}>
                  {moduleProgress.percent}% выполнено
                </Badge>
              </div>

              {module.description ? (
                <p className="mt-2 text-sm text-gray-500">{module.description}</p>
              ) : null}

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
                  <span>Завершено уроков</span>
                  <span>
                    {moduleProgress.completedLessons}/{moduleProgress.totalLessons}
                  </span>
                </div>
                <ProgressBar value={moduleProgress.percent} />
              </div>
            </Card>

            <Card>
              <h2 className="text-lg font-semibold text-gray-700">Уроки модуля</h2>
              <p className="mt-1 text-sm text-gray-500">
                Открывайте уроки по порядку и отмечайте завершение, чтобы видеть точный прогресс.
              </p>

              <div className="mt-4 grid gap-3">
                {module.lessons.length === 0 ? (
                  <p className="text-sm text-gray-500">В модуле пока нет опубликованных уроков.</p>
                ) : (
                  module.lessons.map((lesson) => {
                    const status = getStudentLessonStatus(lesson);
                    const statusMeta = getLessonStatusMeta(status);

                    return (
                      <div
                        key={lesson.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-700">
                            {lesson.orderIndex}. {lesson.title}
                          </p>
                          {lesson.description ? (
                            <p className="mt-1 text-xs text-gray-500">{lesson.description}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={lessonTypeToTone(lesson.type)}>
                            {lessonTypeLabel(lesson.type)}
                          </Badge>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                          >
                            {statusMeta.label}
                          </span>
                          <Link
                            href={resolveStudentLessonHref(lesson.type, lesson.id) as Route}
                          >
                            <Button size="sm">Открыть</Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {!loading && !error && course && !module ? (
        <EmptyState
          title="Модуль не найден"
          description="Проверьте ссылку или вернитесь к списку модулей курса."
          action={
            <Link href={`/student/courses/${params.courseId}` as Route}>
              <Button variant="secondary">К курсу</Button>
            </Link>
          }
        />
      ) : null}
    </div>
  );
}

function lessonTypeLabel(type: LessonType): string {
  if (type === 'TEST') return 'Тест';
  if (type === 'WEBINAR') return 'Вебинар';
  return 'Лекция';
}

function lessonTypeToTone(type: LessonType): 'accent' | 'warning' | 'neutral' {
  if (type === 'TEST') return 'warning';
  if (type === 'WEBINAR') return 'accent';
  return 'neutral';
}

function resolveStudentLessonHref(type: LessonType, lessonId: string): string {
  if (type === 'TEST') return `/student/lessons/${lessonId}/test`;
  if (type === 'WEBINAR') return `/student/lessons/${lessonId}/webinar`;
  return `/student/lessons/${lessonId}`;
}

function LoadingBlock() {
  return <div className="h-[360px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
