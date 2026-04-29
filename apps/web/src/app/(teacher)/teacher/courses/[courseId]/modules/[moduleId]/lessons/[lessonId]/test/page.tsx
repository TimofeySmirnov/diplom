'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { testsApi, TeacherTestContent, TestQuestionType } from '@/lib/api';

type TeacherTestBuilderPageProps = {
  params: {
    courseId: string;
    moduleId: string;
    lessonId: string;
  };
};

type OptionForm = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type MatchingPairForm = {
  leftId: string;
  rightId: string;
  left: string;
  right: string;
};

type OrderingItemForm = {
  id: string;
  text: string;
};

type QuestionForm = {
  id: string;
  text: string;
  explanation: string;
  type: TestQuestionType;
  points: string;
  options: OptionForm[];
  acceptedAnswers: string[];
  matchingPairs: MatchingPairForm[];
  orderingItems: OrderingItemForm[];
};

export default function TeacherTestBuilderPage({ params }: TeacherTestBuilderPageProps) {
  const { accessToken, hydrated } = useAuth();

  const [content, setContent] = useState<TeacherTestContent | null>(null);
  const [passingScore, setPassingScore] = useState('');
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [questions, setQuestions] = useState<QuestionForm[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrateFromContent = (nextContent: TeacherTestContent) => {
    setContent(nextContent);
    setPassingScore(
      nextContent.passingScore === null || nextContent.passingScore === undefined
        ? ''
        : String(nextContent.passingScore),
    );
    setAllowMultipleAttempts(nextContent.allowMultipleAttempts);
    setMaxAttempts(
      nextContent.maxAttempts === null || nextContent.maxAttempts === undefined
        ? ''
        : String(nextContent.maxAttempts),
    );
    setTimeLimitMinutes(
      nextContent.timeLimitMinutes === null || nextContent.timeLimitMinutes === undefined
        ? ''
        : String(nextContent.timeLimitMinutes),
    );
    setQuestions(
      nextContent.questions.map((question) => ({
        id: question.id,
        text: question.text,
        explanation: question.explanation ?? '',
        type: question.type,
        points: String(question.points),
        options:
          question.options.length > 0
            ? question.options.map((option) => ({
                id: option.id,
                text: option.text,
                isCorrect: option.isCorrect,
              }))
            : defaultOptions(),
        acceptedAnswers:
          question.acceptedAnswers.length > 0 ? question.acceptedAnswers : [''],
        matchingPairs:
          question.matchingPairs.length > 0
            ? question.matchingPairs.map((pair) => ({
                leftId: pair.leftId,
                rightId: pair.rightId,
                left: pair.left,
                right: pair.right,
              }))
            : [createMatchingPair(), createMatchingPair()],
        orderingItems:
          question.orderingItems.length > 0
            ? question.orderingItems.map((item) => ({
                id: item.id,
                text: item.text,
              }))
            : [createOrderingItem(), createOrderingItem()],
      })),
    );
  };

  const loadContent = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const data = await testsApi.getTeacherTestContent(accessToken, params.lessonId);
      hydrateFromContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить содержимое теста');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.lessonId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadContent();
  }, [hydrated, accessToken, loadContent]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createEmptyQuestion()]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((question) => question.id !== questionId));
  };

  const updateQuestion = (questionId: string, patch: Partial<QuestionForm>) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          ...patch,
        };
      }),
    );
  };

  const setQuestionType = (questionId: string, type: TestQuestionType) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        if (type === 'SINGLE_CHOICE') {
          const options = question.options.length >= 2 ? question.options : defaultOptions();
          const firstCorrectOptionId =
            options.find((option) => option.isCorrect)?.id ?? options[0].id;
          return {
            ...question,
            type,
            options: options.map((option) => ({
              ...option,
              isCorrect: option.id === firstCorrectOptionId,
            })),
          };
        }

        if (type === 'MULTIPLE_CHOICE') {
          const options = question.options.length >= 2 ? question.options : defaultOptions();
          const correctCount = options.filter((option) => option.isCorrect).length;
          if (correctCount >= 2) {
            return { ...question, type, options };
          }
          return {
            ...question,
            type,
            options: options.map((option, index) => ({
              ...option,
              isCorrect: index < 2,
            })),
          };
        }

        if (type === 'FREE_TEXT') {
          return {
            ...question,
            type,
            acceptedAnswers: question.acceptedAnswers.length > 0 ? question.acceptedAnswers : [''],
          };
        }

        if (type === 'MATCHING') {
          return {
            ...question,
            type,
            matchingPairs:
              question.matchingPairs.length >= 2
                ? question.matchingPairs
                : [createMatchingPair(), createMatchingPair()],
          };
        }

        return {
          ...question,
          type,
          orderingItems:
            question.orderingItems.length >= 2
              ? question.orderingItems
              : [createOrderingItem(), createOrderingItem()],
        };
      }),
    );
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          options: [
            ...question.options,
            {
              id: generateLocalId(),
              text: '',
              isCorrect: false,
            },
          ],
        };
      }),
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        const nextOptions = question.options.filter((option) => option.id !== optionId);

        if (
          question.type === 'SINGLE_CHOICE' &&
          nextOptions.length > 0 &&
          nextOptions.every((option) => !option.isCorrect)
        ) {
          nextOptions[0] = { ...nextOptions[0], isCorrect: true };
        }

        return {
          ...question,
          options: nextOptions,
        };
      }),
    );
  };

  const updateOption = (questionId: string, optionId: string, patch: Partial<OptionForm>) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId ? { ...option, ...patch } : option,
          ),
        };
      }),
    );
  };

  const toggleOptionCorrect = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        if (question.type === 'SINGLE_CHOICE') {
          return {
            ...question,
            options: question.options.map((option) => ({
              ...option,
              isCorrect: option.id === optionId,
            })),
          };
        }

        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId
              ? {
                  ...option,
                  isCorrect: !option.isCorrect,
                }
              : option,
          ),
        };
      }),
    );
  };

  const addAcceptedAnswer = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, acceptedAnswers: [...question.acceptedAnswers, ''] }
          : question,
      ),
    );
  };

  const updateAcceptedAnswer = (
    questionId: string,
    answerIndex: number,
    value: string,
  ) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          acceptedAnswers: question.acceptedAnswers.map((answer, index) =>
            index === answerIndex ? value : answer,
          ),
        };
      }),
    );
  };

  const removeAcceptedAnswer = (questionId: string, answerIndex: number) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        const next = question.acceptedAnswers.filter((_, index) => index !== answerIndex);
        return {
          ...question,
          acceptedAnswers: next.length > 0 ? next : [''],
        };
      }),
    );
  };

  const addMatchingPair = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, matchingPairs: [...question.matchingPairs, createMatchingPair()] }
          : question,
      ),
    );
  };

  const updateMatchingPair = (
    questionId: string,
    pairLeftId: string,
    patch: Partial<MatchingPairForm>,
  ) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          matchingPairs: question.matchingPairs.map((pair) =>
            pair.leftId === pairLeftId ? { ...pair, ...patch } : pair,
          ),
        };
      }),
    );
  };

  const removeMatchingPair = (questionId: string, pairLeftId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        const next = question.matchingPairs.filter((pair) => pair.leftId !== pairLeftId);
        return {
          ...question,
          matchingPairs: next.length >= 2 ? next : [createMatchingPair(), createMatchingPair()],
        };
      }),
    );
  };

  const addOrderingItem = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, orderingItems: [...question.orderingItems, createOrderingItem()] }
          : question,
      ),
    );
  };

  const updateOrderingItem = (questionId: string, itemId: string, value: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        return {
          ...question,
          orderingItems: question.orderingItems.map((item) =>
            item.id === itemId ? { ...item, text: value } : item,
          ),
        };
      }),
    );
  };

  const removeOrderingItem = (questionId: string, itemId: string) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        const next = question.orderingItems.filter((item) => item.id !== itemId);
        return {
          ...question,
          orderingItems: next.length >= 2 ? next : [createOrderingItem(), createOrderingItem()],
        };
      }),
    );
  };

  const moveOrderingItem = (questionId: string, itemId: string, direction: 'up' | 'down') => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;
        const index = question.orderingItems.findIndex((item) => item.id === itemId);
        if (index === -1) return question;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= question.orderingItems.length) {
          return question;
        }

        const items = [...question.orderingItems];
        [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
        return { ...question, orderingItems: items };
      }),
    );
  };

  const saveContent = async () => {
    if (!accessToken || !content) return;

    const validationError = validateQuestions(questions);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updated = await testsApi.upsertTeacherTestContent(accessToken, content.lessonId, {
        passingScore: toOptionalInt(passingScore),
        allowMultipleAttempts,
        maxAttempts: toOptionalInt(maxAttempts),
        timeLimitMinutes: toOptionalInt(timeLimitMinutes),
        questions: questions.map((question) => ({
          text: question.text.trim(),
          explanation: question.explanation.trim() || undefined,
          type: question.type,
          points: toOptionalInt(question.points) ?? 1,
          options:
            question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE'
              ? question.options.map((option) => ({
                  text: option.text.trim(),
                  isCorrect: option.isCorrect,
                }))
              : undefined,
          acceptedAnswers:
            question.type === 'FREE_TEXT'
              ? question.acceptedAnswers.map((answer) => answer.trim()).filter(Boolean)
              : undefined,
          matchingPairs:
            question.type === 'MATCHING'
              ? question.matchingPairs.map((pair) => ({
                  leftId: pair.leftId,
                  rightId: pair.rightId,
                  left: pair.left.trim(),
                  right: pair.right.trim(),
                }))
              : undefined,
          orderingItems:
            question.type === 'ORDERING'
              ? question.orderingItems.map((item) => ({
                  id: item.id,
                  text: item.text.trim(),
                }))
              : undefined,
        })),
      });
      hydrateFromContent(updated);
      setNotice('Тест успешно сохранен.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить содержимое теста');
    } finally {
      setSaving(false);
    }
  };

  const backHref = useMemo(
    () => `/teacher/courses/${params.courseId}/modules/${params.moduleId}/edit`,
    [params.courseId, params.moduleId],
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title={content?.lesson.title ? `Конструктор теста: ${content.lesson.title}` : 'Конструктор теста'}
        description="Настройте вопросы теста, правильные ответы и правила оценки."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={backHref as Route}>
              <Button variant="secondary">Назад к модулю</Button>
            </Link>
            <Button onClick={() => void saveContent()} disabled={loading || saving}>
              {saving ? 'Сохранение...' : 'Сохранить тест'}
            </Button>
          </div>
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить тест"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadContent()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && content ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">Тест</Badge>
              <Badge tone={content.lesson.isPublished ? 'success' : 'neutral'}>
                {content.lesson.isPublished ? 'Урок опубликован' : 'Черновик урока'}
              </Badge>
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-700">Настройки теста</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Проходной балл (необязательно)</p>
                <Input
                  type="number"
                  min={0}
                  value={passingScore}
                  onChange={(event) => setPassingScore(event.target.value)}
                  placeholder="например, 70"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Макс. попыток (необязательно)</p>
                <Input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(event) => setMaxAttempts(event.target.value)}
                  placeholder="Без ограничений"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Лимит времени, минуты (необязательно)
                </p>
                <Input
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  onChange={(event) => setTimeLimitMinutes(event.target.value)}
                  placeholder="Без лимита"
                />
              </div>
              <label className="flex items-center gap-2 pt-6 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={allowMultipleAttempts}
                  onChange={(event) => setAllowMultipleAttempts(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-200 text-emerald-500 focus:ring-emerald-500"
                />
                Разрешить несколько попыток
              </label>
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-700">Вопросы</h2>
              <Button size="sm" onClick={addQuestion}>
                Добавить вопрос
              </Button>
            </div>

            <div className="mt-4 grid gap-3">
              {questions.length === 0 ? (
                <p className="text-sm text-gray-500">Вопросов пока нет. Добавьте первый вопрос.</p>
              ) : (
                questions.map((question, questionIndex) => (
                  <div key={question.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-700">Вопрос {questionIndex + 1}</p>
                      <Button size="sm" variant="secondary" onClick={() => removeQuestion(question.id)}>
                        Удалить
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2">
                      <Textarea
                        rows={2}
                        value={question.text}
                        onChange={(event) =>
                          updateQuestion(question.id, { text: event.target.value })
                        }
                        placeholder="Текст вопроса"
                      />

                      <Textarea
                        rows={2}
                        value={question.explanation}
                        onChange={(event) =>
                          updateQuestion(question.id, { explanation: event.target.value })
                        }
                        placeholder="Пояснение после отправки (необязательно)"
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">Тип вопроса</p>
                          <select
                            value={question.type}
                            onChange={(event) =>
                              setQuestionType(question.id, event.target.value as TestQuestionType)
                            }
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="SINGLE_CHOICE">Один правильный вариант</option>
                            <option value="MULTIPLE_CHOICE">Несколько правильных вариантов</option>
                            <option value="FREE_TEXT">Свободный текст</option>
                            <option value="MATCHING">Сопоставление</option>
                            <option value="ORDERING">Правильный порядок</option>
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-gray-500">Баллы</p>
                          <Input
                            type="number"
                            min={1}
                            value={question.points}
                            onChange={(event) =>
                              updateQuestion(question.id, { points: event.target.value })
                            }
                            placeholder="1"
                          />
                        </div>
                      </div>
                    </div>

                    {(question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') ? (
                      <>
                        <div className="mt-3 grid gap-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={option.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
                            >
                              {question.type === 'SINGLE_CHOICE' ? (
                                <input
                                  type="radio"
                                  checked={option.isCorrect}
                                  onChange={() => toggleOptionCorrect(question.id, option.id)}
                                  name={`question-${question.id}`}
                                  className="h-4 w-4 text-emerald-500"
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={option.isCorrect}
                                  onChange={() => toggleOptionCorrect(question.id, option.id)}
                                  className="h-4 w-4 rounded border-gray-200 text-emerald-500"
                                />
                              )}

                              <Input
                                value={option.text}
                                onChange={(event) =>
                                  updateOption(question.id, option.id, {
                                    text: event.target.value,
                                  })
                                }
                                placeholder={`Вариант ${optionIndex + 1}`}
                              />

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeOption(question.id, option.id)}
                                disabled={question.options.length <= 2}
                              >
                                Удалить
                              </Button>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3">
                          <Button size="sm" variant="secondary" onClick={() => addOption(question.id)}>
                            Добавить вариант
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {question.type === 'FREE_TEXT' ? (
                      <>
                        <div className="mt-3 grid gap-2">
                          {question.acceptedAnswers.map((answer, answerIndex) => (
                            <div
                              key={`${question.id}-accepted-${answerIndex}`}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
                            >
                              <Input
                                value={answer}
                                onChange={(event) =>
                                  updateAcceptedAnswer(
                                    question.id,
                                    answerIndex,
                                    event.target.value,
                                  )
                                }
                                placeholder={`Допустимый ответ ${answerIndex + 1}`}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAcceptedAnswer(question.id, answerIndex)}
                                disabled={question.acceptedAnswers.length <= 1}
                              >
                                Удалить
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addAcceptedAnswer(question.id)}
                          >
                            Добавить допустимый ответ
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {question.type === 'MATCHING' ? (
                      <>
                        <div className="mt-3 grid gap-2">
                          {question.matchingPairs.map((pair) => (
                            <div
                              key={pair.leftId}
                              className="grid gap-2 rounded-lg border border-gray-200 bg-white p-2 sm:grid-cols-[1fr_auto_1fr_auto]"
                            >
                              <Input
                                value={pair.left}
                                onChange={(event) =>
                                  updateMatchingPair(question.id, pair.leftId, {
                                    left: event.target.value,
                                  })
                                }
                                placeholder="Левая часть"
                              />
                              <div className="flex items-center justify-center text-gray-500">→</div>
                              <Input
                                value={pair.right}
                                onChange={(event) =>
                                  updateMatchingPair(question.id, pair.leftId, {
                                    right: event.target.value,
                                  })
                                }
                                placeholder="Правая часть"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMatchingPair(question.id, pair.leftId)}
                                disabled={question.matchingPairs.length <= 2}
                              >
                                Удалить
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addMatchingPair(question.id)}
                          >
                            Добавить пару
                          </Button>
                        </div>
                      </>
                    ) : null}

                    {question.type === 'ORDERING' ? (
                      <>
                        <div className="mt-3 grid gap-2">
                          {question.orderingItems.map((item, itemIndex) => (
                            <div
                              key={item.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-2"
                            >
                              <span className="w-5 text-sm text-gray-500">{itemIndex + 1}.</span>
                              <Input
                                value={item.text}
                                onChange={(event) =>
                                  updateOrderingItem(question.id, item.id, event.target.value)
                                }
                                placeholder="Элемент порядка"
                              />
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
                                disabled={itemIndex === question.orderingItems.length - 1}
                              >
                                Вниз
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeOrderingItem(question.id, item.id)}
                                disabled={question.orderingItems.length <= 2}
                              >
                                Удалить
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => addOrderingItem(question.id)}
                          >
                            Добавить элемент
                          </Button>
                        </div>
                      </>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </Card>

          {notice ? <p className="text-sm text-emerald-500">{notice}</p> : null}
        </>
      ) : null}
    </div>
  );
}

function createEmptyQuestion(): QuestionForm {
  return {
    id: generateLocalId(),
    text: '',
    explanation: '',
    type: 'SINGLE_CHOICE',
    points: '1',
    options: defaultOptions(),
    acceptedAnswers: [''],
    matchingPairs: [createMatchingPair(), createMatchingPair()],
    orderingItems: [createOrderingItem(), createOrderingItem()],
  };
}

function defaultOptions(): OptionForm[] {
  return [
    { id: generateLocalId(), text: '', isCorrect: true },
    { id: generateLocalId(), text: '', isCorrect: false },
  ];
}

function createMatchingPair(): MatchingPairForm {
  return {
    leftId: generateUuid(),
    rightId: generateUuid(),
    left: '',
    right: '',
  };
}

function createOrderingItem(): OrderingItemForm {
  return {
    id: generateUuid(),
    text: '',
  };
}

function generateLocalId() {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return generateLocalId();
}

function toOptionalInt(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.trunc(parsed);
}

function validateQuestions(questions: QuestionForm[]): string | null {
  if (questions.length === 0) {
    return 'Добавьте хотя бы один вопрос';
  }

  for (let i = 0; i < questions.length; i += 1) {
    const question = questions[i];
    if (question.text.trim().length < 2) {
      return `Вопрос ${i + 1}: слишком короткий текст`;
    }

    if (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE') {
      if (question.options.length < 2) {
        return `Вопрос ${i + 1} должен иметь минимум 2 варианта`;
      }

      if (question.options.some((option) => option.text.trim().length === 0)) {
        return `Вопрос ${i + 1} содержит пустой вариант`;
      }

      const correctCount = question.options.filter((option) => option.isCorrect).length;
      if (correctCount === 0) {
        return `Вопрос ${i + 1} должен иметь хотя бы один правильный вариант`;
      }
      if (question.type === 'SINGLE_CHOICE' && correctCount !== 1) {
        return `Вопрос ${i + 1} должен иметь ровно один правильный вариант`;
      }
      if (question.type === 'MULTIPLE_CHOICE' && correctCount < 2) {
        return `Вопрос ${i + 1} должен иметь минимум два правильных варианта`;
      }
    }

    if (question.type === 'FREE_TEXT') {
      const answers = question.acceptedAnswers.map((item) => item.trim()).filter(Boolean);
      if (answers.length === 0) {
        return `Вопрос ${i + 1} должен иметь хотя бы один допустимый ответ`;
      }
    }

    if (question.type === 'MATCHING') {
      if (question.matchingPairs.length < 2) {
        return `Вопрос ${i + 1} должен иметь минимум две пары`;
      }
      if (
        question.matchingPairs.some(
          (pair) => pair.left.trim().length === 0 || pair.right.trim().length === 0,
        )
      ) {
        return `Вопрос ${i + 1} содержит пустую пару сопоставления`;
      }
    }

    if (question.type === 'ORDERING') {
      if (question.orderingItems.length < 2) {
        return `Вопрос ${i + 1} должен иметь минимум два элемента порядка`;
      }
      if (question.orderingItems.some((item) => item.text.trim().length === 0)) {
        return `Вопрос ${i + 1} содержит пустой элемент порядка`;
      }
    }
  }

  return null;
}

function LoadingBlock() {
  return <div className="h-[420px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
