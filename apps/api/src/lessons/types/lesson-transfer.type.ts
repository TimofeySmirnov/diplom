import { QuestionType } from '@prisma/client';

export const LESSON_TRANSFER_FORMAT = 'zskills.lesson' as const;
export const LESSON_TRANSFER_VERSION = 1 as const;

export type LessonTransferQuestionType = QuestionType;

export type LessonTransferBase = {
  format: typeof LESSON_TRANSFER_FORMAT;
  version: typeof LESSON_TRANSFER_VERSION;
  lessonType: 'lecture' | 'test';
  lesson: {
    title: string;
    description?: string;
    orderIndex?: number;
    isPublished?: boolean;
  };
};

export type LectureLessonTransfer = LessonTransferBase & {
  lessonType: 'lecture';
  lecture: {
    content: Record<string, unknown>;
  };
};

export type TestQuestionTransfer = {
  text: string;
  explanation?: string;
  type: LessonTransferQuestionType;
  points?: number;
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  acceptedAnswers?: string[];
  matchingPairs?: Array<{
    left: string;
    right: string;
  }>;
  orderingItems?: string[];
};

export type TestLessonTransfer = LessonTransferBase & {
  lessonType: 'test';
  test: {
    settings: {
      passingScore?: number;
      allowMultipleAttempts?: boolean;
      maxAttempts?: number;
      timeLimitMinutes?: number;
    };
    questions: TestQuestionTransfer[];
  };
};

export type LessonTransferPayload = LectureLessonTransfer | TestLessonTransfer;
