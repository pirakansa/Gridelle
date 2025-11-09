// File Header: Application menu combining global controls with spreadsheet utilities.
import React from 'react'
import type { Notice } from '../../pages/top/types'
import { layoutTheme } from '../../utils/Theme'
import Button from '../atom/Button'
import MenuTabs, { type MenuSectionId } from './menu/MenuTabs'
import SheetSection from './menu/SheetSection'
import StructureSection from './menu/StructureSection'
import SelectionSection from './menu/SelectionSection'
import HelpSection from './menu/HelpSection'

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
  onDeleteSelectedRows: () => void
  selectionSummary: string
  onClearSelection: () => void
  hasSelection: boolean
  bulkValue: string
  onBulkValueChange: (_value: string) => void
  onBulkApply: () => void
}

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
  onDeleteSelectedRows,
  selectionSummary,
  onClearSelection,
  hasSelection,
  bulkValue,
  onBulkValueChange,
  onBulkApply,
}: Props): React.ReactElement {
  const menuPanelId = React.useId()
  const [isMenuCollapsed, setMenuCollapsed] = React.useState<boolean>(false)
  const [activeMenuSection, setActiveMenuSection] = React.useState<MenuSectionId>('sheet')
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

  const toggleMenu = React.useCallback(() => {
    setMenuCollapsed((prev) => !prev)
  }, [])

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex w-full flex-col gap-4 px-6 py-4 md:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-slate-900">Gridelle</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="ghost" onClick={onYamlInputClick}>
              YAML入力 / プレビュー
            </Button>
            <MenuTabs
              activeSection={activeMenuSection}
              onSelectSection={(section) => setActiveMenuSection(section)}
              onToggleCollapse={toggleMenu}
              isCollapsed={isMenuCollapsed}
            />
          </div>
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
                <SheetSection
                  sheetNames={sheetNames}
                  activeSheetIndex={activeSheetIndex}
                  onSelectSheet={onSelectSheet}
                  onAddSheet={onAddSheet}
                  sheetNameDraft={sheetNameDraft}
                  onSheetNameDraftChange={setSheetNameDraft}
                  onCommitSheetName={commitSheetName}
                  onCancelSheetRename={() => setSheetNameDraft(currentSheetName)}
                />
              )}
              {activeMenuSection === 'structure' && (
                <StructureSection
                  newColumnName={newColumnName}
                  onColumnNameChange={onColumnNameChange}
                  onAddRow={onAddRow}
                  onAddColumn={onAddColumn}
                  onDeleteSelectedRows={onDeleteSelectedRows}
                  hasSelection={hasSelection}
                />
              )}
              {activeMenuSection === 'selection' && (
                <SelectionSection
                  selectionSummary={selectionSummary}
                  hasSelection={hasSelection}
                  onClearSelection={onClearSelection}
                  bulkValue={bulkValue}
                  onBulkValueChange={onBulkValueChange}
                  onBulkApply={onBulkApply}
                />
              )}
              {activeMenuSection === 'help' && <HelpSection />}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
