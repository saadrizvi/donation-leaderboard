# IMPLEMENTATION_PROMPTS.md — Fundraiser Donor Board

## How to Use This File

Each phase below is a self-contained checkpoint. Complete and verify one phase before starting the next. Each prompt is written to be pasted directly into Claude Code with enough context to work without referencing other files.

**Before starting any phase:** Make sure Claude Code has read `CLAUDE.md`, `TECH_STACK.md`, and `REPO_STRUCTURE.md`.

**Verification rule:** Every phase ends with a working, testable result. Don't move on until the verification step passes.

---

## Phase 1 — Project Scaffolding

**Goal:** Get a working monorepo with Express and React both running locally, talking to each other.

---

### Prompt 1.1 — Initialize the monorepo

```
Set up a monorepo for a Node.js + React project with the following structure:

/
├── package.json          (root — scripts only, no dependencies)
├── server/
│   └── package.json      (express, cors, uuid, multer)
└── client/               (Vite + React, scaffolded via npm create vite)

Root package.json should have these scripts:
- "dev": runs server and client concurrently (use the concurrently package at root level)
- "build": runs `cd client && npm run build`
- "start": runs `node server/index.js`

Do not write any application logic yet. Just the scaffolding and package files.
```

---

### Prompt 1.2 — Express hello world + health check

```
Create server/index.js for an Express app with the following:
- Listens on process.env.PORT || 3001
- Middleware: cors(), express.json()
- A single route: GET /api/health → returns { ok: true, timestamp: new Date().toISOString() }
- A console.log on startup showing the port

No other routes yet. No static file serving yet.
```

---

### Prompt 1.3 — Vite proxy configuration

```
In client/vite.config.js, configure the dev server to proxy all /api/* requests to http://localhost:3001.

Also confirm the React app has a basic App.jsx that renders "Donor Board" in an h1, and that main.jsx mounts it into #root.
```

**✅ Verify Phase 1:** Run `npm run dev`. Visit `http://localhost:5173`. See "Donor Board". Open browser console and fetch `/api/health` — confirm `{ ok: true }` comes back.

---

## Phase 2 — Backend API

**Goal:** All API endpoints implemented and testable. No frontend changes yet.

---

### Prompt 2.1 — In-memory store and session endpoints

```
Create server/routes/api.js with:

1. An in-memory store: const sessions = new Map()

2. A helper function generateSessionId() that returns a random 6-character uppercase string using only: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (no 0, O, 1, I to avoid ambiguity)

3. POST /api/sessions
   Body: { id?: string }  (optional custom ID)
   - If no id provided: generate a random one
   - If id provided: uppercase it, validate alphanumeric 4-20 chars, check for collision (409 if exists)
   - Create session object: { id, goal: null, createdAt: ISO string, donors: [] }
   - Store in Map, return session object with 201

4. GET /api/sessions/:id
   - Return session or 404

Mount this router in server/index.js at /api.
```

---

### Prompt 2.2 — Donor CRUD endpoints

```
Add to server/routes/api.js:

Helper: computeDisplayName(firstName, lastName, isAnonymous)
  - if isAnonymous is true OR both firstName and lastName are blank: return "Anonymous"
  - otherwise: return firstName + (lastName ? " " + lastName[0].toUpperCase() + "." : "")

POST /api/sessions/:id/donors
  Body: { firstName, lastName, amount, isAnonymous }
  - 404 if session not found
  - amount must be a positive number (400 if not)
  - Generate donor id with uuid v4
  - Set createdAt to now
  - Compute displayName using helper
  - Push to session.donors array
  - Return updated session with 201

PUT /api/sessions/:id/donors/:donorId
  Body: { firstName, lastName, amount, isAnonymous }
  - 404 if session or donor not found
  - Update fields, recompute displayName
  - Return updated session

DELETE /api/sessions/:id/donors/:donorId
  - 404 if session or donor not found
  - Remove donor from array
  - Return updated session
```

---

### Prompt 2.3 — Goal, CSV export, CSV import

