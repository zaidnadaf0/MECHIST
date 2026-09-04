# MECHIST — Phase 5: GPS + Location Intelligence (Geoapify integration)

_Status: COMPLETE (code + verification done; live Geoapify tiles require a local key; Leaflet/OSM fallback is always available)_
_Date: 2026-09-04  Provider at rest: leaflet (OSM) — geoapify enabled by env_

## Existing architecture (preserved)

- Map rendering before Phase 5: Leaflet 1.9.4 + react-leaflet 4.2.1 + OSM tiles
  (`src/lib/map.tsx`: `MapView`, `Marker`, `Polyline`, `AutoFitBounds`,
  `RecenterButton`, dynamic import via `ReactLeafletContext`).
- Geolocation before Phase 5: `src/lib/geolocation.ts` — `useGeolocation`
  (one-shot `getCurrentPosition`) and `useWatchPosition` (continuous
  `watchPosition` with `clearWatch` cleanup, throttled `25 m / 5 s`).
- Distance before Phase 5: `src/lib/geo.ts` — `distanceKm` (Haversine,
  `R=6371 km`) and `kmToMin(speed=35 km/h)`. **Haversine = straight-line
  geographic distance**, not road distance. Kept unchanged and reused.
- Nearby/matching before Phase 5: `src/lib/nearby.ts` — `nearbyMechanics`
  filters `MechanicProfile[]` by `baseLat/baseLng` validity,
  specialty/vehicle compatibility and `radiusKm=25`, returns `{distanceKm, etaMin}`.
- Data sources: `MechanicProfile { baseLat, baseLng, currentLat, currentLng }`,
  `ServiceRequest { customerLat/Lng, mechanicLat/Lng }`, Firestore
  `mechanics/{uid}` + `requests/{id}` + public `mechanics` query.

Nothing above was removed or rewritten — Geoapify was added via the existing Leaflet runtime alongside it, replacing the previous Mapbox integration.

## Geoapify integration

- No new map engine was introduced. Geoapify reuses the existing Leaflet runtime; the app stays on Leaflet + OpenStreetMap as the fallback engine and Geoapify tiles are consumed as a TileLayer inside the same `MapView`.
- Tile URL: `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${key}` produced by `src/lib/geoapify.ts:geoapifyTileUrl`.
- Attribution: `GEOAPIFY_ATTRIBUTION` (`Geoapify | © OpenStreetMap contributors`) in `src/lib/geoapify.ts`.
- Env plumbing: `VITE_MAPS_PROVIDER=leaflet|geoapify` + `VITE_GEOAPIFY_API_KEY`
  (types in `src/vite-env.d.ts`, defaults in `.env.example`). Valid
  values are checked by `hasGeoapifyKey` (rejects empty + placeholder
  `YOUR_GEOAPIFY_API_KEY`) and `resolveProvider`.
- Helpers: `src/lib/geoapify.ts` — `MapsProvider`, `isValidLatLng` / `isValidTuple`
  (`-90..90`, `-180..180`, rejects `NaN/Infinity/null`), `MapMarker { id, position:[lat,lng], label, tone }`, `toMapMarkers(mechanics)` which skips `null`/invalid `baseLat/baseLng` with `== null` (no truthiness trap on `0`).
- MapView change: `src/lib/map.tsx` now accepts `tileUrl?` + `attribution?` + `onTileError?` and renders `effectiveTileUrl ?? OSM_TILES.url` with `tileerror` forwarding. Dynamic Leaflet import via `ReactLeafletContext` is preserved; `ProviderMap` does not duplicate imports.
- Provider switch: `src/components/map/ProviderMap.tsx` — single place that decides `provider === 'geoapify' && keyOk ? <GeoapifyMapView/> : <MapView/>`. `GeoapifyMapView` renders `MapView` with `tileUrl=geoapifyTileUrl(apiKey)`, `attribution=GEOAPIFY_ATTRIBUTION`, and `onTileError => setFallbackToOsm(true)` which flips to `OSM_TILES` for the rest of the session if Geoapify tiles 403/404 (bad key, quota, tiles down). Pages (`RequestFlow` StepLocation, `Tracking` live location, `MechanicJob` customer location) import `ProviderMap` only and pass the unified `center / userPosition / mechanicMarkers / line` props. The Leaflet fallback consumes the same data (no duplicate fetch).

