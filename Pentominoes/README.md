# PentoLog

A browser-based notebook for **6 × 10 pentomino solutions**. Photograph a completed board, review its letter grid, and save it only if it is new. A reflection or a 180° turn of a saved board is not a new solution.

## Try it

[Open PentoLog](https://ajs210.github.io/Emul8or/Pentominoes/) (see the [project index](../README.md#open-pentolog) for the bookmark after the repository rename). The workspace opens with a labeled sample photo and its matching grid. The sample is **not** added to your collection automatically.

1. **Bring in earlier solves.** Open **Collection → Import grids → File or photo**. Choose an `.xlsx` or `.ods` workbook, a JPG/PNG screenshot, a CSV/TSV file, or a PentoLog JSON backup. Review the number of verified boards, then select **Import solutions**. **Paste or link** also accepts copied ranges or a Sheets link. Side-by-side, stacked and portrait boards are supported; duplicate or mirrored entries are not added again.
2. **Capture a board.** Choose **Upload a photo**, drop an image onto the photo panel, or use **Use camera**. Include the whole puzzle in even light. On mobile, the camera action requests the device camera; on desktop it asks for a live camera preview. Camera access requires HTTPS or localhost and browser permission. File upload works without camera access.
3. **Review the reading.** The scanner fills a colored letter grid.
   - In **Adjust frame**, drag **inside** the frame to move it without resizing. On a multi-board photo, use **Jump to board** or tap another outlined grid.
   - Drag a **corner** to resize. Both handles on a side move together; the opposite corner stays fixed. Arrow keys fine-tune the focused frame or corner (hold Shift for larger steps). **Straighten edges** is available for tilted frames.
   - **Read grid** scans the highlighted region and keeps the other detected boards available. **Reset frame** undoes adjustments to the chosen frame. Closing without reading discards the draft.
   - In **Edit grid**, pick a letter and paint cells, or focus a cell and type. Arrow keys move between cells. Editing includes erase, undo, and paste from Sheets.
4. **Save an original.** All 60 cells must form exactly one each of F, I, L, N, P, T, U, V, W, X, Y, and Z. The duplicate check distinguishes exact matches, horizontal and vertical reflections, and half-turns. A matching entry can be opened instead of saved again.

**Storage:** Only named grids and dates are saved, in this browser's local storage. Photos are processed locally and are not uploaded or saved to the collection. Clearing site data, changing browsers, or leaving a private session can lose the collection. Use **Collection → Export** for a JSON backup, then **Import grids** to restore it or transfer it to another device. Each saved entry also has **Copy grid for Sheets**. There is no Google account connection or automatic sheet synchronization.

### Google Sheets and screenshots

- **Export the workbook:** on Android use Sheets → **⋮ → Share & export → Save as** (or **Send a copy**) → **Excel (.xlsx)**. On desktop use **File → Download → Microsoft Excel (.xlsx)**. A native `.gsheet` file is a shortcut and contains no cells. Choosing it or pasting a sheet URL gives you a Google export link; select the downloaded workbook afterward. No public sharing or account connection is needed in PentoLog.
- **Workbook contents:** the reader searches worksheets for complete 6 × 10 or 10 × 6 ranges, ignoring headers, gutters and incomplete boards. It reads underlying cell labels, including labels hidden by formatting, or solid cell fills. It maps groups to the twelve pentomino shapes rather than requiring a particular palette. It does not evaluate formulas or extract embedded pictures.
- **Screenshots:** use **Workspace → Upload a photo** to choose one detected board, or **Collection → Import grids** to import all verified boards in a JPG/PNG. The digital reader checks repeating grid lines and cell interiors, including white and black pieces. After an image import, the photo is available in Workspace for this session; only the grids are saved. Adjusting or reading a frame does not change your saved collection. Cut-off boards are not filled in. For a difficult image, crop to one complete board or use **Adjust frame**.

## Run locally

Requires Node.js 22.12+ and npm. Start in the repository root:

```sh
cd Pentominoes
npm ci
npm run dev
```

```sh
npm test          # recognition, geometry, validation, symmetry, imports and backups
npm run build     # static production files in dist/
npm run preview   # serve the production build
```

To run the touch-browser regression for multi-board frame adjustments, install Chromium once with `npx playwright-core install chromium` (or set `CHROMIUM_PATH` to a local Chromium executable), then run `npm run test:browser`.

No API keys, external fonts, database, or server-side image service are required. The build uses relative asset paths, so it works at the root of an HTTPS static host or under a project path. Hash navigation requires no server rewrite rules.

### Publish on GitHub Pages

From `Pentominoes/`, run `npm test && npm run build:pages`. This regenerates only `../docs/Pentominoes/`, not the shared publishing directory. Commit that build with the app changes. The existing **Settings → Pages** source is **Deploy from a branch**, branch `arena/f28e0d80-emul8or`, folder **/docs**. Keep the root `docs/.nojekyll` and `docs/index.html`: the latter forwards to `./Pentominoes/` without dropping a bookmark's query or hash. No hard-coded repository name is needed in the deployed app.

The hosted app does not receive any saved collections from the preview or offline copy: storage is local to each browser and site. Use **Collection → Export** on the old copy and **Import grids** on the hosted site to transfer a collection.

## How recognition works

- A Web Worker proposes board quadrilaterals from foreground colors and edge components. It refines candidate boundaries against continuous seams and tests the interior of thick trays.
- A homography samples the 60 cell interiors in perspective; portrait boards are rotated into landscape. Median color samples and dark seam evidence determine which neighboring cells likely belong together.
- Connected five-cell groups are identified by their **shape** across rotations and reflections. The on-screen color key is a display convention, not a required physical color palette.
- Low-contrast, occluded, blurry, or strongly foreshortened photos can need frame or cell corrections. This is a heuristic reader, not an exact-cover solver that invents missing pieces. The user can review every cell before saving.
- The lexicographically smallest of the four rectangle-preserving orientations is a board's duplicate key. The four orientations of a portrait image are covered by normalizing its long axis first.

`src/core/` contains the image reader and pure puzzle/collection logic. `src/components/` contains the scanner, alignment tools, grid editor, and archive. Tests read the bundled sample image from its actual pixels and exercise different arrangements, colors, seams, orientations, and incomplete boards.

The sample is an illustrative generated tabletop image of a valid tiling. Font and icon notices are included in `public/licenses/`.
