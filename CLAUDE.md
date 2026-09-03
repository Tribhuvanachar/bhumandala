# Working notes for Claude

## Time and dates

**Report every time in IST (Asia/Kolkata, UTC+05:30), the project lead's local
time in Bangalore.** Write it as `10:30 am IST`, not `05:00Z` — "Z" means UTC
and is not a form to use here.

GitHub Actions, git commits and server logs all speak UTC. Convert before
showing anything to a person; keep UTC only where a machine reads it, such as
a cron expression. When a raw UTC timestamp has to be quoted from a log,
give the IST reading beside it.

    UTC + 5:30 = IST          05:00 UTC = 10:30 am IST

Cron in GitHub Actions is evaluated in UTC, so subtract 5:30 from the intended
IST time — and shift the day fields too when that crosses midnight.

## Gemini API cost discipline

The Gemini key runs on the project lead's **prepaid AI Studio credits**
(a ₹10,000 top-up was exhausted on 3 Sep 2026). Standing rule from the
lead, in force since then:

1. **Before running ANY task that calls the Gemini API, give the lead a
   cost estimate first** — which operations will call Gemini, roughly how
   many input/output tokens, and the resulting ₹ estimate at current
   Gemini pricing — and wait for their go-ahead. This applies to OCR
   proofreads, enrichment, summarisation, benchmarks: everything.
2. **Every pipeline that calls Gemini must record its real burn.** Pass a
   `usage_totals` dict to `tools/gemini_client.call_gemini` and persist it
   in the run's output (the OCR stagers write it as the staged JSON's
   `"usage"` key and print it in the workflow log). New tools must do the
   same before their first paid run.
3. Estimate from measured data, not guesses: chars-of-text ÷ 4 ≈ tokens
   for English, ÷ ~1.5–2 for Devanagari; output usually costs ~8× input
   per token on Flash-class models, and thinking tokens bill as output.
   Quote per-run and whole-task numbers.
4. Prefer the cheapest model that survives the task's own quality gates
   (`gemini-flash-latest` vs `-lite`); batch pages so the fixed prompt +
   schema overhead amortises; never re-run a paid stage whose output is
   already staged and committed.
