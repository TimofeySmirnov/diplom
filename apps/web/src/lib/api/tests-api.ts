import { apiRequest } from './client';

export type TestQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

export type TeacherTestOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

export type TeacherTestQuestion = {
  id: string;
  text: string;
  explanation?: string | null;
  type: TestQuestionType;
  order: number;
  points: number;
  options: TeacherTestOption[];
};

export type TeacherTestContent = {
  lessonId: string;
  passingScore?: number | null;
  allowMultipleAttempts: boolean;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  lesson: {
    id: string;
    title: string;
    description?: string | null;
    isPublished: boolean;
    orderIndex: number;
    moduleId: string;
  };
  questions: TeacherTestQuestion[];
};

export type UpsertTestContentPayload = {
  passingScore?: number;
  allowMultipleAttempts?: boolean;
  maxAttempts?: number;
  timeLimitMinutes?: number;
  questions: Array<{
    text: string;
    explanation?: string;
    type: TestQuestionType;
    points?: number;
    options: Array<{
      text: string;
      isCorrect: boolean;
    }>;
  }>;
};

export type StudentTestOption = {
  id: string;
  text: string;
  order: number;
};

export type StudentTestQuestion = {
  id: string;
  text: string;
  explanation?: string | null;
  type: TestQuestionType;
  order: number;
  points: number;
  options: StudentTestOption[];
};

export type StudentTestPayload = {
  lesson: {
    id: string;
    title: string;
    description?: string | null;
    module: {
      id: string;
      title: string;
      courseId: string;
      courseTitle: string;
    };
  };
  settings: {
    passingScore?: number | null;
    allowMultipleAttempts: boolean;
    maxAttempts?: number | null;
    timeLimitMinutes?: number | null;
  };
  questions: StudentTestQuestion[];
  attempts: Array<{
    id: string;
    attemptNumber: number;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    score?: number | null;
    maxScore?: number | null;
    scorePercent?: number | null;
    isPassed?: boolean | null;
    startedAt: string;
    submittedAt?: string | null;
  }>;
};

export type StartTestAttemptResponse = {
  id: string;
  testLessonId: string;
  studentId: string;
  enrollmentId: string;
  attemptNumber: number;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: string;
  submittedAt?: string | null;
};

export type SubmitTestAttemptPayload = {
  answers: Array<{
    questionId: string;
    optionIds: string[];
  }>;
};

export type SubmitTestAttemptResponse = {
  attempt: {
    id: string;
    attemptNumber: number;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    score?: number | null;
    maxScore?: number | null;
    scorePercent?: number | null;
    isPassed?: boolean | null;
    submittedAt?: string | null;
  };
  result: {
    score: number;
    maxScore: number;
    scorePercent: number;
    isPassed: boolean;
    questions: Array<{
      questionId: string;
      text: string;
      explanation?: string | null;
      type: TestQuestionType;
      points: number;
      pointsAwarded: number;
      isCorrect: boolean;
      selectedOptionIds: string[];
      correctOptionIds: string[];
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
      }>;
    }>;
  };
};

export type TestAttemptResultPayload = {
  attempt: {
    id: string;
    attemptNumber: number;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    score?: number | null;
    maxScore?: number | null;
    scorePercent?: number | null;
    isPassed?: boolean | null;
    startedAt: string;
    submittedAt?: string | null;
  };
  lesson: {
    id: string;
    title: string;
    description?: string | null;
    moduleTitle: string;
    courseId: string;
    courseTitle: string;
  };
  questions: Array<{
    questionId: string;
    text: string;
    explanation?: string | null;
    type: TestQuestionType;
    points: number;
    isCorrect: boolean;
    pointsAwarded: number;
    selectedOptionIds: string[];
    correctOptionIds: string[];
    options: Array<{
      id: string;
      text: string;
    }>;
  }>;
};

export const testsApi = {
  getTeacherTestContent: (token: string, lessonId: string) =>
    apiRequest<TeacherTestContent>(`/tests/lessons/${lessonId}/content`, { token }),

  upsertTeacherTestContent: (
    token: string,
    lessonId: string,
    payload: UpsertTestContentPayload,
  ) =>
    apiRequest<TeacherTestContent>(`/tests/lessons/${lessonId}/content`, {
      method: 'PUT',
      token,
      body: payload,
    }),

  getStudentTest: (token: string, lessonId: string) =>
    apiRequest<StudentTestPayload>(`/tests/student/lessons/${lessonId}`, { token }),

  startAttempt: (token: string, lessonId: string) =>
    apiRequest<StartTestAttemptResponse>(`/tests/lessons/${lessonId}/attempts`, {
      method: 'POST',
      token,
    }),

  submitAttempt: (
    token: string,
    attemptId: string,
    payload: SubmitTestAttemptPayload,
  ) =>
    apiRequest<SubmitTestAttemptResponse>(`/tests/attempts/${attemptId}/submit`, {
      method: 'POST',
      token,
      body: payload,
    }),

  getAttemptResult: (token: string, attemptId: string) =>
    apiRequest<TestAttemptResultPayload>(`/tests/attempts/${attemptId}/result`, {
      token,
    }),
};
