// File Header: Selection status display and clear action.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'

type SelectionSectionProps = {
  selectionSummary: string
  hasSelection: boolean
  onClearSelection: () => void
}

// Function Header: Shows current selection summary and allows clearing it.
export default function SelectionSection({
  selectionSummary,
  hasSelection,
  onClearSelection,
}: SelectionSectionProps): React.ReactElement {
  return (
    <MenuSectionCard>
      <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
        {selectionSummary}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>⌘/Ctrl+V で貼り付け / Escape で選択解除</span>
        <Button type="button" variant="subtle" onClick={onClearSelection} disabled={!hasSelection}>
          選択をクリア
        </Button>
      </div>
    </MenuSectionCard>
  )
}
