# Frontend Auth (MVP)

Session state:
- Stored in Zustand persist store (`auth-store.ts`).
- Fields: `accessToken`, `user`, `status`, `hydrated`.

API integration:
- Use `authApi` from `src/lib/api/auth-api.ts`.
- `auth-api.ts` in this folder re-exports from `lib/api` for compatibility.

Route protection:
- `use-auth-redirect` enforces login and role checks.
- `role-protected-shell` is used by student/teacher route-group layouts.

Future hardening:
- Replace localStorage token with HTTP-only cookie via Next Route Handlers.