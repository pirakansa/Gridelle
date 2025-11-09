// File Header: Row/column manipulation commands grouped under the structure tab.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'

type StructureSectionProps = {
  onAddRow: () => void
  onAddColumn: () => void
  onDeleteSelectedRows: () => void
  hasSelection: boolean
}

// Function Header: Presents actions for adding rows and columns.
export default function StructureSection({
  onAddRow,
  onAddColumn,
  onDeleteSelectedRows,
  hasSelection,
}: StructureSectionProps): React.ReactElement {
  return (
    <MenuSectionCard>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" onClick={onAddRow}>
            行を追加
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
        <Button type="button" variant="ghost" onClick={onAddColumn}>
          列を追加
        </Button>
      </div>
    </MenuSectionCard>
  )
}
