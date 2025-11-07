// File Header: Top page rendering the YAML-driven spreadsheet preview.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import {
  deriveColumns,
  parseYamlTable,
  stringifyYamlTable,
  type TableRow,
} from '../../utils/yamlTable'

const DEFAULT_ROWS: TableRow[] = [
  { feature: 'テーブル編集', owner: 'Alice', status: 'READY', effort: '3' },
  { feature: 'YAML Export', owner: 'Bob', status: 'REVIEW', effort: '5' },
]
const DEFAULT_YAML = stringifyYamlTable(DEFAULT_ROWS)

const primaryButton =
  'rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500'
const ghostButton =
  'rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-800 disabled:border-slate-200 disabled:text-slate-400'

// Function Header: Builds the interactive YAML table playground described in README.md.
export default function App(): React.ReactElement {
  const [yamlBuffer, setYamlBuffer] = React.useState<string>(DEFAULT_YAML)
  const [rows, setRows] = React.useState<TableRow[]>(() =>
    DEFAULT_ROWS.map((row) => ({ ...row })),
  )
  const [notice, setNotice] = React.useState<{ text: string; tone: 'error' | 'success' } | null>(
    null,
  )
  const [newColumnName, setNewColumnName] = React.useState<string>('')

  const columns = React.useMemo(() => deriveColumns(rows), [rows])
  const tableYaml = React.useMemo(() => stringifyYamlTable(rows), [rows])

  const applyYamlBuffer = (): void => {
    try {
      const parsed = parseYamlTable(yamlBuffer)
      updateRows(parsed)
    } catch (error) {
      setNotice({ text: (error as Error).message, tone: 'error' })
      return
    }
    setNotice({ text: 'YAMLをテーブルに反映しました。', tone: 'success' })
  }

  const updateRows = (nextRows: TableRow[]): void => {
    setRows(nextRows)
    setYamlBuffer(stringifyYamlTable(nextRows))
    setNotice(null)
  }

  const handleCellChange = (rowIndex: number, columnKey: string, value: string): void => {
    const nextRows = rows.map((row, index) =>
      index === rowIndex ? { ...row, [columnKey]: value } : row,
    )
    updateRows(nextRows)
  }

  const handleAddRow = (): void => {
    const baseColumns = columns.length ? columns : ['column_1']
    const newRow: TableRow = baseColumns.reduce((acc, key) => {
      acc[key] = ''
      return acc
    }, {} as TableRow)
    updateRows([...rows, newRow])
  }

  const handleDeleteRow = (rowIndex: number): void => {
    const nextRows = rows.filter((_, index) => index !== rowIndex)
    updateRows(nextRows)
  }

  const handleAddColumn = (): void => {
    const trimmed = newColumnName.trim()
    if (!trimmed) {
      setNotice({ text: '列名を入力してください。', tone: 'error' })
      return
    }
    if (columns.includes(trimmed)) {
      setNotice({ text: '同名の列がすでに存在します。', tone: 'error' })
      return
    }

    const nextRows =
      rows.length === 0
        ? [{ [trimmed]: '' }]
        : rows.map((row) => ({
            ...row,
            [trimmed]: row[trimmed] ?? '',
          }))

    updateRows(nextRows)
    setNewColumnName('')
    setNotice({ text: `列「${trimmed}」を追加しました。`, tone: 'success' })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      setYamlBuffer(content)
      try {
        const parsed = parseYamlTable(content)
        updateRows(parsed)
        setNotice({ text: 'ファイルを読み込みました。', tone: 'success' })
      } catch (error) {
        setNotice({
          text: `アップロードしたファイルを解析できませんでした: ${(error as Error).message}`,
          tone: 'error',
        })
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleDownloadYaml = (): void => {
    const blob = new Blob([tableYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'table.yaml'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice({ text: 'table.yaml をダウンロードしました。', tone: 'success' })
  }

  const handleCopyYaml = async (): Promise<void> => {
    if (!navigator.clipboard) {
      setNotice({ text: 'クリップボードAPIが利用できません。', tone: 'error' })
      return
    }

    try {
      await navigator.clipboard.writeText(tableYaml)
      setNotice({ text: 'YAMLをクリップボードにコピーしました。', tone: 'success' })
    } catch {
      setNotice({ text: 'クリップボードへのコピーに失敗しました。', tone: 'error' })
    }
  }

  return (
    <div className={layoutTheme.pageShell}>
      <main className={layoutTheme.contentWrapper}>
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-full bg-blue-50 px-4 py-1 text-xs font-semibold text-blue-600">
            YAML ⇄ Table Preview
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">YAMLテーブルサンドボックス</h1>
            <p className="text-slate-600">
              READMEで定義した「YAMLをインポートし、スプレッドシート風に編集して再びYAMLに戻す」ための最小バージョンです。
            </p>
          </div>
        </header>

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
                onChange={(event) => setYamlBuffer(event.target.value)}
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
                className={primaryButton}
                onClick={applyYamlBuffer}
                disabled={!yamlBuffer.trim()}
              >
                YAMLを反映
              </button>
              <label className={`${ghostButton} cursor-pointer`}>
                YAMLファイルを読み込む
                <input
                  type="file"
                  accept=".yml,.yaml,.json,text/yaml"
                  className="sr-only"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                type="button"
                className={ghostButton}
                onClick={handleDownloadYaml}
                disabled={!rows.length}
              >
                YAMLをダウンロード
              </button>
              <button
                type="button"
                className={ghostButton}
                onClick={handleCopyYaml}
                disabled={!rows.length}
              >
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

        <section className="flex flex-col gap-4">
          <div className={layoutTheme.card}>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h2 className={layoutTheme.sectionTitle}>テーブル編集</h2>
                <p className={layoutTheme.helperText}>セルを直接編集できます。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={primaryButton} onClick={handleAddRow}>
                  行を追加
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="列名を入力"
                    value={newColumnName}
                    onChange={(event) => setNewColumnName(event.target.value)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button type="button" className={ghostButton} onClick={handleAddColumn}>
                    列を追加
                  </button>
                </div>
              </div>
            </div>
            <div className={`${layoutTheme.tableScroll} mt-6`}>
              {rows.length ? (
                <table className="spreadsheet-table">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                      <th aria-label="actions">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`row-${rowIndex}`} className="border-t border-slate-200">
                        {columns.map((column) => (
                          <td key={`${column}-${rowIndex}`} className="border border-slate-200">
                            <input
                              type="text"
                              value={row[column] ?? ''}
                              onChange={(event) =>
                                handleCellChange(rowIndex, column, event.target.value)
                              }
                              data-testid={`cell-${rowIndex}-${column}`}
                              className="w-full border-none bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                        ))}
                        <td className="border border-slate-200 text-center">
                          <button
                            type="button"
                            aria-label={`行${rowIndex + 1}を削除`}
                            className="text-xs font-semibold text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteRow(rowIndex)}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-slate-500">
                  <p>表示するデータがありません。</p>
                  <p>YAMLを読み込むか、行・列を追加して開始してください。</p>
                </div>
              )}
            </div>
          </div>

          <section className={layoutTheme.card}>
            <h2 className={layoutTheme.sectionTitle}>出力YAML</h2>
            <p className={layoutTheme.helperText}>現在のテーブル状態を常に反映します。</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-100">
              {tableYaml}
            </pre>
          </section>
        </section>
      </main>
    </div>
  )
}
