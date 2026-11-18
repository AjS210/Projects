import { readFile } from 'node:fs/promises';
import { indexCatalogue, CATALOGUE_SIZE } from '../src/core/catalogue.js';

// Manual provenance check; never run during a build or from the user's browser.
const url = 'https://isomerdesign.com/Pentomino/6x10/solutions.txt';
const snapshot = new URL('../reference/isomer-design/solutions.txt', import.meta.url);
let upstream;
if (process.argv[2]) {
  upstream = await readFile(process.argv[2], 'utf8');
} else {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Reference download failed: HTTP ${response.status}`);
  upstream = await response.text();
}
const normalized = (s) => s.replace(/\r\n?/g, '\n').trimEnd() + '\n';
indexCatalogue(upstream);
if (normalized(upstream) !== normalized(await readFile(snapshot, 'utf8'))) {
  throw new Error(
    'The numbered reference differs from the snapshot. Review the diff before replacing it; no files were changed.',
  );
}
console.log(`All ${CATALOGUE_SIZE} numbered entries match the checked-in snapshot.`);
