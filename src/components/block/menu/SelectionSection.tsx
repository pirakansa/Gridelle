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
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
          {selectionSummary}
        </p>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>⌘/Ctrl+V で貼り付け / Escape で選択解除</span>
          <Button type="button" variant="subtle" onClick={onClearSelection} disabled={!hasSelection}>
            選択をクリア
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 md:ml-auto">
          <TextInput
            type="text"
            placeholder="選択セルへ一括入力"
            value={bulkValue}
            onChange={(event) => onBulkValueChange(event.target.value)}
            data-testid="bulk-input"
            onPointerDown={(event) => event.stopPropagation()}
            className="w-56 sm:w-72 md:w-80 lg:w-96"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={onBulkApply}
            disabled={!hasSelection}
            data-testid="bulk-apply"
          >
            一括入力する
          </Button>
        </div>
      </div>
    </MenuSectionCard>
  )
}
