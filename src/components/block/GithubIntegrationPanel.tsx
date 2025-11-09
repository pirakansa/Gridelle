// File Header: GitHub integration panel offering blob, repository, and pull request workflows.
import React from 'react'
import Button from '../atom/Button'
import TextInput from '../atom/TextInput'
import SelectField from '../atom/SelectField'
import {
  GithubRepositoryAccessError,
  type CollaboratorVerificationResult,
  type GithubRepositoryCoordinates,
  type RepositoryBranch,
  type RepositoryTreeEntry,
  verifyRepositoryCollaborator,
  listRepositoryBranches,
  fetchRepositoryTree,
  fetchRepositoryFileContent,
  fetchFileFromBlobUrl,
} from '../../services/githubRepositoryAccessService'

type IntegrationMode = 'blob-url' | 'repository' | 'pull-request'

const integrationModeMeta: Array<{
  id: IntegrationMode
  label: string
  helper: string
}> = [
  {
    id: 'blob-url',
    label: 'Blob URL',
    helper: '個別ファイルの blob URL を入力して即座に読み込みます。',
  },
  {
    id: 'repository',
    label: 'リポジトリ',
    helper: 'リポジトリとブランチを指定してファイル一覧から選択します。',
  },
  {
    id: 'pull-request',
    label: 'Pull Request',
    helper: 'PR で更新されたファイルを確認する機能を準備中です。',
  },
]

type GithubIntegrationPanelProps = {
  initialRepositoryUrl?: string
  onRepositoryUrlSubmit?: (_repositoryUrl: string) => void
  onRepositoryAccessConfirmed?: (_result: CollaboratorVerificationResult) => void
  onBranchSelected?: (_branchName: string) => void
  onFileSelected?: (_filePath: string) => void
  onYamlContentLoaded?: (_payload: {
    yaml: string
    repository: GithubRepositoryCoordinates
    branch: string
    filePath: string
  }) => void
}

const YAML_EXTENSION_PATTERN = /\.ya?ml$/i

