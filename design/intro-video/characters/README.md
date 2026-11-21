# Adaptive Lifting character reference

**Coordinates first:** `rig.json` uses abstract figure units, not pixels or metres. X runs right; Y runs **up**. The physical floor is **y = 0**. The drawn floor stroke, where present, is centered at y = −1.5 with width 3, so its top meets the floor. Each scene preserves its original square `box` (204 or 228 units) and `origin`. To place a rig point on the SVG page: `svgX = origin.x + x`, `svgY = origin.y − y`. Rotation is in degrees counterclockwise about a shape's center before that Y flip. The raw geometry is two-dimensional; depth and extrusion for Blender are the animator's choices.

This is the pictogram lifter from Adaptive Lifting's Signal workout screens. Open `character-sheet.png` first. The assets, shape data, source snapshots, and font are all included; the animator does not need the application codebase.

## Construction

- The head is a plain disc, radius 13. Keep it whole when an arm passes behind it. The character has no face, fingers, clothing, or drawn neck.
- Side-view torsos are a round-ended stroke, length 58 and width 20. Front-view torsos are rounded boxes, usually width 32 and corner radius 6.
- Arms and legs are round-capped, round-joined strokes. Upper arm length 32; forearm 30; thigh and shin 44 each. Arm width 13; leg width 15; foot width 10. Front-view poses deliberately simplify the legs to one straight stroke each.
- The rig turns limbs about joints or solves the elbow/knee from the two ends, keeping the intended segment lengths. Some side views deliberately overlap limbs or shorten a projected arm. Use the supplied shapes for those cases rather than reconstructing them from these general dimensions alone.
- Near limbs use the primary tone; far limbs and furniture use the second tone. This is a drawing convention, not a lighting effect. Front-view arms and legs are both primary tone. In dead bug and bird dog, moving limbs are primary tone; supporting/held limbs are secondary. At t = 0 the overlapping held limbs are omitted, just as in the app.
- A crossing gap is transparent space, not a dark outline. A later layer's `halo` shapes erase their expanded silhouettes from all earlier body layers. The new layer then draws on top. Shapes within the same layer do not erase one another, and the ground/furniture group is never erased. At this export size, the gap grows the cutter by 2.5 units on every side.
- At app heights below 60 CSS pixels, non-furniture line widths are multiplied by 1.2. Discs and boxes stay their original size. Furniture strokes remain at least one screen pixel. The app's gap is `min(4.5, max(2.5, 0.7 × viewHeight / size))`. These 1024-pixel exports use normal widths. If making a tiny icon, apply the small-size rule before rendering rather than only shrinking a large PNG.

Keep benches, steps, rail, wall, cable, floor, and weights in their supplied layers. The dumbbell is a short handle plus two rounded boxes. The side-view back squat carries a far-tone disc plate; a front-view bar is a separate drawing in the app. A side-view drawing may show one weight even when the exercise's name says “dumbbells.” That is the app's projection, preserved here.

## Exact colors and lettering

| Colorway filename suffix | Near figure | Far figure / furniture | Suggested background |
|---|---|---|---|
| `yellow` | `#ffc800` | `#a88400` | Ink `#1c1a14` |
| `ink` | `#1c1a14` | `#8a6d00` | Yellow `#ffc800` |

All files in `poses/`, `png/`, and `frames/` have transparent backgrounds. Floor strokes and furniture remain visible. The contact sheet alone has an ink background and an ink-on-yellow strip.

The app uses **Overpass 600, 800, and 900** (semibold, extra bold, black), licensed under the **SIL Open Font License 1.1**. The variable font and its license are in `tools/fonts/`. The font is for captions and app lettering; the figure itself contains no text. The sheet uses the bundled Overpass font.

## Moves and app names

The table uses full exercise names from the app's exercise catalog. Stand, Tall, Cheer, and Victory are descriptive rig pose names, not exercise menu entries. Every move has all three stills, even when they coincide: Stand stays the same, and Tall/Cheer/Victory begin from Stand.

