'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { ModuleLessonsManager } from '@/features/lessons/components/module-lessons-manager';
import { useAuth } from '@/hooks/use-auth';
import { modulesApi } from '@/lib/api';
import { CourseModule } from '@/types/domain';

type TeacherModuleEditPageProps = {
  params: { courseId: string; moduleId: string };
};

export default function TeacherModuleEditPage({ params }: TeacherModuleEditPageProps) {
  const { accessToken, hydrated } = useAuth();
  const [moduleItem, setModuleItem] = useState<CourseModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModule = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const modules = await modulesApi.listByCourse(accessToken, params.courseId);
      const found = modules.find((item) => item.id === params.moduleId);

      if (!found) {
        throw new Error('Модуль не найден в этом курсе');
      }

      setModuleItem(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить модуль');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.courseId, params.moduleId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadModule();
  }, [hydrated, accessToken, loadModule]);

  const description = useMemo(() => {
    if (!moduleItem) return `Редактор модуля курса ${params.courseId}`;
    return `${moduleItem.lessons.length} уроков | порядок ${moduleItem.orderIndex}`;
  }, [moduleItem, params.courseId]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={moduleItem ? `Модуль: ${moduleItem.title}` : 'Конструктор модуля'}
        description={description}
        actions={
          <Link href={`/teacher/courses/${params.courseId}/edit`}>
            <Button variant="secondary">Назад к курсу</Button>
          </Link>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить модуль"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadModule()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && moduleItem ? (
        <>
          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Данные модуля</h2>
            <p className="mt-1 text-sm text-gray-500">
              Управляйте уроками модуля. Можно добавлять лекции, тесты и вебинары,
              изменять порядок и статус публикации.
            </p>
            {moduleItem.description ? (
              <p className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-500">
                {moduleItem.description}
              </p>
            ) : null}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Уроки</h2>
            <p className="mt-1 text-sm text-gray-500">
              Формируйте понятную траекторию обучения с разными типами уроков.
            </p>
            <div className="mt-4">
              <ModuleLessonsManager
                courseId={params.courseId}
                moduleId={moduleItem.id}
                accessToken={accessToken}
                onChanged={loadModule}
              />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[320px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
