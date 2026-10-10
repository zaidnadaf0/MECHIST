<!-- FACTS: importers docs/SCOPE_LOCK.md standalone lock doc referenced by all agents via App.tsx/TopNav/MapPage/NearbyCTA/LandingPage; callers contributors + automation; API watchPublicMechanics+ProviderMap+useGeolocation/useWatchPosition+distanceKm+problemCompatibility+firestore.rules 13 checks; schema PublicMechanic{id,name,baseLat,baseLng,specialties,isAvailable,approved}+GeoState+LatLng; verbatim "provide me the MECHIST — FULL WEBSITE REDESIGN SCOPE LOCK" -->
# MECHIST — FULL WEBSITE REDESIGN SCOPE LOCK
**Version:** v1.0 — 2026-09-05  
**Status:** 🔒 LOCKED — no drift without written amendment  
**Repo:** `D:\MECHIST` · Branch: `fix/bug2-customer-cancel-rules` (→ `main` via PR)  
**Stack:** React 18 + Vite 5 + TS 5.6 + React Router 7 + Firebase 12 + Zustand + Tailwind 3 + Leaflet 1.9 / react-leaflet 4 + Geoapify → OSM (single engine) + Framer Motion / GSAP / Lenis / Three

> Single source of truth for what may and may not change. Any agent, contributor, or automation that violates it must be reverted. It exists to prevent redesign drift, second-engine duplication, and ML/data corruption.

---

## 1. Purpose

MECHIST is a **premium roadside assistance & mechanic recommendation platform** (India-first, Bengaluru coverage). The site must feel cinematic but stay honest: no fake maps, no mock mechanics, no invented metrics. Every pin, ETA, and mechanic is live Firebase data.

---

## 2. Stack Lock — DO NOT REPLACE

| Layer | Locked Choice | Notes |
|---|---|---|
| Build | Vite 5 + `tsc -b` | `npm run typecheck` / `build` must stay green |
| Router | React Router 7 | Public `/`, `/map`, `/how-it-works`, `/mechanics` + auth + portal lazy routes |
| Data | Firebase 12 (Firestore/Auth) | `firebaseConfigured` gate; `watchPublicMechanics` / `listPublicMechanics` only |
| Map | **Leaflet + react-leaflet 4 — ONE engine** | Geoapify tiles via Leaflet when `VITE_MAPS_PROVIDER=geoapify` + `VITE_GEOAPIFY_API_KEY`; otherwise OSM (`src/lib/map.tsx: OSM_TILES`). `TileLayer tileerror` → fallback. **No Mapbox, no Google Maps, no second engine.** |
| Geo | `src/lib/geo.ts` `distanceKm()` (Haversine R=6371, speed 35 km/h for `kmToMin`) + `src/lib/geoapify.ts` pure helpers + `src/lib/geolocation.ts` `useGeolocation()` / `useWatchPosition()` | No duplicate geolocation impl. |
| Nearby | `src/lib/nearby.ts` `problemCompatibility()` stem logic + `nearbyMechanics()` radius 25 km | No mock roster |
| UI | `Button` (primary/live/iris/accent/danger/secondary/ghost) · `Card` (tones) · `SectionHeading` (hue) · `Badge` · `SectionShell` · `PageTransition` | No new design system |
| Motion | Framer Motion + GSAP + Lenis + Three (decorative only) | Marketing art uses `MatchDiagramArt`, not three.js maps |

**Forbidden:** swapping bundler/router/map engine, adding a second tile provider, creating mock mechanic data.

---

## 3. Information Architecture — Routes Lock

```
Public (no auth):  /  /map  /how-it-works  /mechanics
Auth:              /login /register
Customer:          /dashboard /vehicles /history /request /track/:id
Mechanic:          /mechanic /mechanic/history /mechanic/profile
Admin:             /admin /admin/requests /admin/mechanics /admin/users
Shell:             AppShell → TopNav + <Outlet> + Footer · RequireAuth + PortalFallback
```

