'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/hooks/use-auth';
import { StudentTestPayload, testsApi } from '@/lib/api';

type StudentTestPageProps = {
  params: { lessonId: string };
};

type AnswersState = Record<string, string[]>;

export default function StudentTestPage({ params }: StudentTestPageProps) {
  const router = useRouter();
  const { accessToken, hydrated } = useAuth();

  const [testData, setTestData] = useState<StudentTestPayload | null>(null);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTest = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await testsApi.getStudentTest(accessToken, params.lessonId);
      setTestData(data);

      const inProgress = data.attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
      setAttemptId(inProgress?.id ?? null);

      const initialAnswers: AnswersState = {};
      data.questions.forEach((question) => {
        initialAnswers[question.id] = [];
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить тест');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.lessonId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadTest();
  }, [hydrated, accessToken, loadTest]);

  const submittedAttempts = useMemo(
    () => testData?.attempts.filter((attempt) => attempt.status === 'SUBMITTED') ?? [],
    [testData],
  );

  const canStartAttempt = useMemo(() => {
    if (!testData) return false;
    if (attemptId) return false;

    if (!testData.settings.allowMultipleAttempts && submittedAttempts.length > 0) {
      return false;
    }

    if (
      testData.settings.maxAttempts !== null &&
      testData.settings.maxAttempts !== undefined &&
      testData.attempts.length >= testData.settings.maxAttempts
    ) {
      return false;
    }

    return true;
  }, [testData, attemptId, submittedAttempts.length]);

  const startAttempt = async () => {
    if (!accessToken || !testData) return;

    setStarting(true);
    setError(null);

    try {
      const attempt = await testsApi.startAttempt(accessToken, testData.lesson.id);
      setAttemptId(attempt.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось начать попытку');
    } finally {
      setStarting(false);
    }
  };

  const selectSingleOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: [optionId],
    }));
  };

  const toggleMultipleOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? [];
      const exists = current.includes(optionId);

      return {
        ...prev,
        [questionId]: exists ? current.filter((id) => id !== optionId) : [...current, optionId],
      };
    });
  };

  const submitAttempt = async () => {
    if (!accessToken || !testData || !attemptId) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        answers: testData.questions.map((question) => ({
          questionId: question.id,
          optionIds: answers[question.id] ?? [],
        })),
      };

      const submitted = await testsApi.submitAttempt(accessToken, attemptId, payload);
      router.push(`/student/lessons/${testData.lesson.id}/test/result/${submitted.attempt.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить тест');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title={testData?.lesson.title ?? 'Тест'}
        description={
          testData
            ? `${testData.lesson.module.courseTitle} | ${testData.lesson.module.title}`
            : 'Пройдите тест и получите результат сразу'
        }
        actions={
          testData ? (
            <Link href={`/student/courses/${testData.lesson.module.courseId}`}>
              <Button variant="ghost" size="sm">
                Назад к курсу
              </Button>
            </Link>
          ) : null
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось открыть тест"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadTest()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && testData ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">Тест</Badge>
              <Badge tone="accent">{testData.questions.length} вопросов</Badge>
              {testData.settings.timeLimitMinutes ? (
                <Badge tone="neutral">{testData.settings.timeLimitMinutes} мин</Badge>
              ) : null}
            </div>
            {testData.lesson.description ? (
              <p className="mt-3 text-sm text-gray-500">{testData.lesson.description}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {!attemptId ? (
                <Button onClick={() => void startAttempt()} disabled={!canStartAttempt || starting}>
                  {starting ? 'Запуск...' : 'Начать тест'}
                </Button>
              ) : (
                <Badge tone="warning">Попытка в процессе</Badge>
              )}
            </div>
          </Card>

          {attemptId ? (
            <Card>
              <h2 className="text-lg font-semibold text-gray-700">Вопросы</h2>
              <p className="mt-1 text-sm text-gray-500">
                Выберите ответы и отправьте тест для получения результата.
              </p>

              <div className="mt-4 grid gap-4">
                {testData.questions.map((question, index) => (
                  <div key={question.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-700">
                        {index + 1}. {question.text}
                      </p>
                      <Badge tone="neutral">
                        {question.type === 'SINGLE_CHOICE' ? 'Один вариант' : 'Несколько вариантов'}
                      </Badge>
                      <Badge tone="accent">{question.points} балл.</Badge>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {question.options.map((option) => {
                        const selected = (answers[question.id] ?? []).includes(option.id);

                        return (
                          <label
                            key={option.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
                          >
                            {question.type === 'SINGLE_CHOICE' ? (
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                checked={selected}
                                onChange={() => selectSingleOption(question.id, option.id)}
                                className="h-4 w-4 text-emerald-500"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleMultipleOption(question.id, option.id)}
                                className="h-4 w-4 rounded border-gray-200 text-emerald-500"
                              />
                            )}
                            <span>{option.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <Button onClick={() => void submitAttempt()} disabled={submitting}>
                  {submitting ? 'Отправка...' : 'Отправить тест'}
                </Button>
              </div>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Предыдущие попытки</h2>
            <div className="mt-3 grid gap-2">
              {submittedAttempts.length === 0 ? (
                <p className="text-sm text-gray-500">Пока нет отправленных попыток.</p>
              ) : (
                submittedAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="text-sm text-gray-700">
                      Попытка №{attempt.attemptNumber} | Результат {attempt.score ?? 0}/
                      {attempt.maxScore ?? 0} ({attempt.scorePercent ?? 0}%)
                    </div>
                    <Link href={`/student/lessons/${testData.lesson.id}/test/result/${attempt.id}`}>
                      <Button size="sm" variant="secondary">
                        Смотреть результат
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[380px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
