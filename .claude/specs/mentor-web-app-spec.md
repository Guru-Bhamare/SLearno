# Mentor Doubt-Response Web App — Spec

## Purpose of this document
Everything needed to build the **one-page mentor web app**: check doubts interns asked in SLearno, type a reply, send it back. Nothing else. This is a companion to the SLearno mobile app, not a rebuild of it — separate codebase, talks to the same Supabase project.

## What changed on the app side (context)
Doubts used to get an instant canned "Mentor tip" the moment an intern submitted one — keyword-matched, not a real answer (`lib/doubt-helper.ts#getMockAnswer`, now removed). That's gone. A doubt now sits as `status: 'open'` with no answer until a real mentor answers it here. The mobile app polls every 20s while the Doubts tab is open, so an answer typed on this page shows up on the intern's phone shortly after — no push/realtime needed on your end.

## Scope
- **One page.** List of doubts, a way to answer one, done.
- **No login.** This project's mobile app has no auth by design (anonymous per-device Supabase user, RLS off everywhere — see the main repo's `CLAUDE.md`). This page follows the same posture: no mentor login, just a URL. See "Access control" below for the one caveat worth knowing.
- **No build step required.** A single static `.html` file using the Supabase JS client via CDN import is enough — host it anywhere static (Vercel, Netlify, GitHub Pages, even opened locally). No framework needed for one page.

## Supabase connection
Same project the SLearno app uses.

```js
const SUPABASE_URL = "https://foadgwfeeqswokqygvrt.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nh8gopKsCK09Sa_MYoUt1A_yF5pQvep"; // publishable key — safe to embed client-side
```

```html
<script type="module">
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
</script>
```

No service-role key, no server, no env file — this key only has the same anon-role access the phone app already has, and every table is already open to it (RLS disabled project-wide, a deliberate scope call already made for this project, not something to fix here).

## `doubts` table (already migrated, exists now)

| column | type | notes |
|---|---|---|
| `id` | uuid | pk |
| `profile_id` | uuid | which intern asked — fk to `profiles.id` |
| `question` | text | the doubt itself |
| `is_anonymous` | boolean | if `true`, don't show the intern's name |
| `status` | text | `'open'` \| `'answered'` |
| `mentor_answer` | text, nullable | the real answer — write this |
| `answered_by` | text, nullable | free-text mentor name — write this |
| `answered_at` | timestamptz, nullable | write `now()` when answering |
| `created_at` | timestamptz | when asked |

`profiles` has a `name` column — embed it via the FK for display, but only show it when `is_anonymous` is `false`. When `true`, show "Anonymous" regardless of what the join returns (mirrors how the app itself displays doubts to other interns).

## Page behavior

### 1. Mentor name (once, no login)
A small text input at the top ("Answering as: ___"), persisted to `localStorage` so it's not retyped every visit. This is the only "identity" concept — free text, not an account. Used to fill `answered_by`.

### 2. Load doubts
On page load (and on a manual refresh button — polling isn't necessary since this is a page a mentor opens deliberately to do a pass, not a screen left open all day):

```js
const { data } = await supabase
  .from('doubts')
  .select('id, question, is_anonymous, status, mentor_answer, answered_by, answered_at, created_at, profiles(name)')
  .order('status', { ascending: true })   // 'answered' > 'open' alphabetically, so this puts open first
  .order('created_at', { ascending: true }); // oldest open doubt first, so nothing ages silently
```

### 3. Render two sections
- **Open** (`status === 'open'`): the queue to work through. Each row shows the question, "Anonymous" or the intern's name, how long ago it was asked, a textarea, and a "Send" button.
- **Answered** (`status === 'answered'`): collapsed/below the fold, read-only — question + the answer already given + who answered + when. Useful for not re-answering something already covered, not the main focus of the page.

### 4. Answering
On "Send":

```js
const { error } = await supabase
  .from('doubts')
  .update({
    mentor_answer: answerText.trim(),
    status: 'answered',
    answered_by: mentorName,
    answered_at: new Date().toISOString(),
  })
  .eq('id', doubtId);
```

On success: move the row from Open to Answered in the UI (no full page reload needed — just update local state, or re-run the fetch).

### 5. Empty state
"No open doubts right now" when the Open list is empty. Don't leave a blank space.

## Explicitly not building
- Mentor login/accounts — `answered_by` is free text, not identity-verified.
- Editing or deleting an answer once sent (re-answering is a "just send again" problem if it ever comes up, not a v1 feature).
- Realtime push from this page to the phone — the phone already polls every 20s, that's enough.
- Filtering/search/topics — doubts don't carry a topic/skill tag today, so there's nothing to filter by yet.

## Access control (read before shipping)
There's no password on this page and the key embedded in it can read/write every table in the project, same as the phone app can. That's fine for now because it mirrors the existing "no security" call made for the whole build — but unlike the phone app, this page is meant to be opened by someone who *isn't* the intern, so the URL itself becomes the only thing keeping a random visitor from reading/answering doubts. Keep the URL unlisted (don't index it, don't link it from anywhere public) and share it directly with whoever mentors. If that's not enough, the smallest upgrade is a client-side passcode gate (a hardcoded string checked before rendering the page — not real auth, just a speed bump) rather than building out mentor accounts.
