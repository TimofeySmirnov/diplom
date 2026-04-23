'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { modulesApi } from '@/lib/api';
import { CourseModule } from '@/types/domain';
import { ArrowDown, ArrowUp } from 'lucide-react';

type CourseModulesManagerProps = {
  courseId: string;
  accessToken: string | null;
  onChanged?: () => Promise<void> | void;
};

export function CourseModulesManager({
  courseId,
  accessToken,
  onChanged,
}: CourseModulesManagerProps) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createOrderIndex, setCreateOrderIndex] = useState('');

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const canCreate = createTitle.trim().length >= 2;

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.orderIndex - b.orderIndex),
    [modules],
  );

  const loadModules = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await modulesApi.listByCourse(accessToken, courseId);
      setModules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить модули');
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseId]);

  useEffect(() => {
    if (!accessToken) return;
    void loadModules();
  }, [accessToken, loadModules]);

  const submitCreate = async () => {
    if (!accessToken || !canCreate) return;

    setSaving(true);
    setError(null);

    try {
      await modulesApi.create(accessToken, {
        courseId,
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        orderIndex: createOrderIndex ? Number(createOrderIndex) : undefined,
      });

      setCreateTitle('');
      setCreateDescription('');
      setCreateOrderIndex('');
      await loadModules();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать модуль');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (module: CourseModule) => {
    setEditingModuleId(module.id);
    setEditTitle(module.title);
    setEditDescription(module.description ?? '');
  };

  const saveEdit = async () => {
    if (!accessToken || !editingModuleId || editTitle.trim().length < 2) return;

    setSaving(true);
    setError(null);

    try {
      await modulesApi.update(accessToken, editingModuleId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });

      setEditingModuleId(null);
      setEditTitle('');
      setEditDescription('');
      await loadModules();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить модуль');
    } finally {
      setSaving(false);
    }
  };

  const removeModule = async (moduleId: string) => {
    if (!accessToken) return;

    const confirmed = window.confirm('Удалить модуль? Все уроки внутри будут удалены.');
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await modulesApi.remove(accessToken, moduleId);
      await loadModules();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить модуль');
    } finally {
      setSaving(false);
    }
  };

  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    if (!accessToken) return;

    const current = [...sortedModules];
    const index = current.findIndex((module) => module.id === moduleId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const reordered = [...current];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);

    setSaving(true);
    setError(null);

    try {
      const data = await modulesApi.reorder(accessToken, {
        courseId,
        items: reordered.map((module, idx) => ({
          moduleId: module.id,
          orderIndex: idx + 1,
        })),
      });
      setModules(data);
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить порядок модулей');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-base font-semibold text-gray-700">Создать модуль</h3>
        <p className="mt-1 text-xs text-gray-500">
          Добавляйте учебные разделы и выстраивайте понятный порядок.
        </p>

        <div className="mt-3 grid gap-2">
          <Input
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            placeholder="Название модуля"
          />
          <Textarea
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            placeholder="Описание модуля (необязательно)"
            rows={3}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              value={createOrderIndex}
              onChange={(event) => setCreateOrderIndex(event.target.value)}
              placeholder="Порядковый номер (необязательно)"
              className="max-w-[220px]"
            />
            <Button onClick={() => void submitCreate()} disabled={!canCreate || saving}>
              {saving ? 'Сохранение...' : 'Добавить модуль'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? (
        <div className="h-[180px] animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      ) : null}

      {!loading && sortedModules.length === 0 ? (
        <p className="text-sm text-gray-500">Модулей пока нет. Создайте первый модуль выше.</p>
      ) : null}

      {!loading && sortedModules.length > 0 ? (
        <div className="grid gap-2">
          {sortedModules.map((module, idx) => {
            const isEditing = editingModuleId === module.id;

            return (
              <div key={module.id} className="rounded-xl border border-gray-200 bg-white p-3">
                {isEditing ? (
                  <div className="grid gap-2">
                    <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                    <Textarea
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      rows={3}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void saveEdit()} disabled={saving}>
                        Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingModuleId(null)}
                        disabled={saving}
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        {module.orderIndex}. {module.title}
                      </p>
                      {module.description ? (
                        <p className="mt-1 text-xs text-gray-500">{module.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-gray-500">{module.lessons.length} уроков</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/teacher/courses/${courseId}/modules/${module.id}/edit`}>
                        <Button size="sm" variant="ghost">
                          Открыть
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void moveModule(module.id, 'up')}
                        disabled={saving || idx === 0}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void moveModule(module.id, 'down')}
                        disabled={saving || idx === sortedModules.length - 1}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(module)}
                        disabled={saving}
                      >
                        Изменить
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void removeModule(module.id)}
                        disabled={saving}
                      >
                        Удалить
                      </Button>
                      
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
