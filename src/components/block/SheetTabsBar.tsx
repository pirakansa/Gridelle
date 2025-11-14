// File Header: Bottom tab bar to switch between sheets quickly.
import React from 'react'
import { useI18n } from '../../utils/i18n'

type Props = {
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  onAddSheet: () => void
}

// Function Header: Renders horizontally scrollable sheet tabs similar to spreadsheet apps.
export default function SheetTabsBar({ sheetNames, activeSheetIndex, onSelectSheet, onAddSheet }: Props): React.ReactElement {
  const { select } = useI18n()
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          {sheetNames.map((name, index) => {
            const isActive = index === activeSheetIndex
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelectSheet(index)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                  isActive ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                aria-pressed={isActive}
              >
                {name}
              </button>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        onClick={onAddSheet}
      >
        {select('シートを追加', 'Add sheet')}
      </button>
    </div>
  )
}

