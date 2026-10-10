# Viva QA

- Why Firebase? Auth + Firestore + Storage + realtime + rules in one, free tier, matches mobile+web.
- Why React? Component reuse, router, ecosystem (Framer, GSAP, Leaflet).
- Why Haversine? Free, offline, geometric baseline; Geoapify/OSM fallback for map tiles, road routing deferred.
- Why Geoapify/OSM? Free tier, Leaflet compatible, fallback when key missing.
- Why ML? Ranking candidates beyond distance/rating heuristics; baseline proves value before adding complexity.
- Why LogisticRegression? Best test Hit@1 0.907 vs RF 0.80, generalises, less overfit (train 0.954 vs RF train 1.0).
- Why baseline? Serious benchmark (Hit@1 0.84) prevents placebo; if ML doesn't beat it, don't ship.
- Leakage? Using future info (assignment, rating after request) as feature. Guard: only pre-dispatch aggregates, no request_id/mechanic_id/target as features, grouped splits.
- Grouped split? Candidates from same request_id never split across train/val/test; else model memorises request.
- Hit@1? Fraction of requests where top-ranked candidate is suitable.
- NDCG? Rank-aware gain; higher when positives appear earlier.
- Matching? eligible filter (approved/available/specialty/radius/declinedBy/active) -> ML rank -> existing offer/accept transaction -> tracking.
- ML fails? Timeout 1.2s -> baseline -> distance; no UI Python errors; diagnostics logged.
- Roles secured? Firebase Auth + RequireAuth + homeForRole + isClaimAdmin claim for admin; Firestore rules enforce customer/mechanic/admin ownership, notification ownership, vehicle ownership.
- GPS? navigator.geolocation watchPosition, throttled 25m/5s, stored baseLat/Lng vs currentLat/Lng, map via Leaflet, ETA = haversine/35*60+noise.
- Synthetic limitation? Bangalore-centred, noise-driven suitability, not real acceptance; disclose, don't claim real accuracy.
