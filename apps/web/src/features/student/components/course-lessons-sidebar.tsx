'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { BookOpenCheck, CheckCircle2, Circle, ClipboardList, Video } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cn } from '@/lib/utils/cn';
import {
  LessonProgressStatus,
  LessonType,
  StudentCourseDetails,
} from '@/types/domain';
import {
  getStudentLessonStatus,
  summarizeStudentModuleProgress,
} from '../utils/progress-utils';

type CourseLessonsSidebarProps = {
  course: StudentCourseDetails;
  activeModuleId?: string;
  activeLessonId?: string;
};

export function CourseLessonsSidebar({
  course,
  activeModuleId,
  activeLessonId,
}: CourseLessonsSidebarProps) {
  return (
    <aside className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-700">Программа курса</h2>
      <p className="mt-1 text-sm text-gray-500">
        Модули и уроки с отметкой вашего прогресса.
      </p>

      <div className="mt-4 grid gap-3">
        {course.modules.map((module) => {
          const moduleProgress = summarizeStudentModuleProgress(module);
          const isActiveModule = module.id === activeModuleId;

          return (
            <section
              key={module.id}
              className={cn(
                'rounded-xl border p-3',
                isActiveModule
                  ? 'border-emerald-500 bg-emerald-50/60'
                  : 'border-gray-200 bg-gray-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={
                    `/student/courses/${course.id}/modules/${module.id}` as Route
                  }
                  className={cn(
                    'text-sm font-semibold transition',
                    isActiveModule
                      ? 'text-emerald-500 hover:text-emerald-600'
                      : 'text-gray-700 hover:text-emerald-500',
                  )}
                >
                  {module.orderIndex}. {module.title}
                </Link>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                  {moduleProgress.completedLessons}/{moduleProgress.totalLessons}
                </span>
              </div>

              <ProgressBar className="mt-2" value={moduleProgress.percent} />

              <div className="mt-3 grid gap-1">
                {module.lessons.map((lesson) => {
                  const status = getStudentLessonStatus(lesson);
                  const lessonHref = resolveStudentLessonHref(lesson.type, lesson.id);
                  const isActiveLesson = lesson.id === activeLessonId;

                  return (
                    <Link
                      key={lesson.id}
                      href={lessonHref as Route}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition',
                        isActiveLesson
                          ? 'bg-white text-emerald-500'
                          : 'text-gray-700 hover:bg-white hover:text-emerald-500',
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <LessonTypeIcon type={lesson.type} />
                        <span className="truncate text-sm">
                          {lesson.orderIndex}. {lesson.title}
                        </span>
                      </span>
                      <LessonStatusIcon status={status} />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function resolveStudentLessonHref(type: LessonType, lessonId: string) {
  if (type === 'TEST') return `/student/lessons/${lessonId}/test`;
  if (type === 'WEBINAR') return `/student/lessons/${lessonId}/webinar`;
  return `/student/lessons/${lessonId}`;
}

function LessonTypeIcon({ type }: { type: LessonType }) {
  if (type === 'TEST') return <ClipboardList className="text-gray-500" size={18} />;
  if (type === 'WEBINAR') return <Video className="text-gray-500" size={18} />;
  return <BookOpenCheck className="text-gray-500" size={18} />;
}

function LessonStatusIcon({ status }: { status: LessonProgressStatus }) {
  if (status === 'COMPLETED') {
    return <CheckCircle2 className="text-emerald-500" size={18} />;
  }

  if (status === 'IN_PROGRESS') {
    return (
      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" aria-label="В процессе" />
    );
  }

  return <Circle className="text-gray-500" size={16} />;
}
