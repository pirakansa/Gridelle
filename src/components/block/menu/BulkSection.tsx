// File Header: Bulk edit controls for applying a single value to the selection.
import React from 'react'
import Button from '../../atom/Button'
import TextInput from '../../atom/TextInput'
import MenuSectionCard from './MenuSectionCard'

type BulkSectionProps = {
  bulkValue: string
  onBulkValueChange: (_value: string) => void
  onBulkApply: () => void
  hasSelection: boolean
}

// Function Header: Provides an input and action button for bulk updates.
export default function BulkSection({
  bulkValue,
  onBulkValueChange,
  onBulkApply,
  hasSelection,
}: BulkSectionProps): React.ReactElement {
  return (
    <MenuSectionCard>
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
    </MenuSectionCard>
  )
}