```
Add to server/routes/api.js:

PUT /api/sessions/:id/goal
  Body: { goal: number | null }
  - 404 if session not found
  - Validate goal is a positive number or null
  - Update session.goal
  - Return updated session

PUT /api/sessions/:id/iframe
  Body: { iframeUrl: string | null, iframeMode: "split" | "rotate" | null }
  - 404 if session not found
  - If iframeUrl is set: validate it is a valid http/https URL
  - iframeMode must be "split" or "rotate" if iframeUrl is present; null if iframeUrl is null
  - Update session.iframeUrl and session.iframeMode
  - Return updated session

GET /api/sessions/:id/export
  - 404 if session not found
  - Set headers: Content-Type: text/csv, Content-Disposition: attachment; filename="donors-[id].csv"
  - Stream CSV with columns: id, firstName, lastName, displayName, isAnonymous, amount, createdAt
  - First row is headers

POST /api/sessions/:id/import
  - Use multer (memory storage) to accept a single file upload (field name: "file")
  - 404 if session not found
  - Parse CSV manually (split lines, parse columns: firstName, lastName, amount, isAnonymous)
  - Skip header row, skip malformed rows silently
  - For each valid row: create a donor using the same logic as POST /donors (uuid, createdAt, displayName)
  - Append to session.donors (do not replace)
  - Return updated session
```

**✅ Verify Phase 2:** Use curl or Postman to:
- `POST /api/sessions` with no body → get a random session ID
- `POST /api/sessions/:id/donors` with a name and amount → donor appears
- `GET /api/sessions/:id` → full session returned
- `GET /api/sessions/:id/export` → CSV downloads
- `PUT /api/sessions/:id/donors/:donorId` → donor updates
- `DELETE /api/sessions/:id/donors/:donorId` → donor removed

---

## Phase 3 — Frontend Shell & Shared Utilities

**Goal:** React Router set up, all pages stubbed, shared API module and polling hook working.

---

### Prompt 3.1 — Router and page stubs

```
Set up React Router v6 in client/src/App.jsx with these routes:
- / → Home page
- /admin → Admin page
- /display → Display page (no session ID)
- /display/:sessionId → Display page (with session ID)
- /summary/:sessionId → Summary page

Create stub components for each page in client/src/pages/:
- Home.jsx: renders an h1 "Donor Board" and two links: "Admin" → /admin, "Display" → /display
- Admin.jsx: renders "Admin Page" in an h1
- Display.jsx: renders "Display Page" in an h1
- Summary.jsx: renders "Summary Page" in an h1

Make sure navigating directly to /admin or /display/:sessionId works (Vite dev server handles this; Express catch-all handles it in production).
```

---

### Prompt 3.2 — API module

```
Create client/src/api.js that exports the following async functions.
All use fetch. Base path is /api. All return parsed JSON or throw on non-2xx.

- createSession(customId?) → POST /api/sessions
- getSession(id) → GET /api/sessions/:id
- addDonor(sessionId, { firstName, lastName, amount, isAnonymous }) → POST /api/sessions/:id/donors
- editDonor(sessionId, donorId, { firstName, lastName, amount, isAnonymous }) → PUT /api/sessions/:id/donors/:donorId
- deleteDonor(sessionId, donorId) → DELETE /api/sessions/:id/donors/:donorId
- setGoal(sessionId, goal) → PUT /api/sessions/:id/goal
- importCSV(sessionId, file) → POST /api/sessions/:id/import (multipart/form-data)
- exportCSV(sessionId) → GET /api/sessions/:id/export (triggers browser download)
- setIframe(sessionId, { iframeUrl, iframeMode }) → PUT /api/sessions/:id/iframe
```

---

### Prompt 3.3 — Polling hook

```
Create client/src/hooks/usePolling.js:

export function usePolling(sessionId, intervalMs = 4000) {
  // Returns { session, loading, error, refresh }
  // - On mount: fetch session immediately
  // - Set up interval to fetch every intervalMs
  // - Clear interval on unmount or when sessionId changes
  // - loading: true only on first fetch
  // - error: set to error message string on failure, null on success
  // - refresh: manual trigger function
  // - If sessionId is null/undefined, do nothing and return { session: null, loading: false, error: null }
}
```

**✅ Verify Phase 3:** Navigate to all routes without errors. In browser console, call `import('/src/api.js')` and verify the module loads. No visual polish needed yet.

---

## Phase 4 — Admin Page

**Goal:** Fully functional admin panel. Mobile-friendly. All CRUD operations working end-to-end.

---

### Prompt 4.1 — Session entry screen

