# MECHIST — Project Memory

Updated: 2026-09-09 (UTC)
Final project: `D:\MECHIST`
Reference: `D:\RoadAssistBACKUP` (do not copy blindly; adapt patterns only)

## What MECHIST is
Premium cinematic roadside-assistance platform. Customer ↔ Mechanic ↔ Admin, role-gated, Firebase Auth + Firestore realtime, Leaflet/OSM map, ML-ranked matching with hard eligibility first.

Stack: React 18 + TS + Vite + Tailwind + shadcn, Firebase modular v12, Functions node20, FastAPI ML in `ml/api`.

## Must preserve (never downgrade)
- Normalized Firestore schema (`users, vehicles, requests, mechanics, notifications/{uid}/items`), 9 indexes
- Claim-based admin (`token.admin`), no self-promote, frozen role/approved/rating
- Request state machine + `offerExpiresAt` (120s) + `declinedBy` + release/rematch, all transactional
- GPS throttled (25m/5s), listener cleanup, lazy Three/WebGL public-only, Lenis public-only, no global auth gate, 8s role timeout
- ML: hard filter → ML → baseline → distance, 1.2s timeout; LogisticRegression winner; NLP toy (explicit selection authoritative); ETA ML BLOCKED (Haversine only)

## Never port from BACKUP
- `appState/{uid}` monolith, client-writable role, broad `requests update`, unvalidated create, owner delete, forged mirror, fail-open demo fallback, fake earnings/logs/ETA as real

## Audit decisions (KEEP/ADAPT/MERGE/UPGRADE/REBUILD/REMOVE)
- KEEP MECHIST: shell/routing/guards, Firestore/rules/Functions/transactions, ML/GPS, perf splits
- ADAPT BACKUP: service catalogue values, queue/earnings/dispatch/analytics/reports/logs/profile/settings/notifications/emergency/detail/receipt patterns, ui kit charts/tables/empty/skeleton, map fallback, badge patching
- MERGE: RequestFlow+services, Tracking+receipt, Dashboard+queue, Admin queue+dispatch
- REBUILD missing in MECHIST style: services, mechanic detail, history detail, notifications, profile, emergency, mechanic requests/earnings, admin dispatch/analytics/reports/logs
- REMOVE: fake data as real, `appState` model, client role checks; bridge `glow-effect.tsx` kept (not a duplicate)

## Routes (23 → 35, all role-guarded)
Public: `/, /login, /login/customer, /login/mechanic, /signup/customer, /signup/mechanic, /admin/login, /mechanics, /map, /how-it-works`
Customer portal: `/dashboard, /request?service=&mechanic=, /services, /mechanics/:id, /track/:id, /history, /history/:id, /vehicles, /notifications, /profile, /emergency`
Mechanic: `/mechanic, /mechanic/requests, /mechanic/job/:id, /mechanic/history, /mechanic/earnings, /mechanic/profile`
Admin: `/admin, /admin/requests, /admin/dispatch, /admin/mechanics, /admin/users, /admin/analytics, /admin/reports, /admin/logs`

Nav: PortalShell customer 9, mechanic 5, admin 8 (Operations + Insight). Mobile bottom tabs = first 4.

## Workflows (all connected)
Customer: dashboard → services → request (vehicle/problem/location/mechanic/confirm) → track → history receipt → notifications
Mechanic: dashboard → requests (accept/decline) → job (accepted→on-the-way→arrived→service→completed, GPS push, release) → earnings/history
Admin: overview → requests/dispatch (assign/reassign transactional) → mechanics approve → users → analytics/reports CSV → logs

## This session batches (done, no commit/push)
1-4: added `src/lib/services.ts` + 12 pages (Services, MechanicDetail, HistoryDetail, Notifications, Profile, Emergency, Requests, Earnings, Dispatch, Analytics, Reports, Logs); wired App.tsx + PortalShell + barrels
5-8: RequestFlow `?service/?mechanic`, History View → receipt, Dashboard recent/quick actions, Directory Details + `?mechanic`; edge states everywhere; no fake data
9: typecheck PASS, build PASS, vitest 15/15 PASS, rules 16/16 PASS, functions build PASS

## Rules
- NO commit, NO push, NO destructive reset (user explicit)
- Fix UI/data flow, never weaken rules
- ₹0/free-tier only, no paid APIs, no secrets in repo
- Verify after every batch: typecheck, build, tests, rules, functions build

## Remaining / next
- BLOCKER (proven 2026-09-09): Firestore `(default)` DB does not exist for `mechist-e0eba` (REST 404). Create it in console (asia-south1) + enable Email/Password auth + `firebase deploy --only firestore:rules,firestore:indexes,storage`. Until then all live reads fail.
- DEMO PREVIEW (added, BACKUP-style): `src/lib/demo.ts` + `DemoBanner` + `/login` preview buttons. `?demo=1` or localStorage `mechist.demo.v1`; read-only sample data (6 mechanics, 2 vehicles, 4 requests, 3 notifications, 3 users); writes stay on real path. Exit via banner/Sign out. Production path untouched.
- Manual `npm run dev` walkthrough: 3 portal chains, wrong-role bounce, console/network, icons, dead buttons, responsive
- Optional: ML compile/tests run, History enrichment check, `verify:all`
- Say `save now` to refresh this file after next work.
