# YYC Open Data Explorer v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local-first React web app with three map tabs (Traffic, Parking, Development) over Calgary's Socrata open data, plus a GitHub Actions git scraper that starts accumulating Travel Times history immediately.

**Architecture:** Pure client-side SPA — the browser queries `data.calgary.ca` SODA endpoints directly with SoQL doing all filtering server-side. One typed SODA module feeds TanStack Query hooks; MapLibre renders layers; Zustand holds viewport + layer toggles. A standalone Node script (no app dependencies) snapshots Travel Times to CSV via scheduled GitHub Actions.

**Tech Stack:** Vite 8 + React 19 + TypeScript 6 (strict), `react-map-gl/maplibre` v8 + MapLibre GL JS 5, OpenFreeMap basemaps (`positron` light / `dark` dark), TanStack Query v5, Zustand v5, React Router v8 (imports from `react-router` — the v8-required style; `react-router-dom` no longer exists), Tailwind CSS v4 (`@tailwindcss/vite`), Vitest + React Testing Library. (Majors updated after Task 1 installed newer versions than originally drafted; all planned imports verified against the installed majors.)

**Spec:** `docs/superpowers/specs/2026-07-11-yyc-open-data-explorer-design.md` — dataset IDs, scope cuts, and risks live there.

**Conventions for every task:**
- Commit messages are a single subject line — no body, no trailers, no `Co-Authored-By`.
- Working directory is the repo root `~/Developer/yyc-open-data-explorer`.
- "Run: `npm test`" always means the full suite; expected output shows the relevant portion.

**Color constants (validated with the dataviz palette validator against both basemap surfaces):**

| Role | Light mode | Dark mode |
|---|---|---|
| Live incident marker | `#d03b3b` | `#d03b3b` |
| Camera marker | `#2a78d6` | `#3987e5` |
| Notice marker | `#eda100` | `#c98500` |
| Dev permit marker | `#4a3aa7` | `#9085e9` |
| Building permit bubble | `#eb6834` | `#d95926` |
| Free parking curb | `#1baf7a` | `#199e70` |
| No-parking-now curb | `#d03b3b` | `#e66767` |
| Unparsed curb | `#898781` | `#898781` |
| Sequential ramp (rates, volumes, heatmap) | blue `#cde2fb→#0d366b` | inverted lightness (see code) |

All point markers get a 2px white (`#ffffff` / dark `#161622`) stroke ring — this is the contrast relief for the amber/orange WARNs on light basemaps.

---

### Task 1: Scaffold the app

**Files:**
- Create: entire Vite scaffold at repo root (`package.json`, `vite.config.ts`, `index.html`, `src/*`, `tsconfig*.json`, `.gitignore`)
- Create: `src/test-setup.ts`
- Modify: `src/index.css` (replace scaffold CSS)
- Delete: scaffold demo files (`src/App.css`, `src/assets/react.svg`, `public/vite.svg`)

- [ ] **Step 1: Scaffold Vite into the existing repo**

create-vite refuses non-empty dirs interactively, so scaffold to a temp dir and move in:

```bash
cd ~/Developer/yyc-open-data-explorer
npm create vite@latest tmp-scaffold -- --template react-ts
rsync -a tmp-scaffold/ ./ --exclude .git
rm -rf tmp-scaffold
```

Expected: `package.json`, `vite.config.ts`, `src/` now exist at repo root; `README.md` was NOT overwritten by rsync only if create-vite's readme differs — check `git diff README.md` and `git checkout -- README.md` if it was clobbered.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install react-map-gl maplibre-gl @tanstack/react-query zustand react-router
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: exits 0, `node_modules/` populated.

- [ ] **Step 3: Configure Vite (Tailwind plugin + Vitest)**

Replace `vite.config.ts` entirely:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
  },
})
```

Create `src/test-setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Replace scaffold styling and app entry**

Replace `src/index.css` entirely:

```css
@import 'tailwindcss';

html,
body,
#root {
  height: 100%;
}

body {
  @apply bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-zinc-100;
}
```

Replace `src/App.tsx` entirely (placeholder until Task 5):

```tsx
export default function App() {
  return <h1 className="p-4 text-xl font-semibold">YYC Open Data Explorer</h1>
}
```

Replace `src/main.tsx` entirely:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Delete scaffold leftovers:

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

In `index.html`, set the title:

```html
<title>YYC Open Data Explorer</title>
```

- [ ] **Step 5: Verify dev server, build, and test runner**

```bash
npm run dev -- --port 5173 &
sleep 3 && curl -s http://localhost:5173 | grep -o '<title>[^<]*</title>'; kill %1
npm run build
npm test
```

Expected: `<title>YYC Open Data Explorer</title>`; build exits 0; vitest reports "No test files found" and exits 0 (if it exits 1 on empty, add `--passWithNoTests` to the `test` script).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react-ts app with tailwind, vitest, map deps"
```

---

### Task 2: Travel-times collector (script + scheduled workflow)

The user wants history accumulating ASAP — this task ships before any UI. The script is dependency-free Node so the workflow needs no `npm install`.

**Files:**
- Create: `scripts/collect-travel-times.mjs`
- Create: `scripts/collect-travel-times.test.mjs`
- Create: `.github/workflows/collect-travel-times.yml`
- Create (by running the script): `data/travel-times/2026-07.csv`, `data/travel-times/.last-update`

- [ ] **Step 1: Write failing tests for the pure functions**

`scripts/collect-travel-times.test.mjs`:

```js
import { describe, it, expect } from 'vitest'
import { csvEscape, toCsvLines, maxLastUpdate } from './collect-travel-times.mjs'

const rows = [
  { corridor: 'Deerfoot Trail', road_segment: 'NB Deerfoot Tr: 17 Ave SE to Stoney Tr NE', travel_time_mins: '12', last_update: '2026-07-11T13:03:55.000' },
  { corridor: 'Crowchild Trail', road_segment: 'SB Crowchild Tr: 24 Ave NW to Bow Tr SW', travel_time_mins: '8', last_update: '2026-07-11T13:01:00.000' },
]

describe('csvEscape', () => {
  it('passes plain values through', () => {
    expect(csvEscape('Deerfoot Trail')).toBe('Deerfoot Trail')
  })
  it('quotes values containing commas and escapes quotes', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
  })
})

describe('toCsvLines', () => {
  it('emits one line per row, sorted by corridor then segment, with fetched_at first', () => {
    const lines = toCsvLines(rows, '2026-07-11T13:10:00.000Z')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      '2026-07-11T13:10:00.000Z,Crowchild Trail,SB Crowchild Tr: 24 Ave NW to Bow Tr SW,8,2026-07-11T13:01:00.000',
    )
    expect(lines[1].startsWith('2026-07-11T13:10:00.000Z,Deerfoot Trail,')).toBe(true)
  })
})

