// File Header: Displays information about the last loaded GitHub file.
import React from 'react'
import Button from '../../atom/Button'
import { integrationModeMeta } from './constants'
import { type LoadedFileInfo, type LocalizedNotice } from './types'
import { useI18n } from '../../../utils/i18n'

// Function Header: Shows summary details for the most recent GitHub file load.
type LastLoadedFileInfoProps = {
  lastLoadedFileInfo: LoadedFileInfo
  onSave?: () => void
  isSaving?: boolean
  saveNotice?: LocalizedNotice | null
}

export default function LastLoadedFileInfo({
  lastLoadedFileInfo,
  onSave,
  isSaving = false,
  saveNotice = null,
}: LastLoadedFileInfoProps): React.ReactElement {
  const { select } = useI18n()
  const modeMeta = integrationModeMeta.find((meta) => meta.id === lastLoadedFileInfo.mode)
  const modeLabel = modeMeta ? select(modeMeta.label.ja, modeMeta.label.en) : lastLoadedFileInfo.mode
  const shouldShowSaveButton = onSave && lastLoadedFileInfo.mode === 'repository'
  const resolvedSaveNotice = saveNotice ? select(saveNotice.message.ja, saveNotice.message.en) : null
  const saveNoticeToneClass = saveNotice?.tone === 'success' ? 'text-emerald-600' : 'text-red-600'

  return (
    <section
      className="rounded border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm"
      data-testid="github-last-loaded-info"
    >
      <p className="text-sm font-medium text-slate-700">{select('最後に読み込んだファイル', 'Last loaded file')}</p>
      <p className="mt-1">
        {select('パターン', 'Mode')}:{' '}
        <span className="font-mono text-slate-700">
          {modeLabel}
        </span>
      </p>
      <p>
        {select('リポジトリ', 'Repository')}:{' '}
        <span className="font-mono text-slate-700">
          {`${lastLoadedFileInfo.repository.owner}/${lastLoadedFileInfo.repository.repository}`}
        </span>
      </p>
      <p>
        {select('ブランチ / Ref', 'Branch / Ref')}:{' '}
        <span className="font-mono text-slate-700">{lastLoadedFileInfo.branch}</span>
      </p>
      <p>
        {select('ファイル', 'File')}:{' '}
        <span className="font-mono text-slate-700">{lastLoadedFileInfo.filePath}</span>
      </p>
      {shouldShowSaveButton && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            data-testid="github-last-loaded-save-button"
          >
            {isSaving ? select('保存中…', 'Saving…') : select('Update', 'Update')}
          </Button>
          {resolvedSaveNotice && saveNotice && (
            <p
              className={`text-xs ${saveNoticeToneClass}`}
              role={saveNotice.tone === 'success' ? 'status' : 'alert'}
              data-testid="github-last-loaded-save-message"
            >
              {resolvedSaveNotice}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
