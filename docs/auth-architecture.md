# Auth & Authorization (MVP)

## 1) Auth Flow

1. User sends `POST /api/auth/register` with `email`, `password`, `fullName`, `role`.
2. Backend validates DTO, hashes password with bcrypt, stores `User`.
3. Backend signs JWT access token and returns `{ accessToken, user }`.
4. User sends `POST /api/auth/login` with credentials.
5. Backend verifies password and returns `{ accessToken, user }`.
6. Frontend stores session in Zustand (`accessToken` + `user`) for MVP.
7. Frontend sends `Authorization: Bearer <token>` to protected endpoints.
8. Backend `JwtStrategy` decodes token and injects authenticated user into `req.user`.
9. `GET /api/auth/me` returns current profile.
10. Role guards block unauthorized role access for student/teacher areas.

## 2) DTOs

- `RegisterDto`
  - `email: string` (email format)
  - `password: string` (min 6)
  - `fullName: string` (min 2)
  - `role: STUDENT | TEACHER`
- `LoginDto`
  - `email: string`
  - `password: string`

## 3) NestJS Auth Module Structure

```text
apps/api/src/auth
|- auth.module.ts
|- auth.controller.ts
|- auth.service.ts
|- dto/
|  |- register.dto.ts
|  |- login.dto.ts
|- guards/
|  |- jwt-auth.guard.ts
|- strategies/
|  |- jwt.strategy.ts
|- types/
   |- jwt-payload.type.ts
```

Shared authz files:

```text
apps/api/src/common
|- decorators/
|  |- current-user.decorator.ts
|  |- roles.decorator.ts
|- guards/
|  |- roles.guard.ts
|  |- student-role.guard.ts
|  |- teacher-role.guard.ts
|- enums/
|  |- user-role.enum.ts
|- types/
   |- auth-user.type.ts
```

## 4) Backend Endpoints (Implemented Skeleton)

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (JWT protected)

## 5) Role-Based Authorization

Implemented options:

- Generic guard style:
  - `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.STUDENT)`
  - `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.TEACHER)`
- Explicit role guards:
  - `@UseGuards(JwtAuthGuard, StudentRoleGuard)`
  - `@UseGuards(JwtAuthGuard, TeacherRoleGuard)`

Example controller: `apps/api/src/demo/demo-protected.controller.ts`

## 6) Frontend Auth State (MVP)

Files:
- `apps/web/src/lib/auth/auth-store.ts`
- `apps/web/src/lib/auth/auth-api.ts`
- `apps/web/src/lib/auth/auth-types.ts`

State fields:
- `accessToken`
- `user`
- `status`

Store actions:
- `setSession`
- `clearSession`
- `hasRole`

## 7) Suggested Next.js App Router Route Groups

```text
app/
|- (public)/
|  |- page.tsx
|  |- courses/page.tsx
|
|- (auth)/
|  |- login/page.tsx
|  |- register/page.tsx
|
|- (student)/
|  |- dashboard/page.tsx
|  |- courses/[courseId]/page.tsx
|  |- lessons/[lessonId]/page.tsx
|
|- (teacher)/
   |- dashboard/page.tsx
   |- courses/new/page.tsx
   |- courses/[courseId]/edit/page.tsx
```

Access rules:
- `(public)`: no auth required
- `(student)`: authenticated + role `STUDENT`
- `(teacher)`: authenticated + role `TEACHER`

## Prisma-Compatible User Model Assumptions

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  fullName     String
  role         UserRole
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

enum UserRole {
  STUDENT
  TEACHER
}
```