describe('maxLastUpdate', () => {
  it('returns the lexicographically greatest last_update', () => {
    expect(maxLastUpdate(rows)).toBe('2026-07-11T13:03:55.000')
  })
  it('returns empty string for empty input', () => {
    expect(maxLastUpdate([])).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './collect-travel-times.mjs'` (or export errors).

- [ ] **Step 3: Implement the script**

`scripts/collect-travel-times.mjs`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 5 tests in `scripts/collect-travel-times.test.mjs`.

- [ ] **Step 5: Run the script live once**

```bash
node scripts/collect-travel-times.mjs
head -3 data/travel-times/$(date -u +%Y-%m).csv
node scripts/collect-travel-times.mjs
```

Expected: first run prints `appended 67 rows to data/travel-times/2026-07.csv` (row count may vary slightly); head shows the header plus data lines; second run prints `feed unchanged … skipping` (idempotence works) — unless the feed updated between runs, in which case it appends again (also correct).

- [ ] **Step 6: Write the workflow**

`.github/workflows/collect-travel-times.yml`:

```yaml
name: Collect travel times

on:
  schedule:
    - cron: '*/20 * * * *'
  workflow_dispatch: {}

permissions:
  contents: write

concurrency:
  group: collect-travel-times

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node scripts/collect-travel-times.mjs
      - name: Commit snapshot if changed
        run: |
          if ! git diff --quiet -- data/; then
            git config user.name "github-actions[bot]"
            git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
            git add data/travel-times
            git commit -m "data: travel times snapshot"
            git pull --rebase origin main
            git push
          else
            echo "no changes"
          fi
```

Note: GitHub cron jitters and can skip under load — acceptable per spec. `git pull --rebase` guards against racing a dev push.

- [ ] **Step 7: Commit and push (workflow + first data)**

```bash
git add scripts .github data
git commit -m "feat: travel times collector script and scheduled workflow"
git push
```

- [ ] **Step 8: Trigger the workflow once and verify**

```bash
gh workflow run collect-travel-times.yml
sleep 45
gh run list --workflow=collect-travel-times.yml --limit 1
```

Expected: latest run status `completed` / `success` (it may legitimately log "feed unchanged" and commit nothing). If the run fails, read logs with `gh run view --log` and fix before proceeding.

---

### Task 3: SODA client and dataset registry

**Files:**
- Create: `src/lib/datasets.ts`
- Create: `src/lib/soda.ts`
- Create: `src/lib/soda.test.ts`

- [ ] **Step 1: Write the dataset registry (types only — no test needed)**

`src/lib/datasets.ts`:

```ts
export const DATASETS = {
  trafficIncidentsHistorical: '35ra-9556',
  trafficIncidentsCurrent: '4jah-h97u',
  trafficCameras: 'k7p9-kppz',
  travelTimes: 'aeb8-fh2w',
  parkingZonesWithRates: '45az-7kh9',
  residentialParkingPolygons: 'qzsa-aeqp',
  schoolParkingZones: '9hbw-zj92',
  developmentPermits: '6933-unw5',
  devPermitNotices: '8rd9-gix2',
  buildingPermits: 'c2es-76ed',
} as const

// 2020 and 2021 volume datasets were never published by the city (COVID gap).
export const VOLUME_DATASETS: Record<number, string | null> = {
  2016: '6wve-2ets',
  2017: 'nvuz-qykn',
  2018: 'wwf6-cpsg',
  2019: 'qeqv-tb2c',
  2020: null,
  2021: null,
  2022: '57me-rcwr',
  2023: 'bjag-w7zi',
  2024: 'cauu-7hnw',
}

export interface SodaPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface IncidentRow {
  incident_info: string
  description?: string
  start_dt: string
  modified_dt?: string
  quadrant?: string
  latitude: string
  longitude: string
}

export interface CameraRow {
  camera_url: { url: string; description?: string }
  quadrant?: string
  camera_location: string
  point: SodaPoint
}

export interface TravelTimeRow {
  corridor: string
  road_segment: string
  travel_time_mins: string
  last_update: string
}

export interface HeatPointRow {
  latitude: string
  longitude: string
}

export interface NoticeRow {
  xtrnl_file_no?: string
  job_dscrn?: string
  job_sta_lng_dscrn?: string
  posse_addr?: string
  dp_ad_dt?: string
  dp_ad_end_dt?: string
  com_nm?: string
  point?: SodaPoint
}

export interface DevPermitRow {
  permitnum: string
  address?: string
  category?: string
  description?: string
  statuscurrent?: string
  applieddate?: string
  decision?: string
  decisiondate?: string
  communityname?: string
  point?: SodaPoint
}

export interface BuildingPermitRow {
  permitnum: string
  statuscurrent?: string
  applieddate?: string
  estprojectcost?: string
  totalsqft?: string
  housingunits?: string
  contractorname?: string
  originaladdress?: string
  communityname?: string
  point?: SodaPoint
}

export interface ParkingZoneProps {
  permit_zone?: string
  address_desc?: string
  price_zone?: string
  html_zone_rate?: string
  enforceable_time?: string
  max_time?: string
  stall_type?: string
  zone_type?: string
  status?: string
  parking_restrict_type?: string
  parking_restrict_time?: string
}
```

- [ ] **Step 2: Write failing tests for the SODA helpers**

`src/lib/soda.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sodaUrl, escapeSoqlString, pointsToFeatureCollection } from './soda'

describe('sodaUrl', () => {
  it('builds a bare url with no params', () => {
    expect(sodaUrl('abcd-1234')).toBe('https://data.calgary.ca/resource/abcd-1234.json')
  })
  it('encodes $-params', () => {
    const url = sodaUrl('abcd-1234', {
      select: 'latitude,longitude',
      where: "start_dt > '2026-01-01'",
      limit: 50000,
    })
    expect(url).toContain('%24select=latitude%2Clongitude')
    expect(url).toContain('%24where=start_dt+%3E+%272026-01-01%27')
    expect(url).toContain('%24limit=50000')
  })
  it('supports geojson format', () => {
    expect(sodaUrl('abcd-1234', {}, 'geojson')).toBe(
      'https://data.calgary.ca/resource/abcd-1234.geojson',
    )
  })
})

describe('escapeSoqlString', () => {
  it('doubles single quotes', () => {
    expect(escapeSoqlString("O'Brien")).toBe("O''Brien")
  })
})

describe('pointsToFeatureCollection', () => {
  it('maps rows to features and skips rows without coordinates', () => {
    const rows = [
      { latitude: '51.05', longitude: '-114.07', name: 'a' },
      { latitude: '', longitude: '', name: 'b' },
    ]
    const fc = pointsToFeatureCollection(
      rows,
      (r) => {
        const lat = Number(r.latitude)
        const lon = Number(r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 ? [lon, lat] : null
      },
      (r) => ({ name: r.name }),
    )
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [-114.07, 51.05] })
    expect(fc.features[0].properties).toEqual({ name: 'a' })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './soda'`.

- [ ] **Step 4: Implement `src/lib/soda.ts`**

```ts
import type { FeatureCollection, GeoJsonProperties, Point } from 'geojson'

const BASE = 'https://data.calgary.ca/resource'

export interface SoqlParams {
  select?: string
  where?: string
  group?: string
  order?: string
  limit?: number
}

export function sodaUrl(
  datasetId: string,
  params: SoqlParams = {},
  format: 'json' | 'geojson' = 'json',
): string {
  const search = new URLSearchParams()
  if (params.select) search.set('$select', params.select)
  if (params.where) search.set('$where', params.where)
  if (params.group) search.set('$group', params.group)
  if (params.order) search.set('$order', params.order)
  if (params.limit != null) search.set('$limit', String(params.limit))
  const qs = search.toString()
  return `${BASE}/${datasetId}.${format}${qs ? `?${qs}` : ''}`
}

export function escapeSoqlString(value: string): string {
  return value.replaceAll("'", "''")
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SODA request failed (${res.status}): ${url}`)
  return res.json() as Promise<T>
}

export function fetchSoda<T>(datasetId: string, params: SoqlParams = {}): Promise<T[]> {
  return fetchJson<T[]>(sodaUrl(datasetId, params))
}

export function fetchSodaGeoJSON(
  datasetId: string,
  params: SoqlParams = {},
): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>(sodaUrl(datasetId, params, 'geojson'))
}

export function pointsToFeatureCollection<T>(
  rows: T[],
  getCoords: (row: T) => [number, number] | null,
  getProps: (row: T) => GeoJsonProperties = () => ({}),
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: rows.flatMap((row) => {
      const coords = getCoords(row)
      if (!coords) return []
      return [
        {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: coords },
          properties: getProps(row),
        },
      ]
    }),
  }
}
```

Note: the `geojson` types package ships with `maplibre-gl`; if TypeScript complains, `npm install -D @types/geojson`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — soda tests green alongside collector tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: soda client and dataset registry"
```

---

### Task 4: Viewport and layer-toggle stores

**Files:**
- Create: `src/stores/mapStore.ts`
- Create: `src/stores/layerStore.ts`
- Create: `src/stores/layerStore.test.ts`

- [ ] **Step 1: Write failing test for layer toggling**

`src/stores/layerStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useLayerStore } from './layerStore'

describe('layerStore', () => {
  beforeEach(() => {
    useLayerStore.setState(useLayerStore.getInitialState())
  })

  it('has expected defaults', () => {
    const s = useLayerStore.getState()
    expect(s.traffic).toEqual({ incidents: true, cameras: true, heatmap: false, volumes: false })
    expect(s.parking.meteredCurbs).toBe(true)
    expect(s.development.notices).toBe(true)
  })

  it('toggle flips only the addressed key', () => {
    useLayerStore.getState().toggle('traffic', 'heatmap')
    const s = useLayerStore.getState()
    expect(s.traffic.heatmap).toBe(true)
    expect(s.traffic.incidents).toBe(true)
    expect(s.parking.meteredCurbs).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './layerStore'`.

- [ ] **Step 3: Implement both stores**

`src/stores/layerStore.ts`:

```ts
import { create } from 'zustand'

export type TrafficLayerKey = 'incidents' | 'cameras' | 'heatmap' | 'volumes'
export type ParkingLayerKey = 'meteredCurbs' | 'residentialZones' | 'schoolZones'
export type DevLayerKey = 'notices' | 'devPermits' | 'buildingPermits'

export type TabKey = 'traffic' | 'parking' | 'development'

interface LayerState {
  traffic: Record<TrafficLayerKey, boolean>
  parking: Record<ParkingLayerKey, boolean>
  development: Record<DevLayerKey, boolean>
  toggle: (tab: TabKey, key: TrafficLayerKey | ParkingLayerKey | DevLayerKey) => void
}

export const useLayerStore = create<LayerState>()((set) => ({
  traffic: { incidents: true, cameras: true, heatmap: false, volumes: false },
  parking: { meteredCurbs: true, residentialZones: false, schoolZones: false },
  development: { notices: true, devPermits: false, buildingPermits: false },
  toggle: (tab, key) =>
    set((state) => ({
      [tab]: { ...state[tab], [key]: !(state[tab] as Record<string, boolean>)[key] },
    })),
}))
```

`src/stores/mapStore.ts`:

```ts
import { create } from 'zustand'

export interface ViewState {
  longitude: number
  latitude: number
  zoom: number
}

export const CALGARY: ViewState = { longitude: -114.0719, latitude: 51.0447, zoom: 10.5 }

interface MapState {
  viewState: ViewState
  setViewState: (v: ViewState) => void
}

export const useMapStore = create<MapState>()((set) => ({
  viewState: CALGARY,
  setViewState: (viewState) => set({ viewState }),
}))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores
git commit -m "feat: viewport and layer toggle stores"
```

---

### Task 5: App shell — tabbed routes, theme, MapCanvas

**Files:**
- Create: `src/theme.ts`
- Create: `src/components/MapCanvas.tsx`
- Create: `src/components/TabNav.tsx`
- Create: `src/components/TabNav.test.tsx`
- Create: `src/tabs/traffic/TrafficTab.tsx` (map-only stub)
- Create: `src/tabs/parking/ParkingTab.tsx` (map-only stub)
- Create: `src/tabs/development/DevelopmentTab.tsx` (map-only stub)
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Write failing TabNav test**

`src/components/TabNav.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './TabNav'`.

- [ ] **Step 3: Implement theme hook, TabNav, MapCanvas, tab stubs, and shell**

`src/theme.ts`:

```ts
import { useSyncExternalStore } from 'react'

const query = '(prefers-color-scheme: dark)'

export function usePrefersDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

export const MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const
```

`src/components/TabNav.tsx`:

```tsx
import { NavLink } from 'react-router'

const tabs = [
  { to: '/traffic', label: 'Traffic' },
  { to: '/parking', label: 'Parking' },
  { to: '/development', label: 'Development' },
]

export default function TabNav() {
  return (
    <nav className="flex gap-1">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-stone-600 hover:bg-stone-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
```

`src/components/MapCanvas.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Map } from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre'
import { useMapStore } from '../stores/mapStore'
import { usePrefersDark, MAP_STYLES } from '../theme'

interface Props {
  children?: ReactNode
  interactiveLayerIds?: string[]
  onClick?: (e: MapLayerMouseEvent) => void
}

export default function MapCanvas({ children, interactiveLayerIds, onClick }: Props) {
  const viewState = useMapStore((s) => s.viewState)
  const setViewState = useMapStore((s) => s.setViewState)
  const dark = usePrefersDark()

  return (
    <Map
      {...viewState}
      onMove={(e) => setViewState(e.viewState)}
      mapStyle={dark ? MAP_STYLES.dark : MAP_STYLES.light}
      interactiveLayerIds={interactiveLayerIds}
      onClick={onClick}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </Map>
  )
}
```

Tab stubs — `src/tabs/traffic/TrafficTab.tsx` (Parking/Development identical except the name):

```tsx
import MapCanvas from '../../components/MapCanvas'

export default function TrafficTab() {
  return (
    <div className="h-full w-full">
      <MapCanvas />
    </div>
  )
}
```

`src/App.tsx`:

```tsx
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import TabNav from './components/TabNav'

const TrafficTab = lazy(() => import('./tabs/traffic/TrafficTab'))
const ParkingTab = lazy(() => import('./tabs/parking/ParkingTab'))
const DevelopmentTab = lazy(() => import('./tabs/development/DevelopmentTab'))

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-stone-200 px-4 py-2 dark:border-zinc-800">
        <h1 className="text-base font-semibold">YYC Open Data Explorer</h1>
        <TabNav />
      </header>
      <main className="relative min-h-0 flex-1">
        <Suspense fallback={<p className="p-4 text-sm text-stone-500">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Navigate to="/traffic" replace />} />
            <Route path="/traffic" element={<TrafficTab />} />
            <Route path="/parking" element={<ParkingTab />} />
            <Route path="/development" element={<DevelopmentTab />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60_000, retry: 2 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Run tests, then verify visually**

Run: `npm test`
Expected: PASS (TabNav test green; no test imports MapCanvas — maplibre-gl does not run under jsdom).

Run: `npm run dev`, open http://localhost:5173.
Expected: header with three tabs; each tab shows a full-height Calgary basemap; panning on Traffic then switching to Parking keeps the camera position; OS dark mode switches the basemap style.

- [ ] **Step 5: Commit**

```bash
git add src index.html
git commit -m "feat: app shell with tabbed routes and theme-aware map canvas"
```

---

### Task 6: Traffic tab — live incidents and cameras

**Files:**
- Create: `src/hooks/useTraffic.ts`
- Create: `src/tabs/traffic/trafficTransforms.ts`
- Create: `src/tabs/traffic/trafficTransforms.test.ts`
- Create: `src/tabs/traffic/CameraPopup.tsx`
- Create: `src/components/LayerPanel.tsx`
- Modify: `src/tabs/traffic/TrafficTab.tsx`

- [ ] **Step 1: Write failing transform tests**

`src/tabs/traffic/trafficTransforms.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { incidentsToFC, camerasToFC } from './trafficTransforms'
import type { IncidentRow, CameraRow } from '../../lib/datasets'

describe('incidentsToFC', () => {
  it('converts rows and drops unparseable coordinates', () => {
    const rows: IncidentRow[] = [
      { incident_info: 'Crash at 5 Ave', description: 'Blocking', start_dt: '2026-07-11T08:00:00', latitude: '51.05', longitude: '-114.07' },
      { incident_info: 'Bad row', start_dt: '2026-07-11T08:00:00', latitude: '', longitude: '' },
    ]
    const fc = incidentsToFC(rows)
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].properties).toMatchObject({ incident_info: 'Crash at 5 Ave' })
  })
})

describe('camerasToFC', () => {
  it('uses the point geometry and flattens the camera url', () => {
    const rows: CameraRow[] = [
      {
        camera_url: { url: 'http://trafficcam.calgary.ca/loc86.jpg', description: 'Camera 87' },
        camera_location: 'Stoney Tr / Deerfoot Tr SE',
        point: { type: 'Point', coordinates: [-113.9766, 50.9007] },
      },
    ]
    const fc = camerasToFC(rows)
    expect(fc.features[0].geometry.coordinates).toEqual([-113.9766, 50.9007])
    expect(fc.features[0].properties).toMatchObject({
      url: 'http://trafficcam.calgary.ca/loc86.jpg',
      camera_location: 'Stoney Tr / Deerfoot Tr SE',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './trafficTransforms'`.

- [ ] **Step 3: Implement transforms and hooks**

`src/tabs/traffic/trafficTransforms.ts`:

```ts
import type { FeatureCollection, Point } from 'geojson'
import { pointsToFeatureCollection } from '../../lib/soda'
import type { CameraRow, IncidentRow } from '../../lib/datasets'

function parseLatLon(lat: string, lon: string): [number, number] | null {
  const la = Number(lat)
  const lo = Number(lon)
  return Number.isFinite(la) && Number.isFinite(lo) && la !== 0 && lo !== 0 ? [lo, la] : null
}

export function incidentsToFC(rows: IncidentRow[]): FeatureCollection<Point> {
  return pointsToFeatureCollection(
    rows,
    (r) => parseLatLon(r.latitude, r.longitude),
    (r) => ({
      incident_info: r.incident_info,
      description: r.description ?? '',
      start_dt: r.start_dt,
      quadrant: r.quadrant ?? '',
    }),
  )
}

export function camerasToFC(rows: CameraRow[]): FeatureCollection<Point> {
  return pointsToFeatureCollection(
    rows,
    (r) => (r.point ? r.point.coordinates : null),
    (r) => ({
      url: r.camera_url?.url ?? '',
      camera_location: r.camera_location,
      quadrant: r.quadrant ?? '',
    }),
  )
}
```

`src/hooks/useTraffic.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { DATASETS, type CameraRow, type IncidentRow, type TravelTimeRow } from '../lib/datasets'
import { fetchSoda } from '../lib/soda'

export function useCurrentIncidents(enabled: boolean) {
  return useQuery({
    queryKey: ['incidents-current'],
    queryFn: () => fetchSoda<IncidentRow>(DATASETS.trafficIncidentsCurrent, { limit: 500 }),
    refetchInterval: 60_000,
    enabled,
  })
}

export function useCameras(enabled: boolean) {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: () => fetchSoda<CameraRow>(DATASETS.trafficCameras, { limit: 500 }),
    enabled,
  })
}

export function useTravelTimes(enabled: boolean) {
  return useQuery({
    queryKey: ['travel-times'],
    queryFn: () =>
      fetchSoda<TravelTimeRow>(DATASETS.travelTimes, { limit: 500, order: 'corridor,road_segment' }),
    refetchInterval: 60_000,
    enabled,
  })
}
```

`src/components/LayerPanel.tsx` (generic, reused by all tabs):

```tsx
import type { ReactNode } from 'react'

export interface LayerItem {
  key: string
  label: string
  checked: boolean
  onChange: () => void
  status?: ReactNode
}

export default function LayerPanel({ items, children }: { items: LayerItem[]; children?: ReactNode }) {
  return (
    <div className="pointer-events-auto w-72 space-y-2 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/90">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
        Layers
      </h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={item.checked} onChange={item.onChange} />
              {item.label}
            </label>
            {item.status}
          </li>
        ))}
      </ul>
      {children}
    </div>
  )
}
```

`src/tabs/traffic/CameraPopup.tsx`:

```tsx
import { useState } from 'react'

export default function CameraPopup({ url, location }: { url: string; location: string }) {
  const [ts, setTs] = useState(() => Date.now())
  return (
    <div className="w-80 space-y-2 text-stone-900">
      <p className="text-sm font-medium">{location}</p>
      <img src={`${url}?ts=${ts}`} alt={`Traffic camera at ${location}`} className="w-full rounded" />
      <button
        type="button"
        onClick={() => setTs(Date.now())}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
      >
        Refresh image
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Wire the Traffic tab**

Replace `src/tabs/traffic/TrafficTab.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useCameras, useCurrentIncidents } from '../../hooks/useTraffic'
import { camerasToFC, incidentsToFC } from './trafficTransforms'
import CameraPopup from './CameraPopup'

type PopupState =
  | { kind: 'incident'; lngLat: [number, number]; props: Record<string, string> }
  | { kind: 'camera'; lngLat: [number, number]; props: Record<string, string> }

const incidentLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'incidents',
  type: 'circle',
  source: 'incidents',
  paint: {
    'circle-radius': 6,
    'circle-color': '#d03b3b',
    'circle-stroke-width': 2,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

const cameraLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'cameras',
  type: 'circle',
  source: 'cameras',
  paint: {
    'circle-radius': 5,
    'circle-color': dark ? '#3987e5' : '#2a78d6',
    'circle-stroke-width': 2,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

export default function TrafficTab() {
  const layers = useLayerStore((s) => s.traffic)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [popup, setPopup] = useState<PopupState | null>(null)

  const incidents = useCurrentIncidents(layers.incidents)
  const cameras = useCameras(layers.cameras)

  const incidentsFC = useMemo(() => incidentsToFC(incidents.data ?? []), [incidents.data])
  const camerasFC = useMemo(() => camerasToFC(cameras.data ?? []), [cameras.data])

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature) {
      setPopup(null)
      return
    }
    const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    if (feature.layer.id === 'incidents') {
      setPopup({ kind: 'incident', lngLat, props: feature.properties as Record<string, string> })
    } else if (feature.layer.id === 'cameras') {
      setPopup({ kind: 'camera', lngLat, props: feature.properties as Record<string, string> })
    }
  }

  return (
    <div className="h-full w-full">
      <MapCanvas
        interactiveLayerIds={['incidents', 'cameras'].filter(
          (id) => layers[id as 'incidents' | 'cameras'],
        )}
        onClick={onClick}
      >
        {layers.incidents && (
          <Source id="incidents" type="geojson" data={incidentsFC}>
            <Layer {...incidentLayer(dark)} />
          </Source>
        )}
        {layers.cameras && (
          <Source id="cameras" type="geojson" data={camerasFC}>
            <Layer {...cameraLayer(dark)} />
          </Source>
        )}
        {popup && (
          <Popup
            longitude={popup.lngLat[0]}
            latitude={popup.lngLat[1]}
            onClose={() => setPopup(null)}
            closeOnClick={false}
            maxWidth="340px"
          >
            {popup.kind === 'camera' ? (
              <CameraPopup url={popup.props.url} location={popup.props.camera_location} />
            ) : (
              <div className="max-w-72 space-y-1 text-stone-900">
                <p className="text-sm font-medium">{popup.props.incident_info}</p>
                <p className="text-xs">{popup.props.description}</p>
                <p className="text-xs text-stone-500">
                  Started {new Date(popup.props.start_dt).toLocaleString()}
                </p>
              </div>
            )}
          </Popup>
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute right-3 top-3">
        <LayerPanel
          items={[
            { key: 'incidents', label: 'Live incidents', checked: layers.incidents, onChange: () => toggle('traffic', 'incidents') },
            { key: 'cameras', label: 'Traffic cameras', checked: layers.cameras, onChange: () => toggle('traffic', 'cameras') },
          ]}
        />
      </div>
    </div>
  )
}
```

Note: react-map-gl Popup content renders in a maplibre container outside the Tailwind-styled root — Tailwind utility classes still apply (they're global). Popup text color needs explicit dark-mode handling; maplibre's default popup surface is white, so keep popup text `text-stone-900` (add `className="text-stone-900"` on popup wrappers — do this in all popup components).

- [ ] **Step 5: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` → Traffic tab.
Expected: camera dots across the city; any active incidents as red dots; clicking a camera shows a live JPEG that changes on "Refresh image"; toggling a layer off removes it; incidents refetch every 60s (watch the network tab).

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: live traffic incidents and camera layers"
```

---

### Task 7: Traffic tab — historical incident heatmap with filters

**Files:**
- Create: `src/tabs/traffic/heatmapFilters.ts`
- Create: `src/tabs/traffic/heatmapFilters.test.ts`
- Create: `src/tabs/traffic/HeatmapControls.tsx`
- Modify: `src/hooks/useTraffic.ts`, `src/tabs/traffic/TrafficTab.tsx`

- [ ] **Step 1: Write failing filter-compilation tests**

`src/tabs/traffic/heatmapFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { compileHeatmapParams, type HeatmapFilters } from './heatmapFilters'

const NOW = new Date('2026-07-11T12:00:00Z')

describe('compileHeatmapParams', () => {
  it('compiles preset 30d with full hours and all days', () => {
    const f: HeatmapFilters = { preset: '30d', hourFrom: 0, hourTo: 23, days: 'all' }
    const p = compileHeatmapParams(f, NOW)
    expect(p.select).toBe('latitude,longitude')
    expect(p.where).toBe("start_dt > '2026-06-11T12:00:00'")
    expect(p.limit).toBe(70000)
  })

  it('adds hour range and weekday clauses', () => {
    const f: HeatmapFilters = { preset: '1y', hourFrom: 7, hourTo: 9, days: 'weekday' }
    const p = compileHeatmapParams(f, NOW)
    expect(p.where).toBe(
      "start_dt > '2025-07-11T12:00:00' AND date_extract_hh(start_dt) between 7 and 9 AND date_extract_dow(start_dt) between 1 and 5",
    )
  })

  it('compiles weekend as dow in (0, 6) and omits date clause for all-time', () => {
    const f: HeatmapFilters = { preset: 'all', hourFrom: 0, hourTo: 23, days: 'weekend' }
    const p = compileHeatmapParams(f, NOW)
    expect(p.where).toBe('date_extract_dow(start_dt) in (0, 6)')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement filter compilation**

`src/tabs/traffic/heatmapFilters.ts`:

```ts
import type { SoqlParams } from '../../lib/soda'

export interface HeatmapFilters {
  preset: '30d' | '1y' | 'all'
  hourFrom: number
  hourTo: number
  days: 'all' | 'weekday' | 'weekend'
}

const PRESET_MS: Record<'30d' | '1y', number> = {
  '30d': 30 * 24 * 3600 * 1000,
  '1y': 365 * 24 * 3600 * 1000,
}

export function compileHeatmapParams(f: HeatmapFilters, now: Date): SoqlParams {
  const clauses: string[] = []
  if (f.preset !== 'all') {
    const since = new Date(now.getTime() - PRESET_MS[f.preset])
    clauses.push(`start_dt > '${since.toISOString().slice(0, 19)}'`)
  }
  if (f.hourFrom > 0 || f.hourTo < 23) {
    clauses.push(`date_extract_hh(start_dt) between ${f.hourFrom} and ${f.hourTo}`)
  }
  if (f.days === 'weekday') clauses.push('date_extract_dow(start_dt) between 1 and 5')
  if (f.days === 'weekend') clauses.push('date_extract_dow(start_dt) in (0, 6)')

  return {
    select: 'latitude,longitude',
    where: clauses.join(' AND ') || undefined,
    limit: 70000,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Add the heatmap hook, controls, and layer**

Append to `src/hooks/useTraffic.ts`:

```ts
import { pointsToFeatureCollection } from '../lib/soda'
import type { HeatPointRow } from '../lib/datasets'
import { compileHeatmapParams, type HeatmapFilters } from '../tabs/traffic/heatmapFilters'

export function useIncidentHeatmap(filters: HeatmapFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['incident-heatmap', filters],
    queryFn: async () => {
      const rows = await fetchSoda<HeatPointRow>(
        DATASETS.trafficIncidentsHistorical,
        compileHeatmapParams(filters, new Date()),
      )
      return pointsToFeatureCollection(rows, (r) => {
        const lat = Number(r.latitude)
        const lon = Number(r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 ? [lon, lat] : null
      })
    },
    enabled,
  })
}
```

(Adjust the existing import line to pull `fetchSoda` and add the new imports at the top of the file — keep one import block.)

`src/tabs/traffic/HeatmapControls.tsx`:

```tsx
import type { HeatmapFilters } from './heatmapFilters'

interface Props {
  filters: HeatmapFilters
  onChange: (f: HeatmapFilters) => void
}

export default function HeatmapControls({ filters, onChange }: Props) {
  return (
    <div className="space-y-2 border-t border-stone-200 pt-2 text-sm dark:border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="text-xs text-stone-500 dark:text-zinc-400">Range</span>
        {(['30d', '1y', 'all'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange({ ...filters, preset: p })}
            className={`rounded px-2 py-0.5 text-xs ${
              filters.preset === p
                ? 'bg-blue-600 text-white'
                : 'bg-stone-100 dark:bg-zinc-800'
            }`}
          >
            {p === '30d' ? '30 days' : p === '1y' ? '1 year' : 'All time'}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs">
        Hours {String(filters.hourFrom).padStart(2, '0')}–{String(filters.hourTo).padStart(2, '0')}
        <input
          type="range"
          min={0}
          max={23}
          value={filters.hourFrom}
          onChange={(e) =>
            onChange({ ...filters, hourFrom: Math.min(Number(e.target.value), filters.hourTo) })
          }
        />
        <input
          type="range"
          min={0}
          max={23}
          value={filters.hourTo}
          onChange={(e) =>
            onChange({ ...filters, hourTo: Math.max(Number(e.target.value), filters.hourFrom) })
          }
        />
      </label>
      <div className="flex gap-1">
        {(['all', 'weekday', 'weekend'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange({ ...filters, days: d })}
            className={`rounded px-2 py-0.5 text-xs capitalize ${
              filters.days === d ? 'bg-blue-600 text-white' : 'bg-stone-100 dark:bg-zinc-800'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}
```

In `TrafficTab.tsx`, add state + hook + layer + controls:

```tsx
// new imports
import type { HeatmapLayerSpecification } from 'react-map-gl/maplibre'
import { useIncidentHeatmap } from '../../hooks/useTraffic'
import HeatmapControls from './HeatmapControls'
import type { HeatmapFilters } from './heatmapFilters'

// inside component, alongside existing state
const [heatFilters, setHeatFilters] = useState<HeatmapFilters>({
  preset: '1y',
  hourFrom: 0,
  hourTo: 23,
  days: 'all',
})
const heatmap = useIncidentHeatmap(heatFilters, layers.heatmap)
```

Heatmap layer factory (module scope, next to the other layer factories):

```tsx
const heatmapLayer = (dark: boolean): HeatmapLayerSpecification => ({
  id: 'incident-heat',
  type: 'heatmap',
  source: 'incident-heat',
  paint: {
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 8, 14, 24],
    'heatmap-opacity': 0.75,
    'heatmap-color': dark
      ? ['interpolate', ['linear'], ['heatmap-density'],
         0, 'rgba(24, 79, 149, 0)', 0.2, '#184f95', 0.5, '#3987e5', 0.8, '#86b6ef', 1, '#cde2fb']
      : ['interpolate', ['linear'], ['heatmap-density'],
         0, 'rgba(158, 197, 244, 0)', 0.2, '#9ec5f4', 0.5, '#5598e7', 0.8, '#256abf', 1, '#0d366b'],
  },
})
```

In the JSX, inside `MapCanvas` (render heatmap below the point layers, i.e. first):

```tsx
{layers.heatmap && heatmap.data && (
  <Source id="incident-heat" type="geojson" data={heatmap.data}>
    <Layer {...heatmapLayer(dark)} />
  </Source>
)}
```

In the `LayerPanel`, add the item and nested controls:

```tsx
{ key: 'heatmap', label: 'Incident history heatmap', checked: layers.heatmap, onChange: () => toggle('traffic', 'heatmap') },
```

and as `LayerPanel` children:

```tsx
{layers.heatmap && <HeatmapControls filters={heatFilters} onChange={setHeatFilters} />}
```

- [ ] **Step 6: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` → Traffic → enable heatmap.
Expected: blue density blooms along Deerfoot/Glenmore/Crowchild within ~2s (1y ≈ 10k points); narrowing hours to 7–9 weekday visibly concentrates the pattern; "All time" loads ~63k points without jank.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: historical incident heatmap with time filters"
```

---

### Task 8: Traffic tab — volume flow layer with year selector

**Files:**
- Create: `src/tabs/traffic/volumeStyle.ts`
- Create: `src/tabs/traffic/volumeStyle.test.ts`
- Modify: `src/hooks/useTraffic.ts`, `src/tabs/traffic/TrafficTab.tsx`

- [ ] **Step 1: Spot-check volume field names across years (data verification, no code)**

```bash
for id in 6wve-2ets nvuz-qykn wwf6-cpsg qeqv-tb2c 57me-rcwr bjag-w7zi cauu-7hnw; do
  echo "$id: $(curl -s "https://data.calgary.ca/resource/$id.json?\$limit=1" | python3 -c "import json,sys; print(sorted(json.load(sys.stdin)[0].keys()))")"
done
```

Expected: every year includes a `volume` key (2024 confirmed: `year, collection, section, section_name, volume, multilinestring`). If an older year names it differently, note the mapping and normalize in `useVolumes` (`row.volume ?? row.<other>`).

- [ ] **Step 2: Write failing tests for the year registry and color stops**

`src/tabs/traffic/volumeStyle.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement volume style + hook + layer**

`src/tabs/traffic/volumeStyle.ts`:

```ts
import { VOLUME_DATASETS } from '../../lib/datasets'

export const VOLUME_YEARS = Object.entries(VOLUME_DATASETS)
  .filter(([, id]) => id !== null)
  .map(([year, id]) => ({ year: Number(year), id: id as string }))
  .sort((a, b) => b.year - a.year)

const VOL = ['to-number', ['get', 'volume']]

// Fixed domain across years so year-over-year comparison is honest.
export function volumeLineColor(dark: boolean) {
  return [
    'interpolate', ['linear'], VOL,
    0, dark ? '#184f95' : '#cde2fb',
    5000, dark ? '#1c5cab' : '#9ec5f4',
    20000, dark ? '#3987e5' : '#5598e7',
    50000, dark ? '#6da7ec' : '#2a78d6',
    100000, dark ? '#9ec5f4' : '#1c5cab',
    200000, dark ? '#cde2fb' : '#0d366b',
  ] as unknown as string
}

export function volumeLineWidth() {
  return ['interpolate', ['linear'], VOL, 0, 0.5, 20000, 2, 100000, 4.5, 200000, 7] as unknown as number
}
```

Append to `src/hooks/useTraffic.ts`:

```ts
import { fetchSodaGeoJSON } from '../lib/soda'

export function useVolumes(datasetId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['volumes', datasetId],
    queryFn: () => fetchSodaGeoJSON(datasetId!, { limit: 2000 }),
    enabled: enabled && !!datasetId,
  })
}
```

In `TrafficTab.tsx` add:

```tsx
import type { LineLayerSpecification } from 'react-map-gl/maplibre'
import { useVolumes } from '../../hooks/useTraffic'
import { VOLUME_YEARS, volumeLineColor, volumeLineWidth } from './volumeStyle'

// state
const [volumeYear, setVolumeYear] = useState(VOLUME_YEARS[0].year)
const volumeDatasetId = VOLUME_YEARS.find((y) => y.year === volumeYear)?.id
const volumes = useVolumes(volumeDatasetId, layers.volumes)

// module-scope layer factory
const volumeLayer = (dark: boolean): LineLayerSpecification => ({
  id: 'volumes',
  type: 'line',
  source: 'volumes',
  paint: {
    'line-color': volumeLineColor(dark),
    'line-width': volumeLineWidth(),
    'line-opacity': 0.8,
  },
})
```

JSX inside `MapCanvas` (below heatmap, above points):

```tsx
{layers.volumes && volumes.data && (
  <Source id="volumes" type="geojson" data={volumes.data}>
    <Layer {...volumeLayer(dark)} />
  </Source>
)}
```

LayerPanel item + year selector child:

```tsx
{ key: 'volumes', label: 'Traffic volumes (annual)', checked: layers.volumes, onChange: () => toggle('traffic', 'volumes') },
```

```tsx
{layers.volumes && (
  <label className="flex items-center gap-2 border-t border-stone-200 pt-2 text-xs dark:border-zinc-700">
    Year
    <select
      value={volumeYear}
      onChange={(e) => setVolumeYear(Number(e.target.value))}
      className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
    >
      {VOLUME_YEARS.map((y) => (
        <option key={y.year} value={y.year}>{y.year}</option>
      ))}
    </select>
    <span className="text-stone-400">2020–21: not published</span>
  </label>
)}
```

- [ ] **Step 5: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` → Traffic → enable volumes.
Expected: major roads drawn as blue lines, Deerfoot thick/dark (~170k AADT), residential collectors thin/light; switching years redraws; 2020/2021 absent from the dropdown with the note visible.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: traffic volume flow layer with year selector"
```

---

### Task 9: Traffic tab — live travel times sidebar

**Files:**
- Create: `src/tabs/traffic/travelTimeGrouping.ts`
- Create: `src/tabs/traffic/travelTimeGrouping.test.ts`
- Create: `src/tabs/traffic/TravelTimesSidebar.tsx`
- Create: `src/tabs/traffic/TravelTimesSidebar.test.tsx`
- Modify: `src/tabs/traffic/TrafficTab.tsx`

- [ ] **Step 1: Write failing grouping test**

`src/tabs/traffic/travelTimeGrouping.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { groupByCorridor } from './travelTimeGrouping'
import type { TravelTimeRow } from '../../lib/datasets'

const rows: TravelTimeRow[] = [
  { corridor: 'Deerfoot Trail', road_segment: 'NB: A to B', travel_time_mins: '12', last_update: '2026-07-11T13:03:55.000' },
  { corridor: 'Crowchild Trail', road_segment: 'SB: C to D', travel_time_mins: '8', last_update: '2026-07-11T13:03:55.000' },
  { corridor: 'Deerfoot Trail', road_segment: 'SB: B to A', travel_time_mins: '14', last_update: '2026-07-11T13:03:55.000' },
]

describe('groupByCorridor', () => {
  it('groups rows by corridor, sorted alphabetically, segments in input order', () => {
    const groups = groupByCorridor(rows)
    expect(groups.map((g) => g.corridor)).toEqual(['Crowchild Trail', 'Deerfoot Trail'])
    expect(groups[1].segments).toHaveLength(2)
    expect(groups[1].segments[0].travel_time_mins).toBe('12')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement grouping and sidebar**

`src/tabs/traffic/travelTimeGrouping.ts`:

```ts
import type { TravelTimeRow } from '../../lib/datasets'

export interface CorridorGroup {
  corridor: string
  segments: TravelTimeRow[]
}

export function groupByCorridor(rows: TravelTimeRow[]): CorridorGroup[] {
  const map = new Map<string, TravelTimeRow[]>()
  for (const row of rows) {
    const list = map.get(row.corridor) ?? []
    list.push(row)
    map.set(row.corridor, list)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([corridor, segments]) => ({ corridor, segments }))
}
```

`src/tabs/traffic/TravelTimesSidebar.tsx`:

```tsx
import type { TravelTimeRow } from '../../lib/datasets'
import { groupByCorridor } from './travelTimeGrouping'

interface Props {
  rows: TravelTimeRow[]
  updatedAt?: number
}

export default function TravelTimesSidebar({ rows, updatedAt }: Props) {
  const groups = groupByCorridor(rows)
  return (
    <div className="pointer-events-auto max-h-[60vh] w-72 space-y-2 overflow-y-auto rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/90">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-400">
          Travel times
        </h2>
        {updatedAt && (
          <span className="text-[10px] text-stone-400">
            {new Date(updatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      {groups.map((g) => (
        <div key={g.corridor}>
          <h3 className="text-xs font-semibold">{g.corridor}</h3>
          <ul>
            {g.segments.map((s) => (
              <li key={s.road_segment} className="flex justify-between gap-2 text-xs leading-5">
                <span className="truncate">{s.road_segment}</span>
                <span className="font-medium tabular-nums">{s.travel_time_mins} min</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
```

`src/tabs/traffic/TravelTimesSidebar.test.tsx`:

```tsx
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
```

Wire into `TrafficTab.tsx` — add `useTravelTimes` (always enabled on this tab):

```tsx
import { useTravelTimes } from '../../hooks/useTraffic'
import TravelTimesSidebar from './TravelTimesSidebar'

const travelTimes = useTravelTimes(true)
```

And render below the LayerPanel in the overlay container (make the overlay a column):

```tsx
<div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-3">
  <LayerPanel ... />
  <TravelTimesSidebar rows={travelTimes.data ?? []} updatedAt={travelTimes.dataUpdatedAt} />
</div>
```

- [ ] **Step 4: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` → Traffic.
Expected: sidebar lists ~9 corridors with per-segment minutes and a timestamp that ticks forward every ~60s.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: live travel times sidebar"
```

---

### Task 10: Parking rate-schedule parser

The most test-heavy unit. Real-world header formats (from a survey of all 141 distinct values in the dataset): `Mon-Fri 9:00 AM to 11:00 AM`, `Mon-Thu 11:00 AM to 1:30 PM`, `Fri 11:00 AM to 1:00 PM`, `Saturday: 9:00 AM to 6:00 PM`, `Saturday: 09:00 to 18:00` (24h!), `Weekdays: 09:00 to 18:00`, `Weekdays: Max 9 Hours`, `Sunday/Holidays:`, `Mon-Sat 9:00 AM to 6:00 PM`, `Free parking to 9 AM`, `Free parking to 630 AM`, `Loading zone:`, `Motorcycle Parking Only`, `Calgary Transit Access LZ:`. Body formats: `$4.00 per Hour`, `Free Parking`, `Free parking`, `Free 4 Hour`, `Free 5 mins`, `No Parking at this time`, `See Signs /Parking Restrictions`, `Max 9 Hours`.

**Files:**
- Create: `src/lib/rateSchedule.ts`
- Create: `src/lib/rateSchedule.test.ts`

- [ ] **Step 1: Write failing tests with real fixtures**

`src/lib/rateSchedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseRateSchedule, rateAt, sanitizeRateHtml } from './rateSchedule'

const STANDARD =
  '<b>Mon-Fri 9:00 AM to 11:00 AM</b><br><br>$4.00 per Hour<br><br><b>Mon-Fri 11:00 AM to 1:30 PM</b><br><br>$4.25 per Hour<br><br><b>Mon-Fri 1:30 PM to 3:30 PM</b><br><br>$3.25 per Hour<br><br><b>Mon-Fri 3:30 PM to 6:00 PM</b><br><br>$2.25 per Hour<br><br><b>Saturday: 9:00 AM to 6:00 PM</b><br><br>$1.00 per Hour<br><br><b>Sunday/Holidays:</b><br><br>Free parking<br><br><b>Free parking to 9 AM</b><br><br>See Signs /Parking Restrictions<br><br>'

const SPLIT_DAYS =
  '<b>Mon-Thu 11:00 AM to 1:30 PM</b><br><br>$1.75 per Hour<br><br><b>Fri 11:00 AM to 1:00 PM</b><br><br>$1.75 per Hour<br><br>'

const TWENTY_FOUR_HOUR = '<b>Saturday: 09:00 to 18:00</b><br><br>$2.00 per Hour<br><br>'

const NO_PARKING_BLOCK =
  '<b>Mon-Fri 7:00 AM to 9:00 AM</b><br><br>No Parking at this time<br><br>'

const LOADING_ZONE = '<b>Loading zone:</b><br><br>Free 5 mins<br><br>'

describe('parseRateSchedule', () => {
  it('parses the standard multi-window schedule', () => {
    const s = parseRateSchedule(STANDARD)
    // 4 paid Mon-Fri windows + Saturday paid + Sunday free = 6 windows
    expect(s.windows).toHaveLength(6)
    expect(s.windows[0]).toEqual({
      days: [1, 2, 3, 4, 5],
      startMin: 540,
      endMin: 660,
      kind: 'paid',
      ratePerHour: 4,
    })
    const sunday = s.windows.find((w) => w.days.length === 1 && w.days[0] === 0)!
    expect(sunday.kind).toBe('free')
    expect(sunday.startMin).toBe(0)
    expect(sunday.endMin).toBe(1440)
    // "Free parking to 9 AM" header carries no day/time window -> note
    expect(s.notes.some((n) => n.includes('Free parking to 9 AM'))).toBe(true)
  })

  it('handles split day ranges (Mon-Thu vs Fri)', () => {
    const s = parseRateSchedule(SPLIT_DAYS)
    expect(s.windows[0].days).toEqual([1, 2, 3, 4])
    expect(s.windows[1].days).toEqual([5])
    expect(s.windows[1].endMin).toBe(13 * 60)
  })

  it('parses 24-hour times', () => {
    const s = parseRateSchedule(TWENTY_FOUR_HOUR)
    expect(s.windows[0]).toMatchObject({ days: [6], startMin: 540, endMin: 1080, ratePerHour: 2 })
  })

  it('parses no-parking windows', () => {
    const s = parseRateSchedule(NO_PARKING_BLOCK)
    expect(s.windows[0]).toMatchObject({ kind: 'noParking', startMin: 420, endMin: 540 })
  })

  it('returns zero windows plus a note for non-schedule zones', () => {
    const s = parseRateSchedule(LOADING_ZONE)
    expect(s.windows).toHaveLength(0)
    expect(s.notes.length).toBeGreaterThan(0)
  })

  it('handles empty/undefined input', () => {
    expect(parseRateSchedule('').windows).toHaveLength(0)
  })
})

describe('rateAt', () => {
  const s = parseRateSchedule(STANDARD)
  it('finds the paid window covering Tuesday 10:00', () => {
    expect(rateAt(s, 2, 600)).toMatchObject({ kind: 'paid', ratePerHour: 4 })
  })
  it('finds the Saturday window', () => {
    expect(rateAt(s, 6, 600)).toMatchObject({ kind: 'paid', ratePerHour: 1 })
  })
  it('returns the free window on Sunday', () => {
    expect(rateAt(s, 0, 600)).toMatchObject({ kind: 'free' })
  })
  it('returns null outside all windows (Tuesday 07:00)', () => {
    expect(rateAt(s, 2, 420)).toBeNull()
  })
})

describe('sanitizeRateHtml', () => {
  it('keeps only b and br tags', () => {
    expect(sanitizeRateHtml('<b>x</b><br><script>alert(1)</script><img src=x>')).toBe(
      '<b>x</b><br>',
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the parser**

`src/lib/rateSchedule.ts`:

```ts
export interface RateWindow {
  days: number[] // 0=Sun .. 6=Sat
  startMin: number
  endMin: number
  kind: 'paid' | 'free' | 'noParking'
  ratePerHour: number // 0 for free/noParking
}

export interface ParsedSchedule {
  windows: RateWindow[]
  notes: string[]
}

const DAY_INDEX: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
}

function parseDays(text: string): number[] | null {
  const t = text.toLowerCase()
  if (t.includes('weekday')) return [1, 2, 3, 4, 5]
  if (t.includes('sunday/holiday')) return [0]
  const range = t.match(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\s*(?:-|to)\s*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*/)
  if (range) {
    const from = DAY_INDEX[range[1]]
    const to = DAY_INDEX[range[2]]
    const days: number[] = []
    for (let d = from; ; d = (d + 1) % 7) {
      days.push(d)
      if (d === to) break
      if (days.length > 7) return null
    }
    return days
  }
  const single = t.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/)
  return single ? [DAY_INDEX[single[1]]] : null
}

function toMinutes(hour: number, min: number, meridiem: string | undefined): number {
  let h = hour
  if (meridiem) {
    const m = meridiem.toLowerCase()
    if (m === 'pm' && h !== 12) h += 12
    if (m === 'am' && h === 12) h = 0
  }
  return h * 60 + min
}

const TIME_RANGE =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*to\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i

function parseTimeRange(text: string): { startMin: number; endMin: number } | null {
  const m = text.match(TIME_RANGE)
  if (!m) return null
  const startMeridiem = m[3] ?? m[6] // "9:00 to 11:00 AM" style inherits the trailing meridiem
  return {
    startMin: toMinutes(Number(m[1]), Number(m[2] ?? 0), startMeridiem),
    endMin: toMinutes(Number(m[4]), Number(m[5] ?? 0), m[6]),
  }
}

function parseBody(text: string): { kind: RateWindow['kind']; ratePerHour: number } | null {
  const paid = text.match(/\$(\d+(?:\.\d{1,2})?)\s*per\s*hour/i)
  if (paid) return { kind: 'paid', ratePerHour: Number(paid[1]) }
  if (/no\s+parking/i.test(text)) return { kind: 'noParking', ratePerHour: 0 }
  if (/free/i.test(text)) return { kind: 'free', ratePerHour: 0 }
  return null
}

export function parseRateSchedule(html: string | undefined | null): ParsedSchedule {
  const windows: RateWindow[] = []
  const notes: string[] = []
  if (!html) return { windows, notes }

  const blocks = [...html.matchAll(/<b>(.*?)<\/b>([\s\S]*?)(?=<b>|$)/gi)]
  for (const [, rawHeader, rawBody] of blocks) {
    const header = rawHeader.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const body = rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // Informational headers ("Free parking to 9 AM") describe boundaries already
    // implied by the windows — keep as notes.
    if (/^free parking/i.test(header)) {
      notes.push(`${header}${body ? ` — ${body}` : ''}`)
      continue
    }

    const days = parseDays(header)
    const time = parseTimeRange(header)
    const rate = parseBody(body)

    if (days && rate) {
      windows.push({
        days,
        startMin: time?.startMin ?? 0,
        endMin: time?.endMin ?? 1440,
        kind: rate.kind,
        ratePerHour: rate.ratePerHour,
      })
      const headerLeftover = header.replace(TIME_RANGE, '').replace(/[a-z/-]*\b(sun|mon|tue|wed|thu|fri|sat)[a-z/]*\b/gi, '').replace(/[:\s]+/g, ' ').trim()
      if (headerLeftover) notes.push(`${header} — ${body}`)
    } else {
      notes.push(`${header}${body ? ` — ${body}` : ''}`)
    }
  }
  return { windows, notes }
}

export function rateAt(schedule: ParsedSchedule, day: number, minutes: number): RateWindow | null {
  return (
    schedule.windows.find(
      (w) => w.days.includes(day) && minutes >= w.startMin && minutes < w.endMin,
    ) ?? null
  )
}

export function sanitizeRateHtml(html: string): string {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?!\/?(?:b|br)\b)[^>]*>/gi, '')
    .replace(/<(\/?)(b|br)\b[^>]*>/gi, '<$1$2>')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all rateSchedule tests green. If a fixture assertion fails, fix the parser, not the fixture (fixtures are real data).

- [ ] **Step 5: Fuzz against the full live dataset (verification, not a unit test)**

```bash
npx tsx --eval "
const { parseRateSchedule } = await import('./src/lib/rateSchedule.ts')
const rows = await (await fetch('https://data.calgary.ca/resource/45az-7kh9.json?\$select=html_zone_rate&\$group=html_zone_rate&\$limit=300')).json()
let ok = 0
const empties = []
for (const r of rows) {
  const s = parseRateSchedule(r.html_zone_rate)
  s.windows.length ? ok++ : empties.push(r.html_zone_rate)
}
console.log({ distinctValues: rows.length, parsedSomeWindows: ok, zeroWindows: empties.length })
console.log(empties.slice(0, 10))
"
```

Expected: `parsedSomeWindows` covers the large majority (≥ ~120 of ~141); the printed `zeroWindows` samples should be genuine non-schedules (loading zones, motorcycle-only, no-parking-only, null). If a real schedule shows up unparsed, extend the parser and add it as a fixture.

- [ ] **Step 6: Commit**

```bash
git add src/lib
git commit -m "feat: parking rate schedule parser"
```

---

### Task 11: Parking tab — time-of-day rate map

**Files:**
- Create: `src/tabs/parking/parkingColors.ts`
- Create: `src/tabs/parking/parkingColors.test.ts`
- Create: `src/tabs/parking/TimeSelector.tsx`
- Create: `src/tabs/parking/ParkingPopup.tsx`
- Create: `src/hooks/useParking.ts`
- Modify: `src/tabs/parking/ParkingTab.tsx`

- [ ] **Step 1: Write failing color-mapping tests**

`src/tabs/parking/parkingColors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { curbColor, PARKING_COLORS } from './parkingColors'
import { parseRateSchedule } from '../../lib/rateSchedule'

const PAID = parseRateSchedule('<b>Mon-Fri 9:00 AM to 11:00 AM</b><br><br>$4.00 per Hour<br><br>')
const EMPTY = parseRateSchedule('<b>Loading zone:</b><br><br>Free 5 mins<br><br>')

describe('curbColor', () => {
  it('colors paid windows by rate on the sequential ramp', () => {
    expect(curbColor(PAID, 2, 600, false)).toBe('#256abf') // $4 -> 4th stop, light mode
  })
  it('colors free (outside windows) with the free color', () => {
    expect(curbColor(PAID, 0, 600, false)).toBe(PARKING_COLORS.light.free)
  })
  it('colors unparseable schedules with the unknown color', () => {
    expect(curbColor(EMPTY, 2, 600, false)).toBe(PARKING_COLORS.light.unknown)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement colors, hooks, selector, popup**

`src/tabs/parking/parkingColors.ts`:

```ts
import { rateAt, type ParsedSchedule } from '../../lib/rateSchedule'

export const PARKING_COLORS = {
  light: { free: '#1baf7a', noParking: '#d03b3b', unknown: '#898781' },
  dark: { free: '#199e70', noParking: '#e66767', unknown: '#898781' },
} as const

// $/hr -> color; light mode darkens with price, dark mode lightens (visibility on dark surface).
const RATE_STOPS_LIGHT: Array<[number, string]> = [
  [1, '#9ec5f4'], [2, '#6da7ec'], [3, '#3987e5'], [4, '#256abf'], [5, '#0d366b'],
]
const RATE_STOPS_DARK: Array<[number, string]> = [
  [1, '#6da7ec'], [2, '#86b6ef'], [3, '#9ec5f4'], [4, '#b7d3f6'], [5, '#cde2fb'],
]

export function rateColor(ratePerHour: number, dark: boolean): string {
  const stops = dark ? RATE_STOPS_DARK : RATE_STOPS_LIGHT
  for (const [max, color] of stops) {
    if (ratePerHour <= max) return color
  }
  return stops[stops.length - 1][1]
}

export function curbColor(
  schedule: ParsedSchedule,
  day: number,
  minutes: number,
  dark: boolean,
): string {
  const mode = dark ? PARKING_COLORS.dark : PARKING_COLORS.light
  if (schedule.windows.length === 0) return mode.unknown
  const window = rateAt(schedule, day, minutes)
  if (!window || window.kind === 'free') return mode.free
  if (window.kind === 'noParking') return mode.noParking
  return rateColor(window.ratePerHour, dark)
}
```

`src/hooks/useParking.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { DATASETS } from '../lib/datasets'
import { fetchSodaGeoJSON } from '../lib/soda'

export function useParkingZones(enabled: boolean) {
  return useQuery({
    queryKey: ['parking-zones'],
    queryFn: () => fetchSodaGeoJSON(DATASETS.parkingZonesWithRates, { limit: 5000 }),
    enabled,
  })
}

export function useResidentialZones(enabled: boolean) {
  return useQuery({
    queryKey: ['residential-zones'],
    queryFn: () => fetchSodaGeoJSON(DATASETS.residentialParkingPolygons, { limit: 5000 }),
    enabled,
  })
}

export function useSchoolZones(enabled: boolean) {
  return useQuery({
    queryKey: ['school-zones'],
    queryFn: () => fetchSodaGeoJSON(DATASETS.schoolParkingZones, { limit: 5000 }),
    enabled,
  })
}
```

`src/tabs/parking/TimeSelector.tsx`:

```tsx
export interface TimeSelection {
  day: number // 0=Sun..6=Sat
  minutes: number // 0..1439
}

export function nowSelection(): TimeSelection {
  const d = new Date()
  return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() }
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  value: TimeSelection
  onChange: (v: TimeSelection) => void
}

export default function TimeSelector({ value, onChange }: Props) {
  const hh = String(Math.floor(value.minutes / 60)).padStart(2, '0')
  const mm = String(value.minutes % 60).padStart(2, '0')
  return (
    <div className="flex items-center gap-2 border-t border-stone-200 pt-2 text-xs dark:border-zinc-700">
      <select
        value={value.day}
        onChange={(e) => onChange({ ...value, day: Number(e.target.value) })}
        className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
      >
        {DAY_NAMES.map((d, i) => (
          <option key={d} value={i}>{d}</option>
        ))}
      </select>
      <input
        type="time"
        value={`${hh}:${mm}`}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map(Number)
          onChange({ ...value, minutes: h * 60 + m })
        }}
        className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
      />
      <button
        type="button"
        onClick={() => onChange(nowSelection())}
        className="rounded bg-blue-600 px-2 py-0.5 font-medium text-white"
      >
        Now
      </button>
    </div>
  )
}
```

`src/tabs/parking/ParkingPopup.tsx`:

```tsx
import { parseRateSchedule, sanitizeRateHtml } from '../../lib/rateSchedule'
import type { ParkingZoneProps } from '../../lib/datasets'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt(min: number): string {
  const h = Math.floor(min / 60)
  const m = String(min % 60).padStart(2, '0')
  return `${h}:${m}`
}

function dayRange(days: number[]): string {
  if (days.length === 7) return 'Daily'
  if (days.length === 1) return DAY_LABELS[days[0]]
  return `${DAY_LABELS[days[0]]}–${DAY_LABELS[days[days.length - 1]]}`
}

export default function ParkingPopup({ props }: { props: ParkingZoneProps }) {
  const schedule = parseRateSchedule(props.html_zone_rate)
  return (
    <div className="max-w-80 space-y-2 text-stone-900">
      <p className="text-sm font-medium">{props.address_desc ?? 'Parking zone'}</p>
      {schedule.windows.length > 0 ? (
        <table className="w-full text-xs">
          <tbody>
            {schedule.windows.map((w, i) => (
              <tr key={i}>
                <td>{dayRange(w.days)}</td>
                <td>{w.startMin === 0 && w.endMin === 1440 ? 'All day' : `${fmt(w.startMin)}–${fmt(w.endMin)}`}</td>
                <td className="text-right font-medium">
                  {w.kind === 'paid' ? `$${w.ratePerHour.toFixed(2)}/hr` : w.kind === 'free' ? 'Free' : 'No parking'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : props.html_zone_rate ? (
        <div
          className="text-xs"
          dangerouslySetInnerHTML={{ __html: sanitizeRateHtml(props.html_zone_rate) }}
        />
      ) : (
        <p className="text-xs text-stone-500">No rate information.</p>
      )}
      {schedule.notes.length > 0 && (
        <ul className="list-disc pl-4 text-[11px] text-stone-500">
          {schedule.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-2 text-[11px] text-stone-600">
        {props.max_time && (<><dt>Max stay</dt><dd>{props.max_time} min</dd></>)}
        {props.enforceable_time && (<><dt>Enforced</dt><dd>{props.enforceable_time}</dd></>)}
        {props.stall_type && (<><dt>Stall type</dt><dd>{props.stall_type}</dd></>)}
        {props.permit_zone && (<><dt>Zone</dt><dd>{props.permit_zone}</dd></>)}
      </dl>
    </div>
  )
}
```

- [ ] **Step 4: Wire the Parking tab**

Replace `src/tabs/parking/ParkingTab.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  MapLayerMouseEvent,
} from 'react-map-gl/maplibre'
import type { FeatureCollection } from 'geojson'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useParkingZones, useResidentialZones, useSchoolZones } from '../../hooks/useParking'
import { parseRateSchedule } from '../../lib/rateSchedule'
import type { ParkingZoneProps } from '../../lib/datasets'
import { curbColor } from './parkingColors'
import TimeSelector, { nowSelection, type TimeSelection } from './TimeSelector'
import ParkingPopup from './ParkingPopup'

const curbLayer: LineLayerSpecification = {
  id: 'curbs',
  type: 'line',
  source: 'curbs',
  paint: {
    'line-color': ['get', 'curbColor'],
    'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 5],
    'line-opacity': 0.9,
  },
}

const residentialLayer = (dark: boolean): FillLayerSpecification => ({
  id: 'residential',
  type: 'fill',
  source: 'residential',
  paint: {
    'fill-color': dark ? '#9085e9' : '#4a3aa7',
    'fill-opacity': 0.15,
    'fill-outline-color': dark ? '#9085e9' : '#4a3aa7',
  },
})

const schoolLayer = (dark: boolean): LineLayerSpecification => ({
  id: 'school',
  type: 'line',
  source: 'school',
  paint: {
    'line-color': dark ? '#c98500' : '#eda100',
    'line-width': 2,
    'line-dasharray': [2, 1],
  },
})

export default function ParkingTab() {
  const layers = useLayerStore((s) => s.parking)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [time, setTime] = useState<TimeSelection>(nowSelection)
  const [popup, setPopup] = useState<{ lngLat: [number, number]; props: ParkingZoneProps } | null>(null)

  const zones = useParkingZones(layers.meteredCurbs)
  const residential = useResidentialZones(layers.residentialZones)
  const school = useSchoolZones(layers.schoolZones)

  const coloredZones = useMemo<FeatureCollection | undefined>(() => {
    if (!zones.data) return undefined
    return {
      ...zones.data,
      features: zones.data.features.map((f) => {
        const props = (f.properties ?? {}) as ParkingZoneProps
        const schedule = parseRateSchedule(props.html_zone_rate)
        return {
          ...f,
          properties: { ...props, curbColor: curbColor(schedule, time.day, time.minutes, dark) },
        }
      }),
    }
  }, [zones.data, time, dark])

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (feature?.layer.id === 'curbs') {
      setPopup({
        lngLat: [e.lngLat.lng, e.lngLat.lat],
        props: feature.properties as ParkingZoneProps,
      })
    } else {
      setPopup(null)
    }
  }

  return (
    <div className="h-full w-full">
      <MapCanvas interactiveLayerIds={layers.meteredCurbs ? ['curbs'] : []} onClick={onClick}>
        {layers.residentialZones && residential.data && (
          <Source id="residential" type="geojson" data={residential.data}>
            <Layer {...residentialLayer(dark)} />
          </Source>
        )}
        {layers.schoolZones && school.data && (
          <Source id="school" type="geojson" data={school.data}>
            <Layer {...schoolLayer(dark)} />
          </Source>
        )}
        {layers.meteredCurbs && coloredZones && (
          <Source id="curbs" type="geojson" data={coloredZones}>
            <Layer {...curbLayer} />
          </Source>
        )}
        {popup && (
          <Popup
            longitude={popup.lngLat[0]}
            latitude={popup.lngLat[1]}
            onClose={() => setPopup(null)}
            closeOnClick={false}
            maxWidth="340px"
          >
            <ParkingPopup props={popup.props} />
          </Popup>
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute right-3 top-3">
        <LayerPanel
          items={[
            { key: 'meteredCurbs', label: 'Metered curbs (by rate)', checked: layers.meteredCurbs, onChange: () => toggle('parking', 'meteredCurbs') },
            { key: 'residentialZones', label: 'Residential permit zones', checked: layers.residentialZones, onChange: () => toggle('parking', 'residentialZones') },
            { key: 'schoolZones', label: 'School zones', checked: layers.schoolZones, onChange: () => toggle('parking', 'schoolZones') },
          ]}
        >
          {layers.meteredCurbs && (
            <>
              <TimeSelector value={time} onChange={setTime} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[10px] text-stone-500 dark:text-zinc-400">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#199e70' : '#1baf7a' }} />Free</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#6da7ec' : '#9ec5f4' }} />$1</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#cde2fb' : '#0d366b' }} />$5+</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: dark ? '#e66767' : '#d03b3b' }} />No parking</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-stone-400" />Other</span>
              </div>
            </>
          )}
        </LayerPanel>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` → Parking (zoom into downtown, ~zoom 14).
Expected: curbs colored along downtown streets; Tuesday 10:00 shows mostly blue paid curbs; Sunday 10:00 flips almost everything to green (free); a 7–9 AM weekday time shows red no-parking segments on commuter routes; clicking a curb shows the schedule table; the legend matches; residential/school toggles draw their zones.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: parking tab with time-of-day rate map"
```

---

### Task 12: Development tab — notices, dev permits, building permits

**Files:**
- Create: `src/tabs/development/devFilters.ts`
- Create: `src/tabs/development/devFilters.test.ts`
- Create: `src/hooks/useDevelopment.ts`
- Create: `src/tabs/development/DevPopups.tsx`
- Modify: `src/tabs/development/DevelopmentTab.tsx`

- [ ] **Step 1: Fetch real filter option values (data verification, no code)**

```bash
curl -s "https://data.calgary.ca/resource/6933-unw5.json?\$select=statuscurrent,count(*)%20as%20c&\$group=statuscurrent&\$order=c%20DESC&\$limit=20" | python3 -m json.tool
curl -s "https://data.calgary.ca/resource/6933-unw5.json?\$select=category,count(*)%20as%20c&\$group=category&\$order=c%20DESC&\$limit=20" | python3 -m json.tool
```

Expected: top ~10 status values (e.g. Released, Approved, Under Review, Cancelled, Refused — use whatever actually returns) and category values. Paste the top values into `STATUS_OPTIONS` / `CATEGORY_OPTIONS` in `devFilters.ts` in Step 4.

- [ ] **Step 2: Write failing filter tests**

`src/tabs/development/devFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildDevPermitParams, type DevFilters } from './devFilters'

const NOW = new Date('2026-07-11T12:00:00Z')

describe('buildDevPermitParams', () => {
  it('windows by applieddate and requires a location', () => {
    const f: DevFilters = { months: 24, status: 'all', category: 'all' }
    const p = buildDevPermitParams(f, NOW)
    expect(p.where).toBe("applieddate > '2024-07-11' AND point IS NOT NULL")
    expect(p.limit).toBe(50000)
    expect(p.select).toContain('permitnum')
  })

  it('adds escaped status and category clauses', () => {
    const f: DevFilters = { months: 6, status: "O'Brien", category: 'Residential' }
    const p = buildDevPermitParams(f, NOW)
    expect(p.where).toContain("statuscurrent = 'O''Brien'")
    expect(p.where).toContain("category = 'Residential'")
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement filters, hooks, popups, and the tab**

`src/tabs/development/devFilters.ts`:

```ts
import type { SoqlParams } from '../../lib/soda'
import { escapeSoqlString } from '../../lib/soda'

export interface DevFilters {
  months: 3 | 6 | 12 | 24
  status: string // 'all' or exact statuscurrent value
  category: string // 'all' or exact category value
}

// Populate from the live $group queries in Step 1 of this task.
export const STATUS_OPTIONS: string[] = [] // e.g. ['Released', 'Under Review', ...]
export const CATEGORY_OPTIONS: string[] = []

export function buildDevPermitParams(f: DevFilters, now: Date): SoqlParams {
  const since = new Date(now)
  since.setUTCMonth(since.getUTCMonth() - f.months)
  const clauses = [`applieddate > '${since.toISOString().slice(0, 10)}'`, 'point IS NOT NULL']
  if (f.status !== 'all') clauses.push(`statuscurrent = '${escapeSoqlString(f.status)}'`)
  if (f.category !== 'all') clauses.push(`category = '${escapeSoqlString(f.category)}'`)
  return {
    select:
      'permitnum,address,category,description,statuscurrent,applieddate,decision,decisiondate,communityname,point',
    where: clauses.join(' AND '),
    limit: 50000,
  }
}
```

`src/hooks/useDevelopment.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import {
  DATASETS,
  type BuildingPermitRow,
  type DevPermitRow,
  type NoticeRow,
} from '../lib/datasets'
import { fetchSoda, pointsToFeatureCollection } from '../lib/soda'
import { buildDevPermitParams, type DevFilters } from '../tabs/development/devFilters'

const pointCoords = (r: { point?: { coordinates: [number, number] } }) =>
  r.point?.coordinates ?? null

export function useNotices(enabled: boolean) {
  return useQuery({
    queryKey: ['dev-notices'],
    queryFn: async () => {
      const rows = await fetchSoda<NoticeRow>(DATASETS.devPermitNotices, { limit: 1000 })
      return pointsToFeatureCollection(rows, pointCoords, (r) => ({
        file: r.xtrnl_file_no ?? '',
        description: r.job_dscrn ?? '',
        status: r.job_sta_lng_dscrn ?? '',
        address: r.posse_addr ?? '',
        adStart: r.dp_ad_dt ?? '',
        adEnd: r.dp_ad_end_dt ?? '',
        community: r.com_nm ?? '',
      }))
    },
    enabled,
  })
}

export function useDevPermits(filters: DevFilters, enabled: boolean) {
  return useQuery({
    queryKey: ['dev-permits', filters],
    queryFn: async () => {
      const rows = await fetchSoda<DevPermitRow>(
        DATASETS.developmentPermits,
        buildDevPermitParams(filters, new Date()),
      )
      return pointsToFeatureCollection(rows, pointCoords, (r) => ({
        permitnum: r.permitnum,
        address: r.address ?? '',
        category: r.category ?? '',
        description: r.description ?? '',
        status: r.statuscurrent ?? '',
        applied: r.applieddate ?? '',
        decision: r.decision ?? '',
        decisionDate: r.decisiondate ?? '',
        community: r.communityname ?? '',
      }))
    },
    enabled,
  })
}

export function useBuildingPermits(enabled: boolean) {
  return useQuery({
    queryKey: ['building-permits'],
    queryFn: async () => {
      const since = new Date()
      since.setUTCFullYear(since.getUTCFullYear() - 1)
      const rows = await fetchSoda<BuildingPermitRow>(DATASETS.buildingPermits, {
        select:
          'permitnum,statuscurrent,applieddate,estprojectcost,totalsqft,housingunits,contractorname,originaladdress,communityname,point',
        where: `applieddate > '${since.toISOString().slice(0, 10)}' AND point IS NOT NULL AND estprojectcost IS NOT NULL`,
        limit: 50000,
      })
      return pointsToFeatureCollection(rows, pointCoords, (r) => ({
        permitnum: r.permitnum,
        status: r.statuscurrent ?? '',
        applied: r.applieddate ?? '',
        cost: Number(r.estprojectcost ?? 0),
        sqft: r.totalsqft ?? '',
        units: r.housingunits ?? '',
        contractor: r.contractorname ?? '',
        address: r.originaladdress ?? '',
        community: r.communityname ?? '',
      }))
    },
    enabled,
  })
}
```

`src/tabs/development/DevPopups.tsx`:

```tsx
export function NoticePopup({ props }: { props: Record<string, string> }) {
  return (
    <div className="max-w-80 space-y-1 text-stone-900">
      <p className="text-sm font-medium">{props.description || 'Development notice'}</p>
      <p className="text-xs">{props.address}{props.community ? ` · ${props.community}` : ''}</p>
      <p className="text-xs">Status: {props.status}</p>
      {props.adStart && (
        <p className="text-xs text-stone-500">
          Notice period {props.adStart.slice(0, 10)} → {props.adEnd.slice(0, 10)}
        </p>
      )}
      <p className="text-[11px] text-stone-400">{props.file}</p>
    </div>
  )
}

export function DevPermitPopup({ props }: { props: Record<string, string> }) {
  return (
    <div className="max-w-80 space-y-1 text-stone-900">
      <p className="text-sm font-medium">{props.description || props.permitnum}</p>
      <p className="text-xs">{props.address}{props.community ? ` · ${props.community}` : ''}</p>
      <p className="text-xs">{props.category} — {props.status}</p>
      <p className="text-xs text-stone-500">
        Applied {props.applied.slice(0, 10)}
        {props.decision && ` · ${props.decision} ${props.decisionDate.slice(0, 10)}`}
      </p>
      <p className="text-[11px] text-stone-400">{props.permitnum}</p>
    </div>
  )
}

export function BuildingPermitPopup({ props }: { props: Record<string, string> }) {
  const cost = Number(props.cost)
  return (
    <div className="max-w-80 space-y-1 text-stone-900">
      <p className="text-sm font-medium">
        {cost > 0 ? `$${cost.toLocaleString()}` : 'Building permit'}
      </p>
      <p className="text-xs">{props.address}{props.community ? ` · ${props.community}` : ''}</p>
      <p className="text-xs">{props.status} · applied {props.applied.slice(0, 10)}</p>
      {props.units && Number(props.units) > 0 && <p className="text-xs">{props.units} housing units</p>}
      {props.contractor && <p className="text-xs text-stone-500">{props.contractor}</p>}
      <p className="text-[11px] text-stone-400">{props.permitnum}</p>
    </div>
  )
}
```

Replace `src/tabs/development/DevelopmentTab.tsx`:

```tsx
import { useState } from 'react'
import { Layer, Popup, Source } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import MapCanvas from '../../components/MapCanvas'
import LayerPanel from '../../components/LayerPanel'
import { useLayerStore } from '../../stores/layerStore'
import { usePrefersDark } from '../../theme'
import { useBuildingPermits, useDevPermits, useNotices } from '../../hooks/useDevelopment'
import { CATEGORY_OPTIONS, STATUS_OPTIONS, type DevFilters } from './devFilters'
import { BuildingPermitPopup, DevPermitPopup, NoticePopup } from './DevPopups'

type PopupState = { layer: string; lngLat: [number, number]; props: Record<string, string> }

const noticeLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'notices',
  type: 'circle',
  source: 'notices',
  paint: {
    'circle-radius': 7,
    'circle-color': dark ? '#c98500' : '#eda100',
    'circle-stroke-width': 2,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

const devPermitLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'dev-permits',
  type: 'circle',
  source: 'dev-permits',
  paint: {
    'circle-radius': 4,
    'circle-color': dark ? '#9085e9' : '#4a3aa7',
    'circle-opacity': 0.75,
    'circle-stroke-width': 1,
    'circle-stroke-color': dark ? '#161622' : '#ffffff',
  },
})

const buildingLayer = (dark: boolean): CircleLayerSpecification => ({
  id: 'building-permits',
  type: 'circle',
  source: 'building-permits',
  paint: {
    'circle-radius': [
      'interpolate', ['linear'], ['sqrt', ['get', 'cost']],
      0, 2, 1000, 6, 3200, 12, 10000, 22,
    ],
    'circle-color': dark ? '#d95926' : '#eb6834',
    'circle-opacity': 0.45,
    'circle-stroke-width': 1,
    'circle-stroke-color': dark ? '#d95926' : '#eb6834',
  },
})

export default function DevelopmentTab() {
  const layers = useLayerStore((s) => s.development)
  const toggle = useLayerStore((s) => s.toggle)
  const dark = usePrefersDark()
  const [filters, setFilters] = useState<DevFilters>({ months: 24, status: 'all', category: 'all' })
  const [popup, setPopup] = useState<PopupState | null>(null)

  const notices = useNotices(layers.notices)
  const devPermits = useDevPermits(filters, layers.devPermits)
  const building = useBuildingPermits(layers.buildingPermits)

  const onClick = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0]
    if (!feature) {
      setPopup(null)
      return
    }
    setPopup({
      layer: feature.layer.id,
      lngLat: [e.lngLat.lng, e.lngLat.lat],
      props: feature.properties as Record<string, string>,
    })
  }

  const interactive = [
    layers.notices && 'notices',
    layers.devPermits && 'dev-permits',
    layers.buildingPermits && 'building-permits',
  ].filter(Boolean) as string[]

  return (
    <div className="h-full w-full">
      <MapCanvas interactiveLayerIds={interactive} onClick={onClick}>
        {layers.buildingPermits && building.data && (
          <Source id="building-permits" type="geojson" data={building.data}>
            <Layer {...buildingLayer(dark)} />
          </Source>
        )}
        {layers.devPermits && devPermits.data && (
          <Source id="dev-permits" type="geojson" data={devPermits.data}>
            <Layer {...devPermitLayer(dark)} />
          </Source>
        )}
        {layers.notices && notices.data && (
          <Source id="notices" type="geojson" data={notices.data}>
            <Layer {...noticeLayer(dark)} />
          </Source>
        )}
        {popup && (
          <Popup
            longitude={popup.lngLat[0]}
            latitude={popup.lngLat[1]}
            onClose={() => setPopup(null)}
            closeOnClick={false}
            maxWidth="340px"
          >
            {popup.layer === 'notices' ? (
              <NoticePopup props={popup.props} />
            ) : popup.layer === 'dev-permits' ? (
              <DevPermitPopup props={popup.props} />
            ) : (
              <BuildingPermitPopup props={popup.props} />
            )}
          </Popup>
        )}
      </MapCanvas>
      <div className="pointer-events-none absolute right-3 top-3">
        <LayerPanel
          items={[
            { key: 'notices', label: 'Current public notices', checked: layers.notices, onChange: () => toggle('development', 'notices') },
            { key: 'devPermits', label: 'Development permits', checked: layers.devPermits, onChange: () => toggle('development', 'devPermits') },
            { key: 'buildingPermits', label: 'Building permits (by cost)', checked: layers.buildingPermits, onChange: () => toggle('development', 'buildingPermits') },
          ]}
        >
          {layers.devPermits && (
            <div className="space-y-1 border-t border-stone-200 pt-2 text-xs dark:border-zinc-700">
              <label className="flex items-center gap-2">
                Applied within
                <select
                  value={filters.months}
                  onChange={(e) => setFilters({ ...filters, months: Number(e.target.value) as DevFilters['months'] })}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  {[3, 6, 12, 24].map((m) => (
                    <option key={m} value={m}>{m} months</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                Status
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  <option value="all">All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                Category
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="rounded border border-stone-300 bg-transparent px-1 py-0.5 dark:border-zinc-700"
                >
                  <option value="all">All</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <p className="text-[10px] text-stone-400">
                Note: new applications appear in the city feed ~6–8 weeks after filing.
              </p>
            </div>
          )}
        </LayerPanel>
      </div>
    </div>
  )
}
```

(Remember: `STATUS_OPTIONS` / `CATEGORY_OPTIONS` must contain the real values fetched in Step 1.)

- [ ] **Step 5: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev` → Development.
Expected: ~100 amber notice dots; enabling dev permits adds violet dots across the city (loads in ~2–4s for 24 months); status/category filters visibly change the set; building permits show orange bubbles with downtown towers large; popups show details for each layer.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: development tab with notices and permit layers"
```

---

### Task 13: Per-layer error and staleness indicators

**Files:**
- Create: `src/components/LayerStatus.tsx`
- Create: `src/components/LayerStatus.test.tsx`
- Modify: all three tab components (pass `status` into LayerPanel items)

- [ ] **Step 1: Write failing component test**

`src/components/LayerStatus.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement and wire**

`src/components/LayerStatus.tsx`:

```tsx
interface Props {
  isError: boolean
  isFetching: boolean
  dataUpdatedAt: number
}

export default function LayerStatus({ isError, isFetching, dataUpdatedAt }: Props) {
  if (isError) {
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
        unavailable — retrying
      </span>
    )
  }
  if (isFetching && dataUpdatedAt === 0) {
    return (
      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
        loading…
      </span>
    )
  }
  return null
}
```

Wire into each tab's LayerPanel items, e.g. in `TrafficTab.tsx`:

```tsx
{
  key: 'incidents',
  label: 'Live incidents',
  checked: layers.incidents,
  onChange: () => toggle('traffic', 'incidents'),
  status: (
    <LayerStatus
      isError={incidents.isError}
      isFetching={incidents.isFetching}
      dataUpdatedAt={incidents.dataUpdatedAt}
    />
  ),
},
```

Apply the same pattern to every layer item across the three tabs (cameras, heatmap, volumes, curbs, residential, school, notices, devPermits, buildingPermits) using each layer's own query object. Note TanStack Query keeps last-good `data` on refetch errors, so stale data stays rendered — exactly the spec's behavior.

- [ ] **Step 4: Run tests, then verify visually**

Run: `npm test`
Expected: PASS.

Run: `npm run dev`; in DevTools, set network to offline, toggle a layer off/on.
Expected: layer chip shows "unavailable — retrying"; previously loaded layers keep rendering; going back online recovers within a retry cycle.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: per-layer error and staleness indicators"
```

---

### Task 14: Final verification and release

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Full test suite and production build**

```bash
npm test
npm run build
npm run preview -- --port 4173 &
sleep 2 && curl -s http://localhost:4173 | grep -o '<title>[^<]*</title>'; kill %1
```

Expected: all suites pass; build exits 0 with no TS errors; preview serves the title.

- [ ] **Step 2: Manual click-through checklist (dev or preview server)**

- Traffic: incidents + cameras render; camera popup image refreshes; heatmap responds to hour/day filters; volumes year switch works; travel-times sidebar ticks.
- Parking: time selector recolors curbs; "Now" button works; popup schedule table matches the popup's raw values sanity-wise.
- Development: notices/dev/building layers + filters + popups work.
- Tab switching preserves camera position; OS dark-mode flip restyles basemap and layers.
- No console errors other than any blocked `http://` camera image warnings (expected in dev only if the page were https — plain `npm run dev` is http, so there should be none).

- [ ] **Step 3: Confirm the collector has been accumulating**

```bash
git pull --rebase
ls -la data/travel-times/ && wc -l data/travel-times/*.csv
gh run list --workflow=collect-travel-times.yml --limit 5
```

Expected: multiple `data: travel times snapshot` commits have landed since Task 2; the month CSV has grown. If runs show failures, fix before closing out.

- [ ] **Step 4: Update README status and push**

In `README.md`, replace the Status section:

```markdown
## Status

v1 working: traffic (live incidents, cameras, history heatmap, volumes, travel times),
parking (time-of-day rate map), development (notices + permits). Travel-times history
accumulates in `data/travel-times/` every ~20 min via GitHub Actions.

## Development

```bash
npm install
npm run dev   # http://localhost:5173
npm test
```
```

```bash
git add README.md
git commit -m "docs: update readme for v1"
git push
```

- [ ] **Step 5: Verify the pushed state**

```bash
git status
gh repo view --web
```

Expected: clean tree, remote up to date; repo page shows the README and green Actions runs.

---

## Plan self-review notes (already applied)

- **Spec coverage:** every spec feature maps to a task — collector (T2), SODA/SoQL server-side filtering (T3), viewport persistence (T4/T5), traffic layers + sidebar (T6–T9), rate parser + parking map (T10–T11), development layers with the lag caveat surfaced in UI (T12), per-layer error handling (T13), verification (T14). Deferred items (corridor geometry, backend, https camera proxy, Playwright) are backlog in the spec, not tasks here.
- **Known judgment calls:** volume field-name normalization (T8 Step 1) and dev-permit filter options (T12 Step 1) are resolved by live queries during implementation rather than guessed in the plan.
- **Type consistency:** `curbColor` property name, `DevFilters`, `HeatmapFilters`, hook signatures, and layer ids (`incidents`, `cameras`, `incident-heat`, `volumes`, `curbs`, `residential`, `school`, `notices`, `dev-permits`, `building-permits`) are referenced consistently across tasks.
