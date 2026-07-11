import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const FEED = 'https://data.calgary.ca/resource/aeb8-fh2w.json?$limit=500'
const OUT_DIR = 'data/travel-times'
const STATE_FILE = path.join(OUT_DIR, '.last-update')
const HEADER = 'fetched_at,corridor,road_segment,travel_time_mins,last_update'

export function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

export function toCsvLines(rows, fetchedAt) {
  return [...rows]
    .sort((a, b) =>
      (a.corridor + a.road_segment).localeCompare(b.corridor + b.road_segment),
    )
    .map((r) =>
      [fetchedAt, r.corridor, r.road_segment, r.travel_time_mins, r.last_update]
        .map(csvEscape)
        .join(','),
    )
}

export function maxLastUpdate(rows) {
  return rows.reduce((max, r) => (r.last_update > max ? r.last_update : max), '')
}

async function main() {
  const res = await fetch(FEED)
  if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`)
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('feed returned no rows, skipping')
    return
  }

  const feedMax = maxLastUpdate(rows)
  const prevMax = existsSync(STATE_FILE) ? readFileSync(STATE_FILE, 'utf8').trim() : ''
  if (feedMax === prevMax) {
    console.log(`feed unchanged (last_update ${feedMax}), skipping`)
    return
  }

  const fetchedAt = new Date().toISOString()
  const monthFile = path.join(OUT_DIR, `${fetchedAt.slice(0, 7)}.csv`)
  mkdirSync(OUT_DIR, { recursive: true })
  if (!existsSync(monthFile)) appendFileSync(monthFile, HEADER + '\n')
  appendFileSync(monthFile, toCsvLines(rows, fetchedAt).join('\n') + '\n')
  writeFileSync(STATE_FILE, feedMax + '\n')
  console.log(`appended ${rows.length} rows to ${monthFile}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
