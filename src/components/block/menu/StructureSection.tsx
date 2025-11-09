// File Header: Row/column manipulation commands grouped under the structure tab.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'

type StructureSectionProps = {
  onAddRow: () => void
  onInsertRowBelowSelection: () => void
  onAddColumn: () => void
  onInsertColumnRightOfSelection: () => void
  onDeleteSelectedColumns: () => void
  onDeleteSelectedRows: () => void
  onMoveSelectedColumnsLeft: () => void
  onMoveSelectedColumnsRight: () => void
  canMoveSelectedColumnsLeft: boolean
  canMoveSelectedColumnsRight: boolean
  hasSelection: boolean
}

// Function Header: Presents actions for adding rows and columns.
export default function StructureSection({
  onAddRow,
  onInsertRowBelowSelection,
  onAddColumn,
  onInsertColumnRightOfSelection,
  onDeleteSelectedColumns,
  onDeleteSelectedRows,
  onMoveSelectedColumnsLeft,
  onMoveSelectedColumnsRight,
  canMoveSelectedColumnsLeft,
  canMoveSelectedColumnsRight,
  hasSelection,
}: StructureSectionProps): React.ReactElement {
  return (
    <MenuSectionCard>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-3" aria-label="行の操作">
          <h3 className="text-sm font-semibold text-slate-700">行</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onAddRow}>
              行を追加
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onInsertRowBelowSelection}
              disabled={!hasSelection}
              data-testid="insert-row-below-selection"
            >
              選択行の下に行を追加
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDeleteSelectedRows}
              disabled={!hasSelection}
              data-testid="delete-selected-rows"
            >
              選択行を削除
            </Button>
          </div>
        </section>
        <section className="flex flex-col gap-3" aria-label="列の操作">
          <h3 className="text-sm font-semibold text-slate-700">列</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={onAddColumn}>
              列を追加
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onInsertColumnRightOfSelection}
              disabled={!hasSelection}
              data-testid="insert-column-right-of-selection"
            >
              選択列の右に列を追加
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onMoveSelectedColumnsLeft}
              disabled={!canMoveSelectedColumnsLeft}
              data-testid="move-selected-columns-left"
            >
              選択列を左へ移動
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onMoveSelectedColumnsRight}
              disabled={!canMoveSelectedColumnsRight}
              data-testid="move-selected-columns-right"
            >
              選択列を右へ移動
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onDeleteSelectedColumns}
              disabled={!hasSelection}
              data-testid="delete-selected-columns"
            >
              選択列を削除
            </Button>
          </div>
        </section>
      </div>
    </MenuSectionCard>
  )
}
