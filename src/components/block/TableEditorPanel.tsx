// File Header: Ribbon-style menu exposing spreadsheet structure and selection controls.
import React from 'react'
import type { Notice } from '../../pages/top/types'
import { layoutTheme } from '../../utils/Theme'
import Button from '../atom/Button'
import TextAreaField from '../atom/TextAreaField'
import TextInput from '../atom/TextInput'
import { useI18n } from '../../utils/i18n'

type Props = {
  notice: Notice | null
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  currentSheetName: string
  onRenameSheet: (_name: string) => void
  onAddSheet: () => void
  onDeleteSheet: () => void
  newColumnName: string
  onColumnNameChange: React.Dispatch<React.SetStateAction<string>>
  onAddRow: () => void
  onAddColumn: () => void
  selectionSummary: string
  onClearSelection: () => void
  hasSelection: boolean
  bulkValue: string
  onBulkValueChange: React.Dispatch<React.SetStateAction<string>>
  onBulkApply: () => void
  canDeleteSheet: boolean
}

// Function Header: Renders ribbon groups for sheet management, structure editing, and bulk operations.
export default function TableEditorPanel({
  sheetNames,
  activeSheetIndex,
  onSelectSheet,
  currentSheetName,
  onRenameSheet,
  onAddSheet,
  onDeleteSheet,
  newColumnName,
  onColumnNameChange,
  onAddRow,
  onAddColumn,
  selectionSummary,
  onClearSelection,
  hasSelection,
  bulkValue,
  onBulkValueChange,
  onBulkApply,
  notice,
  canDeleteSheet,
}: Props): React.ReactElement {
  const { select } = useI18n()
  const [sheetNameDraft, setSheetNameDraft] = React.useState<string>(currentSheetName)

  React.useEffect(() => {
    setSheetNameDraft(currentSheetName)
  }, [currentSheetName])

  const commitSheetName = React.useCallback(() => {
    const trimmed = sheetNameDraft.trim()
    if (!trimmed) {
      onRenameSheet(sheetNameDraft)
      setSheetNameDraft(currentSheetName)
      return
    }
    if (trimmed !== currentSheetName) {
      onRenameSheet(trimmed)
    }
  }, [sheetNameDraft, currentSheetName, onRenameSheet])

  const ribbonGroupClass =
    'flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-inner'
  const ribbonTitleClass = 'text-xs font-semibold uppercase tracking-wide text-slate-500'
  const sheetGroupLabelId = React.useId()
  const sheetTabBaseClass =
    'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200'
  const sheetTabActiveClass = 'border-slate-900 bg-slate-900 text-white shadow'
  const sheetTabInactiveClass =
    'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 focus:border-slate-300'

  return (
    <section className="flex flex-col gap-4" aria-label={select('スプレッドシートメニュー', 'Spreadsheet menu')}>
      <div className={`${layoutTheme.ribbonShell} p-4 md:p-6`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span id={sheetGroupLabelId} className="font-medium text-slate-700">
                  {select('シート', 'Sheets')}
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
                {select('シートを追加', 'Add sheet')}
              </Button>
              <Button
                type="button"
                variant="subtle"
                onClick={onDeleteSheet}
                disabled={!canDeleteSheet}
                data-testid="delete-sheet-button"
              >
                {select('シートを削除', 'Delete sheet')}
              </Button>
            </div>
            <div className="flex w-full max-w-sm items-center gap-2 md:max-w-md">
              <label htmlFor="sheet-name" className="text-sm text-slate-600">
                {select('シート名', 'Sheet name')}
              </label>
              <TextInput
                id="sheet-name"
                type="text"
                value={sheetNameDraft}
                onChange={(event) => setSheetNameDraft(event.target.value)}
                onBlur={commitSheetName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    commitSheetName()
                  }
                }}
                data-testid="sheet-name-input"
                fullWidth
              />
            </div>
          </div>
          {notice && (
            <p
              className={`text-sm ${notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
              role={notice.tone === 'error' ? 'alert' : 'status'}
              data-testid="table-notice"
            >
              {select(notice.text.ja, notice.text.en)}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className={ribbonGroupClass}>
              <span className={ribbonTitleClass}>{select('構造', 'Structure')}</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={onAddRow}>
                  {select('行を追加', 'Add row')}
                </Button>
                <div className="flex items-center gap-2">
                  <TextInput
                    type="text"
                    placeholder={select('列名を入力', 'Enter a column name')}
                    value={newColumnName}
                    onChange={(event) => onColumnNameChange(event.target.value)}
                  />
                  <Button type="button" variant="ghost" onClick={onAddColumn}>
                    {select('列を追加', 'Add column')}
                  </Button>
                </div>
              </div>
            </div>
            <div className={ribbonGroupClass}>
              <span className={ribbonTitleClass}>{select('選択', 'Selection')}</span>
              <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
                {selectionSummary}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{select('⌘/Ctrl+V で貼り付け / Escape で選択解除', '⌘/Ctrl+V to paste / Escape to clear selection')}</span>
                <Button type="button" variant="subtle" onClick={onClearSelection} disabled={!hasSelection}>
                  {select('選択をクリア', 'Clear selection')}
                </Button>
              </div>
            </div>
            <div className={ribbonGroupClass}>
              <span className={ribbonTitleClass}>{select('一括入力', 'Bulk fill')}</span>
              <div className="flex flex-col gap-3">
                <TextAreaField
                  placeholder={select('選択セルへ一括入力', 'Bulk fill the selected cells')}
                  value={bulkValue}
                  onChange={(event) => onBulkValueChange(event.target.value)}
                  data-testid="bulk-input"
                  onPointerDown={(event) => event.stopPropagation()}
                  fullWidth
                  minRows={1}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                  onClick={onBulkApply}
                  disabled={!hasSelection}
                  data-testid="bulk-apply"
                >
                  {select('一括入力する', 'Apply to selection')}
                </Button>
                <span className="text-xs text-slate-500">
                  {select('選択範囲に同じ値を設定', 'Set the same value across the selection')}
                </span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  )
}
