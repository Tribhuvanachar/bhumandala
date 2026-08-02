# dge/images/

Static image assets. Currently: base templates for the "🖼️ Share as Image"
feature (`js/screenshot.js`).

## Templates saved so far

| File | Look | Branding baked in? |
|---|---|---|
| `template-01-jade-meander.jpg` | Teal/jade parchment, gold meander border | No |
| `template-02-lotus-watercolor.jpg` | Pink/gold lotus corners, watercolor wash | No |
| `template-03-temple-arch-dark.jpg` | Dark navy, gold temple arch + peacock feathers | No |
| `template-04-lotus-medallion.jpg` | Cream parchment, gold lotus corner medallions | No |
| `template-05-parchment-diya.png` | Aged red/gold parchment, diya + peacock feather | **Yes** — "sanatana vidya gurukula - 3 bu 1" is already in the pixels |
| `template-06-minimal-gold.png` | Minimal cream, thin gold frame, small lotus icon | **Yes** |
| `template-07-geometric-mihrab.png` | Vibrant red/teal/gold geometric mihrab arch | **Yes** |
| `template-08-watercolor-river.png` | Soft green watercolor, river + leaves | **Yes** |
| `template-09-stone-inscription.png` | Grayscale carved stone temple pillars | **Yes** |
| `_collage-uncropped-reference.png` | 5 more designs, but bundled as ONE image in a grid — see note below |

## Important: two different branding situations

Templates 01–04 are **clean** — no text baked in. `screenshot.js` should draw
the "Sarvamoola Digitisation Project · Sanatana Vidya Gurukula" + "Designed
by Tribhuvan Achar" footer on top of these, same as it does today.

Templates 05–09 (and every sub-image inside the collage) **already have**
"sanatana vidya gurukula - 3 bu 1" burned into the image itself, at a fixed
position near the bottom. If the code draws its OWN footer text on top of
these too, it'll double up / overlap. Once these get wired in, each
template needs a flag (e.g. `hasBakedBranding: true`) so the code skips
drawing its own footer for that one.

Each design also has a different-shaped "safe zone" for the shloka text —
a rectangle, a pointed temple arch, a rounded mihrab arch, etc. — so the
text placement/wrap width will need to be tuned per template, not one
generic center box for all of them.

## The collage file

`_collage-uncropped-reference.png` is 5 designs in a single 1254×1254 grid
image (2 rows × 3-ish columns), not 5 separate files. It's kept here only
as a visual reference. To actually use any of those 5 designs, they need
to be cropped out individually — happy to do that (crop coordinates can be
worked out from the grid), or if there's a way to re-export them
individually from whatever generated them, that'll give cleaner edges
than cropping a compressed collage.
