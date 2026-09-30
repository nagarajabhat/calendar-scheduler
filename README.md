**Live demo:** https://calendar-scheduler-lime.vercel.app

**Test login:** `emilys` / `emilyspass`

**Design note:** [docs/Design_Note.pdf](docs/Design_Note.pdf)

# Calendar Scheduler (React + Tailwind + Axios)
Login with DummyJSON (`emilys` / `emilyspass`), then create, move, resize, repeat and undo events. No calendar/date/DnD/state-history libraries.

## Setup
`npm install && npm run dev` Â· build: `npm run build` Â· deploy to Vercel/Netlify (SPA rewrite files included).

## Checklist
- [x] Login, protected routes, logout, /auth/me restore, 401 â†’ single shared refresh â†’ retry, multi-tab logout
- [x] Week/month views; view, date, tz, attendee filter in URL with safe fallbacks
- [x] Drag-create (15-min snap), move, resize with live rAF preview, Esc cancel, 1 drag = 1 undo step, keyboard move (select, `M`, arrows)
- [x] Overlap layout (own algorithm), recurrence (daily/weekly/monthly incl. nth weekday, until/count, this/following/all)
- [x] Attendee multi-select (debounced search), live conflict warning, timezone switcher (UTC storage)
- [x] Undo/redo (buttons, Ctrl+Z / Ctrl+Shift+Z), /events/:id (Not found on bad id), fake sync with saving/saved/failed
- [x] Working-hours shading (9â€“17), editable recurrence on existing series, draggable all-day events, `npm test` (Vitest)
- [x] localStorage persistence with schema version + corruption recovery (re-seed from /todos)

## Known limitations
Multi-day timed events are clipped per day and dragging them is approximate; all-day drag moves by whole days only; tests cover the core logic (layout, recurrence, edit scopes, history/rollback) but not the UI.

## Design note
**State/history:** `useReducer` + Context. Every change is a command `{id,label,changes:[{id,before,after}]}`; do applies `after`, undo applies `before`; `past`/`future` stacks. A drag commits one command on pointerup.
**Overlap:** sort by start, split into clusters of transitively overlapping events, give each event the first free column; width = 1/columns of its cluster.
**Recurrence:** only the master rule is stored (with `exceptions`). `expand()` generates occurrences for the visible range, computing each from the master's wall-clock time in the rule's zone (DST-safe); the 31st clamps to month end. "This" adds an exception plus a standalone event; "following" truncates the series (`until`) and starts a new one; "all" shifts the master.
**Persistence/rollback:** events in `localStorage` `{version,events}`; invalid data is discarded and re-seeded. A failed fake sync reverts its command only if no later command touched the same events; otherwise it is only flagged, so later undo steps and the last action always win.
**Perf:** drag state in refs, preview via requestAnimationFrame, `memo` on columns/blocks so pointer moves re-render only the ghost.
**Hard problem:** DST-correct recurrence, solved by generating from wall-clock parts and converting with `zoned()`.

