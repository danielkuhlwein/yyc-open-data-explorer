# YYC Open Data Explorer — v1 Design

**Date:** 2026-07-11
**Status:** Approved
**Repo:** `danielkuhlwein/yyc-open-data-explorer` (public)

## Purpose

A fun, local-first web app for exploring City of Calgary open data on interactive maps. Three tabbed domains in v1 — Traffic, Parking, and Development — each map-based, backed directly by Calgary's Socrata (SODA) API with no backend server.

A secondary goal starts on day one: accumulate our own history for the city's Travel Times feed (which the city publishes only as a live snapshot) via a GitHub Actions git scraper, so a future congestion-history feature has months of data behind it by the time it's built.

## Data sources

All datasets live on `data.calgary.ca` (Socrata). Endpoints: `https://data.calgary.ca/resource/<id>.json` (or `.geojson`), CORS-enabled, SoQL query params for server-side filtering/aggregation. No app token in v1; add via env var if rate limits ever bite.

| Dataset | ID | Freshness | Used for |
|---|---|---|---|
| Traffic Incidents | `35ra-9556` | Continuous; 63k rows, 2016→now | Live incident markers + historical heatmap |
| Current Traffic Incidents | `4jah-h97u` | Continuous | Live layer (active incidents only) |
| Traffic Cameras | `k7p9-kppz` | Camera stills refresh every few min | Camera icons + snapshot popups |
| Travel Times | `aeb8-fh2w` | Continuous; 67 corridor segments, no geometry, no history | Live sidebar + git-scraper collection |
| Traffic Volumes | `6wve-2ets` (2016), `nvuz-qykn` (2017), `wwf6-cpsg` (2018), `qeqv-tb2c` (2019), `57me-rcwr` (2022), `bjag-w7zi` (2023), `cauu-7hnw` (2024) — **no 2020/2021 datasets exist** | Annual snapshots; multiline geometry + AADT volume | Volume flow map with year selector |
| On-Street Parking Zones with Rates | `45az-7kh9` | Monthly; 1,650 curb segments, multiline | Rate-colored curb map, schedule popups |
| On-Street Residential Parking Zones | `2rmy-g65b` / polygons `qzsa-aeqp` | ~Monthly | Residential permit zone toggle |
| School Parking Zones | `9hbw-zj92` | Occasional | School zone toggle |
| Development Permits | `6933-unw5` | Daily refresh; new applications lag ~6–8 weeks; 190k rows since 1979 | Filterable permit points |
| Development Permit Public Notices | `8rd9-gix2` | Daily; ~100 currently-posted notices | "Proposed near me right now" layer |
| Building Permits | `c2es-76ed` | Daily (same content lag); 490k rows since 1999; has `estprojectcost`, `totalsqft`, `housingunits` | Bubble layer sized by project cost |

Known data gaps (accepted):
- **No parking availability/occupancy data is published** (ParkPlus keeps it closed). The parking tab is about zones, rates, and rules — not live availability.
- **Travel Times has no geometry** — v1 renders it as a sidebar panel, not on the map. Hand-matching the 67 segments to street geometry is backlogged.
- **Camera URLs are `http://`** — fine for local dev; mixed-content-blocked under https hosting (backlog: proxy or link-out).

## Stack

- **Vite + React 19 + TypeScript (strict)**
- **Maps:** `react-map-gl/maplibre` over **MapLibre GL JS v5**; basemap tiles from **OpenFreeMap** (no key), light + dark styles
- **Routing:** React Router; `/traffic`, `/parking`, `/development` as lazy-loaded routes
- **Server state:** TanStack Query — caching, retry/backoff, `refetchInterval: 60_000` for live layers
- **Client state:** Zustand for shared map viewport (tab switches preserve camera) and per-tab layer toggles
- **Styling:** Tailwind v4, dark-mode aware; map style follows the app theme

## Architecture

```
src/
  lib/
    datasets.ts      # dataset IDs + TypeScript row types (single source of truth)
    soda.ts          # SoQL query builder + fetch helpers (json/geojson)
    rateSchedule.ts  # parseRateSchedule(html) -> RateWindow[]  (pure, unit-tested)
  hooks/             # one TanStack Query hook per dataset (useTrafficIncidents, useCameras, ...)
  stores/            # zustand: viewport, layer toggles
  components/
    MapCanvas.tsx    # shared map wrapper (basemap, theme, viewport binding)
    LayerPanel.tsx   # per-tab layer toggle UI
    ...popups, controls
  tabs/
    traffic/  parking/  development/
scripts/
  collect-travel-times.mjs   # git-scraper fetch+append script (plain Node, no deps)
data/
  travel-times/YYYY-MM.csv   # accumulated snapshots, committed by CI
docs/superpowers/specs/      # this spec; future plans in docs/superpowers/plans/
.github/workflows/collect-travel-times.yml
```

Data-flow rule: **all filtering/aggregation happens server-side via SoQL** (`$where`, `$select`, `$group`, `date_extract_hh`, `date_extract_dow`). The browser never downloads more than it renders. Default windows for the big tables: Development Permits → last 2 years (~12k rows); Building Permits → last 12 months.

