# NestJS Backend Feature Module Structure (MVP)

## Proposed Module Structure

```text
apps/api/src
|- app.module.ts
|- main.ts
|- prisma/
|  |- prisma.module.ts
|  |- prisma.service.ts
|- common/
|  |- common.module.ts
|  |- decorators/
|  |  |- current-user.decorator.ts
|  |  |- roles.decorator.ts
|  |- guards/
|  |  |- roles.guard.ts
|  |  |- student-role.guard.ts
|  |  |- teacher-role.guard.ts
|  |- enums/
|  |  |- user-role.enum.ts
|  |- types/
|     |- auth-user.type.ts
|- auth/
|- users/
|- courses/
|- modules/
|- lessons/
|- enrollments/
|- invitations/
|- progress/
|- tests/
|- statistics/
```

## Responsibility by Module

1. `auth`
- Register/login/JWT issuance
- Current user endpoint (`/auth/me`)
- Password hashing with bcrypt

2. `users`
- Current profile and user directory (teacher view)
- Public-safe user projections (without `passwordHash`)

3. `courses`
- Course CRUD for teacher
- Public course catalog
- Publish/archive lifecycle

4. `modules`
- Course module (section) management
- Ordering inside a course

5. `lessons`
- Lesson CRUD with lesson type payloads
- Support for `LECTURE`, `TEST`, `WEBINAR`

6. `enrollments`
- Student enrollments list
- Teacher removal of students from course

7. `invitations`
- Invitation link generation/deactivation
- Token redeem flow -> enrollment attach

8. `progress`
- Student lesson progress tracking
- Mark lesson started/completed

9. `tests`
- Test attempts lifecycle
- Submission + automatic score calculation
- Store detailed answers and selected options

10. `statistics`
- Teacher course-level aggregates
- Teacher student-level aggregates

## Controllers & Services (REST)

- `AuthController` + `AuthService`
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/me`

- `UsersController` + `UsersService`
  - `GET /users/me`
  - `GET /users`
  - `GET /users/:id`

- `CoursesController` + `CoursesService`
  - `GET /courses/public`
  - `GET /courses/my`
  - `GET /courses/:courseId`
  - `POST /courses`
  - `PATCH /courses/:courseId`
  - `POST /courses/:courseId/publish`
  - `POST /courses/:courseId/archive`

- `ModulesController` + `ModulesService`
  - `GET /modules/course/:courseId`
  - `POST /modules`
  - `PATCH /modules/:moduleId`
  - `DELETE /modules/:moduleId`

- `LessonsController` + `LessonsService`
  - `GET /lessons/module/:moduleId`
  - `GET /lessons/:lessonId`
  - `POST /lessons`
  - `PATCH /lessons/:lessonId`
  - `DELETE /lessons/:lessonId`

- `EnrollmentsController` + `EnrollmentsService`
  - `GET /enrollments/my`
  - `GET /enrollments/course/:courseId`
  - `DELETE /enrollments/:enrollmentId`

- `InvitationsController` + `InvitationsService`
  - `POST /invitations/course/:courseId`
  - `GET /invitations/course/:courseId`
  - `PATCH /invitations/:invitationId/deactivate`
  - `POST /invitations/redeem`

- `ProgressController` + `ProgressService`
  - `GET /progress/my/course/:courseId`
  - `POST /progress/lessons/:lessonId/start`
  - `POST /progress/lessons/:lessonId/complete`

- `TestsController` + `TestsService`
  - `POST /tests/lessons/:lessonId/attempts`
  - `POST /tests/attempts/:attemptId/submit`
  - `GET /tests/lessons/:lessonId/attempts/my`
  - `GET /tests/lessons/:lessonId/attempts`

- `StatisticsController` + `StatisticsService`
  - `GET /statistics/courses/:courseId`
  - `GET /statistics/courses/:courseId/students/:studentId`

## Shared Guards/Decorators

- `CurrentUser` decorator for extracting JWT user payload from request.
- `Roles` decorator + `RolesGuard` for enum-based role checks.
- `StudentRoleGuard` and `TeacherRoleGuard` for explicit role-protected endpoints.
- `JwtAuthGuard` for bearer-token protection.

## Prisma Service Setup

- `PrismaService` extends `PrismaClient`.
- Connection opens on module init (`$connect`).
- Graceful shutdown hook closes Nest app on Prisma `beforeExit`.
- `PrismaModule` is global provider and used by all feature modules.

## Validation Pipe Setup

Configured globally in `main.ts`:
- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`
- `enableImplicitConversion: true`

## Bootstrap Best Practices Applied

- Global API prefix (`API_PREFIX`, default `api`)
- CORS with env-driven origin list (`CORS_ORIGIN`)
- Global DTO validation
- Graceful shutdown hooks (`app.enableShutdownHooks`, Prisma hook)
- Startup logger with final API URL