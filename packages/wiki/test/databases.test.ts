import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findAffineDatabaseBlockIds,
  replaceAffineDatabaseMarkers,
} from '../src/databases/markers.ts';
import { textValue, visibleColumns } from '../src/databases/cell-value.ts';
import type { AffineDatabaseSnapshot } from '../src/databases/types.ts';

test('finds escaped database block IDs and replaces markers', () => {
  const markdown =
    'Before\n\n<!-- unsupported: flavour=affine:database blockId=db&#45;one -->\n\nAfter';
  assert.deepEqual(findAffineDatabaseBlockIds(markdown), ['db-one']);
  const replaced = replaceAffineDatabaseMarkers(
    markdown,
    new Map([['db-one', '/affine-database/doc/db-one.json']]),
  );
  assert.match(replaced, /<AffineDatabase src="\/affine-database\/doc\/db-one\.json" \/>/);
  assert.match(
    replaced,
    /import \{ AffineDatabase \} from "@affine-fumadocs\/wiki\/databases"/,
  );
});

test('leaves unavailable database markers intact', () => {
  const markdown = '<!-- unsupported: flavour=affine:database blockId=db -->';
  assert.equal(replaceAffineDatabaseMarkers(markdown, new Map()), markdown);
});

test('formats cell values and resolves visible columns', () => {
  assert.equal(textValue(true), 'Yes');
  assert.equal(textValue({ name: 'Ready' }), 'Ready');
  assert.equal(textValue(['a', 'b']), 'a, b');

  const snapshot: AffineDatabaseSnapshot = {
    databaseBlockId: 'db',
    columns: [
      { id: 'status', name: 'Status', type: 'select' },
      { id: 'owner', name: 'Owner', type: 'text' },
    ],
    views: [
      {
        id: 'table',
        name: 'Table',
        mode: 'table',
        columns: [
          { id: 'title' },
          { id: 'status' },
          { id: 'owner', hidden: true },
        ],
      },
    ],
    rows: [],
  };

  const columns = visibleColumns(snapshot, snapshot.views[0]!);
  assert.deepEqual(
    columns.map((column) => column.id),
    ['title', 'status'],
  );
});
