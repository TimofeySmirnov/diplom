'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress-bar';
import { KpiGrid } from '@/features/statistics/components/kpi-grid';
import { summarizeEnrollmentCourseProgress } from '@/features/student/utils/progress-utils';
import { useAuth } from '@/hooks/use-auth';
import { enrollmentsApi } from '@/lib/api';
import { CourseEnrollment } from '@/types/domain';

export default function StudentProgressPage() {
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
      setError(err instanceof Error ? err.message : 'Не удалось загрузить прогресс');
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

  const summaries = useMemo(
    () =>
      enrollments.map((enrollment) => ({
        enrollment,
        summary: summarizeEnrollmentCourseProgress(enrollment),
      })),
    [enrollments],
  );

  const totals = useMemo(() => {
    if (summaries.length === 0) {
      return {
        courseCount: 0,
        overallPercent: 0,
        completedLessons: 0,
        remainingLessons: 0,
      };
    }

    const aggregate = summaries.reduce(
      (acc, item) => {
        acc.completed += item.summary.completedLessons;
        acc.total += item.summary.totalLessons;
        acc.percentSum += item.summary.percent;
        return acc;
      },
      { completed: 0, total: 0, percentSum: 0 },
    );

    return {
      courseCount: summaries.length,
      overallPercent: Math.round(aggregate.percentSum / summaries.length),
      completedLessons: aggregate.completed,
      remainingLessons: Math.max(aggregate.total - aggregate.completed, 0),
    };
  }, [summaries]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Прогресс обучения"
        description="Отслеживайте завершение уроков и текущий темп прохождения курсов."
      />

      <KpiGrid
        items={[
          {
            label: 'Курсы в обучении',
            value: String(totals.courseCount),
            hint: 'Активные записи',
          },
          {
            label: 'Общий прогресс',
            value: `${totals.overallPercent}%`,
            hint: 'Среднее по курсам',
          },
          {
            label: 'Завершенные уроки',
            value: String(totals.completedLessons),
            hint: 'По всем курсам',
          },
          {
            label: 'Оставшиеся уроки',
            value: String(totals.remainingLessons),
            hint: 'До полного завершения',
          },
        ]}
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить прогресс"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadEnrollments()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error ? (
        <Card>
          <h2 className="text-xl font-semibold text-gray-700">Прогресс по курсам</h2>
          <p className="mt-1 text-sm text-gray-500">
            Детальный статус по каждому курсу и переход к урокам.
          </p>

          <div className="mt-4 grid gap-3">
            {summaries.length === 0 ? (
              <p className="text-sm text-gray-500">У вас пока нет активных курсов.</p>
            ) : (
              summaries.map(({ enrollment, summary }) => {
                if (!enrollment.course) return null;

                return (
                  <div
                    key={enrollment.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-700">
                        {enrollment.course.title}
                      </h3>
                      <span className="text-sm text-gray-500">{summary.percent}%</span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {summary.completedLessons} из {summary.totalLessons} уроков завершено
                    </p>

                    <ProgressBar className="mt-3" value={summary.percent} />

                    <div className="mt-3">
                      <Link href={`/student/courses/${enrollment.course.id}`}>
                        <Button size="sm">Открыть курс</Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
