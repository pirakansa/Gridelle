// File Header: Component responsible for YAML textarea interactions and related controls.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import Button from '../atom/Button'
import { buildButtonClassName } from '../atom/buttonStyles'
import { useI18n } from '../../utils/i18n'

type Props = {
  yamlBuffer: string
  notice: { text: string; tone: 'error' | 'success' } | null
  onChange: (_value: string) => void
  onApply: () => void
  onFileUpload: (_event: React.ChangeEvent<HTMLInputElement>) => void
  onDownload: () => void
  onCopy: () => Promise<void>
  onCreateNew: () => void
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
  onCreateNew,
}: Props): React.ReactElement {
  const { select } = useI18n()

  return (
    <section className={layoutTheme.card}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="yaml-input" className={layoutTheme.sectionTitle}>
            {select('YAML入力 / プレビュー', 'YAML input / preview')}
          </label>
          <textarea
            id="yaml-input"
            aria-label={select('YAML入力エリア', 'YAML input area')}
            data-testid="yaml-textarea"
            value={yamlBuffer}
            onChange={(event) => onChange(event.target.value)}
            className="h-56 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            spellCheck={false}
          />
          <p className={layoutTheme.helperText}>
            {select(
              '直接編集して「YAMLを反映」ボタンを押すか、ファイルを読み込んでテーブルに変換してください。',
              'Edit directly and click “Apply YAML”, or import a file to populate the table.',
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={onApply} disabled={!yamlBuffer.trim()}>
            {select('YAMLを反映', 'Apply YAML')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCreateNew} data-testid="yaml-create-new">
            {select('新規YAMLを作成', 'Create new YAML')}
          </Button>
          <label className={`${buildButtonClassName({ variant: 'ghost', size: 'md' })} cursor-pointer`}>
            {select('YAMLファイルを読み込む', 'Import a YAML file')}
            <input
              type="file"
              accept=".yml,.yaml,.json,text/yaml"
              className="sr-only"
              onChange={onFileUpload}
            />
          </label>
          <Button type="button" variant="ghost" onClick={onDownload}>
            {select('YAMLをダウンロード', 'Download YAML')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCopy}>
            {select('YAMLをコピー', 'Copy YAML')}
          </Button>
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