```
Build the session entry screen as a component client/src/components/SessionEntry.jsx.

It should show two options:
1. "Create new session" — a button that calls createSession() and returns the new session ID
2. "Join existing session" — a text input + "Join" button that calls getSession(id) to verify it exists, then returns the ID

Props: onSessionSet(sessionId) — called when a session is confirmed

On Admin.jsx: if no active session (check localStorage key "donor_board_admin_session"), show <SessionEntry>. Once set, store in localStorage and show the main admin UI. Display the session ID at the top with a copy-to-clipboard button and a "Leave Session" button that clears localStorage.
```

---

### Prompt 4.2 — Add donor form

```
Build client/src/components/DonorForm.jsx:

Fields:
- First name (text, optional)
- Last name (text, optional)  
- Amount (number, required, min 0.01)
- Anonymous toggle (checkbox/switch)

Behavior:
- If anonymous is toggled ON, grey out and clear the name fields
- On submit: call onSubmit({ firstName, lastName, amount, isAnonymous })
- Reset form after successful submit
- Show inline validation error if amount is missing or invalid

Props: onSubmit(donorData), loading (bool), defaultValues (for edit mode)

Wire into Admin.jsx to call addDonor() and refresh the session.
```

---

### Prompt 4.3 — Duplicate detection modal

```
Build client/src/components/DuplicateModal.jsx:

A modal dialog that appears when a new donor's full name (case-insensitive) matches an existing non-anonymous donor.

Props: existingDonor (the matched donor object), onConfirm(), onCancel()

Shows: "A donor named [name] already exists with a $[amount] donation. Are you sure you want to add another?"

Two buttons: "Add Anyway" → onConfirm(), "Cancel" → onCancel()

Wire into Admin.jsx: before calling addDonor(), check session.donors for a case-insensitive firstName+lastName match among non-anonymous donors. If found, show the modal. Only call addDonor() on confirmation.
```

---

### Prompt 4.4 — Donor list with edit and delete

```
Build client/src/components/DonorList.jsx:

Shows all donors in the session, sorted by amount descending.

Each row shows:
- displayName
- Formatted amount (e.g., $1,500.00)
- A subtle "possible duplicate" indicator (⚠️ icon) if another non-anonymous donor shares the same full name (case-insensitive)
- Edit button → opens DonorForm in edit mode (pre-filled)
- Delete button → shows a simple confirm dialog ("Delete this donor?") then calls deleteDonor()

Wire into Admin.jsx. Refreshes via polling (usePolling hook).
```

---

### Prompt 4.5 — Goal setting, iframe config, and CSV controls

```
Add to Admin.jsx:

Goal input:
- Number input labeled "Fundraising Goal (optional)"
- "Set Goal" button → calls setGoal()
- Shows current goal if set, with a "Clear Goal" button (setGoal with null)

Iframe embed config (new section in admin panel):
- URL text input labeled "Embed URL (optional)" — any valid http/https URL
- Display mode selector: two clearly labeled options — "Split screen" and "Rotating page"
- "Save Embed" button → calls setIframe(sessionId, { iframeUrl, iframeMode })
- "Remove Embed" button (shown only if iframeUrl is set) → calls setIframe with nulls
- Show a helper note: "Split screen works best on wide TV displays. Rotating page works on any screen."
- Mobile admin note: warn that split mode is designed for landscape TV screens

CSV Export:
- "Export CSV" button → calls exportCSV() which triggers a browser file download

CSV Import:
- File input (accept=".csv") + "Import CSV" button
- On file select + submit: calls importCSV(sessionId, file)
- Shows success message with count of donors added, or error message
```

**✅ Verify Phase 4:** On a phone browser (or devtools mobile emulation):
- Create a session, add 3 donors, one anonymous
- Try adding a duplicate name — confirm modal appears
- Edit a donor amount
- Delete a donor
- Set a goal
- Export CSV, verify it downloads with correct data
- Import the same CSV back, verify donors are appended

---

## Phase 5 — Kiosk Display Page

**Goal:** TV-optimized donor board with auto-rotating pages, live totals, and goal progress bar.

---

### Prompt 5.1 — Donor card and grid

```
Build client/src/components/DonorCard.jsx:
- Props: donor, isNewest (bool)
- Shows: displayName (large), formatted amount (large)
- If isNewest: show a small "✨ New" badge in the corner
- Anonymous donors show "Anonymous" as name
- Designed for a dark background — white text, high contrast

Build client/src/components/DonorGrid.jsx:
- Props: donors (full sorted array), pageSize (default 8)
- Slices donors into pages of pageSize
- Displays current page
- Auto-advances to next page every 8 seconds using setInterval
- Wraps back to page 1 after the last page
- Smooth fade or slide CSS transition between pages
- The most recently added donor (latest createdAt) gets isNewest=true on its card
- If only 1 page, no rotation needed
```

