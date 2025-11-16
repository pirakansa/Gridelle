// File Header: Selection status display and clear action.
import React from 'react'
import Button from '../../atom/Button'
import TextAreaField from '../../atom/TextAreaField'
import TextInput from '../../atom/TextInput'
import MenuSectionCard from './MenuSectionCard'
import { useI18n } from '../../../utils/i18n'

type SelectionSectionProps = {
  selectionSummary: string
  selectionFunctionSummary: string
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
  onCopySelectionFunction: () => void
  onPasteSelectionFunction: () => void
}

// Function Header: Shows current selection summary and allows clearing it.
export default function SelectionSection({
  selectionSummary,
  selectionFunctionSummary,
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
  onCopySelectionFunction,
  onPasteSelectionFunction,
}: SelectionSectionProps): React.ReactElement {
  const { select } = useI18n()
  const [textColorDraft, setTextColorDraft] = React.useState<string>(selectionTextColor)
  const [backgroundColorDraft, setBackgroundColorDraft] = React.useState<string>(selectionBackgroundColor)
  const [isBulkOpen, setIsBulkOpen] = React.useState<boolean>(false)
  const [isStyleOpen, setIsStyleOpen] = React.useState<boolean>(false)
  const textColorPresets = React.useMemo(
    () => ['#0f172a', '#1d4ed8', '#dc2626', '#16a34a', '#7c3aed', '#f97316'],
    [],
  )
  const backgroundColorPresets = React.useMemo(
    () => ['#e2e8f0', '#dbeafe', '#fee2e2', '#dcfce7', '#fef3c7', '#ede9fe'],
    [],
  )

  React.useEffect(() => {
    setTextColorDraft(selectionTextColor)
  }, [selectionTextColor])

  React.useEffect(() => {
    setBackgroundColorDraft(selectionBackgroundColor)
  }, [selectionBackgroundColor])

  React.useEffect(() => {
    if (!hasSelection) {
      setIsBulkOpen(false)
      return
    }
    setIsBulkOpen(true)
  }, [hasSelection])

  React.useEffect(() => {
    if (!hasSelection && !selectionTextColor && !selectionBackgroundColor) {
      setIsStyleOpen(false)
      return
    }
    if (hasSelection && (selectionTextColor || selectionBackgroundColor)) {
      setIsStyleOpen(true)
    }
  }, [hasSelection, selectionBackgroundColor, selectionTextColor])

  React.useEffect(() => {
    if (bulkValue.trim().length > 0) {
      setIsBulkOpen(true)
    }
  }, [bulkValue])

  const bulkPreview = React.useMemo(() => {
    if (!bulkValue.trim()) {
      return select('未入力', 'No value yet')
    }
    return `${bulkValue.trim().slice(0, 28)}${bulkValue.trim().length > 28 ? '…' : ''}`
  }, [bulkValue, select])

  const stylePreview = React.useMemo(() => {
    if (!selectionTextColor && !selectionBackgroundColor) {
      return select('未設定', 'No overrides applied')
    }
    if (selectionTextColor && selectionBackgroundColor) {
      return select('文字色と背景色を適用', 'Text & background set')
    }
    if (selectionTextColor) {
      return select('文字色を適用', 'Text color set')
    }
    return select('背景色を適用', 'Background color set')
  }, [select, selectionBackgroundColor, selectionTextColor])

  const handleApplyTextColor = React.useCallback(() => {
    const trimmed = textColorDraft.trim()
    onApplyTextColor(trimmed ? trimmed : null)
    setTextColorDraft(trimmed)
  }, [onApplyTextColor, textColorDraft])

  const handleApplyBackgroundColor = React.useCallback(() => {
    const trimmed = backgroundColorDraft.trim()
    onApplyBackgroundColor(trimmed ? trimmed : null)
    setBackgroundColorDraft(trimmed)
  }, [backgroundColorDraft, onApplyBackgroundColor])

  const handleClearStyles = React.useCallback(() => {
    onClearSelectionStyles()
    setTextColorDraft('')
    setBackgroundColorDraft('')
  }, [onClearSelectionStyles])

  const handleSelectPresetTextColor = React.useCallback(
    (color: string) => {
      setTextColorDraft(color)
      onApplyTextColor(color)
    },
    [onApplyTextColor],
  )

  const handleSelectPresetBackgroundColor = React.useCallback(
    (color: string) => {
      setBackgroundColorDraft(color)
      onApplyBackgroundColor(color)
    },
    [onApplyBackgroundColor],
  )

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <p data-testid="selection-summary" className="text-sm font-semibold text-slate-800">
              {selectionSummary}
            </p>
            <p data-testid="selection-function-summary" className="text-xs text-slate-500">
              {selectionFunctionSummary}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.7rem] text-slate-500">
            <span>{select('⌘/Ctrl+V で貼り付け / Escape で選択解除', '⌘/Ctrl+V to paste / Escape to clear selection')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="subtle" onClick={onClearSelection} disabled={!hasSelection}>
                {select('選択をクリア', 'Clear selection')}
              </Button>
              <Button
                type="button"
                variant="subtle"
                onClick={onCopySelectionFunction}
                disabled={!hasSelection}
                data-testid="copy-function-config"
              >
                {select('関数設定をコピー', 'Copy function config')}
              </Button>
              <Button
                type="button"
                variant="subtle"
                onClick={onPasteSelectionFunction}
                disabled={!hasSelection}
                data-testid="paste-function-config"
              >
                {select('関数設定を貼り付け', 'Paste function config')}
              </Button>
            </div>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
          <button
            type="button"
            className="flex w-full flex-col gap-1 rounded-xl p-2 text-left transition hover:bg-slate-50"
            onClick={() => setIsBulkOpen((current) => !current)}
            aria-expanded={isBulkOpen}
          >
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>{select('一括入力', 'Bulk edit')}</span>
              <span className="text-xs font-medium text-slate-500">
                {isBulkOpen ? select('折りたたむ', 'Collapse') : select('開く', 'Expand')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {select('選択セルに同じ値をまとめて入力します。', 'Fill the selected cells with the same value.')}
            </p>
            <p className="text-xs text-slate-400" aria-live="polite">
              {select('現在の入力値', 'Current value')}: {bulkPreview}
            </p>
          </button>
          {isBulkOpen && (
            <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
              <TextAreaField
                placeholder={select('選択セルへ一括入力', 'Bulk fill the selected cells')}
                value={bulkValue}
                onChange={(event) => onBulkValueChange(event.target.value)}
                data-testid="bulk-input"
                onPointerDown={(event) => event.stopPropagation()}
                className="min-h-20 w-full resize-y"
                minRows={1}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBulkApply}
                  disabled={!hasSelection}
                  data-testid="bulk-apply"
                >
                  {select('一括入力する', 'Apply to selection')}
                </Button>
              </div>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
          <button
            type="button"
            className="flex w-full flex-col gap-1 rounded-xl p-2 text-left transition hover:bg-slate-50"
            onClick={() => setIsStyleOpen((current) => !current)}
            aria-expanded={isStyleOpen}
          >
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>{select('セルのスタイル', 'Cell styles')}</span>
              <span className="text-xs font-medium text-slate-500">
                {isStyleOpen ? select('折りたたむ', 'Collapse') : select('開く', 'Expand')}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {select('色を指定してテキストや背景を整えます。', 'Adjust the text and background colors for the selection.')}
            </p>
            <p className="text-xs text-slate-400" aria-live="polite">
              {select('現在のスタイル', 'Current styles')}: {stylePreview}
            </p>
          </button>
          {isStyleOpen && (
            <div className="mt-3 flex flex-col gap-4 border-t border-slate-100 pt-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="selection-text-color" className="text-xs font-semibold text-slate-600">
                    {select('文字色', 'Text color')}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <TextInput
                      id="selection-text-color"
                      value={textColorDraft}
                      onChange={(event) => setTextColorDraft(event.target.value)}
                      placeholder={select('例: #334155', 'e.g., #334155')}
                      className="min-w-[8rem] flex-1"
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
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="selection-background-color" className="text-xs font-semibold text-slate-600">
                    {select('背景色', 'Background color')}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <TextInput
                      id="selection-background-color"
                      value={backgroundColorDraft}
                      onChange={(event) => setBackgroundColorDraft(event.target.value)}
                      placeholder={select('例: rgba(59,130,246,0.2)', 'e.g., rgba(59,130,246,0.2)')}
                      className="min-w-[10rem] flex-1"
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
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
                    {select('文字色プリセット', 'Text color presets')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {textColorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-7 w-7 rounded-full border border-slate-200 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                          !hasSelection ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => hasSelection && handleSelectPresetTextColor(color)}
                        aria-label={select('文字色プリセット', 'Text color preset') + ` ${color}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        disabled={!hasSelection}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">
                    {select('背景色プリセット', 'Background color presets')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {backgroundColorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-7 w-7 rounded border border-slate-200 transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                          !hasSelection ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => hasSelection && handleSelectPresetBackgroundColor(color)}
                        aria-label={select('背景色プリセット', 'Background color preset') + ` ${color}`}
                        onPointerDown={(event) => event.stopPropagation()}
                        disabled={!hasSelection}
                      />
                    ))}
                  </div>
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
          )}
        </section>
      </div>
    </MenuSectionCard>
  )
}
