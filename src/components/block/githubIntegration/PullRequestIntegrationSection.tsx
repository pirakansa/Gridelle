// File Header: Handles pull request based GitHub integration workflow.
import React from 'react'
import Button from '../../atom/Button'
import TextInput from '../../atom/TextInput'
import type {
  GithubRepositoryAccessError,
  GithubRepositoryAccessErrorCode,
  GithubRepositoryCoordinates,
  PullRequestDetails,
} from '../../../services/githubRepositoryAccessService'
import { type YamlContentPayload } from './types'
import { useI18n } from '../../../utils/i18n'

type LocalizedMessage = { ja: string; en: string }

const createMessage = (ja: string, en: string): LocalizedMessage => ({ ja, en })

const YAML_EXTENSION_PATTERN = /\.(ya?ml)$/i

// Function Header: Provides form controls and file listing for pull request workflows.
type PullRequestIntegrationSectionProps = {
  onYamlContentLoaded?: (_payload: YamlContentPayload) => void
  onFileSelected?: (_filePath: string) => void
  services: PullRequestIntegrationServices
}

type PullRequestIntegrationServices = {
  GithubRepositoryAccessError: new (
    _message: string,
    _code: GithubRepositoryAccessErrorCode,
    _englishMessage?: string,
  ) => GithubRepositoryAccessError
  fetchPullRequestDetails: (_pullRequestUrl: string) => Promise<PullRequestDetails>
  fetchRepositoryFileContent: (
    _coordinates: GithubRepositoryCoordinates,
    _branch: string,
    _filePath: string,
  ) => Promise<string>
}

