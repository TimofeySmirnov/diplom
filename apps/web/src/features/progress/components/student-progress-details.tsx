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
            РџСЂРѕРіСЂРµСЃСЃ: {details.student.fullName}
          </h3>
          <p className="text-sm text-gray-500">{details.student.email}</p>
          <p className="text-sm text-gray-500">Группа: {details.student.group?.trim() || 'не указана'}</p>
        </div>
        <ProgressStatusBadge status={details.summary.status} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>РћР±С‰РёР№ РїСЂРѕРіСЂРµСЃСЃ</span>
          <span>{details.summary.completionRatePercent}%</span>
        </div>
        <ProgressBar value={details.summary.completionRatePercent} />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-4">
        <p>
          Р—Р°РІРµСЂС€РµРЅРѕ: {details.summary.completedLessons}/{details.summary.totalLessons}
        </p>
        <p>РџРѕРїС‹С‚РѕРє С‚РµСЃС‚РѕРІ: {details.tests.submittedAttempts}</p>
        <p>РЎСЂРµРґРЅРёР№ С‚РµСЃС‚: {details.tests.averageScorePercent ?? 'вЂ”'}%</p>
        <p>Р›СѓС‡С€РёР№ С‚РµСЃС‚: {details.tests.bestScorePercent ?? 'вЂ”'}%</p>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        РџРѕСЃР»РµРґРЅСЏСЏ Р°РєС‚РёРІРЅРѕСЃС‚СЊ:{' '}
        {details.lastActivityAt
          ? new Date(details.lastActivityAt).toLocaleString('ru-RU')
          : 'РЅРµС‚ РґР°РЅРЅС‹С…'}
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
                        ? 'Р›РµРєС†РёСЏ'
                        : lesson.type === 'WEBINAR'
                          ? 'Р’РµР±РёРЅР°СЂ'
                          : 'РўРµСЃС‚'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressStatusBadge status={lesson.status} />
                    {lesson.tests ? (
                      <Badge tone="accent">{lesson.tests.attemptsCount} РїРѕРїС‹С‚.</Badge>
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
