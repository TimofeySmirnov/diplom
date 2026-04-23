'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CourseGrid } from '@/features/courses/components/course-grid';
import { useAuth } from '@/hooks/use-auth';
import { enrollmentsApi } from '@/lib/api';
import { CourseEnrollment } from '@/types/domain';
import { summarizeEnrollmentCourseProgress } from '@/features/student/utils/progress-utils';

export default function StudentCoursesPage() {
  const { accessToken, hydrated } = useAuth();
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnrollments = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await enrollmentsApi.listMy(accessToken);
      setEnrollments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список курсов');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    void loadEnrollments();
  }, [hydrated, accessToken, loadEnrollments]);

  const courseCards = useMemo(
    () =>
      enrollments
        .filter((enrollment) => enrollment.course)
        .map((enrollment) => {
          const course = enrollment.course!;
          const progress = summarizeEnrollmentCourseProgress(enrollment);

          return {
            id: course.id,
            href: `/student/courses/${course.id}`,
            title: course.title,
            description: course.shortDescription,
            progress: progress.percent,
            coverImageUrl: course.coverImageUrl,
            tag: progress.percent === 100 ? 'Завершен' : 'В обучении',
            meta: `Уроки: ${progress.completedLessons}/${progress.totalLessons}`,
          };
        }),
    [enrollments],
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Мои курсы"
        description="Все курсы, на которые вы записаны, с актуальным прогрессом."
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить курсы"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadEnrollments()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error ? (
        <>
          {courseCards.length > 0 ? (
            <CourseGrid items={courseCards} />
          ) : (
            <EmptyState
              title="Список курсов пуст"
              description="Чтобы курс появился здесь, используйте приглашение от преподавателя."
              action={
                <Link href="/courses">
                  <Button>
                    <BookOpenText className="mr-2" size={18} />
                    Перейти в каталог
                  </Button>
                </Link>
              }
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[320px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
