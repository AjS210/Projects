import { parseImport } from './collection.js';
import { delimitedBoards } from './sheetGrid.js';
import { openPhoto, scanPhoto, imageFileType } from './photo.js';

export const EXPORT_HELP =
  'In the Android Sheets app, open the sheet, tap ⋮ → Share & export, then Save as or Send a copy and choose Excel (.xlsx).';
export const IMPORT_TYPES =
  '.xlsx,.ods,.gsheet,.csv,.tsv,.txt,.json,.jpg,.jpeg,.jpe,.jfif,.png,.webp,image/*,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/vnd.google-apps.spreadsheet';
const MB = 1024 * 1024;
// A native .gsheet is a shortcut, not a workbook. Link to Google's own download
// screen in the user's browser; don't request credentials or change sharing.
export function exportLink(text) {
  let id = '',
    link = text.trim(),
    key = '';
  if (link.startsWith('{')) {
    let shortcut;
    try {
      shortcut = JSON.parse(link);
    } catch {
      return null;
    }
    if (shortcut.version === 1 && Array.isArray(shortcut.solutions)) return null;
    id = typeof shortcut.doc_id === 'string' ? shortcut.doc_id : '';
    link = typeof shortcut.url === 'string' ? shortcut.url : '';
  }
  if (link) {
    try {
      const url = new URL(link);
      if (url.protocol === 'https:' && url.hostname === 'docs.google.com') {
        const m = /^\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/.exec(url.pathname);
        if (m) {
          id = m[1];
          key = url.searchParams.get('resourcekey') || '';
        }
      }
    } catch {
      /* A pasted range is not a URL. */
    }
  }
  if (!/^[\w-]{6,160}$/.test(id)) return null;
  const result = new URL(`https://docs.google.com/spreadsheets/d/${id}/export`);
  result.searchParams.set('format', 'xlsx');
  if (/^[\w-]{1,160}$/.test(key)) result.searchParams.set('resourcekey', key);
  return result.href;
}
export function readGridText(text, name = 'Sheet') {
  try {
    return parseImport(text);
  } catch (error) {
    if (text.trimStart().startsWith('{')) throw error;
    const records = delimitedBoards(text, name);
    if (records.length) return records;
    throw error;
  }
}
export async function readImportFile(file, signal) {
  if (file.size > 25 * MB) throw new Error('Choose a file smaller than 25 MB.');
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  signal.throwIfAborted();
  if (/\.(xlsx|ods)$/i.test(file.name) || (head[0] === 0x50 && head[1] === 0x4b)) {
    const { readWorkbook } = await import('./workbook.js');
    const records = await readWorkbook(new Uint8Array(await file.arrayBuffer()));
    signal.throwIfAborted();
    return { records, kind: 'workbook' };
  }
  if (imageFileType(file, head)) {
    const photo = await openPhoto(file);
    const result = await scanPhoto(photo, null, signal);
    if (result.found !== 12)
      throw new Error(
        'No complete board could be verified in this image. Crop to a whole board, or use Collection Upload → Upload a photo → Adjust grid to review it.',
      );
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, 55) || 'Photo';
    return {
      kind: 'image',
      source: { photo, result },
      records: (result.boards || [result]).map((b, i) => ({
        cells: b.cells,
        name: `${title} · Board ${i + 1}`,
      })),
    };
  }
  if (file.size > 4 * MB) throw new Error('Choose a text or backup file smaller than 4 MB.');
  const text = await file.text();
  signal.throwIfAborted();
  const link = exportLink(text);
  if (
    link ||
    /\.gsheet$/i.test(file.name) ||
    file.type === 'application/vnd.google-apps.spreadsheet'
  )
    return { kind: 'shortcut', link };
  if (/\.xls$/i.test(file.name))
    throw new Error('Export the workbook as Excel (.xlsx), not the older .xls format.');
  try {
    return { kind: 'text', records: readGridText(text, file.name.replace(/\.[^.]+$/, '')) };
  } catch (err) {
    if (/\.(csv|tsv)$/i.test(file.name))
      throw new Error(
        'No verified boards found in the text table. CSV and TSV do not preserve fill colors. If the boards are color-only, choose an .xlsx export or a screenshot.',
      );
    throw err;
  }
}
