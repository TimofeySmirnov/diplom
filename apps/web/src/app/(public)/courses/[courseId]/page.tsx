'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { coursesApi } from '@/lib/api';
import { CourseDetails } from '@/types/domain';

type CourseDetailPageProps = {
  params: { courseId: string };
};

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await coursesApi.getPublicById(params.courseId);
      setCourse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные курса');
    } finally {
      setLoading(false);
    }
  }, [params.courseId]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  if (loading) {
    return <div className="h-[400px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
  }

  if (error || !course) {
    return (
      <EmptyState
        title="Курс недоступен"
        description={error ?? 'Этот курс недоступен для публичного просмотра.'}
        action={
          <Link href="/courses">
            <Button variant="secondary">Назад в каталог</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <Card>
        {course.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImageUrl}
            alt={course.title}
            className="mb-5 h-56 w-full rounded-2xl object-cover"
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-gray-700">{course.title}</h1>
          <Badge tone="success">Опубликован</Badge>
        </div>

        <p className="mt-3 text-base text-gray-500">{course.shortDescription}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-500">
          {course.fullDescription}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>Преподаватель: {course.teacher?.fullName ?? 'Не указан'}</span>
          <span>|</span>
          <span>{course._count?.modules ?? course.modules.length} модулей</span>
        </div>

        <div className="mt-6 flex gap-2">
          <Link href="/register">
            <Button>Присоединиться как студент</Button>
          </Link>
          <Link href="/courses">
            <Button variant="secondary">Назад в каталог</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-700">Модули курса</h2>
        <div className="mt-4 grid gap-3">
          {course.modules.length === 0 ? (
            <p className="text-sm text-gray-500">Модули пока не добавлены.</p>
          ) : (
            course.modules.map((module) => (
              <div key={module.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-700">
                  {module.orderIndex}. {module.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {module.lessons?.length ?? 0} опубликованных уроков
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
