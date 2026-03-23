// File Header: Application menu combining global controls with spreadsheet utilities.
import React from 'react'
import type { Notice, SelectionRange } from '../../pages/top/types'
import type { LoginMode } from '../../services/auth'
import { layoutTheme } from '../../utils/Theme'
import MenuTabs, { type MenuSectionId } from './menu/MenuTabs'
import StructureSection from './menu/StructureSection'
import SelectionSection from './menu/SelectionSection'
import MacroSection from './menu/MacroSection'
import WasmSection from './menu/WasmSection'
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
  currentSheetName: string
  columns: string[]
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
  selectionFunctionSummary: string
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
  onCopySelectionFunction: () => void
  onPasteSelectionFunction: () => void
  selectionRange: SelectionRange | null
  macroFunctions: RegisteredFunctionMeta[]
  loadedMacroModules: LoadedWasmModule[]
  onLoadWasmModule: (_params: { moduleId: string; url: string }) => Promise<void>
  sheetColumns: Record<string, string[]>
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
  currentSheetName,
  columns,
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
  selectionFunctionSummary,
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
  onCopySelectionFunction,
  onPasteSelectionFunction,
  selectionRange,
  macroFunctions,
  loadedMacroModules,
  onLoadWasmModule,
  sheetColumns,
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
  const [activeMenuSection, setActiveMenuSection] = React.useState<MenuSectionId>('file')
  const headerRef = React.useRef<HTMLElement | null>(null)

  const toggleMenu = React.useCallback(() => {
    setMenuCollapsed((prev) => !prev)
  }, [])
  const workbookTitle = select('Gridelle', 'Gridelle')

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
      className="sticky top-0 z-20 w-full overflow-hidden rounded-b-xl border-x border-b border-emerald-900/10 bg-white shadow-lg"
    >
      <div className="border-b border-emerald-700 bg-emerald-700 px-4 py-2 text-white md:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">{workbookTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggleButton className="border-white/30 bg-white/10 text-white hover:bg-white/20 focus-visible:outline-white" />
          </div>
        </div>
      </div>
      <div className="border-b border-slate-200 bg-[#f3f6f3] px-4 py-2 md:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <MenuTabs
              activeSection={activeMenuSection}
              onSelectSection={(section) => setActiveMenuSection(section)}
              onToggleCollapse={toggleMenu}
              isCollapsed={isMenuCollapsed}
            />
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3 px-4 py-3 md:px-6">
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
            className={`${layoutTheme.ribbonShell} border-slate-300 bg-[#fbfcfb] p-4 shadow-none`}
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
                  selectionFunctionSummary={selectionFunctionSummary}
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
                  onCopySelectionFunction={onCopySelectionFunction}
                  onPasteSelectionFunction={onPasteSelectionFunction}
                />
              )}
              {activeMenuSection === 'macro' && (
                <MacroSection
                  columns={columns}
                  sheetNames={sheetNames}
                  currentSheetName={currentSheetName}
                  sheetColumns={sheetColumns}
                  selectionRange={selectionRange}
                  hasSelection={hasSelection}
                  availableFunctions={macroFunctions}
                  onApplyFunction={onApplySelectionFunction}
                />
              )}
              {activeMenuSection === 'wasm' && (
                <WasmSection loadedModules={loadedMacroModules} onLoadModule={onLoadWasmModule} />
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
