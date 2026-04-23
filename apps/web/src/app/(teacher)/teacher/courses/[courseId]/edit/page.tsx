'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { CourseAccessManager } from '@/features/courses/components/course-access-manager';
import { CourseForm } from '@/features/courses/components/course-form';
import { CourseStatusBadge } from '@/features/courses/components/course-status-badge';
import { CourseModulesManager } from '@/features/modules/components/course-modules-manager';
import { useAuth } from '@/hooks/use-auth';
import { coursesApi } from '@/lib/api';
import { CourseDetails, CourseStatus } from '@/types/domain';

type EditCoursePageProps = {
  params: { courseId: string };
};

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const router = useRouter();
  const { accessToken, hydrated } = useAuth();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await coursesApi.getMyTeacherCourseById(accessToken, params.courseId);
      setCourse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить курс');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.courseId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadCourse();
  }, [hydrated, accessToken, loadCourse]);

  const moduleSummary = useMemo(() => {
    if (!course) return '0 модулей';
    return `${course.modules.length} модулей | ${course._count?.enrollments ?? 0} студентов`;
  }, [course]);

  const formInitialValues = useMemo(
    () =>
      course
        ? {
            title: course.title,
            shortDescription: course.shortDescription,
            fullDescription: course.fullDescription,
            coverImageUrl: course.coverImageUrl ?? '',
            status: course.status,
          }
        : undefined,
    [course],
  );

  const toggleStatus = async () => {
    if (!course || !accessToken) return;

    const nextStatus: CourseStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';

    setSaving(true);
    setError(null);
    try {
      const updated = await coursesApi.update(accessToken, course.id, {
        status: nextStatus,
      });

      setCourse((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
            }
          : prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить статус');
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async () => {
    if (!accessToken || !course) return;
    const confirmed = window.confirm('Удалить курс? Это действие нельзя отменить.');
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      await coursesApi.remove(accessToken, course.id);
      router.replace('/teacher/courses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить курс');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title={course ? `Редактирование: ${course.title}` : 'Редактирование курса'}
        description={moduleSummary}
        actions={
          <div className="flex flex-wrap gap-2">
            {course ? <CourseStatusBadge status={course.status} /> : null}
            {course ? (
              <Button variant="secondary" onClick={() => void toggleStatus()} disabled={saving}>
                {course.status === 'PUBLISHED' ? 'Вернуть в черновик' : 'Опубликовать курс'}
              </Button>
            ) : null}
            <Link href={`/teacher/courses/${params.courseId}/analytics`}>
              <Button variant="ghost">Аналитика</Button>
            </Link>
          </div>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить курс"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadCourse()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && course ? (
        <>
          <Card>
            <CourseForm
              mode="edit"
              submitting={saving}
              initialValues={formInitialValues}
              onSubmit={async (values) => {
                if (!accessToken) return;

                setSaving(true);
                setError(null);
                try {
                  const updated = await coursesApi.update(accessToken, course.id, values);
                  setCourse((prev) =>
                    prev
                      ? {
                          ...prev,
                          ...updated,
                        }
                      : prev,
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Не удалось обновить курс');
                } finally {
                  setSaving(false);
                }
              }}
              onDelete={deleteCourse}
            />

            {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Модули</h2>
            <p className="mt-1 text-sm text-gray-500">
              Управляйте структурой модулей и порядком контента в одном месте.
            </p>
            <div className="mt-4">
              <CourseModulesManager
                courseId={course.id}
                accessToken={accessToken}
                onChanged={loadCourse}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Приглашения и студенты</h2>
            <p className="mt-1 text-sm text-gray-500">
              Создавайте ссылки-приглашения, копируйте их и управляйте зачисленными студентами.
            </p>
            <div className="mt-4">
              <CourseAccessManager courseId={course.id} accessToken={accessToken} />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
