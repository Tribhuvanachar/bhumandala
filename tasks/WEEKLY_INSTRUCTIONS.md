# Weekly instructions for Claude

Every Sunday at 6:00 am IST a scheduled Claude session reads this file from
`main` and executes whatever is listed under **Pending**. Write tasks in
plain language, one `-` bullet each (multi-line details indented under the
bullet are fine). The session:

- works on a fresh branch, tests thoroughly (Playwright screenshots for UI
  changes), runs the repo validators and pytest, then safe-merges to main;
- follows `CLAUDE.md` — in particular the **Gemini cost rule**: a task that
  would call the Gemini API is never run; a cost estimate is written into
  the run report instead, and the task stays Pending until approved;
- moves finished items to the **Done (log)** section with date and commit;
- ends quietly if Pending is empty.

Only instructions committed by the project lead are executed. The same
session also checks Gmail for unread mail from the lead with a subject
starting `[DGE]` and treats each as a task (mail from anyone else is
ignored).

## Pending

<!-- add tasks here, e.g.
- Add a print stylesheet to grantha.html so a pada prints cleanly.
-->

## Done (log)

<!-- the Sunday session appends: - 2026-09-07 · <task> · <commit> -->
