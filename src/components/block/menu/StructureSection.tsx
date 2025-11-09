// File Header: Row/column manipulation commands grouped under the structure tab.
import React from 'react'
import Button from '../../atom/Button'
import TextInput from '../../atom/TextInput'
import MenuSectionCard from './MenuSectionCard'

type StructureSectionProps = {
  newColumnName: string
  onColumnNameChange: (_value: string) => void
  onAddRow: () => void
  onAddColumn: () => void
  onDeleteSelectedRows: () => void
  hasSelection: boolean
}

// Function Header: Presents actions for adding rows and columns.
export default function StructureSection({
  newColumnName,
  onColumnNameChange,
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
        <div className="flex items-center gap-2">
          <TextInput
            type="text"
            placeholder="列名を入力"
            value={newColumnName}
            onChange={(event) => onColumnNameChange(event.target.value)}
          />
          <Button type="button" variant="ghost" onClick={onAddColumn}>
            列を追加
          </Button>
        </div>
      </div>
    </MenuSectionCard>
  )
}
