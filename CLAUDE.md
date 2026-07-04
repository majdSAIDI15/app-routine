# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Files

- **[index.html](index.html)** — the real app (in active development): a self-contained daily-routine todo (French UI). All HTML/CSS/JS in one file, no build step, no deps, no tests. Open it in a browser to run.
- **[routine_majd.html](routine_majd.html)** — the original throwaway prototype (fixed routine, `window.storage` host API). Kept only as a design reference; **do not build on it** — `index.html` supersedes it.

The project is evolving toward a PWA + Supabase sync (see `~/.claude/projects/.../memory/projet-todo-plan.md` for the phased plan). Currently at the end of the local-first phase.

## Persistence (`index.html`)

Uses `localStorage` via an isolated `Store` object — this indirection is deliberate: it will be swapped for a Supabase backend at the sync phase, so **keep all reads/writes going through `Store`** (async methods, so the swap is drop-in). Keys: `todo:tasks`, `todo:completions`, `todo:overrides`, `todo:categories`, `todo:theme`.

## Architecture (all inside the `<script>` IIFE)

Framework-free, **full re-render on every change** (`render()` rebuilds `#app`, then `wire()` re-attaches listeners, then `renderOverlays()`). Same pattern as the prototype, scaled up.

- **Data model**: a task = `{id, title, category, time, duration, recurrence, note, subtasks[], makeup?}`. Recurrence = `{type: once|daily|weekly|monthly, date, weekdays[], monthDay, last, interval, anchor, until}`.
- **Completion is per-occurrence**, never a flag on the task: `done` is keyed `"<id>::YYYY-MM-DD"`. Subtasks reuse the same map with their own ids; a task with subtasks is "done" iff all subtasks are done (`taskDone()`).
- **`ovr` map** (`"<taskId>::date"` → `{snoozed, movedTo, makeupId}`) holds per-occurrence overrides for the overdue/reschedule flows — separate from completion.
- **`occursOn(task, date)`** is the single source of truth for "does this task fall on this day"; **`getStatus(task, date)`** derives the temporal state (`current`/`overdue`/`missed`/`later`/`moved`/`done`). Both are pure and unit-testable in node (see the recurrence test harness pattern).
- **Reschedule = a new one-off task** (`makeup:true`, `recurrence.type:'once'`) plus an `ovr.movedTo` on the original occurrence — the recurring rule is never mutated.
- **Categories**: `DEFAULT_CATS` merged with user-created ones (`custom:true`) into the live `CATS` object; only the custom ones are persisted.
- **Views**: `view` state = `day | tasks | stats`, plus overlay states (`modal`, `resched`, `settingsOpen`, `confirmState`) rendered by priority in `renderOverlays()`. `askConfirm()` returns a Promise for in-app confirmation (no native `confirm()`); `toast()` for transient feedback.

## Editing guidance

- The day is measured in real minutes-since-midnight (unlike the prototype's 04:00-shifted scale).
- `item.id` / subtask ids are persistence keys — reusing an id migrates old completion state onto a different thing; always mint fresh via `uid()`.
- After editing the JS, sanity-check syntax: extract the script and run `node --check` (the shell already has node). Recurrence changes should be validated with a small node harness that copies the pure date functions.
- Monthly `monthDay > daysInMonth` intentionally clamps to the last day of the month (so "the 31st" fires in February) — don't "fix" this back.
