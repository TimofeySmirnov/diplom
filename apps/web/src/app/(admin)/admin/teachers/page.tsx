'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/hooks/use-auth';
import { adminUsersApi } from '@/lib/api';
import { PublicUser } from '@/types/domain';

type CreateTeacherState = {
  fullName: string;
  email: string;
  password: string;
};

type EditTeacherState = {
  id: string;
  fullName: string;
  email: string;
};

export default function AdminTeachersPage() {
  const { accessToken, hydrated } = useAuth();
  const [teachers, setTeachers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createState, setCreateState] = useState<CreateTeacherState>({
    fullName: '',
    email: '',
    password: '',
  });
  const [editState, setEditState] = useState<EditTeacherState | null>(null);

  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [teachers],
  );

  const loadTeachers = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await adminUsersApi.listTeachers(accessToken);
      setTeachers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список преподавателей');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadTeachers();
  }, [hydrated, accessToken, loadTeachers]);

  const canCreate = useMemo(() => {
    return (
      createState.fullName.trim().length >= 2 &&
      createState.email.trim().length > 4 &&
      createState.password.length >= 6
    );
  }, [createState]);

  const createTeacher = async () => {
    if (!accessToken || !canCreate) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminUsersApi.createTeacher(accessToken, {
        fullName: createState.fullName.trim(),
        email: createState.email.trim(),
        password: createState.password,
      });

      setTeachers((prev) => [created, ...prev]);
      setCreateState({ fullName: '', email: '', password: '' });
      setNotice('Преподаватель создан');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать преподавателя');
    } finally {
      setSaving(false);
    }
  };

  const saveTeacher = async () => {
    if (!accessToken || !editState) return;
    if (editState.fullName.trim().length < 2 || editState.email.trim().length < 5) {
      setError('Проверьте имя и email преподавателя');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.updateTeacher(accessToken, editState.id, {
        fullName: editState.fullName.trim(),
        email: editState.email.trim(),
      });

      setTeachers((prev) => prev.map((teacher) => (teacher.id === updated.id ? updated : teacher)));
      setEditState(null);
      setNotice('Данные преподавателя обновлены');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить преподавателя');
    } finally {
      setSaving(false);
    }
  };

  const removeTeacher = async (teacher: PublicUser) => {
    if (!accessToken) return;

    const confirmed = window.confirm(
      `Удалить преподавателя "${teacher.fullName}"? Действие нельзя отменить.`,
    );
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await adminUsersApi.removeTeacher(accessToken, teacher.id);
      setTeachers((prev) => prev.filter((item) => item.id !== teacher.id));
      if (editState?.id === teacher.id) {
        setEditState(null);
      }
      setNotice('Преподаватель удалён');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить преподавателя');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Управление преподавателями"
        description="Создавайте, редактируйте и удаляйте аккаунты преподавателей."
      />

      <Card>
        <h2 className="text-lg font-semibold text-gray-700">Новый преподаватель</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Input
            value={createState.fullName}
            onChange={(event) =>
              setCreateState((prev) => ({ ...prev, fullName: event.target.value }))
            }
            placeholder="ФИО"
          />
          <Input
            type="email"
            value={createState.email}
            onChange={(event) =>
              setCreateState((prev) => ({ ...prev, email: event.target.value }))
            }
            placeholder="Email"
          />
          <Input
            type="password"
            value={createState.password}
            onChange={(event) =>
              setCreateState((prev) => ({ ...prev, password: event.target.value }))
            }
            placeholder="Пароль"
          />
        </div>
        <div className="mt-3">
          <Button onClick={() => void createTeacher()} disabled={!canCreate || saving}>
            {saving ? 'Сохранение...' : 'Создать преподавателя'}
          </Button>
        </div>
      </Card>

      {notice ? <p className="text-sm text-emerald-500">{notice}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? <div className="h-[220px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" /> : null}

      {!loading && sortedTeachers.length === 0 ? (
        <EmptyState
          title="Преподавателей пока нет"
          description="Создайте первого преподавателя через форму выше."
        />
      ) : null}

      {!loading && sortedTeachers.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-gray-700">Список преподавателей</h2>
          <div className="mt-4 grid gap-2">
            {sortedTeachers.map((teacher) => {
              const isEditing = editState?.id === teacher.id;
              return (
                <div key={teacher.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {!isEditing ? (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{teacher.fullName}</p>
                        <p className="text-xs text-gray-500">{teacher.email}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">Преподаватель</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setEditState({
                              id: teacher.id,
                              fullName: teacher.fullName,
                              email: teacher.email,
                            })
                          }
                          disabled={saving}
                        >
                          Изменить
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void removeTeacher(teacher)}
                          disabled={saving}
                        >
                          Удалить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={editState.fullName}
                          onChange={(event) =>
                            setEditState((prev) =>
                              prev ? { ...prev, fullName: event.target.value } : prev,
                            )
                          }
                        />
                        <Input
                          type="email"
                          value={editState.email}
                          onChange={(event) =>
                            setEditState((prev) =>
                              prev ? { ...prev, email: event.target.value } : prev,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveTeacher()} disabled={saving}>
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditState(null)}
                          disabled={saving}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
