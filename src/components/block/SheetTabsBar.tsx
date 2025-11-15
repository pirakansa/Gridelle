// File Header: Bottom tab bar to switch between sheets quickly.
import React from 'react'
import { useI18n } from '../../utils/i18n'

type Props = {
  sheetNames: string[]
  activeSheetIndex: number
  onSelectSheet: (_index: number) => void
  onAddSheet: () => void
  onDeleteSheet: (_index: number) => void
  onRenameSheet: (_index: number, _name: string) => void
}

// Function Header: Renders horizontally scrollable sheet tabs similar to spreadsheet apps.
export default function SheetTabsBar({
  sheetNames,
  activeSheetIndex,
  onSelectSheet,
  onAddSheet,
  onDeleteSheet,
  onRenameSheet,
}: Props): React.ReactElement {
  const { select } = useI18n()
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [nameDraft, setNameDraft] = React.useState<string>('')

  const beginRename = (index: number) => {
    setEditingIndex(index)
    setNameDraft(sheetNames[index] ?? '')
  }

  const commitRename = (index: number) => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== sheetNames[index]) {
      onRenameSheet(index, trimmed)
    }
    setEditingIndex(null)
  }

  const cancelRename = () => {
    setEditingIndex(null)
    setNameDraft('')
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
      <div className="flex-1 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2">
          {sheetNames.map((name, index) => {
            const isActive = index === activeSheetIndex
            return (
              <div
                key={name}
                data-testid={`sheet-tab-${index}`}
                onDoubleClick={() => beginRename(index)}
                className={`group flex min-w-[8rem] select-none items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-blue-200 ${
                  isActive ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {editingIndex === index ? (
                  <input
                    data-testid="sheet-name-input"
                    className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                    value={nameDraft}
                    autoFocus
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={() => commitRename(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        commitRename(index)
                      } else if (event.key === 'Escape') {
                        cancelRename()
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectSheet(index)}
                    aria-pressed={isActive}
                    className="flex-1 text-left"
                  >
                    {name}
                  </button>
                )}
                <button
                  type="button"
                  data-testid={`delete-sheet-button-${index}`}
                  onClick={() => onDeleteSheet(index)}
                  disabled={sheetNames.length <= 1}
                  className="rounded-full border border-transparent px-2 py-0.5 text-xs text-slate-500 transition hover:border-red-200 hover:bg-white hover:text-red-600 disabled:opacity-50"
                  title={select('シートを削除', 'Delete sheet')}
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <button
        type="button"
        data-testid="add-sheet-button"
        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        onClick={onAddSheet}
      >
        {select('シートを追加', 'Add sheet')}
      </button>
    </div>
  )
}
