import {
  CourseStatus,
  EnrollmentStatus,
  LessonProgressStatus,
  LessonType,
  Prisma,
  PrismaClient,
  QuestionType,
  TestAttemptStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const passwordHashCache = new Map<string, string>();

type UserSeed = {
  key: string;
  email: string;
  fullName: string;
  role: UserRole;
  password: string;
  group?: string;
};

type OptionSeed = {
  key: string;
  text: string;
  isCorrect: boolean;
};

type QuestionSeed = {
  key: string;
  text: string;
  type: QuestionType;
  points?: number;
  explanation?: string;
  options?: OptionSeed[];
  acceptedAnswers?: string[];
  matchingPairs?: Array<{ left: string; right: string }>;
  orderingItems?: string[];
};

type TestSeed = {
  passingScore?: number;
  allowMultipleAttempts?: boolean;
  maxAttempts?: number;
  timeLimitMinutes?: number;
  questions: QuestionSeed[];
};

type LessonSeed = {
  key: string;
  orderIndex: number;
  type: LessonType;
  title: string;
  description?: string;
  isPublished?: boolean;
  lectureContent?: Prisma.InputJsonValue;
  webinar?: {
    meetingLink: string;
    scheduledAt: Date;
    durationMinutes?: number;
  };
  test?: TestSeed;
};

type ModuleSeed = {
  key: string;
  orderIndex: number;
  title: string;
  description?: string;
  lessons: LessonSeed[];
};

type CourseSeed = {
  key: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  status: CourseStatus;
  modules: ModuleSeed[];
};

type EnsuredUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  group: string | null;
};

type EnsuredLesson = {
  id: string;
  type: LessonType;
};

type EnsuredEnrollment = {
  id: string;
  courseId: string;
  studentId: string;
};

type QuestionMeta = {
  id: string;
  key: string;
  type: QuestionType;
  points: number;
  acceptedAnswers: string[];
  optionIdByKey: Record<string, string>;
  correctOptionIds: string[];
  matchingPairs: Array<{ leftId: string; left: string; rightId: string; right: string }>;
  orderingItems: Array<{ id: string; text: string }>;
};

type TestMeta = {
  lessonId: string;
  passingScore: number | null;
  questions: QuestionMeta[];
  questionByKey: Record<string, QuestionMeta>;
};

type AttemptAnswerSeed = {
  questionKey: string;
  optionKeys?: string[];
  textAnswer?: string;
  matchingPairs?: Array<{ left: string; right: string }>;
  orderingByText?: string[];
};

