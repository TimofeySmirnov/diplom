'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { StudentProgressDetails } from '@/features/progress/components/student-progress-details';
import { KpiGrid } from '@/features/statistics/components/kpi-grid';
import { useAuth } from '@/hooks/use-auth';
import { StudentAnalyticsDetails, statisticsApi } from '@/lib/api/statistics-api';

type TeacherStudentAnalyticsPageProps = {
  params: {
    courseId: string;
    studentId: string;
  };
};

export default function TeacherStudentAnalyticsPage({
  params,
}: TeacherStudentAnalyticsPageProps) {
  const { accessToken, hydrated } = useAuth();
  const [details, setDetails] = useState<StudentAnalyticsDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    try {
      const data = await statisticsApi.byStudent(
        params.courseId,
        params.studentId,
        accessToken,
      );
      setDetails(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось загрузить статистику студента',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.courseId, params.studentId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    void loadDetails();
  }, [hydrated, accessToken, loadDetails]);

  const kpis = useMemo(() => {
    if (!details) return [];

    return [
      {
        label: 'Прогресс',
        value: `${details.summary.completionRatePercent}%`,
        hint: `${details.summary.completedLessons}/${details.summary.totalLessons} уроков`,
      },
      {
        label: 'Тестовые попытки',
        value: String(details.tests.submittedAttempts),
        hint: 'Только отправленные',
      },
      {
        label: 'Средний тест',
        value: `${details.tests.averageScorePercent ?? '—'}%`,
        hint: 'По всем попыткам',
      },
      {
        label: 'Лучший тест',
        value: `${details.tests.bestScorePercent ?? '—'}%`,
        hint: details.lastActivityAt
          ? `Активность: ${new Date(details.lastActivityAt).toLocaleDateString('ru-RU')}`
          : 'Активность: нет данных',
      },
    ];
  }, [details]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={details ? `Статистика: ${details.student.fullName}` : 'Статистика студента'}
        description={details ? `Курс: ${details.course.title}` : 'Детальная аналитика по студенту'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/teacher/courses/${params.courseId}/analytics`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft size={18} className="mr-2" />
                К аналитике курса
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => void loadDetails()}>
              Обновить
            </Button>
          </div>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить статистику"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadDetails()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && details ? (
        <>
          <KpiGrid items={kpis} />
          <Card>
            <p className="text-sm text-gray-500">
              Зачислен: {new Date(details.enrollment.enrolledAt).toLocaleString('ru-RU')}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Последняя активность:{' '}
              {details.lastActivityAt
                ? new Date(details.lastActivityAt).toLocaleString('ru-RU')
                : 'нет данных'}
            </p>
          </Card>
          <StudentProgressDetails details={details} />
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
