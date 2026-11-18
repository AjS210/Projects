// Vite embeds the checked-in text; no external service, connection, or user
// data is needed for a lookup. The scanner worker doesn't load the catalogue.
import source from '../reference/isomer-design/solutions.txt?raw';
import { indexCatalogue } from './core/catalogue.js';
import { createCollectionStore } from './core/collection.js';

export const lookupSolution = indexCatalogue(source);
export const { readCollection, mergeRecords } = createCollectionStore(lookupSolution);
