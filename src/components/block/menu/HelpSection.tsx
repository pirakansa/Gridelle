// File Header: Help panel summarizing support links and application metadata.
import React from 'react'
import MenuSectionCard from './MenuSectionCard'
import { useI18n } from '../../../utils/i18n'

const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0'

type SupportLink = {
  label: { ja: string; en: string }
  href: string
  description: { ja: string; en: string }
}

const supportLinks: SupportLink[] = [
  {
    label: { ja: 'README (GitHub)', en: 'README (GitHub)' },
    href: 'https://github.com/pirakansa/Gridelle#readme',
    description: {
      ja: 'セットアップ手順や主要な使い方を確認できます。',
      en: 'Review setup steps and primary usage.',
    },
  },
  {
    label: { ja: 'Discussions を作成', en: 'Open a discussion' },
    href: 'https://github.com/pirakansa/Gridelle/discussions',
    description: {
      ja: '不具合や改善要望がある場合はこちらから報告してください。',
      en: 'Report issues or feature requests via GitHub Discussions.',
    },
  },
]

// Function Header: Renders helpful resources alongside the current application version.
export default function HelpSection(): React.ReactElement {
  const { select } = useI18n()

  return (
    <MenuSectionCard>
      <div className="flex flex-col gap-4 text-sm text-slate-700">
        <div>
          <span className="font-semibold text-slate-900">{select('バージョン', 'Version')}</span>
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
                {select(item.label.ja, item.label.en)}
              </a>
              <span className="text-xs text-slate-500">{select(item.description.ja, item.description.en)}</span>
            </div>
          ))}
        </div>
      </div>
    </MenuSectionCard>
  )
}
