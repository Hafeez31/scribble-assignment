# Current System Documentation

> Snapshot as of 2026-06-08. Documents existing state only — no proposed changes.

---

## 1. Repository Structure

```
scribble-assignment/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── router.ts          # Express router, 404 + global error handlers
│   │   │   ├── rooms.ts           # Route handlers: create, join, get
│   │   │   ├── schemas.ts         # Zod schemas + HttpError class
│   │   │   └── schemas.test.ts
│   │   ├── models/
│   │   │   └── game.ts            # TypeScript types: Participant, Room, RoomSnapshot
│   │   ├── services/
│   │   │   ├── roomStore.ts       # In-memory store + business logic
│   │   │   └── roomStore.test.ts
│   │   ├── seed/
│   │   │   └── starterData.ts     # STARTER_WORDS, STARTER_ROLES constants
│   │   ├── app.ts                 # Express app (CORS, JSON, router mount)
│   │   └── server.ts              # Entry point (listens on PORT)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── StartPage.tsx      # Landing page
│   │   │   ├── CreateRoomPage.tsx # Create room form
│   │   │   ├── JoinRoomPage.tsx   # Join room form
│   │   │   ├── LobbyPage.tsx      # Participant list + refresh + start
│   │   │   └── GamePage.tsx       # Game layout skeleton
│   │   ├── components/
│   │   │   ├── AppShell.tsx       # Header wrapper
│   │   │   ├── Card.tsx           # Reusable card (header/body/footer)
│   │   │   ├── PageHeader.tsx     # Page title section
│   │   │   ├── RoomCodeBadge.tsx  # Room code display
│   │   │   ├── GuessForm.tsx      # Text input + submit (no-op)
│   │   │   ├── Scoreboard.tsx     # Placeholder
│   │   │   └── ResultPanel.tsx    # Placeholder
│   │   ├── services/
│   │   │   ├── api.ts             # Fetch wrapper + typed API methods
│   │   │   └── api.test.ts
│   │   ├── state/
│   │   │   └── roomStore.ts       # Custom store using useSyncExternalStore
│   │   ├── routes/
│   │   │   └── index.tsx          # React Router v6 route definitions
│   │   ├── App.tsx                # RoomStoreProvider + AppRoutes
│   │   ├── main.tsx               # ReactDOM.createRoot entry
│   │   └── styles/app.css
│   ├── package.json
│   └── vite.config.ts
│
├── AGENTS.md                      # Coding guidelines and constraints
├── CLAUDE.md                      # Speckit pointer
└── README.md                      # Project requirements
```

---

## 2. Tech Stack

### Backend
| Concern | Technology |
|---------|-----------|
| Runtime | Node.js + `tsx` |
| Framework | Express 4.21.1 |
| Language | TypeScript 5.6.3 |
| Validation | Zod 3.23.8 |
| Storage | In-memory `Map` (no database) |
| Port | 3001 (Express default) |

### Frontend
| Concern | Technology |
|---------|-----------|
| Framework | React 18.3.1 |
| Routing | React Router DOM 6.30.1 |
| Language | TypeScript 5.6.3 |
| Build | Vite 5.4.10 (dev port 5173) |
| State | Custom store + `useSyncExternalStore` |
| HTTP | Native `fetch` |

---

## 3. Data Models

### Backend (`backend/src/models/game.ts`)

```typescript
type Participant = {
  id: string          // UUID (crypto.randomUUID)
  name: string        // Default: "Player" if not provided
  joinedAt: string    // ISO timestamp
}

type Room = {
  code: string              // 4-char uppercase (no I, O, L, 1)
  status: "lobby"           // Frozen; only "lobby" exists today
  participants: Participant[]
  createdAt: string
  updatedAt: string
}

type RoomSnapshot = {
  code: string
  status: "lobby"
  participants: Participant[]
  availableWords: string[]  // from STARTER_WORDS (5 words: rocket, pizza, castle, guitar, sunflower)
  roles: ParticipantRole[]  // ["drawer", "guesser"] from STARTER_ROLES
}

type RoomSessionResponse = {
  participantId: string
  room: RoomSnapshot
}

type ParticipantRole = "drawer" | "guesser"
```

### Frontend types (duplicated from backend in `frontend/src/services/api.ts`)
Mirrors the backend model shapes above. No shared type package exists.

---

## 4. API Endpoints

