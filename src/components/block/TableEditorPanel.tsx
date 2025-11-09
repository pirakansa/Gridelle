// File Header: Ribbon-style menu exposing spreadsheet structure and selection controls.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import Button from '../atom/Button'
import TextInput from '../atom/TextInput'

type Props = {
  notice: { text: string; tone: 'error' | 'success' } | null
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  currentSheetName: string
  onRenameSheet: (_name: string) => void
  onAddSheet: () => void
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
}

// Function Header: Renders ribbon groups for sheet management, structure editing, and bulk operations.
export default function TableEditorPanel({
  sheetNames,
  activeSheetIndex,
  onSelectSheet,
  currentSheetName,
  onRenameSheet,
  onAddSheet,
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
}: Props): React.ReactElement {
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
    <section className="flex flex-col gap-4" aria-label="スプレッドシートメニュー">
      <div className={`${layoutTheme.ribbonShell} p-4 md:p-6`}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
              {notice.text}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className={ribbonGroupClass}>
              <span className={ribbonTitleClass}>構造</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={onAddRow}>
                  行を追加
                </Button>
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
            </div>
            <div className={ribbonGroupClass}>
              <span className={ribbonTitleClass}>選択</span>
              <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
                {selectionSummary}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>⌘/Ctrl+V で貼り付け / Escape で選択解除</span>
                <Button type="button" variant="subtle" onClick={onClearSelection} disabled={!hasSelection}>
                  選択をクリア
                </Button>
              </div>
            </div>
            <div className={ribbonGroupClass}>
              <span className={ribbonTitleClass}>一括入力</span>
              <div className="flex flex-col gap-3">
                <TextInput
                  type="text"
                  placeholder="選択セルへ一括入力"
                  value={bulkValue}
                  onChange={(event) => onBulkValueChange(event.target.value)}
                  data-testid="bulk-input"
                  onPointerDown={(event) => event.stopPropagation()}
                  fullWidth
                />
                <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>
    </section>
  )
}
