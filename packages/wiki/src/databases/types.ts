export type AffineDatabaseOption = {
  id: string;
  value: string;
  color?: string;
};

export type AffineDatabaseColumn = {
  id: string;
  name: string;
  type: string;
  options?: AffineDatabaseOption[];
};

export type AffineDatabaseViewColumn = {
  id: string;
  name?: string | null;
  hidden?: boolean;
  width?: number | null;
};

export type AffineDatabaseViewConfig = {
  id: string;
  name: string;
  mode: string;
  columns?: AffineDatabaseViewColumn[];
  columnIds?: string[];
  groupBy?: { columnId?: string; name?: string; type?: string } | null;
};

export type AffineDatabaseCell = {
  columnId?: string;
  type?: string;
  value?: unknown;
  optionId?: string;
};

export type AffineDatabaseRow = {
  rowBlockId: string;
  title: string;
  linkedDocId?: string | null;
  href?: string;
  cells: Record<string, AffineDatabaseCell>;
};

export type AffineDatabaseSnapshot = {
  databaseBlockId: string;
  title?: string | null;
  titleColumnId?: string | null;
  columns: AffineDatabaseColumn[];
  views: AffineDatabaseViewConfig[];
  rows: AffineDatabaseRow[];
};
