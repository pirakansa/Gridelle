// File Header: Sheet management controls for switching, naming, and adding sheets.
import React from 'react'
import Button from '../../atom/Button'
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
  const sheetGroupLabelId = React.useId()
  const sheetTabBaseClass =
    'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200'
  const sheetTabActiveClass = 'border-slate-900 bg-slate-900 text-white shadow'
  const sheetTabInactiveClass =
    'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 focus:border-slate-300'

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span id={sheetGroupLabelId} className="font-medium text-slate-700">
              シート
            </span>
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-labelledby={sheetGroupLabelId}
              data-testid="sheet-tablist"
            >
              {sheetNames.map((name, index) => {
                const isActive = index === activeSheetIndex
                const buttonClass = `${sheetTabBaseClass} ${isActive ? sheetTabActiveClass : sheetTabInactiveClass}`
                return (
                  <button
                    key={`${name}-${index}`}
                    type="button"
                    className={buttonClass}
                    onClick={() => onSelectSheet(index)}
                    aria-pressed={isActive}
                    data-testid={`sheet-tab-${index}`}
                  >
                    {name}
                  </button>
                )
              })}
            </div>
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
