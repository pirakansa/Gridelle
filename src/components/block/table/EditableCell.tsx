// File Header: Table cell component handling editing visuals, selection, and fill handle.
import React from 'react'
import type { TableCell } from '../../../services/workbookService'
import type { EditingCellState, SelectionRange } from '../../../pages/top/useSpreadsheetState'
import { useI18n } from '../../../utils/i18n'

type EditableCellProps = {
  column: string
  columnIndex: number
  rowIndex: number
  cell: TableCell | undefined
  selection: SelectionRange | null
  activeRange: SelectionRange | null
  fillPreview: SelectionRange | null
  isFillDragActive: boolean
  editingCell: EditingCellState | null
  onPointerDown: (_event: React.PointerEvent<HTMLTableCellElement>, _rowIndex: number, _columnIndex: number) => void
  onPointerEnter: (_rowIndex: number, _columnIndex: number) => void
  onCellClick: (_event: React.MouseEvent<HTMLTableCellElement>, _rowIndex: number, _columnIndex: number) => void
  onCellDoubleClick: (_rowIndex: number, _columnIndex: number) => void
  onCellChange: (_rowIndex: number, _column: string, _value: string) => void
  onStartFillDrag: (_event: React.PointerEvent<HTMLButtonElement>) => void
  onCellEditorBlur: () => void
  onCellEditorKeyDown: (_event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

// Function Header: Renders content/editing textarea along with selection/fill affordances.
export default function EditableCell({
  column,
  columnIndex,
  rowIndex,
  cell,
  selection,
  activeRange,
  fillPreview,
  isFillDragActive,
  editingCell,
  onPointerDown,
  onPointerEnter,
  onCellClick,
  onCellDoubleClick,
  onCellChange,
  onStartFillDrag,
  onCellEditorBlur,
  onCellEditorKeyDown,
}: EditableCellProps): React.ReactElement {
  const { select } = useI18n()
  const cellValue = cell?.value ?? ''
  const cellStyle = React.useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {}
    const bgColor = cell?.bgColor?.trim()
    const textColor = cell?.color?.trim()
    if (bgColor) {
      style.backgroundColor = bgColor
    }
    if (textColor) {
      style.color = textColor
    }
    return style
  }, [cell?.bgColor, cell?.color])

  const [draftValue, setDraftValue] = React.useState<string>(cellValue)
  const hasCommittedRef = React.useRef<boolean>(false)
  const discardRef = React.useRef<boolean>(false)

  const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.columnIndex === columnIndex

  React.useEffect(() => {
    if (isEditing) {
      hasCommittedRef.current = false
      discardRef.current = false
      if (editingCell?.replaceValue) {
        setDraftValue(editingCell.initialValue ?? '')
        return
      }
      setDraftValue(cellValue)
      return
    }
    setDraftValue((current) => (current === cellValue ? current : cellValue))
  }, [cellValue, editingCell, isEditing])

  const { className } = deriveCellPresentation({
    activeRange,
    selection,
    fillPreview,
    rowIndex,
    columnIndex,
  })

  const commitDraftValue = React.useCallback(() => {
    if (discardRef.current || hasCommittedRef.current) {
      return
    }
    hasCommittedRef.current = true
    if (draftValue !== cellValue) {
      onCellChange(rowIndex, column, draftValue)
    }
  }, [cellValue, column, draftValue, onCellChange, rowIndex])

  const handleEditorBlur = React.useCallback(() => {
    commitDraftValue()
    onCellEditorBlur()
  }, [commitDraftValue, onCellEditorBlur])

  const handleEditorKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Escape') {
        discardRef.current = true
        hasCommittedRef.current = true
        setDraftValue(cellValue)
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        commitDraftValue()
      }
      onCellEditorKeyDown(event)
    },
    [cellValue, commitDraftValue, onCellEditorKeyDown],
  )

  return (
    <td
      className={className}
      data-testid={`cell-box-${rowIndex}-${column}`}
      data-selected={
        activeRange && isCellWithinRange(activeRange, rowIndex, columnIndex) ? 'true' : undefined
      }
      onPointerDown={(event) => {
        if (editingCell && !isEditing) {
          const activeElement = document.activeElement
          if (activeElement instanceof HTMLElement) {
            activeElement.blur()
          }
        }
        if (!isEditing && !editingCell) {
          event.preventDefault()
        }
        onPointerDown(event, rowIndex, columnIndex)
      }}
      onPointerEnter={() => onPointerEnter(rowIndex, columnIndex)}
      onClick={(event) => onCellClick(event, rowIndex, columnIndex)}
      onDoubleClick={() => onCellDoubleClick(rowIndex, columnIndex)}
      onDragStart={(event) => event.preventDefault()}
      style={cellStyle}
    >
      <div className="flex h-full select-none items-start gap-1 px-1">
        {isEditing ? (
          <textarea
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            data-testid={`cell-${rowIndex}-${column}`}
            className="w-full flex-1 select-text resize-y rounded border border-blue-100 bg-white px-2 py-2 text-sm leading-relaxed focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            autoFocus
            rows={Math.max(1, draftValue.split('\n').length)}
            onBlur={handleEditorBlur}
            onKeyDown={handleEditorKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onPaste={(event) => event.stopPropagation()}
            draggable={false}
            style={cellStyle}
          />
        ) : (
          <div
            className="w-full flex-1 select-none whitespace-pre rounded px-2 py-2 text-left text-sm"
            data-testid={`cell-display-${rowIndex}-${column}`}
            draggable={false}
            style={cellStyle}
          >
            {cellValue}
          </div>
        )}
        {selection &&
          !isFillDragActive &&
          rowIndex === selection.endRow &&
          columnIndex === selection.endCol && (
            <button
              type="button"
              className="fill-handle"
              aria-label={select('塗りつぶしハンドル', 'Fill handle')}
              data-testid="fill-handle"
              onPointerDown={onStartFillDrag}
            />
          )}
      </div>
    </td>
  )
}

type CellClassArgs = {
  activeRange: SelectionRange | null
  selection: SelectionRange | null
  fillPreview: SelectionRange | null
  rowIndex: number
  columnIndex: number
}

type CellPresentation = {
  className: string
}

function deriveCellPresentation({
  activeRange,
  selection,
  fillPreview,
  rowIndex,
  columnIndex,
}: CellClassArgs): CellPresentation {
  const inActive = activeRange ? isCellWithinRange(activeRange, rowIndex, columnIndex) : false
  const inBase = selection ? isCellWithinRange(selection, rowIndex, columnIndex) : false
  const inFillPreview = fillPreview && inActive && !inBase

  const className = [
    'relative border border-slate-200',
    inActive ? 'selected-cell' : '',
    inFillPreview ? 'fill-preview-cell' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return { className }
}

function isCellWithinRange(
  range: SelectionRange | null,
  rowIndex: number,
  columnIndex: number,
): boolean {
  if (!range) {
    return false
  }
  return (
    rowIndex >= range.startRow &&
    rowIndex <= range.endRow &&
    columnIndex >= range.startCol &&
    columnIndex <= range.endCol
  )
}
