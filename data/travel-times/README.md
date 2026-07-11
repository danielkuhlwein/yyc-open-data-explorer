# Travel times data

Append-only snapshots of the City of Calgary travel times feed
(https://data.calgary.ca/resource/aeb8-fh2w.json), one CSV per month
(`YYYY-MM.csv`), written by `scripts/collect-travel-times.mjs` on a
20-minute GitHub Actions schedule.

## Columns

| Column | Meaning |
| --- | --- |
| `fetched_at` | Collector fetch time, UTC ISO 8601 with `Z` suffix |
| `corridor` | Corridor name from the feed |
| `road_segment` | Directional road segment description |
| `travel_time_mins` | Reported travel time in minutes |
| `last_update` | The feed's own update timestamp, copied verbatim |

Timezone note for importers: `fetched_at` is UTC. `last_update` is
timezone-naive and is local Calgary time (America/Edmonton) as published
by the city feed — its UTC offset changes across DST, so do not treat it
as UTC or compare it directly with `fetched_at`.

`.last-update` stores the greatest `last_update` seen; the collector
skips a snapshot when that value hasn't advanced.
