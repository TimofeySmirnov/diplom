# MVP Educational Platform Page Map

## 1) Sitemap

```text
/
|- /courses
|  |- /courses/[courseId]
|- /join/[token]
|- /login
|- /register

/student/dashboard
/student/courses
/student/courses/[courseId]
/student/courses/[courseId]/modules/[moduleId]
/student/lessons/[lessonId]
/student/progress
/student/statistics

/teacher/dashboard
/teacher/courses
/teacher/courses/new
/teacher/courses/[courseId]/edit
/teacher/courses/[courseId]/modules/[moduleId]/edit
/teacher/courses/[courseId]/analytics
/teacher/statistics
```

## 2) Route List (MVP)

### Guest/Public
- `GET /` - landing page
- `GET /courses` - public course catalog
- `GET /courses/[courseId]` - public course details and CTA
- `GET /join/[token]` - invitation link landing (login/register before redeem)
- `GET /login` - login form
- `GET /register` - registration form

### Student
- `GET /student/dashboard` - student home with KPI overview and continue learning
- `GET /student/courses` - enrolled courses list
- `GET /student/courses/[courseId]` - course syllabus and module cards
- `GET /student/courses/[courseId]/modules/[moduleId]` - module lesson list
- `GET /student/lessons/[lessonId]` - lesson runtime page (lecture/test/webinar)
- `GET /student/progress` - progress-centric page with completion timeline
- `GET /student/statistics` - personal analytics page

### Teacher
- `GET /teacher/dashboard` - teacher home with global KPIs
- `GET /teacher/courses` - teacher course list and status
- `GET /teacher/courses/new` - create course wizard/form
- `GET /teacher/courses/[courseId]/edit` - full course editor
- `GET /teacher/courses/[courseId]/modules/[moduleId]/edit` - module editor
- `GET /teacher/courses/[courseId]/analytics` - course-specific analytics
- `GET /teacher/statistics` - cross-course analytics summary

## 3) Navigation Logic Per Role

### Guest
- Default entry: `/`
- Primary navigation: Landing, Courses, Login, Register
- Invitation deep link: `/join/[token]`
- If authenticated and visiting `/login` or `/register` -> redirect to role dashboard

### Student
- Default entry after login: `/student/dashboard`
- Sidebar: Dashboard, My Courses, Progress, My Stats
- Role guard:
  - Not authenticated -> redirect `/login?next=...`
  - Authenticated but `TEACHER` role -> redirect `/teacher/dashboard`

### Teacher
- Default entry after login: `/teacher/dashboard`
- Sidebar: Dashboard, Courses, New Course, Statistics
- Role guard:
  - Not authenticated -> redirect `/login?next=...`
  - Authenticated but `STUDENT` role -> redirect `/student/dashboard`

## 4) Sidebar/Header Structure

### Shared Dashboard Shell
- Left Sidebar:
  - Role-specific menu
  - Active route highlight
  - Optional badges (`Draft`, `Due`, `New`)
- Top Header:
  - Workspace title and page context
  - User block (name + role)
  - Quick actions (create course, sign out)

### Public Header
- Brand, main links (`Courses`), auth CTAs (`Log in`, `Sign up`)
- Sticky behavior with light blur for modern LMS look

## 5) What Each Page Should Show

### Landing `/`
- Hero with clear value proposition
- 3 strong feature cards (Student Journey / Teacher Workspace / Analytics)
- CTA buttons to browse courses and register

### Login `/login`
- Email/password form
- Error feedback
- Redirect handling via `next` query param

### Register `/register`
- Full name/email/password/role
- Role selector (`Student` or `Teacher`)
- On success: redirect by role

### Public Courses `/courses`
- Search/filter bar (MVP can be static)
- Course cards with title, description, tag
- Click-through to course detail

### Public Course Detail `/courses/[courseId]`
- Course summary, learning outcomes, curriculum preview
- CTA to register/login or join if invited

### Invitation Page `/join/[token]`
- Invitation token context
- Login/register CTA
- Post-auth flow should redeem token and open enrolled course

### Student Dashboard `/student/dashboard`
- KPI strip: active courses, completed lessons, average score, attendance
- Continue-learning course cards
- Recent activity feed

### Student Courses `/student/courses`
- All enrolled courses
- Progress bars and continue buttons

### Student Course `/student/courses/[courseId]`
- Course-level syllabus
- Modules list with status
- Entry points to module pages

### Student Module `/student/courses/[courseId]/modules/[moduleId]`
- Lesson list with type badges (`Lecture`, `Test`, `Webinar`)
- Completion status per lesson

### Student Lesson `/student/lessons/[lessonId]`
- Lesson header + type badge
- Dynamic body:
  - Lecture: rich content + mark complete
  - Test: questions + submit attempt + score
  - Webinar: meeting info + complete button

### Student Progress `/student/progress`
- Progress-focused KPI row
- Timeline/trend view by week
- Pending lessons/tasks section

### Student Statistics `/student/statistics`
- Personal completion charts
- Best score and attempt metrics
- Recent assessment outcomes

### Teacher Dashboard `/teacher/dashboard`
- KPI strip: courses, active students, avg completion, avg scores
- Recent teaching activity
- Quick CTA: create course

### Teacher Courses `/teacher/courses`
- Course inventory with publish status
- Quick links to edit/analytics pages

### Teacher New Course `/teacher/courses/new`
- Create form (title, description, slug)
- Draft save + publish later

### Teacher Course Edit `/teacher/courses/[courseId]/edit`
- Course settings
- Modules list and reordering
- Lesson creation entrypoints

### Teacher Module Edit `/teacher/courses/[courseId]/modules/[moduleId]/edit`
- Module metadata
- Lesson CRUD and reorder list
- Lesson type editors

### Teacher Course Analytics `/teacher/courses/[courseId]/analytics`
- Course-specific KPIs (completion, score, risk group)
- Module drop-off breakdown
- Test performance summary

### Teacher Statistics `/teacher/statistics`
- Cross-course analytics overview
- Compare performance between courses
- Drilldown links to per-course analytics

## Demo-Ready UX Direction

- Keep dashboard structure consistent across roles for easy live demo narration.
- Prefer high-contrast KPI cards and compact activity blocks for visual clarity on projector.
- Use a clean blue/teal academic palette with soft gradients and generous white space.
- Show role-specific value immediately on dashboards to make the diploma storyline obvious.