// File Header: Application menu combining global controls with spreadsheet utilities.
import React from 'react'
import type { Notice } from '../../pages/top/types'
import type { LoginMode } from '../../services/auth'
import { layoutTheme } from '../../utils/Theme'
import MenuTabs, { type MenuSectionId } from './menu/MenuTabs'
import SheetSection from './menu/SheetSection'
import StructureSection from './menu/StructureSection'
import SelectionSection from './menu/SelectionSection'
import MacroSection from './menu/MacroSection'
import HelpSection from './menu/HelpSection'
import UserSection from './menu/UserSection'
import FileSection from './menu/FileSection'
import type { RegisteredFunctionMeta } from '../../pages/top/utils/cellFunctionEngine'
import type { LoadedWasmModule } from '../../services/wasmMacroService'
import type { CellFunctionConfig } from '../../services/workbookService'
import { useI18n } from '../../utils/i18n'
import LanguageToggleButton from '../atom/LanguageToggleButton'

type Props = {
  onYamlInputClick: () => void
  onGithubIntegrationClick: () => void
  notice: Notice | null
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  currentSheetName: string
  columns: string[]
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
  selectionTextColor: string
  selectionBackgroundColor: string
  onApplySelectionTextColor: (_color: string | null) => void
  onApplySelectionBackgroundColor: (_color: string | null) => void
  onClearSelectionStyles: () => void
  onApplySelectionFunction: (_config: CellFunctionConfig | null) => void
  canDeleteSheet: boolean
  macroFunctions: RegisteredFunctionMeta[]
  loadedMacroModules: LoadedWasmModule[]
  onLoadWasmModule: (_params: { moduleId: string; url: string }) => Promise<void>
  loginMode: LoginMode | null
  userEmail: string | null
  onLogout: () => Promise<void>
  isLoggingOut: boolean
  logoutError: string | null
  onHeightChange?: (_height: number) => void
}

