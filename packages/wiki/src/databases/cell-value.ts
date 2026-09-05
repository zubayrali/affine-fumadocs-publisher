import type {
  AffineDatabaseColumn,
  AffineDatabaseRow,
  AffineDatabaseSnapshot,
  AffineDatabaseViewConfig,
} from './types.js';

export function textValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return textValue(record.value ?? record.name ?? record.label ?? '');
  }
  return '';
}

export function visibleColumns(
  snapshot: AffineDatabaseSnapshot,
  view: AffineDatabaseViewConfig,
): AffineDatabaseColumn[] {
  const definitions = new Map(snapshot.columns.map((column) => [column.id, column]));
  const configured = view.columns?.filter((column) => !column.hidden) ?? [];
  const ids =
    configured.length > 0
      ? configured.map((column) => column.id)
      : ['title', ...(view.columnIds ?? snapshot.columns.map((column) => column.id))];

  return ids.flatMap((id) => {
    if (id === 'title') {
      return [{ id: 'title', name: 'Title', type: 'title' } satisfies AffineDatabaseColumn];
    }
    const column = definitions.get(id);
    return column ? [column] : [];
  });
}

export function rowGroupValue(
  row: AffineDatabaseRow,
  groupColumnName: string | undefined,
): string {
  if (!groupColumnName) return '';
  return textValue(row.cells[groupColumnName]?.value);
}
