import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { TeacherStudentProgressDetails } from '@/lib/api';
import { ProgressStatusBadge } from './progress-status-badge';

type StudentProgressDetailsProps = {
  details: TeacherStudentProgressDetails;
};

export function StudentProgressDetails({ details }: StudentProgressDetailsProps) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">
            Прогресс: {details.student.fullName}
          </h3>
          <p className="text-sm text-gray-500">{details.student.email}</p>
        </div>
        <ProgressStatusBadge status={details.summary.status} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Общий прогресс</span>
          <span>{details.summary.completionRatePercent}%</span>
        </div>
        <ProgressBar value={details.summary.completionRatePercent} />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-4">
        <p>
          Завершено: {details.summary.completedLessons}/{details.summary.totalLessons}
        </p>
        <p>Попыток тестов: {details.tests.submittedAttempts}</p>
        <p>Средний тест: {details.tests.averageScorePercent ?? '—'}%</p>
        <p>Лучший тест: {details.tests.bestScorePercent ?? '—'}%</p>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Последняя активность:{' '}
        {details.lastActivityAt
          ? new Date(details.lastActivityAt).toLocaleString('ru-RU')
          : 'нет данных'}
      </p>

      <div className="mt-4 grid gap-3">
        {details.modules.map((module) => (
          <div key={module.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-700">
                {module.orderIndex}. {module.title}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {module.progress.completionRatePercent}%
                </span>
                <ProgressStatusBadge status={module.progress.status} />
              </div>
            </div>

            <div className="mt-2 grid gap-2">
              {module.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-700">
                      {lesson.orderIndex}. {lesson.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {lesson.type === 'LECTURE'
                        ? 'Лекция'
                        : lesson.type === 'WEBINAR'
                          ? 'Вебинар'
                          : 'Тест'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressStatusBadge status={lesson.status} />
                    {lesson.tests ? (
                      <Badge tone="accent">{lesson.tests.attemptsCount} попыт.</Badge>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
