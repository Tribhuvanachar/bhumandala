# tasks/ — how the project lead talks to Claude through the repository

Two files and one folder. All three are plain text in git, so every request,
every answer and every decision is on the record and needs no service to run.

| Path | Who writes it | What it is |
|---|---|---|
| `WEEKLY_INSTRUCTIONS.md` | the lead (by hand, or through the admin page) | The queue. Bullets under **## Pending** are executed by the Sunday session; finished ones move to **## Done (log)**. |
| `inbox/<id>.json` | the admin page (as the lead), then Claude | One conversation: the request, the sections it concerns, and a reply thread. |
| `README.md` | — | This file: the protocol both sides follow. |

## From the website

**Admin Tools → Repository & Workflows → 🤖 Ask Claude.** Pick the library
sections the request concerns (search by title or path, tick as many as you
like — or none), write the instruction in English, Kannada or Sanskrit, and
press Send. The page uses the GitHub token in the browser (the same one Repo
Files and Library Manager use) to commit two things to `main` **as the lead**:

1. `tasks/inbox/<id>.json` — the request, with `status: "pending"` and a
   `thread` holding the first message;
2. a bullet at the top of **## Pending** in `WEEKLY_INSTRUCTIONS.md`:
   `- [inbox <id>] <instruction> — sections: … (full request and reply thread:
   tasks/inbox/<id>.json — answer there per tasks/README.md)`.

The commit author is the lead's own account, which is exactly the trust check
the Sunday session already applies (it executes only bullets committed by the
lead). Nothing else is needed: no new secret, no server, no second token.

The same tab lists every conversation with its status and thread. The lead
can reply there (appends to `thread`, status back to `pending`) or mark it
done. Reading needs no token; writing does.

## The id

`YYYYMMDD-HHMM-xxxx` in IST, so files sort by when they were asked.

## What Claude does with one

Whichever session sees it — the Sunday routine, or any Claude Code session the
lead points at it with the **Copy prompt for a Claude session** button:

1. Read `tasks/inbox/<id>.json`. The `sections[]` carry `path` (a `data.json`
   under `dge/data/`) and `title`; `instruction` is the ask; `thread[]` is
   the whole conversation so far, newest last.
2. Do it, or answer it. A question gets an answer; a change (delete, pair,
   categorise, rename, move) is made on a branch, tested, and merged by the
   standing procedure in `HANDOFF.md` §3 — **except** anything the standing
   rules reserve for the lead (money, deleting data, publishing, DNS), which
   gets a proposal in the thread and `status: "needs-answer"` instead.
3. Append to `thread`: `{"who": "claude", "at": "<ISO UTC>", "text": "…"}` —
   what was done, with commit ids, or the answer, or the question back. Times
   in the text in IST.
4. Set `status`: `answered` (a question, answered), `done` (a change, made and
   merged), `needs-answer` (waiting on the lead). Never delete a file here.
5. Move the bullet in `WEEKLY_INSTRUCTIONS.md` from **## Pending** to
   **## Done (log)** as `- <date> · [inbox <id>] <task> · <commit>` — for
   `needs-answer`, leave it under Pending so the next run sees it again.
6. Commit with the usual trailers.

`status` values: `pending` (lead's turn is over, Claude's next) →
`answered` / `needs-answer` / `done`. A lead reply flips any of them back to
`pending`.

## Why a file and not a chat

The website is static and public; it cannot hold a Claude token and must not.
A file in the repository is the one channel both sides can already write to
with credentials they already have, and it leaves a history a future session
can read. The cost is latency — Sunday 6:00 am IST by default, or whenever the
lead pastes the prompt into a session — which for curation decisions is fine.

## Mail

The Sunday session also reads unread Gmail from the lead with a subject
beginning `[DGE]` and treats each as a task. That path is unchanged.
