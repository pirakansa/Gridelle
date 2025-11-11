// File Header: Presents file-level operations such as YAML import/export triggers.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'
import type { LoginMode } from '../../../services/auth'

type FileSectionProps = {
  onYamlInputClick: () => void
  loginMode: LoginMode | null
  onGithubActionsClick: () => void
}

// Function Header: Renders YAML panel shortcut and GitHub file integration entry points.
export default function FileSection({
  onYamlInputClick,
  loginMode,
  onGithubActionsClick,
}: FileSectionProps): React.ReactElement {
  const isGithubLoggedIn = loginMode === 'github'
  const handleGithubActions = React.useCallback(() => {
    onGithubActionsClick()
  }, [onGithubActionsClick])

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="text-base font-semibold text-slate-800">ファイル操作</span>
          <p className="max-w-xl text-sm text-slate-500">
            YAMLファイルを読み込んでテーブルへ反映したり、現在のシート構成を確認できます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={onYamlInputClick} data-testid="open-yaml-panel">
            YAML入力 / プレビュー
          </Button>
          {isGithubLoggedIn && (
            <Button
              type="button"
              variant="primary"
              onClick={handleGithubActions}
              data-testid="github-file-actions"
            >
              GitHubファイル連携（準備中）
            </Button>
          )}
        </div>
      </div>
    </MenuSectionCard>
  )
}
