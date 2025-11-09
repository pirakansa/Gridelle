// File Header: Sheet management controls for switching, naming, and adding sheets.
import React from 'react'
import Button from '../../atom/Button'
import SelectField from '../../atom/SelectField'
import TextInput from '../../atom/TextInput'
import MenuSectionCard from './MenuSectionCard'

type SheetSectionProps = {
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  onAddSheet: () => void
  sheetNameDraft: string
  onSheetNameDraftChange: (_value: string) => void
  onCommitSheetName: () => void
  onCancelSheetRename: () => void
}

// Function Header: Renders the sheet selector, rename input, and add-sheet button.
export default function SheetSection({
  sheetNames,
  activeSheetIndex,
  onSelectSheet,
  onAddSheet,
  sheetNameDraft,
  onSheetNameDraftChange,
  onCommitSheetName,
  onCancelSheetRename,
}: SheetSectionProps): React.ReactElement {
  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <label htmlFor="sheet-select" className="font-medium text-slate-700">
              シート
            </label>
            <SelectField
              id="sheet-select"
              value={activeSheetIndex}
              onChange={(event) => onSelectSheet(Number(event.target.value))}
              data-testid="sheet-select"
            >
              {sheetNames.map((name, index) => (
                <option key={`${name}-${index}`} value={index}>
                  {name}
                </option>
              ))}
            </SelectField>
          </div>
          <Button type="button" variant="ghost" onClick={onAddSheet} data-testid="add-sheet-button">
            シートを追加
          </Button>
        </div>
        <div className="flex w-full max-w-sm items-center gap-2 md:max-w-md">
          <label htmlFor="sheet-name" className="text-sm text-slate-600">
            シート名
          </label>
          <TextInput
            id="sheet-name"
            value={sheetNameDraft}
            onChange={(event) => onSheetNameDraftChange(event.target.value)}
            onBlur={onCommitSheetName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onCommitSheetName()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                onCancelSheetRename()
              }
            }}
            data-testid="sheet-name-input"
            fullWidth
          />
        </div>
      </div>
    </MenuSectionCard>
  )
}
