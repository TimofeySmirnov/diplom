import {
  CourseEnrollment,
  LessonProgressStatus,
  StudentCourseDetails,
  StudentCourseModule,
  StudentCourseLesson,
} from '@/types/domain';

export type ProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  percent: number;
};

const EMPTY_SUMMARY: ProgressSummary = {
  totalLessons: 0,
  completedLessons: 0,
  inProgressLessons: 0,
  percent: 0,
};

export function buildEnrollmentLessonStatusMap(
  enrollment: CourseEnrollment,
): Record<string, LessonProgressStatus> {
  return (enrollment.lessonProgress ?? []).reduce<Record<string, LessonProgressStatus>>(
    (acc, progress) => {
      acc[progress.lessonId] = progress.status;
      return acc;
    },
    {},
  );
}

export function summarizeEnrollmentCourseProgress(
  enrollment: CourseEnrollment,
): ProgressSummary {
  const modules = enrollment.course?.modules ?? [];
  const allLessons = modules.flatMap((module) => module.lessons ?? []);

  if (allLessons.length === 0) {
    return EMPTY_SUMMARY;
  }

  const statusByLessonId = buildEnrollmentLessonStatusMap(enrollment);
  const completedLessons = allLessons.filter(
    (lesson) => statusByLessonId[lesson.id] === 'COMPLETED',
  ).length;
  const inProgressLessons = allLessons.filter(
    (lesson) => statusByLessonId[lesson.id] === 'IN_PROGRESS',
  ).length;

  return {
    totalLessons: allLessons.length,
    completedLessons,
    inProgressLessons,
    percent: Math.round((completedLessons / allLessons.length) * 100),
  };
}

export function summarizeStudentCourseProgress(
  course: StudentCourseDetails,
): ProgressSummary {
  const allLessons = course.modules.flatMap((module) => module.lessons);
  if (allLessons.length === 0) {
    return EMPTY_SUMMARY;
  }

  const completedLessons = allLessons.filter(
    (lesson) => getStudentLessonStatus(lesson) === 'COMPLETED',
  ).length;
  const inProgressLessons = allLessons.filter(
    (lesson) => getStudentLessonStatus(lesson) === 'IN_PROGRESS',
  ).length;

  return {
    totalLessons: allLessons.length,
    completedLessons,
    inProgressLessons,
    percent: Math.round((completedLessons / allLessons.length) * 100),
  };
}

export function summarizeStudentModuleProgress(
  module: StudentCourseModule,
): ProgressSummary {
  if (module.lessons.length === 0) {
    return EMPTY_SUMMARY;
  }

  const completedLessons = module.lessons.filter(
    (lesson) => getStudentLessonStatus(lesson) === 'COMPLETED',
  ).length;
  const inProgressLessons = module.lessons.filter(
    (lesson) => getStudentLessonStatus(lesson) === 'IN_PROGRESS',
  ).length;

  return {
    totalLessons: module.lessons.length,
    completedLessons,
    inProgressLessons,
    percent: Math.round((completedLessons / module.lessons.length) * 100),
  };
}

export function getStudentLessonStatus(
  lesson: Pick<StudentCourseLesson, 'progress'>,
): LessonProgressStatus {
  return lesson.progress?.[0]?.status ?? 'NOT_STARTED';
}

export function getLessonStatusMeta(status: LessonProgressStatus): {
  label: string;
  className: string;
} {
  if (status === 'COMPLETED') {
    return {
      label: 'Завершено',
      className: 'bg-emerald-100 text-emerald-500',
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      label: 'В процессе',
      className: 'bg-yellow-100 text-yellow-500',
    };
  }

  return {
    label: 'Не начато',
    className: 'bg-gray-100 text-gray-500',
  };
}
