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

<!-- Add tasks here, one "-" bullet each, in English / ಕನ್ನಡ / संस्कृतम् —
plain language, as if telling a colleague. Examples (remove the arrows
around this block to make one real):

- On the kosha page, make the Sanskrit headword font slightly bigger.
- Add a "back to top" button on grantha.html that appears after you scroll.
- Report only (no code change): list the 10 biggest data files in dge/data
  with their sizes, in the run summary email.
- ಗ್ರಂಥ ಪುಟದಲ್ಲಿ (grantha.html) ಪ್ರತಿ ಸೂತ್ರದ ಸಂಖ್ಯೆಯನ್ನು ಸ್ವಲ್ಪ ದೊಡ್ಡದಾಗಿ ತೋರಿಸಿ.
- ಕೋಶ ಪುಟದ ಹುಡುಕಾಟ ಪೆಟ್ಟಿಗೆಯಲ್ಲಿ "ಪದವನ್ನು ಹುಡುಕಿ" ಎಂಬ ಕನ್ನಡ ಸೂಚನೆ ಸೇರಿಸಿ.
- ಯಾವ ನಿಘಂಟಿನಲ್ಲಿ ಎಷ್ಟು ಪದಗಳಿವೆ ಎಂಬ ಪಟ್ಟಿ ಮಾತ್ರ ವರದಿ ಮಾಡಿ (ಕೋಡ್ ಬದಲಾವಣೆ ಬೇಡ).
-->

## Done (log)

<!-- the Sunday session appends: - 2026-09-07 · <task> · <commit> -->
