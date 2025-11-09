// File Header: Application menu combining global controls with spreadsheet utilities.
import React from 'react'
import type { Notice } from '../../pages/top/types'
import type { LoginMode } from '../../services/authService'
import { layoutTheme } from '../../utils/Theme'
import MenuTabs, { type MenuSectionId } from './menu/MenuTabs'
import SheetSection from './menu/SheetSection'
import StructureSection from './menu/StructureSection'
import SelectionSection from './menu/SelectionSection'
import HelpSection from './menu/HelpSection'
import UserSection from './menu/UserSection'
import FileSection from './menu/FileSection'

type Props = {
  onYamlInputClick: () => void
  notice: Notice | null
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  currentSheetName: string
  onRenameSheet: (_name: string) => void
  onAddSheet: () => void
  onDeleteSheet: () => void
  onAddRow: () => void
  onInsertRowBelowSelection: () => void
  onMoveSelectedRowsUp: () => void
  onMoveSelectedRowsDown: () => void
  onAddColumn: () => void
  onInsertColumnRightOfSelection: () => void
  onDeleteSelectedColumns: () => void
  onDeleteSelectedRows: () => void
  onMoveSelectedColumnsLeft: () => void
  onMoveSelectedColumnsRight: () => void
  canMoveSelectedColumnsLeft: boolean
  canMoveSelectedColumnsRight: boolean
  canMoveSelectedRowsUp: boolean
  canMoveSelectedRowsDown: boolean
  selectionSummary: string
  onClearSelection: () => void
  hasSelection: boolean
  bulkValue: string
  onBulkValueChange: (_value: string) => void
  onBulkApply: () => void
  canDeleteSheet: boolean
  loginMode: LoginMode | null
  userDisplayName: string | null
  userEmail: string | null
  onLogout: () => Promise<void>
  isLoggingOut: boolean
  logoutError: string | null
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
  onDeleteSheet,
  onAddRow,
  onInsertRowBelowSelection,
  onMoveSelectedRowsUp,
  onMoveSelectedRowsDown,
  onAddColumn,
  onInsertColumnRightOfSelection,
  onDeleteSelectedColumns,
  onDeleteSelectedRows,
  onMoveSelectedColumnsLeft,
  onMoveSelectedColumnsRight,
  canMoveSelectedColumnsLeft,
  canMoveSelectedColumnsRight,
  canMoveSelectedRowsUp,
  canMoveSelectedRowsDown,
  selectionSummary,
  onClearSelection,
  hasSelection,
  bulkValue,
  onBulkValueChange,
  onBulkApply,
  canDeleteSheet,
  loginMode,
  userDisplayName,
  userEmail,
  onLogout,
  isLoggingOut,
  logoutError,
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
              {activeMenuSection === 'file' && <FileSection onYamlInputClick={onYamlInputClick} />}
              {activeMenuSection === 'sheet' && (
                <SheetSection
                  sheetNames={sheetNames}
                  activeSheetIndex={activeSheetIndex}
                  onSelectSheet={onSelectSheet}
                  onAddSheet={onAddSheet}
                  onDeleteSheet={onDeleteSheet}
                  sheetNameDraft={sheetNameDraft}
                  onSheetNameDraftChange={setSheetNameDraft}
                  onCommitSheetName={commitSheetName}
                  onCancelSheetRename={() => setSheetNameDraft(currentSheetName)}
                  canDeleteSheet={canDeleteSheet}
                />
              )}
              {activeMenuSection === 'structure' && (
                <StructureSection
                  onAddRow={onAddRow}
                  onInsertRowBelowSelection={onInsertRowBelowSelection}
                  onMoveSelectedRowsUp={onMoveSelectedRowsUp}
                  onMoveSelectedRowsDown={onMoveSelectedRowsDown}
                  onAddColumn={onAddColumn}
                  onInsertColumnRightOfSelection={onInsertColumnRightOfSelection}
                  onDeleteSelectedColumns={onDeleteSelectedColumns}
                  onDeleteSelectedRows={onDeleteSelectedRows}
                  onMoveSelectedColumnsLeft={onMoveSelectedColumnsLeft}
                  onMoveSelectedColumnsRight={onMoveSelectedColumnsRight}
                  canMoveSelectedColumnsLeft={canMoveSelectedColumnsLeft}
                  canMoveSelectedColumnsRight={canMoveSelectedColumnsRight}
                  canMoveSelectedRowsUp={canMoveSelectedRowsUp}
                  canMoveSelectedRowsDown={canMoveSelectedRowsDown}
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
              {activeMenuSection === 'user' && (
                <UserSection
                  loginMode={loginMode}
                  userDisplayName={userDisplayName}
                  userEmail={userEmail}
                  onLogout={onLogout}
                  isLoggingOut={isLoggingOut}
                  logoutError={logoutError}
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