| File key | Plain name | Sheet t |
|---|---|---|
| `squat` | Back squat | 1 |
| `bench` | Dumbbell flat press | 0 |
| `row` | Supported row | 1 |
| `calf` | Calf raise | 1 |
| `deadbug` | Dead bug | 1 |
| `stand` | Stand | 0 |
| `tall` | Tall | 1 |
| `victory` | Victory | 1 |
| `pushup` | Push-up | 0 |
| `airsquat` | Air squat | 1 |
| `bridge` | Glute bridge | 1 |
| `goblet` | Goblet squat | 1 |
| `splitsquat` | Split squat | 1 |
| `incline` | Dumbbell incline press | 0 |
| `onearmrow` | One-arm dumbbell row | 1 |
| `pulldown` | Lat pulldown | 1 |
| `birddog` | Bird dog | 1 |
| `singlecalf` | Single-leg calf raise | 1 |
| `cheer` | Cheer | 1 |
| `rdl` | Dumbbell Romanian deadlift | 1 |
| `kneepushup` | Knee push-up | 0 |
| `wallpushup` | Wall push-up | 1 |
| `inclinepushup` | Incline push-up | 1 |
| `lateralraise` | Dumbbell lateral raise | 1 |
| `singlebridge` | Single-leg bridge | 1 |
| `loadedcalf` | Calf raise with dumbbells | 1 |
| `loadedsplit` | Split squat with dumbbells | 1 |
| `overhead-press-icon` | Overhead press (icon) | Static icon |

`t = 0` means the rig's start, `0.5` its geometric midpoint, and `1` its end. It does not always mean bottom-to-top: the bench press begins with arms extended and ends lowered; squats begin standing and end lowered. Choose the direction that fits the shot.

## Files and framing

`poses/<move>-t<0|0.5|1>-<yellow|ink>.svg` contains each of the 27 rig moves at three moments in two colorways: 162 files. `overhead-press-icon-yellow.svg` and `overhead-press-icon-ink.svg` bring the total to **164**. `png/` mirrors every SVG name, with `.png` instead of `.svg`, at **1024 pixels tall**; widths follow the aspect ratio.

Every rig move has one fixed viewBox covering all its exported moments, with the app's two-unit fit margin. Geometry and layer order are unchanged. This preserves all drawn endpoints, including the pulldown cable cap and wide arm reaches outside the original square. Do not auto-trim each frame independently: their canvas size and origin are already stable within a move. Across moves, pixels per figure unit differ because their framing differs; use raw rig units for a consistent body scale in a scene. The sheet fits each illustration in a cell for readability and is not a scale comparison.

`frames/<move>-00-yellow.png` through `-11-yellow.png` contain 12 evenly spaced geometry samples, `t = index / 11`, including both endpoints:

- **Victory:** both arms sweep from the sides into a clear celebration, useful for a comic payoff.
- **Dead bug:** opposite arm and leg reach out while the other limbs stay behind; shows the two tones and head gap well.
- **Goblet squat:** the body drops visibly while holding a weight, useful for preparation, effort, and a pause at the bottom.

These are outbound reference samples, not a timed video or a complete loop. For the app's timing, ordinary lifts take 1100 ms out, 900 ms back, and hold 250 ms between reps. Each direction uses cubic ease-in/out: `4u³` for `u < 0.5`, otherwise `1 − (−2u + 2)³ / 2`. Tall and Victory take 500 ms from Stand and hold; Cheer takes 450 ms and holds. The animator can change pacing for the joke.

The overhead-press icon is a static pose outside the rig. Its paths come directly from `concept-e-*.svg`, with only the full-canvas background removed and the title updated. Its limbs are already bolded (legs 18; arms 15.6), and its bar/plates are the icon's exact simplified construction. Original concept filenames describe the **background**; kit filenames describe the **figure**. The icon's original 1024-square framing is preserved.

## Rebuilding from rig.json

`moves.<key>.samples` includes **111 unique move/time samples**: 81 regular stills plus 30 additional animation moments. Frame endpoints reuse the still samples; the even 12-frame sequence does not contain t = 0.5, so that still is also retained. All exported t values are represented. Each sample has:

- The exact unrounded `ground` and `layers` arrays returned by the rig, original `box`, and `origin`.
- A flattened `shapes` array for importing: `k` is `line`, `disc`, or `box`; lines have `pts` and stroke `w`; discs have center `c` and radius `r`; boxes have center `c`, width `w`, height `h`, corner radius `r`, and optional rotation `rot`.
- Explicit boolean `halo`, `eq` (equipment), `weight` (held load), and `furn` flags; `tone`; layer number, index within layer, and global draw order. Ground is layer −1, body layers begin at 0. Higher order draws later. Omitted rotation means zero.
- `groundLine` records physical y = 0 and whether a floor stroke is drawn. Standing front views and the icon have no drawn floor line.

