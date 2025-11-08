// File Header: Page-level component orchestrating the spreadsheet playground layout.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import { useSpreadsheetState } from './useSpreadsheetState'
import HeroSection from '../../components/block/HeroSection'
import TableEditorPanel from '../../components/block/TableEditorPanel'
import SpreadsheetTable from '../../components/block/SpreadsheetTable'
import MenuHeader from '../../components/block/MenuHeader'

// Function Header: Composes the top page using modular sub-components wired to state hooks.
export default function App(): React.ReactElement {
  const spreadsheet = useSpreadsheetState()

  return (
    <div className={layoutTheme.pageShell}>
      <MenuHeader />
      <main className={layoutTheme.contentWrapper}>
        <HeroSection />
        <TableEditorPanel
          notice={spreadsheet.notice}
          newColumnName={spreadsheet.newColumnName}
          onColumnNameChange={spreadsheet.setNewColumnName}
          onAddRow={spreadsheet.handleAddRow}
          onAddColumn={spreadsheet.handleAddColumn}
          selectionSummary={spreadsheet.selectionSummary}
          onClearSelection={spreadsheet.clearSelection}
          hasSelection={Boolean(spreadsheet.selection)}
          bulkValue={spreadsheet.bulkValue}
          onBulkValueChange={spreadsheet.setBulkValue}
          onBulkApply={spreadsheet.applyBulkInput}
        >
          <SpreadsheetTable
            rows={spreadsheet.rows}
            columns={spreadsheet.columns}
            activeRange={spreadsheet.activeRange}
            selection={spreadsheet.selection}
            fillPreview={spreadsheet.fillPreview}
            isFillDragActive={spreadsheet.isFillDragActive}
            editingCell={spreadsheet.editingCell}
            onPointerDown={spreadsheet.handleCellPointerDown}
            onPointerEnter={spreadsheet.handleCellPointerEnter}
            onCellClick={spreadsheet.handleCellClick}
            onCellDoubleClick={spreadsheet.handleCellDoubleClick}
            onTableKeyDown={spreadsheet.handleTableKeyDown}
            onStartFillDrag={spreadsheet.startFillDrag}
            onCellChange={spreadsheet.handleCellChange}
            onCopyCell={spreadsheet.handleCopyCell}
            onPaste={spreadsheet.handlePaste}
            onMoveColumn={spreadsheet.moveColumn}
            onDeleteRow={spreadsheet.handleDeleteRow}
            onCellEditorBlur={spreadsheet.handleCellEditorBlur}
            onCellEditorKeyDown={spreadsheet.handleCellEditorKeyDown}
          />
        </TableEditorPanel>
      </main>
    </div>
  )
}
