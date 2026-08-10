# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

SLearno — an intern self-learning app (see `.claude/specs/spec.md` for the full product spec). Interns get a diagnostic-generated daily routine, track consistency/streaks, log notes with spaced recall, clear doubts anonymously, browse a resource library, get evening nudges, review adaptive flashcards, match with a practice partner, answer a daily curiosity prompt, and take a distraction-free reflection block. Mentor-side tooling and auth/security hardening are explicitly out of scope for this build — it's intern-only, single-device.

## Commands

- `npm install` — install dependencies
- `npx expo start` — start the dev server (press `a`/`i`/`w` to open Android/iOS/web, or scan the QR with Expo Go). **Test on iOS/Android, not web** — `moti`'s web driver (`framer-motion`) fails to bundle under Metro (`tslib.__extends` error); this is a known incompatibility, not a regression to chase.
- `npm run android` / `npm run ios` / `npm run web` — start dev server targeting a specific platform
- `npm run lint` — lint with `expo lint` (ESLint flat config in `eslint.config.js`, extends `eslint-config-expo`)
- `npx tsc --noEmit` — typecheck (no test runner is configured in this repo)
- `npm run reset-project` — runs `scripts/reset-project.js`, moves current `app/` starter code to `app-example/` and creates a blank `app/` (not applicable now that the app is built out — historical/unused at this point)

Builds are managed via EAS (`eas.json` defines `development`, `preview`, and `production` build profiles).

## Backend: Supabase

The Supabase project is managed through the **Supabase MCP server** (see `.mcp.json`, project ref in that file) — use its tools (`list_tables`, `apply_migration`, `execute_sql`, `get_logs`, `get_advisors`) directly rather than the Supabase CLI when making schema changes; the CLI isn't set up locally.

- No login screen. `lib/supabase.ts` bootstraps one **anonymous Supabase auth user per device** (`supabase.auth.signInAnonymously()`), and that user's id doubles as `profiles.id`. If sign-in fails at runtime, check that **Anonymous Sign-ins** is enabled in the Supabase dashboard under Authentication → Providers — this can't be toggled via MCP.
- RLS is **not** enabled on any table (deliberate — "no security" is an explicit scope decision, not an oversight). Don't add auth/RLS hardening unless asked.
- Tables: `profiles`, `routine_tasks`, `notes`, `doubts`, `consistency_log`, `streaks`, `resources`, `flashcards`, `practice_sessions`, `curiosity_logs`, `reflections`, `profile_analysis`, `quiz_sessions`, `quiz_participants`, `quiz_question_cache`. `resources` is seeded with sample rows and has no `profile_id` (shared library, not per-user). `profiles` carries the onboarding intake fields (`goals`, `interests`, `learning_habits`, `strengths`, `weaknesses`, `challenges`, `name`) alongside the original `skill_level`/`free_time_minutes`. `profile_analysis` is append-only — one row per Gemini analysis run (`trigger` = `'onboarding' | 'task_status' | 'note' | 'doubt' | 'curiosity' | 'reflection'`); the dashboard always reads the latest row per profile.
- Env vars `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` live in `.env` (gitignored). `lib/supabase.ts` guards against server-side rendering: Expo Router's web static-render pass runs in Node where `window` doesn't exist, so AsyncStorage-backed session persistence is skipped there (`isServer` check) — don't remove that guard even though the app targets mobile, or the web export breaks.

## AI personalization: Gemini via Supabase Edge Functions

Onboarding and the "Today" dashboard are AI-driven, backed by Google Gemini.
Since this is a client-only Expo app with no backend of its own, the Gemini
API key can **never** live in client code or an `EXPO_PUBLIC_*` env var — it's
a Supabase Edge Function secret (`GEMINI_API_KEY`, plus optional
`GEMINI_MODEL`/`GEMINI_VISION_MODEL`), read only inside `supabase/functions/`.
The client only ever calls `supabase.functions.invoke(...)`.

- `supabase/functions/_shared/gemini.ts` — thin fetch wrapper around Gemini's
  `generateContent` REST endpoint, forcing JSON-mode responses
  (`responseMimeType: "application/json"`). Converts the OpenAI-style
  `{role, content}` message list into Gemini's `systemInstruction` +
  `contents` (role `assistant` → `model`) shape, and for vision calls fetches
  `image_url` URLs and inlines them as base64 `inline_data` since Gemini's
  REST API doesn't fetch arbitrary HTTP(S) URLs itself.
