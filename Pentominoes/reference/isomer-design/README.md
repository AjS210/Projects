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