export default function PullRequestIntegrationSection({
  onYamlContentLoaded,
  onFileSelected,
  services,
}: PullRequestIntegrationSectionProps): React.ReactElement {
  const { select } = useI18n()
  const [pullRequestUrl, setPullRequestUrl] = React.useState<string>('')
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false)
  const [verificationError, setVerificationError] = React.useState<LocalizedMessage | null>(null)
  const [verificationSuccess, setVerificationSuccess] = React.useState<LocalizedMessage | null>(null)
  const [pullRequestDetails, setPullRequestDetails] = React.useState<PullRequestDetails | null>(null)
  const [selectedFilePath, setSelectedFilePath] = React.useState<string | null>(null)
  const [isFileLoading, setIsFileLoading] = React.useState<boolean>(false)
  const [fileErrorMessage, setFileErrorMessage] = React.useState<LocalizedMessage | null>(null)
  const [fileSuccessMessage, setFileSuccessMessage] = React.useState<LocalizedMessage | null>(null)

  const resolveMessage = React.useCallback(
    (message: LocalizedMessage | null) => (message ? select(message.ja, message.en) : null),
    [select],
  )

  const yamlFiles = React.useMemo(
    () => (pullRequestDetails?.files ?? []).filter((file) => YAML_EXTENSION_PATTERN.test(file.path)),
    [pullRequestDetails],
  )

  const handlePullRequestSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedUrl = pullRequestUrl.trim()
      if (!trimmedUrl) {
        return
      }

      setIsVerifying(true)
      setVerificationError(null)
      setVerificationSuccess(null)
      setPullRequestDetails(null)
      setSelectedFilePath(null)
      setFileErrorMessage(null)
      setFileSuccessMessage(null)

      try {
        const details = await services.fetchPullRequestDetails(trimmedUrl)
        setPullRequestDetails(details)
        setVerificationSuccess(
          createMessage(
            `Pull Request #${details.coordinates.pullNumber} のファイル一覧を取得しました。`,
            `Fetched files from Pull Request #${details.coordinates.pullNumber}.`,
          ),
        )
      } catch (error) {
        if (error instanceof services.GithubRepositoryAccessError) {
          setVerificationError(createMessage(error.jaMessage, error.enMessage))
        } else {
          setVerificationError(
            createMessage(
              'Pull Request の情報取得に失敗しました。URLとアクセス権限を確認してください。',
              'Failed to fetch pull request details. Check the URL and your permissions.',
            ),
          )
        }
      } finally {
        setIsVerifying(false)
      }
    },
    [pullRequestUrl, services],
  )

  const handlePullRequestFileSelect = React.useCallback(
    (filePath: string) => {
      if (!pullRequestDetails) {
        return
      }

      setSelectedFilePath(filePath)
      setIsFileLoading(true)
      setFileErrorMessage(null)
      setFileSuccessMessage(null)

      services
        .fetchRepositoryFileContent(pullRequestDetails.head.repository, pullRequestDetails.head.ref, filePath)
        .then((content) => {
          setFileSuccessMessage(createMessage(`${filePath} を読み込みました。`, `Loaded ${filePath}.`))
          onFileSelected?.(filePath)
          onYamlContentLoaded?.({
            yaml: content,
            repository: pullRequestDetails.head.repository,
            branch: pullRequestDetails.head.ref,
            filePath,
            mode: 'pull-request',
          })
        })
        .catch((error) => {
          if (error instanceof services.GithubRepositoryAccessError) {
            setFileErrorMessage(createMessage(error.jaMessage, error.enMessage))
          } else {
            setFileErrorMessage(
              createMessage(
                'Pull Request のファイル取得に失敗しました。時間を置いて再度お試しください。',
                'Failed to fetch the file from the pull request. Please try again later.',
              ),
            )
          }
        })
        .finally(() => {
          setIsFileLoading(false)
        })
    },
    [onFileSelected, onYamlContentLoaded, pullRequestDetails, services],
  )

  const verificationErrorText = resolveMessage(verificationError)
  const verificationSuccessText = resolveMessage(verificationSuccess)
  const fileErrorText = resolveMessage(fileErrorMessage)
  const fileSuccessText = resolveMessage(fileSuccessMessage)

  return (
    <section className="flex flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={handlePullRequestSubmit} data-testid="pull-request-url-form">
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
        />
        <p className="text-xs text-slate-500">
          {select(
            '対象の Pull Request URL を入力すると、変更された YAML ファイルを一覧できます。',
            'Enter a pull request URL to browse the changed YAML files.',
          )}
        </p>
        <div className="flex justify-end">
          <Button type="submit" disabled={!pullRequestUrl.trim() || isVerifying}>
            {isVerifying ? select('確認中…', 'Verifying…') : select('URLを確定', 'Verify URL')}
          </Button>
        </div>
        {verificationErrorText && (
          <p className="text-sm text-red-600" role="alert" data-testid="pull-request-url-error">
            {verificationErrorText}
          </p>
        )}
        {verificationSuccessText && (
          <p className="text-sm text-emerald-600" role="status" data-testid="pull-request-url-success">
            {verificationSuccessText}
          </p>
        )}
      </form>

      {pullRequestDetails && (
        <div className="flex flex-col gap-3">
          <div
            className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"
            data-testid="pull-request-selection-summary"
          >
            <p className="font-medium text-slate-800">
              {select('Pull Request 概要', 'Pull Request summary')}
            </p>
            <p>
              {select('リポジトリ', 'Repository')}:{' '}
              <span className="font-mono text-slate-900">
                {pullRequestDetails.coordinates.owner}/{pullRequestDetails.coordinates.repository}
              </span>
            </p>
            <p>
              {select('番号', 'Number')}:{' '}
              <span className="font-mono text-slate-900">#{pullRequestDetails.coordinates.pullNumber}</span>
            </p>
            <p>
              {select('ヘッド', 'Head')}:{' '}
              <span className="font-mono text-slate-900">
                {pullRequestDetails.head.repository.owner}/{pullRequestDetails.head.repository.repository}@{pullRequestDetails.head.ref}
              </span>
            </p>
            <p>
              {select('ファイル', 'File')}:{' '}
              <span className="font-mono text-slate-900">
                {selectedFilePath
                  ? `${selectedFilePath}${isFileLoading ? select(' (読み込み中…)', ' (Loading…)') : ''}`
                  : select('未選択', 'Not selected')}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-2" data-testid="pull-request-file-list">
            <p className="text-sm font-medium text-slate-800">
              {select('Pull Request で変更された YAML ファイル', 'YAML files changed in the pull request')}
            </p>
            {yamlFiles.length === 0 ? (
              <p className="text-xs text-slate-500">
                {select(
                  'この Pull Request で変更された YAML ファイルは見つかりませんでした。',
                  'No YAML files were changed in this pull request.',
                )}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-200 rounded border border-slate-200 bg-white">
                {yamlFiles.map((file) => (
                  <li key={file.path}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => handlePullRequestFileSelect(file.path)}
                      disabled={isFileLoading}
                      data-testid="pull-request-file-button"
                    >
                      <span className="font-mono text-slate-900">{file.path}</span>
                      <span className="text-xs text-slate-500">{file.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {fileErrorText && (
              <p className="text-sm text-red-600" role="alert" data-testid="pull-request-file-error">
                {fileErrorText}
              </p>
            )}
            {fileSuccessText && (
              <p className="text-sm text-emerald-600" role="status" data-testid="pull-request-file-success">
                {fileSuccessText}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
