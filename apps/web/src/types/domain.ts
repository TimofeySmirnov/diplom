export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  group?: string | null;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type CourseStatus = 'DRAFT' | 'PUBLISHED';

export type Course = {
  id: string;
  teacherId: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  coverImageUrl?: string | null;
  slug: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
};

export type CourseListItem = Pick<
  Course,
  'id' | 'title' | 'shortDescription' | 'coverImageUrl' | 'status' | 'createdAt' | 'updatedAt'
> & {
  _count?: {
    modules: number;
    enrollments: number;
  };
};

export type CourseModuleOutline = {
  id: string;
  courseId?: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
  lessonsCount?: number;
  lessons?: ModuleLessonItem[];
};

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  lessons: ModuleLessonItem[];
};

export type ReorderModuleItem = {
  moduleId: string;
  orderIndex: number;
};

export type CourseDetails = Course & {
  teacher?: {
    id: string;
    fullName: string;
  };
  modules: CourseModuleOutline[];
  _count?: {
    modules: number;
    enrollments: number;
  };
};

export type LessonType = 'LECTURE' | 'TEST' | 'WEBINAR';
export type LessonProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type ModuleLessonItem = {
  id: string;
  moduleId?: string;
  type: LessonType;
  title: string;
  description?: string | null;
  orderIndex: number;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EnrollmentLessonProgress = {
  lessonId: string;
  status: LessonProgressStatus;
  completedAt?: string | null;
  updatedAt: string;
};

export type StudentCourseLesson = ModuleLessonItem & {
  progress?: Array<{
    id: string;
    status: LessonProgressStatus;
    completedAt?: string | null;
    updatedAt: string;
  }>;
};

export type StudentCourseModule = {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  orderIndex: number;
  lessons: StudentCourseLesson[];
};

export type StudentCourseDetails = Course & {
  teacher: {
    id: string;
    fullName: string;
  };
  modules: StudentCourseModule[];
  enrollment: {
    id: string;
    enrolledAt: string;
  };
  _count?: {
    modules: number;
    enrollments: number;
  };
};

export type Lesson = {
  lecture?: {
    lessonId: string;
    content: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  test?: {
    lessonId: string;
    passingScore?: number | null;
    allowMultipleAttempts: boolean;
    maxAttempts?: number | null;
    timeLimitMinutes?: number | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  webinar?: {
    lessonId: string;
    meetingLink: string;
    scheduledAt: string;
    durationMinutes?: number | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
} & ModuleLessonItem;

export type EnrollmentStatus = 'ACTIVE' | 'REMOVED';

export type CourseInvitation = {
  id: string;
  courseId: string;
  createdById?: string | null;
  token: string;
  isActive: boolean;
  expiresAt?: string | null;
  maxUses?: number | null;
  usesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CourseEnrollment = {
  id: string;
  courseId: string;
  studentId: string;
  invitationId?: string | null;
  status: EnrollmentStatus;
  enrolledAt: string;
  removedAt?: string | null;
  removedById?: string | null;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    fullName: string;
    email: string;
    group?: string | null;
  };
  course?: Course & {
    teacher?: {
      id: string;
      fullName: string;
    };
    modules?: Array<{
      id: string;
      title: string;
      orderIndex: number;
      lessons: ModuleLessonItem[];
    }>;
  };
  lessonProgress?: EnrollmentLessonProgress[];
};
