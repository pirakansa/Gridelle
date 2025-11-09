#!/usr/bin/env node
/* eslint-env node */
/* global process, console */
// File Header: CLI utility generating a large sample YAML data set for Gridelle.
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import yaml from 'js-yaml'

const SHEET_COUNT = Number.parseInt(process.env.SHEET_COUNT ?? '5', 10)
const ROW_COUNT = Number.parseInt(process.env.ROW_COUNT ?? '200', 10)
const COLUMN_COUNT = Number.parseInt(process.env.COLUMN_COUNT ?? '15', 10)

if (!Number.isFinite(SHEET_COUNT) || SHEET_COUNT <= 0) {
  console.error('SHEET_COUNT must be a positive integer.')
  process.exitCode = 1
  process.exit()
}

if (!Number.isFinite(ROW_COUNT) || ROW_COUNT <= 0) {
  console.error('ROW_COUNT must be a positive integer.')
  process.exitCode = 1
  process.exit()
}

if (!Number.isFinite(COLUMN_COUNT) || COLUMN_COUNT <= 0) {
  console.error('COLUMN_COUNT must be a positive integer.')
  process.exitCode = 1
  process.exit()
}

const outputArg = process.argv[2]
const outputPath = resolve(process.cwd(), outputArg ?? 'docs/sample-large.yaml')

const columnKeys = Array.from({ length: COLUMN_COUNT }, (_, columnIndex) => `column_${columnIndex + 1}`)

function buildSheets() {
  const sheets = []
  for (let sheetIndex = 0; sheetIndex < SHEET_COUNT; sheetIndex += 1) {
    const rows = []
    for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
      const row = {}
      for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex += 1) {
        row[columnKeys[columnIndex]] = `S${sheetIndex + 1}-R${rowIndex + 1}-C${columnIndex + 1}`
      }
      rows.push(row)
    }
    sheets.push({
      name: `Sample Sheet ${sheetIndex + 1}`,
      rows,
    })
  }
  return sheets
}

async function main() {
  const sheets = buildSheets()
  const yamlContent = yaml.dump(
    sheets,
    {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    },
  )
  await writeFile(outputPath, yamlContent, 'utf8')
  console.log(
    `Generated YAML with ${SHEET_COUNT} sheet(s), ${ROW_COUNT} row(s) per sheet, and ${COLUMN_COUNT} column(s) per row.`,
  )
  console.log(`Output: ${outputPath}`)
}

main().catch((error) => {
  console.error('Failed to generate sample YAML.', error)
  process.exitCode = 1
})
