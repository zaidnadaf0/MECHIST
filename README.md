# MECHIST

Premium cinematic roadside-assistance & mechanic-recommendation platform.

Customer ↔ Mechanic ↔ Admin, role-gated, with real-time job tracking on
Firebase (Auth + Firestore) and a Leaflet/OSM map for live locations.

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill in Firebase values (see below)
npm run dev                      # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck   # tsc -b --noEmit
npm run build       # tsc -b && vite build  →  dist/
npm run preview     # serve the built bundle locally
```

---

## Environment variables

All variables are **public-by-design** (Vite-prefixed `VITE_*` is shipped
to the browser). Firebase Web SDK config is meant to be public — security
is enforced by Firestore Rules + custom claims, not by hiding these keys.

| Variable                          | Where to get it                                            |
| -------------------------------- | ---------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`          | Firebase Console → Project settings → General → Web app    |
| `VITE_FIREBASE_AUTH_DOMAIN`      | same place, e.g. `mechist.firebaseapp.com`                 |
| `VITE_FIREBASE_PROJECT_ID`       | same place, e.g. `mechist-prod`                            |
| `VITE_FIREBASE_STORAGE_BUCKET`   | same place                                                 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | same place                                              |
| `VITE_FIREBASE_APP_ID`           | same place                                                 |
| `VITE_FIREBASE_MEASUREMENT_ID`   | optional, only if Analytics is enabled                     |
| `VITE_MAPS_PROVIDER`             | `leaflet` (only supported provider today)                  |

If `VITE_FIREBASE_API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `APP_ID` are
empty, `src/app/firebase.ts` returns `null` from its accessors and every
page renders the empty/error state — the app boots, just with no data.

---

## Architecture (one-screen tour)

```
src/
  app/                 App-wide providers: AuthProvider, firebase init, ThemeProvider
  components/          UI primitives (ui/), motion, effects (Lottie, Lightning), shell
  lib/                 Pure data layer
    authProfile.ts     Firestore role/approval helpers (the *only* role source)
    firebase.ts        Lazy Firebase init, null-safe accessors
    customer.ts        Vehicles + service-request CRUD, watchRequest
    mechanic.ts        Mechanic profile, acceptJob (Firestore transaction), live location
    admin.ts           Admin reads/writes across collections
    nearby.ts          Pure filters (specialty, radius, eligibility)
    geo.ts             Haversine, bearing, ETA — dependency-free for testing
    geolocation.ts     useGeolocation / useWatchPosition with cleanup
    map.tsx            MapView, Marker, Polyline, AutoFitBounds (lazy react-leaflet)
    firestoreHooks.ts  useFirestoreQuery, useFirestoreDoc — onSnapshot wrappers
  pages/
    landing/           Public marketing site (one file per section)
    auth/              Login + signup (customer / mechanic / admin)
    customer/          /dashboard /request /track /history /vehicles
    mechanic/          /mechanic /mechanic/job/:id /mechanic/history /mechanic/profile
    admin/             /admin /admin/mechanics /admin/requests /admin/users
firebase.json          Firestore rules + indexes (no Hosting config yet)
firestore.rules        Role gates, request state machine, self-approval blocked
firestore.indexes.json Composite indexes for the queries actually issued
```

### Role flow

1. `AuthProvider` listens to Firebase Auth and reads the canonical role
   from `users/{uid}.role`. localStorage is **never** trusted.
2. `<RequireAuth requireRole="...">` gates every portal route.
3. **The admin role cannot be self-issued.** `firestore.rules` only allows
   `role in ['customer', 'mechanic']` on `users/{uid}` create. The first
   admin must be created by another admin (Cloud Function / manual
   Console write).

### Request lifecycle

```
REQUESTED → ACCEPTED → ON_THE_WAY → ARRIVED → SERVICE → COMPLETED
            (or CANCELLED at any time)
```

Mechanics claim a request via a `runTransaction` in `acceptJob` that
re-checks status + `offerExpiresAt` atomically — no race conditions, no
fake timers. Customer side tracks live via `watchRequest`; mechanic side
pushes GPS via `pushMechanicLocation*` (throttled by `useWatchPosition`
to ≥25 m or ≥5 s).

---

## Deploying

Not yet configured (see the master-plan audit). Once a target is picked
(Vercel / Firebase Hosting), point it at `npm run build` and supply the
`VITE_FIREBASE_*` env vars in the hosting dashboard. Firestore rules
ship via `firebase deploy --only firestore`.

---

## Project status

This README documents a working foundation. The full 25-phase audit lives
in the conversation log — Phases 1–9 are wired, Phases 10–13 (ML/NLP),
Phase 18 (testing), Phase 22 (deployment), and Phase 23 (docs) are open
work. Don't ship to customers until those land.