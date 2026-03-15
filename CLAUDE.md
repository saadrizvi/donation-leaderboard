# CLAUDE.md — Fundraiser Donor Board

## Project Overview

A lightweight, session-based fundraiser donor display board. Staff manually enter donor names and amounts via a mobile-friendly admin panel. A kiosk display page shows live donor cards and running totals on a TV screen or embedded iframe. No authentication, no payment processing — manual data entry and display only.

Built for short-lived fundraising events (1–2 days). Sessions live in memory and reset on server restart by design.

---

## Key Concepts

- **Sessions** are the core unit. Each fundraising event gets a unique session ID (like Kahoot). Admins share the ID to collaborate. The kiosk locks to a session ID via URL or localStorage.
- **No auth.** The session ID is the only access control. IDs are obscure enough for a 1–2 day event.
- **Polling, not WebSockets.** Every client polls every 4 seconds. Chosen for Render free tier reliability.
- **In-memory only.** Data does not persist across server restarts. CSV export/import is the escape hatch.
- **Per-session iframe embed.** Each session can optionally configure an external URL to display on the kiosk — either as a split screen alongside the donor board, or rotating in as an extra page between donor card pages. Mode is chosen by the admin per session. Only shown once a session is active.

---

## Documentation Index

| File | Purpose |
|---|---|
| [`RESEARCH.md`](./RESEARCH.md) | Business goals, user needs, competitive landscape, future roadmap |
| [`TECH_STACK.md`](./TECH_STACK.md) | Stack choices, rationale, system design, known quirks |
| [`REPO_STRUCTURE.md`](./REPO_STRUCTURE.md) | Directory tree and explanation of every file |
| [`IMPLEMENTATION_PROMPTS.md`](./IMPLEMENTATION_PROMPTS.md) | Phase-by-phase implementation prompts for Claude Code |

---

## Quick Reference

- **Admin panel:** `/admin` — create/join session, add/edit/delete donors, set goal, configure iframe embed, CSV import/export
- **Kiosk display:** `/display/:sessionId` — TV-optimized donor board, auto-rotating pages, live totals, optional iframe embed
- **Summary page:** `/summary/:sessionId` — end-of-event top donors and final total vs goal
- **API base:** `/api/sessions`

---

## Updating This Project

When making changes, update the relevant documentation file alongside the code:
- New routes or data shape → update `TECH_STACK.md` and `REPO_STRUCTURE.md`
- New features or scope changes → update `RESEARCH.md`
- New implementation phases → update `IMPLEMENTATION_PROMPTS.md`
- Core concept changes → update this file
