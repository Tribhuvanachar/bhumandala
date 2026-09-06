#!/usr/bin/env bash
# Assemble and upload the Kamadhenu ZeroGPU Space.
#   bash tools/kamadhenu/space/build_space.sh <hf-account>/kamadhenu [--no-upload]
# Pulls Vāgdhenu (Apache-2.0) at the pinned commit for src/ + reference_bank/, adds DGE's app.py,
# meter_map.json and requirements.txt, and uploads the result with huggingface-cli. Nothing from the
# vagdhenu checkout is committed to this repository.
set -euo pipefail
SPACE="${1:?usage: build_space.sh <hf-account>/kamadhenu [--no-upload]}"
HERE="$(cd "$(dirname "$0")" && pwd)"
VAGDHENU_COMMIT="c18927a8a77775753e32248177a5a6bea1019a12"    # 19 Jul 2026, the commit the public demo runs
WORK="${TMPDIR:-/tmp}/kamadhenu_space"; DIST="$WORK/dist"
rm -rf "$DIST"; mkdir -p "$WORK" "$DIST"
if [ ! -d "$WORK/vagdhenu/.git" ]; then git clone --quiet https://github.com/prathoshap/vagdhenu.git "$WORK/vagdhenu"; fi
git -C "$WORK/vagdhenu" checkout --quiet "$VAGDHENU_COMMIT"
cp -r "$WORK/vagdhenu/src" "$DIST/src"                          # render_core, prep_text, limits, reference_bank/
cp "$HERE/app.py" "$HERE/meter_map.json" "$HERE/requirements.txt" "$HERE/README.md" "$DIST/"
cat > "$DIST/THIRD_PARTY_NOTICES.md" <<'N'
src/ is Vāgdhenu (github.com/prathoshap/vagdhenu, Apache-2.0, Prof. Prathosh A P, IISc) at the commit named in build_space.sh.
Weights are downloaded at runtime from huggingface.co/prathoshap/vagdhenu (Apache-2.0; see its THIRD_PARTY_NOTICES.md for IndicF5/BigVGAN).
Kamadhenu-specific files (app.py, meter_map.json) © Sarvamūla Digital Library, Apache-2.0.
N
echo "assembled $DIST ($(du -sh "$DIST" | cut -f1))"
if [ "${2:-}" != "--no-upload" ]; then
  huggingface-cli upload "$SPACE" "$DIST" . --repo-type space
  echo "uploaded → https://huggingface.co/spaces/$SPACE  (set Hardware → ZeroGPU in the Space settings)"
fi
