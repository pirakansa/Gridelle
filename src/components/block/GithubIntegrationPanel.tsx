// File Header: Placeholder panel for upcoming GitHub file integration workflows.
import React from 'react'

// Function Header: Renders introductory messaging for GitHub file integration dialog.
export default function GithubIntegrationPanel(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 text-sm text-slate-700" data-testid="github-integration-panel">
      <p>
        GitHub連携機能の準備中です。今後のアップデートでGitHubリポジトリからのYAML読み込みやコミット機能を提供予定です。
      </p>
      <ul className="list-disc space-y-1 pl-5 text-slate-600">
        <li>GitHubのファイルURL（blob）からYAMLを直接読み込み</li>
        <li>リポジトリとブランチを指定してファイル一覧から読み込み</li>
        <li>編集したYAMLをリポジトリへコミット</li>
      </ul>
      <p>詳細設計が完了次第、ここに操作画面を追加します。</p>
    </div>
  )
}