- `supabase/functions/_shared/supabase-admin.ts` — service-role Supabase
  client for edge functions (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are
  auto-injected by the Supabase runtime, no extra secret needed).
- `supabase/functions/onboarding-chat/` — drives the dynamic, multi-turn
  onboarding interview in `app/onboarding.tsx` (`hooks/use-onboarding-chat.ts`).
  Stateless: the client resends the full message history each turn. On the
  model's `type: "complete"` response, the function itself writes
  `profiles`, `routine_tasks`, `streaks`, and the first `profile_analysis`
  row — the client never constructs those inserts directly anymore.
  `lib/task-bank.ts`'s static task bank was removed; starter tasks are now
  generated per-intern by Gemini.
- `supabase/functions/analyze-progress/` — re-runs analysis for a profile
  given recent activity (tasks, notes, doubts, curiosity, reflections,
  streak) and inserts a new `profile_analysis` row. Invoked fire-and-forget
  via `lib/trigger-analysis.ts#triggerProgressAnalysis(profileId, trigger)`
  from the `onSuccess` of the relevant mutation in `use-routine.ts`,
  `use-notes.ts`, `use-doubts.ts`, `use-curiosity.ts`, and
  `use-reflection.ts` — never awaited, so it can't block the UI.
- The dashboard (`components/personalized-dashboard.tsx`, rendered at the
  top of `app/(tabs)/index.tsx` via `hooks/use-profile-analysis.ts`) always
  shows the latest `profile_analysis` row: priorities, weaknesses,
  recommendations, next steps.
- Redeploy either function after edits with `mcp__supabase__deploy_edge_function`
  (bundle `index.ts` plus the `_shared/*.ts` files it imports — the MCP tool
  takes a flat file list, not a directory).
- `suggest-resources`, `set-focus-skill`, and `generate-homework-flashcards`
  drive the skill-search/focus-skill flow: searching a skill/hobby in Library
  calls `suggest-resources` to get Gemini-suggested resources (saved into
  `resources` with `source_tag: 'ai'`); picking one to learn calls
  `set-focus-skill`, which sets `profiles.focus_skill`/`focus_resource_id`
  and rewrites the intern's pending `routine_tasks` toward the new skill
  (same slots, new content) rather than replacing the routine structure;
  uploading a homework screenshot (stored in the public `homework` bucket)
  calls `generate-homework-flashcards`, which uses Gemini's multimodal model
  (`GEMINI_VISION_MODEL` secret, defaults to `gemini-2.5-flash`) to turn the
  resource + homework into single-answer and multiple-choice flashcards.
- `analyze-progress` no longer just describes weaknesses — it also has Gemini
  produce 2-3 concrete `actions` (routine tasks), inserts them directly into
  `routine_tasks`, and records their titles on `profile_analysis.actions_taken`.
  The dashboard renders `actions_taken`, not `weaknesses`/`next_steps`.
