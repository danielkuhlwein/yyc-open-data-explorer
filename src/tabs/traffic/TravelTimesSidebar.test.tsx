import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TravelTimesSidebar from './TravelTimesSidebar'

describe('TravelTimesSidebar', () => {
  it('renders corridor headings and segment times', () => {
    render(
      <TravelTimesSidebar
        rows={[
          { corridor: 'Deerfoot Trail', road_segment: 'NB: A to B', travel_time_mins: '12', last_update: '2026-07-11T13:03:55.000' },
        ]}
      />,
    )
    expect(screen.getByText('Deerfoot Trail')).toBeInTheDocument()
    expect(screen.getByText('12 min')).toBeInTheDocument()
  })
})
