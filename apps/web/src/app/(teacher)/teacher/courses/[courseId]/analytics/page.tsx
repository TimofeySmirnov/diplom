'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StudentProgressDetails } from '@/features/progress/components/student-progress-details';
import { StudentProgressTable } from '@/features/progress/components/student-progress-table';
import { KpiGrid } from '@/features/statistics/components/kpi-grid';
import { useAuth } from '@/hooks/use-auth';
import {
  CourseAnalyticsOverview,
  StudentAnalyticsDetails,
  statisticsApi,
} from '@/lib/api/statistics-api';

type TeacherCourseAnalyticsPageProps = {
  params: { courseId: string };
};

export default function TeacherCourseAnalyticsPage({
  params,
}: TeacherCourseAnalyticsPageProps) {
  const { accessToken, hydrated } = useAuth();
  const [courseOverview, setCourseOverview] = useState<CourseAnalyticsOverview | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentAnalyticsDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  const loadCourseOverview = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    try {
      const data = await statisticsApi.byCourse(params.courseId, accessToken);
      setCourseOverview(data);
      setSelectedStudentId((prev) => prev ?? data.students[0]?.student.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аналитику курса');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.courseId]);

  const loadStudentDetails = useCallback(
    async (studentId: string) => {
      if (!accessToken) return;

      setLoadingStudent(true);
      setStudentError(null);
      try {
        const data = await statisticsApi.byStudent(
          params.courseId,
          studentId,
          accessToken,
        );
        setStudentDetails(data);
      } catch (err) {
        setStudentError(
          err instanceof Error ? err.message : 'Не удалось загрузить аналитику студента',
        );
      } finally {
        setLoadingStudent(false);
      }
    },
    [accessToken, params.courseId],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) {
      setLoading(false);
      return;
    }

    void loadCourseOverview();
  }, [hydrated, accessToken, loadCourseOverview]);

  useEffect(() => {
    if (!hydrated || !accessToken || !selectedStudentId) return;
    void loadStudentDetails(selectedStudentId);
  }, [hydrated, accessToken, selectedStudentId, loadStudentDetails]);

  const kpis = useMemo(() => {
    if (!courseOverview) return [];

    return [
      {
        label: 'Зачислено студентов',
        value: String(courseOverview.summary.students),
        hint: 'Активные участники курса',
      },
      {
        label: 'Завершенные уроки',
        value: String(courseOverview.summary.completedLessonProgress),
        hint: `Из ${courseOverview.summary.totalPossibleProgress} возможных`,
      },
      {
        label: 'Прогресс курса',
        value: `${courseOverview.summary.completionRatePercent}%`,
        hint: 'Средний по всем студентам',
      },
      {
        label: 'Тестовые попытки',
        value: String(courseOverview.tests.submittedAttempts),
        hint: `Средний лучший тест: ${courseOverview.tests.averageBestScorePercent ?? '—'}%`,
      },
    ];
  }, [courseOverview]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          courseOverview
            ? `Аналитика курса: ${courseOverview.course.title}`
            : 'Аналитика курса'
        }
        description="Карточки, прогресс-бары и подробная аналитика по каждому студенту."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/teacher/courses/${params.courseId}/edit`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft size={18} className="mr-2" />
                К курсу
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => void loadCourseOverview()}>
              Обновить
            </Button>
          </div>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить аналитику"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadCourseOverview()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && courseOverview ? (
        <>
          <KpiGrid items={kpis} />

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Сводка прогресса</h2>
            <p className="mt-1 text-sm text-gray-500">
              В статистику включены только опубликованные уроки и активные зачисления.
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Выполнение по курсу</span>
                  <span>{courseOverview.summary.completionRatePercent}%</span>
                </div>
                <ProgressBar value={courseOverview.summary.completionRatePercent} />
              </div>
              <div className="grid gap-1 text-sm text-gray-700">
                <p>Лекций: {courseOverview.summary.lessons.lecture}</p>
                <p>Вебинаров: {courseOverview.summary.lessons.webinar}</p>
                <p>Тестов: {courseOverview.summary.lessons.test}</p>
                <p>Студентов в риске: {courseOverview.summary.studentsAtRisk}</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Все студенты курса</h2>
            <p className="mt-1 text-sm text-gray-500">
              Можно открыть быстрый просмотр ниже или перейти на отдельную страницу студента.
            </p>
            <div className="mt-4">
              <StudentProgressTable
                courseId={params.courseId}
                students={courseOverview.students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={setSelectedStudentId}
              />
            </div>
          </Card>

          {loadingStudent ? (
            <LoadingDetailsBlock />
          ) : studentError ? (
            <EmptyState
              title="Не удалось загрузить аналитику студента"
              description={studentError}
              action={
                selectedStudentId ? (
                  <Button
                    variant="secondary"
                    onClick={() => void loadStudentDetails(selectedStudentId)}
                  >
                    Повторить
                  </Button>
                ) : undefined
              }
            />
          ) : studentDetails ? (
            <StudentProgressDetails details={studentDetails} />
          ) : (
            <Card>
              <p className="text-sm text-gray-500">
                Выберите студента в таблице, чтобы открыть детальную статистику.
              </p>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[320px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}

function LoadingDetailsBlock() {
  return <div className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
