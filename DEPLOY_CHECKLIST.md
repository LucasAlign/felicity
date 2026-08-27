# Felicity — Deploy & QA Checklist

Covers the 10 commits `fa71401 → 9b7576a` (14 implemented features + 3 closed issues)
from the triage of the meeting notes.

## 1. Pre-deploy
- [ ] Confirm you're on the Replit app and it's the canonical lineage
      (`git log --oneline -1` is an ancestor of `origin/main`).
- [ ] Record the current commit for rollback: `git rev-parse HEAD`.
- [ ] Working tree is clean: `git status`.

## 2. Deploy
```bash
git pull
```
- [ ] Pull fast-forwards with no conflicts.
```bash
cd felicity && npm install
```
- [ ] Install completes — picks up `express-async-errors` + `date-fns-tz`.
```bash
npm run db:push
```
- [ ] **Review the drizzle-kit plan before confirming.** It should be purely
      additive (new tables + new nullable columns). No data-loss prompts are
      expected. ⚠️ If it offers to drop/truncate anything, STOP and investigate.

## 3. Verify the migration
Confirm these exist (Replit DB pane or `\dt`):
- [ ] Tables: `categories`, `projects`, `wisdom_entries`, `meals`, `journal_entries`
- [ ] Columns: `appointments.category_id`, `tasks.category_id`,
      `tasks.completed_at`, `categories.project_id`
- [ ] Enum `meal_slot` (breakfast/lunch/dinner/snack)
- [ ] App boots: `npm run build` clean; workflow starts without console errors.

## 4. Feature QA (by area)

### Categories & calendar (#1, #2, #3, #5, #6)
- [ ] On first load, default categories auto-seed (visible in the QuickAdd picker).
- [ ] Colored category dots on month chips, week/day (TimeGrid) chips, and the
      dashboard agenda rows.
- [ ] Month chips show a clock (timed) / sun (all-day) icon + the time.
- [ ] Clicking a day in the month grid opens QuickAdd pre-filled with that date.
- [ ] Calendar runs edge-to-edge; other pages stay centered.

### Tasks (#8, #9)
- [ ] Completing a task strikes it through and keeps it visible; completed >12h
      ago moves under "Show archived". Checkbox toggles both ways.
- [ ] Pencil Edit button on task rows (dashboard + calendar TasksPanel) edits
      title / due date / category; Delete works.

### Drag-to-schedule (#4)
- [ ] Month-view sidebar shows the Unassigned panel with All / Work / Meal /
      Project tabs (open, undated tasks).
- [ ] Drag a task onto a day sets its due date; target day highlights.
- [ ] Plain clicks never move a task.

### Dashboard (#13, #14, #15)
- [ ] Big green Start button opens the brain-dump dialog.
- [ ] Meal Planning card: day selector, add meal by slot, delete; stays on the
      right day.
- [ ] A wisdom entry appears under the Bible verse as "Wisdom for today"
      (hidden when none; rotates daily).

### Projects, Journal, Wisdom (#16, #17, #15)
- [ ] `/projects`: create a project; assign an existing category and create a
      new one inside it; remove one (unassigns, keeps the category); delete a project.
- [ ] `/journal`: write an entry; edit and delete past entries (newest first).
- [ ] What I Know → Words of Wisdom: add/list/delete.
- [ ] Nav shows Dashboard · Calendar · Projects · Journal · What I Know
      (desktop and mobile bottom bar).

### Mobile (#11) — phone or narrow window
- [ ] Tap the bell — panel is centered/full-width under the header, not clipped.
- [ ] Top spacing looks reasonable.

## 5. Regression spot-checks
- [ ] Brain dump extracts correctly, dates in your timezone.
- [ ] Photo/OCR upload works; rate limits don't trip normal use.
- [ ] Day-before + 1-hour reminders fire (#10); Google Calendar sync works (#7).
- [ ] Server logs show no request-body/PII logging.

## 6. Close-out
- [ ] All green → bulk-close the 14 `status:done-pending-deploy` issues
      (#1, #2, #3, #4, #5, #6, #8, #9, #11, #13, #14, #15, #16, #17). See below.
- [ ] Anything off → comment on that specific issue; it stays open.

Bulk-close once QA passes:
```bash
for n in 1 2 3 4 5 6 8 9 11 13 14 15 16 17; do
  gh issue close $n --repo LucasAlign/felicity \
    --comment "Verified live after deploy (commit 9b7576a). Closing."
done
```

## Rollback
- Code: `git reset --hard <recorded HEAD>` then restart.
- DB: the migration is additive, so reverting code just leaves the new
  tables/columns unused (harmless). Drop them manually only if you want them gone.
