import { describe, it, expect } from 'vitest'
import { VOLUME_YEARS, volumeLineColor, volumeLineWidth } from './volumeStyle'
import { VOLUME_DATASETS } from '../../lib/datasets'

describe('VOLUME_YEARS', () => {
  it('covers 2016-2024 with 2020/2021 flagged unavailable', () => {
    expect(VOLUME_YEARS.map((y) => y.year)).toEqual([2024, 2023, 2022, 2019, 2018, 2017, 2016])
    expect(VOLUME_DATASETS[2020]).toBeNull()
    expect(VOLUME_DATASETS[2021]).toBeNull()
  })
})

describe('volume paint expressions', () => {
  it('builds interpolate expressions over the volume property', () => {
    expect(volumeLineColor(false)[0]).toBe('interpolate')
    expect(JSON.stringify(volumeLineColor(false))).toContain('to-number')
    expect(volumeLineWidth()[0]).toBe('interpolate')
  })
})