All routes are mounted at `/` (no prefix). Backend runs on port 3003.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | none | Healthcheck → `{ ok: true }` |
| GET | `/` | none | Service root → `{ ok: true, service: "scribble-api" }` |
| POST | `/rooms` | none | Create room |
| POST | `/rooms/:code/join` | none | Join existing room |
| GET | `/rooms/:code` | none | Fetch room snapshot |

### POST `/rooms`
**Request body** (validated by `createRoomSchema`):
```json
{ "playerName": "Alice" }   // playerName is optional; defaults to "Player"
```
**Response 200:**
```json
{
  "participantId": "<uuid>",
  "room": {
    "code": "AB3K",
    "status": "lobby",
    "participants": [{ "id": "<uuid>", "name": "Alice", "joinedAt": "<iso>" }],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### POST `/rooms/:code/join`
**Request body** (validated by `joinRoomSchema`):
```json
{ "playerName": "Bob" }
```
**Response 200:** Same shape as POST `/rooms`.  
**Response 404:** `{ "message": "Room not found" }` if code unknown.

### GET `/rooms/:code`
**Query params** (validated by `roomViewerQuerySchema`):
```
?participantId=<uuid>   // optional; currently unused in response shaping
```
**Response 200:**
```json
{ "room": { ...RoomSnapshot } }
```
**Response 404:** `{ "message": "Room not found" }` if code unknown.

---

## 5. Backend Service Layer

### `roomStore.ts` — exported singleton instance

| Function | Signature | Notes |
|----------|-----------|-------|
| `createRoom` | `(playerName?) → RoomSessionResponse` | Generates unique code, creates Room |
| `joinRoom` | `(code, playerName?) → RoomSessionResponse \| null` | Returns null if room not found |
| `getRoom` | `(code) → Room \| null` | Raw Room object |
| `saveRoom` | `(room: Room) → void` | Updates `updatedAt`, stores in Map |
| `toRoomSnapshot` | `(room, viewerParticipantId?) → RoomSnapshot` | `viewerParticipantId` parsed but unused |
| `listWords` | `() → string[]` | Returns copy of STARTER_WORDS |

**Storage:** `Map<string, Room>` held in module scope. Lost on process restart.

**Code generation alphabet:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
(excludes I, O, L, 1 to avoid visual ambiguity)

---

## 6. Frontend State Management

### Custom RoomStore (`frontend/src/state/roomStore.ts`)

Architecture: `class RoomStore` with a `Set<Listener>` and React 18's `useSyncExternalStore`.

**State shape:**
```typescript
type RoomState = {
  room: RoomSnapshot | null
  participantId: string | null
  error: string | null
  isLoading: boolean
}
```

**Public methods:**
| Method | Effect |
|--------|--------|
| `setRoomSession(response)` | Stores `participantId` + `room` |
| `setRoomSnapshot(room)` | Updates `room` only (preserves `participantId`) |
| `createRoom(playerName)` | Calls `api.createRoom`, sets session, sets loading/error |
| `joinRoom(code, playerName)` | Calls `api.joinRoom`, sets session, sets loading/error |
| `fetchRoom()` | Calls `api.fetchRoom` with current code + participantId, updates snapshot |

**Hooks:**
- `useRoomState()` — subscribes to store, returns current `RoomState`
- `useRoomStore()` — returns the store instance (for calling methods)

Store is provided via React Context (`RoomStoreContext`) in `App.tsx`.

---

## 7. Frontend API Client

### `frontend/src/services/api.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/bug"
//                                                               ^^^^^^^^^^^^^^
//                   NOTE: hardcoded "/bug" suffix — all API calls will 404
//                   Correct value should be http://localhost:3001
```

**Generic wrapper:**
```typescript
async function request<T>(path: string, init?: RequestInit): Promise<T>
// - Prepends API_BASE_URL
// - Sets Content-Type: application/json
// - Throws with extracted message on !response.ok
```

**Typed methods:**
```typescript
api.createRoom(playerName: string)    → POST /rooms
api.joinRoom(code, playerName)        → POST /rooms/{code}/join
api.fetchRoom(code, participantId?)   → GET /rooms/{code}?participantId={id}
```

---

## 8. Frontend Routes & Pages

| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/` | StartPage | none | Hero + Create/Join CTA buttons |
| `/create-room` | CreateRoomPage | none | Player name form → creates room |
| `/join-room` | JoinRoomPage | none | Code + name form → joins room |
| `/lobby` | LobbyPage | `room == null → /` | Participant list, refresh, start game |
| `/game` | GamePage | `room == null → /` | Game layout (skeleton) |
| `*` | — | — | Redirect to `/` |

### Page summaries

