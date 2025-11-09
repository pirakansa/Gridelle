// File Header: Placeholder panel for upcoming GitHub file integration workflows.
import React from 'react'
import Button from '../atom/Button'
import TextInput from '../atom/TextInput'
import {
  GithubRepositoryAccessError,
  type CollaboratorVerificationResult,
  verifyRepositoryCollaborator,
} from '../../services/githubRepositoryAccessService'

type GithubIntegrationPanelProps = {
  initialRepositoryUrl?: string
  onRepositoryUrlSubmit?: (_repositoryUrl: string) => void
  onRepositoryAccessConfirmed?: (_result: CollaboratorVerificationResult) => void
}

// Function Header: Renders introductory messaging and initial GitHub repository URL capture form.
export default function GithubIntegrationPanel({
  initialRepositoryUrl = '',
  onRepositoryUrlSubmit,
  onRepositoryAccessConfirmed,
}: GithubIntegrationPanelProps): React.ReactElement {
  const [repositoryUrl, setRepositoryUrl] = React.useState<string>(initialRepositoryUrl)
  const [isVerifying, setIsVerifying] = React.useState<boolean>(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    setRepositoryUrl(initialRepositoryUrl)
  }, [initialRepositoryUrl])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedUrl = repositoryUrl.trim()
      if (!trimmedUrl) {
        return
      }
      setIsVerifying(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      try {
        const result = await verifyRepositoryCollaborator(trimmedUrl)
        const canonicalUrl = `https://github.com/${result.repository.owner}/${result.repository.repository}`
        setRepositoryUrl(canonicalUrl)
        setSuccessMessage(
          `${result.username} が ${result.repository.owner}/${result.repository.repository} のコラボレーターとして確認できました。`,
        )
        onRepositoryUrlSubmit?.(canonicalUrl)
        onRepositoryAccessConfirmed?.(result)
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
    [onRepositoryAccessConfirmed, onRepositoryUrlSubmit, repositoryUrl],
  )

  return (
    <div className="flex flex-col gap-6 text-sm text-slate-700" data-testid="github-integration-panel">
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

      <form className="flex flex-col gap-3" onSubmit={handleSubmit} data-testid="repository-url-form">
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
    </div>
  )
}