---

### Prompt 5.2 — Totals bar and goal progress

```
Build client/src/components/GoalProgress.jsx:
- Props: current (number), goal (number)
- Renders a horizontal progress bar showing current/goal
- Tick marks at 25%, 50%, 75%, 100% of goal with labels
- Shows percentage and dollar amounts
- Accessible: use aria-valuenow, aria-valuemin, aria-valuemax

Build client/src/components/TotalsBar.jsx:
- Props: session
- Fixed to bottom of screen
- Shows: "[N] Donors  |  $[total] Raised"
- If session.goal is set: show <GoalProgress current={total} goal={session.goal} />
- Large, readable font
```

---

### Prompt 5.3 — IframeEmbed component

```
Build client/src/components/IframeEmbed.jsx:

Props: url (string), mode ("split" | "rotate"), className (string)

Behavior:
- Renders an <iframe> with the given URL, sandboxed with: allow="autoplay; fullscreen"
- Listens for the iframe's error event — if it fails to load, show a centered fallback
  message: "Content unavailable" with a muted style (do not break the layout)
- Never renders anything if url is null/undefined
- In split mode: takes up 50% of the display width, full height minus TotalsBar
- In rotate mode: takes up the full display area (same as a full donor card page)
- Add a subtle border or visual separator in split mode so the two panels are distinct
```

### Prompt 5.4 — Display page assembly

```
Assemble client/src/pages/Display.jsx:

Behavior:
1. Check URL params for :sessionId
2. If not in URL, check localStorage key "donor_board_kiosk_session"
3. If neither, show fullscreen <SessionEntry> overlay
4. Once session ID is confirmed: store in localStorage, fetch and display

Base layout (no iframe or rotate mode):
- Fullscreen dark background
- <DonorGrid> takes up the main area (sorted by amount descending)
- <TotalsBar> fixed at the bottom

Split mode layout (session.iframeMode === "split"):
- Horizontal flex layout: <DonorGrid> on the left (50%), <IframeEmbed> on the right (50%)
- <TotalsBar> spans full width at the bottom below both panels

Rotate mode layout (session.iframeMode === "rotate"):
- <IframeEmbed> is injected as page 0 of the DonorGrid rotation cycle
- DonorGrid should accept an optional firstPage prop (a React node) that is shown as the
  first page before donor cards begin rotating
- The iframe page respects the same 8-second interval as donor card pages

All layouts:
- Small subtle ⚙ icon in bottom-right corner — clicking it reveals a "Clear Session" button
  that wipes localStorage and returns to the entry overlay
- Polls every 4 seconds via usePolling
- Shows <StatusIndicator> in a corner

Apply display.css: large fonts, dark bg (#0f0f1a or similar), high contrast cards, generous padding.
```

**✅ Verify Phase 5:** Open `/display` on a large browser window (simulate TV). Enter a session ID with 10+ donors. Confirm:
- Cards display correctly, 8 per page
- Auto-rotates every 8 seconds with animation
- Newest donor has the badge
- Bottom bar shows correct totals
- Goal progress bar appears if goal is set
- Ticks are visible at 25/50/75/100%
- ⚙ icon reveals Clear Session
- Set an iframe URL with split mode — donor board and iframe appear side by side
- Set an iframe URL with rotate mode — iframe appears as first page in rotation cycle
- Set an invalid/blocked URL — fallback "Content unavailable" message shown gracefully
- Remove iframe URL from admin — display returns to donor-only layout

---

## Phase 6 — Summary Page

**Goal:** Clean end-of-event summary, printable, with top donors highlighted.

---

### Prompt 6.1 — Summary page

```
Build client/src/pages/Summary.jsx:

Fetches session once on mount (no polling). Uses :sessionId from URL params.

Layout:
1. Header: "Thank You!" or "Event Summary" — [session ID]
2. Top Donors section: highlight the top 5 donors visually (gold/silver/bronze styling for top 3, distinct cards for 4th and 5th). Show rank, displayName, amount.
3. Final Totals section: total donors count, total raised, goal (if set) with GoalProgress bar
4. A "Print / Save as PDF" button that calls window.print()

Apply summary.css:
- Clean white background for print
- @media print: hide the print button, ensure layout fits on one page
- Top 3 donors get distinct visual treatment (e.g., larger card, accent color, trophy icon)
```

