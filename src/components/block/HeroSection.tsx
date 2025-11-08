// File Header: Hero section displaying the page title and description.
import React from 'react'

// Function Header: Renders the hero badge and descriptive copy.
export default function HeroSection(): React.ReactElement {
  return (
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
  )
}
