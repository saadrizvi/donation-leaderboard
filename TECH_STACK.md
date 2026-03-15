# TECH_STACK.md — Fundraiser Donor Board

## Stack Summary

| Layer | Choice | Rationale |
|---|---|---|
| Frontend framework | React (Vite) | Broad familiarity, fast HMR, easy SPA routing |
| Routing | React Router v6 | Industry standard, supports nested/dynamic routes |
| Backend | Express (Node.js) | Minimal, well-understood, easy to deploy anywhere |
| Persistence | In-memory (JS Map) | Zero setup, intentionally ephemeral for v1 |
| Real-time | Polling (4s interval) | Reliable on Render free tier; WebSockets drop on spin-down |
| Styling | CSS Variables + plain CSS | No build-time dependency, easy to theme |
| CSV handling | `papaparse` (client) + `multer` + manual (server) | Lightweight, no heavy dependencies |
| Unique IDs | `uuid` (v4) | Standard, collision-safe donor IDs |
| Deployment | Render free tier | Free, Git-connected, zero-config for Node apps |

---

## Architecture Overview

```
Browser (Admin / Kiosk / Summary)
        │
        │  HTTP polling every 4s
        │  REST API calls on user action
        ▼
Express Server (Node.js)
        │
        │  Reads/writes
        ▼
In-Memory Store (JS Map)
  sessions: Map<sessionId, SessionObject>
```

- The Express server serves both the API (`/api/*`) and the compiled React app (static files from `/client/dist`)
- There is no separate database process — the Map lives in the Node process heap
- All state is lost on server restart — this is intentional and documented

---

## System Design Decisions

### Why polling instead of WebSockets?
Render's free tier **spins down the server after 15 minutes of inactivity**. When it spins back up, persistent WebSocket connections are severed and clients must reconnect — adding complexity and unreliable UX. Polling every 4 seconds is simpler, predictable, and handles reconnection automatically. The slight latency (up to 4s) is acceptable for a live donor board.

### Why in-memory storage?
- Zero setup — no database provisioning, credentials, or migrations
- Fast reads/writes with no network hop
- The use case (1–2 day event, ~150 donors) fits comfortably in memory
- CSV export/import is the intentional escape hatch for data portability
- Upgrading to SQLite or PostgreSQL in v2 is straightforward — just swap the store layer

### Why a monorepo (client + server together)?
- Single Render deployment — one service, one URL, no CORS headaches
- Vite dev proxy handles API calls locally without extra config
- Simpler for a small project with one developer or small team

### Why no auth?
- The event lasts 1–2 days
- The session ID is the access control — it's a short-lived shared secret
- Adding auth (even basic password) adds friction for mobile admins in a busy event environment
- Risk is low: worst case someone finds the session ID and adds a fake donor — admins can delete it

---

## API Design

All endpoints are under `/api/sessions`. Responses are JSON. Errors return `{ error: string }` with appropriate HTTP status codes.

### Session object returned by `GET /api/sessions/:id`
```json
{
  "id": "ABC123",
  "goal": 10000,
  "iframeUrl": "https://example.com/news",
  "iframeMode": "split",
  "createdAt": "2026-03-15T10:00:00Z",
  "donors": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Jane",
      "lastName": "Doe",
      "displayName": "Jane D.",
      "isAnonymous": false,
      "amount": 500,
      "createdAt": "2026-03-15T10:05:00Z"
    }
  ]
}
```

### Donor display name logic (server-side)
```
if isAnonymous OR (firstName is blank AND lastName is blank):
  displayName = "Anonymous"
else:
  displayName = firstName + (lastName ? " " + lastName[0] + "." : "")
```

### Session ID generation
- **Random:** 6 characters, uppercase, from charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O, 1/I ambiguity)
- **Custom:** Accepted as-is, uppercased, validated: alphanumeric only, 4–20 chars
- **Collision:** Returns `409 Conflict` if ID already exists

---

## Iframe Embed Configuration

Each session can optionally configure an external URL to show on the kiosk display. This is set per-session by the admin and stored on the session object.

