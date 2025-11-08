// File Header: Component responsible for showing the serialized YAML snapshot.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'

type Props = {
  tableYaml: string
}

// Function Header: Renders the current YAML output inside a styled block.
export default function OutputPanel({ tableYaml }: Props): React.ReactElement {
  return (
    <section className={layoutTheme.card}>
      <h2 className={layoutTheme.sectionTitle}>出力YAML</h2>
      <p className={layoutTheme.helperText}>現在のテーブル状態を常に反映します。</p>
      <pre className="mt-4 overflow-auto rounded-2xl bg-slate-900 p-4 text-sm text-slate-100">
        {tableYaml}
      </pre>
    </section>
  )
}
