# YYC Open Data Explorer

Interactive maps for exploring [City of Calgary open data](https://data.calgary.ca) — traffic, parking, and development activity, each on its own tab.

- **Traffic** — live incidents and traffic cameras, a 2016→now incident heatmap, annual traffic-volume flow maps, and live corridor travel times
- **Parking** — every metered curb in the city, colored by what parking costs at a chosen time of day
- **Development** — currently-posted development notices, plus filterable development and building permits

Built with Vite, React, TypeScript, and MapLibre GL JS on OpenFreeMap tiles. Data comes straight from Calgary's Socrata (SODA) API — no backend. A GitHub Actions cron snapshots the city's live [Travel Times](https://data.calgary.ca/d/aeb8-fh2w) feed into `data/travel-times/` to build the congestion history the city doesn't publish.

Design spec: [docs/superpowers/specs/2026-07-11-yyc-open-data-explorer-design.md](docs/superpowers/specs/2026-07-11-yyc-open-data-explorer-design.md)

## Status

Early days — spec approved, implementation starting.