- `src/App.tsx` is the route registry. Do not add duplicate `/map` or location entries.
- `homeForRole()` and role-aware CTA logic stay.

---

## 4. Landing Page Lock — 12 Sections, No More, No Less

**Order is contractual** (`src/pages/landing/LandingPage.tsx`):

1. `Hero` 2. `HeroMetrics` 3. `Problems` 4. `OperationsSnapshot` 5. `HowItWorks` (6 steps) **6. `NearbyCTA`** 7. `LocationSection` (Bengaluru 8 neighborhoods, illustrative) 8. `MechanicNetwork` 9. `IntelligentMatching` 10. `RealtimeAssistance` 11. `Trust` 12. `FinalCTA`

- `NearbyCTA` ("Need a mechanic nearby? — Find Mechanics Near Me → /map", `MapPin` icon) is the **only** home location CTA.
- **No GPS on landing.** `NearbyCTA` navigates; it does not call `useGeolocation`. Privacy note must remain: "requested only when you open the map and tap Use My Location."
- `LocationSection` stays illustrative (`MatchDiagramArt` + city pins), with labels "illustrative preview · live data on /map". Live counts live only on `/map` and `/mechanics`.
- Do not redesign the entire landing or add sections without amending this lock.

---

## 5. Map & Location Discovery Lock — `/map` (Public)

**Title:** "Find Mechanics Near You" — not "See the network…"
**Discovery is explicit — no auto-GPS.**

| Control | Spec |
|---|---|
| **Use My Location** | Prominent `Button` (`LocateFixed` icon). On click: request `getCurrentPosition` (highAccuracy, 10 s timeout), show "Finding your location…" spinner, center map on fix, render distinct user marker `tone="azure"` label **"You are here"**, sort mechanics by `distanceKm()`, fit bounds. `variant="primary"` when idle → `secondary` when located. |
| **Recenter** | Visible only when `origin` exists. Clears selection, recenters on `origin` at `LOCATED_ZOOM=12`. Does not recreate map instance. |
| **Track My Location** | Toggle `Button` (`Navigation` icon, `aria-pressed`). OFF = one-shot only. ON = `useWatchPosition({ enabled: true, minDistanceM:25, minIntervalMs:5000 })` with haversine throttle, updates marker. `variant="ghost"` → `live` when on. |
| **Category pills** | `all / flat-tyre / battery / engine / tow / other` via `problemCompatibility` |
| **List** | Toggle Show/Hide, distance badge (`MapPin` + `x.x km` via `distanceKm`), `available / on job` |
| **Status banner** | 8 states, `role="status" aria-live="polite"`: `idle` · `requesting → "Finding your location…"` + spinner · `granted → "Location found"` · `denied → "Location permission was denied. Enable…"` + Try again · `unavailable → "Your location is currently unavailable."` · `error/timeout → "Location request timed out. Try again."` · `no mechanics → "No nearby mechanics found."` · `Geoapify unavailable → silent fallback to OSM, no crash` |

**Privacy/Perf (non-negotiable):**
- No auto `requestGeo()` on mount. No continuous watch unless user enables Track.
- `useWatchPosition({ enabled })` — when `false` returns `idle`, no `watchPosition` started, `clearWatch` on disable/unmount/leave.
- Do not recreate `<MapView>` on coord change; reuse instance via `AutoFitBounds` / `RecenterButton`.
- Mechanic markers `tone="aqua"` must stay visually distinct from user `azure`.

**Data:** `watchPublicMechanics(200)` → `toMapMarkers()` (null-safe lat/lng). No duplicate fetch. `DEFAULT_CENTER [12.9716,77.5946] DEFAULT_ZOOM 11 / LOCATED_ZOOM 12`.

---

## 6. Mechanics Directory Lock — `/mechanics`

