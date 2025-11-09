// File Header: Help panel summarizing support links and application metadata.
import React from 'react'
import MenuSectionCard from './MenuSectionCard'

const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0'

const supportLinks: Array<{ label: string; href: string; description: string }> = [
  {
    label: 'README (GitHub)',
    href: 'https://github.com/pirakansa/Gridelle#readme',
    description: 'セットアップ手順や主要な使い方を確認できます。',
  },
  {
    label: 'Discussions を作成',
    href: 'https://github.com/pirakansa/Gridelle/discussions',
    description: '不具合や改善要望がある場合はこちらから報告してください。',
  },
]

// Function Header: Renders helpful resources alongside the current application version.
export default function HelpSection(): React.ReactElement {
  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4 text-sm text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">バージョン</span>
          <code
            className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
            data-testid="app-version"
          >
            {appVersion}
          </code>
        </div>
        <div className="flex flex-col gap-3">
          {supportLinks.map((item) => (
            <div key={item.href} className="flex flex-wrap items-center gap-2">
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 transition hover:text-blue-800 hover:underline"
              >
                {item.label}
              </a>
              <span className="text-xs text-slate-500">{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </MenuSectionCard>
  )
}