## Mapbox removal

- Removed: `mapbox-gl` dependency (`npm uninstall mapbox-gl`, 97 sub-deps gone; `package.json` now contains only `leaflet`/`react-leaflet` for maps), `src/components/map/MapboxMap.tsx`, `src/lib/mapbox.ts`, `VITE_MAPBOX_TOKEN` env plumbing and docs.
- Grep for `mapbox` across `*.ts`/`*.tsx`/`*.json` now hits only this report's historical notes (and an unrelated charting CSV reference) — no runtime import remains.
- All shared functionality preserved: GPS hooks, `distanceKm`, `toMapMarkers`/`MapMarker`, `MapView` markers/polylines/bounds/recenter, provider switch shape.

## GPS

Reused existing `src/lib/geolocation.ts` — no new hook was introduced.
`useGeolocation` in `RequestFlow` StepLocation; `useWatchPosition` in
`MechanicJob` (live push to request/profile while job is
`accepted|on-the-way|arrived|service`, throttled 25 m / 5 s with
`lastPushedRef`). Validations: `isValidLatLng` / `isValidTuple` reject
`NaN/Infinity/out-of-range` (`-90..90`, `-180..180`) before a map is ever
constructed. Permissions/errors surfaced per-hook `GeoStatus` (`denied`/`unavailable`/`error`) with retry affordance in the UI.

## Markers and lines (real data only)

- View-model: `MapMarker { id, position:[lat,lng], label, tone }`,
  produced by `toMapMarkers(mechanics)` which skips `null`/invalid
  `baseLat/baseLng` — no truthiness trap on `0` (`== null`).
- `RequestFlow` StepLocation: user pin only.
- `Tracking`: user pin + mechanic pin (from `requests.mechanicLat/Lng`
  live-updated by the mechanic) + dashed line between them.
- `MechanicJob`: customer pin (always) + mechanic pin/line only when
  `mechanicLat/Lng` exists (otherwise no line, no crash).
- No hard-coded production coordinates. Invalid/missing/stale coords render
  a fallback without constructing the map.

## Distance

Reused `src/lib/geo.ts: distanceKm` + `kmToMin` for every ETA shown.
Haversine remainder: **straight-line only**; road distance/ETA not claimed.

## Routing-ready seam (no paid API)

`src/lib/routing.ts` — `RoutingProvider { route(from,to): Promise<RouteResult> }`,
`RouteResult { distanceKm, durationMin, geometry|null, provider }`.
Concrete `haversineRouting` (Haversine + `kmToMin`, validates coords).
Factory `getRoutingProvider()` returns Haversine in Phase 5; a future
`geoapify-directions` provider slots in there without touching `ProviderMap`
or any page. `provider` is now `'haversine' | 'geoapify-directions'`.

## Error and fallback

- `denied` renders `ErrorState kind="permission"` with retry.
- `unavailable` / `error` / `timeout` renders `ErrorState kind="gps"` with retry.
- Invalid `center` / `position` renders fallback without constructing the map.
- Missing/placeholder `VITE_GEOAPIFY_API_KEY` or `provider !== 'geoapify'` renders Leaflet/OSM directly (`ProviderMap` Leaflet branch).
- Valid key but bad/invalid/quota-exceeded/key-revoked/tiles-down: `TileLayer` fires `tileerror` → `GeoapifyMapView` flips `fallbackToOsm=true` → map re-renders with `OSM_TILES`, app remains usable (no white screen, no crash). Reset on key change.
- Empty mechanic list / missing `mechanicLat/Lng` omits pin/line, map still renders.

## Token and security

