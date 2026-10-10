# RoadAssisst — Faculty / Viva / Demo Pack

> Every claim below reflects the implemented system in `D:\MECHIST`.
> Labels used: **VERIFIED** (proven live on emulator) · **STATICALLY VERIFIED**
> (code + build reviewed) · **UNIT TESTED** · **NOT TESTED** (no browser/env).

## 1. Project overview

**RoadAssisst** is a real full-stack roadside-assistance platform. A stranded
driver creates a request (vehicle + problem + GPS location); the backend
matches an approved, available mechanic; both sides track the job live on a
map; the customer rates the service; admins monitor, dispatch, and audit —
all persisted in Firestore with realtime updates.

- **Abstract / problem:** Breakdowns strand drivers who today rely on phone
  calls, unknown garages, and opaque ETAs. RoadAssisst replaces that with
  verified mechanics, live tracking, and transparent per-job pricing.
- **Objectives:** (1) request help in under a minute, (2) trustworthy
  assignment, (3) realtime visibility, (4) honest records and ratings.
- **Users:** customers (drivers), mechanics (providers), admins (operations).
- **Advantages:** verified network, live GPS sharing, race-safe assignment,
  server-side rating integrity, honest empty/error states everywhere.
- **Conclusion:** a working three-portal realtime system with ML-assisted
  ranking, hardened security rules, and full local-emulator verifiability.

## 2. Architecture

```
React 18 + TypeScript + Vite + Tailwind
  → Firebase Auth (email/password, role docs, admin custom claims)
  → Firestore (users, vehicles, requests, mechanics, notifications, …)
  → Cloud Functions (onRequestWrite dispatch/rematch/rating/phone/notify,
     scheduled expiry + stale cleanup, forceRematch)
  → ML API (FastAPI, Logistic Regression) with deterministic fallback
  → Leaflet + OpenStreetMap (+ optional Geoapify), browser geolocation
```

- **React layer:** three lazy-loaded portals (customer/mechanic/admin),
  role-guarded routes, realtime `onSnapshot` listeners with cleanup,
  single shared inbox subscription.
- **Auth:** Firebase Auth; role read from `users/{uid}.role`; admin power
  requires the server-minted `admin` custom claim — frontend role is UX only.
- **Firestore:** source of truth; 19/19 static rules checks; per-owner
  reads/writes, state-machine transition guards, offer-expiry enforcement.
- **Functions:** Node 20, firebase-functions 5.1.1; assignment, rematch,
  rating aggregation, phone attach, and inbox notifications all run here.
- **ML API:** FastAPI (`/health`, `/model-info`, `/predict`,
  `/rank-mechanics`); CORS allowlisted via `ML_CORS_ORIGINS`; generic 500s.
- **Maps:** one engine (Leaflet); straight-line Haversine distance.

## 3. Modules & workflows

- **Customer:** breakdown → vehicle → location → problem → ranked mechanic
  candidates → request → tracking → cancel (when valid) → history/receipt →
  rating → notifications → profile/settings.
- **Mechanic:** verification → availability → live queue with 2-minute
  server-expiry countdown → accept/decline → active job (25 m / 5 s live GPS)
  → on-the-way → arrived → service → completed → history → settled earnings.
- **Admin:** dashboard (incl. unmatched-request banner) → requests queue →
  dispatch (assign unassigned / reassign in-flight, transactional) →
  mechanic approvals → users → analytics (real aggregates, honest "—") →
  CSV reports → derived activity logs → diagnostics.

## 4. Algorithms (Haversine is NOT ML)

- **Haversine** (`geo.ts`, `matching.ts`): great-circle distance from
  lat/lng. Used for candidate radius, sorting, and ETA.
- **ETA = distance ÷ 35 km/h** — explicitly **not traffic-aware**.
- **Matching/ranking:** hard eligibility (approved, available, specialty,
  radius, not-declined) then ordering by ML score with deterministic
  baseline fallback. Server auto-dispatch picks the top candidate
  transactionally.

## 5. Machine learning (synthetic data — never real-world)

- **Dataset:** `ml/data/` is **synthetic/generated** (seed 42). Stated in
  `ml/reports/problem_definition.md` and `docs/`.
- **Compared models:** Logistic Regression, Random Forest, Decision Tree
  (see `ml/reports/model_comparison.md`); **winner: Logistic Regression**
  (`ml/model/winner.txt`) — kept on evidence, not on plan.
- **Actual test metrics** (`ml/model/metrics.json`, synthetic split):
  Hit@1 ≈ 0.907, Hit@3 = 1.0, NDCG@3 ≈ 0.959, ROC_AUC ≈ 0.896.
  These are **proxy metrics, not real-world accuracy**.
- **Features:** rating, distance, ETA, specialty/vehicle/radius matches
  (deterministic derivations documented in `mlRank.ts`); completion_rate /
  active_jobs are documented safe defaults (0.88 / 0) — **not** live
  observations. Urgency derives from category (tow/engine = high).
- **Integration:** 1.2 s timeout → deterministic baseline → distance order;
  never crashes, never fakes an ML score (`mlRank.test.ts`, 7 tests).

## 6. Request state machine (`requestStatus.ts`)

`requested → accepted → on-the-way → arrived → service → completed`,
plus `cancelled`. Every transition is validated twice: client transaction
pre-checks **and** Firestore rules (first-assignment requires empty
mechanic + unexpired offer; mechanics may only advance assigned jobs;
customers may only cancel/rate their own; admins act via claim branch).
Concurrent accepts resolve to exactly one winner (**VERIFIED** live).

## 7. Firebase / security

