// File Header: Component responsible for YAML textarea interactions and related controls.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import { ghostButtonClass, primaryButtonClass } from '../constants'

type Props = {
  yamlBuffer: string
  notice: { text: string; tone: 'error' | 'success' } | null
  onChange: (_value: string) => void
  onApply: () => void
  onFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  onDownload: () => void
  onCopy: () => Promise<void>
}

// Function Header: Renders YAML editor textarea and import/export buttons.
export default function YamlPanel({
  yamlBuffer,
  notice,
  onChange,
  onApply,
  onFileUpload,
  onDownload,
  onCopy,
}: Props): React.ReactElement {
  return (
    <section className={layoutTheme.card}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="yaml-input" className={layoutTheme.sectionTitle}>
            YAML入力 / プレビュー
          </label>
          <textarea
            id="yaml-input"
            aria-label="YAML入力エリア"
            data-testid="yaml-textarea"
            value={yamlBuffer}
            onChange={(event) => onChange(event.target.value)}
            className="h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            spellCheck={false}
          />
          <p className={layoutTheme.helperText}>
            直接編集して「YAMLを反映」ボタンを押すか、ファイルを読み込んでテーブルに変換してください。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={onApply}
            disabled={!yamlBuffer.trim()}
          >
            YAMLを反映
          </button>
          <label className={`${ghostButtonClass} cursor-pointer`}>
            YAMLファイルを読み込む
            <input
              type="file"
              accept=".yml,.yaml,.json,text/yaml"
              className="sr-only"
              onChange={onFileUpload}
            />
          </label>
          <button type="button" className={ghostButtonClass} onClick={onDownload}>
            YAMLをダウンロード
          </button>
          <button type="button" className={ghostButtonClass} onClick={onCopy}>
            YAMLをコピー
          </button>
        </div>

        {notice && (
          <p
            className={`text-sm ${
              notice.tone === 'error' ? 'text-red-600' : 'text-emerald-600'
            }`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
          >
            {notice.text}
          </p>
        )}
      </div>
    </section>
  )
}
