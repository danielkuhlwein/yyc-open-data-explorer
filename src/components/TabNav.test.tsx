import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import TabNav from './TabNav'

describe('TabNav', () => {
  it('renders links to the three tabs', () => {
    render(
      <MemoryRouter>
        <TabNav />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Traffic' })).toHaveAttribute('href', '/traffic')
    expect(screen.getByRole('link', { name: 'Parking' })).toHaveAttribute('href', '/parking')
    expect(screen.getByRole('link', { name: 'Development' })).toHaveAttribute('href', '/development')
  })
})
