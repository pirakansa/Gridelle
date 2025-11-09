// File Header: Handles repository based GitHub integration workflow.
import React from 'react'
import Button from '../../atom/Button'
import SelectField from '../../atom/SelectField'
import TextInput from '../../atom/TextInput'
import type {
  CollaboratorVerificationResult,
  GithubRepositoryAccessError,
  GithubRepositoryAccessErrorCode,
  GithubRepositoryCoordinates,
  RepositoryBranch,
  RepositoryTreeEntry,
} from '../../../services/githubRepositoryAccessService'
import { type YamlContentPayload } from './types'

// Function Header: Renders repository verification, branch selection, and file loading controls.
type RepositoryIntegrationSectionProps = {
  repositoryUrl: string
  onRepositoryUrlChange: (_repositoryUrl: string) => void
  onRepositoryUrlSubmit?: (_repositoryUrl: string) => void
  onRepositoryAccessConfirmed?: (_result: CollaboratorVerificationResult) => void
  onBranchSelected?: (_branchName: string) => void
  onFileSelected?: (_filePath: string) => void
  onYamlContentLoaded?: (_payload: YamlContentPayload) => void
  services: RepositoryIntegrationServices
}

type RepositoryIntegrationServices = {
  GithubRepositoryAccessError: new (
    _message: string,
    _code: GithubRepositoryAccessErrorCode,
  ) => GithubRepositoryAccessError
  verifyRepositoryCollaborator: (
    _repositoryUrl: string,
  ) => Promise<CollaboratorVerificationResult>
  listRepositoryBranches: (
    _coordinates: GithubRepositoryCoordinates,
  ) => Promise<RepositoryBranch[]>
  fetchRepositoryTree: (
    _coordinates: GithubRepositoryCoordinates,
    _branchName: string,
  ) => Promise<RepositoryTreeEntry[]>
  fetchRepositoryFileContent: (
    _coordinates: GithubRepositoryCoordinates,
    _branchName: string,
    _filePath: string,
  ) => Promise<string>
}

const YAML_EXTENSION_PATTERN = /\.ya?ml$/i

export default function RepositoryIntegrationSection({
  repositoryUrl,
  onRepositoryUrlChange,
  onRepositoryUrlSubmit,
  onRepositoryAccessConfirmed,
  onBranchSelected,
  onFileSelected,
  onYamlContentLoaded,
  services,
}: RepositoryIntegrationSectionProps): React.ReactElement {
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [repositoryCoordinates, setRepositoryCoordinates] =
    React.useState<GithubRepositoryCoordinates | null>(null)
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

  const resetRepositoryState = React.useCallback(() => {
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

  const loadBranches = React.useCallback(
    async (coordinates: GithubRepositoryCoordinates) => {
      setIsBranchLoading(true)
      setBranchErrorMessage(null)

      try {
        const fetchedBranches = await services.listRepositoryBranches(coordinates)
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
        if (error instanceof services.GithubRepositoryAccessError) {
          setBranchErrorMessage(error.message)
        } else {
          setBranchErrorMessage('ブランチ一覧の取得に失敗しました。時間を置いて再度お試しください。')
        }
      } finally {
        setIsBranchLoading(false)
      }
    },
    [services],
  )

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
        const fetchedTree = await services.fetchRepositoryTree(coordinates, branchName)
        setTreeEntries(fetchedTree)
      } catch (error) {
        if (error instanceof services.GithubRepositoryAccessError) {
          setTreeErrorMessage(error.message)
        } else {
          setTreeErrorMessage('ファイルツリーの取得に失敗しました。時間を置いて再度お試しください。')
        }
        setTreeEntries([])
      } finally {
        setIsTreeLoading(false)
      }
    },
    [services],
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
        const result = await services.verifyRepositoryCollaborator(trimmedUrl)
        const canonicalUrl = `https://github.com/${result.repository.owner}/${result.repository.repository}`
        onRepositoryUrlChange(canonicalUrl)
        setSuccessMessage(
          `${result.username} が ${result.repository.owner}/${result.repository.repository} のコラボレーターとして確認できました。`,
        )
        onRepositoryUrlSubmit?.(canonicalUrl)
        onRepositoryAccessConfirmed?.(result)
        setRepositoryCoordinates(result.repository)
        void loadBranches(result.repository)
      } catch (error) {
        if (error instanceof services.GithubRepositoryAccessError) {
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
      onRepositoryUrlChange,
      onRepositoryUrlSubmit,
      repositoryUrl,
      resetRepositoryState,
      services,
    ],
  )

  React.useEffect(() => {
    if (!repositoryCoordinates || !selectedBranch) {
      return
    }

    void loadRepositoryTree(repositoryCoordinates, selectedBranch)
    onBranchSelected?.(selectedBranch)
  }, [loadRepositoryTree, onBranchSelected, repositoryCoordinates, selectedBranch])

  const handleBranchChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBranch(event.target.value)
    setSelectedFilePath(null)
    setFileErrorMessage(null)
    setFileSuccessMessage(null)
  }, [])

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

      services
        .fetchRepositoryFileContent(repositoryCoordinates, selectedBranch, filePath)
        .then((content) => {
          setFileSuccessMessage(`${filePath} を読み込みました。`)
          onFileSelected?.(filePath)
          onYamlContentLoaded?.({
            yaml: content,
            repository: repositoryCoordinates,
            branch: selectedBranch,
            filePath,
            mode: 'repository',
          })
        })
        .catch((error) => {
          if (error instanceof services.GithubRepositoryAccessError) {
            setFileErrorMessage(error.message)
          } else {
            setFileErrorMessage('GitHubファイルの取得に失敗しました。時間を置いて再度お試しください。')
          }
        })
        .finally(() => {
          setIsFileLoading(false)
        })
    },
    [
      onFileSelected,
      onYamlContentLoaded,
      repositoryCoordinates,
      selectedBranch,
      services,
    ],
  )

  const repositoryFiles = React.useMemo(
    () => treeEntries.filter((entry) => entry.type === 'blob'),
    [treeEntries],
  )

  return (
    <>
      <form className="flex flex-col gap-3" onSubmit={handleRepositorySubmit} data-testid="repository-url-form">
        <label htmlFor="repository-url" className="text-sm font-medium text-slate-800">
          対象リポジトリURL
        </label>
        <TextInput
          id="repository-url"
          name="repositoryUrl"
          value={repositoryUrl}
          onChange={(event) => onRepositoryUrlChange(event.target.value)}
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

      {(repositoryCoordinates || selectedBranch || selectedFilePath || isFileLoading) && (
        <section className="flex flex-col gap-3">
          <div
            className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
            data-testid="repository-selection-summary"
          >
            <p className="font-medium text-slate-700">選択内容の確認</p>
            <p>
              リポジトリ:{' '}
              <span className="font-mono text-slate-700">
                {repositoryCoordinates
                  ? `${repositoryCoordinates.owner}/${repositoryCoordinates.repository}`
                  : '未選択'}
              </span>
            </p>
            <p>
              ブランチ:{' '}
              <span className="font-mono text-slate-700">{selectedBranch || '未選択'}</span>
            </p>
            <p>
              ファイル:{' '}
              <span className="font-mono text-slate-700">
                {isFileLoading
                  ? selectedFilePath
                    ? `${selectedFilePath} (読み込み中…)`
                    : '読み込み中…'
                  : selectedFilePath ?? '未選択'}
              </span>
            </p>
          </div>

          {repositoryCoordinates && (
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
          )}

          {repositoryCoordinates && selectedBranch && (
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
                              isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
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
  )
}