Each move's `exportViewBox` is in SVG coordinates, after applying the origin and Y flip. The app rounds SVG geometry to two decimal places; raw rig values keep full precision. `id` is a diagnostic label, not a unique bone identifier. Preserve layer groups for masking; simply sorting individual shapes and drawing outlines cannot reproduce the crossing gaps.

`icon` contains its 13 parsed shapes in the icon's original figure units, its original SVG transform, and an equivalent 320-unit scene box. It has no motion function or inferred intermediate poses. The first layer combines body and arms, which have no cutters; the second is the bar and plates.

For After Effects, build round-capped strokes and rounded rectangles, then use mattes to remove expanded front shapes from the earlier layers. For Blender, an orthographic camera and flat curves/discs preserve the supplied silhouette. Any physical depth, back view, side-to-front turn, or surface lighting needs an animator's interpretation; these references establish the drawn appearance.

The separate front-view workout bar is documented in the bundled `drawings.tsx` and `signal.module.css`. It uses a 6-pixel shaft, 12-pixel sleeves, 7-by-26 collars, and a tallest plate of 132 pixels. Plate heights for 45/35/25/10/5/2.5 lb are 1/.86/.72/.56/.44/.34 of that tallest height. Heaviest plates sit nearest each collar; widths and sleeve lengths adapt to the count. Its numbered, responsive UI drawing is distinct from the icon's unnumbered bar. Both source references are included so the animator can extend that vocabulary without guessing.

## New actions and props

A **headband, clapping hands, and a speech pose** do not exist in the app. The animator is free to invent them in the same vocabulary: plain discs, rounded boxes, thick round-ended limbs, the same two tones, and clear gaps at overlaps. A talking pose can communicate with a head tilt and arm position. These additions should be treated as new animation design, not extracted app poses.

## Extraction and verification

The extractor follows the existing app-icon `extract.mjs` approach: execute the real `scene(move, t)` with Node's native TypeScript support. This kit runs byte-for-byte source snapshots captured from the app; SHA-256 hashes and original paths are in `tools/provenance.json`. Move keys and app labels are read from the TypeScript syntax trees. Nothing is redrawn from memory.

The SVG writer runs the app's actual `Figure` component, transpiled in memory with TypeScript and rendered by ReactDOMServer. Equipment and weights are enabled. It preserves colors, rounded strokes, masks, layer order, and fitting rules. The only wrapper change is the standalone SVG namespace. `rsvg-convert` makes every pose/frame PNG. Sharp composes the contact sheet without a browser.

`tools/verify.mjs --live` separately rendered **deadbug, t = 1, yellow, equipment on**, directly from the originating app's `Figure` and rig. Its 1024-pixel raster matched `png/deadbug-t1-yellow.png` with **zero differing RGBA channels**. The pose exercises both tones, the whole head, the transparent head gap, and the floor. The reference SVG/PNG and machine-readable check are in `tools/figure-check.*` and `tools/validation.json`.

All 200 exported PNGs were checked for nonempty content, alpha transparency, 1024-pixel height, and empty outside edges. The character sheet and individual dead bug, supported row, midpoint goblet squat, icon, and midpoint Victory PNGs were opened for visual inspection. The final sheet was checked again after fixing font discovery. No clipped endpoints or changed layer order remained. The font configuration limits its cache writes to this kit.

## Run it again

From the originating project root, using its installed packages:

```sh
node design/intro-video/characters/tools/build.mjs && node design/intro-video/characters/tools/verify.mjs --live
```

For a copied standalone kit, install Node 22.18+ and librsvg, then from the `characters/` folder:

```sh
npm install && npm run build
```

The default rasterizer path is `/opt/homebrew/bin/rsvg-convert`. On another machine set `RSVG_CONVERT` to the full path of its `rsvg-convert` executable before running. The bundled `package.json` lists the other dependencies; `npm run build` uses the bundled snapshots and needs no app files. Exact installed tool versions from this build are recorded in `tools/build-summary.json`.

`tools/capture.mjs` is optional and only works inside the originating repo: `node design/intro-video/characters/tools/capture.mjs` refreshes the snapshots and hashes from current source. Run it deliberately before a rebuild if the character changes. It writes only inside this kit. `tools/source/extract.mjs` is a historical reference, not a command to run here.

No application files, icon sources, agenda, or memory were edited. No commit was made. This kit supplies character references; the intro video and a 3D model are separate work.
