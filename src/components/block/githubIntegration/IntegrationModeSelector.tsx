// File Header: Selector UI for choosing GitHub integration mode.
import React from 'react'
import Button from '../../atom/Button'
import { integrationModeMeta } from './constants'
import { type IntegrationMode } from './types'
import { useI18n } from '../../../utils/i18n'

// Function Header: Renders buttons that allow switching GitHub integration modes.
type IntegrationModeSelectorProps = {
  currentMode: IntegrationMode
  onModeChange: (_mode: IntegrationMode) => void
}

export default function IntegrationModeSelector({
  currentMode,
  onModeChange,
}: IntegrationModeSelectorProps): React.ReactElement {
  const { select } = useI18n()
  return (
    <section className="flex flex-col gap-3">
      <span className="text-sm font-medium text-slate-800">
        {select('読み込みパターンを選択', 'Choose a loading mode')}
      </span>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={select('GitHub連携パターン選択', 'GitHub integration modes')}
      >
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
              {select(mode.label.ja, mode.label.en)}
            </Button>
          )
        })}
      </div>
      <p className="text-xs text-slate-500">
        {(() => {
          const meta = integrationModeMeta.find((item) => item.id === currentMode)
          return meta ? select(meta.helper.ja, meta.helper.en) : ''
        })()}
      </p>
    </section>
  )
}
