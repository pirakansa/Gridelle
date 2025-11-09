// File Header: Placeholder panel for upcoming GitHub file integration workflows.
import React from 'react'
import Button from '../atom/Button'
import TextInput from '../atom/TextInput'

type GithubIntegrationPanelProps = {
  initialRepositoryUrl?: string
  onRepositoryUrlSubmit?: (_repositoryUrl: string) => void
}

// Function Header: Renders introductory messaging and initial GitHub repository URL capture form.
export default function GithubIntegrationPanel({
  initialRepositoryUrl = '',
  onRepositoryUrlSubmit,
}: GithubIntegrationPanelProps): React.ReactElement {
  const [repositoryUrl, setRepositoryUrl] = React.useState<string>(initialRepositoryUrl)

  React.useEffect(() => {
    setRepositoryUrl(initialRepositoryUrl)
  }, [initialRepositoryUrl])

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedUrl = repositoryUrl.trim()
      if (!trimmedUrl) {
        return
      }
      onRepositoryUrlSubmit?.(trimmedUrl)
    },
    [onRepositoryUrlSubmit, repositoryUrl],
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
          <Button type="submit" disabled={!repositoryUrl.trim()}>
            URLを確定
          </Button>
        </div>
      </form>
    </div>
  )
}
