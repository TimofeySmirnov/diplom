'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CourseStatus } from '@/types/domain';

const courseFormSchema = z.object({
  title: z.string().min(3, 'Название должно быть не короче 3 символов').max(140),
  shortDescription: z
    .string()
    .min(10, 'Краткое описание должно быть не короче 10 символов')
    .max(260),
  fullDescription: z
    .string()
    .min(30, 'Полное описание должно быть не короче 30 символов')
    .max(5000),
  coverImageUrl: z
    .string()
    .url('Ссылка на обложку должна быть корректным URL')
    .or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

type CourseFormProps = {
  mode: 'create' | 'edit';
  initialValues?: Partial<CourseFormValues>;
  submitting?: boolean;
  onSubmit: (values: {
    title: string;
    shortDescription: string;
    fullDescription: string;
    coverImageUrl?: string | null;
    status: CourseStatus;
  }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
};

export function CourseForm({
  mode,
  initialValues,
  submitting,
  onSubmit,
  onDelete,
}: CourseFormProps) {
  const defaults = useMemo<CourseFormValues>(
    () => ({
      title: initialValues?.title ?? '',
      shortDescription: initialValues?.shortDescription ?? '',
      fullDescription: initialValues?.fullDescription ?? '',
      coverImageUrl: initialValues?.coverImageUrl ?? '',
      status: initialValues?.status ?? 'DRAFT',
    }),
    [initialValues],
  );

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const submit = form.handleSubmit(async (values) => {
    const normalizedCoverImageUrl = values.coverImageUrl.trim();

    await onSubmit({
      title: values.title,
      shortDescription: values.shortDescription,
      fullDescription: values.fullDescription,
      coverImageUrl:
        normalizedCoverImageUrl.length > 0
          ? normalizedCoverImageUrl
          : mode === 'edit'
            ? null
            : undefined,
      status: values.status,
    });
  });

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Название" error={form.formState.errors.title?.message}>
        <Input {...form.register('title')} placeholder="Например: Основы баз данных" />
      </Field>

      <Field label="Краткое описание" error={form.formState.errors.shortDescription?.message}>
        <Input
          {...form.register('shortDescription')}
          placeholder="Краткое описание для карточек и каталога"
        />
      </Field>

      <Field label="Полное описание" error={form.formState.errors.fullDescription?.message}>
        <Textarea
          {...form.register('fullDescription')}
          placeholder="Подробная программа, результаты и траектория обучения"
          rows={8}
        />
      </Field>

      <Field label="URL обложки (необязательно)" error={form.formState.errors.coverImageUrl?.message}>
        <Input
          {...form.register('coverImageUrl')}
          placeholder="https://images.example.com/course-cover.jpg"
        />
      </Field>

      <Field label="Статус" error={form.formState.errors.status?.message}>
        <select
          {...form.register('status')}
          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="DRAFT">Черновик</option>
          <option value="PUBLISHED">Опубликован</option>
        </select>
      </Field>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting || submitting}>
          {mode === 'create'
            ? form.formState.isSubmitting || submitting
              ? 'Создание...'
              : 'Создать курс'
            : form.formState.isSubmitting || submitting
              ? 'Сохранение...'
              : 'Сохранить изменения'}
        </Button>

        {mode === 'edit' && onDelete ? (
          <Button
            type="button"
            variant="secondary"
            disabled={form.formState.isSubmitting || submitting}
            onClick={() => {
              void onDelete();
            }}
          >
            Удалить курс
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </label>
  );
}
