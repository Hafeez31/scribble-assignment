# Discovery Notes — Scribble

> Recorded at project start (2026-06-08) before any feature work began.
> Documents gaps in the starter scaffold, assumptions made before implementation, and the relevant files each finding maps to.

---

## Gaps in the Starter Scaffold

| # | Gap | Impact | Relevant File(s) |
|---|-----|--------|-----------------|
| 1 | `Room.status` is typed as the literal `"lobby"` only — no `"in-progress"` or `"round-ended"` states exist | No game state machine; impossible to model a round lifecycle | `backend/src/models/game.ts` |
| 2 | No `hostId` on `Room` — the creator is not tracked | Cannot enforce host-only actions (start game, restart); any participant could trigger privileged operations | `backend/src/models/game.ts` |
| 3 | `startRoom()` in `roomStore.ts` is a no-op — it returns the room without changing its status, assigning a drawer, or selecting a word | "Start Game" button navigates the frontend to `/game` but nothing on the server changes; the game never actually begins | `backend/src/services/roomStore.ts` |
| 4 | No game fields on `Room`: no `drawerId`, `secretWord`, `strokes`, `guesses`, or `scores` | Core gameplay mechanics (drawing, guessing, scoring) have no data model to build on | `backend/src/models/game.ts` |
| 5 | `GuessForm.handleSubmit` is a no-op — submitting the form does nothing | Guesses can never be sent to the server | `frontend/src/components/GuessForm.tsx` |
| 6 | `GamePage` contains a static `<div className="canvas-placeholder">` — no canvas element, no drawing API | Drawing is entirely absent; the page is decorative only | `frontend/src/pages/GamePage.tsx` |
| 7 | `toRoomSnapshot()` accepts a `viewerParticipantId` parameter but ignores it | Role-based information hiding (e.g., keeping the secret word from guessers) is not possible | `backend/src/services/roomStore.ts` |
| 8 | `API_BASE_URL` fallback in the frontend has a hardcoded `/bug` suffix | Every API call would 404 in a fresh environment without an explicit `VITE_API_URL` env var | `frontend/src/services/api.ts` |
| 9 | No HTTP polling in `LobbyPage` — the participant list only updates on a manual "Refresh" button click | Players joining from other tabs are invisible until someone clicks refresh | `frontend/src/pages/LobbyPage.tsx` |
| 10 | `Scoreboard` and `ResultPanel` are static placeholder components with hardcoded text | No live score or guess activity can be displayed | `frontend/src/components/Scoreboard.tsx`, `frontend/src/components/ResultPanel.tsx` |

---

## Assumptions

| # | Assumption | Basis | Relevant File(s) |
|---|------------|-------|-----------------|
| 1 | All state can be held in-memory for the lifetime of the server process — no persistence across restarts is required | The project brief and `AGENTS.md` explicitly forbid databases; the use case is a local session-based game, not a persistent service | `backend/src/services/roomStore.ts` |
| 2 | A single active round per room is sufficient — there is no need to queue multiple concurrent rounds or support spectators joining mid-round | The starter scaffold has one room code per session and no concept of spectators; the README describes a single-round flow | `backend/src/models/game.ts`, `backend/src/api/rooms.ts` |
| 3 | Player identity does not need to survive a page refresh — the `participantId` UUID held in React state is the sole identity token | `AGENTS.md` explicitly forbids authentication, sessions, JWTs, and cookies; a lost `participantId` simply means the player rejoins | `frontend/src/state/roomStore.ts` |
| 4 | HTTP polling at ~2-second intervals is acceptable latency for all real-time updates (lobby joins, drawing strokes, guess submissions, round-end) | `AGENTS.md` explicitly forbids WebSockets and SSE; 2 s is consistent with the existing manual-refresh pattern in `LobbyPage` | `frontend/src/pages/LobbyPage.tsx`, `frontend/src/pages/GamePage.tsx` |

---

## Relevant Files — Full Map

```
backend/src/
├── models/game.ts            ← data model gaps (1, 2, 4, 7)
├── services/roomStore.ts     ← no-op startRoom, ignored viewerParticipantId (3, 7); assumptions 1, 4
├── api/rooms.ts              ← missing start/guess/stroke/restart routes; assumption 2
└── seed/starterData.ts       ← STARTER_WORDS present but unused at discovery time

frontend/src/
├── components/GuessForm.tsx  ← no-op submit (5)
├── components/Scoreboard.tsx ← static placeholder (10)
├── components/ResultPanel.tsx← static placeholder (10)
├── pages/GamePage.tsx        ← canvas placeholder, no drawing (6)
├── pages/LobbyPage.tsx       ← no polling (9); assumption 4
├── services/api.ts           ← /bug suffix bug (8); assumption 3
└── state/roomStore.ts        ← assumptions 1, 3
```
