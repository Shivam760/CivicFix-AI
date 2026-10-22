import React from 'react';

/**
 * DataTable
 * Accessible, responsive data table with horizontal scrolling support,
 * clean typography, and optional click interaction.
 */
export default function DataTable({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No records found matching current criteria.',
  className = '',
}) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-8 text-center text-sm text-stone-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-2xl border border-border bg-surface shadow-2xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-surface-canvas border-b border-border text-stone-600 font-bold uppercase tracking-wider text-[11px]">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={`py-3.5 px-4 font-semibold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.headerClassName || ''}`}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-stone-700">
          {data.map((row, rowIndex) => (
            <tr
              key={row[keyField] || rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors ${
                onRowClick
                  ? 'hover:bg-surface-canvas cursor-pointer focus:bg-surface-canvas focus:outline-none'
                  : 'hover:bg-surface-canvas'
              }`}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
            >
              {columns.map((col, colIndex) => (
                <td
                  key={col.key || colIndex}
                  className={`py-3.5 px-4 align-middle ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.cellClassName || ''}`}
                >
                  {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
