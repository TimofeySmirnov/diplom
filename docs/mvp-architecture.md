# Educational Platform MVP Architecture

## 1) Project Architecture (Monorepo)

Chosen structure: **monorepo** with independent web and api apps plus shared packages.

Why this for MVP:
- Fast local development and single dependency graph.
- Shared DTO/types/validation schemas between frontend and backend.
- Easy to demo full-stack flow from one repository.

Top-level:
- `apps/web` - Next.js (App Router, TypeScript, Tailwind, React Hook Form + Zod)
- `apps/api` - NestJS (TypeScript, Prisma, PostgreSQL)
- `packages/ui` - shared UI primitives (optional in MVP, can start small)
- `packages/types` - shared TS domain types / API contracts
- `packages/config` - shared lint/tsconfig presets
- `docs` - architecture and delivery docs

Operational launch for Windows classrooms is documented separately in
`docs/windows-launcher.md`.

## 2) Folder Structure

```text
.
|- apps/
|  |- web/
|  |  |- src/
|  |  |  |- app/
|  |  |  |  |- (public)/
|  |  |  |  |  |- page.tsx                 # landing/catalog
|  |  |  |  |- (student)/
|  |  |  |  |  |- dashboard/page.tsx
|  |  |  |  |  |- courses/[courseId]/page.tsx
|  |  |  |  |  |- lessons/[lessonId]/page.tsx
|  |  |  |  |- (teacher)/
|  |  |  |  |  |- dashboard/page.tsx
|  |  |  |  |  |- courses/new/page.tsx
|  |  |  |  |  |- courses/[courseId]/edit/page.tsx
|  |  |  |  |- api/                         # Next route handlers if needed
|  |  |  |- components/
|  |  |  |  |- course/
|  |  |  |  |- lesson/
|  |  |  |  |- forms/
|  |  |  |- lib/
|  |  |  |  |- api-client.ts
|  |  |  |  |- auth.ts
|  |  |  |- stores/                         # Zustand only if state grows
|  |  |  |- hooks/
|  |  |  |- types/
|  |  |- public/
|  |  |- tailwind.config.ts
|  |  |- next.config.ts
|  |
|  |- api/
|     |- src/
|     |  |- main.ts
|     |  |- app.module.ts
|     |  |- common/
|     |  |  |- guards/
|     |  |  |- decorators/
|     |  |  |- filters/
|     |  |- modules/
|     |  |  |- auth/
|     |  |  |- users/
|     |  |  |- courses/
|     |  |  |- modules/
|     |  |  |- lessons/
|     |  |  |- enrollments/
|     |  |  |- progress/
|     |  |  |- tests/
|     |  |  |- webinars/
|     |  |- prisma/
|     |     |- prisma.service.ts
|     |- prisma/
|     |  |- schema.prisma
|     |  |- migrations/
|     |- test/
|
|- packages/
|  |- types/
|  |- ui/
|  |- config/
|
|- docs/
|  |- mvp-architecture.md
|- .env.example
|- package.json
|- pnpm-workspace.yaml
```

## 3) Main Architectural Decisions

- **Single API (NestJS) + SPA/SSR frontend (Next.js)**.
- **PostgreSQL + Prisma** as source of truth.
- **Role-based access**: `STUDENT`, `TEACHER` with backend guards.
- **Lesson polymorphism via enum + optional payload fields** (Lecture/Test/Webinar) for MVP simplicity.
- **Progress model per lesson enrollment** for quick dashboard metrics.
- **Test attempts immutable** (store each attempt and score history).
- **Auth for MVP**: email/password + JWT (access token). Can add refresh token later.
- **Validation**: Zod on frontend forms, class-validator DTOs on backend.
- **Styling**: Tailwind with reusable section/card/list primitives.

## 4) High-Level Entities & Relationships

- `User`
  - fields: id, email, passwordHash, role, fullName, createdAt
  - relations:
    - teacher owns many `Course`
    - student has many `Enrollment`

- `Course`
  - fields: id, title, description, coverImage, teacherId, published
  - relations:
    - belongs to one teacher (`User`)
    - has many `CourseModule`
    - has many `Enrollment`

- `CourseModule`
  - fields: id, courseId, title, order
  - relations:
    - belongs to one `Course`
    - has many `Lesson`

- `Lesson`
  - fields: id, moduleId, title, type(`LECTURE|TEST|WEBINAR`), order, content, videoUrl, webinarStartAt, webinarLink, testConfigJson
  - relations:
    - belongs to one `CourseModule`
    - has many `Progress`
    - has many `TestAttempt` (when type = TEST)

- `Enrollment`
  - fields: id, studentId, courseId, enrolledAt, status
  - relations:
    - belongs to one student (`User`)
    - belongs to one `Course`

- `Progress`
  - fields: id, studentId, lessonId, completedAt, lastSeenAt
  - relations:
    - belongs to one student (`User`)
    - belongs to one `Lesson`

- `TestAttempt`
  - fields: id, studentId, lessonId, answersJson, score, maxScore, startedAt, submittedAt
  - relations:
    - belongs to one student (`User`)
    - belongs to one test `Lesson`

## 5) Feature Breakdown (MVP)

Student features:
- Sign in / sign up
- Browse published courses
- Enroll into course
- Open course syllabus (modules + lessons)
- Complete lecture lesson
- Pass test lesson and get score
- See webinar info (time/link)
- Track own course progress

Teacher features:
- Sign in
- Create/edit/publish course
- Manage modules and lessons order
- Create lecture/test/webinar lesson
- View enrolled students and basic progress
- View test attempts summary

Cross-cutting:
- RBAC
- Input validation
- Error handling
- Basic seed script for demo data

## 6) Step-by-Step Implementation Order

1. **Workspace bootstrap**
   - initialize monorepo (`pnpm` workspaces)
   - create Next.js and NestJS apps
   - add shared TS configs

2. **Backend foundation**
   - setup Nest modules skeleton
   - setup Prisma + PostgreSQL connection
   - implement Prisma schema for core entities
   - run first migration + seed

3. **Auth + RBAC**
   - JWT auth endpoints (`/auth/register`, `/auth/login`)
   - guards/decorators for student/teacher routes

4. **Course authoring APIs (teacher)**
   - CRUD courses/modules/lessons
   - publish/unpublish course

5. **Student learning APIs**
   - list published courses
   - enroll endpoint
   - progress update endpoint
   - test attempt submission and scoring

6. **Frontend shell (Next App Router)**
   - global layout, navigation, role-aware menus
   - auth pages and session handling

7. **Teacher UI**
   - dashboard with own courses
   - course builder forms (RHF + Zod)
   - lesson type editors

8. **Student UI**
   - catalog + course detail
   - lesson player pages (lecture/test/webinar)
   - progress indicators

9. **Demo readiness**
   - seed realistic demo data
   - polish UI (SkillSpace-inspired, original branding)
   - smoke tests for key flows

## MVP Scope Limits (for diploma demo)

Included:
- Core learning lifecycle end-to-end
- Real DB persistence
- Two roles with practical workflows

Deferred:
- Payments
- Certificates
- Messaging/chat
- Video streaming pipeline
- Advanced analytics
- File storage integration
