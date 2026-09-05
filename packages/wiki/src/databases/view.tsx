'use client';

import Link from 'fumadocs-core/link';
import { useMemo, useState } from 'react';
import {
  rowGroupValue,
  textValue,
  visibleColumns,
} from './cell-value.js';
import type {
  AffineDatabaseCell,
  AffineDatabaseRow,
  AffineDatabaseSnapshot,
  AffineDatabaseViewConfig,
} from './types.js';

function CellValue({ cell }: { cell?: AffineDatabaseCell }) {
  if (!cell) return <span className="affine-db-empty">—</span>;
  const value = textValue(cell.value);
  if (!value) return <span className="affine-db-empty">—</span>;
  if (cell.type === 'checkbox') {
    return <span aria-label={value}>{value === 'Yes' ? '✓' : '○'}</span>;
  }
  if (cell.type === 'select' || cell.type === 'multi-select') {
    return <span className="affine-db-chip">{value}</span>;
  }
  return <span>{value}</span>;
}

function RowTitle({ row }: { row: AffineDatabaseRow }) {
  return row.href ? (
    <Link href={row.href}>{row.title || 'Untitled'}</Link>
  ) : (
    <>{row.title || 'Untitled'}</>
  );
}

function TableView({
  snapshot,
  view,
}: {
  snapshot: AffineDatabaseSnapshot;
  view: AffineDatabaseViewConfig;
}) {
  const columns = visibleColumns(snapshot, view);
  const widths = new Map(view.columns?.map((column) => [column.id, column.width]) ?? []);

  return (
    <div className="affine-db-table-wrap">
      <table className="affine-db-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                style={widths.get(column.id) ? { width: widths.get(column.id)! } : undefined}
              >
                <span className="affine-db-column-kind">
                  {column.type === 'title' ? 'Aa' : column.type.slice(0, 2)}
                </span>
                {column.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshot.rows.map((row) => (
            <tr key={row.rowBlockId}>
              {columns.map((column) => (
                <td key={column.id}>
                  {column.id === 'title' ? (
                    <RowTitle row={row} />
                  ) : (
                    <CellValue cell={row.cells[column.name]} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GalleryView({
  snapshot,
}: {
  snapshot: AffineDatabaseSnapshot;
  view: AffineDatabaseViewConfig;
}) {
  return (
    <div className="affine-db-gallery">
      {snapshot.rows.map((row) => (
        <article className="affine-db-card" key={row.rowBlockId}>
          <RowTitle row={row} />
          <ul className="affine-db-gallery-meta">
            {snapshot.columns.slice(0, 3).map((column) => {
              const value = textValue(row.cells[column.name]?.value);
              if (!value) return null;
              return (
                <li key={column.id}>
                  <span className="affine-db-eyebrow">{column.name}</span>
                  <span>{value}</span>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}

function KanbanView({
  snapshot,
  view,
}: {
  snapshot: AffineDatabaseSnapshot;
  view: AffineDatabaseViewConfig;
}) {
  const groupColumn = snapshot.columns.find(
    (column) => column.id === view.groupBy?.columnId,
  );
  const groups = groupColumn?.options?.map((option) => option.value) ?? [];
  const names = [
    ...new Set([
      ...groups,
      ...snapshot.rows.map((row) => rowGroupValue(row, groupColumn?.name)).filter(Boolean),
      'Unassigned',
    ]),
  ];

  return (
    <div className="affine-db-kanban">
      {names.map((name) => {
        const rows = snapshot.rows.filter(
          (row) => (rowGroupValue(row, groupColumn?.name) || 'Unassigned') === name,
        );
        if (rows.length === 0 && name === 'Unassigned') return null;
        return (
          <section className="affine-db-lane" key={name} aria-label={name}>
            <header>
              <span className="affine-db-chip">{name}</span>
              <span>{rows.length}</span>
            </header>
            <div>
              {rows.map((row) => (
                <article className="affine-db-card" key={row.rowBlockId}>
                  <RowTitle row={row} />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function renderView(
  snapshot: AffineDatabaseSnapshot,
  view: AffineDatabaseViewConfig,
) {
  if (view.mode === 'kanban') return <KanbanView snapshot={snapshot} view={view} />;
  if (view.mode === 'gallery') return <GalleryView snapshot={snapshot} view={view} />;
  return <TableView snapshot={snapshot} view={view} />;
}

export function AffineDatabaseView({ snapshot }: { snapshot: AffineDatabaseSnapshot }) {
  const views = useMemo(
    () =>
      snapshot.views.length > 0
        ? snapshot.views
        : [{ id: 'table', name: 'Table', mode: 'table' }],
    [snapshot.views],
  );
  const [viewId, setViewId] = useState(views[0]!.id);
  const view = views.find((candidate) => candidate.id === viewId) ?? views[0]!;

  return (
    <section
      className="affine-db nodrag nopan nowheel not-prose"
      aria-label={snapshot.title || 'Database'}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <header className="affine-db-heading">
        <div>
          <span className="affine-db-eyebrow">Database</span>
          <h3>{snapshot.title || 'Untitled database'}</h3>
        </div>
        <div className="affine-db-tabs" role="tablist" aria-label="Database views">
          {views.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={candidate.id === view.id}
              onClick={() => setViewId(candidate.id)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      </header>
      <div role="tabpanel">{renderView(snapshot, view)}</div>
    </section>
  );
}
