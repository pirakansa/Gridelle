// File Header: Table head rendering column titles with move handles.
import React from 'react'

type TableHeadProps = {
  columns: string[]
  onMoveColumn: (_columnKey: string, _direction: 'left' | 'right') => void
}

const columnButtonClass =
  'rounded-full border border-slate-200 p-1 text-[10px] text-slate-500 transition hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent'

// Function Header: Renders header cells including move controls per column.
export default function TableHead({
  columns,
  onMoveColumn,
}: TableHeadProps): React.ReactElement {
  return (
    <thead>
      <tr>
        <th className="row-number-header" aria-label="行番号">
          #
        </th>
        {columns.map((column, columnIndex) => (
          <th key={column} data-testid="column-header">
            <div className="flex items-center gap-2">
              <span data-testid="column-title" className="font-semibold">
                {column}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={columnButtonClass}
                  aria-label={`${column}列を左へ移動`}
                  onClick={() => onMoveColumn(column, 'left')}
                  disabled={columnIndex === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  className={columnButtonClass}
                  aria-label={`${column}列を右へ移動`}
                  onClick={() => onMoveColumn(column, 'right')}
                  disabled={columnIndex === columns.length - 1}
                >
                  →
                </button>
              </div>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}
