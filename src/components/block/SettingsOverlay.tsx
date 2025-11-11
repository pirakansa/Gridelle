// File Header: Overlay shell component used to present configuration panels.
import React from 'react'
import Button from '../atom/Button'
import { useI18n } from '../../utils/i18n'

type Props = {
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  panelId: string
}

// Function Header: Renders a centered modal overlay with heading and close affordance.
export default function SettingsOverlay({
  title,
  description,
  onClose,
  children,
  panelId,
}: Props): React.ReactElement {
  const { select } = useI18n()
  const headingId = `${panelId}-heading`
  const descriptionId = description ? `${panelId}-description` : undefined

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-8"
      role="presentation"
      onClick={onClose}
      data-testid={`${panelId}-overlay`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={headingId} className="text-2xl font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-2 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={select('閉じる', 'Close')}
          >
            × {select('閉じる', 'Close')}
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}
