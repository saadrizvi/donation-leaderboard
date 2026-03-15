# REPO_STRUCTURE.md — Fundraiser Donor Board

## Directory Tree

```
/
├── CLAUDE.md                        # Project overview and doc index (start here)
├── RESEARCH.md                      # Business goals, personas, future roadmap
├── TECH_STACK.md                    # Stack rationale, system design, quirks
├── REPO_STRUCTURE.md                # This file
├── IMPLEMENTATION_PROMPTS.md        # Phase-by-phase build prompts for Claude Code
├── package.json                     # Root scripts only (dev, build, start)
│
├── server/
│   ├── package.json                 # Server dependencies (express, cors, uuid, multer)
│   ├── index.js                     # Express entry point — mounts routes, serves static files
│   └── routes/
│       └── api.js                   # All /api/* route handlers and in-memory store
│
└── client/
    ├── package.json                 # Client dependencies (react, react-router-dom, papaparse)
    ├── vite.config.js               # Vite config — dev proxy for /api → localhost:3001
    ├── index.html                   # HTML entry point (Vite default)
    └── src/
        ├── main.jsx                 # React app mount point
        ├── App.jsx                  # Router setup — all route definitions live here
        ├── api.js                   # Thin fetch wrapper — all API calls go through here
        ├── hooks/
        │   └── usePolling.js        # Shared polling hook used by Display, Admin, Summary
        ├── pages/
        │   ├── Home.jsx             # Landing page — links to /admin and /display
        │   ├── Admin.jsx            # Admin panel — session management, donor CRUD, CSV
        │   ├── Display.jsx          # Kiosk display — donor cards, auto-rotation, totals bar
        │   └── Summary.jsx          # End-of-event summary — top donors, final total vs goal
        ├── components/
        │   ├── DonorCard.jsx        # Single donor card (name + amount + optional badges)
        │   ├── DonorGrid.jsx        # Paginated grid of DonorCards for the kiosk display
        │   ├── TotalsBar.jsx        # Bottom bar — donor count, total raised, goal progress
        │   ├── GoalProgress.jsx     # Progress bar with ticks (used in TotalsBar + Summary)
        │   ├── DonorForm.jsx        # Add/edit donor form (used in Admin)
        │   ├── DonorList.jsx        # Scrollable list of donors with edit/delete (Admin)
        │   ├── SessionEntry.jsx     # Fullscreen session ID entry overlay (Display + Admin)
        │   ├── DuplicateModal.jsx   # Warning modal shown when duplicate name detected
        │   └── StatusIndicator.jsx  # Subtle polling status dot (connected / reconnecting)
        └── styles/
            ├── global.css           # CSS variables (colors, fonts, spacing) + resets
            ├── admin.css            # Admin panel styles
            ├── display.css          # Kiosk display styles (large fonts, dark bg)
            └── summary.css          # Summary page styles + print CSS
```

---

## File Responsibilities

### Root

| File | Responsibility |
|---|---|
| `package.json` | Workspace-level scripts only. `dev` runs both server and client concurrently. `build` compiles the React app. `start` runs the production server. |
| `CLAUDE.md` | Entry point for AI assistants and new developers. Overview + links to all other docs. |

---

### `/server`

| File | Responsibility |
|---|---|
| `index.js` | Creates the Express app. Registers middleware (cors, json parsing). Mounts `/api` routes. Serves `/client/dist` as static files. Catch-all `*` route returns `index.html` for React Router. Listens on `process.env.PORT \|\| 3001`. |
| `routes/api.js` | Contains the in-memory `sessions` Map. Implements all REST endpoints. Handles session creation, donor CRUD, goal updates, CSV export (streamed response), CSV import (via multer). |

---

### `/client/src`

| File | Responsibility |
|---|---|
| `main.jsx` | Mounts `<App />` into `#root`. Wraps in `<BrowserRouter>`. |
| `App.jsx` | Defines all `<Route>` entries. No business logic here. |
| `api.js` | Exports named async functions (`createSession`, `getSession`, `addDonor`, `editDonor`, `deleteDonor`, `setGoal`, `exportCSV`, `importCSV`). All use `fetch`. Base URL is `/api`. |
| `hooks/usePolling.js` | Accepts `(sessionId, intervalMs)`. Calls `getSession` on mount and on interval. Returns `{ session, loading, error }`. Clears interval on unmount. |

