/// <reference types="vitest" />
import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App', () => {
  it('renders hoge text', () => {
    const { getByText } = render(<App />)
    expect(getByText('hoge')).toBeInTheDocument()
  })
})
