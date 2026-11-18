import test from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { strToU8, zipSync } from 'fflate';
import { readWorkbook } from '../src/core/workbook.js';
import { columnName, SheetGrid, extractSheetBoards } from '../src/core/sheetGrid.js';
import { exportLink, readGridText, readImportFile } from '../src/core/importFiles.js';
import { LETTERS, SAMPLE, variants, canonicalKey } from '../src/core/puzzle.js';
import { mergeRecords } from './fixtures/catalogue.js';
import { imageFileType } from '../src/core/photo.js';

const OTHER = 'IVVVTTTPPPIVUUUTWWPPIVUZUTFWWLIZZZFFFXWLIZYNNFXXXLYYYYNNNXLL';
const colors = [
  '03A8CD',
  'F5A900',
  'FFFFFF',
  'DB0010',
  '005588',
  '00EE08',
  '992A77',
  'F32080',
  '000000',
  '2050FE',
  '778896',
  'FC99AE',
];
const parse = (xml) => new DOMParser().parseFromString(xml, 'application/xml');
const archive = (files) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
const xmlNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function xlsx(tabs) {
  const files = {
    'xl/workbook.xml': `<workbook xmlns="${xmlNs}" xmlns:r="${relNs}"><sheets>${tabs.map((_, i) => `<sheet name="Tab ${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships>${tabs.map((_, i) => `<Relationship Id="rId${i + 1}" Target="${i ? '/xl/' : ''}worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
    'xl/styles.xml': `<styleSheet xmlns="${xmlNs}"><fills><fill><patternFill patternType="none"/></fill>${colors.map((v) => `<fill><patternFill patternType="solid">${v === '000000' ? '' : `<fgColor rgb="FF${v}"/>`}</patternFill></fill>`).join('')}</fills><cellXfs>${Array.from({ length: 13 }, (_, i) => `<xf fillId="${i}"/>`).join('')}</cellXfs></styleSheet>`,
    'xl/sharedStrings.xml': `<sst xmlns="${xmlNs}">${LETTERS.map((l) => `<si><t>${l}</t></si>`).join('')}</sst>`,
  };
  tabs.forEach((items, t) => {
    const rows = new Map();
    function add(row, xml) {
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push(xml);
    }
    add(2, '<c r="B3" t="inlineStr"><is><t>D</t></is></c>');
    for (const { cells, x, y, mode } of items)
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i],
          k = LETTERS.indexOf(c),
          row = y + Math.floor(i / 10),
          at = `${columnName(x + (i % 10))}${row + 1}`;
        if (mode === 'fill' && colors[k] === 'FFFFFF') continue;
        add(
          row,
          mode === 'fill'
            ? `<c r="${at}" s="${1 + k}"/>`
            : i % 2
              ? `<c r="${at}" t="s"><v>${k}</v></c>`
              : `<c r="${at}" t="inlineStr"><is><r><t>${c}</t></r></is></c>`,
        );
      }
    files[`xl/worksheets/sheet${t + 1}.xml`] =
      `<worksheet xmlns="${xmlNs}"><sheetData>${[...rows].map(([r, cs]) => `<row r="${r + 1}">${cs.join('')}</row>`).join('')}</sheetData></worksheet>`;
  });
  return archive(files);
}
test('reads multi-tab XLSX, shared and inline letters, style-only fills and implicit white; skips fragments', async () => {
  const bytes = xlsx([
    [
      { cells: SAMPLE, x: 1, y: 4 },
      { cells: OTHER, x: 12, y: 4, mode: 'fill' },
      { cells: variants(SAMPLE)[1], x: 1, y: 13 },
      { cells: OTHER.slice(0, 44), x: 12, y: 13 },
    ],
    [{ cells: SAMPLE, x: 26, y: 2, mode: 'fill' }],
  ]);
  const result = await readWorkbook(bytes, parse);
  assert.deepEqual(
    result.map((r) => r.cells),
    [SAMPLE, OTHER, variants(SAMPLE)[1], SAMPLE],
  );
  assert.deepEqual(
    result.map((r) => r.name),
    ['Tab 1 · B5:K10', 'Tab 1 · M5:V10', 'Tab 1 · B14:K19', 'Tab 2 · AA3:AJ8'],
  );
  const merged = mergeRecords([], result);
  assert.equal(merged.added, 2);
  assert.deepEqual(
    merged.records.map((r) => [r.name, r.previousName]),
    [
      ['Solution #1347', 'Tab 1 · M5:V10'],
      ['Solution #2182', 'Tab 1 · B5:K10'],
    ],
  );
});
test('reads ODS cell styles and repeats without expanding empty trailing rows', async () => {
  const ns = 'urn:oasis:names:tc:opendocument:xmlns:';
  const attrs = `xmlns:office="${ns}office:1.0" xmlns:table="${ns}table:1.0" xmlns:style="${ns}style:1.0" xmlns:fo="${ns}xsl-fo-compatible:1.0" xmlns:text="${ns}text:1.0"`;
  const styles = colors
    .map(
      (c, i) =>
        `<style:style style:name="c${i}" style:family="table-cell"><style:table-cell-properties fo:background-color="#${c}"/></style:style>`,
    )
    .join('');
  const rows = SAMPLE.match(/.{10}/g)
    .map(
      (row) =>
        `<table:table-row><table:table-cell table:number-columns-repeated="2"/>` +
        (row.match(/(.)\1*/g) || [])
          .map(
            (run) =>
              `<table:table-cell table:number-columns-repeated="${run.length}" table:style-name="c${LETTERS.indexOf(run[0])}"/>`,
          )
          .join('') +
        '</table:table-row>',
    )
    .join('');
  const xml = `<office:document-content ${attrs}><office:automatic-styles>${styles}</office:automatic-styles><office:body><office:spreadsheet><table:table table:name="Solves"><table:table-row table:number-rows-repeated="4"><table:table-cell/></table:table-row>${rows}<table:table-row table:number-rows-repeated="900000"><table:table-cell table:number-columns-repeated="1000"/></table:table-row></table:table></office:spreadsheet></office:body></office:document-content>`;
  assert.deepEqual(await readWorkbook(archive({ 'content.xml': xml }), parse), [
    { cells: SAMPLE, name: 'Solves · C5:L10' },
  ]);
});
test('invalid workbooks and incomplete sheets cannot produce an import', async () => {
  await assert.rejects(readWorkbook(new Uint8Array([1, 2, 3]), parse), /workbook/);
  await assert.rejects(
    readWorkbook(xlsx([[{ cells: SAMPLE.slice(0, 50), x: 0, y: 0 }]]), parse),
    /No complete boards/,
  );
});
test('accepts portrait ranges with arbitrary piece identifiers and sheet-wide CSV with headers and gutters', () => {
  const g = new SheetGrid('Portrait');
  for (let i = 0; i < 60; i++)
    g.set(3 + (i % 10), 2 + Math.floor(i / 10), String(1 + LETTERS.indexOf(SAMPLE[i])));
  assert.equal(canonicalKey(extractSheetBoards(g)[0].cells), canonicalKey(SAMPLE));
  const rows = SAMPLE.match(/.{10}/g).map((r, y) =>
    ['', ...r, '', ...OTHER.slice(y * 10, y * 10 + 10)].join(','),
  );
  const table = '"Archive, 2020"\n,D,,,,,,,,,,,A\n\n' + rows.join('\r\n');
  assert.deepEqual(
    readGridText(table).map((r) => r.cells),
    [SAMPLE, OTHER],
  );
});
test('native Sheets shortcuts and sheet links offer a Google export without treating metadata as cells', async () => {
  const id = 'synthetic_Sheets-file-123';
  const link = `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
  const file = new File([JSON.stringify({ doc_id: id })], 'grid.gsheet', {
    type: 'application/vnd.google-apps.spreadsheet',
  });
  assert.deepEqual(await readImportFile(file, new AbortController().signal), {
    kind: 'shortcut',
    link,
  });
  assert.equal(exportLink(`https://docs.google.com/spreadsheets/u/2/d/${id}/edit#gid=999`), link);
  assert.equal(exportLink('https://example.org/spreadsheets/d/not-a-sheet/edit'), null);
  assert.equal(exportLink('{"version":1,"solutions":[]}'), null);
});
test('JPEG detection accepts Android files with empty or generic MIME and checks the signature', () => {
  for (const type of ['', 'application/octet-stream']) {
    assert.equal(imageFileType({ name: 'board.JPG', type }), 'image/jpeg');
    assert.equal(
      imageFileType({ name: 'image', type }, Uint8Array.of(255, 216, 255, 225)),
      'image/jpeg',
    );
  }
  assert.equal(imageFileType({ name: 'notes.txt', type: 'text/plain' }), '');
});

test('a mixed invalid batch cannot change an existing collection', () => {
  const original = mergeRecords([], [{ cells: SAMPLE }]).records;
  assert.throws(
    () => mergeRecords(original, [{ cells: OTHER }, { cells: 'I'.repeat(60) }]),
    /verified shapes/,
  );
  assert.equal(original.length, 1);
});
