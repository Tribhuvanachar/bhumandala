#!/usr/bin/env python3
"""Build a single-file, offline copy of the Guru Vandana entry gate.

dge/guru-vandana.html is the canonical version and loads the portrait from
dge/images/guru/. That is correct for the site but useless once the page is
downloaded on its own — the arch comes up empty over file://.

This inlines the photograph as a data URI so the result is one file that can
be mailed, opened from a Downloads folder, or handed to someone for approval
with no server and no network.

    python3 dge/tools/build_guru_vandana_standalone.py

Re-run it after editing guru-vandana.html; the standalone is generated, never
edited by hand.
"""

import base64
import pathlib
import re
import sys

DGE = pathlib.Path(__file__).resolve().parent.parent
SRC = DGE / 'guru-vandana.html'
PHOTO = DGE / 'images' / 'guru' / 'guruji.jpg'
OUT = DGE / 'guru-vandana-standalone.html'

BANNER = """<!--
  GENERATED FILE — do not edit.

  Single-file copy of guru-vandana.html with the portrait inlined as a data
  URI, so it renders with no server and no network. Edit guru-vandana.html
  and re-run dge/tools/build_guru_vandana_standalone.py instead.
-->
"""


def main() -> int:
    for path in (SRC, PHOTO):
        if not path.exists():
            print(f'missing: {path}', file=sys.stderr)
            return 1

    html = SRC.read_text(encoding='utf-8')
    data_uri = 'data:image/jpeg;base64,' + base64.b64encode(PHOTO.read_bytes()).decode('ascii')

    # Only the config's photo.src is rewritten — everything else, including
    # every other knob in GURU_VANDANA_CONFIG, carries over untouched.
    html, count = re.subn(
        r"src: 'images/guru/guruji\.jpg'",
        "src: '" + data_uri + "'",
        html,
        count=1,
    )
    if count != 1:
        print('photo.src not found in config — did the config change?', file=sys.stderr)
        return 1

    html = html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + BANNER, 1)
    OUT.write_text(html, encoding='utf-8')
    print(f'{OUT.relative_to(DGE.parent)}  {OUT.stat().st_size / 1024:.0f} KB')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
