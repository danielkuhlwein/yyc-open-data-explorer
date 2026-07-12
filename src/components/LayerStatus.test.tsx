import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LayerStatus from './LayerStatus'

describe('LayerStatus', () => {
  it('shows an error chip when the query errored', () => {
    render(<LayerStatus isError isFetching={false} dataUpdatedAt={0} />)
    expect(screen.getByText('unavailable — retrying')).toBeInTheDocument()
  })
  it('shows a loading chip while fetching with no data yet', () => {
    render(<LayerStatus isError={false} isFetching dataUpdatedAt={0} />)
    expect(screen.getByText('loading…')).toBeInTheDocument()
  })
  it('renders nothing when healthy', () => {
    const { container } = render(
      <LayerStatus isError={false} isFetching={false} dataUpdatedAt={Date.now()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
