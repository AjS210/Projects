# Isomer Design · 6 × 10 reference

[`solutions.txt`](./solutions.txt) contains the 2,339 numbered six-row tilings from [Steve Chapman / Isomer Design’s text catalogue](https://isomerdesign.com/Pentomino/6x10/solutions.txt). The number before each comma is the **published ID**, not a local solve count. Preserve the six rows and their orientation. This file is reference material, not anyone’s saved collection.

The [6 × 10 index](https://isomerdesign.com/Pentomino/6x10/index.html) shows these seven positions for the **center** of X. Reflect its row and column toward the upper-left of the landscape board. PentoLog labels rows A–F from the top and columns 1–10 from the left:

| X center | Source row, column | Solutions |
| --- | --- | ---: |
| B3 | 2, 3 | 389 |
| B4 | 2, 4 | 342 |
| B5 | 2, 5 | 291 |
| C2 | 3, 2 | 442 |
| C3 | 3, 3 | 262 |
| C4 | 3, 4 | 276 |
| C5 | 3, 5 | 337 |

**Provenance:** checked the source text and index on 2026-11-17. The file was obtained from [a copy of the Isomer download](https://github.com/bpasanek/puzzlecode/blob/5c5f61e59bf7c67140c3bb298d6853aad29e885f/r-puzzlings/solutions-2339-6x10.txt) (Git blob `a459d35d9ed2d2914b48bb8a0c298d3b30992257`). Spot-checked published IDs including 1, 1169 and 2339 against the original. The local snapshot uses LF line endings and a final newline; SHA-256 `57872b391218b56d651b64586fb05ac5a32639a4ad55d1904c6e80f3a40c22eb`. No site artwork is copied.

**Maintenance:** from `Pentominoes/`, run `npm run reference:check` to fetch the original text file and compare it with the snapshot (or `npm run reference:check -- /path/to/downloaded/solutions.txt` without network access). This does not overwrite any numbers. Never renumber by sorting. Run `npm test` to verify every shape, ID, symmetry class, group total and the pinned snapshot. Review any upstream change before replacing the file and updating the checksum. Application builds and lookups use the checked-in file, not a live scrape.

## Additional frame catalogues

The eight files `3x20.txt`, `4x15.txt`, `5x12.txt`, and `8x8a.txt` through `8x8e.txt` contain the corresponding numbered Isomer Design listings. They were extracted from [chichacha/pentomino’s CSV of the Isomer Design catalogue](https://github.com/chichacha/pentomino/blob/main/pentomino_solution.csv), Git blob `b074611c90d1145dd0e751ab987444c8e9fcc8ae`. The extraction preserves `sol_idx` and `sol_text`, with one numbered entry per line and LF endings. The 6×10 entries in that CSV were compared with the existing snapshot: all 2,339 IDs and grids match. The first entries of all eight additional frames were spot-checked against the user-provided Isomer Design text URLs. The published total for each frame was checked against the source listing.

The X-group center is mapped to the uppermost, then leftmost, equivalent position under only those symmetries that preserve the blocked squares. This is important for 8×8e, where independent horizontal and vertical reflections do not preserve its diagonal holes. Counts are computed from the checked-in numbered reference, and IDs are scoped to their frame. Run `npm test` for all-frame counts, shape, numbering, symmetry, and backup checks. Photos, spreadsheets and pasted grids still read 6×10 only; backups and played solutions support all frames.
