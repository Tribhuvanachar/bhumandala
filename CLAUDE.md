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
