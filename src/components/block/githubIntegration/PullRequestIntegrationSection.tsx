// File Header: Placeholder content for pull request integration workflow.
import React from 'react'
import TextInput from '../../atom/TextInput'

// Function Header: Displays the disabled pull request integration inputs.
export default function PullRequestIntegrationSection(): React.ReactElement {
  const [pullRequestUrl, setPullRequestUrl] = React.useState<string>('')

  return (
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
  )
}
