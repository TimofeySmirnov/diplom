'use client';

import Link from 'next/link';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  CreateLessonPayload,
  LessonTransferPayload,
  LessonLecturePayload,
  LessonTestPayload,
  LessonWebinarPayload,
  lessonsApi,
  UpdateLessonPayload,
} from '@/lib/api';
import { Lesson, LessonType } from '@/types/domain';

type ModuleLessonsManagerProps = {
  courseId: string;
  moduleId: string;
  accessToken: string | null;
  onChanged?: () => Promise<void> | void;
};

type LessonEditorState = {
  lessonId?: string;
  type: LessonType;
  title: string;
  description: string;
  orderIndex: string;
  isPublished: boolean;
  lectureContent: string;
  passingScore: string;
  allowMultipleAttempts: boolean;
  maxAttempts: string;
  timeLimitMinutes: string;
  webinarMeetingLink: string;
  webinarScheduledAt: string;
  webinarDurationMinutes: string;
};

const LESSON_TYPES: Array<{ value: LessonType; label: string }> = [
  { value: 'LECTURE', label: 'Лекция' },
  { value: 'TEST', label: 'Тест' },
  { value: 'WEBINAR', label: 'Вебинар' },
];

function createEmptyLessonState(type: LessonType = 'LECTURE'): LessonEditorState {
  return {
    type,
    title: '',
    description: '',
    orderIndex: '',
    isPublished: false,
    lectureContent: '',
    passingScore: '',
    allowMultipleAttempts: true,
    maxAttempts: '',
    timeLimitMinutes: '',
    webinarMeetingLink: '',
    webinarScheduledAt: '',
    webinarDurationMinutes: '',
  };
}

