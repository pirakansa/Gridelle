// File Header: Panel containing table controls and bulk editing inputs.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import {
  ghostButtonClass,
  primaryButtonClass,
  subtleButtonClass,
} from '../constants'

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
  children: React.ReactNode
}

// Function Header: Renders table-level actions and wraps the spreadsheet table children.
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
  children,
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

  return (
    <section className="flex flex-col gap-4">
      <div className={layoutTheme.card}>
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">シート</span>
              <span className="text-xs text-slate-400">タブをクリックして切り替え</span>
            </div>
            <button
              type="button"
              className={ghostButtonClass}
              onClick={onAddSheet}
              data-testid="add-sheet-button"
            >
              シートを追加
            </button>
          </div>
          <div
            className="flex items-center gap-2 overflow-x-auto rounded-xl bg-slate-100/70 p-2"
            role="tablist"
            aria-label="シート一覧"
            data-testid="sheet-tablist"
          >
            {sheetNames.map((name, index) => {
              const isActive = index === activeSheetIndex
              return (
                <button
                  key={`sheet-tab-${index}`}
                  type="button"
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  aria-selected={isActive}
                  aria-controls="sheet-workspace"
                  onClick={() => onSelectSheet(index)}
                  className={`shrink-0 whitespace-nowrap rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor="sheet-name" className="text-sm text-slate-600">
              シート名
            </label>
            <input
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
              className="w-full max-w-xs rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              data-testid="sheet-name-input"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <h2 className={layoutTheme.sectionTitle}>テーブル編集</h2>
            <p className={layoutTheme.helperText}>セルを直接編集できます。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryButtonClass} onClick={onAddRow}>
              行を追加
            </button>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="列名を入力"
                value={newColumnName}
                onChange={(event) => onColumnNameChange(event.target.value)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button type="button" className={ghostButtonClass} onClick={onAddColumn}>
                列を追加
              </button>
            </div>
          </div>
        </div>
        {notice && (
          <p
            className={`mt-3 text-sm ${notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            data-testid="table-notice"
          >
            {notice.text}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p data-testid="selection-summary" className="font-medium text-slate-700">
            {selectionSummary}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>⌘/Ctrl+V で貼り付け / Escape で選択解除</span>
            <button
              type="button"
              className={subtleButtonClass}
              onClick={onClearSelection}
              disabled={!hasSelection}
            >
              選択をクリア
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="選択セルへ一括入力"
            value={bulkValue}
            onChange={(event) => onBulkValueChange(event.target.value)}
            className="min-w-[200px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            data-testid="bulk-input"
            onPointerDown={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            className={ghostButtonClass}
            onClick={onBulkApply}
            disabled={!hasSelection}
            data-testid="bulk-apply"
          >
            一括入力する
          </button>
        </div>
        {children}
      </div>
    </section>
  )
}
