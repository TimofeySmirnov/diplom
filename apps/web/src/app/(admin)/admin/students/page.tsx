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

type CreateStudentState = {
  fullName: string;
  email: string;
  password: string;
  group: string;
};

type EditStudentState = {
  id: string;
  fullName: string;
  email: string;
  group: string;
};

export default function AdminStudentsPage() {
  const { accessToken, hydrated } = useAuth();
  const [students, setStudents] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createState, setCreateState] = useState<CreateStudentState>({
    fullName: '',
    email: '',
    password: '',
    group: '',
  });
  const [editState, setEditState] = useState<EditStudentState | null>(null);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students],
  );

  const loadStudents = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);

    try {
      const data = await adminUsersApi.listStudents(accessToken);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить список студентов');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadStudents();
  }, [hydrated, accessToken, loadStudents]);

  const canCreate = useMemo(() => {
    return (
      createState.fullName.trim().length >= 2 &&
      createState.email.trim().length > 4 &&
      createState.password.length >= 6
    );
  }, [createState]);

  const createStudent = async () => {
    if (!accessToken || !canCreate) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adminUsersApi.createStudent(accessToken, {
        fullName: createState.fullName.trim(),
        email: createState.email.trim(),
        password: createState.password,
        group: createState.group.trim() || undefined,
      });

      setStudents((prev) => [created, ...prev]);
      setCreateState({ fullName: '', email: '', password: '', group: '' });
      setNotice('Студент создан');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать студента');
    } finally {
      setSaving(false);
    }
  };

  const saveStudent = async () => {
    if (!accessToken || !editState) return;
    if (editState.fullName.trim().length < 2 || editState.email.trim().length < 5) {
      setError('Проверьте имя и email студента');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminUsersApi.updateStudent(accessToken, editState.id, {
        fullName: editState.fullName.trim(),
        email: editState.email.trim(),
        group: editState.group.trim() || null,
      });

      setStudents((prev) => prev.map((student) => (student.id === updated.id ? updated : student)));
      setEditState(null);
      setNotice('Данные студента обновлены');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить студента');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Управление студентами"
        description="Создавайте и редактируйте студенческие аккаунты, включая учебную группу."
      />

      <Card>
        <h2 className="text-lg font-semibold text-gray-700">Новый студент</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
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
          <Input
            value={createState.group}
            onChange={(event) =>
              setCreateState((prev) => ({ ...prev, group: event.target.value }))
            }
            maxLength={64}
            placeholder="Группа (например, ИС-21)"
          />
        </div>
        <div className="mt-3">
          <Button onClick={() => void createStudent()} disabled={!canCreate || saving}>
            {saving ? 'Сохранение...' : 'Создать студента'}
          </Button>
        </div>
      </Card>

      {notice ? <p className="text-sm text-emerald-500">{notice}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />
      ) : null}

      {!loading && sortedStudents.length === 0 ? (
        <EmptyState
          title="Студентов пока нет"
          description="Создайте первого студента через форму выше."
        />
      ) : null}

      {!loading && sortedStudents.length > 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-gray-700">Список студентов</h2>
          <div className="mt-4 grid gap-2">
            {sortedStudents.map((student) => {
              const isEditing = editState?.id === student.id;
              return (
                <div key={student.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {!isEditing ? (
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{student.fullName}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                        <p className="text-xs text-gray-500">
                          Группа: {student.group?.trim() || 'не указана'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="accent">Студент</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setEditState({
                              id: student.id,
                              fullName: student.fullName,
                              email: student.email,
                              group: student.group ?? '',
                            })
                          }
                          disabled={saving}
                        >
                          Изменить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="grid gap-2 sm:grid-cols-3">
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
                        <Input
                          value={editState.group}
                          onChange={(event) =>
                            setEditState((prev) =>
                              prev ? { ...prev, group: event.target.value } : prev,
                            )
                          }
                          maxLength={64}
                          placeholder="Группа"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void saveStudent()} disabled={saving}>
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
