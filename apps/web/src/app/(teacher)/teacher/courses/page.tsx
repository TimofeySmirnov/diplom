'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CourseGrid } from '@/features/courses/components/course-grid';
import { useAuth } from '@/hooks/use-auth';
import { coursesApi } from '@/lib/api';
import { CourseListItem } from '@/types/domain';

export default function TeacherCoursesPage() {
  const { accessToken, hydrated } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await coursesApi.listMyTeacherCourses(accessToken);
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить курсы');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!hydrated || !accessToken) {
      return;
    }

    void loadCourses();
  }, [accessToken, hydrated, loadCourses]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Мои учебные курсы"
        description="Управляйте своими курсами, статусом публикации и структурой контента."
        actions={
          <Link href="/teacher/courses/new">
            <Button>Создать курс</Button>
          </Link>
        }
      />

      {loading ? <LoadingGrid /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить курсы"
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
          title="Курсов пока нет"
          description="Создайте первый курс, чтобы начать собирать модули и уроки."
          action={
            <Link href="/teacher/courses/new">
              <Button>Создать курс</Button>
            </Link>
          }
        />
      ) : null}

      {!loading && !error && courses.length > 0 ? (
        <CourseGrid
          items={courses.map((course) => ({
            id: course.id,
            href: `/teacher/courses/${course.id}/edit`,
            title: course.title,
            description: course.shortDescription,
            coverImageUrl: course.coverImageUrl,
            tag: course.status === 'PUBLISHED' ? 'Опубликован' : 'Черновик',
            meta: `${course._count?.modules ?? 0} модулей | ${course._count?.enrollments ?? 0} студентов`,
          }))}
        />
      ) : null}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50"
        />
      ))}
    </div>
  );
}
