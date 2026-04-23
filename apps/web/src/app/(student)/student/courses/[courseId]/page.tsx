'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenCheck, GraduationCap } from 'lucide-react';
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
  summarizeStudentCourseProgress,
  summarizeStudentModuleProgress,
} from '@/features/student/utils/progress-utils';
import { useAuth } from '@/hooks/use-auth';
import { coursesApi } from '@/lib/api';
import { LessonType, StudentCourseDetails } from '@/types/domain';

type StudentCoursePageProps = {
  params: { courseId: string };
};

export default function StudentCoursePage({ params }: StudentCoursePageProps) {
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
      setError(err instanceof Error ? err.message : 'Не удалось загрузить курс');
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

  const progress = useMemo(
    () => (course ? summarizeStudentCourseProgress(course) : null),
    [course],
  );

  const continueLesson = useMemo(() => {
    if (!course) return null;

    const lessons = course.modules.flatMap((module) => module.lessons);
    const firstInProgress = lessons.find(
      (lesson) => getStudentLessonStatus(lesson) === 'IN_PROGRESS',
    );
    if (firstInProgress) return firstInProgress;

    const firstNotStarted = lessons.find(
      (lesson) => getStudentLessonStatus(lesson) === 'NOT_STARTED',
    );
    if (firstNotStarted) return firstNotStarted;

    return lessons[0] ?? null;
  }, [course]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={course?.title ?? 'Курс'}
        description={
          course
            ? `Преподаватель: ${course.teacher.fullName}`
            : 'Загрузите курс и продолжайте обучение по модулям.'
        }
        actions={
          continueLesson ? (
            <Link href={resolveStudentLessonHref(continueLesson.type, continueLesson.id) as Route}>
              <Button>
                Продолжить обучение
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
          ) : null
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось открыть курс"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadCourse()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && course && progress ? (
        <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
          <CourseLessonsSidebar course={course} />

          <div className="grid gap-4">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-emerald-500" size={20} />
                  <h2 className="text-xl font-semibold text-gray-700">Ваш прогресс по курсу</h2>
                </div>
                <Badge tone={progress.percent === 100 ? 'success' : 'warning'}>
                  {progress.percent === 100 ? 'Курс завершен' : 'Курс в процессе'}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-gray-500">{course.shortDescription}</p>

              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Прогресс</span>
                  <span>{progress.percent}%</span>
                </div>
                <ProgressBar value={progress.percent} />
                <p className="text-sm text-gray-500">
                  Завершено уроков: {progress.completedLessons} из {progress.totalLessons}
                </p>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2">
                <BookOpenCheck className="text-emerald-500" size={20} />
                <h2 className="text-xl font-semibold text-gray-700">Модули и уроки</h2>
              </div>

              <div className="mt-4 grid gap-4">
                {course.modules.map((module) => {
                  const moduleProgress = summarizeStudentModuleProgress(module);

                  return (
                    <section
                      key={module.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-gray-700">
                            {module.orderIndex}. {module.title}
                          </h3>
                          {module.description ? (
                            <p className="mt-1 text-sm text-gray-500">{module.description}</p>
                          ) : null}
                        </div>
                        <Link href={`/student/courses/${course.id}/modules/${module.id}` as Route}>
                          <Button size="sm" variant="secondary">
                            Открыть модуль
                          </Button>
                        </Link>
                      </div>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                          <span>Прогресс модуля</span>
                          <span>{moduleProgress.percent}%</span>
                        </div>
                        <ProgressBar value={moduleProgress.percent} />
                      </div>

                      <div className="mt-3 grid gap-2">
                        {module.lessons.map((lesson) => {
                          const status = getStudentLessonStatus(lesson);
                          const statusMeta = getLessonStatusMeta(status);

                          return (
                            <div
                              key={lesson.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  {lesson.orderIndex}. {lesson.title}
                                </p>
                                {lesson.description ? (
                                  <p className="text-xs text-gray-500">{lesson.description}</p>
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
                                  href={
                                    resolveStudentLessonHref(lesson.type, lesson.id) as Route
                                  }
                                >
                                  <Button size="sm">Открыть</Button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
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
  return <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
