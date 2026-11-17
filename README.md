# PentoLog

A browser-based notebook for **6 × 10 pentomino solutions**. Photograph a completed board, review its letter grid, and save it only if it is new. A reflection or a 180° turn of a saved board is not a new solution.

## Try it

The workspace opens with a labeled sample photo and its matching grid. The sample is **not** added to your collection automatically.

1. **Bring in earlier solves.** In **Collection → Import grids**, paste a 6 × 10 letter range from Google Sheets. Paste multiple boards one below another, or choose a CSV/TSV file. A 10 × 6 portrait range also works. Invalid grids are explained before any import is saved; duplicates are skipped.
2. **Capture a board.** Choose **Upload a photo**, drop an image onto the photo panel, or use **Use camera**. Include the whole puzzle in even light. On mobile, the camera action requests the device camera; on desktop it asks for a live camera preview. Camera access requires HTTPS or localhost and browser permission. File upload works without camera access.
3. **Review the reading.** The scanner fills a colored letter grid. If the board is misaligned, use **Adjust frame** to drag the four handles to the inside corners of the pieces, then **Read grid**. In **Edit grid**, pick a letter and paint cells, or focus a cell and type. Arrow keys move between cells. Editing includes erase, undo, and paste from Sheets.
4. **Save an original.** All 60 cells must form exactly one each of F, I, L, N, P, T, U, V, W, X, Y, and Z. The duplicate check distinguishes exact matches, horizontal and vertical reflections, and half-turns. A matching entry can be opened instead of saved again.

**Storage:** Only named grids and dates are saved, in this browser's local storage. Photos are processed locally and are not uploaded or saved to the collection. Clearing site data, changing browsers, or leaving a private session can lose the collection. Use **Collection → Export** for a JSON backup, then **Import grids** to restore it or transfer it to another device. Each saved entry also has **Copy grid for Sheets**. There is no Google account connection or automatic sheet synchronization.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

```sh
npm test          # recognition, geometry, validation, symmetry, imports and backups
npm run build     # static production files in dist/
npm run preview   # serve the production build
```

No API keys, external fonts, database, or server-side image service are required. The build uses relative asset paths, so it works at the root of an HTTPS static host or under a project path. Hash navigation requires no server rewrite rules.

### Publish on GitHub Pages

Run `npm test && npm run build:pages` to regenerate the ready-to-serve site in `docs/`. Commit the updated `docs/` with the source changes and push to the publishing branch. In **Settings → Pages**, the source is **Deploy from a branch**, branch `arena/f28e0d80-emul8or`, folder **/docs**. Only that folder is served. The `.nojekyll` file is intentional.

The hosted app does not receive any saved collections from the preview or offline copy: storage is local to each browser and site. Use **Collection → Export** on the old copy and **Import grids** on the hosted site to transfer a collection.

## How recognition works

- A Web Worker proposes board quadrilaterals from foreground colors and edge components. It refines candidate boundaries against continuous seams and tests the interior of thick trays.
- A homography samples the 60 cell interiors in perspective; portrait boards are rotated into landscape. Median color samples and dark seam evidence determine which neighboring cells likely belong together.
- Connected five-cell groups are identified by their **shape** across rotations and reflections. The on-screen color key is a display convention, not a required physical color palette.
- Low-contrast, occluded, blurry, or strongly foreshortened photos can need frame or cell corrections. This is a heuristic reader, not an exact-cover solver that invents missing pieces. The user can review every cell before saving.
- The lexicographically smallest of the four rectangle-preserving orientations is a board's duplicate key. The four orientations of a portrait image are covered by normalizing its long axis first.

`src/core/` contains the image reader and pure puzzle/collection logic. `src/components/` contains the scanner, alignment tools, grid editor, and archive. Tests read the bundled sample image from its actual pixels and exercise different arrangements, colors, seams, orientations, and incomplete boards.

The sample is an illustrative generated tabletop image of a valid tiling. Font and icon notices are included in `public/licenses/`.
