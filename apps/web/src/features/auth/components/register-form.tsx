'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import type { Route } from 'next';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Имя должно быть не короче 2 символов'),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await authApi.register(values);
      setSession(response);

      if (response.user.role === 'ADMIN') {
        router.replace('/admin/teachers');
        return;
      }

      const next = searchParams.get('next');
      if (next) {
        router.replace(next as Route);
        return;
      }

      router.replace('/student/dashboard');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Не удалось зарегистрироваться');
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="fullName">
          Полное имя
        </label>
        <Input id="fullName" {...form.register('fullName')} placeholder="Иван Иванов" />
        {form.formState.errors.fullName ? (
          <p className="text-xs text-red-500">{form.formState.errors.fullName.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="email">
          Email
        </label>
        <Input id="email" type="email" {...form.register('email')} />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-gray-700" htmlFor="password">
          Пароль
        </label>
        <Input id="password" type="password" {...form.register('password')} />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Создание аккаунта...' : 'Создать аккаунт'}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Уже есть аккаунт?{' '}
        <Link href="/login" className="font-medium text-emerald-500 hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
