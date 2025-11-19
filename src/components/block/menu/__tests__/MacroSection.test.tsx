import type { ComponentProps } from 'react'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MacroSection from '../MacroSection'

const SELF_REFERENCE_TOKEN = '@self'

type MacroSectionProps = ComponentProps<typeof MacroSection>

const baseProps: MacroSectionProps = {
  columns: ['feature', 'status'],
  sheetNames: ['Sheet 1'],
  currentSheetName: 'Sheet 1',
  sheetColumns: { 'Sheet 1': ['feature', 'status'] },
  selectionRange: null,
  hasSelection: true,
  availableFunctions: [
    {
      id: 'sum',
      label: 'Sum',
      description: 'Sum available',
      source: 'builtin',
    },
  ],
  onApplyFunction: vi.fn(),
}

const renderMacroSection = (overrideProps?: Partial<MacroSectionProps>) => {
  const props: MacroSectionProps = {
    ...baseProps,
    onApplyFunction: vi.fn(),
    ...overrideProps,
  }
  render(<MacroSection {...props} />)
  return props
}

describe('MacroSection', () => {
  it('allows submitting @self rows through the macro UI', async () => {
    const user = userEvent.setup()
    const props = renderMacroSection()

    await waitFor(() => expect(screen.getByTestId('macro-function-select')).toHaveValue('sum'))

    await user.click(screen.getByRole('button', { name: 'セルを追加' }))
    const rowInput = screen.getByPlaceholderText('1') as HTMLInputElement
    await user.clear(rowInput)
    await user.type(rowInput, SELF_REFERENCE_TOKEN)

    await user.click(screen.getByRole('button', { name: '選択セルに適用' }))

    expect(props.onApplyFunction).toHaveBeenCalledTimes(1)
    expect(props.onApplyFunction).toHaveBeenCalledWith({
      name: 'sum',
      args: {
        cells: [
          {
            row: SELF_REFERENCE_TOKEN,
            key: 'feature',
            sheet: 'Sheet 1',
          },
        ],
      },
    })
  })

  it('exposes @self as a selectable column target', async () => {
    const user = userEvent.setup()
    const props = renderMacroSection()

    await waitFor(() => expect(screen.getByTestId('macro-function-select')).toHaveValue('sum'))

    await user.click(screen.getByRole('button', { name: 'セルを追加' }))
    const rowInput = screen.getByPlaceholderText('1') as HTMLInputElement
    await user.clear(rowInput)
    await user.type(rowInput, '1')

    const columnSelect = screen.getByDisplayValue('feature') as HTMLSelectElement
    await user.selectOptions(columnSelect, SELF_REFERENCE_TOKEN)

    await user.click(screen.getByRole('button', { name: '選択セルに適用' }))

    expect(props.onApplyFunction).toHaveBeenCalledTimes(1)
    expect(props.onApplyFunction).toHaveBeenCalledWith({
      name: 'sum',
      args: {
        cells: [
          {
            row: 1,
            key: SELF_REFERENCE_TOKEN,
            sheet: 'Sheet 1',
          },
        ],
      },
    })
  })
})
