// File Header: Page-level component orchestrating the spreadsheet playground layout.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import { redirectToLogin } from '../../utils/navigation'
import { clearAppStorage } from '../../utils/storageCleanup'
import { useSpreadsheetState } from './useSpreadsheetState'
import SpreadsheetTable from '../../components/block/SpreadsheetTable'
import MenuHeader from '../../components/block/MenuHeader'
import YamlPanel from '../../components/block/YamlPanel'
import SettingsOverlay from '../../components/block/SettingsOverlay'
import GithubIntegrationPanel, {
  type GithubIntegrationLoadedFileInfo,
  type GithubIntegrationSaveNotice,
} from '../../components/block/GithubIntegrationPanel'
import {
  clearStoredProviderToken,
  getAuthClient,
  getLoginMode,
  getStoredProviderToken,
  setLoginMode,
  type AuthUser,
  type LoginMode,
} from '../../services/auth'
import {
  GithubRepositoryAccessError,
  commitRepositoryFileUpdate,
} from '../../services/githubRepositoryAccessService'
import { createLocalizedText } from './types'

const DEFAULT_GITHUB_COMMIT_MESSAGE = 'Update'

// Function Header: Composes the top page using modular sub-components wired to state hooks.
export default function App(): React.ReactElement {
  const authClient = React.useMemo(() => getAuthClient(), [])
  const spreadsheet = useSpreadsheetState()
  const [isYamlInputOpen, setYamlInputOpen] = React.useState<boolean>(false)
  const [isGithubIntegrationOpen, setGithubIntegrationOpen] = React.useState<boolean>(false)
  const [githubRepositoryUrl, setGithubRepositoryUrl] = React.useState<string>('')
  const [githubLastLoadedFile, setGithubLastLoadedFile] = React.useState<GithubIntegrationLoadedFileInfo | null>(null)
  const [isGithubSaveInProgress, setGithubSaveInProgress] = React.useState<boolean>(false)
  const [githubSaveNotice, setGithubSaveNotice] = React.useState<GithubIntegrationSaveNotice | null>(null)
  const [loginMode, setLoginModeState] = React.useState<LoginMode | null>(() => getLoginMode())
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null)
  const [isLoggingOut, setLoggingOut] = React.useState<boolean>(false)
  const [logoutError, setLogoutError] = React.useState<string | null>(null)
  const [menuHeaderHeight, setMenuHeaderHeight] = React.useState<number>(0)
  const [windowHeight, setWindowHeight] = React.useState<number>(() => {
    if (typeof window === 'undefined') {
      return 0
    }
    return window.innerHeight
  })

  React.useEffect(() => {
    if (!loginMode) {
      const storedMode = getLoginMode()
      if (storedMode) {
        setLoginModeState(storedMode)
      }
    }
  }, [loginMode])

  React.useEffect(() => {
    const unsubscribe = authClient.subscribeAuthState({
      onAuthenticated: (session) => {
        setCurrentUser(session.user)
        setLogoutError(null)

        const mode = session.loginMode
        setLoginMode(mode)
        setLoginModeState(mode)

        if (mode === 'guest') {
          clearStoredProviderToken('github')
          return
        }

        if (!session.accessToken && !getStoredProviderToken('github')) {
          redirectToLogin()
        }
      },
      onSignedOut: () => {
        clearAppStorage()
        setLoginModeState(null)
        setCurrentUser(null)
        redirectToLogin()
      },
      onError: (authError) => {
        console.error('認証状態の監視でエラーが発生しました', authError)
        setLogoutError('認証状態の取得に失敗しました。再度ログインし直してください。')
      },
    })

    return () => {
      unsubscribe()
    }
  }, [authClient])

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

  const handleRepositoryUrlSubmit = React.useCallback((url: string) => {
    setGithubRepositoryUrl(url)
  }, [])

  const handleGithubYamlLoaded = React.useCallback(
    async ({ yaml, ...info }: GithubIntegrationLoadedFileInfo & { yaml: string }) => {
      try {
        await spreadsheet.ingestYamlContent(yaml, {
          successNotice: createLocalizedText(
            `GitHubから ${info.filePath} を読み込みました。`,
            `Loaded ${info.filePath} from GitHub.`,
          ),
          errorNoticePrefix: createLocalizedText(
            'GitHubファイルの解析に失敗しました',
            'Failed to parse the GitHub file',
          ),
        })
        setGithubLastLoadedFile(info)
        setGithubSaveNotice(null)
        closeGithubIntegration()
      } catch (error) {
        console.error('GitHubファイルの取り込みでエラーが発生しました', error)
      }
    },
    [closeGithubIntegration, setGithubLastLoadedFile, spreadsheet],
  )

  const handleGithubFileSave = React.useCallback(async () => {
    if (!githubLastLoadedFile || githubLastLoadedFile.mode !== 'repository') {
      return
    }

    setGithubSaveNotice(null)
    setGithubSaveInProgress(true)

    try {
      await commitRepositoryFileUpdate({
        repository: githubLastLoadedFile.repository,
        branch: githubLastLoadedFile.branch,
        filePath: githubLastLoadedFile.filePath,
        content: spreadsheet.tableYaml,
        commitMessage: DEFAULT_GITHUB_COMMIT_MESSAGE,
      })
      setGithubSaveNotice({
        tone: 'success',
        message: {
          ja: 'GitHubにUpdateコミットを作成しました。',
          en: 'Created an Update commit on GitHub.',
        },
      })
    } catch (error) {
      if (error instanceof GithubRepositoryAccessError) {
        setGithubSaveNotice({
          tone: 'error',
          message: {
            ja: error.jaMessage,
            en: error.enMessage,
          },
        })
      } else {
        setGithubSaveNotice({
          tone: 'error',
          message: {
            ja: 'GitHubへの保存に失敗しました。時間を置いて再度お試しください。',
            en: 'Failed to save to GitHub. Please try again later.',
          },
        })
      }
    } finally {
      setGithubSaveInProgress(false)
    }
  }, [githubLastLoadedFile, spreadsheet.tableYaml])

  const handleLogout = React.useCallback(async () => {
    if (isLoggingOut) {
      return
    }

    setLoggingOut(true)
    setLogoutError(null)

    try {
      await authClient.logout()
      clearAppStorage()
      setLoginModeState(null)
      setCurrentUser(null)
    } catch (error) {
      console.error('トップ画面のログアウト処理でエラーが発生しました', error)
      setLogoutError('ログアウトに失敗しました。時間を置いて再度お試しください。')
    } finally {
      setLoggingOut(false)
    }
  }, [authClient, isLoggingOut, setLoginModeState])

  const handleCreateNewYaml = React.useCallback(() => {
    const template = [
      '- name: "Sheet 1"',
      '  rows:',
      '    - feature: ""',
      '      owner: ""',
      '      status: ""',
      '      effort: ""',
    ].join('\n')
    spreadsheet.setYamlBuffer(`${template}\n`)
  }, [spreadsheet])

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const handleResize = () => {
      setWindowHeight(window.innerHeight)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const tableHeight = React.useMemo(() => {
    if (windowHeight === 0 || menuHeaderHeight === 0) {
      return null
    }
    return Math.max(windowHeight - menuHeaderHeight, 0)
  }, [menuHeaderHeight, windowHeight])
  return (
    <div className={layoutTheme.pageShell} data-login-mode={loginMode ?? 'none'}>
      <MenuHeader
        onHeightChange={setMenuHeaderHeight}
        onYamlInputClick={openYamlInput}
        onGithubIntegrationClick={openGithubIntegration}
        notice={spreadsheet.notice}
        sheetNames={spreadsheet.sheets.map((sheet) => sheet.name)}
        activeSheetIndex={spreadsheet.activeSheetIndex}
        onSelectSheet={spreadsheet.handleSelectSheet}
        currentSheetName={spreadsheet.currentSheetName}
        columns={spreadsheet.columns}
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
        selectionFunctionSummary={spreadsheet.selectionFunctionSummary}
        onClearSelection={spreadsheet.clearSelection}
        hasSelection={Boolean(spreadsheet.selection)}
        bulkValue={spreadsheet.bulkValue}
        onBulkValueChange={spreadsheet.setBulkValue}
        onBulkApply={spreadsheet.applyBulkInput}
        selectionTextColor={spreadsheet.selectionTextColor}
        selectionBackgroundColor={spreadsheet.selectionBackgroundColor}
        onApplySelectionTextColor={spreadsheet.applySelectionTextColor}
        onApplySelectionBackgroundColor={spreadsheet.applySelectionBackgroundColor}
        onClearSelectionStyles={spreadsheet.clearSelectionStyles}
        onApplySelectionFunction={spreadsheet.applySelectionFunction}
        canDeleteSheet={spreadsheet.canDeleteSheet}
        selectionRange={spreadsheet.selection}
        macroFunctions={spreadsheet.macroFunctions}
        loadedMacroModules={spreadsheet.loadedMacroModules}
        onLoadWasmModule={spreadsheet.loadWasmModule}
        sheetColumns={spreadsheet.sheetColumns}
        loginMode={loginMode}
        userEmail={currentUser?.email ?? null}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
        logoutError={logoutError}
      />
      <main className={layoutTheme.contentWrapper}>
        <SpreadsheetTable
          availableHeight={tableHeight ?? undefined}
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
            onCreateNew={handleCreateNewYaml}
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
          <GithubIntegrationPanel
            initialRepositoryUrl={githubRepositoryUrl}
            onRepositoryUrlSubmit={handleRepositoryUrlSubmit}
            onYamlContentLoaded={handleGithubYamlLoaded}
            lastLoadedFileInfo={githubLastLoadedFile}
            onSaveLastLoadedFile={handleGithubFileSave}
            isSavingLastLoadedFile={isGithubSaveInProgress}
            lastLoadedFileSaveNotice={githubSaveNotice}
          />
        </SettingsOverlay>
      )}
    </div>
  )
}
