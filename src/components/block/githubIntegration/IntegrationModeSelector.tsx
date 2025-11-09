// File Header: Selector UI for choosing GitHub integration mode.
import React from 'react'
import Button from '../../atom/Button'
import { integrationModeMeta } from './constants'
import { type IntegrationMode } from './types'

// Function Header: Renders buttons that allow switching GitHub integration modes.
type IntegrationModeSelectorProps = {
  currentMode: IntegrationMode
  onModeChange: (_mode: IntegrationMode) => void
}

export default function IntegrationModeSelector({
  currentMode,
  onModeChange,
}: IntegrationModeSelectorProps): React.ReactElement {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-sm font-medium text-slate-800">読み込みパターンを選択</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label="GitHub連携パターン選択">
        {integrationModeMeta.map((mode) => {
          const isActive = currentMode === mode.id
          return (
            <Button
              key={mode.id}
              type="button"
              variant={isActive ? 'primary' : 'ghost'}
              onClick={() => onModeChange(mode.id)}
              aria-pressed={isActive}
              data-testid={`github-integration-mode-${mode.id}`}
            >
              {mode.label}
            </Button>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">
        {integrationModeMeta.find((meta) => meta.id === currentMode)?.helper ?? ''}
      </p>
    </section>
  )
}
