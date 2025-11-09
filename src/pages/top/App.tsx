// File Header: Page-level component orchestrating the spreadsheet playground layout.
import React from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { layoutTheme } from '../../utils/Theme'
import { redirectToLogin } from '../../utils/navigation'
import { clearAppStorage } from '../../utils/storageCleanup'
import { useSpreadsheetState } from './useSpreadsheetState'
import SpreadsheetTable from '../../components/block/SpreadsheetTable'
import MenuHeader from '../../components/block/MenuHeader'
import YamlPanel from '../../components/block/YamlPanel'
import SettingsOverlay from '../../components/block/SettingsOverlay'
import GithubIntegrationPanel from '../../components/block/GithubIntegrationPanel'
import { clearStoredGithubToken, deriveLoginMode, getFirebaseAuth, getLoginMode, getStoredGithubToken, setLoginMode } from '../../services/authService'
import type { LoginMode } from '../../services/authService'

// Function Header: Composes the top page using modular sub-components wired to state hooks.
export default function App(): React.ReactElement {
  const auth = React.useMemo(() => getFirebaseAuth(), [])
  const spreadsheet = useSpreadsheetState()
  const [isYamlInputOpen, setYamlInputOpen] = React.useState<boolean>(false)
  const [isGithubIntegrationOpen, setGithubIntegrationOpen] = React.useState<boolean>(false)
  const [loginMode, setLoginModeState] = React.useState<LoginMode | null>(() => getLoginMode())
  const [currentUser, setCurrentUser] = React.useState<User | null>(() => auth.currentUser ?? null)
  const [isLoggingOut, setLoggingOut] = React.useState<boolean>(false)
  const [logoutError, setLogoutError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setCurrentUser(nextUser)
        setLogoutError(null)

        if (!nextUser) {
          clearAppStorage()
          setLoginModeState(null)
          redirectToLogin()
          return
        }

        const mode = deriveLoginMode(nextUser) as LoginMode
        setLoginMode(mode)
        setLoginModeState(mode)

        if (mode === 'guest') {
          clearStoredGithubToken()
          return
        }

        if (!getStoredGithubToken()) {
          redirectToLogin()
        }
      },
      (authError) => {
        console.error('認証状態の監視でエラーが発生しました', authError)
        setLogoutError('認証状態の取得に失敗しました。再度ログインし直してください。')
      },
    )

    return () => {
      unsubscribe()
    }
  }, [auth])

  const openYamlInput = React.useCallback(() => {
    setYamlInputOpen(true)
  }, [])

  const closePanel = React.useCallback(() => {
    setYamlInputOpen(false)
  }, [])

  const openGithubIntegration = React.useCallback(() => {
    setGithubIntegrationOpen(true)
  }, [])

  const closeGithubIntegration = React.useCallback(() => {
    setGithubIntegrationOpen(false)
  }, [])

  const handleLogout = React.useCallback(async () => {
    if (isLoggingOut) {
      return
    }

    setLoggingOut(true)
    setLogoutError(null)

    try {
      await signOut(auth)
      clearAppStorage()
      setLoginModeState(null)
      setCurrentUser(null)
    } catch (error) {
      console.error('トップ画面のログアウト処理でエラーが発生しました', error)
      setLogoutError('ログアウトに失敗しました。時間を置いて再度お試しください。')
    } finally {
      setLoggingOut(false)
    }
  }, [auth, isLoggingOut, setLoginModeState])

  return (
    <div className={layoutTheme.pageShell} data-login-mode={loginMode ?? 'none'}>
      <MenuHeader
        onYamlInputClick={openYamlInput}
        onGithubIntegrationClick={openGithubIntegration}
        notice={spreadsheet.notice}
        sheetNames={spreadsheet.sheets.map((sheet) => sheet.name)}
        activeSheetIndex={spreadsheet.activeSheetIndex}
        onSelectSheet={spreadsheet.handleSelectSheet}
        currentSheetName={spreadsheet.currentSheetName}
    onRenameSheet={spreadsheet.handleRenameSheet}
    onAddSheet={spreadsheet.handleAddSheet}
    onDeleteSheet={spreadsheet.handleDeleteSheet}
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
        canDeleteSheet={spreadsheet.canDeleteSheet}
        loginMode={loginMode}
        userEmail={currentUser?.email ?? null}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
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
      {isGithubIntegrationOpen && (
        <SettingsOverlay
          title="GitHubファイル連携"
          description="GitHub上のYAMLを読み込む機能のプレビューです。"
          onClose={closeGithubIntegration}
          panelId="github-file-actions"
        >
          <GithubIntegrationPanel />
        </SettingsOverlay>
      )}
    </div>
  )
}
