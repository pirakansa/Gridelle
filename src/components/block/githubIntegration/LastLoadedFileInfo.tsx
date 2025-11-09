// File Header: Displays information about the last loaded GitHub file.
import React from 'react'
import { integrationModeMeta } from './constants'
import { type LoadedFileInfo } from './types'

// Function Header: Shows summary details for the most recent GitHub file load.
type LastLoadedFileInfoProps = {
  lastLoadedFileInfo: LoadedFileInfo
}

export default function LastLoadedFileInfo({
  lastLoadedFileInfo,
}: LastLoadedFileInfoProps): React.ReactElement {
  return (
    <section
      className="rounded border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm"
      data-testid="github-last-loaded-info"
    >
      <p className="text-sm font-medium text-slate-700">最後に読み込んだファイル</p>
      <p className="mt-1">
        パターン:{' '}
        <span className="font-mono text-slate-700">
          {integrationModeMeta.find((meta) => meta.id === lastLoadedFileInfo.mode)?.label ?? lastLoadedFileInfo.mode}
        </span>
      </p>
      <p>
        リポジトリ:{' '}
        <span className="font-mono text-slate-700">
          {`${lastLoadedFileInfo.repository.owner}/${lastLoadedFileInfo.repository.repository}`}
        </span>
      </p>
      <p>
        ブランチ / Ref:{' '}
        <span className="font-mono text-slate-700">{lastLoadedFileInfo.branch}</span>
      </p>
      <p>
        ファイル:{' '}
        <span className="font-mono text-slate-700">{lastLoadedFileInfo.filePath}</span>
      </p>
    </section>
  )
}
