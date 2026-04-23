'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { TeacherCourseProgressOverview } from '@/lib/api';
import { ProgressStatusBadge } from './progress-status-badge';

type StudentProgressTableProps = {
  courseId: string;
  students: TeacherCourseProgressOverview['students'];
  selectedStudentId?: string | null;
  onSelectStudent: (studentId: string) => void;
};

export function StudentProgressTable({
  courseId,
  students,
  selectedStudentId,
  onSelectStudent,
}: StudentProgressTableProps) {
  return (
    <div className="grid gap-3">
      {students.length === 0 ? (
        <p className="text-sm text-gray-500">В курсе пока нет активных студентов.</p>
      ) : (
        students.map((row) => (
          <div key={row.student.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">{row.student.fullName}</p>
                <p className="text-xs text-gray-500">{row.student.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ProgressStatusBadge status={row.progress.status} />
                <Link href={`/teacher/courses/${courseId}/analytics/students/${row.student.id}`}>
                  <Button size="sm" variant="secondary">
                    Страница
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant={selectedStudentId === row.student.id ? 'primary' : 'secondary'}
                  onClick={() => onSelectStudent(row.student.id)}
                >
                  {selectedStudentId === row.student.id ? 'Открыто' : 'Подробнее'}
                </Button>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Прогресс</span>
                <span>{row.progress.completionRatePercent}%</span>
              </div>
              <ProgressBar value={row.progress.completionRatePercent} />
            </div>

            <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-4">
              <p>
                Завершено: {row.progress.completedLessons}/{row.progress.totalLessons}
              </p>
              <p>Тестовые попытки: {row.tests.submittedAttempts}</p>
              <p>Лучший тест: {row.tests.bestScorePercent ?? '—'}%</p>
              <p>
                Последняя активность:{' '}
                {row.progress.lastActivityAt
                  ? new Date(row.progress.lastActivityAt).toLocaleString('ru-RU')
                  : 'нет данных'}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
