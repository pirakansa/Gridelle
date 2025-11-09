// File Header: Page-level component orchestrating the spreadsheet playground layout.
import React from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { layoutTheme } from '../../utils/Theme'
import { redirectToLogin } from '../../utils/navigation'
import { useSpreadsheetState } from './useSpreadsheetState'
import SpreadsheetTable from '../../components/block/SpreadsheetTable'
import MenuHeader from '../../components/block/MenuHeader'
import YamlPanel from '../../components/block/YamlPanel'
import SettingsOverlay from '../../components/block/SettingsOverlay'
import {
  clearStoredGithubToken,
  deriveLoginMode,
  getFirebaseAuth,
  getLoginMode,
  getStoredGithubToken,
  setLoginMode,
} from '../../services/authService'
import type { LoginMode } from '../../services/authService'

// Function Header: Composes the top page using modular sub-components wired to state hooks.
export default function App(): React.ReactElement {
  const spreadsheet = useSpreadsheetState()
  const [isYamlInputOpen, setYamlInputOpen] = React.useState<boolean>(false)
  const [loginMode, setLoginModeState] = React.useState<LoginMode | null>(() => getLoginMode())

  React.useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        clearStoredGithubToken()
        setLoginMode(null)
        setLoginModeState(null)
        redirectToLogin()
        return
      }

      const mode = deriveLoginMode(currentUser) as LoginMode
      setLoginMode(mode)
      setLoginModeState(mode)

      if (mode === 'guest') {
        clearStoredGithubToken()
        return
      }

      if (!getStoredGithubToken()) {
        redirectToLogin()
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const openYamlInput = React.useCallback(() => {
    setYamlInputOpen(true)
  }, [])

  const closePanel = React.useCallback(() => {
    setYamlInputOpen(false)
  }, [])

  return (
    <div className={layoutTheme.pageShell} data-login-mode={loginMode ?? 'none'}>
      <MenuHeader
        onYamlInputClick={openYamlInput}
        notice={spreadsheet.notice}
        sheetNames={spreadsheet.sheets.map((sheet) => sheet.name)}
        activeSheetIndex={spreadsheet.activeSheetIndex}
        onSelectSheet={spreadsheet.handleSelectSheet}
        currentSheetName={spreadsheet.currentSheetName}
        onRenameSheet={spreadsheet.handleRenameSheet}
        onAddSheet={spreadsheet.handleAddSheet}
        onAddRow={spreadsheet.handleAddRow}
        onInsertRowBelowSelection={spreadsheet.handleInsertRowBelowSelection}
        onMoveSelectedRowsUp={spreadsheet.handleMoveSelectedRowsUp}
        onMoveSelectedRowsDown={spreadsheet.handleMoveSelectedRowsDown}
        onAddColumn={spreadsheet.handleAddColumn}
        onInsertColumnRightOfSelection={spreadsheet.handleInsertColumnRightOfSelection}
        onDeleteSelectedColumns={spreadsheet.handleDeleteSelectedColumns}
        onMoveSelectedColumnsLeft={spreadsheet.handleMoveSelectedColumnsLeft}
        onMoveSelectedColumnsRight={spreadsheet.handleMoveSelectedColumnsRight}
        canMoveSelectedColumnsLeft={spreadsheet.canMoveSelectedColumnsLeft}
        canMoveSelectedColumnsRight={spreadsheet.canMoveSelectedColumnsRight}
        canMoveSelectedRowsUp={spreadsheet.canMoveSelectedRowsUp}
        canMoveSelectedRowsDown={spreadsheet.canMoveSelectedRowsDown}
        onDeleteSelectedRows={spreadsheet.handleDeleteSelectedRows}
        selectionSummary={spreadsheet.selectionSummary}
        onClearSelection={spreadsheet.clearSelection}
        hasSelection={Boolean(spreadsheet.selection)}
        bulkValue={spreadsheet.bulkValue}
        onBulkValueChange={spreadsheet.setBulkValue}
        onBulkApply={spreadsheet.applyBulkInput}
      />
      <main className={layoutTheme.contentWrapper}>
        <SpreadsheetTable
          rows={spreadsheet.rows}
          columns={spreadsheet.columns}
          activeRange={spreadsheet.activeRange}
          selection={spreadsheet.selection}
          fillPreview={spreadsheet.fillPreview}
          isFillDragActive={spreadsheet.isFillDragActive}
          editingCell={spreadsheet.editingCell}
          onRowNumberClick={spreadsheet.handleRowNumberClick}
          onColumnHeaderClick={spreadsheet.handleColumnHeaderClick}
          onPointerDown={spreadsheet.handleCellPointerDown}
          onPointerEnter={spreadsheet.handleCellPointerEnter}
          onCellClick={spreadsheet.handleCellClick}
          onCellDoubleClick={spreadsheet.handleCellDoubleClick}
          onTableKeyDown={spreadsheet.handleTableKeyDown}
          onStartFillDrag={spreadsheet.startFillDrag}
          onCellChange={spreadsheet.handleCellChange}
          onPaste={spreadsheet.handlePaste}
          onMoveColumn={spreadsheet.moveColumn}
          onCellEditorBlur={spreadsheet.handleCellEditorBlur}
          onCellEditorKeyDown={spreadsheet.handleCellEditorKeyDown}
        />
      </main>
      {isYamlInputOpen && (
        <SettingsOverlay
          title="YAML入力 / プレビュー"
          description="YAMLを編集してテーブルへ反映できます。"
          onClose={closePanel}
          panelId="yaml-input"
        >
          <YamlPanel
            yamlBuffer={spreadsheet.yamlBuffer}
            notice={spreadsheet.notice}
            onChange={spreadsheet.setYamlBuffer}
            onApply={spreadsheet.applyYamlBuffer}
            onFileUpload={spreadsheet.handleFileUpload}
            onDownload={spreadsheet.handleDownloadYaml}
            onCopy={spreadsheet.handleCopyYaml}
          />
        </SettingsOverlay>
      )}
    </div>
  )
}