// Function Header: Renders the sticky menu along with spreadsheet utility commands and collapse toggle.
export default function MenuHeader({
  onYamlInputClick,
  onGithubIntegrationClick,
  notice,
  sheetNames,
  activeSheetIndex,
  onSelectSheet,
  currentSheetName,
  columns,
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
  selectionTextColor,
  selectionBackgroundColor,
  onApplySelectionTextColor,
  onApplySelectionBackgroundColor,
  onClearSelectionStyles,
  onApplySelectionFunction,
  canDeleteSheet,
  macroFunctions,
  loadedMacroModules,
  onLoadWasmModule,
  loginMode,
  userEmail,
  onLogout,
  isLoggingOut,
  logoutError,
  onHeightChange,
}: Props): React.ReactElement {
  const { select } = useI18n()
  const menuPanelId = React.useId()
  const [isMenuCollapsed, setMenuCollapsed] = React.useState<boolean>(false)
  const [activeMenuSection, setActiveMenuSection] = React.useState<MenuSectionId>('sheet')
  const [sheetNameDraft, setSheetNameDraft] = React.useState<string>(currentSheetName)
  const [renamingSheetIndex, setRenamingSheetIndex] = React.useState<number | null>(null)
  const headerRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (renamingSheetIndex === null) {
      setSheetNameDraft(currentSheetName)
    }
  }, [currentSheetName, renamingSheetIndex])

  React.useEffect(() => {
    if (renamingSheetIndex !== null && renamingSheetIndex >= sheetNames.length) {
      setRenamingSheetIndex(null)
      setSheetNameDraft(currentSheetName)
    }
  }, [renamingSheetIndex, sheetNames, currentSheetName])

  const commitSheetName = React.useCallback(() => {
    const trimmed = sheetNameDraft.trim()
    if (renamingSheetIndex === null) {
      return
    }

    const originalName = sheetNames[renamingSheetIndex] ?? ''
    if (!trimmed) {
      setSheetNameDraft(originalName)
      return
    }

    if (trimmed !== originalName) {
      if (renamingSheetIndex !== activeSheetIndex) {
        onSelectSheet(renamingSheetIndex)
      }
      onRenameSheet(trimmed)
    }
    setRenamingSheetIndex(null)
  }, [sheetNameDraft, renamingSheetIndex, sheetNames, activeSheetIndex, onSelectSheet, onRenameSheet])

  const cancelSheetRename = React.useCallback(() => {
    if (renamingSheetIndex === null) {
      return
    }
    const originalName = sheetNames[renamingSheetIndex] ?? currentSheetName
    setSheetNameDraft(originalName)
    setRenamingSheetIndex(null)
  }, [renamingSheetIndex, sheetNames, currentSheetName])

  const startSheetRename = React.useCallback(
    (index: number) => {
      if (renamingSheetIndex === index) {
        return
      }
      setRenamingSheetIndex(index)
      setSheetNameDraft(sheetNames[index] ?? '')
      if (index !== activeSheetIndex) {
        onSelectSheet(index)
      }
    },
    [renamingSheetIndex, sheetNames, activeSheetIndex, onSelectSheet],
  )

  const toggleMenu = React.useCallback(() => {
    setMenuCollapsed((prev) => !prev)
  }, [])

  React.useLayoutEffect(() => {
    if (!onHeightChange) {
      return undefined
    }

    const notifyHeight = () => {
      const headerElement = headerRef.current
      if (!headerElement) {
        return
      }
      onHeightChange(headerElement.getBoundingClientRect().height)
    }

    notifyHeight()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => notifyHeight())
      if (headerRef.current) {
        observer.observe(headerRef.current)
      }
      return () => {
        observer.disconnect()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', notifyHeight)
      return () => {
        window.removeEventListener('resize', notifyHeight)
      }
    }

    return undefined
  }, [onHeightChange])

  return (
    <header
      ref={headerRef}
      className="sticky top-4 z-20 w-full rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur"
    >
      <div className="flex w-full flex-col gap-4 px-6 py-4 md:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-slate-900">Gridelle</span>
            <LanguageToggleButton />
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
            {select(notice.text.ja, notice.text.en)}
          </p>
        )}
        {!isMenuCollapsed && (
          <div
            id={menuPanelId}
            className={`${layoutTheme.ribbonShell} p-4`}
            aria-label={select('スプレッドシート操作メニュー', 'Spreadsheet control menu')}
          >
            <div className="flex flex-col gap-4">
              {notice && (
                <p
                  className={`text-sm ${notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'}`}
                  role={notice.tone === 'error' ? 'alert' : 'status'}
                  data-testid="table-notice"
                >
                  {select(notice.text.ja, notice.text.en)}
                </p>
              )}
              {activeMenuSection === 'file' && (
                <FileSection
                  onYamlInputClick={onYamlInputClick}
                  loginMode={loginMode}
                  onGithubActionsClick={onGithubIntegrationClick}
                />
              )}
              {activeMenuSection === 'sheet' && (
                <SheetSection
                  sheetNames={sheetNames}
                  activeSheetIndex={activeSheetIndex}
                  onSelectSheet={onSelectSheet}
                  onAddSheet={onAddSheet}
                  onDeleteSheet={onDeleteSheet}
                  renamingSheetIndex={renamingSheetIndex}
                  onStartSheetRename={startSheetRename}
                  sheetNameDraft={sheetNameDraft}
                  onSheetNameDraftChange={setSheetNameDraft}
                  onCommitSheetName={commitSheetName}
                  onCancelSheetRename={cancelSheetRename}
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
                  selectionTextColor={selectionTextColor}
                  selectionBackgroundColor={selectionBackgroundColor}
                  onApplyTextColor={onApplySelectionTextColor}
                  onApplyBackgroundColor={onApplySelectionBackgroundColor}
                  onClearSelectionStyles={onClearSelectionStyles}
                />
              )}
              {activeMenuSection === 'macro' && (
                <MacroSection
                  columns={columns}
                  hasSelection={hasSelection}
                  availableFunctions={macroFunctions}
                  loadedModules={loadedMacroModules}
                  onLoadModule={onLoadWasmModule}
                  onApplyFunction={onApplySelectionFunction}
                />
              )}
              {activeMenuSection === 'user' && (
                <UserSection
                  loginMode={loginMode}
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
