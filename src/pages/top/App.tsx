// File Header: Page-level component orchestrating the spreadsheet playground layout.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import { useSpreadsheetState } from './useSpreadsheetState'
import TableEditorPanel from '../../components/block/TableEditorPanel'
import SpreadsheetTable from '../../components/block/SpreadsheetTable'
import MenuHeader from '../../components/block/MenuHeader'
import YamlPanel from '../../components/block/YamlPanel'
import OutputPanel from '../../components/block/OutputPanel'
import SettingsOverlay from '../../components/block/SettingsOverlay'

// Function Header: Composes the top page using modular sub-components wired to state hooks.
export default function App(): React.ReactElement {
  const spreadsheet = useSpreadsheetState()
  const [activePanel, setActivePanel] = React.useState<'input' | 'output' | null>(null)

  const openYamlInput = React.useCallback(() => {
    setActivePanel('input')
  }, [])

  const openYamlOutput = React.useCallback(() => {
    setActivePanel('output')
  }, [])

  const closePanel = React.useCallback(() => {
    setActivePanel(null)
  }, [])

  return (
    <div className={layoutTheme.pageShell}>
      <MenuHeader onYamlInputClick={openYamlInput} onYamlOutputClick={openYamlOutput} />
      <main className={layoutTheme.contentWrapper}>
        <TableEditorPanel
          notice={spreadsheet.notice}
          sheetNames={spreadsheet.sheets.map((sheet) => sheet.name)}
          activeSheetIndex={spreadsheet.activeSheetIndex}
          onSelectSheet={spreadsheet.handleSelectSheet}
          currentSheetName={spreadsheet.currentSheetName}
          onRenameSheet={spreadsheet.handleRenameSheet}
          onAddSheet={spreadsheet.handleAddSheet}
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
            onRowNumberClick={spreadsheet.handleRowNumberClick}
            onPointerDown={spreadsheet.handleCellPointerDown}
            onPointerEnter={spreadsheet.handleCellPointerEnter}
            onCellClick={spreadsheet.handleCellClick}
            onCellDoubleClick={spreadsheet.handleCellDoubleClick}
            onTableKeyDown={spreadsheet.handleTableKeyDown}
            onStartFillDrag={spreadsheet.startFillDrag}
            onCellChange={spreadsheet.handleCellChange}
            onPaste={spreadsheet.handlePaste}
            onMoveColumn={spreadsheet.moveColumn}
            onDeleteRow={spreadsheet.handleDeleteRow}
            onCellEditorBlur={spreadsheet.handleCellEditorBlur}
            onCellEditorKeyDown={spreadsheet.handleCellEditorKeyDown}
          />
        </TableEditorPanel>
      </main>
      {activePanel === 'input' && (
        <SettingsOverlay
          title="YAML入力 / プレビュー"
          description="YAMLを編集してテーブルへ反映できます。"
          onClose={closePanel}
          panelId="yaml-input"
        >
          <YamlPanel
            yamlBuffer={spreadsheet.yamlBuffer}
            notice={spreadsheet.notice}
            onChange={spreadsheet.setYamlBuffer}
            onApply={spreadsheet.applyYamlBuffer}
            onFileUpload={spreadsheet.handleFileUpload}
            onDownload={spreadsheet.handleDownloadYaml}
            onCopy={spreadsheet.handleCopyYaml}
          />
        </SettingsOverlay>
      )}
      {activePanel === 'output' && (
        <SettingsOverlay
          title="YAML出力"
          description="現在のテーブル状態をYAMLで確認できます。"
          onClose={closePanel}
          panelId="yaml-output"
        >
          <OutputPanel tableYaml={spreadsheet.tableYaml} />
        </SettingsOverlay>
      )}
    </div>
  )
}
