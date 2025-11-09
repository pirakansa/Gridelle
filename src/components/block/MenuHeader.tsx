// File Header: Application menu combining global controls with spreadsheet utilities.
import React from 'react'
import type { Notice } from '../../pages/top/types'
import { layoutTheme } from '../../utils/Theme'
import {
  ghostButtonClass,
  iconToggleButtonClass,
  primaryButtonClass,
  subtleButtonClass,
} from '../constants'

type Props = {
  onYamlInputClick: () => void
  notice: Notice | null
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  currentSheetName: string
  onRenameSheet: (_name: string) => void
  onAddSheet: () => void
  newColumnName: string
  onColumnNameChange: (_value: string) => void
  onAddRow: () => void
  onAddColumn: () => void
  selectionSummary: string
  onClearSelection: () => void
  hasSelection: boolean
  bulkValue: string
  onBulkValueChange: (_value: string) => void
  onBulkApply: () => void
}

const menuTabButtonClass =
  'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200'
const menuTabActiveClass = 'border-slate-900 bg-slate-900 text-white shadow'
const menuTabInactiveClass =
  'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100 focus:border-slate-300'
const sectionShellClass = 'flex flex-col gap-4 rounded-2xl bg-white/90 p-4 shadow-sm ring-1 ring-inset ring-slate-200'

// Function Header: Renders the sticky menu along with spreadsheet utility commands and collapse toggle.
export default function MenuHeader({
  onYamlInputClick,
  notice,
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
}: Props): React.ReactElement {
  const menuPanelId = React.useId()
  const [isMenuCollapsed, setMenuCollapsed] = React.useState<boolean>(false)
  const [activeMenuSection, setActiveMenuSection] = React.useState<'sheet' | 'structure' | 'selection' | 'bulk'>('sheet')
  const [sheetNameDraft, setSheetNameDraft] = React.useState<string>(currentSheetName)

  React.useEffect(() => {
    setSheetNameDraft(currentSheetName)
  }, [currentSheetName])

  const commitSheetName = React.useCallback(() => {
    const trimmed = sheetNameDraft.trim()
    if (!trimmed) {
      setSheetNameDraft(currentSheetName)
      return
    }

    if (trimmed !== currentSheetName) {
      onRenameSheet(trimmed)
    }
  }, [sheetNameDraft, currentSheetName, onRenameSheet])

  const handleSheetNameKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        commitSheetName()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        setSheetNameDraft(currentSheetName)
      }
    },
    [commitSheetName, currentSheetName],
  )

  const toggleMenu = React.useCallback(() => {
    setMenuCollapsed((prev) => !prev)
  }, [])

  const collapseLabel = isMenuCollapsed ? 'メニューを展開' : 'メニューを折りたたむ'
  const chevronPath = isMenuCollapsed ? 'M7.5 9.75L12 14.25L16.5 9.75' : 'M7.5 14.25L12 9.75L16.5 14.25'

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex w-full flex-col gap-4 px-6 py-4 md:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-slate-900">Gridelle</span>
          </div>
          <nav aria-label="Gridelleメニュー" className="flex flex-wrap items-center gap-2 md:gap-3">
            <button type="button" className={ghostButtonClass} onClick={onYamlInputClick}>
              YAML入力 / プレビュー
            </button>
            <button
              type="button"
              className={iconToggleButtonClass}
              onClick={toggleMenu}
              aria-expanded={!isMenuCollapsed}
              aria-controls={menuPanelId}
              aria-label={collapseLabel}
              title={collapseLabel}
              data-testid="menu-collapse-toggle"
            >
              <span className="sr-only">{collapseLabel}</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
              >
                <path
                  d={chevronPath}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.6"
                />
                <path
                  d="M8 7H16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeOpacity="0.6"
                  strokeWidth="1.4"
                />
                <path
                  d="M6 17H18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeOpacity="0.4"
                  strokeWidth="1.2"
                />
              </svg>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'sheet' as const, label: 'シート' },
                  { id: 'structure' as const, label: '構造' },
                  { id: 'selection' as const, label: '選択' },
                  { id: 'bulk' as const, label: '一括入力' },
                ] satisfies Array<{ id: typeof activeMenuSection; label: string }>
              ).map((tab) => {
                const isActive = activeMenuSection === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={`${menuTabButtonClass} ${isActive ? menuTabActiveClass : menuTabInactiveClass}`}
                    onClick={() => setActiveMenuSection(tab.id)}
                    aria-pressed={isActive}
                    data-testid={`menu-tab-${tab.id}`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
        {isMenuCollapsed && notice && (
          <p
            className={`text-sm ${notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}
        {!isMenuCollapsed && (
          <div
            id={menuPanelId}
            className={`${layoutTheme.ribbonShell} p-4`}
            aria-label="スプレッドシート操作メニュー"
          >
            <div className="flex flex-col gap-4">
              {notice && (
                <p
                  className={`text-sm ${notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
                  role={notice.tone === 'error' ? 'alert' : 'status'}
                  data-testid="table-notice"
                >
                  {notice.text}
                </p>
              )}
              {activeMenuSection === 'sheet' && (
                <div className={sectionShellClass}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <label htmlFor="sheet-select" className="font-medium text-slate-700">
                          シート
                        </label>
                        <select
                          id="sheet-select"
                          value={activeSheetIndex}
                          onChange={(event) => onSelectSheet(Number(event.target.value))}
                          className="rounded border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          data-testid="sheet-select"
                        >
                          {sheetNames.map((name, index) => (
                            <option key={`${name}-${index}`} value={index}>
                              {name}
                            </option>
                          ))}
                        </select>
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
                    <div className="flex w-full max-w-sm items-center gap-2 md:max-w-md">
                      <label htmlFor="sheet-name" className="text-sm text-slate-600">
                        シート名
                      </label>
                      <input
                        id="sheet-name"
                        type="text"
                        value={sheetNameDraft}
                        onChange={(event) => setSheetNameDraft(event.target.value)}
                        onBlur={commitSheetName}
                        onKeyDown={handleSheetNameKeyDown}
                        className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        data-testid="sheet-name-input"
                      />
                    </div>
                  </div>
                </div>
              )}
              {activeMenuSection === 'structure' && (
                <div className={sectionShellClass}>
                  <div className="flex flex-wrap items-center gap-3">
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
              )}
              {activeMenuSection === 'selection' && (
                <div className={sectionShellClass}>
                  <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
                    {selectionSummary}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
              )}
              {activeMenuSection === 'bulk' && (
                <div className={sectionShellClass}>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                    <input
                      type="text"
                      placeholder="選択セルへ一括入力"
                      value={bulkValue}
                      onChange={(event) => onBulkValueChange(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      data-testid="bulk-input"
                      onPointerDown={(event) => event.stopPropagation()}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={ghostButtonClass}
                        onClick={onBulkApply}
                        disabled={!hasSelection}
                        data-testid="bulk-apply"
                      >
                        一括入力する
                      </button>
                      <span className="text-xs text-slate-500">選択範囲に同じ値を設定</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
