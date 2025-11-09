// File Header: Presents file-level operations such as YAML import/export triggers.
import React from 'react'
import Button from '../../atom/Button'
import MenuSectionCard from './MenuSectionCard'

type FileSectionProps = {
  onYamlInputClick: () => void
}

// Function Header: Renders YAML panel shortcut and supporting description.
export default function FileSection({ onYamlInputClick }: FileSectionProps): React.ReactElement {
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
        </div>
      </div>
    </MenuSectionCard>
  )
}
