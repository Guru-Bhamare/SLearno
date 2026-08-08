# Intern Self-Learning App — Project Spec

## Purpose of this document
This is the base context for building the application. It contains the problem statement the app is solving, who it's for, and the full feature set. Use this as the foundation before writing any code — every feature below maps back to a specific, real pain point found in user research

---

## Problem Statement

**Governing thought:** Interns struggle to become self-directed learners because they lack the confidence, structure, and initiative needed to independently manage and sustain their learning journey.

Interns are expected to build and maintain their own learning routine on top of assigned work, but in practice:
- They don't know where to start or what to prioritize.
- They can't find or protect time for it around office hours, commute, and daily life.
- They're afraid to ask mentors for help, so they try to figure things out alone.
- Even when they start a routine, they can't sustain it consistently.
- Resources and guidance exist, but are scattered and go underused.

This isn't a motivation problem in the simple sense — most interns say they know *what* they should be doing. The gap is in structure, low-friction support, and sustainable habits, not willpower alone.

---

## Who this is for

- **Interns** — the primary users. Currently building (or trying to build) a self-learning routine with no clear starting point and limited free time.
- **Mentors** — currently guide interns informally: diagnostic conversations, verbal feedback, suggested routines. The app should support and structure this, not replace it.
---

## Core Insights Driving the Feature Set

1. **Not knowing where to start is the most common blocker.** Confirmed both in interviews and at scale in the survey (majority unsure which skill to start with).
2. **Time is the #1 named struggle**, but it's really a scheduling/structure problem — interns have some free time, they just can't see it or protect it.
3. **Fear of judgement/evaluation is the biggest reason interns don't ask mentors for help** — more than mentors being busy or even a language barrier.
4. **Consistency breaks are normal, not a failure state.** Interns who slip up want to restart, not be penalized.
5. **Forgetting what was learned is a real problem** — one persona reread the same material repeatedly until she started taking structured notes.
6. **Passive learning (reading alone) doesn't fully solve skill gaps like speaking** — active practice with another person matters.
7. **Resources already exist but go unused**, because they're scattered and there's no shared, contextual place to find them.
8. **Reward-based motivation (points, badges) tends to fade quickly for this group** — a mentor explicitly flagged this as counterproductive. Curiosity- and reflection-driven design fits better than gamification-for-its-own-sake.

---

## Feature Set (14 features)

### 1. Diagnostic Onboarding → Personalized Routine
Replaces a blank "build your own plan" start with a short intake flow (current skill level, free time, fixed commitments, past attempts) that outputs a starter routine — small and achievable, not overwhelming. Re-runs periodically (e.g. every 2–3 weeks) so the routine adapts over time rather than staying static.

### 2. Time-Block Planner
Schedules learning around real daily constraints (office hours, commute, meals, sleep) instead of assuming free hours exist. Recalculates available time daily rather than using a fixed template, since unplanned tasks are common. Includes a "compressed day" mode that auto-shrinks the day's plan to 1–2 micro-tasks when little free time is available, instead of skipping the day entirely.

### 3. Low-Friction / Anonymous Doubt-Clearing
Lets users ask a mentor a question without a live, face-to-face moment. Anonymity is a per-message toggle, not account-wide. Includes an optional "common doubts" board so previously answered questions are visible without needing to be re-asked, and an in-app rephrase/draft helper to reduce language as a barrier to asking.

### 4. Restart-Friendly Consistency Tracker
Tracks daily/weekly task completion with a calendar/heatmap view of the overall pattern, not just a single streak number. Missed days trigger a neutral "pick back up" prompt — no penalty, no loss of history.

### 5. Review–Research–Recall Notes Tool
After a learning session, users log what they reviewed, one thing to research further, and a note in their own words. The app auto-schedules a spaced "recall check" days later, prompting the user to remember the entry before revealing it. Entries are searchable/taggable and linkable to specific routine tasks.


### 6. Same-Day Nudges
Gently reminds users of incomplete tasks by a set point in the evening. Deferred tasks are flagged distinctly rather than silently rolled forward, so backlog is visible before it piles up into the weekend.

### 7. Speaking/Practice-Partner Matching
Pairs users for short, scheduled active-practice sessions (e.g. spoken English) with optional conversation prompts. Matching favors variety over repeat pairings. Sessions default to short (10–15 min) to lower the barrier to opting in.

### 8. Curiosity Prompts
Periodic lightweight prompts (e.g. "What's one new word/concept you came across today?") that feed into the notes tool. Deliberately has no points, levels, or leaderboard — designed to encourage curiosity for its own sake rather than reward-chasing.

### 9. "Time With Yourself" Reflection Block
A scheduled block distinct from active learning tasks — unstructured time to pause, reflect, or walk. No content or notifications are pushed during this block. Optional, skippable reflection prompt at the end.

### 10. Resource Library (Curated & Routine-Linked)
A central library of learning material organized by skill area and level. Each resource is tagged by source (mentor-suggested, senior-shared, official) so quality/origin is clear. Resources surface contextually — attached to routine tasks or to answered doubts — rather than requiring a separate search. Includes a simple usage indicator (e.g. "X interns used this") and lets mentors see which suggested resources an intern actually opened.

### 11. Streak Tracker
A visible running count of consecutive days a user kept up with their routine (current + longest streak). Sits alongside the consistency tracker rather than replacing it — a broken streak resets the count but not the underlying history, and the reset message stays neutral rather than punitive. No leaderboard or peer comparison by default. Streak requirement flexes with the planner's compressed-day mode, so a legitimately light day still counts.

### 12. Adaptive Flashcards
Auto-generates flashcards from a user's actual activity — entries from the notes tool, curiosity-prompt logs, and routine tasks. Topics practiced regularly get light, spaced review; topics scheduled but skipped, or logged once and never revisited, resurface more often as gaps. A small daily set (~5 cards) appears on the home screen. Cards that are consistently recalled correctly automatically drop in frequency.

---

## Suggested Build Order

**Phase 1 — Core loop:**
1. Diagnostic Onboarding → Personalized Routine
2. Time-Block Planner
3. Restart-Friendly Consistency Tracker
4. Low-Friction / Anonymous Doubt-Clearing

**Phase 2 — Retention & depth:**
5. Review–Research–Recall Notes Tool
6. Resource Library
7. Same-Day Nudges

**Phase 3 — Differentiators (depend on data from Phase 1–2 features):**
8. Streak Tracker
9. Adaptive Flashcards
10. Speaking/Practice-Partner Matching
11. Curiosity Prompts
12. "Time With Yourself" Reflection Block
