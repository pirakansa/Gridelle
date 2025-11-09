// File Header: Page-level component orchestrating the spreadsheet playground layout.
import React from 'react'
import { layoutTheme } from '../../utils/Theme'
import { useSpreadsheetState } from './useSpreadsheetState'
import SpreadsheetTable from '../../components/block/SpreadsheetTable'
import MenuHeader from '../../components/block/MenuHeader'
import YamlPanel from '../../components/block/YamlPanel'
import SettingsOverlay from '../../components/block/SettingsOverlay'

// Function Header: Composes the top page using modular sub-components wired to state hooks.
export default function App(): React.ReactElement {
  const spreadsheet = useSpreadsheetState()
  const [isYamlInputOpen, setYamlInputOpen] = React.useState<boolean>(false)

  const openYamlInput = React.useCallback(() => {
    setYamlInputOpen(true)
  }, [])

  const closePanel = React.useCallback(() => {
    setYamlInputOpen(false)
  }, [])

  return (
    <div className={layoutTheme.pageShell}>
      <MenuHeader
        onYamlInputClick={openYamlInput}
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
      />
      <main className={layoutTheme.contentWrapper}>
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
      </main>
      {isYamlInputOpen && (
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
    </div>
  )
}