// Function Header: Renders GitHub integration workflows with mode switching between blob, repository, and PR patterns.
export default function GithubIntegrationPanel({
  initialRepositoryUrl = '',
  onRepositoryUrlSubmit,
  onRepositoryAccessConfirmed,
  onBranchSelected,
  onFileSelected,
  onYamlContentLoaded,
}: GithubIntegrationPanelProps): React.ReactElement {
  const [integrationMode, setIntegrationMode] = React.useState<IntegrationMode>('repository')

  const [blobUrl, setBlobUrl] = React.useState<string>('')
  const [isBlobLoading, setIsBlobLoading] = React.useState<boolean>(false)
  const [blobErrorMessage, setBlobErrorMessage] = React.useState<string | null>(null)
  const [blobSuccessMessage, setBlobSuccessMessage] = React.useState<string | null>(null)

  const [repositoryUrl, setRepositoryUrl] = React.useState<string>(initialRepositoryUrl)
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [repositoryCoordinates, setRepositoryCoordinates] = React.useState<GithubRepositoryCoordinates | null>(null)
  const [branches, setBranches] = React.useState<RepositoryBranch[]>([])
  const [isBranchLoading, setIsBranchLoading] = React.useState<boolean>(false)
  const [branchErrorMessage, setBranchErrorMessage] = React.useState<string | null>(null)
  const [selectedBranch, setSelectedBranch] = React.useState<string>('')
  const [treeEntries, setTreeEntries] = React.useState<RepositoryTreeEntry[]>([])
  const [isTreeLoading, setIsTreeLoading] = React.useState<boolean>(false)
  const [treeErrorMessage, setTreeErrorMessage] = React.useState<string | null>(null)
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null)
  const [isFileLoading, setIsFileLoading] = React.useState<boolean>(false)
  const [fileErrorMessage, setFileErrorMessage] = React.useState<string | null>(null)
  const [fileSuccessMessage, setFileSuccessMessage] = React.useState<string | null>(null)

  const [pullRequestUrl, setPullRequestUrl] = React.useState<string>('')

  React.useEffect(() => {
    setRepositoryUrl(initialRepositoryUrl)
  }, [initialRepositoryUrl])

  const resetBlobState = React.useCallback(() => {
    setBlobUrl('')
    setBlobErrorMessage(null)
    setBlobSuccessMessage(null)
    setIsBlobLoading(false)
  }, [])

  const resetRepositoryState = React.useCallback(() => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setRepositoryCoordinates(null)
    setBranches([])
    setBranchErrorMessage(null)
    setSelectedBranch('')
    setTreeEntries([])
    setTreeErrorMessage(null)
    setSelectedFilePath(null)
    setIsTreeLoading(false)
    setIsFileLoading(false)
    setFileErrorMessage(null)
    setFileSuccessMessage(null)
  }, [])

  const resetPullRequestState = React.useCallback(() => {
    setPullRequestUrl('')
  }, [])

  const handleChangeMode = React.useCallback(
    (nextMode: IntegrationMode) => {
      setIntegrationMode(nextMode)

      switch (nextMode) {
        case 'blob-url':
          resetBlobState()
          break
        case 'repository':
          resetRepositoryState()
          if (initialRepositoryUrl) {
            setRepositoryUrl(initialRepositoryUrl)
          }
          break
        case 'pull-request':
          resetPullRequestState()
          break
        default:
          break
      }
    },
    [initialRepositoryUrl, resetBlobState, resetPullRequestState, resetRepositoryState],
  )

  const loadBranches = React.useCallback(async (coordinates: GithubRepositoryCoordinates) => {
    setIsBranchLoading(true)
    setBranchErrorMessage(null)

    try {
      const fetchedBranches = await listRepositoryBranches(coordinates)
      setBranches(fetchedBranches)

      if (fetchedBranches.length > 0) {
        setSelectedBranch((current) => {
          if (current && fetchedBranches.some((branch) => branch.name === current)) {
            return current
          }
          return fetchedBranches[0].name
        })
      } else {
        setSelectedBranch('')
      }
    } catch (error) {
      if (error instanceof GithubRepositoryAccessError) {
        setBranchErrorMessage(error.message)
      } else {
        setBranchErrorMessage('ブランチ一覧の取得に失敗しました。時間を置いて再度お試しください。')
      }
    } finally {
      setIsBranchLoading(false)
    }
  }, [])

  const loadRepositoryTree = React.useCallback(
    async (coordinates: GithubRepositoryCoordinates, branchName: string) => {
      if (!branchName) {
        setTreeEntries([])
        return
      }

      setIsTreeLoading(true)
      setTreeErrorMessage(null)
      setSelectedFilePath(null)
      setFileErrorMessage(null)
      setFileSuccessMessage(null)
      setIsFileLoading(false)

      try {
        const fetchedTree = await fetchRepositoryTree(coordinates, branchName)
        setTreeEntries(fetchedTree)
      } catch (error) {
        if (error instanceof GithubRepositoryAccessError) {
          setTreeErrorMessage(error.message)
        } else {
          setTreeErrorMessage('ファイルツリーの取得に失敗しました。時間を置いて再度お試しください。')
        }
        setTreeEntries([])
      } finally {
        setIsTreeLoading(false)
      }
    },
    [],
  )

  const handleRepositorySubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedUrl = repositoryUrl.trim()
      if (!trimmedUrl) {
        return
      }

      setIsVerifying(true)
      setErrorMessage(null)
      setSuccessMessage(null)
      resetRepositoryState()

      try {
        const result = await verifyRepositoryCollaborator(trimmedUrl)
        const canonicalUrl = `https://github.com/${result.repository.owner}/${result.repository.repository}`
        setRepositoryUrl(canonicalUrl)
        setSuccessMessage(
          `${result.username} が ${result.repository.owner}/${result.repository.repository} のコラボレーターとして確認できました。`,
        )
        onRepositoryUrlSubmit?.(canonicalUrl)
        onRepositoryAccessConfirmed?.(result)
        setRepositoryCoordinates(result.repository)
        void loadBranches(result.repository)
      } catch (error) {
        if (error instanceof GithubRepositoryAccessError) {
          setErrorMessage(error.message)
        } else {
          setErrorMessage('リポジトリの権限確認に失敗しました。時間を置いて再度お試しください。')
        }
      } finally {
        setIsVerifying(false)
      }
    },
    [
      loadBranches,
      onRepositoryAccessConfirmed,
      onRepositoryUrlSubmit,
      repositoryUrl,
      resetRepositoryState,
    ],
  )

  React.useEffect(() => {
    if (!repositoryCoordinates || !selectedBranch) {
      return
    }

    void loadRepositoryTree(repositoryCoordinates, selectedBranch)
    onBranchSelected?.(selectedBranch)
  }, [loadRepositoryTree, onBranchSelected, repositoryCoordinates, selectedBranch])

  const handleBranchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedBranch(event.target.value)
      setSelectedFilePath(null)
      setFileErrorMessage(null)
      setFileSuccessMessage(null)
    },
    [],
  )

  const handleRepositoryFileSelect = React.useCallback(
    (filePath: string) => {
      setSelectedFilePath(filePath)
      setFileErrorMessage(null)
      setFileSuccessMessage(null)

      if (!repositoryCoordinates || !selectedBranch) {
        return
      }

      if (!YAML_EXTENSION_PATTERN.test(filePath)) {
        setFileErrorMessage('YAMLファイル（.yml / .yaml）のみ選択できます。')
        return
      }

      setIsFileLoading(true)

      fetchRepositoryFileContent(repositoryCoordinates, selectedBranch, filePath)
        .then((content) => {
          setFileSuccessMessage(`${filePath} を読み込みました。`)
          onFileSelected?.(filePath)
          onYamlContentLoaded?.({
            yaml: content,
            repository: repositoryCoordinates,
            branch: selectedBranch,
            filePath,
          })
        })
        .catch((error) => {
          if (error instanceof GithubRepositoryAccessError) {
            setFileErrorMessage(error.message)
          } else {
            setFileErrorMessage('GitHubファイルの取得に失敗しました。時間を置いて再度お試しください。')
          }
        })
        .finally(() => {
          setIsFileLoading(false)
        })
    },
    [onFileSelected, onYamlContentLoaded, repositoryCoordinates, selectedBranch],
  )

  const repositoryFiles = React.useMemo(
    () => treeEntries.filter((entry) => entry.type === 'blob'),
    [treeEntries],
  )

  const handleBlobSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedUrl = blobUrl.trim()
      if (!trimmedUrl) {
        return
      }

      setIsBlobLoading(true)
      setBlobErrorMessage(null)
      setBlobSuccessMessage(null)

      try {
        const result = await fetchFileFromBlobUrl(trimmedUrl)
        setBlobSuccessMessage(`${result.coordinates.filePath} を読み込みました。`)
        onFileSelected?.(result.coordinates.filePath)
        onYamlContentLoaded?.({
          yaml: result.content,
          repository: {
            owner: result.coordinates.owner,
            repository: result.coordinates.repository,
          },
          branch: result.coordinates.ref,
          filePath: result.coordinates.filePath,
        })
      } catch (error) {
        if (error instanceof GithubRepositoryAccessError) {
          setBlobErrorMessage(error.message)
        } else {
          setBlobErrorMessage('Blob URL からファイルを取得できませんでした。時間を置いて再度お試しください。')
        }
      } finally {
        setIsBlobLoading(false)
      }
    },
    [blobUrl, onFileSelected, onYamlContentLoaded],
  )

  return (
    <div className="flex flex-col gap-6 text-sm text-slate-700" data-testid="github-integration-panel">
      <section className="flex flex-col gap-3">
        <span className="text-sm font-medium text-slate-800">読み込みパターンを選択</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="GitHub連携パターン選択">
          {integrationModeMeta.map((mode) => {
            const isActive = integrationMode === mode.id
            return (
              <Button
                key={mode.id}
                type="button"
                variant={isActive ? 'primary' : 'ghost'}
                onClick={() => handleChangeMode(mode.id)}
                aria-pressed={isActive}
                data-testid={`github-integration-mode-${mode.id}`}
              >
                {mode.label}
              </Button>
            )
          })}
        </div>
        <p className="text-xs text-slate-500">
          {integrationModeMeta.find((meta) => meta.id === integrationMode)?.helper ?? ''}
        </p>
      </section>

      {integrationMode === 'blob-url' && (
        <section className="flex flex-col gap-3">
          <form className="flex flex-col gap-3" onSubmit={handleBlobSubmit} data-testid="blob-url-form">
            <label htmlFor="blob-url" className="text-sm font-medium text-slate-800">
              Blob URL を入力
            </label>
            <TextInput
              id="blob-url"
              name="blobUrl"
              value={blobUrl}
              onChange={(event) => setBlobUrl(event.target.value)}
              placeholder="https://github.com/owner/repository/blob/main/path/to/file.yaml"
              fullWidth
              autoComplete="off"
              spellCheck={false}
              data-testid="blob-url-input"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={!blobUrl.trim() || isBlobLoading}>
                {isBlobLoading ? '読み込み中…' : 'Blobを読み込む'}
              </Button>
            </div>
          </form>
          {blobErrorMessage && (
            <p className="text-sm text-red-600" role="alert" data-testid="blob-url-error">
              {blobErrorMessage}
            </p>
          )}
          {blobSuccessMessage && (
            <p className="text-sm text-emerald-600" role="status" data-testid="blob-url-success">
              {blobSuccessMessage}
            </p>
          )}
        </section>
      )}

      {integrationMode === 'repository' && (
        <>
          <section className="flex flex-col gap-2">
            <p>
              GitHub連携機能の準備中です。まずは対象となるリポジトリのURLを入力して、使用するブランチやファイルの絞り込みを行えるようにしていきます。
            </p>
            <ul className="list-disc space-y-1 pl-5 text-slate-600">
              <li>GitHubのファイルURL（blob）からYAMLを直接読み込み</li>
              <li>リポジトリとブランチを指定してファイル一覧から読み込み</li>
              <li>編集したYAMLをリポジトリへコミット</li>
            </ul>
          </section>

          <form className="flex flex-col gap-3" onSubmit={handleRepositorySubmit} data-testid="repository-url-form">
            <label htmlFor="repository-url" className="text-sm font-medium text-slate-800">
              対象リポジトリURL
            </label>
            <TextInput
              id="repository-url"
              name="repositoryUrl"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              placeholder="https://github.com/owner/repository"
              fullWidth
              autoComplete="off"
              spellCheck={false}
              data-testid="repository-url-input"
            />
            <p className="text-xs text-slate-500">
              公開・非公開を問わずGitHubのリポジトリURLを入力してください。後続のステップでブランチやファイルを選択できます。
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={!repositoryUrl.trim() || isVerifying}>
                {isVerifying ? '確認中…' : 'URLを確定'}
              </Button>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600" role="alert" data-testid="repository-url-error">
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-emerald-600" role="status" data-testid="repository-url-success">
                {successMessage}
              </p>
            )}
          </form>

          {repositoryCoordinates && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="repository-branch" className="text-sm font-medium text-slate-800">
                  ブランチを選択
                </label>
                <SelectField
                  id="repository-branch"
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  disabled={isBranchLoading || branches.length === 0}
                  fullWidth
                  data-testid="repository-branch-select"
                >
                  {branches.length === 0 && <option value="">ブランチが取得できませんでした</option>}
                  {branches.map((branch) => (
                    <option key={branch.name} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </SelectField>
                <p className="text-xs text-slate-500">
                  対象のブランチを選択すると、その内容からYAMLファイルなどを選べます。
                </p>
                {isBranchLoading && (
                  <p className="text-xs text-slate-500" data-testid="repository-branch-loading">
                    ブランチ一覧を取得中です...
                  </p>
                )}
                {branchErrorMessage && (
                  <p className="text-sm text-red-600" role="alert" data-testid="repository-branch-error">
                    {branchErrorMessage}
                  </p>
                )}
              </div>

              {selectedBranch && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-800">ファイルを選択</span>
                  <div
                    className="max-h-72 overflow-y-auto rounded border border-slate-200 bg-white"
                    data-testid="repository-file-tree"
                  >
                    {isTreeLoading && (
                      <p className="px-3 py-2 text-xs text-slate-500">ファイルツリーを読み込み中です...</p>
                    )}
                    {!isTreeLoading && repositoryFiles.length === 0 && !treeErrorMessage && (
                      <p className="px-3 py-2 text-xs text-slate-500">
                        このブランチで選択可能なファイルが見つかりませんでした。
                      </p>
                    )}
                    {!isTreeLoading && treeErrorMessage && (
                      <p className="px-3 py-2 text-sm text-red-600" role="alert" data-testid="repository-tree-error">
                        {treeErrorMessage}
                      </p>
                    )}
                    {!isTreeLoading && !treeErrorMessage && repositoryFiles.length > 0 && (
                      <ul className="flex flex-col divide-y divide-slate-100" data-testid="repository-tree-list">
                        {repositoryFiles.map((entry) => {
                          const isSelected = selectedFilePath === entry.path
                          return (
                            <li key={entry.sha}>
                              <button
                                type="button"
                                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                                onClick={() => handleRepositoryFileSelect(entry.path)}
                                disabled={isFileLoading}
                                data-testid="repository-tree-item"
                                data-path={entry.path}
                              >
                                <span className="truncate">{entry.path}</span>
                                {isSelected && <span className="text-xs text-blue-600">選択中</span>}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                  {isFileLoading && (
                    <p className="text-xs text-slate-500" data-testid="repository-file-loading">
                      ファイルを取得しています...
                    </p>
                  )}
                  {fileErrorMessage && (
                    <p className="text-sm text-red-600" role="alert" data-testid="repository-file-error">
                      {fileErrorMessage}
                    </p>
                  )}
                  {fileSuccessMessage && (
                    <p className="text-sm text-emerald-600" role="status" data-testid="repository-file-success">
                      {fileSuccessMessage}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {integrationMode === 'pull-request' && (
        <section className="flex flex-col gap-3">
          <label htmlFor="pull-request-url" className="text-sm font-medium text-slate-800">
            Pull Request URL
          </label>
          <TextInput
            id="pull-request-url"
            name="pullRequestUrl"
            value={pullRequestUrl}
            onChange={(event) => setPullRequestUrl(event.target.value)}
            placeholder="https://github.com/owner/repository/pull/123"
            fullWidth
            autoComplete="off"
            spellCheck={false}
            data-testid="pull-request-url-input"
            disabled
          />
          <p className="text-xs text-slate-500">
            PRの差分確認やファイル比較機能は現在準備中です。今後のアップデートをお待ちください。
          </p>
        </section>
      )}
    </div>
  )
}