### Session fields
- `iframeUrl` — string | null. The URL to embed. Null means no iframe.
- `iframeMode` — `"split"` | `"rotate"` | null.
  - `"split"` — donor board and iframe shown side by side (50/50 or configurable split). Best for wide TV screens.
  - `"rotate"` — iframe appears as an extra full-screen page in the donor card rotation cycle, shown between page transitions.

### API endpoint
`PUT /api/sessions/:id/iframe`
Body: `{ iframeUrl: string | null, iframeMode: "split" | "rotate" | null }`
- Validates URL is a valid http/https URL or null
- iframeMode required if iframeUrl is set
- Returns updated session

### Display behavior
- Iframe is only shown once a session is active (never on the entry/splash screen)
- If the iframe URL fails to load (blocked by target site CSP/X-Frame-Options), display a subtle fallback message: "Content unavailable" in the iframe area — do not crash the board
- In split mode: donor board takes left side, iframe takes right side. TotalsBar spans full width at the bottom.
- In rotate mode: iframe is treated as page 0 in the rotation cycle, shown for the same ~8 second interval as donor card pages.

---

## Frontend Architecture

### Polling Hook
All data-displaying pages use a shared `usePolling(sessionId, intervalMs)` hook:
- Calls `GET /api/sessions/:id` on mount and every `intervalMs`
- Returns `{ session, loading, error }`
- Shows a subtle connection status indicator on repeated failures
- Cleans up interval on unmount

### API Module (`/client/src/api.js`)
All fetch calls go through a thin wrapper — no raw `fetch` calls in components. This keeps pages clean and makes it easy to swap the base URL or add headers later.

### localStorage Usage
- Admin page stores `sessionId` in `localStorage` key `donor_board_admin_session`
- Kiosk display stores `sessionId` in `localStorage` key `donor_board_kiosk_session`
- Both have a "clear session" mechanism to wipe localStorage and return to entry screen

---

## Deployment

### Render Configuration
- **Service type:** Web Service
- **Build command:** `cd client && npm install && npm run build && cd ../server && npm install`
- **Start command:** `node server/index.js`
- **Environment:** Node 18+
- **Root directory:** `/` (monorepo root)

### Static File Serving
Express serves `/client/dist` as static files. All unmatched routes fall through to `index.html` to support React Router's client-side routing:
```js
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

### Known Quirks & Gotchas

| Quirk | Impact | Mitigation |
|---|---|---|
| Render free tier spins down after 15min inactivity | First request after spin-up takes ~30s | Warn users; kiosk auto-polls so it'll stay warm during event |
| In-memory data lost on restart | Session data gone | Admins should CSV export regularly; import on rejoin |
| iframe CORS | Kiosk display may be blocked by host site | Render sets permissive CORS headers; host site restrictions are out of our control |
| Embedded URL blocked by target site | Some URLs set `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors` preventing them from loading in an iframe | Admin should test their target URL in advance; display page should show a fallback message if the iframe fails to load |
| Split screen on narrow screens | Split mode may be unusable on screens narrower than ~900px | Admin UI should warn that split mode is designed for landscape TV screens only |
| React Router + Express catch-all | Direct URL access (e.g. `/display/ABC123`) must not be intercepted by Express before static files | Ensure API routes are registered before the catch-all `*` handler |
| Vite dev proxy | `/api` calls in dev go to `localhost:3001` | Configured in `vite.config.js`; don't hardcode API URLs in components |
| UUID v4 for donor IDs | Guaranteed unique within session | Use `crypto.randomUUID()` or `uuid` package — don't use array index as ID |

---

## Dependencies

### Server (`/server/package.json`)
```json
{
  "express": "^4.18.x",
  "cors": "^2.8.x",
  "uuid": "^9.x",
  "multer": "^1.4.x"
}
```

### Client (`/client/package.json`)
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "react-router-dom": "^6.x",
  "papaparse": "^5.x"
}
```

Keep dependencies minimal. Do not add UI component libraries (no MUI, Chakra, shadcn) — plain CSS with variables is sufficient and keeps the bundle small.
