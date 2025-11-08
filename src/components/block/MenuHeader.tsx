// File Header: Menu header providing access to configuration and auxillary panels.
import React from 'react'
import { ghostButtonClass } from '../constants'

type Props = {
  onYamlInputClick: () => void
  onYamlOutputClick: () => void
}

// Function Header: Renders the sticky menu bar for invoking YAML related panels.
export default function MenuHeader({
  onYamlInputClick,
  onYamlOutputClick,
}: Props): React.ReactElement {
  return (
    <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4 md:px-10">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-slate-900">Table Settings</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            設定メニュー
          </span>
        </div>
        <nav aria-label="設定メニュー" className="flex items-center gap-3">
          <button type="button" className={ghostButtonClass} onClick={onYamlInputClick}>
            YAML入力 / プレビュー
          </button>
          <button type="button" className={ghostButtonClass} onClick={onYamlOutputClick}>
            YAML出力
          </button>
        </nav>
      </div>
    </header>
  )
}
