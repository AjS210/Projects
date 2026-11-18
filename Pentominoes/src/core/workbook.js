import { unzipSync } from 'fflate';
import { SheetGrid, MAX_CELLS, extractSheetBoards } from './sheetGrid.js';

const MB = 1024 * 1024;
const descendants = (el, name) => (el ? Array.from(el.getElementsByTagNameNS('*', name)) : []);
const children = (el, name) =>
  el
    ? Array.from(el.childNodes).filter((n) => n.nodeType === 1 && (!name || n.localName === name))
    : [];
const first = (el, name) => el?.getElementsByTagNameNS('*', name)[0];
const attr = (el, name) => el?.getAttribute(name) ?? '';
const ns = (name) => `urn:oasis:names:tc:opendocument:xmlns:${name}:1.0`;
const odsAttr = (el, space, name) => el?.getAttributeNS(ns(space), name) ?? '';
const repeat = (v) => (v && /^\d+$/.test(v) ? Math.max(1, Math.min(1048576, Number(v))) : 1);
const waitForPaint = () => new Promise((resolve) => setTimeout(resolve, 0));

function documents(bytes, parse) {
  if (bytes.length > 20 * MB) throw new Error('Choose a workbook smaller than 20 MB.');
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      if (
        !/^(?:xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|styles\.xml|sharedStrings\.xml|worksheets\/[^/]+\.xml)|content\.xml|styles\.xml)$/.test(
          entry.name,
        )
      )
        return false;
      total += entry.originalSize;
      if (entry.originalSize > 32 * MB || total > 64 * MB)
        throw new Error('This workbook is too large. Save just the sheet with your solutions.');
      return true;
    },
  });
  return (path) => {
    if (!files[path]) return null;
    const bytes = files[path];
    const encoding =
      bytes[0] === 255 && bytes[1] === 254
        ? 'utf-16le'
        : bytes[0] === 254 && bytes[1] === 255
          ? 'utf-16be'
          : 'utf-8';
    const xml = new TextDecoder(encoding).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml))
      throw new Error(
        'This workbook uses unsupported XML declarations. Export a fresh copy from Sheets.',
      );
    const doc = parse(xml);
    if (
      !doc.documentElement ||
      doc.documentElement.localName === 'parsererror' ||
      first(doc, 'parsererror')
    )
      throw new Error('The workbook contains unreadable XML. Export it again from Sheets.');
    return doc;
  };
}
function xlsxFill(pattern) {
  if (!pattern || attr(pattern, 'patternType') !== 'solid') return '';
  const color = first(pattern, 'fgColor') || first(pattern, 'bgColor');
  // A solid pattern without an explicit foreground uses the default (black),
  // unlike the completely unfilled cells of a white piece.
  if (!color || attr(color, 'auto') === '1') return '#000000';
  const rgb = attr(color, 'rgb');
  if (rgb) return '#' + rgb.slice(-6).toUpperCase();
  for (const key of ['theme', 'indexed'])
    if (color.hasAttribute(key)) {
      const index = attr(color, key),
        tint = attr(color, 'tint') || '0';
      if (
        tint === '0' &&
        ((key === 'theme' && index === '0') ||
          (key === 'indexed' && ['1', '9', '65'].includes(index)))
      )
        return '#FFFFFF';
      if (
        tint === '0' &&
        ((key === 'theme' && index === '1') ||
          (key === 'indexed' && ['0', '8', '64'].includes(index)))
      )
        return '#000000';
      return `${key}:${index}:${tint}`;
    }
  return '';
}
function xlsxCoord(ref) {
  const parts = /^([A-Z]{1,3})([1-9]\d{0,6})$/.exec(ref);
  if (!parts) return null;
  let col = 0;
  for (const ch of parts[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return [Number(parts[2]) - 1, col - 1];
}
const richText = (el) =>
  descendants(el, 't')
    .map((t) => t.textContent)
    .join('');
async function excel(doc, workbook) {
  const strings = descendants(doc('xl/sharedStrings.xml'), 'si').map(richText);
  const styleDoc = doc('xl/styles.xml');
  const fills = children(first(styleDoc, 'fills'), 'fill').map((f) =>
    xlsxFill(first(f, 'patternFill')),
  );
  const styles = children(first(styleDoc, 'cellXfs'), 'xf').map(
    (x) => fills[Number(attr(x, 'fillId'))] || '',
  );
  const rels = new Map(
    descendants(doc('xl/_rels/workbook.xml.rels'), 'Relationship')
      .filter((r) => attr(r, 'TargetMode') !== 'External')
      .map((r) => [attr(r, 'Id'), attr(r, 'Target')]),
  );
  const boards = [];
  let processed = 0;
  for (const sheet of descendants(workbook, 'sheet')) {
    await waitForPaint();
    const id =
      sheet.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id',
      ) || attr(sheet, 'r:id');
    const target = rels.get(id);
    if (!target) continue;
    // Resolve zip entry names only; external relationships are never followed.
    const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    const xml = doc(path);
    if (!xml) continue;
    const grid = new SheetGrid(attr(sheet, 'name') || 'Sheet'),
      data = first(xml, 'sheetData');
    for (const cell of descendants(data, 'c')) {
      if (++processed > MAX_CELLS * 3)
        throw new Error('Too many workbook cells. Export only the tab with the boards.');
      const coord = xlsxCoord(attr(cell, 'r'));
      if (!coord) continue;
      const type = attr(cell, 't'),
        raw = first(cell, 'v')?.textContent || '';
      // Conditional formatting may hide the letters or make text match the fill.
      // Use the stored value (or cached formula value), never calculate formulas.
      const value =
        type === 's'
          ? raw
            ? strings[Number(raw)] || ''
            : ''
          : type === 'inlineStr'
            ? richText(first(cell, 'is'))
            : type === 'e'
              ? ''
              : raw;
      grid.set(...coord, value, styles[Number(attr(cell, 's'))]);
    }
    boards.push(...extractSheetBoards(grid));
  }
  return boards;
}
async function openDocument(doc, content) {
  const styles = new Map();
  for (const xml of [doc('styles.xml'), content])
    for (const style of descendants(xml, 'style')) {
      if (odsAttr(style, 'style', 'family') !== 'table-cell') continue;
      const prop = first(style, 'table-cell-properties');
      const fill = prop?.getAttributeNS(
        'urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0',
        'background-color',
      );
      styles.set(odsAttr(style, 'style', 'name'), {
        fill: fill?.toUpperCase(),
        parent: odsAttr(style, 'style', 'parent-style-name'),
      });
    }
  const color = (name) => {
    for (let d = 0; name && d < 16; d++) {
      const s = styles.get(name);
      if (!s) break;
      if (s.fill) return s.fill === 'TRANSPARENT' ? '' : s.fill;
      name = s.parent;
    }
    return '';
  };
  let visits = 0;
  const boards = [];
  for (const table of children(first(content, 'spreadsheet'), 'table')) {
    await waitForPaint();
    const grid = new SheetGrid(odsAttr(table, 'table', 'name') || 'Sheet');
    let r = 0;
    for (const row of descendants(table, 'table-row')) {
      const height = repeat(odsAttr(row, 'table', 'number-rows-repeated'));
      let c = 0;
      for (const cell of children(row)) {
        if (!['table-cell', 'covered-table-cell'].includes(cell.localName)) continue;
        const width = repeat(odsAttr(cell, 'table', 'number-columns-repeated'));
        const value =
          descendants(cell, 'p')
            .map((p) => p.textContent)
            .join('') ||
          odsAttr(cell, 'office', 'string-value') ||
          odsAttr(cell, 'office', 'value');
        const fill = color(
          odsAttr(cell, 'table', 'style-name') || odsAttr(row, 'table', 'default-cell-style-name'),
        );
        if (value.trim() || (fill && fill !== '#FFFFFF')) {
          visits += width * height;
          if (visits > MAX_CELLS)
            throw new Error('Too many formatted cells. Export only the tab with the boards.');
          for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++) grid.set(r + dy, c + dx, value, fill);
        }
        c += width;
      }
      r += height;
    }
    boards.push(...extractSheetBoards(grid));
  }
  return boards;
}
export async function readWorkbook(
  bytes,
  parse = (xml) => new DOMParser().parseFromString(xml, 'application/xml'),
) {
  let doc;
  try {
    doc = documents(bytes, parse);
  } catch (err) {
    if (/too large|smaller than/.test(err.message)) throw err;
    throw new Error(
      'This is not a readable workbook. Export an unencrypted Excel (.xlsx) or OpenDocument (.ods) copy.',
    );
  }
  const xlsx = doc('xl/workbook.xml'),
    ods = xlsx ? null : doc('content.xml');
  if (!xlsx && !ods)
    throw new Error(
      'Choose an Excel (.xlsx) or OpenDocument (.ods) workbook exported from Google Sheets.',
    );
  const boards = xlsx ? await excel(doc, xlsx) : await openDocument(doc, ods);
  if (!boards.length)
    throw new Error(
      'No complete boards found. Use a sheet with 6 × 10 cell ranges containing piece labels or solid cell fills. For embedded pictures, upload the JPG instead.',
    );
  return boards;
}