---

### `/client/src/pages`

| File | Responsibility |
|---|---|
| `Home.jsx` | Simple landing page. Two buttons: "Open Admin" → `/admin`, "View Display" → `/display`. Minimal — mostly serves as a human-readable entry point. |
| `Admin.jsx` | Main admin page. Manages local state for the current session. Shows `<SessionEntry>` if no session is active. Otherwise shows donor form, donor list, goal input, iframe config (URL + mode selector), CSV controls. Polls every 4s. Mobile-first layout. |
| `Display.jsx` | Kiosk page. Reads `:sessionId` from URL params or localStorage. Shows `<SessionEntry>` overlay if neither is available. Renders `<DonorGrid>` and `<TotalsBar>`. In split mode: renders `<IframeEmbed>` side by side with the donor grid. In rotate mode: `<IframeEmbed>` is inserted as page 0 of the rotation cycle. Polls every 4s. Fullscreen, TV-optimized. |
| `Summary.jsx` | Summary page. Reads `:sessionId` from URL. Fetches session once (no polling needed — can be triggered manually). Shows top 5 donors highlighted, final total, goal progress. Print-friendly. |

---

### `/client/src/components`

| File | Responsibility |
|---|---|
| `DonorCard.jsx` | Renders one donor. Props: `donor`, `isNewest`. Shows `displayName` and formatted `amount`. Renders `✨ Newest` badge if `isNewest`. Handles anonymous display. |
| `DonorGrid.jsx` | Takes full sorted donor array. Slices into pages of 8. Displays current page. Auto-advances every 8s using `setInterval`. Smooth CSS transition between pages. |
| `TotalsBar.jsx` | Fixed bottom bar. Shows total donor count and total amount raised. Renders `<GoalProgress>` if session has a goal set. |
| `GoalProgress.jsx` | Progress bar from $0 to goal. Renders tick marks at 25%, 50%, 75%, 100%. Accepts `current` and `goal` as props. |
| `DonorForm.jsx` | Controlled form for adding or editing a donor. Fields: firstName, lastName, amount, isAnonymous toggle. On submit, calls parent handler. Resets after successful submit. |
| `DonorList.jsx` | Renders a scrollable list of all donors in the session. Each row shows name, amount, edit button, delete button. Highlights rows that are possible duplicates. |
| `SessionEntry.jsx` | Fullscreen overlay. Two modes: (1) Generate random ID, (2) Enter custom/existing ID. On confirm, calls `onSessionSet(id)`. Used by both Admin and Display pages. |
| `DuplicateModal.jsx` | Modal dialog. Shown when a submitted donor name matches an existing non-anonymous donor. Has "Add Anyway" and "Cancel" buttons. Requires explicit confirmation to proceed. |
| `IframeEmbed.jsx` | Renders an `<iframe>` for the configured session URL. Handles load errors gracefully (shows "Content unavailable" fallback). Accepts `url`, `mode` (`split` or `rotate`), and `className` props. Never renders if `url` is null. |
| `StatusIndicator.jsx` | Small dot (green/yellow/red) showing polling connection status. Shown unobtrusively on Display and Admin pages. Goes yellow after 1 failed poll, red after 3 consecutive failures. |

---

### `/client/src/styles`

| File | Responsibility |
|---|---|
| `global.css` | CSS custom properties (`--color-bg`, `--color-accent`, `--font-size-base`, etc.). Box-sizing reset. Base typography. Imported once in `main.jsx`. |
| `admin.css` | Admin panel layout. Mobile-first. Large tap targets. Form styling. Donor list rows. |
| `display.css` | Kiosk display. Dark background. Large fonts. Donor card grid. Bottom bar. Page transition animations. |
| `summary.css` | Summary layout. Top donor highlight styling. `@media print` rules for clean printing. |