## Tabs

### Traffic
Toggleable layers, all off-map controls in a `LayerPanel`:
1. **Live incidents** — `4jah-h97u` (the active-incidents feed; `35ra-9556` is used only for history), red markers, popup with description/quadrant/time, 60s refetch.
2. **Cameras** — 205 camera icons; popup embeds the JPEG snapshot (`camera_url`) with location caption and a manual refresh button (cache-busting query param).
3. **Incident history heatmap** — MapLibre native heatmap over `35ra-9556`. Controls: date-range presets (30d / 1y / all), hour-of-day range slider, weekday/weekend toggle. Filters compile to SoQL so the payload stays small.
4. **Traffic volumes** — line layer from the yearly Traffic Volumes datasets; line width + color scale by `volume`; year dropdown (2016–2024, with 2020–2021 marked unavailable).
5. **Travel Times sidebar** — live minutes grouped by corridor, last-update stamp, 60s refetch. Not on the map in v1 (no geometry).

### Parking
1. **Metered curbs** — `45az-7kh9` line layer. Core interaction: **time selector** (day-of-week + time-of-day, defaulting to "now") recolors each curb by its hourly rate at that moment, client-side (1,650 features — trivial).
2. **Rate parsing** — `parseRateSchedule(html)` converts the city's semi-structured `html_zone_rate` into `{days, start, end, ratePerHour}` windows. Most-tested code in the app. Segments that fail to parse fall back to categorical color by `price_zone` and show the raw (sanitized) schedule HTML in the popup.
3. **Popups** — address, schedule table, `max_time`, `enforceable_time`, stall type, restrictions.
4. **Toggles** — residential permit polygons (`qzsa-aeqp`), school zones (`9hbw-zj92`).

### Development
1. **Public Notices** — `8rd9-gix2`, distinctive markers; popup: description, status, notice window (`dp_ad_dt` → `dp_ad_end_dt`), community.
2. **Development Permits** — `6933-unw5` circle layer with filter panel: applied-date range (default last 2 years), status, category. Popup: full permit detail incl. decision + SDAB appeal fields.
3. **Building Permits** — `c2es-76ed` bubble layer, radius by `estprojectcost` (default last 12 months). Popup: cost, sqft, housing units, contractor, status.

Cut from v1 (YAGNI): community-level stat panels, land-use redesignation and secondary-suite layers, any charting beyond the map.

## Travel-times collector

- `.github/workflows/collect-travel-times.yml`: cron `*/20 * * * *`, runs `scripts/collect-travel-times.mjs`, commits changes.
- Script: fetch `aeb8-fh2w` JSON (67 rows), append `fetched_at, corridor, road_segment, travel_time_mins, last_update` to `data/travel-times/YYYY-MM.csv` (header row on file creation). Idempotence guard: skip append if the feed's `last_update` values are unchanged since the last snapshot.
- Documented caveat: GitHub cron jitters and occasionally skips under load — cadence is "roughly every 20 min", adequate for congestion trends.
- Data commits use the `github-actions[bot]` identity with a plain subject (`data: travel times snapshot`). The backlogged backend imports these CSVs later, so nothing is throwaway.

## Error handling

- Per-layer, non-blocking: a failed dataset shows a small banner chip in the layer panel ("Traffic cameras unavailable — retrying"); last-good data stays rendered with a stale indicator. The map and other layers remain usable.
- TanStack Query defaults handle retry/backoff; live layers surface `dataUpdatedAt` so staleness is visible.
- Rate-parse failures degrade per-segment (categorical color + raw schedule), never hide the segment.

## Testing

- **Vitest**: `parseRateSchedule` (the workhorse — fixture HTML from real rows), SoQL builder, data transforms (volume color scale, heatmap filter compilation), collector append/idempotence logic.
- **React Testing Library**: filter controls and layer panel behaviour (toggles drive store state).
- **Not in v1**: map-render e2e (MapLibre + jsdom is not worth it). Verification is manual via the running app; Playwright is a fast-follow candidate.

## Backlog (explicitly deferred)

1. **Tiny backend / serverless** — fast-follow: serve accumulated travel-times history, proxy `http://` camera images for https hosting, optional response cache.
2. **Travel-times corridor geometry** — hand-match the 67 segments to Major Road Network (`tqjs-vnhy`) lines; then a live congestion-colored map layer + history charts from the collected CSVs.
3. Hosting (static — Pages/Netlify), Playwright smoke tests, app token via env, additional development layers (land-use redesignations, secondary suites).

## Risks

| Risk | Mitigation |
|---|---|
| Rate HTML format drifts / has unparseable variants | Fallback rendering path is first-class, parser is fixture-tested against real data |
| GitHub cron jitter thins travel-time history | Acceptable for trends; backend fast-follow can tighten cadence |
| Dev-permit content lag (~6–8 weeks) disappoints "live hub" expectation | Public Notices layer is the genuinely-current signal and is featured first |
| SODA anonymous rate limits | Queries are windowed + cached; app token is a one-line env addition |
