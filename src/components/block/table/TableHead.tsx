// File Header: Table head rendering column titles and selection controls.
import React from 'react'
import { useI18n } from '../../../utils/i18n'

type TableHeadProps = {
  columns: string[]
  onColumnHeaderClick: (_columnIndex: number, _extend: boolean) => void
}

// Function Header: Renders header cells with column selection buttons.
export default function TableHead({
  columns,
  onColumnHeaderClick,
}: TableHeadProps): React.ReactElement {
  const { select } = useI18n()

  return (
    <thead>
      <tr>
        <th className="row-number-header" aria-label={select('行番号', 'Row numbers')}>
          #
        </th>
        {columns.map((column, columnIndex) => (
          <th key={column} data-testid="column-header">
            <div className="flex items-center">
              <button
                type="button"
                className="column-header-button"
                onClick={(event) => onColumnHeaderClick(columnIndex, event.shiftKey)}
                aria-label={select(`${column}列を選択`, `Select column ${column}`)}
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
