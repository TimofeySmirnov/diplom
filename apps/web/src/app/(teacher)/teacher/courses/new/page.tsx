'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { CourseForm } from '@/features/courses/components/course-form';
import { useAuth } from '@/hooks/use-auth';
import { coursesApi } from '@/lib/api';

export default function NewCoursePage() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Создать курс"
        description="Сначала заполните данные курса. Модули и уроки можно добавить далее."
      />

      <Card>
        <CourseForm
          mode="create"
          submitting={submitting}
          onSubmit={async (values) => {
            if (!accessToken) {
              setError('Вы не авторизованы');
              return;
            }

            setSubmitting(true);
            setError(null);
            try {
              const created = await coursesApi.create(accessToken, {
                ...values,
                coverImageUrl: values.coverImageUrl ?? undefined,
              });
              router.push(`/teacher/courses/${created.id}/edit`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Не удалось создать курс');
            } finally {
              setSubmitting(false);
            }
          }}
        />

        {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}
      </Card>
    </div>
  );
}
