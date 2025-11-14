// File Header: Ribbon section for applying registered functions to selected cells.
import React from 'react'
import type { CellFunctionConfig } from '../../../services/workbookService'
import type { RegisteredFunctionMeta } from '../../../pages/top/utils/cellFunctionEngine'
import type { SelectionRange } from '../../../pages/top/types'
import { useI18n } from '../../../utils/i18n'

type MacroSectionProps = {
  columns: string[]
  sheetNames: string[]
  currentSheetName: string
  sheetColumns: Record<string, string[]>
  selectionRange: SelectionRange | null
  hasSelection: boolean
  availableFunctions: RegisteredFunctionMeta[]
  onApplyFunction: (_config: CellFunctionConfig | null) => void
}

type LocalizedMessage = {
  readonly ja: string
  readonly en: string
}

function createMessage(ja: string, en: string): LocalizedMessage {
  return { ja, en }
}

type CellReferenceDraft = {
  id: string
  row: string
  columnKey: string
  sheetName: string
}

// Function Header: Provides function selection and cell reference controls.
export default function MacroSection({
  columns,
  sheetNames,
  currentSheetName,
  sheetColumns,
  selectionRange,
  hasSelection,
  availableFunctions,
  onApplyFunction,
}: MacroSectionProps): React.ReactElement {
  const { select } = useI18n()
  const [selectedFunctionId, setSelectedFunctionId] = React.useState<string>('')
  const cellRefSequence = React.useRef<number>(0)
  const [cellReferences, setCellReferences] = React.useState<CellReferenceDraft[]>([])
  const [status, setStatus] = React.useState<LocalizedMessage | null>(null)
  const [error, setError] = React.useState<LocalizedMessage | null>(null)

  const getColumnsForSheet = React.useCallback(
    (sheetName: string): string[] => {
      const custom = sheetColumns[sheetName]
      if (custom && custom.length) {
        return custom
      }
      return columns
    },
    [columns, sheetColumns],
  )

  const createCellReference = React.useCallback(
    (overrides?: Partial<Pick<CellReferenceDraft, 'row' | 'columnKey' | 'sheetName'>>): CellReferenceDraft => {
      const id = `cell-ref-${cellRefSequence.current}`
      cellRefSequence.current += 1
      const defaultSheet = currentSheetName || sheetNames[0] || ''
      const availableColumns = getColumnsForSheet(defaultSheet)
      return {
        id,
        row: '',
        columnKey: availableColumns[0] ?? '',
        sheetName: defaultSheet,
        ...overrides,
      }
    },
    [currentSheetName, getColumnsForSheet, sheetNames],
  )

  React.useEffect(() => {
    if (!selectedFunctionId && availableFunctions.length) {
      setSelectedFunctionId(availableFunctions[0]?.id ?? '')
    }
  }, [availableFunctions, selectedFunctionId])

  React.useEffect(() => {
    setCellReferences((prev) => {
      if (!prev.length) {
        return prev
      }
      let didChange = false
      const next = prev.map((ref) => {
        const available = getColumnsForSheet(ref.sheetName || currentSheetName)
        if (!available.length) {
          if (ref.columnKey) {
            didChange = true
            return { ...ref, columnKey: '' }
          }
          return ref
        }
        if (!available.includes(ref.columnKey)) {
          didChange = true
          return { ...ref, columnKey: available[0] }
        }
        return ref
      })
      return didChange ? next : prev
    })
  }, [currentSheetName, getColumnsForSheet])

  React.useEffect(() => {
    setCellReferences((prev) => {
      if (!prev.length) {
        return prev
      }
      const fallbackSheet = currentSheetName || sheetNames[0] || ''
      const validSheets = sheetNames.length ? sheetNames : [fallbackSheet]
      let didChange = false
      const next = prev.map((ref) => {
        if (!ref.sheetName || !validSheets.includes(ref.sheetName)) {
          didChange = true
          return { ...ref, sheetName: fallbackSheet }
        }
        return ref
      })
      return didChange ? next : prev
    })
  }, [currentSheetName, sheetNames])

  const canAddCells = sheetNames.some((name) => getColumnsForSheet(name).length > 0)
  const canImportSelection = Boolean(selectionRange && getColumnsForSheet(currentSheetName).length)

  const handleAddCellReference = React.useCallback(() => {
    setCellReferences((prev) => [...prev, createCellReference()])
  }, [createCellReference])

  const handleRemoveCellReference = React.useCallback((id: string): void => {
    setCellReferences((prev) => prev.filter((ref) => ref.id !== id))
  }, [])

  const handleChangeCellReferenceRow = React.useCallback((id: string, value: string): void => {
    setCellReferences((prev) => prev.map((ref) => (ref.id === id ? { ...ref, row: value } : ref)))
  }, [])

  const handleChangeCellReferenceColumn = React.useCallback((id: string, value: string): void => {
    setCellReferences((prev) => prev.map((ref) => (ref.id === id ? { ...ref, columnKey: value } : ref)))
  }, [])

  const handleChangeCellReferenceSheet = React.useCallback((id: string, value: string): void => {
    setCellReferences((prev) => prev.map((ref) => (ref.id === id ? { ...ref, sheetName: value } : ref)))
  }, [])

  const handleClearCellReferences = React.useCallback((): void => {
    setCellReferences([])
  }, [])

  const handleImportSelectionAsInputs = React.useCallback((): void => {
    setStatus(null)
    setError(null)
    if (!selectionRange) {
      setError(
        createMessage('入力として追加するセル範囲を選択してください。', 'Select the cells you want to add as inputs.'),
      )
      return
    }
    const appended: CellReferenceDraft[] = []
    for (let rowIndex = selectionRange.startRow; rowIndex <= selectionRange.endRow; rowIndex += 1) {
      for (let columnIndex = selectionRange.startCol; columnIndex <= selectionRange.endCol; columnIndex += 1) {
        const columnKey = columns[columnIndex]
        if (!columnKey) {
          continue
        }
        appended.push(createCellReference({ row: String(rowIndex + 1), columnKey, sheetName: currentSheetName }))
      }
    }
    if (!appended.length) {
      setError(
        createMessage(
          '選択範囲に有効な列がありません。列を追加してから再度お試しください。',
          'The selection does not include valid columns. Add columns and try again.',
        ),
      )
      return
    }
    const existingKeys = new Set(cellReferences.map((ref) => `${ref.sheetName}:${ref.row}:${ref.columnKey}`))
    const deduped = appended.filter((ref) => {
      const key = `${ref.sheetName}:${ref.row}:${ref.columnKey}`
      if (existingKeys.has(key)) {
        return false
      }
      existingKeys.add(key)
      return true
    })
    if (!deduped.length) {
      setStatus(
        createMessage(
          '選択したセルはすでに入力リストに含まれています。',
          'The selected cells are already included in the input list.',
        ),
      )
      return
    }
    setCellReferences((prev) => [...prev, ...deduped])
    setStatus(
      createMessage(
        '入力セルとして範囲を追加しました。結果を書き込むセルを再度選択してから適用してください。',
        'Added the selection as input cells. Reselect the destination cells before applying.',
      ),
    )
  }, [cellReferences, columns, createCellReference, currentSheetName, selectionRange])

  const handleApplyFunction = (): void => {
    setStatus(null)
    setError(null)
    if (!hasSelection) {
      setError(createMessage('関数を適用するセルを選択してください。', 'Select cells before applying a function.'))
      return
    }
    if (!selectedFunctionId) {
      setError(createMessage('適用する関数を選択してください。', 'Choose a function to apply.'))
      return
    }
    if (!cellReferences.length) {
      setError(createMessage('入力セルを最低1つ追加してください。', 'Add at least one input cell before applying.'))
      return
    }
    let hasInvalidReference = false
    const normalizedCells = cellReferences
      .map((reference) => {
        const columnKey = reference.columnKey?.trim()
        const parsedRow = Number(reference.row)
        const sheetName = reference.sheetName?.trim() || currentSheetName
        if (!columnKey || !Number.isFinite(parsedRow) || parsedRow < 1 || !sheetName) {
          hasInvalidReference = true
          return null
        }
        if (sheetNames.length && !sheetNames.includes(sheetName)) {
          hasInvalidReference = true
          return null
        }
        return {
          row: Math.round(parsedRow),
          key: columnKey,
          sheet: sheetName,
        }
      })
      .filter((entry): entry is { row: number; key: string; sheet: string } => entry !== null)

    if (!normalizedCells.length) {
      setError(createMessage('入力セルを最低1つ追加してください。', 'Add at least one input cell before applying.'))
      return
    }

    if (hasInvalidReference) {
      setError(
        createMessage('入力セルの行番号と列を確認してください。', 'Check the row numbers and columns for the input cells.'),
      )
      return
    }

    onApplyFunction({
      name: selectedFunctionId,
      args: {
        cells: normalizedCells,
      },
    })
  }

  const handleClearFunction = (): void => {
    setStatus(null)
    setError(null)
    onApplyFunction(null)
  }

  const statusText = status ? select(status.ja, status.en) : null
  const errorText = error ? select(error.ja, error.en) : null

  return (
    <section aria-label={select('関数適用', 'Apply functions')} className="space-y-4">
      <div className="rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-900">{select('関数を選択セルに適用', 'Apply a function')}</h3>
          <p className="text-xs text-slate-500">
            {select('入力セルを登録してから適用します。', 'Register input cells before applying.')}
          </p>
        </div>
        <div className="mt-3 space-y-3">
          <label className="flex flex-col text-xs font-semibold text-slate-700 sm:flex-row sm:items-center sm:gap-3">
            <span>{select('利用可能な関数', 'Available functions')}</span>
            <select
              value={selectedFunctionId}
              onChange={(event) => setSelectedFunctionId(event.target.value)}
              className="mt-1 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:mt-0"
              data-testid="macro-function-select"
            >
              {availableFunctions.length === 0 && (
                <option value="">{select('関数が登録されていません', 'No functions registered')}</option>
              )}
              {availableFunctions.map((fn) => (
                <option key={fn.id} value={fn.id}>
                  {fn.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span>{select(`入力セル: ${cellReferences.length} 件`, `Input cells: ${cellReferences.length}`)}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                onClick={handleAddCellReference}
                disabled={!canAddCells}
              >
                {select('セルを追加', 'Add')}
              </button>
              <button
                type="button"
                className="rounded border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-white disabled:opacity-50"
                onClick={handleImportSelectionAsInputs}
                disabled={!canImportSelection}
              >
                {select('選択を追加', 'Use selection')}
              </button>
              <button
                type="button"
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                onClick={handleClearCellReferences}
                disabled={!cellReferences.length}
              >
                {select('クリア', 'Clear')}
              </button>
            </div>
          </div>
          {cellReferences.length === 0 ? (
            <p className="rounded border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
              {select('参照セルが未設定です。上のボタンから追加してください。', 'No input cells configured. Use the buttons above.')}
            </p>
          ) : (
            <div className="max-h-72 overflow-auto rounded border border-slate-200">
              <table className="min-w-full text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">{select('行番号', 'Row')}</th>
                    <th className="px-2 py-2 text-left">{select('列', 'Column')}</th>
                    <th className="px-2 py-2 text-left">{select('シート', 'Sheet')}</th>
                    <th className="px-2 py-2 text-left">{select('操作', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cellReferences.map((reference, index) => {
                    const sheetKey = reference.sheetName || currentSheetName
                    const availableColumns = getColumnsForSheet(sheetKey)
                    return (
                      <tr key={reference.id} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            min={1}
                            value={reference.row}
                            onChange={(event) => handleChangeCellReferenceRow(reference.id, event.target.value)}
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder={String(index + 1)}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={reference.columnKey}
                            onChange={(event) => handleChangeCellReferenceColumn(reference.id, event.target.value)}
                            className="min-w-[7rem] rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            {availableColumns.length === 0 && <option value="">{select('列がありません', 'No columns')}</option>}
                            {availableColumns.map((column) => (
                              <option key={column} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={reference.sheetName}
                            onChange={(event) => handleChangeCellReferenceSheet(reference.id, event.target.value)}
                            className="min-w-[7rem] rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          >
                            {sheetNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            onClick={() => handleRemoveCellReference(reference.id)}
                          >
                            {select('削除', 'Remove')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              onClick={handleApplyFunction}
              disabled={!hasSelection}
              data-testid="apply-macro-button"
            >
              {select('選択セルに適用', 'Apply to selection')}
            </button>
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={handleClearFunction}
            >
              {select('関数をクリア', 'Clear function')}
            </button>
          </div>
        </div>
      </div>
      {(statusText || errorText) && (
        <p className={`text-sm ${errorText ? 'text-red-600' : 'text-emerald-600'}`} role={errorText ? 'alert' : 'status'}>
          {errorText ?? statusText}
        </p>
      )}
    </section>
  )
}

