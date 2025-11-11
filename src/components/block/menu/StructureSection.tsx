// File Header: Row/column manipulation commands grouped under the structure tab.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'
import { useI18n } from '../../../utils/i18n'

type StructureSectionProps = {
  onAddRow: () => void
  onInsertRowBelowSelection: () => void
  onMoveSelectedRowsUp: () => void
  onMoveSelectedRowsDown: () => void
  onAddColumn: () => void
  onInsertColumnRightOfSelection: () => void
  onDeleteSelectedColumns: () => void
  onDeleteSelectedRows: () => void
  onMoveSelectedColumnsLeft: () => void
  onMoveSelectedColumnsRight: () => void
  canMoveSelectedColumnsLeft: boolean
  canMoveSelectedColumnsRight: boolean
  canMoveSelectedRowsUp: boolean
  canMoveSelectedRowsDown: boolean
  hasSelection: boolean
}

// Function Header: Presents actions for adding rows and columns.
export default function StructureSection({
  onAddRow,
  onInsertRowBelowSelection,
  onMoveSelectedRowsUp,
  onMoveSelectedRowsDown,
  onAddColumn,
  onInsertColumnRightOfSelection,
  onDeleteSelectedColumns,
  onDeleteSelectedRows,
  onMoveSelectedColumnsLeft,
  onMoveSelectedColumnsRight,
  canMoveSelectedColumnsLeft,
  canMoveSelectedColumnsRight,
  canMoveSelectedRowsUp,
  canMoveSelectedRowsDown,
  hasSelection,
}: StructureSectionProps): React.ReactElement {
  const { select } = useI18n()

  return (
    <MenuSectionCard>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-3" aria-label={select('行の操作', 'Row actions')}>
          <h3 className="text-sm font-semibold text-slate-700">{select('行', 'Rows')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onAddRow}>
              {select('行を追加', 'Add row')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onMoveSelectedRowsUp}
              disabled={!canMoveSelectedRowsUp}
              data-testid="move-selected-rows-up"
            >
              {select('選択行を上へ移動', 'Move selected rows up')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onMoveSelectedRowsDown}
              disabled={!canMoveSelectedRowsDown}
              data-testid="move-selected-rows-down"
            >
              {select('選択行を下へ移動', 'Move selected rows down')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onInsertRowBelowSelection}
              disabled={!hasSelection}
              data-testid="insert-row-below-selection"
            >
              {select('選択行の下に行を追加', 'Insert row below selection')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDeleteSelectedRows}
              disabled={!hasSelection}
              data-testid="delete-selected-rows"
            >
              {select('選択行を削除', 'Delete selected rows')}
            </Button>
          </div>
        </section>
        <section className="flex flex-col gap-3" aria-label={select('列の操作', 'Column actions')}>
          <h3 className="text-sm font-semibold text-slate-700">{select('列', 'Columns')}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={onAddColumn}>
              {select('列を追加', 'Add column')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onInsertColumnRightOfSelection}
              disabled={!hasSelection}
              data-testid="insert-column-right-of-selection"
            >
              {select('選択列の右に列を追加', 'Insert column to the right')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onMoveSelectedColumnsLeft}
              disabled={!canMoveSelectedColumnsLeft}
              data-testid="move-selected-columns-left"
            >
              {select('選択列を左へ移動', 'Move selected columns left')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onMoveSelectedColumnsRight}
              disabled={!canMoveSelectedColumnsRight}
              data-testid="move-selected-columns-right"
            >
              {select('選択列を右へ移動', 'Move selected columns right')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDeleteSelectedColumns}
              disabled={!hasSelection}
              data-testid="delete-selected-columns"
            >
              {select('選択列を削除', 'Delete selected columns')}
            </Button>
          </div>
        </section>
      </div>
    </MenuSectionCard>
  )
}