**✅ Verify Phase 6:** Navigate to `/summary/:sessionId`. Confirm top donors are visually distinct. Click Print and verify layout is clean.

---

## Phase 7 — Polish & Production Readiness

**Goal:** Styling pass, error states, status indicators, production build verified on Render.

---

### Prompt 7.1 — CSS variables and global styles

```
Define CSS custom properties in client/src/styles/global.css:

:root {
  --color-bg: #0f0f1a;
  --color-surface: #1a1a2e;
  --color-accent: #e94560;
  --color-text: #ffffff;
  --color-text-muted: #aaaacc;
  --color-success: #00c896;
  --color-warning: #f5a623;
  --font-display: 'Segoe UI', system-ui, sans-serif;
  --radius: 12px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 32px;
}

Apply these variables consistently across admin.css, display.css, and summary.css. Admin uses a light background variant for readability on mobile.
```

---

### Prompt 7.2 — Status indicator and error states

```
Build client/src/components/StatusIndicator.jsx:
- Props: error (string | null), consecutiveFailures (number)
- Green dot: connected (0 failures)
- Yellow dot: 1-2 consecutive failures ("Reconnecting...")
- Red dot + message: 3+ failures ("Connection lost — retrying")
- Small, unobtrusive — bottom-left corner of screen

Add error handling to Display.jsx and Admin.jsx:
- If session is not found (404): show a full-screen message "Session not found. Check your session ID." with a button to clear and re-enter.
- If server is unreachable: show StatusIndicator in red state.
```

---

### Prompt 7.3 — Production build and Render deployment

```
Configure Express in server/index.js to serve the React production build:

const path = require('path');
const distPath = path.join(__dirname, '../client/dist');

app.use(express.static(distPath));
app.get('*', (req, res) => {
  // Only fall through to index.html for non-API routes
  res.sendFile(path.join(distPath, 'index.html'));
});

Make sure this comes AFTER all /api route registrations.

Verify the root package.json build script runs: cd client && npm install && npm run build
Verify the start script runs: node server/index.js

Create a render.yaml or document the Render deployment settings:
- Build command: npm run build
- Start command: npm start
- Node version: 18
```

**✅ Verify Phase 7:** Run `npm run build` then `npm start`. Visit `http://localhost:3001`. All routes work. Navigate to `/admin`, `/display`, `/summary/TEST` — all load correctly with no Vite dev server running.

---

## Phase 8 — Final QA Checklist

Run through this checklist manually before considering the project complete:

### Admin (mobile, phone browser)
- [ ] Create a new session with a random ID
- [ ] Create a new session with a custom ID
- [ ] Join an existing session by ID
- [ ] Add a named donor
- [ ] Add an anonymous donor (toggle)
- [ ] Add a donor with no name (auto-anonymous)
- [ ] Trigger duplicate name warning and confirm "Add Anyway"
- [ ] Edit a donor's amount
- [ ] Delete a donor with confirmation
- [ ] Set a fundraising goal
- [ ] Export CSV and verify contents
- [ ] Import CSV and verify donors are appended
- [ ] Open admin in two browser tabs with the same session ID — confirm both sync via polling

### Display (large browser window / TV simulation)
- [ ] Visit `/display` — see fullscreen session entry overlay
- [ ] Enter session ID — overlay disappears, board shows
- [ ] Visit `/display/:sessionId` directly — no overlay
- [ ] Refresh page — session persists via localStorage
- [ ] Donor cards display correctly (name, amount, newest badge)
- [ ] Pages auto-rotate every ~8 seconds
- [ ] Totals bar updates when donors are added (within ~4s)
- [ ] Goal progress bar shows and updates
- [ ] ⚙ icon → Clear Session → returns to entry overlay
- [ ] Set iframe URL + split mode in admin → kiosk shows split layout
- [ ] Set iframe URL + rotate mode in admin → iframe rotates as first page
- [ ] Set an unembeddable URL → fallback message shown, board still works
- [ ] Remove iframe URL in admin → kiosk returns to donor-only layout within 4s

### Summary
- [ ] Visit `/summary/:sessionId` — loads correctly
- [ ] Top 3 donors visually distinct
- [ ] Final total and goal shown
- [ ] Print layout is clean

### Cross-cutting
- [ ] Kill the server — Status indicator turns red
- [ ] Restart server — Status indicator returns to green
- [ ] All pages work on mobile viewport
- [ ] No console errors in production build