- Ownership everywhere (vehicles, requests, notifications, contacts).
- Mechanic contact split: public roster carries **no** phone/email
  (rules reject them; R018); owner-only `private/contact`; customer calls
  via server-attached `mechanicPhone`.
- Ratings: client bounded 1–5 / ≤500 chars by rules (R019); aggregation
  server-side, idempotent, delta-correct on re-rate.
- Assignment/approval/role changes are transactions gated by claims.

## 8. Maps / GPS

Leaflet + OSM (Geoapify optional with OSM fallback); one-shot customer
fix with permission-state banners; mechanic `watchPosition` only while a
live job is open (auto `clearWatch` on close); 25 m / 5 s throttle;
single map engine; no simulated movement anywhere.

## 9. Testing evidence

| Check | Result | Label |
|---|---|---|
| Frontend typecheck (`tsc -b`) | clean | STATICALLY VERIFIED |
| Production build | ✓ ~11 s | VERIFIED (build) |
| Vitest (4 files) | **22/22** (incl. 7 ML-fallback tests) | UNIT TESTED |
| Rules linter | **19/19** | STATICALLY VERIFIED |
| Functions `tsc` | clean | STATICALLY VERIFIED |
| ML pytest (`ml/tests/`) | **14/14** | UNIT TESTED |
| Emulator E2E (migration, auto-dispatch, producers, accept race, cancel race, expiry, terminal guard) | **7/7** | VERIFIED (emulator) |
| Multi-browser realtime / prod credentials | — | NOT TESTED (no prod creds used; prod never written to) |
| Local scheduled-cron execution | ticks don't fire in emulator | BLOCKED BY ENVIRONMENT (definitions + queries proven; prod Cloud Scheduler unaffected) |

## 10. Faculty demo script (5–10 min)

1. Landing: brand, "Roadside help, when you need it", live map teaser. (1 min)
2. Customer login → dashboard → vehicles. (1 min)
3. Request flow: vehicle → problem → **location permission banner** → ranked
   candidates (explain ML vs baseline) → receipt → submit. (2 min)
4. Mechanic login → live queue → **2-minute countdown** → accept. (1 min)
5. Customer tracking updates **without refresh**; mechanic advances
   on-the-way → arrived → service → completed. (2 min)
6. Rating → history receipt → inbox notification → admin dispatch/
   analytics CSV. (2 min)
7. Close with architecture diagram + honesty slide (synthetic data,
   non-traffic ETA). (1 min)

## 11. Viva Q&A (short answers)

- **Why RoadAssisst?** Opaque, call-based breakdown help → verified,
  tracked, rated network.
- **Who uses it?** Drivers, mechanics, ops admins — separate portals.
- **Why Firebase/Firestore?** Auth + realtime document DB + transactions +
  rules in one backend; `onSnapshot` gives live UI without polling.
- **How does security work?** Claims + ownership + transition guards in
  rules; frontend checks are UX only.
- **Why OpenStreetMap/Leaflet?** Free, no API key, single engine.
- **What is Haversine?** Great-circle distance formula — geometry, NOT ML.
- **Why ML, and why Logistic Regression?** Ordering candidates beats
  distance-only; LR won the held-out evaluation (Hit@1 ≈ 0.907 synthetic).
- **Hit@1 / NDCG@3?** Fraction of times the best mechanic ranks first /
  ranking-quality score emphasizing top positions.
- **What is synthetic data?** Generated fixtures (seed 42), not customer
  records — metrics are proxies.
- **Limitations?** Synthetic training, non-traffic ETA, no push (FCM),
  device-local emergency contacts.
- **If ML fails?** 1.2 s timeout → deterministic baseline → distance order;
  the request flow never blocks.
- **Race-safe assignment?** Transactions + rules: one winner (proven live).
- **What was tested?** See §9 table. **What wasn't?** Live prod +
  multi-browser (no credentials used).

## 12. Team contributions (PROPOSED — confirm with team)

- **Mohammed Zaid Nadaf** — customer portal + request/tracking UX.
- **Saadiq** — mechanic portal (queue, GPS job lifecycle, earnings).
- **Tanzil** — admin control center (dispatch, approvals, analytics).
- **Zama** — Firebase/security/ML integration + QA and this pack.

## 13. Limitations (all currently true)

Synthetic ML dataset · non-traffic-aware ETA · no FCM push (realtime
inbox instead) · device-local emergency contacts · local cron ticks don't
fire in emulator · fresh shells default to Node 24 (per-shell activation
documented) · no live-prod or multi-browser test evidence.

## 14. Future scope (not current functionality)

Real-world ML dataset · traffic-aware routing · FCM push · payments ·
advanced analytics · demand prediction · multilingual UI · native apps ·
wider geography.

## 15. Demo checklist

- [ ] Emulators running (`firebase emulators:start --only
  firestore,functions,auth,pubsub,storage --project demo-mechist`)
- [ ] Node 20 active (`. .\scripts\Activate-Node20.ps1`)
- [ ] Seeded mechanic approved + available; test customer + admin accounts
- [ ] ML API running (`uvicorn ml.api.main:app --port 8000`) — optional,
  fallback covers
- [ ] Three windows ready: customer / mechanic / admin
- [ ] Honesty slide printed (synthetic data, ETA, test labels)

## 16. Project health summary

Functionality locked and verified: typecheck clean, build ✓, Vitest
**22/22**, rules **19/19**, functions compile, ML pytest **14/14**,
emulator E2E **7/7**. No P0 defects. No backup/demo/fake architecture.
Brand: RoadAssisst (safety-orange primary CTAs, role tones preserved).
