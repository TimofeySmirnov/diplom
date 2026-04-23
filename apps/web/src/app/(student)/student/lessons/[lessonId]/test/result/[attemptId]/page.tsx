'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/hooks/use-auth';
import { TestAttemptResultPayload, testsApi } from '@/lib/api';

type StudentTestResultPageProps = {
  params: { lessonId: string; attemptId: string };
};

export default function StudentTestResultPage({ params }: StudentTestResultPageProps) {
  const { accessToken, hydrated } = useAuth();

  const [result, setResult] = useState<TestAttemptResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const data = await testsApi.getAttemptResult(accessToken, params.attemptId);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить результат');
    } finally {
      setLoading(false);
    }
  }, [accessToken, params.attemptId]);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    void loadResult();
  }, [hydrated, accessToken, loadResult]);

  const headline = useMemo(() => {
    if (!result) return 'Результат теста';
    return `Результат: ${result.attempt.score ?? 0}/${result.attempt.maxScore ?? 0}`;
  }, [result]);

  return (
    <div className="grid gap-6">
      <PageHeader
        title={headline}
        description={result ? `${result.lesson.courseTitle} | ${result.lesson.moduleTitle}` : ''}
        actions={
          result ? (
            <Link href={`/student/lessons/${result.lesson.id}/test`}>
              <Button variant="secondary" size="sm">
                Назад к тесту
              </Button>
            </Link>
          ) : null
        }
      />

      {loading ? <LoadingBlock /> : null}

      {!loading && error ? (
        <EmptyState
          title="Не удалось загрузить результат"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadResult()}>
              Повторить
            </Button>
          }
        />
      ) : null}

      {!loading && !error && result ? (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">Попытка №{result.attempt.attemptNumber}</Badge>
              <Badge tone={result.attempt.isPassed ? 'success' : 'warning'}>
                {result.attempt.isPassed ? 'Пройдено' : 'Не пройдено'}
              </Badge>
              <Badge tone="accent">{result.attempt.scorePercent ?? 0}%</Badge>
            </div>

            <p className="mt-3 text-sm text-gray-500">
              Баллы: {result.attempt.score ?? 0} из {result.attempt.maxScore ?? 0}
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-700">Разбор вопросов</h2>
            <div className="mt-4 grid gap-3">
              {result.questions.map((question, index) => (
                <div
                  key={question.questionId}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {index + 1}. {question.text}
                    </p>
                    <Badge tone={question.isCorrect ? 'success' : 'warning'}>
                      {question.isCorrect ? 'Верно' : 'Неверно'}
                    </Badge>
                    <Badge tone="accent">
                      {question.pointsAwarded}/{question.points} балл.
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {question.options.map((option) => {
                      const isSelected = question.selectedOptionIds.includes(option.id);
                      const isCorrect = question.correctOptionIds.includes(option.id);

                      return (
                        <div
                          key={option.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                        >
                          <span className="text-gray-700">{option.text}</span>
                          {isSelected ? <Badge tone="accent">Выбрано</Badge> : null}
                          {isCorrect ? <Badge tone="success">Верно</Badge> : null}
                        </div>
                      );
                    })}
                  </div>

                  {question.explanation ? (
                    <p className="mt-3 text-xs text-gray-500">Пояснение: {question.explanation}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function LoadingBlock() {
  return <div className="h-[360px] animate-pulse rounded-2xl border border-gray-200 bg-gray-50" />;
}
