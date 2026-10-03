"use client";

import { useMemo, useState } from "react";
import { Download, Edit3, Package, Plus, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export type Row = { id: string; values: string[]; status?: string; tone?: string; [key: string]: unknown };

function exportCSV(rows: Row[], columns: string[], filenamePrefix: string) {
  const header = columns.map((col) => `"${col.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((row) => {
      // Include row.id first, followed by row.values
      const cellValues = [row.id, ...row.values];
      return cellValues.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
    })
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ManagementPage({
  active,
  title,
  description,
  action,
  columns,
  rows,
  searchPlaceholder,
  filters,
  onCreate,
  onEdit,
  onDelete,
  onRowAction,
  rowActionLabel,
  renderRowActions,
  showCreate = true,
  showRowActions = true,
}: {
  active: string;
  title: string;
  description: string;
  action?: string;
  columns: string[];
  rows: Row[];
  searchPlaceholder?: string;
  filters?: string[];
  onCreate?: () => void;
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
  onRowAction?: (row: Row) => void;
  rowActionLabel?: string;
  renderRowActions?: (row: Row) => React.ReactNode;
  showCreate?: boolean;
  showRowActions?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(filters?.[0] ?? "All status");

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const rowSearchString = `${row.id} ${row.values.join(" ")}`.toLowerCase();
      const matchesQuery = !query || rowSearchString.includes(query.toLowerCase());
      const matchesFilter =
        !filter ||
        filter === "All status" ||
        filter === "All" ||
        (row.status && row.status.toLowerCase() === filter.toLowerCase());
      return matchesQuery && matchesFilter;
    });
  }, [rows, query, filter]);

  return (
    <AppShell active={active}>
      <div className="page-wrap management-page">
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <Package size={14} /> {title}
            </div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="heading-actions">
            <button
              className="secondary-button"
              onClick={() => exportCSV(filteredRows, columns, title.toLowerCase().replace(/\s+/g, "-"))}
              title="Download records as CSV"
            >
              <Download size={16} /> Export CSV
            </button>
            {showCreate && onCreate && (
              <button className="primary-button" onClick={onCreate}>
                <Plus size={17} /> {action ?? `Add ${title.toLowerCase()}`}
              </button>
            )}
          </div>
        </section>

        <section className="panel records-panel">
          <div className="records-toolbar">
            <div>
              <h2>{title} Directory</h2>
              <p>
                {filteredRows.length} {filteredRows.length === 1 ? "record" : "records"} found
              </p>
            </div>
            <div className="toolbar-actions">
              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder ?? "Search records..."}
                />
              </div>
              {filters && filters.length > 0 && (
                <div className="filter-group">
                  {filters.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`filter-chip ${filter === option ? "active" : ""}`}
                      onClick={() => setFilter(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="table-wrap records-table">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  {showRowActions && <th className="row-actions-header">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong className="record-id">{row.id}</strong>
                    </td>
                    {row.values.map((value, index) => (
                      <td key={`${row.id}-${index}`}>
                        {index === row.values.length - 1 && row.status ? (
                          <span className={`status-badge status-${row.tone ?? "blue"}`}>
                            {row.status}
                          </span>
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                    {showRowActions && (
                      <td>
                        <div className="row-action-group">
                          {renderRowActions ? (
                            renderRowActions(row)
                          ) : (
                            <>
                              {onRowAction && (
                                <button
                                  className="icon-button"
                                  onClick={() => onRowAction(row)}
                                  title={rowActionLabel ?? "Action"}
                                >
                                  <Edit3 size={16} />
                                </button>
                              )}
                              {onEdit && (
                                <button
                                  className="icon-button"
                                  onClick={() => onEdit(row)}
                                  title="Edit record"
                                >
                                  <Edit3 size={16} />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  className="icon-button action-delete"
                                  onClick={() => onDelete(row)}
                                  title="Delete / Deactivate"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Package size={22} />
                </div>
                <strong>No records found</strong>
                <span>
                  {query || filter !== (filters?.[0] ?? "All status")
                    ? "Try adjusting your search or filter options."
                    : "Create your first entry to get started."}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