const COURSES: CourseSeed[] = [
  {
    key: 'web',
    slug: 'web-fullstack-foundation',
    title: 'Веб-разработка: от HTML до Fullstack',
    shortDescription: 'Frontend, backend, тестирование и командная работа.',
    fullDescription:
      'Демо-курс для защиты диплома: структура веб-приложения, практика по JS/React/NestJS и аналитика обучения.',
    status: CourseStatus.PUBLISHED,
    modules: [
      {
        key: 'web_base',
        orderIndex: 1,
        title: 'HTTP и HTML',
        description: 'Базовая теория веб-платформы.',
        lessons: [
          {
            key: 'web_l_http',
            orderIndex: 1,
            type: LessonType.LECTURE,
            title: 'Как работает HTTP',
            isPublished: true,
            lectureContent: lectureDoc('HTTP и жизненный цикл запроса', [
              'Браузер отправляет запрос, сервер возвращает ответ.',
              'Коды состояния помогают быстро диагностировать проблемы.',
              'GET, POST, PUT, PATCH и DELETE покрывают основные сценарии API.',
            ]),
          },
          {
            key: 'web_l_html',
            orderIndex: 2,
            type: LessonType.LECTURE,
            title: 'Семантический HTML',
            isPublished: true,
            lectureContent: lectureDoc('Семантика и доступность', [
              'Семантические теги улучшают SEO и поддержку.',
              'Правильная структура документа важна для читабельности.',
              'Атрибуты доступности упрощают работу с интерфейсом.',
            ]),
          },
          {
            key: 'web_t_http_html',
            orderIndex: 3,
            type: LessonType.TEST,
            title: 'Тест: HTTP и HTML',
            isPublished: true,
            test: {
              passingScore: 4,
              allowMultipleAttempts: true,
              maxAttempts: 3,
              timeLimitMinutes: 20,
              questions: [
                {
                  key: 'q_http_method',
                  text: 'Какой метод обычно используется для открытия страницы?',
                  type: QuestionType.SINGLE_CHOICE,
                  options: [
                    { key: 'get', text: 'GET', isCorrect: true },
                    { key: 'post', text: 'POST', isCorrect: false },
                    { key: 'delete', text: 'DELETE', isCorrect: false },
                  ],
                },
                {
                  key: 'q_semantic',
                  text: 'Выберите семантические теги.',
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: [
                    { key: 'header', text: '<header>', isCorrect: true },
                    { key: 'div', text: '<div>', isCorrect: false },
                    { key: 'article', text: '<article>', isCorrect: true },
                    { key: 'section', text: '<section>', isCorrect: true },
                  ],
                },
                {
                  key: 'q_html_full',
                  text: 'Расшифруйте HTML.',
                  type: QuestionType.FREE_TEXT,
                  acceptedAnswers: ['HyperText Markup Language', 'HTML'],
                },
                {
                  key: 'q_codes_match',
                  text: 'Сопоставьте код и значение.',
                  type: QuestionType.MATCHING,
                  matchingPairs: [
                    { left: '200', right: 'OK' },
                    { left: '404', right: 'Not Found' },
                    { left: '500', right: 'Internal Server Error' },
                  ],
                },
                {
                  key: 'q_request_order',
                  text: 'Упорядочьте этапы HTTP-запроса.',
                  type: QuestionType.ORDERING,
                  orderingItems: [
                    'Браузер отправляет запрос',
                    'Сервер обрабатывает запрос',
                    'Сервер отправляет ответ',
                    'Браузер рендерит страницу',
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        key: 'web_js',
        orderIndex: 2,
        title: 'JavaScript и React',
        lessons: [
          {
            key: 'web_l_js',
            orderIndex: 1,
            type: LessonType.LECTURE,
            title: 'DOM и события',
            isPublished: true,
            lectureContent: lectureDoc('JavaScript в браузере', [
              'DOM хранит структуру страницы в памяти браузера.',
              'Обработчики событий позволяют строить интерактивный UI.',
              'React упрощает работу со сложными состояниями.',
            ]),
          },
          {
            key: 'web_wb_qa',
            orderIndex: 2,
            type: LessonType.WEBINAR,
            title: 'Вебинар: разбор домашней работы',
            isPublished: true,
            webinar: {
              meetingLink: 'https://meet.google.com/zsk-web-demo',
              scheduledAt: daysFromNow(3, 18),
              durationMinutes: 90,
            },
          },
          {
            key: 'web_t_js',
            orderIndex: 3,
            type: LessonType.TEST,
            title: 'Тест: JavaScript и React',
            isPublished: true,
            test: {
              passingScore: 2,
              allowMultipleAttempts: true,
              maxAttempts: 2,
              timeLimitMinutes: 15,
              questions: [
                {
                  key: 'q_js_listener',
                  text: 'Какой метод добавляет обработчик события?',
                  type: QuestionType.SINGLE_CHOICE,
                  options: [
                    { key: 'addEventListener', text: 'addEventListener', isCorrect: true },
                    { key: 'querySelector', text: 'querySelector', isCorrect: false },
                  ],
                },
                {
                  key: 'q_js_state',
                  text: 'Что верно про state в React?',
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: [
                    { key: 'rerender', text: 'Изменение state вызывает ререндер', isCorrect: true },
                    { key: 'global', text: 'State всегда глобальный', isCorrect: false },
                    { key: 'immutable', text: 'State лучше обновлять иммутабельно', isCorrect: true },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    key: 'sql',
    slug: 'sql-and-database-design',
    title: 'Базы данных и SQL',
    shortDescription: 'SELECT, JOIN, индексы и оптимизация.',
    fullDescription:
      'Курс демонстрирует реальный учебный поток: лекции, тесты, вебинар и аналитика прогресса.',
    status: CourseStatus.PUBLISHED,
    modules: [
      {
        key: 'sql_base',
        orderIndex: 1,
        title: 'SQL: базовые запросы',
        lessons: [
          {
            key: 'sql_l_select',
            orderIndex: 1,
            type: LessonType.LECTURE,
            title: 'SELECT и фильтрация',
            isPublished: true,
            lectureContent: lectureDoc('SELECT, WHERE, ORDER BY', [
              'SELECT выбирает столбцы из таблицы.',
              'WHERE фильтрует строки по условиям.',
              'ORDER BY помогает управлять порядком выдачи.',
            ]),
          },
          {
            key: 'sql_t_join',
            orderIndex: 2,
            type: LessonType.TEST,
            title: 'Тест: JOIN и агрегации',
            isPublished: true,
            test: {
              passingScore: 3,
              allowMultipleAttempts: true,
              maxAttempts: 3,
              timeLimitMinutes: 20,
              questions: [
                {
                  key: 'q_join_inner',
                  text: 'Что делает INNER JOIN?',
                  type: QuestionType.SINGLE_CHOICE,
                  options: [
                    {
                      key: 'common',
                      text: 'Возвращает совпадающие строки обеих таблиц',
                      isCorrect: true,
                    },
                    { key: 'left_all', text: 'Возвращает все строки левой таблицы', isCorrect: false },
                  ],
                },
                {
                  key: 'q_group_by',
                  text: 'Выберите верные утверждения про GROUP BY.',
                  type: QuestionType.MULTIPLE_CHOICE,
                  options: [
                    { key: 'aggr', text: 'Используется с агрегатами', isCorrect: true },
                    { key: 'always_desc', text: 'Всегда сортирует по убыванию', isCorrect: false },
                    { key: 'columns', text: 'Неагрегированные столбцы должны быть в GROUP BY', isCorrect: true },
                  ],
                },
                {
                  key: 'q_1nf',
                  text: 'Что означает 1NF?',
                  type: QuestionType.FREE_TEXT,
                  acceptedAnswers: ['Первая нормальная форма', '1NF', 'First normal form'],
                },
              ],
            },
          },
          {
            key: 'sql_wb_qa',
            orderIndex: 3,
            type: LessonType.WEBINAR,
            title: 'Вебинар: разбор SQL-кейсов',
            isPublished: true,
            webinar: {
              meetingLink: 'https://meet.google.com/zsk-sql-demo',
              scheduledAt: daysFromNow(5, 17),
              durationMinutes: 75,
            },
          },
        ],
      },
    ],
  },
  {
    key: 'se',
    slug: 'software-engineering-team-practice',
    title: 'Инженерия ПО',
    shortDescription: 'Командная разработка и процесс.',
    fullDescription: 'Черновой курс с материалами для командного мини-проекта.',
    status: CourseStatus.DRAFT,
    modules: [
      {
        key: 'se_team',
        orderIndex: 1,
        title: 'Команда и процесс',
        lessons: [
          {
            key: 'se_l_roles',
            orderIndex: 1,
            type: LessonType.LECTURE,
            title: 'Роли в команде',
            isPublished: false,
            lectureContent: lectureDoc('Роли и ответственность', [
              'Четкая роль уменьшает риск потери задач.',
              'Согласованный процесс ускоряет поставку.',
            ]),
          },
          {
            key: 'se_wb_kickoff',
            orderIndex: 2,
            type: LessonType.WEBINAR,
            title: 'Установочная встреча',
            isPublished: false,
            webinar: {
              meetingLink: 'https://meet.google.com/zsk-se-demo',
              scheduledAt: daysFromNow(10, 16),
              durationMinutes: 60,
            },
          },
        ],
      },
    ],
  },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@zskills.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
  const adminName = process.env.ADMIN_FULL_NAME ?? 'Главный администратор';

  const users: UserSeed[] = [
    {
      key: 'admin',
      email: adminEmail,
      fullName: adminName,
      role: UserRole.ADMIN,
      password: adminPassword,
    },
    {
      key: 'teacher',
      email: 'teacher.demo@zskills.local',
      fullName: 'Елена Викторовна Смирнова',
      role: UserRole.TEACHER,
      password: 'Teacher123!',
    },
    {
      key: 'demo1',
      email: 'student.demo1@zskills.local',
      fullName: 'Иван Сергеевич Крылов',
      role: UserRole.STUDENT,
      group: 'ИС-21',
      password: 'Student123!',
    },
    {
      key: 'demo2',
      email: 'student.demo2@zskills.local',
      fullName: 'Мария Андреевна Фролова',
      role: UserRole.STUDENT,
      group: 'П-31',
      password: 'Student123!',
    },
    {
      key: 's1',
      email: 'student.alexeev@zskills.local',
      fullName: 'Алексей Олегович Алексеев',
      role: UserRole.STUDENT,
      group: 'ИС-21',
      password: 'DemoGroup123!',
    },
    {
      key: 's2',
      email: 'student.kuznetsova@zskills.local',
      fullName: 'Кузнецова Полина Игоревна',
      role: UserRole.STUDENT,
      group: 'ИС-21',
      password: 'DemoGroup123!',
    },
    {
      key: 's3',
      email: 'student.morozov@zskills.local',
      fullName: 'Морозов Даниил Павлович',
      role: UserRole.STUDENT,
      group: 'ИС-22',
      password: 'DemoGroup123!',
    },
    {
      key: 's4',
      email: 'student.nikitina@zskills.local',
      fullName: 'Никитина Екатерина Романовна',
      role: UserRole.STUDENT,
      group: 'ИС-22',
      password: 'DemoGroup123!',
    },
    {
      key: 's5',
      email: 'student.petrov@zskills.local',
      fullName: 'Петров Артем Владимирович',
      role: UserRole.STUDENT,
      group: 'П-31',
      password: 'DemoGroup123!',
    },
    {
      key: 's6',
      email: 'student.sokolova@zskills.local',
      fullName: 'Соколова Анна Дмитриевна',
      role: UserRole.STUDENT,
      group: 'П-31',
      password: 'DemoGroup123!',
    },
  ];

  const usersByKey = new Map<string, EnsuredUser>();
  for (const item of users) {
    usersByKey.set(item.key, await ensureUser(item));
  }

  const teacher = usersByKey.get('teacher');
  if (!teacher) {
    throw new Error('Teacher was not ensured');
  }

  const lessonsByKey = new Map<string, EnsuredLesson>();
  const testsByLessonKey = new Map<string, TestMeta>();
  const coursesByKey = new Map<string, { id: string; slug: string }>();

  for (const courseSeed of COURSES) {
    const course = await ensureCourse(teacher.id, courseSeed);
    coursesByKey.set(courseSeed.key, { id: course.id, slug: course.slug });

    for (const moduleSeed of courseSeed.modules) {
      const module = await ensureModule(course.id, moduleSeed);

      for (const lessonSeed of moduleSeed.lessons) {
        const lesson = await ensureLesson(module.id, lessonSeed);
        lessonsByKey.set(lessonSeed.key, lesson);

        if (lessonSeed.type === LessonType.LECTURE && lessonSeed.lectureContent) {
          await prisma.lectureLesson.upsert({
            where: { lessonId: lesson.id },
            update: { content: lessonSeed.lectureContent },
            create: { lessonId: lesson.id, content: lessonSeed.lectureContent },
          });
        }

        if (lessonSeed.type === LessonType.WEBINAR && lessonSeed.webinar) {
          await prisma.webinarLesson.upsert({
            where: { lessonId: lesson.id },
            update: {
              meetingLink: lessonSeed.webinar.meetingLink,
              scheduledAt: lessonSeed.webinar.scheduledAt,
              durationMinutes: lessonSeed.webinar.durationMinutes,
            },
            create: {
              lessonId: lesson.id,
              meetingLink: lessonSeed.webinar.meetingLink,
              scheduledAt: lessonSeed.webinar.scheduledAt,
              durationMinutes: lessonSeed.webinar.durationMinutes,
            },
          });
        }

        if (lessonSeed.type === LessonType.TEST && lessonSeed.test) {
          testsByLessonKey.set(lessonSeed.key, await ensureTestContent(lesson.id, lessonSeed.test));
        }
      }
    }
  }

  const enrollmentPlan: Array<{ studentKey: string; courseKey: string; enrolledAt: Date }> = [
    { studentKey: 'demo1', courseKey: 'web', enrolledAt: daysAgo(35) },
    { studentKey: 'demo1', courseKey: 'sql', enrolledAt: daysAgo(28) },
    { studentKey: 'demo2', courseKey: 'web', enrolledAt: daysAgo(30) },
    { studentKey: 'demo2', courseKey: 'sql', enrolledAt: daysAgo(24) },
    { studentKey: 's1', courseKey: 'web', enrolledAt: daysAgo(32) },
    { studentKey: 's2', courseKey: 'web', enrolledAt: daysAgo(31) },
    { studentKey: 's3', courseKey: 'web', enrolledAt: daysAgo(29) },
    { studentKey: 's4', courseKey: 'web', enrolledAt: daysAgo(27) },
    { studentKey: 's5', courseKey: 'sql', enrolledAt: daysAgo(26) },
    { studentKey: 's6', courseKey: 'sql', enrolledAt: daysAgo(23) },
  ];

  const enrollmentsByKey = new Map<string, EnsuredEnrollment>();
  for (const item of enrollmentPlan) {
    const student = usersByKey.get(item.studentKey);
    const course = coursesByKey.get(item.courseKey);
    if (!student || !course) continue;

    const enrollment = await ensureEnrollment(course.id, student.id, item.enrolledAt);
    enrollmentsByKey.set(`${item.studentKey}:${item.courseKey}`, enrollment);
  }

  const now = new Date();
  await seedLectureProgress(lessonsByKey, enrollmentsByKey, now);
  await seedAttempts(testsByLessonKey, enrollmentsByKey, usersByKey);

  // eslint-disable-next-line no-console
  console.log('Demo LMS seed completed.');
  // eslint-disable-next-line no-console
  console.log('Teacher: teacher.demo@zskills.local / Teacher123!');
  // eslint-disable-next-line no-console
  console.log('Student #1: student.demo1@zskills.local / Student123!');
  // eslint-disable-next-line no-console
  console.log('Student #2: student.demo2@zskills.local / Student123!');
}

async function ensureUser(seed: UserSeed): Promise<EnsuredUser> {
  const email = seed.email.toLowerCase();
  const passwordHash = await getPasswordHash(seed.password);

  return prisma.user.upsert({
    where: { email },
    update: {
      fullName: seed.fullName,
      role: seed.role,
      group: seed.group ?? null,
      passwordHash,
    },
    create: {
      email,
      fullName: seed.fullName,
      role: seed.role,
      group: seed.group ?? null,
      passwordHash,
    },
    select: { id: true, email: true, fullName: true, role: true, group: true },
  });
}

async function ensureCourse(teacherId: string, seed: CourseSeed) {
  return prisma.course.upsert({
    where: { slug: seed.slug },
    update: {
      teacherId,
      title: seed.title,
      shortDescription: seed.shortDescription,
      fullDescription: seed.fullDescription,
      status: seed.status,
    },
    create: {
      teacherId,
      slug: seed.slug,
      title: seed.title,
      shortDescription: seed.shortDescription,
      fullDescription: seed.fullDescription,
      status: seed.status,
    },
    select: { id: true, slug: true },
  });
}

async function ensureModule(courseId: string, seed: ModuleSeed) {
  return prisma.courseModule.upsert({
    where: {
      courseId_orderIndex: {
        courseId,
        orderIndex: seed.orderIndex,
      },
    },
    update: {
      title: seed.title,
      description: seed.description,
    },
    create: {
      courseId,
      orderIndex: seed.orderIndex,
      title: seed.title,
      description: seed.description,
    },
    select: { id: true },
  });
}

async function ensureLesson(moduleId: string, seed: LessonSeed): Promise<EnsuredLesson> {
  return prisma.lesson.upsert({
    where: {
      moduleId_orderIndex: {
        moduleId,
        orderIndex: seed.orderIndex,
      },
    },
    update: {
      type: seed.type,
      title: seed.title,
      description: seed.description,
      isPublished: seed.isPublished ?? false,
    },
    create: {
      moduleId,
      orderIndex: seed.orderIndex,
      type: seed.type,
      title: seed.title,
      description: seed.description,
      isPublished: seed.isPublished ?? false,
    },
    select: { id: true, type: true },
  });
}

async function ensureTestContent(lessonId: string, seed: TestSeed): Promise<TestMeta> {
  const passingScore = seed.passingScore ?? null;

  await prisma.testLesson.upsert({
    where: { lessonId },
    update: {
      passingScore,
      allowMultipleAttempts: seed.allowMultipleAttempts ?? true,
      maxAttempts: seed.maxAttempts,
      timeLimitMinutes: seed.timeLimitMinutes,
    },
    create: {
      lessonId,
      passingScore,
      allowMultipleAttempts: seed.allowMultipleAttempts ?? true,
      maxAttempts: seed.maxAttempts,
      timeLimitMinutes: seed.timeLimitMinutes,
    },
  });

  const questions: QuestionMeta[] = [];

  for (let i = 0; i < seed.questions.length; i += 1) {
    const source = seed.questions[i];
    const order = i + 1;

    const matchingPairs =
      source.type === QuestionType.MATCHING
        ? (source.matchingPairs ?? []).map((pair) => ({
            leftId: randomUUID(),
            left: pair.left.trim(),
            rightId: randomUUID(),
            right: pair.right.trim(),
          }))
        : [];

    const orderingItems =
      source.type === QuestionType.ORDERING
        ? (source.orderingItems ?? []).map((text) => ({ id: randomUUID(), text: text.trim() }))
        : [];

    const acceptedAnswers =
      source.type === QuestionType.FREE_TEXT
        ? uniqueNormalizedStrings(source.acceptedAnswers ?? [])
        : [];

    const question = await prisma.testQuestion.upsert({
      where: {
        testLessonId_order: {
          testLessonId: lessonId,
          order,
        },
      },
      update: {
        text: source.text,
        type: source.type,
        explanation: source.explanation,
        points: source.points ?? 1,
        freeTextAcceptedAnswers:
          source.type === QuestionType.FREE_TEXT
            ? (acceptedAnswers as Prisma.InputJsonValue)
            : Prisma.DbNull,
        matchingPairs:
          source.type === QuestionType.MATCHING
            ? (matchingPairs as Prisma.InputJsonValue)
            : Prisma.DbNull,
        orderingItems:
          source.type === QuestionType.ORDERING
            ? (orderingItems as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
      create: {
        testLessonId: lessonId,
        order,
        text: source.text,
        type: source.type,
        explanation: source.explanation,
        points: source.points ?? 1,
        freeTextAcceptedAnswers:
          source.type === QuestionType.FREE_TEXT
            ? (acceptedAnswers as Prisma.InputJsonValue)
            : Prisma.DbNull,
        matchingPairs:
          source.type === QuestionType.MATCHING
            ? (matchingPairs as Prisma.InputJsonValue)
            : Prisma.DbNull,
        orderingItems:
          source.type === QuestionType.ORDERING
            ? (orderingItems as Prisma.InputJsonValue)
            : Prisma.DbNull,
      },
      select: { id: true, type: true, points: true },
    });

    const optionIdByKey: Record<string, string> = {};
    const correctOptionIds: string[] = [];

    if (source.type === QuestionType.SINGLE_CHOICE || source.type === QuestionType.MULTIPLE_CHOICE) {
      for (let j = 0; j < (source.options ?? []).length; j += 1) {
        const optionSeed = (source.options ?? [])[j];
        const option = await prisma.testQuestionOption.upsert({
          where: {
            questionId_order: {
              questionId: question.id,
              order: j + 1,
            },
          },
          update: {
            text: optionSeed.text,
            isCorrect: optionSeed.isCorrect,
          },
          create: {
            questionId: question.id,
            order: j + 1,
            text: optionSeed.text,
            isCorrect: optionSeed.isCorrect,
          },
          select: { id: true, isCorrect: true },
        });

        optionIdByKey[optionSeed.key] = option.id;
        if (option.isCorrect) {
          correctOptionIds.push(option.id);
        }
      }
    }

    questions.push({
      id: question.id,
      key: source.key,
      type: question.type,
      points: question.points,
      acceptedAnswers,
      optionIdByKey,
      correctOptionIds,
      matchingPairs,
      orderingItems,
    });
  }

  return {
    lessonId,
    passingScore,
    questions,
    questionByKey: Object.fromEntries(questions.map((q) => [q.key, q])) as Record<string, QuestionMeta>,
  };
}

async function ensureEnrollment(courseId: string, studentId: string, enrolledAt: Date): Promise<EnsuredEnrollment> {
  return prisma.enrollment.upsert({
    where: {
      courseId_studentId: {
        courseId,
        studentId,
      },
    },
    update: {
      status: EnrollmentStatus.ACTIVE,
      enrolledAt,
      removedAt: null,
      removedById: null,
    },
    create: {
      courseId,
      studentId,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt,
    },
    select: { id: true, courseId: true, studentId: true },
  });
}

async function seedLectureProgress(
  lessonsByKey: Map<string, EnsuredLesson>,
  enrollmentsByKey: Map<string, EnsuredEnrollment>,
  now: Date,
) {
  const progressPlan: Array<{
    enrollmentKey: string;
    completed: string[];
    inProgress: string[];
  }> = [
    {
      enrollmentKey: 'demo1:web',
      completed: ['web_l_http', 'web_l_html', 'web_l_js', 'web_wb_qa'],
      inProgress: [],
    },
    {
      enrollmentKey: 'demo2:web',
      completed: ['web_l_http'],
      inProgress: ['web_l_html', 'web_l_js'],
    },
    {
      enrollmentKey: 'demo1:sql',
      completed: ['sql_l_select', 'sql_wb_qa'],
      inProgress: [],
    },
    {
      enrollmentKey: 'demo2:sql',
      completed: ['sql_l_select'],
      inProgress: [],
    },
    {
      enrollmentKey: 's1:web',
      completed: ['web_l_http'],
      inProgress: ['web_l_html'],
    },
    {
      enrollmentKey: 's2:web',
      completed: ['web_l_http'],
      inProgress: ['web_l_html'],
    },
    {
      enrollmentKey: 's3:web',
      completed: ['web_l_http'],
      inProgress: [],
    },
    {
      enrollmentKey: 's5:sql',
      completed: ['sql_l_select'],
      inProgress: [],
    },
  ];

  for (const item of progressPlan) {
    const enrollment = enrollmentsByKey.get(item.enrollmentKey);
    if (!enrollment) continue;

    for (const key of item.completed) {
      const lesson = lessonsByKey.get(key);
      if (!lesson) continue;
      await upsertProgress({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        lessonId: lesson.id,
        status: LessonProgressStatus.COMPLETED,
        startedAt: shiftHours(now, -120),
        lastViewedAt: shiftHours(now, -72),
        completedAt: shiftHours(now, -72),
      });
    }

    for (const key of item.inProgress) {
      const lesson = lessonsByKey.get(key);
      if (!lesson) continue;
      await upsertProgress({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        lessonId: lesson.id,
        status: LessonProgressStatus.IN_PROGRESS,
        startedAt: shiftHours(now, -24),
        lastViewedAt: shiftHours(now, -2),
        completedAt: null,
      });
    }
  }
}

async function seedAttempts(
  testsByLessonKey: Map<string, TestMeta>,
  enrollmentsByKey: Map<string, EnsuredEnrollment>,
  usersByKey: Map<string, EnsuredUser>,
) {
  await ensureSubmittedAttempt({
    enrollmentKey: 'demo1:web',
    studentKey: 'demo1',
    testLessonKey: 'web_t_http_html',
    attemptNumber: 1,
    startedAt: daysAgo(12, 14),
    submittedAt: daysAgo(12, 14.3),
    answers: [
      { questionKey: 'q_http_method', optionKeys: ['get'] },
      { questionKey: 'q_semantic', optionKeys: ['header', 'article', 'section'] },
      { questionKey: 'q_html_full', textAnswer: ' hypertext   markup language ' },
      {
        questionKey: 'q_codes_match',
        matchingPairs: [
          { left: '200', right: 'OK' },
          { left: '404', right: 'Not Found' },
          { left: '500', right: 'Internal Server Error' },
        ],
      },
      {
        questionKey: 'q_request_order',
        orderingByText: [
          'Браузер отправляет запрос',
          'Сервер обрабатывает запрос',
          'Сервер отправляет ответ',
          'Браузер рендерит страницу',
        ],
      },
    ],
    testsByLessonKey,
    enrollmentsByKey,
    usersByKey,
  });

  await ensureSubmittedAttempt({
    enrollmentKey: 'demo2:web',
    studentKey: 'demo2',
    testLessonKey: 'web_t_http_html',
    attemptNumber: 1,
    startedAt: daysAgo(10, 16),
    submittedAt: daysAgo(10, 16.2),
    answers: [
      { questionKey: 'q_http_method', optionKeys: ['post'] },
      { questionKey: 'q_semantic', optionKeys: ['header', 'div'] },
      { questionKey: 'q_html_full', textAnswer: 'Some wrong answer' },
      {
        questionKey: 'q_codes_match',
        matchingPairs: [
          { left: '200', right: 'Not Found' },
          { left: '404', right: 'OK' },
          { left: '500', right: 'Internal Server Error' },
        ],
      },
      {
        questionKey: 'q_request_order',
        orderingByText: [
          'Браузер отправляет запрос',
          'Сервер отправляет ответ',
          'Сервер обрабатывает запрос',
          'Браузер рендерит страницу',
        ],
      },
    ],
    testsByLessonKey,
    enrollmentsByKey,
    usersByKey,
  });

  await ensureSubmittedAttempt({
    enrollmentKey: 'demo2:web',
    studentKey: 'demo2',
    testLessonKey: 'web_t_http_html',
    attemptNumber: 2,
    startedAt: daysAgo(8, 17),
    submittedAt: daysAgo(8, 17.3),
    answers: [
      { questionKey: 'q_http_method', optionKeys: ['get'] },
      { questionKey: 'q_semantic', optionKeys: ['header', 'article', 'section'] },
      { questionKey: 'q_html_full', textAnswer: 'HTML' },
      {
        questionKey: 'q_codes_match',
        matchingPairs: [
          { left: '200', right: 'OK' },
          { left: '404', right: 'Not Found' },
          { left: '500', right: 'Internal Server Error' },
        ],
      },
      {
        questionKey: 'q_request_order',
        orderingByText: [
          'Браузер отправляет запрос',
          'Сервер обрабатывает запрос',
          'Сервер отправляет ответ',
          'Браузер рендерит страницу',
        ],
      },
    ],
    testsByLessonKey,
    enrollmentsByKey,
    usersByKey,
  });

  await ensureSubmittedAttempt({
    enrollmentKey: 'demo1:sql',
    studentKey: 'demo1',
    testLessonKey: 'sql_t_join',
    attemptNumber: 1,
    startedAt: daysAgo(6, 13),
    submittedAt: daysAgo(6, 13.2),
    answers: [
      { questionKey: 'q_join_inner', optionKeys: ['common'] },
      { questionKey: 'q_group_by', optionKeys: ['aggr', 'columns'] },
      { questionKey: 'q_1nf', textAnswer: 'Первая нормальная форма' },
    ],
    testsByLessonKey,
    enrollmentsByKey,
    usersByKey,
  });

  await ensureInProgressAttempt({
    enrollmentKey: 's3:web',
    studentKey: 's3',
    testLessonKey: 'web_t_js',
    attemptNumber: 1,
    startedAt: daysAgo(2, 18),
    testsByLessonKey,
    enrollmentsByKey,
    usersByKey,
  });
}

async function ensureSubmittedAttempt(input: {
  enrollmentKey: string;
  studentKey: string;
  testLessonKey: string;
  attemptNumber: number;
  startedAt: Date;
  submittedAt: Date;
  answers: AttemptAnswerSeed[];
  testsByLessonKey: Map<string, TestMeta>;
  enrollmentsByKey: Map<string, EnsuredEnrollment>;
  usersByKey: Map<string, EnsuredUser>;
}) {
  const student = input.usersByKey.get(input.studentKey);
  const enrollment = input.enrollmentsByKey.get(input.enrollmentKey);
  const test = input.testsByLessonKey.get(input.testLessonKey);
  if (!student || !enrollment || !test) return;

  const attempt = await prisma.testAttempt.upsert({
    where: {
      studentId_testLessonId_attemptNumber: {
        studentId: student.id,
        testLessonId: test.lessonId,
        attemptNumber: input.attemptNumber,
      },
    },
    update: {
      enrollmentId: enrollment.id,
      startedAt: input.startedAt,
      status: TestAttemptStatus.IN_PROGRESS,
      submittedAt: null,
      score: null,
      maxScore: null,
      scorePercent: null,
      isPassed: null,
    },
    create: {
      studentId: student.id,
      testLessonId: test.lessonId,
      enrollmentId: enrollment.id,
      attemptNumber: input.attemptNumber,
      startedAt: input.startedAt,
      status: TestAttemptStatus.IN_PROGRESS,
    },
    select: { id: true },
  });

  await prisma.testAttemptAnswer.deleteMany({ where: { attemptId: attempt.id } });

  let score = 0;
  let maxScore = 0;

  for (const question of test.questions) {
    const answerSeed = input.answers.find((item) => item.questionKey === question.key);
    const result = evaluateAnswer(question, answerSeed);

    maxScore += question.points;
    score += result.pointsAwarded;

    const createdAnswer = await prisma.testAttemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
        textAnswer: result.textAnswer,
        matchingAnswer: result.matchingPairs as Prisma.InputJsonValue,
        orderingAnswer: result.orderingIds as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    if (result.optionIds.length > 0) {
      await prisma.testAttemptAnswerOption.createMany({
        data: result.optionIds.map((optionId) => ({
          attemptAnswerId: createdAnswer.id,
          optionId,
        })),
      });
    }
  }

  const scorePercent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
  const isPassed = test.passingScore === null ? true : score >= test.passingScore;

  await prisma.testAttempt.update({
    where: { id: attempt.id },
    data: {
      status: TestAttemptStatus.SUBMITTED,
      submittedAt: input.submittedAt,
      score,
      maxScore,
      scorePercent,
      isPassed,
    },
  });

  const prevProgress = await prisma.lessonProgress.findUnique({
    where: {
      studentId_lessonId: {
        studentId: student.id,
        lessonId: test.lessonId,
      },
    },
    select: { bestTestScore: true, bestTestMaxScore: true, attemptsCount: true },
  });

  const hasBetterScore = prevProgress?.bestTestScore === null || prevProgress?.bestTestScore === undefined
    ? true
    : score > prevProgress.bestTestScore;

  await prisma.lessonProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId: student.id,
        lessonId: test.lessonId,
      },
    },
    update: {
      enrollmentId: enrollment.id,
      status: LessonProgressStatus.COMPLETED,
      startedAt: input.startedAt,
      lastViewedAt: input.submittedAt,
      completedAt: input.submittedAt,
      attemptsCount: Math.max(prevProgress?.attemptsCount ?? 0, input.attemptNumber),
      bestTestScore: hasBetterScore ? score : prevProgress?.bestTestScore,
      bestTestMaxScore: hasBetterScore ? maxScore : prevProgress?.bestTestMaxScore,
    },
    create: {
      enrollmentId: enrollment.id,
      studentId: student.id,
      lessonId: test.lessonId,
      status: LessonProgressStatus.COMPLETED,
      startedAt: input.startedAt,
      lastViewedAt: input.submittedAt,
      completedAt: input.submittedAt,
      attemptsCount: input.attemptNumber,
      bestTestScore: score,
      bestTestMaxScore: maxScore,
    },
  });
}

async function ensureInProgressAttempt(input: {
  enrollmentKey: string;
  studentKey: string;
  testLessonKey: string;
  attemptNumber: number;
  startedAt: Date;
  testsByLessonKey: Map<string, TestMeta>;
  enrollmentsByKey: Map<string, EnsuredEnrollment>;
  usersByKey: Map<string, EnsuredUser>;
}) {
  const student = input.usersByKey.get(input.studentKey);
  const enrollment = input.enrollmentsByKey.get(input.enrollmentKey);
  const test = input.testsByLessonKey.get(input.testLessonKey);
  if (!student || !enrollment || !test) return;

  await prisma.testAttempt.upsert({
    where: {
      studentId_testLessonId_attemptNumber: {
        studentId: student.id,
        testLessonId: test.lessonId,
        attemptNumber: input.attemptNumber,
      },
    },
    update: {
      enrollmentId: enrollment.id,
      status: TestAttemptStatus.IN_PROGRESS,
      startedAt: input.startedAt,
      submittedAt: null,
      score: null,
      maxScore: null,
      scorePercent: null,
      isPassed: null,
    },
    create: {
      studentId: student.id,
      testLessonId: test.lessonId,
      enrollmentId: enrollment.id,
      attemptNumber: input.attemptNumber,
      status: TestAttemptStatus.IN_PROGRESS,
      startedAt: input.startedAt,
    },
  });

  await upsertProgress({
    enrollmentId: enrollment.id,
    studentId: student.id,
    lessonId: test.lessonId,
    status: LessonProgressStatus.IN_PROGRESS,
    startedAt: input.startedAt,
    lastViewedAt: input.startedAt,
    completedAt: null,
  });
}

function evaluateAnswer(question: QuestionMeta, seed?: AttemptAnswerSeed) {
  if (question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) {
    const optionIds = Array.from(
      new Set((seed?.optionKeys ?? []).map((key) => question.optionIdByKey[key]).filter(Boolean)),
    );
    const sortedSubmitted = [...optionIds].sort();
    const sortedCorrect = [...question.correctOptionIds].sort();

    const isCorrect =
      sortedSubmitted.length === sortedCorrect.length &&
      sortedSubmitted.every((id, index) => id === sortedCorrect[index]);

    return {
      optionIds,
      textAnswer: null,
      matchingPairs: [] as Array<{ leftId: string; rightId: string }>,
      orderingIds: [] as string[],
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
    };
  }

  if (question.type === QuestionType.FREE_TEXT) {
    const textAnswer = (seed?.textAnswer ?? '').trim();
    const normalized = normalizeComparable(textAnswer);
    const accepted = new Set(question.acceptedAnswers.map((item) => normalizeComparable(item)));
    const isCorrect = normalized.length > 0 && accepted.has(normalized);

    return {
      optionIds: [] as string[],
      textAnswer,
      matchingPairs: [] as Array<{ leftId: string; rightId: string }>,
      orderingIds: [] as string[],
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
    };
  }

  if (question.type === QuestionType.MATCHING) {
    const leftByNormalized = new Map(
      question.matchingPairs.map((pair) => [normalizeComparable(pair.left), pair]),
    );
    const rightIdByLeftAndRight = new Map<string, string>();

    for (const pair of question.matchingPairs) {
      rightIdByLeftAndRight.set(
        `${normalizeComparable(pair.left)}__${normalizeComparable(pair.right)}`,
        pair.rightId,
      );
    }

    const submittedPairs: Array<{ leftId: string; rightId: string }> = [];
    for (const item of seed?.matchingPairs ?? []) {
      const leftNorm = normalizeComparable(item.left);
      const rightNorm = normalizeComparable(item.right);
      const left = leftByNormalized.get(leftNorm);
      const rightId = rightIdByLeftAndRight.get(`${leftNorm}__${rightNorm}`);
      if (!left || !rightId) continue;
      submittedPairs.push({ leftId: left.leftId, rightId });
    }

    const uniqueSubmitted = Array.from(
      new Map(submittedPairs.map((pair) => [pair.leftId, pair.rightId])).entries(),
    ).map(([leftId, rightId]) => ({ leftId, rightId }));

    const isCorrect =
      uniqueSubmitted.length === question.matchingPairs.length &&
      question.matchingPairs.every((pair) =>
        uniqueSubmitted.some((item) => item.leftId === pair.leftId && item.rightId === pair.rightId),
      );

    return {
      optionIds: [] as string[],
      textAnswer: null,
      matchingPairs: uniqueSubmitted,
      orderingIds: [] as string[],
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
    };
  }

  const orderIdByText = new Map(
    question.orderingItems.map((item) => [normalizeComparable(item.text), item.id]),
  );
  const orderingIds = Array.from(
    new Set(
      (seed?.orderingByText ?? [])
        .map((text) => orderIdByText.get(normalizeComparable(text)))
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const correctIds = question.orderingItems.map((item) => item.id);
  const isCorrect =
    orderingIds.length === correctIds.length &&
    orderingIds.every((id, index) => id === correctIds[index]);

  return {
    optionIds: [] as string[],
    textAnswer: null,
    matchingPairs: [] as Array<{ leftId: string; rightId: string }>,
    orderingIds,
    isCorrect,
    pointsAwarded: isCorrect ? question.points : 0,
  };
}

async function upsertProgress(input: {
  enrollmentId: string;
  studentId: string;
  lessonId: string;
  status: LessonProgressStatus;
  startedAt: Date | null;
  lastViewedAt: Date | null;
  completedAt: Date | null;
}) {
  await prisma.lessonProgress.upsert({
    where: {
      studentId_lessonId: {
        studentId: input.studentId,
        lessonId: input.lessonId,
      },
    },
    update: {
      enrollmentId: input.enrollmentId,
      status: input.status,
      startedAt: input.startedAt,
      lastViewedAt: input.lastViewedAt,
      completedAt: input.completedAt,
    },
    create: {
      enrollmentId: input.enrollmentId,
      studentId: input.studentId,
      lessonId: input.lessonId,
      status: input.status,
      startedAt: input.startedAt,
      lastViewedAt: input.lastViewedAt,
      completedAt: input.completedAt,
      attemptsCount: 0,
    },
  });
}

function lectureDoc(title: string, paragraphs: string[]): Prisma.InputJsonValue {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: title }],
      },
      ...paragraphs.map((paragraph) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: paragraph }],
      })),
    ],
  } as Prisma.InputJsonValue;
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function uniqueNormalizedStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalized = normalizeComparable(trimmed);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(trimmed);
  }
  return result;
}

function daysAgo(days: number, hour = 12) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  date.setHours(h, m, 0, 0);
  return date;
}

function daysFromNow(days: number, hour = 12) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  date.setHours(h, m, 0, 0);
  return date;
}

function shiftHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

async function getPasswordHash(password: string) {
  const cached = passwordHashCache.get(password);
  if (cached) return cached;
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  passwordHashCache.set(password, hash);
  return hash;
}

main()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

