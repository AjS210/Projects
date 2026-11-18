# PentoLog

A browser-based notebook for **6 × 10 pentomino solutions**. Play with all twelve pieces on screen, or photograph a physical board and review its letter grid. Save a verified solve by its catalogue number. A reflection or a 180° turn of a saved board is not a new solution.

## Try it

[Open PentoLog](https://ajs210.github.io/Projects/Pentominoes/). The workspace is dark by default, even on a light-mode device. Photos and piece swatches keep their original colors. **Game board** opens with a tray of twelve pieces and an empty playing field (or your current game in this tab). **Collection Upload** opens an image picker, not a second grid. For the pack-away arrangement (**Solution #2182, X group B3**), use **Quick guide → View lid solution**. It’s a read-only reference, not an upload or a saved find.

### Play a board

In phone landscape the field normally takes the left side of the game card, with the piece tray in **three rows of four** on the right. The 3×20 frame instead uses a single row of twelve pieces below the field. In portrait the tray is below the field. Turning the phone keeps the pieces and selection.

- Tap **Fullscreen** in the game card to hide the rest of the page, and **Exit fullscreen** (or your device’s back control) to return. If browser fullscreen is unavailable, the game expands within the page instead; system bars may remain visible.
- Drag a card onto the board, or tap it to put its piece in the middle. Under **Board controls**, the left arrow turns the selected piece 90° counterclockwise and the right arrow turns it 90° clockwise. Both rotations and flips act on the **on-board piece**, never its thumbnail. A turn keeps the marked square in place unless the piece needs to slide in from an edge.
- Pieces may overlap while you work. Selecting, dragging or turning a piece brings it to the front without erasing what it covers. Tap a piece’s tray card to bring it forward even if it’s completely buried. **Return to tray** (or dropping back on the tray) removes only that piece.
- Without dragging, tap a card and then tap the destination square for the piece’s marked cell. With a keyboard, activate a card, arrow between squares, and press **Enter** or **Space** to place it.
- Only a board with **all 60 squares covered exactly once** earns a solution number and X group. Choose **Save solution** or **View entry** if it’s already saved. Neither overlapping pieces nor simply using all twelve counts as a solve.
- Each frame keeps its most recent game on this device, including piece positions, orientations and layer order, even after switching frames or reopening the app. **Start over → Start new game** clears only the current frame without changing other frames, uploads or saved solutions. Drafts are separate from the collection and are not included in backups.

### Scan, import and collect

1. **Bring in earlier solves.** Open **Collection → Import grids → File or photo**. Choose an `.xlsx` or `.ods` workbook, a JPG/PNG screenshot, a CSV/TSV file, or a PentoLog JSON backup. Review the number of verified boards, then select **Import solutions**. **Paste or link** also accepts copied ranges or a Sheets link. Side-by-side, stacked and portrait boards are supported; duplicate or mirrored entries are not added again.
2. **Capture a board.** In **Collection Upload**, choose **Upload a photo or screenshot**, or drop an image onto the card. The same picker accepts existing images and, on devices that offer it, a new camera photo. Include the whole puzzle in even light.
3. **Review the reading.** Choosing or dropping an image opens **Review upload**. The colored grid, **View photo**, **Adjust grid** and **Edit cells** are in this window, not on the workspace card. Expand **Piece reference** to highlight shapes. If there are several boards, **Choose from … boards** lets you review one or explicitly import the verified set.
   - In **Adjust grid**, drag **inside** the frame to move it without resizing. On a multi-board photo, use **Jump to board** or tap another outlined grid.
   - Drag a **corner** to resize. Both handles on a side move together; the opposite corner stays fixed. Arrow keys fine-tune the focused frame or corner (hold Shift for larger steps). **Straighten edges** is available for tilted frames.
   - **Read grid** scans the highlighted region and keeps the other detected boards available. **Reset frame** undoes adjustments to the chosen frame. Closing without reading discards the draft.
   - In **Edit cells**, pick a letter and paint cells, or focus a cell and type. Arrow keys move between cells. Editing includes erase, undo, and paste from Sheets.
4. **Save an original.** When all twelve shapes are verified, the workspace shows the board’s Isomer Design number. Choose **Save to collection** to confirm, or **Cancel** to leave the collection unchanged. **Review last upload** reopens the photo in this session. A horizontal or vertical reflection or a half-turn gets the same number. An already-saved board can be opened instead.
5. **Browse your collection.** The image-only gallery stays three across on a phone and is ordered by reference number. Tap a board for its number, X group, date and as-played grid. Search for an exact number (e.g. `2182` or `#2182`) or an earlier name. Expand **X-piece groups** to filter your finds and see how many you have out of each group’s total.

**Storage:** Only your personal records are saved in this browser’s local storage. Existing saves and imported backups get their reference titles from the actual cells. Prior names and import labels remain searchable and are included in exports; just opening an old collection does not rewrite it. Photos are processed locally and are not uploaded or saved to the collection. Clearing site data, changing browsers, or leaving a private session can lose the collection. Use **Collection → Export** for a JSON backup, then **Import grids** to restore it or transfer it to another device. Each saved entry also has **Copy grid for Sheets**. There is no Google account connection or automatic sheet synchronization.

### Reference numbers and X positions

The [checked-in reference](./reference/isomer-design/) contains [Isomer Design’s 2,339 numbered 6 × 10 solutions](https://isomerdesign.com/Pentomino/6x10/solutions.txt). All lookups use this bundled snapshot: there is no request to the source site at scan, save or import time. The catalogue is **not** preloaded into anyone’s collection. Numbers come from the explicit source IDs, not the order in which someone solves or imports boards.

The [source index](https://isomerdesign.com/Pentomino/6x10/index.html) groups layouts by the **center of the X**. Reflect the position into the upper-left quarter of a landscape board to compare it with the seven diagrams. In PentoLog’s grid coordinates these are **B3, B4, B5, C2, C3, C4, C5**. This groups symmetric positions without rotating your saved grid. For example, the pack-away lid is **Solution #2182, group B3**.

### Google Sheets and screenshots

- **Export the workbook:** on Android use Sheets → **⋮ → Share & export → Save as** (or **Send a copy**) → **Excel (.xlsx)**. On desktop use **File → Download → Microsoft Excel (.xlsx)**. A native `.gsheet` file is a shortcut and contains no cells. Choosing it or pasting a sheet URL gives you a Google export link; select the downloaded workbook afterward. No public sharing or account connection is needed in PentoLog.
- **Workbook contents:** the reader searches worksheets for complete 6 × 10 or 10 × 6 ranges, ignoring headers, gutters and incomplete boards. It reads underlying cell labels, including labels hidden by formatting, or solid cell fills. It maps groups to the twelve pentomino shapes rather than requiring a particular palette. It does not evaluate formulas or extract embedded pictures.
- **Screenshots:** use **Collection Upload → Upload a photo or screenshot** to choose one detected board, or **Collection → Import grids** to import all verified boards in a JPG/PNG. The digital reader checks repeating grid lines and cell interiors, including white and black pieces. After an image import, the photo is available in Workspace for this session; only the grids are saved. Adjusting or reading a frame does not change your saved collection. Cut-off boards are not filled in. For a difficult image, crop to one complete board or use **Adjust grid** in the review window.

## Run locally

Requires Node.js 22.12+ and npm. Start in the repository root:

```sh
cd Pentominoes
npm ci
npm run dev
```

```sh
npm test          # game rules, recognition, geometry, catalogue, imports and backups
npm run build     # static production files in dist/
npm run preview   # serve the production build
```

To run the browser tests (the 3 × 4 landscape tray, overlapping touch placements, a full numbered playthrough, gallery, theme, upload confirmation and multi-board alignment), install Chromium once with `npx playwright-core install chromium` (or set `CHROMIUM_PATH` to a local Chromium executable), then run `npm run test:browser`.

No API keys, external fonts, database, or server-side image service are required. The build uses relative asset paths, so it works at the root of an HTTPS static host or under a project path. Hash navigation requires no server rewrite rules.

### Logo and browser artwork

The [P mark](./public/brand/mark.svg) follows the supplied **nine-piece outline**, not a crop of the 12-piece lid solution. The page mark, tab icons, iOS touch icon, Android launcher/maskable icons, and link-preview card all come from the same paths and the `PIECES` lid swatches. The mark is decoration; it is never added to a grid or collection.

To update the artwork, edit `scripts/build-brand.mjs` and run `npm run brand` with Chromium installed as above. Commit the resulting files in `public/`, then run `npm run build:pages`. Ordinary app builds use those checked-in assets and do not require Chromium. Browser icons and the manifest resolve relative to the app; the static social tags use the public Pages URL so link previews work without JavaScript.

### Publish on GitHub Pages

From `Pentominoes/`, run `npm test && npm run build:pages`. This regenerates only `../docs/Pentominoes/`, not the shared publishing directory. Commit that build with the app changes. After merging to `main`, publish via **Settings → Pages → Deploy from a branch → main → /docs**. If Pages still points to the earlier development branch, switch it once; the bookmark stays the same. Keep the root `docs/.nojekyll` and `docs/index.html`: the latter forwards to `./Pentominoes/` without dropping a bookmark's query or hash. If the public site moves, update the absolute share metadata in both HTML entry points.

The hosted app does not receive any saved collections from the preview or offline copy: storage is local to each browser and site. Use **Collection → Export** on the old copy and **Import grids** on the hosted site to transfer a collection.

## How recognition works

- A Web Worker proposes board quadrilaterals from foreground colors and edge components. It refines candidate boundaries against continuous seams and tests the interior of thick trays.
- A homography samples the 60 cell interiors in perspective; portrait boards are rotated into landscape. Median color samples and dark seam evidence determine which neighboring cells likely belong together.
- Connected five-cell groups are identified by their **shape** across rotations and reflections. The grid, piece reference, editor and collection share the colors sampled from the lid. A photo or workbook can still use a completely different palette.
- Low-contrast, occluded, blurry, or strongly foreshortened photos can need frame or cell corrections. This is a heuristic reader, not an exact-cover solver that invents missing pieces. The user can review every cell before saving.
- The lexicographically smallest of the four rectangle-preserving orientations is a board's duplicate key. The four orientations of a portrait image are covered by normalizing its long axis first.

`src/core/` contains the image reader and pure puzzle/collection logic. `src/components/` contains the playable board, scanner, alignment tools, grid editor, and archive. A perspective photograph is kept only as a recognition test fixture, not in the app or its Pages build. The scanner tests exercise actual pixels, different arrangements, colors, seams, orientations, and incomplete boards.

Font and icon notices are included in `public/licenses/`.