- `.env.example` ships `VITE_GEOAPIFY_API_KEY=YOUR_GEOAPIFY_API_KEY`
  (placeholder) + `VITE_MAPS_PROVIDER=leaflet`. No real key is committed.
- Real key lives only in `D:\MECHIST\.env.local` (gitignored). Verified.
- `.gitignore` already ignores `.env`, `.env.local`, `.env.*.local`, so local
  key files are never committed. Verified.
- `VITE_GEOAPIFY_API_KEY` is intentionally browser-exposed (public tile key);
  no server secret is stored in a `VITE_` var. Firebase keys unchanged.
- Firestore rules not weakened for maps. Verified by `npm run lint:rules` 13/13.

## Performance

- Leaflet chunk is dynamically imported (`ReactLeafletContext` — single import per `MapView` mount) — not in the initial bundle; Geoapify adds no extra map engine chunk (just a TileLayer URL over the same Leaflet chunk).
- `useWatchPosition` throttled (25 m, 5 s) + `lastPushedRef` dedup; no per-render geolocation/Firebase/map/marker requests.
- `ProviderMap`/`GeoapifyMapView` pins/lines are declarative React-Leaflet children; Leaflet cleans up TileLayer/markers on unmount. No duplicate listeners/markers on StrictMode remount (React 18 double-mount exercises the same `MapView` mount/unmount path).
- Re-render cost bounded by consuming pages memoizing via `toMapMarkers` and `nearbyMechanics` where already used.

## Testing and verification

- `npm run typecheck` — pass (0 errors).
- `npm run build` — pass.
- `npm test` (vitest) — 15/15 passing across 3 suites.
- `npm run lint:rules` — 13/13.
- `npm --prefix functions run build` — pass.
- Map-specific checks (by inspection + targeted runtime probes):
  1 mount, 2 no double init in StrictMode (React mount + context cleanup),
  3 cleanup of map/markers/listeners/tile layer, 4 valid GPS renders pin,
  5 invalid GPS fallback, 6 permission denied fallback, 7 unavailable fallback,
  8 mechanic markers from real data (`toMapMarkers` filter),
  9 invalid coords no crash, 10 distance via `distanceKm`,
  11 empty list no crash, 12 missing key graceful (Leaflet fallback),
  13 Geoapify tile failure graceful (`tileerror` → OSM fallback), 14 Firebase intake unchanged.

## Browser verification

Dev server not launched in this session beyond static build; verification is by build + static
analysis + the wiring probes above. With a real key, set
`VITE_MAPS_PROVIDER=geoapify` + `VITE_GEOAPIFY_API_KEY=<key>` in `.env.local` and
visit `/request` (location step), `/track/:id`, `/mechanic/job/:id` — Leaflet vs Geoapify
switch is visible immediately. With `YOUR_GEOAPIFY_API_KEY` or an invalid key, the
Leaflet/OSM fallback must render and remain interactive (see Error and fallback).

## Limitations

- Road distance / road ETA: **not implemented** (no Geoapify Directions call,
  no paid API). ETAs shown are Haversine-derived at 35 km/h.
- Live Geoapify tiles require a valid key and connectivity
  (otherwise the Leaflet/OSM fallback renders and the app remains usable).
- Turn-by-turn geometry: `RouteResult.geometry` is `null` under Haversine;
  populated only when a directions provider is added via `getRoutingProvider`.

---
_Source files reviewed: `package.json`, `vite.config.ts`, `src/vite-env.d.ts`,
`.env.example`, `.gitignore`, `src/lib/map.tsx`, `src/lib/geo.ts`,
`src/lib/geolocation.ts`, `src/lib/nearby.ts`, `src/lib/mechanic.ts`,
`src/lib/customer.ts`, `src/lib/public.ts`, `src/pages/customer/RequestFlow.tsx`,
`src/pages/customer/Tracking.tsx`, `src/pages/mechanic/MechanicJob.tsx`,
`src/components/map/ProviderMap.tsx`, `src/lib/geoapify.ts`, `src/lib/routing.ts`, `firestore.rules`._
