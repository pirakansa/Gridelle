// File Header: Selection status display and clear action.
import React from 'react'
import Button from '../../atom/Button'
import TextAreaField from '../../atom/TextAreaField'
import TextInput from '../../atom/TextInput'
import MenuSectionCard from './MenuSectionCard'
import { useI18n } from '../../../utils/i18n'

type SelectionSectionProps = {
  selectionSummary: string
  hasSelection: boolean
  onClearSelection: () => void
  bulkValue: string
  onBulkValueChange: (_value: string) => void
  onBulkApply: () => void
  selectionTextColor: string
  selectionBackgroundColor: string
  onApplyTextColor: (_color: string | null) => void
  onApplyBackgroundColor: (_color: string | null) => void
  onClearSelectionStyles: () => void
}

// Function Header: Shows current selection summary and allows clearing it.
export default function SelectionSection({
  selectionSummary,
  hasSelection,
  onClearSelection,
  bulkValue,
  onBulkValueChange,
  onBulkApply,
  selectionTextColor,
  selectionBackgroundColor,
  onApplyTextColor,
  onApplyBackgroundColor,
  onClearSelectionStyles,
}: SelectionSectionProps): React.ReactElement {
  const { select } = useI18n()
  const [textColorDraft, setTextColorDraft] = React.useState<string>(selectionTextColor)
  const [backgroundColorDraft, setBackgroundColorDraft] = React.useState<string>(selectionBackgroundColor)

  const focusWorkspace = React.useCallback((): void => {
    if (typeof document === 'undefined') {
      return
    }
    const workspace = document.getElementById('sheet-workspace')
    if (workspace instanceof HTMLElement) {
      workspace.focus({ preventScroll: true })
    }
  }, [])

  React.useEffect(() => {
    setTextColorDraft(selectionTextColor)
  }, [selectionTextColor])

  React.useEffect(() => {
    setBackgroundColorDraft(selectionBackgroundColor)
  }, [selectionBackgroundColor])

  const handleClearSelection = React.useCallback(() => {
    onClearSelection()
    focusWorkspace()
  }, [focusWorkspace, onClearSelection])

  const handleApplyTextColor = React.useCallback(() => {
    const trimmed = textColorDraft.trim()
    onApplyTextColor(trimmed ? trimmed : null)
    setTextColorDraft(trimmed)
    focusWorkspace()
  }, [focusWorkspace, onApplyTextColor, textColorDraft])

  const handleApplyBackgroundColor = React.useCallback(() => {
    const trimmed = backgroundColorDraft.trim()
    onApplyBackgroundColor(trimmed ? trimmed : null)
    setBackgroundColorDraft(trimmed)
    focusWorkspace()
  }, [backgroundColorDraft, focusWorkspace, onApplyBackgroundColor])

  const handleBulkApply = React.useCallback(() => {
    onBulkApply()
    focusWorkspace()
  }, [focusWorkspace, onBulkApply])

  const handleClearStyles = React.useCallback(() => {
    onClearSelectionStyles()
    setTextColorDraft('')
    setBackgroundColorDraft('')
    focusWorkspace()
  }, [focusWorkspace, onClearSelectionStyles])

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <p data-testid="selection-summary" className="text-sm font-medium text-slate-700">
            {selectionSummary}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{select('⌘/Ctrl+V で貼り付け / Escape で選択解除', '⌘/Ctrl+V to paste / Escape to clear selection')}</span>
            <Button type="button" variant="subtle" onClick={handleClearSelection} disabled={!hasSelection}>
              {select('選択をクリア', 'Clear selection')}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 md:ml-auto">
            <TextAreaField
              placeholder={select('選択セルへ一括入力', 'Bulk fill the selected cells')}
              value={bulkValue}
              onChange={(event) => onBulkValueChange(event.target.value)}
              data-testid="bulk-input"
              onPointerDown={(event) => event.stopPropagation()}
              className="w-56 resize-y sm:w-72 md:w-80 lg:w-96"
              minRows={1}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={handleBulkApply}
              disabled={!hasSelection}
              data-testid="bulk-apply"
            >
              {select('一括入力する', 'Apply to selection')}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {select('セルのスタイル', 'Cell styles')}
          </h3>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <label htmlFor="selection-text-color" className="text-xs font-semibold text-slate-600">
                {select('文字色', 'Text color')}
              </label>
              <TextInput
                id="selection-text-color"
                value={textColorDraft}
                onChange={(event) => setTextColorDraft(event.target.value)}
                placeholder={select('例: #334155', 'e.g., #334155')}
                className="w-32"
                onPointerDown={(event) => event.stopPropagation()}
              />
              <span
                className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded border border-slate-200 px-2 text-xs font-semibold"
                aria-hidden="true"
                style={{ color: textColorDraft || undefined }}
              >
                Aa
              </span>
              <Button type="button" variant="ghost" onClick={handleApplyTextColor} disabled={!hasSelection}>
                {select('文字色を適用', 'Apply text color')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <label htmlFor="selection-background-color" className="text-xs font-semibold text-slate-600">
                {select('背景色', 'Background color')}
              </label>
              <TextInput
                id="selection-background-color"
                value={backgroundColorDraft}
                onChange={(event) => setBackgroundColorDraft(event.target.value)}
                placeholder={select('例: rgba(59,130,246,0.2)', 'e.g., rgba(59,130,246,0.2)')}
                className="w-40"
                onPointerDown={(event) => event.stopPropagation()}
              />
              <span
                className="h-8 w-10 rounded border border-slate-200"
                aria-hidden="true"
                style={{ backgroundColor: backgroundColorDraft || 'transparent' }}
              />
              <Button type="button" variant="ghost" onClick={handleApplyBackgroundColor} disabled={!hasSelection}>
                {select('背景色を適用', 'Apply background color')}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <Button type="button" variant="subtle" onClick={handleClearStyles} disabled={!hasSelection}>
              {select('スタイルをクリア', 'Clear styles')}
            </Button>
            <span>
              {select(
                'CSSカラー値（例: #1f2937, rgba(15,23,42,0.6)）を入力できます。',
                'Enter CSS color values (for example: #1f2937, rgba(15,23,42,0.6)).',
              )}
            </span>
          </div>
        </div>
      </div>
    </MenuSectionCard>
  )
}