export function ModuleLessonsManager({
  courseId,
  moduleId,
  accessToken,
  onChanged,
}: ModuleLessonsManagerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [createState, setCreateState] = useState<LessonEditorState>(() =>
    createEmptyLessonState(),
  );
  const [editState, setEditState] = useState<LessonEditorState | null>(null);

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.orderIndex - b.orderIndex),
    [lessons],
  );

  const loadLessons = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await lessonsApi.listByModule(moduleId, accessToken);
      setLessons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить уроки');
    } finally {
      setLoading(false);
    }
  }, [accessToken, moduleId]);

  useEffect(() => {
    if (!accessToken) return;
    void loadLessons();
  }, [accessToken, loadLessons]);

  const canCreate = useMemo(() => {
    if (createState.title.trim().length < 2) return false;
    if (
      createState.type === 'WEBINAR' &&
      (!createState.webinarMeetingLink.trim() || !createState.webinarScheduledAt)
    ) {
      return false;
    }

    return true;
  }, [createState]);

  const submitCreate = async () => {
    if (!accessToken || !canCreate) return;

    setSaving(true);
    setError(null);

    try {
      if (createState.type === 'LECTURE') {
        const lecture = buildLecturePayload(createState);
        await lessonsApi.createLecture(accessToken, {
          moduleId,
          title: createState.title.trim(),
          description: createState.description.trim() || undefined,
          orderIndex: toOptionalInt(createState.orderIndex),
          isPublished: createState.isPublished,
          content: lecture?.content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
        });
      } else if (createState.type === 'WEBINAR') {
        const webinar = buildWebinarPayload(createState);
        if (!webinar) {
          throw new Error('Для вебинара нужны ссылка и дата/время');
        }

        await lessonsApi.createWebinar(accessToken, {
          moduleId,
          title: createState.title.trim(),
          description: createState.description.trim() || undefined,
          orderIndex: toOptionalInt(createState.orderIndex),
          isPublished: createState.isPublished,
          meetingLink: webinar.meetingLink,
          scheduledAt: webinar.scheduledAt,
          durationMinutes: webinar.durationMinutes,
        });
      } else {
        await lessonsApi.create(accessToken, buildCreatePayload(moduleId, createState));
      }

      setCreateState(createEmptyLessonState());
      await loadLessons();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать урок');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (lesson: Lesson) => {
    setEditState(toEditorState(lesson));
  };

  const cancelEdit = () => {
    setEditState(null);
  };

  const saveEdit = async () => {
    if (!accessToken || !editState?.lessonId || editState.title.trim().length < 2) {
      return;
    }

    if (
      editState.type === 'WEBINAR' &&
      (!editState.webinarMeetingLink.trim() || !editState.webinarScheduledAt)
    ) {
      setError('Для вебинара нужны ссылка и дата/время');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editState.type === 'LECTURE') {
        const lecture = buildLecturePayload(editState);
        await lessonsApi.updateLecture(accessToken, editState.lessonId, {
          title: editState.title.trim(),
          description: editState.description.trim() || undefined,
          orderIndex: toOptionalInt(editState.orderIndex),
          isPublished: editState.isPublished,
          content: lecture?.content,
        });
      } else if (editState.type === 'WEBINAR') {
        const webinar = buildWebinarPayload(editState);
        if (!webinar) {
          throw new Error('Для вебинара нужны ссылка и дата/время');
        }

        await lessonsApi.updateWebinar(accessToken, editState.lessonId, {
          title: editState.title.trim(),
          description: editState.description.trim() || undefined,
          orderIndex: toOptionalInt(editState.orderIndex),
          isPublished: editState.isPublished,
          meetingLink: webinar.meetingLink,
          scheduledAt: webinar.scheduledAt,
          durationMinutes: webinar.durationMinutes,
        });
      } else {
        await lessonsApi.update(accessToken, editState.lessonId, buildUpdatePayload(editState));
      }

      setEditState(null);
      await loadLessons();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить урок');
    } finally {
      setSaving(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!accessToken) return;

    const confirmed = window.confirm('Удалить урок? Это действие нельзя отменить.');
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await lessonsApi.remove(accessToken, lessonId);
      if (editState?.lessonId === lessonId) {
        setEditState(null);
      }
      await loadLessons();
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить урок');
    } finally {
      setSaving(false);
    }
  };

  const moveLesson = async (lessonId: string, direction: 'up' | 'down') => {
    if (!accessToken) return;

    const current = [...sortedLessons];
    const index = current.findIndex((lesson) => lesson.id === lessonId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const reordered = [...current];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);

    setSaving(true);
    setError(null);

    try {
      const data = await lessonsApi.reorder(accessToken, {
        moduleId,
        items: reordered.map((lesson, idx) => ({
          lessonId: lesson.id,
          orderIndex: idx + 1,
        })),
      });
      setLessons(data);
      await onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось изменить порядок уроков');
    } finally {
      setSaving(false);
    }
  };

  const exportLesson = async (lesson: Lesson) => {
    if (!accessToken) return;
    if (lesson.type !== 'LECTURE' && lesson.type !== 'TEST') return;

    setSaving(true);
    setError(null);

    try {
      const payload = await lessonsApi.exportLesson(accessToken, lesson.id);
      const fileName = buildExportFileName(lesson);
      downloadJsonFile(fileName, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось экспортировать урок');
    } finally {
      setSaving(false);
    }
  };

  const openImportPicker = () => {
    importInputRef.current?.click();
  };

  const importLessonFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !accessToken) return;

    setImporting(true);
    setError(null);

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;

      if (!looksLikeLessonTransferPayload(parsed)) {
        throw new Error('Файл не похож на поддерживаемый формат экспорта ZSkills');
      }

      await lessonsApi.importLessonToModule(
        accessToken,
        moduleId,
        parsed as LessonTransferPayload,
      );

      await loadLessons();
      await onChanged?.();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('Некорректный JSON-файл. Проверьте формат экспорта.');
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось импортировать урок');
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-base font-semibold text-gray-700">Создать урок</h3>
        <p className="mt-1 text-xs text-gray-500">
          Добавляйте лекции, тесты и вебинары в правильной последовательности.
        </p>

        <div className="mt-3 grid gap-2">
          <Input
            value={createState.title}
            onChange={(event) =>
              setCreateState((prev) => ({ ...prev, title: event.target.value }))
            }
            placeholder="Название урока"
          />

          <Textarea
            value={createState.description}
            onChange={(event) =>
              setCreateState((prev) => ({ ...prev, description: event.target.value }))
            }
            rows={3}
            placeholder="Описание урока (необязательно)"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Тип урока</p>
              <select
                value={createState.type}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    type: event.target.value as LessonType,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
              >
                {LESSON_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Порядковый номер (необязательно)</p>
              <Input
                type="number"
                min={1}
                value={createState.orderIndex}
                onChange={(event) =>
                  setCreateState((prev) => ({ ...prev, orderIndex: event.target.value }))
                }
                placeholder="Авто"
              />
            </div>
          </div>

          <LessonTypeFields
            state={createState}
            onChange={(updater) => setCreateState((prev) => updater(prev))}
            idPrefix="create-lesson"
          />

          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={createState.isPublished}
              onChange={(event) =>
                setCreateState((prev) => ({
                  ...prev,
                  isPublished: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
            />
            Опубликовать сразу
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void submitCreate()} disabled={!canCreate || saving}>
              {saving ? 'Сохранение...' : 'Добавить урок'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={openImportPicker}
              disabled={saving || importing}
            >
              {importing ? 'Импорт...' : 'Импорт JSON'}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void importLessonFromFile(event)}
            />
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? (
        <div className="h-[180px] animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      ) : null}

      {!loading && sortedLessons.length === 0 ? (
        <p className="text-sm text-gray-500">Уроков пока нет. Создайте первый урок выше.</p>
      ) : null}

      {!loading && sortedLessons.length > 0 ? (
        <div className="grid gap-2">
          {sortedLessons.map((lesson, idx) => {
            const isEditing = editState?.lessonId === lesson.id;

            return (
              <div key={lesson.id} className="rounded-xl border border-gray-200 bg-white p-3">
                {isEditing && editState ? (
                  <div className="grid gap-2">
                    <Input
                      value={editState.title}
                      onChange={(event) =>
                        setEditState((prev) =>
                          prev ? { ...prev, title: event.target.value } : prev,
                        )
                      }
                    />
                    <Textarea
                      value={editState.description}
                      onChange={(event) =>
                        setEditState((prev) =>
                          prev ? { ...prev, description: event.target.value } : prev,
                        )
                      }
                      rows={3}
                    />

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">Тип урока</p>
                        <select
                          value={editState.type}
                          onChange={(event) =>
                            setEditState((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    type: event.target.value as LessonType,
                                  }
                                : prev,
                            )
                          }
                          className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                        >
                          {LESSON_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-medium text-gray-500">
                          Порядковый номер (необязательно)
                        </p>
                        <Input
                          type="number"
                          min={1}
                          value={editState.orderIndex}
                          onChange={(event) =>
                            setEditState((prev) =>
                              prev ? { ...prev, orderIndex: event.target.value } : prev,
                            )
                          }
                        />
                      </div>
                    </div>

                    <LessonTypeFields
                      state={editState}
                      onChange={(updater) =>
                        setEditState((prev) => (prev ? updater(prev) : prev))
                      }
                      idPrefix={`edit-${lesson.id}`}
                    />

                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={editState.isPublished}
                        onChange={(event) =>
                          setEditState((prev) =>
                            prev ? { ...prev, isPublished: event.target.checked } : prev,
                          )
                        }
                        className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      Опубликован
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void saveEdit()} disabled={saving}>
                        Сохранить
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={saving}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-700">
                          {lesson.orderIndex}. {lesson.title}
                        </p>
                        <Badge tone={lessonTypeTone(lesson.type)}>{lessonTypeLabel(lesson.type)}</Badge>
                        <Badge tone={lesson.isPublished ? 'success' : 'neutral'}>
                          {lesson.isPublished ? 'Опубликован' : 'Черновик'}
                        </Badge>
                      </div>

                      {lesson.description ? (
                        <p className="mt-1 text-xs text-gray-500">{lesson.description}</p>
                      ) : null}

                      <p className="mt-1 text-xs text-gray-500">{lessonMeta(lesson)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void moveLesson(lesson.id, 'up')}
                        disabled={saving || idx === 0}
                      >
                        Вверх
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void moveLesson(lesson.id, 'down')}
                        disabled={saving || idx === sortedLessons.length - 1}
                      >
                        Вниз
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(lesson)}
                        disabled={saving}
                      >
                        Изменить
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void deleteLesson(lesson.id)}
                        disabled={saving}
                      >
                        Удалить
                      </Button>
                      {(lesson.type === 'LECTURE' || lesson.type === 'TEST') ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void exportLesson(lesson)}
                          disabled={saving || importing}
                        >
                          Экспорт JSON
                        </Button>
                      ) : null}
                      {lesson.type === 'LECTURE' ? (
                        <Link
                          href={`/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/lecture`}
                        >
                          <Button size="sm" variant="ghost">
                            Редактор лекции
                          </Button>
                        </Link>
                      ) : null}
                      {lesson.type === 'TEST' ? (
                        <Link
                          href={`/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/test`}
                        >
                          <Button size="sm" variant="ghost">
                            Конструктор теста
                          </Button>
                        </Link>
                      ) : null}
                      {lesson.type === 'WEBINAR' ? (
                        <Link
                          href={`/teacher/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}/webinar`}
                        >
                          <Button size="sm" variant="ghost">
                            Редактор вебинара
                          </Button>
                        </Link>
                      ) : null}
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

type LessonTypeFieldsProps = {
  state: LessonEditorState;
  onChange: (updater: (prev: LessonEditorState) => LessonEditorState) => void;
  idPrefix: string;
};

function LessonTypeFields({ state, onChange, idPrefix }: LessonTypeFieldsProps) {
  const update = <K extends keyof LessonEditorState>(key: K, value: LessonEditorState[K]) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  if (state.type === 'LECTURE') {
    return (
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">Содержимое лекции</p>
        <Textarea
          id={`${idPrefix}-lecture-content`}
          rows={4}
          value={state.lectureContent}
          onChange={(event) => update('lectureContent', event.target.value)}
          placeholder="Введите текст лекции или вставьте структурированный материал."
        />
      </div>
    );
  }

  if (state.type === 'TEST') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Проходной балл (необязательно)</p>
          <Input
            type="number"
            min={0}
            value={state.passingScore}
            onChange={(event) => update('passingScore', event.target.value)}
            placeholder="например, 70"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Макс. попыток (необязательно)</p>
          <Input
            type="number"
            min={1}
            value={state.maxAttempts}
            onChange={(event) => update('maxAttempts', event.target.value)}
            placeholder="Без ограничений"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Лимит времени, мин (необязательно)</p>
          <Input
            type="number"
            min={1}
            value={state.timeLimitMinutes}
            onChange={(event) => update('timeLimitMinutes', event.target.value)}
            placeholder="Без лимита"
          />
        </div>
        <label className="flex items-center gap-2 pt-6 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={state.allowMultipleAttempts}
            onChange={(event) => update('allowMultipleAttempts', event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
          />
          Разрешить несколько попыток
        </label>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs font-medium text-gray-500">Ссылка на встречу</p>
        <Input
          value={state.webinarMeetingLink}
          onChange={(event) => update('webinarMeetingLink', event.target.value)}
          placeholder="https://meet.example.com/..."
        />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">Дата и время</p>
        <Input
          type="datetime-local"
          value={state.webinarScheduledAt}
          onChange={(event) => update('webinarScheduledAt', event.target.value)}
        />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">Длительность, мин (необязательно)</p>
        <Input
          type="number"
          min={1}
          value={state.webinarDurationMinutes}
          onChange={(event) => update('webinarDurationMinutes', event.target.value)}
          placeholder="например, 90"
        />
      </div>
    </div>
  );
}

function lessonTypeTone(type: LessonType) {
  if (type === 'TEST') return 'warning';
  if (type === 'WEBINAR') return 'accent';
  return 'neutral';
}

function lessonTypeLabel(type: LessonType) {
  if (type === 'TEST') return 'Тест';
  if (type === 'WEBINAR') return 'Вебинар';
  return 'Лекция';
}

function toEditorState(lesson: Lesson): LessonEditorState {
  return {
    lessonId: lesson.id,
    type: lesson.type,
    title: lesson.title,
    description: lesson.description ?? '',
    orderIndex: String(lesson.orderIndex),
    isPublished: lesson.isPublished,
    lectureContent: extractLectureText(lesson.lecture?.content ?? null),
    passingScore:
      lesson.test?.passingScore === null || lesson.test?.passingScore === undefined
        ? ''
        : String(lesson.test.passingScore),
    allowMultipleAttempts: lesson.test?.allowMultipleAttempts ?? true,
    maxAttempts:
      lesson.test?.maxAttempts === null || lesson.test?.maxAttempts === undefined
        ? ''
        : String(lesson.test.maxAttempts),
    timeLimitMinutes:
      lesson.test?.timeLimitMinutes === null || lesson.test?.timeLimitMinutes === undefined
        ? ''
        : String(lesson.test.timeLimitMinutes),
    webinarMeetingLink: lesson.webinar?.meetingLink ?? '',
    webinarScheduledAt: toDateTimeLocalValue(lesson.webinar?.scheduledAt ?? null),
    webinarDurationMinutes:
      lesson.webinar?.durationMinutes === null || lesson.webinar?.durationMinutes === undefined
        ? ''
        : String(lesson.webinar.durationMinutes),
  };
}

function buildCreatePayload(moduleId: string, state: LessonEditorState): CreateLessonPayload {
  const payload: CreateLessonPayload = {
    moduleId,
    type: state.type,
    title: state.title.trim(),
    description: state.description.trim() || undefined,
    isPublished: state.isPublished,
    orderIndex: toOptionalInt(state.orderIndex),
  };

  const lecture = buildLecturePayload(state);
  const test = buildTestPayload(state);
  const webinar = buildWebinarPayload(state);

  if (lecture) payload.lecture = lecture;
  if (test) payload.test = test;
  if (webinar) payload.webinar = webinar;

  return payload;
}

function buildUpdatePayload(state: LessonEditorState): UpdateLessonPayload {
  const payload: UpdateLessonPayload = {
    type: state.type,
    title: state.title.trim(),
    description: state.description.trim() || undefined,
    isPublished: state.isPublished,
    orderIndex: toOptionalInt(state.orderIndex),
  };

  const lecture = buildLecturePayload(state);
  const test = buildTestPayload(state);
  const webinar = buildWebinarPayload(state);

  if (lecture) payload.lecture = lecture;
  if (test) payload.test = test;
  if (webinar) payload.webinar = webinar;

  return payload;
}

function buildLecturePayload(state: LessonEditorState): LessonLecturePayload | undefined {
  if (state.type !== 'LECTURE') return undefined;

  const text = state.lectureContent.trim();
  return {
    content: {
      rawText: text,
      blocks: text
        ? [
            {
              type: 'paragraph',
              text,
            },
          ]
        : [],
    },
  };
}

function buildTestPayload(state: LessonEditorState): LessonTestPayload | undefined {
  if (state.type !== 'TEST') return undefined;

  return {
    passingScore: toOptionalInt(state.passingScore),
    allowMultipleAttempts: state.allowMultipleAttempts,
    maxAttempts: toOptionalInt(state.maxAttempts),
    timeLimitMinutes: toOptionalInt(state.timeLimitMinutes),
  };
}

function buildWebinarPayload(state: LessonEditorState): LessonWebinarPayload | undefined {
  if (state.type !== 'WEBINAR') return undefined;

  const meetingLink = state.webinarMeetingLink.trim();
  const scheduledAt = toIsoDateTime(state.webinarScheduledAt);
  if (!meetingLink || !scheduledAt) return undefined;

  return {
    meetingLink,
    scheduledAt,
    durationMinutes: toOptionalInt(state.webinarDurationMinutes),
  };
}

function toOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;

  return Math.trunc(parsed);
}

function toIsoDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function extractLectureText(content: Record<string, unknown> | null): string {
  if (!content) return '';

  const rawText = content.rawText;
  if (typeof rawText === 'string') {
    return rawText;
  }

  const blocks = content.blocks;
  if (Array.isArray(blocks)) {
    const blockTexts = blocks
      .map((item) => {
        if (!item || typeof item !== 'object') return '';
        const text = (item as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .filter(Boolean);

    if (blockTexts.length > 0) {
      return blockTexts.join('\n');
    }
  }

  return '';
}

function lessonMeta(lesson: Lesson): string {
  if (lesson.type === 'LECTURE') {
    const preview = extractLectureText(lesson.lecture?.content ?? null).trim();
    if (!preview) {
      return 'Содержимое лекции еще не заполнено';
    }

    if (preview.length <= 80) {
      return `Превью лекции: ${preview}`;
    }

    return `Превью лекции: ${preview.slice(0, 80)}...`;
  }

  if (lesson.type === 'TEST') {
    const score =
      lesson.test?.passingScore === null || lesson.test?.passingScore === undefined
        ? 'не задан'
        : String(lesson.test.passingScore);
    const maxAttempts =
      lesson.test?.maxAttempts === null || lesson.test?.maxAttempts === undefined
        ? 'без ограничений'
        : String(lesson.test.maxAttempts);

    return `Настройки теста: проходной балл ${score}, попыток ${maxAttempts}`;
  }

  const scheduled = lesson.webinar?.scheduledAt
    ? formatDateTime(lesson.webinar.scheduledAt)
    : 'не запланирован';
  return `Расписание вебинара: ${scheduled}`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'не запланирован';
  return parsed.toLocaleString();
}

function buildExportFileName(lesson: Lesson) {
  const normalizedTitle = lesson.title
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const titlePart = normalizedTitle || `lesson-${lesson.orderIndex}`;
  const typePart = lesson.type.toLowerCase();
  return `${typePart}-${titlePart}.json`;
}

function downloadJsonFile(fileName: string, payload: unknown) {
  const serialized = JSON.stringify(payload, null, 2);
  const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function looksLikeLessonTransferPayload(value: unknown): value is LessonTransferPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  const format = payload.format;
  const version = payload.version;
  const lessonType = payload.lessonType;
  const lesson = payload.lesson;

  if (format !== 'zskills.lesson' || version !== 1) {
    return false;
  }
  if (lessonType !== 'lecture' && lessonType !== 'test') {
    return false;
  }
  if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
    return false;
  }

  if (lessonType === 'lecture') {
    return Boolean(
      payload.lecture &&
        typeof payload.lecture === 'object' &&
        !Array.isArray(payload.lecture),
    );
  }

  return Boolean(
    payload.test &&
      typeof payload.test === 'object' &&
      !Array.isArray(payload.test),
  );
}

