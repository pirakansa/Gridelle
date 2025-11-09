// File Header: Selection status display and clear action.
import React from 'react'
import Button from '../../atom/Button'
import TextInput from '../../atom/TextInput'
import MenuSectionCard from './MenuSectionCard'

type SelectionSectionProps = {
  selectionSummary: string
  hasSelection: boolean
  onClearSelection: () => void
  bulkValue: string
  onBulkValueChange: (_value: string) => void
  onBulkApply: () => void
}

// Function Header: Shows current selection summary and allows clearing it.
export default function SelectionSection({
  selectionSummary,
  hasSelection,
  onClearSelection,
  bulkValue,
  onBulkValueChange,
  onBulkApply,
}: SelectionSectionProps): React.ReactElement {
  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
            {selectionSummary}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>⌘/Ctrl+V で貼り付け / Escape で選択解除</span>
            <Button type="button" variant="subtle" onClick={onClearSelection} disabled={!hasSelection}>
              選択をクリア
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <TextInput
            type="text"
            placeholder="選択セルへ一括入力"
            value={bulkValue}
            onChange={(event) => onBulkValueChange(event.target.value)}
            data-testid="bulk-input"
            onPointerDown={(event) => event.stopPropagation()}
            fullWidth
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onBulkApply}
              disabled={!hasSelection}
              data-testid="bulk-apply"
            >
              一括入力する
            </Button>
            <span className="text-xs text-slate-500">選択範囲に同じ値を設定</span>
          </div>
        </div>
      </div>
    </MenuSectionCard>
  )
}
