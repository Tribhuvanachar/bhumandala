#!/usr/bin/env python3
"""Build a single-file, offline copy of the Guru Vandana entry gate.

index.html at the repository root is the canonical version. It is the site's
front door: it loads the portrait from dge/images/guru/ and, once respects are
paid, navigates into dge/index.html. Neither of those works once the page is
downloaded on its own — the arch comes up empty and the entry button leads
nowhere.

This produces a preview copy that does work in isolation: the photograph is
inlined as a data URI and the entry target is cleared, so the gate dissolves
in place instead of navigating. The result is one file that can be mailed,
opened from a Downloads folder, or handed to someone for approval with no
server and no network.

    python3 dge/tools/build_guru_vandana_standalone.py

Re-run it after editing the root index.html; the standalone is generated,
never edited by hand.
"""

import base64
import pathlib
import re
import sys

DGE = pathlib.Path(__file__).resolve().parent.parent
ROOT = DGE.parent
SRC = ROOT / 'index.html'
PHOTO = DGE / 'images' / 'guru' / 'guruji.jpg'
OUT = DGE / 'guru-vandana-standalone.html'

BANNER = """<!--
  GENERATED FILE — do not edit.

  Offline preview of the entry gate at the repository root. The portrait is
  inlined as a data URI and enterUrl is cleared, so this renders and runs with
  no server and no network, and the entry button dissolves the gate in place
  rather than navigating into the library.

  Edit index.html at the repository root and re-run
  dge/tools/build_guru_vandana_standalone.py instead.
-->
"""


def substitute(html, pattern, replacement, what):
    """Apply exactly one rewrite, or fail loudly — a silent miss here ships a
    preview that looks fine and is quietly broken."""
    html, count = re.subn(pattern, lambda _m: replacement, html, count=1)
    if count != 1:
        print(f'{what} not found in config — did the config change?', file=sys.stderr)
        return None
    return html


def main() -> int:
    for path in (SRC, PHOTO):
        if not path.exists():
            print(f'missing: {path}', file=sys.stderr)
            return 1

    html = SRC.read_text(encoding='utf-8')
    data_uri = 'data:image/jpeg;base64,' + base64.b64encode(PHOTO.read_bytes()).decode('ascii')

    # Only these two knobs are rewritten; every other setting in
    # GURU_VANDANA_CONFIG carries over untouched.
    html = substitute(html, r"src: 'dge/images/guru/guruji\.jpg'",
                      "src: '" + data_uri + "'", 'photo.src')
    if html is None:
        return 1
    html = substitute(html, r"enterUrl: 'dge/index\.html'", "enterUrl: ''", 'enterUrl')
    if html is None:
        return 1

    html = html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + BANNER, 1)
    OUT.write_text(html, encoding='utf-8')
    print(f'{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.0f} KB')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