- **Micro-Gap Speed Round** (`app/(tabs)/routine.tsx`'s "Speed round" toggle,
  `components/quiz-session-list.tsx`, `app/quiz-session/[id].tsx`,
  `hooks/use-quiz-sessions.ts`, `lib/quiz.ts`): an opt-in, competitive
  alternative to the default solo Micro-Gap suggestion flow — an intern picks
  a topic + card count, `generate-quiz-questions` (Gemini, cached per
  `(topic, card_count)` in `quiz_question_cache` for 14 days) generates a
  multiple-choice set, other interns join during a 45s window
  (`quiz_sessions.starts_at`), then everyone answers the same questions
  live. This is the only realtime feature in the app — `quiz_sessions`/
  `quiz_participants` are on the `supabase_realtime` publication and
  `useOpenQuizSessions`/`useQuizSession` subscribe via
  `supabase.channel(...).on('postgres_changes', ...)`, invalidating React
  Query on any change. Session lifecycle (`open`→`active`→`finished`) is
  client-computed and idempotent (`useAdvanceQuizSessionStatus`'s
  `.eq('status', from)` guard makes concurrent clients racing the same
  transition harmless) — there is no lifecycle edge function or cron.
  Deliberately kept separate from the calm, no-leaderboard tone of the rest
  of the app (see the streak screen's "No leaderboard, no comparison" copy)
  — don't fold this into the solo suggestion as a default.
- **Deploy quirk**: `mcp__supabase__deploy_edge_function` fails to bundle
  relative `../_shared/*.ts` imports — `Module not found` even though the
  files are included in the same call. This used to spare the pre-existing
  `onboarding-chat`, but a later redeploy of `onboarding-chat` itself hit the
  same failure, so treat the exemption as gone: **every** function in this
  project, `onboarding-chat` included, is now self-contained (cors/gemini/
  admin-client helpers duplicated inline instead of imported from
  `_shared/`). Keep new/edited functions self-contained too, rather than
  trying `_shared/*` imports again, unless this is retested and confirmed
  fixed. `supabase/functions/_shared/*.ts` itself is now unused dead code —
  left in place for reference, not imported anywhere.

## Architecture

Expo Router (SDK 54) file-based routing rooted at `app/`, React Query for all server state, Supabase for persistence, Reanimated + Gesture Handler + Moti for animation/interaction.

- **Navigation**: `app/_layout.tsx` wraps everything in `GestureHandlerRootView` → `QueryClientProvider` → `SessionProvider` → navigation theme → root `Stack`. Bottom tabs (`app/(tabs)/_layout.tsx`: Today, Routine, Notes, Doubts, Library) are the daily-use surfaces; `Onboarding`, `Practice`, `Reflection`, `Streak detail`, and `Resource detail` are pushed as stack screens off the root, not tabs. `app/(tabs)/_layout.tsx` redirects to `/onboarding` if `useSession().profile` is null.
- **Session**: `context/session.tsx` (`SessionProvider`/`useSession`) owns the anonymous auth user id and the `profiles` row, both as React Query–backed state. Every feature hook takes `profile?.id` as an argument rather than re-deriving it.
- **Data hooks**: one hook module per feature domain in `hooks/` (`use-routine`, `use-consistency`, `use-doubts`, `use-notes`, `use-resources`, `use-flashcards`, `use-practice`, `use-curiosity`, `use-reflection`, `use-onboarding-chat`, `use-profile-analysis`), each wrapping Supabase queries/mutations in React Query. Domain logic that isn't a direct DB call lives in `lib/` (`streak.ts` for streak bump logic, `flashcard-scheduler.ts` for spaced-interval staging, `doubt-helper.ts` for the question rephrase hint, `curiosity-prompts.ts`, `practice-partners.ts`, `notifications.ts`, `trigger-analysis.ts` for firing Gemini re-analysis after activity — see "AI personalization" below).
- **Most "smart" features are still intentionally simplified**, not real ML/scheduling — an explicit scope tradeoff, not a placeholder to "finish later": flashcard spacing is stage-based fixed intervals (`lib/flashcard-scheduler.ts`), practice-partner matching is a static pool with recent-partner avoidance (`lib/practice-partners.ts`), and practice prompts are static. Doubts, by contrast, get a **real** mentor answer now: a doubt is inserted as `status: 'open'` with no answer, and a separate one-page mentor web app (not part of this repo — spec at `.claude/specs/mentor-web-app-spec.md`) writes `mentor_answer`/`answered_by`/`answered_at` and flips `status` to `'answered'` directly against the same Supabase tables (no edge function, no auth — same no-RLS posture as the rest of the project). `useDoubts` (`hooks/use-doubts.ts`) polls every 20s while the Doubts tab is open so an answer written there shows up on-device without a manual refresh. This is a deliberate narrowing of the "mentor-side tooling is out of scope" line above — the mentor web app is in scope as a small external companion, not as tooling inside this Expo app. Onboarding and the personalized dashboard are the exception — those are genuinely Gemini-driven, see "AI personalization" below.
- **Flashcard generation** is cross-cutting: `lib/flashcards.ts#createFlashcard` is called from `use-notes.ts` (on note save), `use-routine.ts` (on task completion), and `use-curiosity.ts` (on prompt response) — if you add a new content-producing feature that should feed the flashcard deck, call it from there too.
- **Shared UI primitives**: `components/screen.tsx` (themed scroll/non-scroll container), `components/themed-text.tsx` (typed text variants driven by `constants/theme.ts` + `hooks/use-theme-color.ts`). Reuse these rather than re-styling `View`/`Text` per screen.
- Path alias `@/*` maps to the project root (`tsconfig.json`, strict mode on). `experiments.typedRoutes` and `experiments.reactCompiler` are both on in `app.json` — new routes need the dev server run at least once for `.expo/types/router.d.ts` to regenerate before `tsc` will recognize them.
