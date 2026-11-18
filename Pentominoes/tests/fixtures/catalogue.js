import { readFileSync } from 'node:fs';
import { indexCatalogue } from '../../src/core/catalogue.js';
import { createCollectionStore } from '../../src/core/collection.js';

export const source = readFileSync(
  new URL('../../reference/isomer-design/solutions.txt', import.meta.url),
  'utf8',
);
export const lookupSolution = indexCatalogue(source);
export const { mergeRecords } = createCollectionStore(lookupSolution);