Public, paginated `listPublicMechanics`, filtered `approved==true && isAvailable==true`. No mock data. Specialty filter + distance when origin known. Reuses same `PublicMechanic` shape as map.

---

## 7. Request & Tracking Lock

- **RequestFlow** (5 steps: Vehicle → Problem → Location → Mechanic → Confirm): `useGeolocation` + `ProviderMap` on step 3, `pickBest` / `nearbyMechanics` for suggestion, `createRequest` status `requested` + `offerExpiresAt +120s`. Preserved.
- **Tracking** (`/track/:id`): `watchRequest` + `ProviderMap` with `userPosition` + `mechanicMarkers` + dashed `Polyline`, live `distanceKm` → `kmToMin`. Preserved.
- **MechanicJob**: live GPS push via `useWatchPosition` throttled `25m/5s`, `LIVE_STATUSES`. Preserved.

No new request states, no ETA fabrication.

---

## 8. Portals Lock

- **CustomerDashboard / Vehicles / History**, **MechanicDashboard / History / Profile**, **AdminDashboard / RequestsQueue / Users / Mechanics** — lazy-loaded via `React.lazy` + `PortalFallback` skeleton. `RequireAuth` with `role === unknown` → `PortalFallback` (not blank).
- Admin UI boundary-wrapped `RetroUI`; no visual leakage.

---

## 9. Shell & Navigation Lock

- **TopNav** (`src/components/shell/TopNav.tsx`): three zones (Product / Operations / About). Desktop `md:flex` + mobile drawer (`AnimatePresence` height animation). `publicLinks` includes `{ to:'/map', label:'Find Mechanics', icon:<MapPin/> }` — label is **"Find Mechanics"** (not "Map"). No duplicate entry. `linksForRole()` governs role menus. Scroll progress `motion.div scaleX(progress)` preserved. Theme toggle + role `Badge` preserved.
- **Footer**: retained. Mobile must expose `/map` via same `publicLinks`.

---

## 10. Visual System Lock

- Tokens: signal gradients `azure → iris → aqua`, `aqua-400/500`, `line-soft`, `surface-1/2/app`, `fg-app/muted/subtle`, `success-500`, `amber-500`.
- Do not introduce new palettes or make controls visually excessive. Map controls use existing `Button`/`Card`/`Badge`.
- `SectionHeading` `hue` drives eyebrow accent. `FadeIn` / `ScrollRevealSection` for reveal.

---

## 11. Data & Rules Lock

- **Firestore Rules** (`firestore.rules`): 13 checks via `npm run lint:rules` — `isClaimAdmin`, role allowlist, `approved` immutability, cancel audit `cancelledAt/cancelledBy/cancellationReason`, `mechanicId` freeze on advance, first-assignment `offerExpiresAt` + `status/mechanicId/mechanicName/etaMin/updatedAt` keys, `mechanics/{uid}` `approved==false` on create, `rating/reviewCount` self-write block, catch-all deny. **Must stay 13/13 green.**
- **Public data** (`src/lib/public.ts`): `PublicMechanic = MechanicProfile {id,name,baseLat,baseLng,specialties,isAvailable,approved,garageName,rating}`. `orderBy name limit 200`, client-filtered `approved && isAvailable`.
- **Functions** (`functions/`): `firebase-admin 14.3`, `npm --prefix functions run build` must pass.

---

## 12. Explicitly Out of Scope — DO NOT TOUCH

```
ml/data/*  ml/features/*  ml/scripts/*  ml/reports/*
ml/reports/problem_definition.md
ml/reports/data_quality_report.md
ml/reports/preprocessing_report.md
Phase 9 (any net-new feature outside this lock)
Phase 6–8 (ML) — no edits
```

- Do not start Phase 9.
- Do not create a second map system or second location state.
- Do not remove Leaflet/OSM fallback.
- Do not add server-side secrets exposure or bypass rules.

---

