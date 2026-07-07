"use client";

import { useMemo, useState } from "react";

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
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[] | undefined;
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  actions?: (row: T) => React.ReactNode;
  addButton?: React.ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  actions,
  addButton,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

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

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 min-w-[200px] bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
        />
        {filterableColumns.map((col) => (
          <select
            key={col.key}
            value={filters[col.key] ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, [col.key]: e.target.value }))
            }
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A227]"
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
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap"
                >
                  {col.label}
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
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center text-gray-400 py-10"
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center text-gray-400 py-10"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-700 align-top">
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
