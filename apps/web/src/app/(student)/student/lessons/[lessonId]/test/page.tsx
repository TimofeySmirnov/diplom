'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { StudentTestPayload, testsApi } from '@/lib/api';

type StudentTestPageProps = {
  params: { lessonId: string };
};

type QuestionAnswerState = {
  optionIds: string[];
  textAnswer: string;
  matchingPairs: Array<{
    leftId: string;
    rightId: string;
  }>;
  orderingItemIds: string[];
};

type AnswersState = Record<string, QuestionAnswerState>;

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
        initialAnswers[question.id] = {
          optionIds: [],
          textAnswer: '',
          matchingPairs:
            question.matchingLeftItems?.map((item) => ({
              leftId: item.id,
              rightId: '',
            })) ?? [],
          orderingItemIds: question.orderingItems?.map((item) => item.id) ?? [],
        };
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
      [questionId]: {
        ...prev[questionId],
        optionIds: [optionId],
      },
    }));
  };

  const toggleMultipleOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.optionIds ?? [];
      const exists = current.includes(optionId);

      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          optionIds: exists ? current.filter((id) => id !== optionId) : [...current, optionId],
        },
      };
    });
  };

  const setTextAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        textAnswer: value,
      },
    }));
  };

  const setMatchingAnswer = (questionId: string, leftId: string, rightId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        matchingPairs: (prev[questionId]?.matchingPairs ?? []).map((pair) =>
          pair.leftId === leftId ? { ...pair, rightId } : pair,
        ),
      },
    }));
  };

  const moveOrderingItem = (questionId: string, itemId: string, direction: 'up' | 'down') => {
    setAnswers((prev) => {
      const current = prev[questionId]?.orderingItemIds ?? [];
      const index = current.findIndex((id) => id === itemId);
      if (index === -1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return prev;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          orderingItemIds: next,
        },
      };
    });
  };

  const submitAttempt = async () => {
    if (!accessToken || !testData || !attemptId) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        answers: testData.questions.map((question) => {
          const answer = answers[question.id];

          if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
            return {
              questionId: question.id,
              optionIds: answer?.optionIds ?? [],
            };
          }

          if (question.type === 'FREE_TEXT') {
            return {
              questionId: question.id,
              textAnswer: answer?.textAnswer ?? '',
            };
          }

          if (question.type === 'MATCHING') {
            return {
              questionId: question.id,
              matchingPairs: (answer?.matchingPairs ?? [])
                .filter((pair) => pair.rightId)
                .map((pair) => ({
                  leftId: pair.leftId,
                  rightId: pair.rightId,
                })),
            };
          }

          return {
            questionId: question.id,
            orderingItemIds: answer?.orderingItemIds ?? [],
          };
        }),
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
              <Button variant="secondary" size="sm">
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
                Ответьте на вопросы и отправьте тест для получения результата.
              </p>

              <div className="mt-4 grid gap-4">
                {testData.questions.map((question, index) => (
                  <div key={question.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-700">
                        {index + 1}. {question.text}
                      </p>
                      <Badge tone="neutral">{typeLabel(question.type)}</Badge>
                      <Badge tone="accent">{question.points} балл.</Badge>
                    </div>

                    {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') ? (
                      <div className="mt-3 grid gap-2">
                        {question.options.map((option) => {
                          const selected = (answers[question.id]?.optionIds ?? []).includes(option.id);

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
                    ) : null}

                    {question.type === 'FREE_TEXT' ? (
                      <div className="mt-3">
                        <Textarea
                          rows={3}
                          value={answers[question.id]?.textAnswer ?? ''}
                          onChange={(event) => setTextAnswer(question.id, event.target.value)}
                          placeholder="Введите ответ"
                        />
                      </div>
                    ) : null}

                    {question.type === 'MATCHING' ? (
                      <div className="mt-3 grid gap-2">
                        {(question.matchingLeftItems ?? []).map((leftItem) => (
                          <div
                            key={leftItem.id}
                            className="grid gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:grid-cols-[1fr_auto_1fr]"
                          >
                            <div className="flex items-center text-sm text-gray-700">{leftItem.text}</div>
                            <div className="flex items-center justify-center text-gray-500">→</div>
                            <select
                              value={
                                answers[question.id]?.matchingPairs.find(
                                  (pair) => pair.leftId === leftItem.id,
                                )?.rightId ?? ''
                              }
                              onChange={(event) =>
                                setMatchingAnswer(question.id, leftItem.id, event.target.value)
                              }
                              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            >
                              <option value="">Выберите соответствие</option>
                              {(question.matchingRightItems ?? []).map((rightItem) => (
                                <option key={rightItem.id} value={rightItem.id}>
                                  {rightItem.text}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {question.type === 'ORDERING' ? (
                      <div className="mt-3 grid gap-2">
                        {(answers[question.id]?.orderingItemIds ?? []).map((itemId, itemIndex) => {
                          const item = question.orderingItems?.find((entry) => entry.id === itemId);
                          if (!item) return null;

                          return (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
                            >
                              <span className="w-5 text-sm text-gray-500">{itemIndex + 1}.</span>
                              <span className="flex-1 text-sm text-gray-700">{item.text}</span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => moveOrderingItem(question.id, item.id, 'up')}
                                disabled={itemIndex === 0}
                              >
                                Вверх
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => moveOrderingItem(question.id, item.id, 'down')}
                                disabled={
                                  itemIndex ===
                                  (answers[question.id]?.orderingItemIds.length ?? 0) - 1
                                }
                              >
                                Вниз
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
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

function typeLabel(type: StudentTestPayload['questions'][number]['type']) {
  if (type === 'SINGLE_CHOICE') return 'Один вариант';
  if (type === 'MULTIPLE_CHOICE') return 'Несколько вариантов';
  if (type === 'FREE_TEXT') return 'Свободный ответ';
  if (type === 'MATCHING') return 'Сопоставление';
  return 'Порядок';
}

function LoadingBlock() {
  return <div className="h-[380px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
