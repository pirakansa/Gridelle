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
      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex flex-col gap-4" aria-label={select('行の操作', 'Row actions')}>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{select('行', 'Rows')}</h3>
            <Button type="button" size="sm" onClick={onAddRow}>
              {select('行を追加', 'Add row')}
            </Button>
          </header>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {select('選択範囲', 'Selection')}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-600">{select('移動', 'Move')}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={onMoveSelectedRowsUp}
                    disabled={!canMoveSelectedRowsUp}
                    data-testid="move-selected-rows-up"
                    aria-label={select('選択行を上へ移動', 'Move selected rows up')}
                  >
                    <span aria-hidden>↑</span>
                    <span className="sr-only">{select('選択行を上へ移動', 'Move selected rows up')}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={onMoveSelectedRowsDown}
                    disabled={!canMoveSelectedRowsDown}
                    data-testid="move-selected-rows-down"
                    aria-label={select('選択行を下へ移動', 'Move selected rows down')}
                  >
                    <span aria-hidden>↓</span>
                    <span className="sr-only">{select('選択行を下へ移動', 'Move selected rows down')}</span>
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  onClick={onInsertRowBelowSelection}
                  disabled={!hasSelection}
                  data-testid="insert-row-below-selection"
                >
                  {select('下に追加', 'Insert below')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  onClick={onDeleteSelectedRows}
                  disabled={!hasSelection}
                  data-testid="delete-selected-rows"
                >
                  {select('選択を削除', 'Delete selection')}
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="flex flex-col gap-4" aria-label={select('列の操作', 'Column actions')}>
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">{select('列', 'Columns')}</h3>
            <Button type="button" size="sm" onClick={onAddColumn}>
              {select('列を追加', 'Add column')}
            </Button>
          </header>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {select('選択範囲', 'Selection')}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-600">{select('移動', 'Move')}</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={onMoveSelectedColumnsLeft}
                    disabled={!canMoveSelectedColumnsLeft}
                    data-testid="move-selected-columns-left"
                    aria-label={select('選択列を左へ移動', 'Move selected columns left')}
                  >
                    <span aria-hidden>←</span>
                    <span className="sr-only">{select('選択列を左へ移動', 'Move selected columns left')}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={onMoveSelectedColumnsRight}
                    disabled={!canMoveSelectedColumnsRight}
                    data-testid="move-selected-columns-right"
                    aria-label={select('選択列を右へ移動', 'Move selected columns right')}
                  >
                    <span aria-hidden>→</span>
                    <span className="sr-only">{select('選択列を右へ移動', 'Move selected columns right')}</span>
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  onClick={onInsertColumnRightOfSelection}
                  disabled={!hasSelection}
                  data-testid="insert-column-right-of-selection"
                >
                  {select('右に追加', 'Insert right')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  onClick={onDeleteSelectedColumns}
                  disabled={!hasSelection}
                  data-testid="delete-selected-columns"
                >
                  {select('選択を削除', 'Delete selection')}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MenuSectionCard>
  )
}
