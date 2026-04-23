'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenText, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { CourseGrid } from '@/features/courses/components/course-grid';
import { KpiGrid } from '@/features/statistics/components/kpi-grid';
import { useAuth } from '@/hooks/use-auth';
import { enrollmentsApi } from '@/lib/api';
import { CourseEnrollment } from '@/types/domain';
import { summarizeEnrollmentCourseProgress } from '@/features/student/utils/progress-utils';

export default function StudentDashboardPage() {
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

  const stats = useMemo(() => {
    if (enrollments.length === 0) {
      return {
        activeCourses: 0,
        completedLessons: 0,
        inProgressLessons: 0,
        averageProgress: 0,
      };
    }

    const totals = enrollments.reduce(
      (acc, enrollment) => {
        const progress = summarizeEnrollmentCourseProgress(enrollment);
        acc.completed += progress.completedLessons;
        acc.inProgress += progress.inProgressLessons;
        acc.percentSum += progress.percent;
        return acc;
      },
      { completed: 0, inProgress: 0, percentSum: 0 },
    );

    return {
      activeCourses: enrollments.length,
      completedLessons: totals.completed,
      inProgressLessons: totals.inProgress,
      averageProgress: Math.round(totals.percentSum / enrollments.length),
    };
  }, [enrollments]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Обзор"
        description="Продолжайте обучение по своим курсам и отслеживайте прогресс."
      />

      <KpiGrid
        items={[
          {
            label: 'Активные курсы',
            value: String(stats.activeCourses),
            hint: 'Текущие записи',
          },
          {
            label: 'Завершенные уроки',
            value: String(stats.completedLessons),
            hint: 'Во всех курсах',
          },
          {
            label: 'Уроки в процессе',
            value: String(stats.inProgressLessons),
            hint: 'Требуют завершения',
          },
          {
            label: 'Средний прогресс',
            value: `${stats.averageProgress}%`,
            hint: 'По всем курсам',
          },
        ]}
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить дашборд"
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
              title="У вас пока нет записей на курсы"
              description="Перейдите в каталог, откройте ссылку-приглашение от преподавателя и начните обучение."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/courses">
                    <Button>
                      <BookOpenText className="mr-2" size={18} />
                      Открыть каталог
                    </Button>
                  </Link>
                  <Link href="/student/courses">
                    <Button variant="secondary">
                      <GraduationCap className="mr-2" size={18} />
                      Мои курсы
                    </Button>
                  </Link>
                </div>
              }
            />
          )}

          
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[300px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
