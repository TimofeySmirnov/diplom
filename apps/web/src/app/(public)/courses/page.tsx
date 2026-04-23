'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CourseGrid } from '@/features/courses/components/course-grid';
import { coursesApi } from '@/lib/api';
import { CourseListItem } from '@/types/domain';

export default function PublicCoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await coursesApi.listPublic(1, 24);
      setCourses(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить каталог курсов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  return (
    <div>
      <PageHeader
        title="Каталог курсов"
        description="Просматривайте опубликованные курсы и открывайте подробную программу."
      />

      {loading ? <LoadingGrid /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить каталог"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadCourses()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && courses.length === 0 ? (
        <EmptyState
          title="Пока нет опубликованных курсов"
          description="Преподаватели еще не опубликовали курсы. Проверьте позже."
        />
      ) : null}

      {!loading && !error && courses.length > 0 ? (
        <CourseGrid
          items={courses.map((course) => ({
            id: course.id,
            href: `/courses/${course.id}`,
            title: course.title,
            description: course.shortDescription,
            coverImageUrl: course.coverImageUrl,
            tag: 'Опубликован',
            meta: `${course._count?.modules ?? 0} модулей`,
          }))}
        />
      ) : null}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50"
        />
      ))}
    </div>
  );
}
