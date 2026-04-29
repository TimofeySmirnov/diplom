'use client';

import {
  Copy,
  KeyRound,
  Link as LinkIcon,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  enrollmentsApi,
  invitationsApi,
  type TeacherStudentSearchResult,
} from '@/lib/api';
import { CourseEnrollment, CourseInvitation } from '@/types/domain';

type CourseAccessManagerProps = {
  courseId: string;
  accessToken: string | null;
};

type CreateStudentForm = {
  fullName: string;
  email: string;
  password: string;
  group: string;
};

type SearchStudentForm = {
  fullName: string;
  group: string;
};

type CreatedCredentials = {
  fullName: string;
  email: string;
  password: string;
  group?: string | null;
};

const DEFAULT_CREATE_STUDENT_FORM: CreateStudentForm = {
  fullName: '',
  email: '',
  password: '',
  group: '',
};

const DEFAULT_SEARCH_STUDENT_FORM: SearchStudentForm = {
  fullName: '',
  group: '',
};

export function CourseAccessManager({ courseId, accessToken }: CourseAccessManagerProps) {
  const [invitations, setInvitations] = useState<CourseInvitation[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [attachingStudentId, setAttachingStudentId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createStudentForm, setCreateStudentForm] =
    useState<CreateStudentForm>(DEFAULT_CREATE_STUDENT_FORM);
  const [searchStudentForm, setSearchStudentForm] =
    useState<SearchStudentForm>(DEFAULT_SEARCH_STUDENT_FORM);
  const [searchResults, setSearchResults] = useState<TeacherStudentSearchResult[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);

  const canCreateStudent = useMemo(() => {
    return (
      createStudentForm.fullName.trim().length >= 2 &&
      createStudentForm.email.trim().length > 4 &&
      createStudentForm.password.length >= 6
    );
  }, [createStudentForm]);

  const upsertEnrollment = useCallback((next: CourseEnrollment) => {
    setEnrollments((prev) => {
      const withoutSame = prev.filter((item) => item.id !== next.id);
      return [next, ...withoutSame];
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const [nextInvitations, nextEnrollments] = await Promise.all([
        invitationsApi.listByCourse(accessToken, courseId),
        enrollmentsApi.listByCourse(accessToken, courseId),
      ]);

      setInvitations(nextInvitations);
      setEnrollments(nextEnrollments);

      const activeStudentIds = new Set(nextEnrollments.map((enrollment) => enrollment.studentId));
      setSearchResults((prev) =>
        prev.map((student) => ({
          ...student,
          isEnrolled: activeStudentIds.has(student.id),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные по доступу');
    } finally {
      setLoading(false);
    }
  }, [accessToken, courseId]);

  useEffect(() => {
    if (!accessToken) return;
    void loadData();
  }, [accessToken, loadData]);

  const invitationBase = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const buildInviteLink = (token: string) =>
    invitationBase ? `${invitationBase}/join/${token}` : `/join/${token}`;

  const generateTemporaryPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let value = '';
    for (let i = 0; i < 10; i += 1) {
      value += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    setCreateStudentForm((prev) => ({ ...prev, password: value }));
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(successMessage);
      setError(null);
    } catch {
      setError('Не удалось скопировать в буфер обмена.');
    }
  };

  const copyInviteLink = async (token: string) => {
    await copyText(buildInviteLink(token), 'Ссылка приглашения скопирована.');
  };

  const copyCredentials = async () => {
    if (!createdCredentials) return;

    const credentialsText = [
      `Логин: ${createdCredentials.email}`,
      `Пароль: ${createdCredentials.password}`,
      `Студент: ${createdCredentials.fullName}`,
      `Группа: ${createdCredentials.group?.trim() || 'не указана'}`,
    ].join('\n');

    await copyText(credentialsText, 'Учётные данные скопированы.');
  };

  const searchStudents = async () => {
    if (!accessToken) return;

    setSearchingStudents(true);
    setError(null);
    setNotice(null);

    try {
      const results = await enrollmentsApi.searchCourseStudents(accessToken, courseId, {
        fullName: searchStudentForm.fullName,
        group: searchStudentForm.group,
        limit: 25,
      });

      setSearchResults(results);
      setSearchPerformed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить поиск студентов');
      setSearchPerformed(true);
    } finally {
      setSearchingStudents(false);
    }
  };

  const enrollExistingStudent = async (student: TeacherStudentSearchResult) => {
    if (!accessToken || student.isEnrolled) return;

    setAttachingStudentId(student.id);
    setError(null);
    setNotice(null);

    try {
      const enrollment = await enrollmentsApi.enrollExistingStudentForCourse(
        accessToken,
        courseId,
        student.id,
      );

      upsertEnrollment(enrollment);
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === student.id
            ? {
                ...item,
                isEnrolled: true,
              }
            : item,
        ),
      );
      setNotice(`Студент ${student.fullName} зачислен в курс.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зачислить студента');
    } finally {
      setAttachingStudentId(null);
    }
  };

  const createStudent = async () => {
    if (!accessToken || !canCreateStudent) return;

    setCreatingStudent(true);
    setError(null);
    setNotice(null);

    try {
      const response = await enrollmentsApi.createStudentForCourse(accessToken, courseId, {
        fullName: createStudentForm.fullName.trim(),
        email: createStudentForm.email.trim(),
        password: createStudentForm.password,
        group: createStudentForm.group.trim() || undefined,
      });

      upsertEnrollment(response.enrollment);
      setCreatedCredentials({
        fullName: response.student.fullName,
        email: response.credentials.email,
        password: response.credentials.password,
        group: response.student.group ?? null,
      });
      setCreateStudentForm(DEFAULT_CREATE_STUDENT_FORM);
      setNotice('Студент создан и зачислен на курс.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать студента');
    } finally {
      setCreatingStudent(false);
    }
  };

  const createInvitation = async () => {
    if (!accessToken) return;

    setGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const created = await invitationsApi.create(accessToken, courseId);
      setInvitations((prev) => [created, ...prev]);
      setNotice('Ссылка приглашения создана.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать приглашение');
    } finally {
      setGenerating(false);
    }
  };

  const deactivateInvitation = async (invitationId: string) => {
    if (!accessToken) return;

    setBusyId(invitationId);
    setError(null);
    setNotice(null);

    try {
      const updated = await invitationsApi.deactivate(accessToken, invitationId);
      setInvitations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setNotice('Приглашение деактивировано.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось деактивировать приглашение');
    } finally {
      setBusyId(null);
    }
  };

  const removeStudent = async (enrollment: CourseEnrollment) => {
    if (!accessToken) return;

    const studentName = enrollment.student?.fullName ?? 'студента';
    const confirmed = window.confirm(`Удалить ${studentName} из курса?`);
    if (!confirmed) return;

    setBusyId(enrollment.id);
    setError(null);
    setNotice(null);

    try {
      await enrollmentsApi.remove(accessToken, enrollment.id);
      setEnrollments((prev) => prev.filter((item) => item.id !== enrollment.id));
      setSearchResults((prev) =>
        prev.map((item) =>
          item.id === enrollment.studentId
            ? {
                ...item,
                isEnrolled: false,
              }
            : item,
        ),
      );
      setNotice('Студент удалён из курса.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить студента');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid gap-6">
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-700">Ручное зачисление в курс</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Найдите существующего студента по имени или группе и зачислите в этот курс.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Input
              value={searchStudentForm.fullName}
              onChange={(event) =>
                setSearchStudentForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              placeholder="Поиск по ФИО"
            />
            <Input
              value={searchStudentForm.group}
              onChange={(event) =>
                setSearchStudentForm((prev) => ({ ...prev, group: event.target.value }))
              }
              maxLength={64}
              placeholder="Поиск по группе"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void searchStudents()} disabled={searchingStudents || loading}>
              {searchingStudents ? 'Поиск...' : 'Найти студентов'}
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            {searchingStudents ? (
              <div className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
            ) : null}

            {!searchingStudents && searchPerformed && searchResults.length === 0 ? (
              <p className="text-sm text-gray-500">По вашему запросу студенты не найдены.</p>
            ) : null}

            {!searchingStudents && searchResults.length > 0
              ? searchResults.map((student) => (
                  <div
                    key={student.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{student.fullName}</p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                        <p className="text-xs text-gray-500">
                          Группа: {student.group?.trim() || 'не указана'}
                        </p>
                      </div>

                      {student.isEnrolled ? (
                        <Badge tone="success">Уже в курсе</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => void enrollExistingStudent(student)}
                          disabled={attachingStudentId === student.id}
                        >
                          {attachingStudentId === student.id ? 'Зачисление...' : 'Зачислить'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              : null}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-700">Создание нового студента</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Если студента ещё нет в системе, создайте ему аккаунт и сразу зачислите в курс.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Input
              value={createStudentForm.fullName}
              onChange={(event) =>
                setCreateStudentForm((prev) => ({ ...prev, fullName: event.target.value }))
              }
              placeholder="ФИО"
            />
            <Input
              type="email"
              value={createStudentForm.email}
              onChange={(event) =>
                setCreateStudentForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email / логин"
            />
            <Input
              value={createStudentForm.group}
              onChange={(event) =>
                setCreateStudentForm((prev) => ({ ...prev, group: event.target.value }))
              }
              maxLength={64}
              placeholder="Группа (например, ИС-21)"
            />
            <div className="flex gap-2">
              <Input
                type="text"
                value={createStudentForm.password}
                onChange={(event) =>
                  setCreateStudentForm((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Пароль"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={generateTemporaryPassword}
                className="shrink-0"
              >
                <KeyRound size={18} className="mr-1 text-gray-500" />
                Генерировать
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void createStudent()} disabled={!canCreateStudent || creatingStudent}>
              {creatingStudent ? 'Создание...' : 'Создать и зачислить'}
            </Button>
          </div>

          {createdCredentials ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-emerald-700">Учётные данные студента</p>
                <Button type="button" size="sm" variant="secondary" onClick={copyCredentials}>
                  <Copy size={18} className="mr-1 text-gray-500" />
                  Копировать
                </Button>
              </div>
              <p className="mt-2 text-sm text-gray-700">Студент: {createdCredentials.fullName}</p>
              <p className="text-sm text-gray-700">Логин: {createdCredentials.email}</p>
              <p className="text-sm text-gray-700">Пароль: {createdCredentials.password}</p>
              <p className="text-sm text-gray-700">
                Группа: {createdCredentials.group?.trim() || 'не указана'}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LinkIcon size={18} className="text-emerald-500" />
              <h3 className="text-lg font-semibold text-gray-700">Ссылки приглашения</h3>
            </div>
            <Button onClick={() => void createInvitation()} disabled={generating || loading}>
              {generating ? 'Создание...' : 'Создать ссылку'}
            </Button>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Приглашения доступны как дополнительный способ доступа для уже существующих аккаунтов.
          </p>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
            ) : invitations.length === 0 ? (
              <p className="text-sm text-gray-500">Пока нет приглашений для этого курса.</p>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={invitation.isActive ? 'success' : 'warning'}>
                        {invitation.isActive ? 'Активно' : 'Неактивно'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Создано: {formatDateTime(invitation.createdAt)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Использовано: {invitation.usesCount}
                      {invitation.maxUses ? ` / ${invitation.maxUses}` : ''}
                    </span>
                  </div>

                  <p className="mt-2 truncate text-sm text-gray-700">{buildInviteLink(invitation.token)}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void copyInviteLink(invitation.token)}
                    >
                      <Copy size={18} className="mr-1 text-gray-500" />
                      Копировать
                    </Button>
                    {invitation.isActive ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void deactivateInvitation(invitation.id)}
                        disabled={busyId === invitation.id}
                      >
                        Деактивировать
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-gray-700">Зачисленные студенты</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Список текущих участников курса с возможностью удаления.
        </p>

        <div className="mt-4 grid gap-3">
          {loading ? (
            <div className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-gray-500">Пока нет зачисленных студентов.</p>
          ) : (
            enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {enrollment.student?.fullName ?? 'Студент'}
                    </p>
                    <p className="text-xs text-gray-500">{enrollment.student?.email ?? 'Email не указан'}</p>
                    <p className="text-xs text-gray-500">
                      Группа: {enrollment.student?.group?.trim() || 'не указана'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Зачислен: {formatDateTime(enrollment.enrolledAt)}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void removeStudent(enrollment)}
                    disabled={busyId === enrollment.id}
                  >
                    <Trash2 size={18} className="mr-1 text-gray-500" />
                    Удалить
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {error ? <p className="text-sm text-red-500 lg:col-span-2">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-500 lg:col-span-2">{notice}</p> : null}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'нет данных';
  return date.toLocaleString('ru-RU');
}