**StartPage** — Purely presentational. Three feature cards (Draw/Guess/Win steps). Navigate to create or join.

**CreateRoomPage** — Controlled input for player name. On submit: `roomStore.createRoom()` → navigate `/lobby`. Shows local error on failure.

**JoinRoomPage** — Two inputs (name + code). Code auto-uppercased via `onChange`. On submit: `roomStore.joinRoom()` → navigate `/lobby`. Shows local error on failure.

**LobbyPage** — Reads `useRoomState()`. Displays `RoomCodeBadge`, participant list (name + "joined" label). Buttons: "Refresh Room" (calls `fetchRoom()`), "Start Game" (navigates `/game`). Shows loading indicator and error banner.

**GamePage** — Reads `useRoomState()`. Three-column layout:
- Left: `Scoreboard` + `ResultPanel` (both static placeholders)
- Center: Canvas placeholder text ("Waiting for drawer…")  
- Right: Viewer info (name, "Not Drawing" status) + `GuessForm`

"Exit Game" button returns to `/lobby`.

---

## 9. Component Library

| Component | Props | Notes |
|-----------|-------|-------|
| `AppShell` | `eyebrow, title, lede, children` | Header + `<main>` wrapper |
| `Card` | `title, badge?, footer?, children` | Reusable card layout |
| `PageHeader` | `kicker, title, description` | H1 + description block |
| `RoomCodeBadge` | `code` | Styled code display + share hint |
| `GuessForm` | `disabled?` | Input + submit; `handleSubmit` is a no-op |
| `Scoreboard` | none | Static placeholder: "Waiting for players… 0" |
| `ResultPanel` | none | Static placeholder: "Game activity and guesses will appear here." |

---

## 10. Error Handling Pattern

### Backend
1. Route handler wraps in `try/catch`, passes errors to `next(error)`
2. `ZodError` → 400 `{ message: "Invalid request payload" }`
3. `HttpError` → `error.statusCode` + `error.message`
4. Unknown error → 500 + `error.message ?? "Internal server error"`

### Frontend
1. `api.request()` throws `Error` with extracted `message` from JSON body
2. Store methods catch and set `state.error`
3. Pages read `state.error` and render an error banner
4. Loading state tracked via `state.isLoading`

---

## 11. Known Issues & Gaps

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | `API_BASE_URL` has hardcoded `/bug` suffix | `frontend/src/services/api.ts:3` | All API calls fail |
| 2 | `API_BASE_URL` default points to port 3001 but has `/bug` suffix | `frontend/src/services/api.ts:3` | All API calls fail |
| 3 | `viewerParticipantId` received but ignored in `toRoomSnapshot` | `backend/src/services/roomStore.ts` | Role-based visibility not possible |
| 4 | No `hostId` / `creatorId` on `Room` | `backend/src/models/game.ts` | Cannot enforce host-only actions |
| 5 | `Room.status` only ever `"lobby"` | `backend/src/models/game.ts` | No game/round state machine |
| 6 | No game fields: drawer, word, guesses, scores | `backend/src/models/game.ts` | Core game mechanics missing |
| 7 | `GuessForm.handleSubmit` is a no-op | `frontend/src/components/GuessForm.tsx` | Guesses cannot be submitted |
| 8 | `Scoreboard` and `ResultPanel` are static | `frontend/src/components/` | No live score or activity log |
| 9 | No automatic polling | `frontend/src/pages/LobbyPage.tsx` | Lobby only updates on manual refresh |
| 10 | Types duplicated across backend/frontend | `models/game.ts` + `services/api.ts` | Divergence risk if models change |

---

## 12. Data Flow Summary

```
Create Room:
  CreateRoomPage → roomStore.createRoom()
    → api.createRoom() → POST /rooms
    → backend: createRoom() → generates code, stores Room
    → response: { participantId, room }
    → store: setRoomSession()
    → navigate /lobby

Join Room:
  JoinRoomPage → roomStore.joinRoom()
    → api.joinRoom() → POST /rooms/:code/join
    → backend: joinRoom() → appends Participant
    → response: { participantId, room }
    → store: setRoomSession()
    → navigate /lobby

Refresh Lobby:
  LobbyPage "Refresh Room" button → roomStore.fetchRoom()
    → api.fetchRoom() → GET /rooms/:code?participantId=...
    → backend: getRoom() → returns RoomSnapshot
    → store: setRoomSnapshot() (preserves participantId)

Start Game:
  LobbyPage "Start Game" button → navigate /game
    (no backend call; no game state initialized)
```
