// File Header: Table head rendering column titles and selection controls.
import React from 'react'

type TableHeadProps = {
  columns: string[]
  onColumnHeaderClick: (_columnIndex: number, _extend: boolean) => void
}

// Function Header: Renders header cells with column selection buttons.
export default function TableHead({
  columns,
  onColumnHeaderClick,
}: TableHeadProps): React.ReactElement {
  return (
    <thead>
      <tr>
        <th className="row-number-header" aria-label="行番号">
          #
        </th>
        {columns.map((column, columnIndex) => (
          <th key={column} data-testid="column-header">
            <div className="flex items-center">
              <button
                type="button"
                className="column-header-button"
                onClick={(event) => onColumnHeaderClick(columnIndex, event.shiftKey)}
                aria-label={`${column}列を選択`}
                data-testid={`column-select-${columnIndex}`}
              >
                <span data-testid="column-title" className="font-semibold">
                  {column}
                </span>
              </button>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}
