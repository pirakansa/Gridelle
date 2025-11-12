// File Header: Presents file-level operations such as YAML import/export triggers.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'
import type { LoginMode } from '../../../services/auth'
import { useI18n } from '../../../utils/i18n'

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
  const { select } = useI18n()
  const isGithubLoggedIn = loginMode === 'github'
  const handleGithubActions = React.useCallback(() => {
    onGithubActionsClick()
  }, [onGithubActionsClick])

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 text-sm text-slate-600">
          <span className="text-base font-semibold text-slate-800">
            {select('ファイル操作', 'File actions')}
          </span>
          <p className="max-w-xl text-sm text-slate-500">
            {select(
              'YAMLファイルを読み込んでテーブルへ反映したり、現在のシート構成を確認できます。',
              'Import YAML files into the table or inspect the current sheet structure.',
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={onYamlInputClick} data-testid="open-yaml-panel">
            {select('YAML入力 / プレビュー', 'YAML input / preview')}
          </Button>
          {isGithubLoggedIn && (
            <Button
              type="button"
              variant="primary"
              onClick={handleGithubActions}
              data-testid="github-file-actions"
            >
              {select('GitHubファイル連携', 'GitHub file integration')}
            </Button>
          )}
        </div>
      </div>
    </MenuSectionCard>
  )
}
