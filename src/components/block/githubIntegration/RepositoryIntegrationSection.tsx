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
import { useI18n } from '../../../utils/i18n'

type LocalizedMessage = { ja: string; en: string }

const createMessage = (ja: string, en: string): LocalizedMessage => ({ ja, en })

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
  const { select } = useI18n()
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<LocalizedMessage | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<LocalizedMessage | null>(null)
  const [repositoryCoordinates, setRepositoryCoordinates] =
    React.useState<GithubRepositoryCoordinates | null>(null)
  const [branches, setBranches] = React.useState<RepositoryBranch[]>([])
  const [isBranchLoading, setIsBranchLoading] = React.useState<boolean>(false)
  const [branchErrorMessage, setBranchErrorMessage] = React.useState<LocalizedMessage | null>(null)
  const [selectedBranch, setSelectedBranch] = React.useState<string>('')
  const [treeEntries, setTreeEntries] = React.useState<RepositoryTreeEntry[]>([])
  const [isTreeLoading, setIsTreeLoading] = React.useState<boolean>(false)
  const [treeErrorMessage, setTreeErrorMessage] = React.useState<LocalizedMessage | null>(null)
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null)
  const [isFileLoading, setIsFileLoading] = React.useState<boolean>(false)
  const [fileErrorMessage, setFileErrorMessage] = React.useState<LocalizedMessage | null>(null)
  const [fileSuccessMessage, setFileSuccessMessage] = React.useState<LocalizedMessage | null>(null)
  const resolveMessage = React.useCallback(
    (message: LocalizedMessage | null) => (message ? select(message.ja, message.en) : null),
    [select],
  )

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
          setBranchErrorMessage(createMessage(error.jaMessage, error.enMessage))
        } else {
          setBranchErrorMessage(
            createMessage(
              'ブランチ一覧の取得に失敗しました。時間を置いて再度お試しください。',
              'Failed to fetch branches. Please try again later.',
            ),
          )
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
          setTreeErrorMessage(createMessage(error.jaMessage, error.enMessage))
        } else {
          setTreeErrorMessage(
            createMessage(
              'ファイルツリーの取得に失敗しました。時間を置いて再度お試しください。',
              'Failed to fetch the repository tree. Please try again later.',
            ),
          )
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
          createMessage(
            `${result.username} が ${result.repository.owner}/${result.repository.repository} のコラボレーターとして確認できました。`,
            `${result.username} is confirmed as a collaborator on ${result.repository.owner}/${result.repository.repository}.`,
          ),
        )
        onRepositoryUrlSubmit?.(canonicalUrl)
        onRepositoryAccessConfirmed?.(result)
        setRepositoryCoordinates(result.repository)
        void loadBranches(result.repository)
      } catch (error) {
        if (error instanceof services.GithubRepositoryAccessError) {
          setErrorMessage(createMessage(error.jaMessage, error.enMessage))
        } else {
          setErrorMessage(
            createMessage(
              'リポジトリの権限確認に失敗しました。時間を置いて再度お試しください。',
              'Failed to verify repository access. Please try again later.',
            ),
          )
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
        setFileErrorMessage(
          createMessage(
            'YAMLファイル（.yml / .yaml）のみ選択できます。',
            'Only YAML files (.yml / .yaml) can be selected.',
          ),
        )
        return
      }

      setIsFileLoading(true)

      services
        .fetchRepositoryFileContent(repositoryCoordinates, selectedBranch, filePath)
        .then((content) => {
          setFileSuccessMessage(
            createMessage(`${filePath} を読み込みました。`, `Loaded ${filePath}.`),
          )
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
            setFileErrorMessage(createMessage(error.jaMessage, error.enMessage))
          } else {
            setFileErrorMessage(
              createMessage(
                'GitHubファイルの取得に失敗しました。時間を置いて再度お試しください。',
                'Failed to fetch the GitHub file. Please try again later.',
              ),
            )
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

  const repositoryErrorText = resolveMessage(errorMessage)
  const repositorySuccessText = resolveMessage(successMessage)
  const branchErrorText = resolveMessage(branchErrorMessage)
  const treeErrorText = resolveMessage(treeErrorMessage)
  const fileErrorText = resolveMessage(fileErrorMessage)
  const fileSuccessText = resolveMessage(fileSuccessMessage)

  return (
    <>
      <form className="flex flex-col gap-3" onSubmit={handleRepositorySubmit} data-testid="repository-url-form">
        <label htmlFor="repository-url" className="text-sm font-medium text-slate-800">
          {select('対象リポジトリURL', 'Target repository URL')}
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
          {select(
            '公開・非公開を問わずGitHubのリポジトリURLを入力してください。後続のステップでブランチやファイルを選択できます。',
            'Enter any GitHub repository URL (public or private). You can choose the branch and file in later steps.',
          )}
        </p>
        <div className="flex justify-end">
          <Button type="submit" disabled={!repositoryUrl.trim() || isVerifying}>
            {isVerifying ? select('確認中…', 'Verifying…') : select('URLを確定', 'Verify URL')}
          </Button>
        </div>
        {repositoryErrorText && (
          <p className="text-sm text-red-600" role="alert" data-testid="repository-url-error">
            {repositoryErrorText}
          </p>
        )}
        {repositorySuccessText && (
          <p className="text-sm text-emerald-600" role="status" data-testid="repository-url-success">
            {repositorySuccessText}
          </p>
        )}
      </form>

      {(repositoryCoordinates || selectedBranch || selectedFilePath || isFileLoading) && (
        <section className="flex flex-col gap-3">
          <div
            className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"
            data-testid="repository-selection-summary"
          >
            <p className="font-medium text-slate-700">
              {select('選択内容の確認', 'Selection summary')}
            </p>
            <p>
              {select('リポジトリ', 'Repository')}:{' '}
              <span className="font-mono text-slate-700">
                {repositoryCoordinates
                  ? `${repositoryCoordinates.owner}/${repositoryCoordinates.repository}`
                  : select('未選択', 'Not selected')}
              </span>
            </p>
            <p>
              {select('ブランチ', 'Branch')}:{' '}
              <span className="font-mono text-slate-700">
                {selectedBranch || select('未選択', 'Not selected')}
              </span>
            </p>
            <p>
              {select('ファイル', 'File')}:{' '}
              <span className="font-mono text-slate-700">
                {isFileLoading
                  ? selectedFilePath
                    ? `${selectedFilePath} (${select('読み込み中…', 'Loading…')})`
                    : select('読み込み中…', 'Loading…')
                  : selectedFilePath ?? select('未選択', 'Not selected')}
              </span>
            </p>
          </div>

          {repositoryCoordinates && (
            <div className="flex flex-col gap-2">
              <label htmlFor="repository-branch" className="text-sm font-medium text-slate-800">
                {select('ブランチを選択', 'Select a branch')}
              </label>
              <SelectField
                id="repository-branch"
                value={selectedBranch}
                onChange={handleBranchChange}
                disabled={isBranchLoading || branches.length === 0}
                fullWidth
                data-testid="repository-branch-select"
              >
                {branches.length === 0 && (
                  <option value="">{select('ブランチが取得できませんでした', 'Unable to fetch branches')}</option>
                )}
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </SelectField>
              <p className="text-xs text-slate-500">
                {select(
                  '対象のブランチを選択すると、その内容からYAMLファイルなどを選べます。',
                  'Select a branch to browse and choose YAML files from its contents.',
                )}
              </p>
              {isBranchLoading && (
                <p className="text-xs text-slate-500" data-testid="repository-branch-loading">
                  {select('ブランチ一覧を取得中です...', 'Loading branch list...')}
                </p>
              )}
              {branchErrorText && (
                <p className="text-sm text-red-600" role="alert" data-testid="repository-branch-error">
                  {branchErrorText}
                </p>
              )}
            </div>
          )}

          {repositoryCoordinates && selectedBranch && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-800">{select('ファイルを選択', 'Select a file')}</span>
              <div
                className="max-h-72 overflow-y-auto rounded border border-slate-200 bg-white"
                data-testid="repository-file-tree"
              >
                {isTreeLoading && (
                  <p className="px-3 py-2 text-xs text-slate-500">
                    {select('ファイルツリーを読み込み中です...', 'Loading repository tree...')}
                  </p>
                )}
                {!isTreeLoading && repositoryFiles.length === 0 && !treeErrorText && (
                  <p className="px-3 py-2 text-xs text-slate-500">
                    {select('このブランチで選択可能なファイルが見つかりませんでした。', 'No selectable files were found in this branch.')}
                  </p>
                )}
                {!isTreeLoading && treeErrorText && (
                  <p className="px-3 py-2 text-sm text-red-600" role="alert" data-testid="repository-tree-error">
                    {treeErrorText}
                  </p>
                )}
                {!isTreeLoading && !treeErrorText && repositoryFiles.length > 0 && (
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
                            {isSelected && (
                              <span className="text-xs text-blue-600">{select('選択中', 'Selected')}</span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
              {isFileLoading && (
                <p className="text-xs text-slate-500" data-testid="repository-file-loading">
                  {select('ファイルを取得しています...', 'Fetching file...')}
                </p>
              )}
              {fileErrorText && (
                <p className="text-sm text-red-600" role="alert" data-testid="repository-file-error">
                  {fileErrorText}
                </p>
              )}
              {fileSuccessText && (
                <p className="text-sm text-emerald-600" role="status" data-testid="repository-file-success">
                  {fileSuccessText}
                </p>
              )}
            </div>
          )}
        </section>
      )}
    </>
  )
}
