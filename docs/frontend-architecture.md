# Next.js Frontend Architecture (MVP)

## 1) Folder Structure

```text
apps/web
|- src/
|  |- app/
|  |  |- layout.tsx
|  |  |- globals.css
|  |  |- loading.tsx
|  |  |- not-found.tsx
|  |  |- (public)/
|  |  |  |- layout.tsx
|  |  |  |- page.tsx
|  |  |  |- courses/page.tsx
|  |  |  |- courses/[courseId]/page.tsx
|  |  |- (auth)/
|  |  |  |- layout.tsx
|  |  |  |- login/page.tsx
|  |  |  |- register/page.tsx
|  |  |- (student)/
|  |  |  |- layout.tsx
|  |  |  |- student/dashboard/page.tsx
|  |  |  |- student/courses/[courseId]/page.tsx
|  |  |  |- student/lessons/[lessonId]/page.tsx
|  |  |  |- student/statistics/page.tsx
|  |  |- (teacher)/
|  |     |- layout.tsx
|  |     |- teacher/dashboard/page.tsx
|  |     |- teacher/courses/new/page.tsx
|  |     |- teacher/courses/[courseId]/edit/page.tsx
|  |     |- teacher/statistics/page.tsx
|  |- components/
|  |  |- layout/
|  |  |- ui/
|  |- features/
|  |  |- auth/components/
|  |  |- courses/components/
|  |  |- lessons/components/
|  |  |- statistics/components/
|  |- hooks/
|  |- lib/
|  |  |- api/
|  |  |- auth/
|  |  |- utils/
|  |- types/
|  |- config/
|  |- providers/
```

## 2) Route Groups

- `(public)`:
  - Landing and public course catalog.
- `(auth)`:
  - Login and registration pages.
  - Redirect authenticated users to role dashboard.
- `(student)`:
  - Student-only dashboard, course view, lesson view, personal stats.
- `(teacher)`:
  - Teacher-only dashboard, course authoring, analytics views.

## 3) Shared Layout Structure

- `app/layout.tsx`:
  - Global metadata, fonts, global styles, providers.
- `components/layout/public-header.tsx`:
  - Public navigation bar and auth CTA buttons.
- `components/layout/role-protected-shell.tsx`:
  - Shared dashboard shell for role-based sections.
  - Left sidebar (`side-nav`) + top bar (`topbar`) + content area.

## 4) Reusable UI Blocks

- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/progress-bar.tsx`
- `components/ui/page-header.tsx`
- `components/ui/stat-card.tsx`
- `components/ui/empty-state.tsx`

These blocks keep a consistent dashboard style and reduce duplication across student/teacher flows.

## 5) API Calls Organization

- `lib/api/client.ts`:
  - Shared typed request helper (`apiRequest`) with token support and normalized error handling.
- Feature API modules:
  - `lib/api/auth-api.ts`
  - `lib/api/courses-api.ts`
  - `lib/api/lessons-api.ts`
  - `lib/api/statistics-api.ts`
- Barrel export:
  - `lib/api/index.ts`

Pattern:
- Keep API methods grouped by backend module.
- Keep request/response types in `types/`.
- Keep UI components free from raw fetch details.

## 6) Frontend Auth Checks

- Session state in Zustand persist store:
  - `lib/auth/auth-store.ts`
  - stores `accessToken`, `user`, `status`, `hydrated`.
- `hooks/use-auth.ts`:
  - central auth helper for components.
- `hooks/use-auth-redirect.ts`:
  - route guard hook used by role layouts.
- `components/layout/role-protected-shell.tsx`:
  - enforces role-based access for student/teacher groups.

MVP behavior:
- If unauthenticated, redirect to `/login?next=...`.
- If authenticated but wrong role, redirect to correct dashboard.

Future upgrade path:
- migrate token storage from localStorage to HTTP-only cookies with Next Route Handlers/BFF.

## UI Layout Recommendations (LMS-style)

- Keep a clear two-zone dashboard: fixed navigation + high-density content area.
- Use page-level KPI rows before detailed tables/lists.
- Use consistent content rhythm: header -> KPIs -> main cards -> activity.
- Keep student pages outcome-oriented (progress, next lesson, deadlines).
- Keep teacher pages management-oriented (enrollment, score distribution, completion trend).
- Use subtle gradients and neutral blue/teal accents for educational tone.