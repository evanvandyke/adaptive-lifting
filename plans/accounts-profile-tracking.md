# Accounts, profile and body tracking: burn-down

What a person can do with their account beyond the workout. Nothing here blocks lifting. Accounts and workout history already live in the app's own Supabase project, so everything below adds on without anyone starting over.

## Accounts

- [ ] Forgotten password: there is no reset screen. Until there is, Evan resets a password from the Supabase dashboard (Authentication, Users).
- [ ] Google sign-in. Needs a Google Cloud OAuth client (about ten minutes of clicking for Evan), the provider switched on in Supabase, and a button on the sign-in screens. The callback route is already open to signed-out visitors.
- [ ] If email confirmation is ever switched back on: set `NEXT_PUBLIC_SITE_URL` on Vercel, or confirmation links point at localhost (`src/app/(auth)/signup/page.tsx`).
- [ ] Passwords have a six-character minimum. Raise it if the app is ever shared beyond family.

## Profile

- [ ] A basic profile screen in the Signal look: name, sign out, sound, home or gym default.
- [ ] A new table for it (`lifting_profiles` was the old app's; design this one fresh, owner-only like the others).

## Body tracking (Evan asked for these two by name)

- [ ] Body weight: quick entry, simple trend.
- [ ] Blood pressure: quick entry of both numbers, simple trend.
- [ ] One new owner-only table for measurements, added to `supabase/signal-tables.sql`.

## Parked, decide before building

- [ ] Progress photos (camera upload, scroll back through them). On the agenda as a committed item from the original plan.
- [ ] Export your data as a file.
- [ ] A nudge after missed sessions.