## 13. Allowed Improvements (Within Lock)

- Copy/UX polish that keeps the 12-section order and existing APIs.
- A11y fixes (`aria-label`, `aria-pressed`, `role="status"`, keyboard nav) using existing hooks.
- Performance: throttle, memo, lazy — no new engines.
- Empty/error/loading states via `EmptyState` / `ErrorState` / `Skeleton`.

---

## 14. Forbidden Changes

- Redesigning the entire landing or shell.
- Replacing `ProviderMap` branching or `OSM_TILES` fallback.
- Auto-requesting GPS on `/` or on `/map` mount.
- Continuously tracking without explicit Track toggle.
- Duplicating nav entries or location state.
- Introducing mock mechanics or fake ETAs.
- Touching any path in §12.

---

## 15. Acceptance Gates — Must Be Green Before Merge

```bash
npm run typecheck                 # tsc -b --noEmit — PASS
npm run build                     # Vite — PASS
npm test                          # Vitest — 3 files / 15 tests — PASS
npm run lint:rules                # 13/13 — PASS
npm --prefix functions run build  # tsc — PASS
```

**Browser proof (18 checks, via `vite preview` on :5174 — do not claim without running):**

1. Home  2. Find Mechanics Near Me → /map  3. /map title "Find Mechanics Near You"  4. Use My Location (request → spinner → found)  5. Permission flow  6. "You are here" distinct marker  7. Mechanic markers  8. Distance `x.x km` via `distanceKm`  9. Track My Location on/off (throttle 25m/5s)  10. Recenter  11. Denied state + guidance  12. Unavailable/timeout  13. Geoapify tiles when key set  14. Leaflet/OSM fallback on `tileerror`  15. Mobile drawer exposes Find Mechanics  16. `/request` flow preserved  17. `/track/:id` preserved  18. Mechanic job live push preserved  + console clean.

**Report shape:**

```
Home CTA: PASS/FAIL  Map: PASS/FAIL  Use My Location: PASS/FAIL  User marker: PASS/FAIL
Track: PASS/FAIL  Recenter: PASS/FAIL  Mechanic markers: PASS/FAIL  Distance: PASS/FAIL
GPS permission: PASS/FAIL  GPS error: PASS/FAIL  Geoapify: PASS/FAIL  OSM fallback: PASS/FAIL
Request: PASS/FAIL  Tracking: PASS/FAIL  Mechanic job: PASS/FAIL  Mobile nav: PASS/FAIL
TypeScript: PASS/FAIL  Build: PASS/FAIL  Tests: PASS/FAIL
Files changed: …
```

---

## 16. Change Control

1. Any change that would alter §2–§14 requires a **written amendment to this file** with: rationale, file list, API/data impact, risk, and rollback.
2. Amendments need explicit user approval — "looks good" is not an amendment.
3. Until amended, the lock wins over any ad-hoc instruction to "redesign" or "just fix it."
4. STOP after the locked task. Do not chain into Phase 9.

---

### Files Governed by This Lock (current shape)

```
src/App.tsx
src/lib/geolocation.ts          # enabled flag is part of the lock
src/lib/geo.ts
src/lib/geoapify.ts
src/lib/map.tsx
src/lib/nearby.ts
src/lib/public.ts
src/components/map/ProviderMap.tsx
src/components/shell/TopNav.tsx # label "Find Mechanics"
src/pages/MapPage.tsx            # explicit discovery — no auto-GPS
src/pages/landing/LandingPage.tsx       # 12-section order
src/pages/landing/section/NearbyCTA.tsx # home CTA
src/pages/landing/section/index.ts
src/pages/landing/section/LocationSection.tsx # illustrative
firestore.rules / firestore.indexes.json
functions/*
```

---

**Sign-off:** This scope is locked until the author edits `docs/SCOPE_LOCK.md` and bumps the version. No agent may declare it "outdated" on its own.

*End of lock.*
