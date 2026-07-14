"use client";

import { useEffect, useMemo, useState } from "react";

export type Column<T> = {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  /** Value used for search matching. Defaults to `row[key]`. */
  searchValue?: (row: T) => string;
  /** If provided, renders a dropdown filter for this column. */
  filterOptions?: { label: string; value: string }[];
  /** Value used to match against the selected filter option. Defaults to `row[key]`. */
  filterValue?: (row: T) => string;
  /** Initial column width in px. Defaults to 160. */
  defaultWidth?: number;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
  addButton?: React.ReactNode;
  /**
   * When provided, column order and widths are persisted to localStorage
   * under this key so the layout survives reloads.
   */
  storageKey?: string;
};

const MIN_COL_WIDTH = 80;

type StoredLayout = {
  order: string[];
  widths: Record<string, number>;
};

function loadLayout(storageKey: string | undefined): StoredLayout | null {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as StoredLayout;
  } catch {
    return null;
  }
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  actions,
  addButton,
  storageKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const stored = loadLayout(storageKey);
    const knownKeys = columns.map((c) => c.key);
    if (!stored) return knownKeys;
    // Keep any stored order, then append newly-added columns not yet stored.
    const ordered = stored.order.filter((k) => knownKeys.includes(k));
    const missing = knownKeys.filter((k) => !ordered.includes(k));
    return [...ordered, ...missing];
  });

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const stored = loadLayout(storageKey);
    return stored?.widths ?? {};
  });

  // Reconcile column order/widths if the set of columns changes (e.g. filter options load in).
  useEffect(() => {
    const knownKeys = columns.map((c) => c.key);
    setColumnOrder((prev) => {
      const kept = prev.filter((k) => knownKeys.includes(k));
      const missing = knownKeys.filter((k) => !kept.includes(k));
      if (missing.length === 0 && kept.length === prev.length) return prev;
      return [...kept, ...missing];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.map((c) => c.key).join("|")]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const layout: StoredLayout = { order: columnOrder, widths: colWidths };
    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  }, [storageKey, columnOrder, colWidths]);

  const orderedColumns = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]));
    return columnOrder.map((k) => byKey.get(k)).filter((c): c is Column<T> => !!c);
  }, [columnOrder, columns]);

  const filtered = useMemo(() => {
    if (!data) return undefined;
    const term = search.trim().toLowerCase();

    return data.filter((row) => {
      if (term) {
        const matches = columns.some((col) => {
          const value = col.searchValue
            ? col.searchValue(row)
            : String((row as Record<string, unknown>)[col.key] ?? "");
          return value.toLowerCase().includes(term);
        });
        if (!matches) return false;
      }

      for (const [key, filterVal] of Object.entries(filters)) {
        if (!filterVal) continue;
        const col = columns.find((c) => c.key === key);
        if (!col) continue;
        const value = col.filterValue
          ? col.filterValue(row)
          : String((row as Record<string, unknown>)[col.key] ?? "");
        if (value !== filterVal) return false;
      }

      return true;
    });
  }, [data, search, filters, columns]);

  const filterableColumns = columns.filter((c) => c.filterOptions);

  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [resizing, setResizing] = useState<{ key: string; startX: number; startWidth: number } | null>(
    null
  );

  useEffect(() => {
    if (!resizing) return;

    function onMove(e: MouseEvent) {
      if (!resizing) return;
      const delta = e.clientX - resizing.startX;
      const next = Math.max(MIN_COL_WIDTH, resizing.startWidth + delta);
      setColWidths((w) => ({ ...w, [resizing.key]: next }));
    }
    function onUp() {
      setResizing(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  function handleDrop(targetKey: string) {
    if (!draggingKey || draggingKey === targetKey) {
      setDraggingKey(null);
      return;
    }
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== draggingKey);
      const targetIndex = next.indexOf(targetKey);
      next.splice(targetIndex, 0, draggingKey);
      return next;
    });
    setDraggingKey(null);
  }

  function widthFor(col: Column<T>) {
    return colWidths[col.key] ?? col.defaultWidth ?? 160;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F2650C]"
        />
        {filterableColumns.map((col) => (
          <select
            key={col.key}
            value={filters[col.key] ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, [col.key]: e.target.value }))
            }
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F2650C]"
          >
            <option value="">All {col.label}</option>
            {col.filterOptions!.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}
        <div className="ml-auto">{addButton}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="text-sm" style={{ tableLayout: "fixed", width: "100%" }}>
          <colgroup>
            {orderedColumns.map((col) => (
              <col key={col.key} style={{ width: widthFor(col) }} />
            ))}
            {actions && <col style={{ width: 140 }} />}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {orderedColumns.map((col) => (
                <th
                  key={col.key}
                  draggable={!!storageKey}
                  onDragStart={() => setDraggingKey(col.key)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.key)}
                  className={`relative text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap select-none ${
                    storageKey ? "cursor-move" : ""
                  } ${draggingKey === col.key ? "opacity-50" : ""}`}
                >
                  {col.label}
                  {storageKey && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizing({ key: col.key, startX: e.clientX, startWidth: widthFor(col) });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      draggable={false}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-[#F2650C]/30"
                    />
                  )}
                </th>
              ))}
              {actions && (
                <th className="text-right px-4 py-3 font-semibold text-gray-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered === undefined ? (
              <tr>
                <td
                  colSpan={orderedColumns.length + (actions ? 1 : 0)}
                  className="text-center text-gray-400 py-10"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={orderedColumns.length + (actions ? 1 : 0)}
                  className="text-center text-gray-400 py-10"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-gray-50">
                  {orderedColumns.map((col) => (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-gray-700 align-top overflow-hidden text-ellipsis"
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered !== undefined && (
        <p className="text-xs text-gray-400 mt-2">
          {filtered.length} of {data?.length ?? 0} record
          {(data?.length ?? 0) === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
