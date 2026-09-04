# MECHIST ML — Phase 6: Dataset & Problem Definition

_Seed: 42 · Generator: `ml/scripts/generate_dataset.py` · Vocab sources: `src/lib/nearby.ts`, `src/pages/auth/MechanicSignup.tsx` · Base: 12.9716,77.5946 (Bangalore) · Synthetic dataset — disclosed and reproducible_

## 1. What is being predicted?
A **candidate-level ranking** — given one service request and its 3–5 candidate mechanics, rank the candidates so the best assignment appears at the top. The model scores each `(request, candidate mechanic)` row and the system ranks within each `request_id` group.

## 2. What does suitability represent?
Binary label `suitability` (1 = suitable / 0 = not). It is a **noisy proxy** for "would this mechanic be the best assignment for this request." It is **not a production outcome** (acceptance/completion/rating after service). Derived from a noisy latent score per request (see § Target below); one row per request is always positive and a close second is sometimes also positive (35% when score gap < 0.6). Positive rate 514/1984 = 25.9%, mean 1.03 positives per request.

## 3. Unit of observation
**One row = one request + one candidate mechanic.** All ranking and evaluation groups by `request_id`. Candidate lists are size 3–5 (mean 3.97), 500 requests, 180-mechanic pool, 1984 total rows.

## 4. Information available at recommendation time
Only information that would exist **before** a mechanic is dispatched:
- Request: `customer_lat/lng` (where help is needed), `problem_category` (`flat-tyre`/`battery`/`engine`/`tow`/`other`), `vehicle_type` (8 types), `urgency` (`low`/`medium`/`high`/`critical`).
- Candidate mechanic (state before this request): `mechanic_lat/lng` (base/current), `service_radius_km`, `specialties` (text → derived binaries only), `vehicle_types` (text → derived binary only), `rating`/`review_count`/`experience_years`/`completion_rate` as **historical aggregates from prior service** available before the current request (not future ratings/feedback about this request), `availability`, `active_jobs`.
- Derived at prediction time from the above: `distance_km` (Haversine from customer to mechanic base), `eta_min` (`distance_km/35·60 + N(0,1.2)` — straight-line proxy, not road routing), `specialty_match`/`vehicle_match`/`within_service_radius` binaries.
- Not available: `pickedMechanicId`, `final assignment`, `future acceptance/completion`, `post-service customer rating/feedback`, `future timestamps`, or any field produced after dispatch.

Historical aggregates (`rating`, `review_count`, `completion_rate`) are acceptable only because they summarise **past** service before the current request; they do not include the outcome of the current request. Future ratings/feedback about this request are not available and are not used.

## 5. Features available
Full per-column decision is in `ml/reports/data_quality_report.md` (Leakage Audit table). Summary: **retained (18)** — `customer_lat/lng`, `problem_category`, `vehicle_type`, `urgency`, `mechanic_lat/lng`, `service_radius_km`, `rating`, `review_count`, `experience_years`, `availability`, `active_jobs`, `completion_rate`, `eta_min`, `distance_km`, `specialty_match`, `vehicle_match`, `within_service_radius`. **Dropped as features:** `request_id`, `mechanic_id` (IDENTIFIER ONLY), `suitability` (TARGET), raw `specialties`/`vehicle_types` text (TRANSFORM — replaced by derived binaries). No future-assignment fields exist in the dataset; none are used as inputs.

## 6. Synthetic vs real
**Entire dataset is synthetic** (no production data, no real customer records). This is clearly disclosed here and in `ml/scripts/generate_dataset.py`. Generation is **reproducible (`SEED=42`)**: `random.seed(42)` and `numpy` seed 42, deterministic haversine, fixed distributions (ratings `N(4.2,0.55)` clipped 2.8–5, Pareto reviews, Gamma service radii, Gaussian locations σ 0.13° customers / 0.18° mechanics). SHA256 `b6265b1033fd24c4ff9620ad946840e177e2a696245ac37cda5e534a6f207c92` for the CSV; see § Reproducibility for versions.

## 7. Limitations
- Not a production label: `suitability` is a proxy, not observed acceptance/completion.
- Synthetic geography (Bangalore-centred), straight-line Haversine + `35 km/h` ETA proxy (not road routing — road ETA is a later phase).
- No temporal effects, no mechanic fatigue history beyond `active_jobs`, no real traffic/pricing/availability dynamics.
- Must not be presented as real-world accuracy.

## 8. Why useful for mechanic recommendation
Even as a proxy, it exercises the full recommendation pipeline (candidate generation → ranking → grouped evaluation) on plausibly distributed data with meaningful signal separation via noise and stochastic second positives. It lets the project validate **data contracts, leakage controls, grouped splitting, and preprocessing** before any real data or production model exists.

---

## Dataset

- **File:** `ml/data/mechist_recommendation_dataset.csv` — **1984 rows** (header + 1984), **500 requests × 3–5 candidates**, **180 mechanic pool**.
- **SHA256:** `b6265b1033fd24c4ff9620ad946840e177e2a696245ac37cda5e534a6f207c92` (cleaned copy identical, 0 deduped).
- **Columns (24):** `request_id, customer_lat, customer_lng, problem_category, vehicle_type, urgency, mechanic_id, mechanic_lat, mechanic_lng, service_radius_km, specialties, vehicle_types, rating, review_count, experience_years, availability, active_jobs, completion_rate, eta_min, distance_km, specialty_match, vehicle_match, within_service_radius, suitability`.
- **Target `suitability`:** noisy latent `score = −dist·0.32 + s_match·4.2 + v_match·2.4 + within·1.8 + rating·0.75 + min(review,80)/80·1.0 + exp/28·0.9 + completion·2.2 − active·0.85 + avail_bonus(1.4 if available) + N(0,0.85)`; top candidate per request is positive, plus 35% second when gap < 0.6. **NOT a copy** (noise + stochastic second positive separate it). Formula and `SEED=42` are in `generate_dataset.py`.
- **Distributions:** `problem_category` flat-tyre 514 battery 493 engine 427 other 294 tow 256; `urgency` medium 782 high 465 low 408 critical 329; 8 `vehicle_type` balanced 217–296 each; `availability` available 1513 / busy 471.
- **Geography & ETA:** Haversine `distance_km` (verified against generator), `eta_min = max(1, round(distance_km/35·60 + N(0,1.2)))` in minutes. Straight-line method; road routing is deferred.

## Leakage guard
Target derived with noise; no feature is the target. Raw `specialties`/`vehicle_types` replaced by binaries `specialty_match`/`vehicle_match` at feature time; `request_id`/`mechanic_id` never features. Full KEEP/DROP/TRANSFORM table in Phase 7 report.

## Splits
Grouped by `request_id` (SHA256-hex sort, deterministic): **train 350 / validation 75 / test 75 requests** → `ml/data/splits.csv` (501 lines including header), `ml/data/mechist_recommendation_dataset_cleaned.csv`, `ml/features/feature_matrix.npz` (dim 34). Transformers fit on train only. Cross-split request overlap = 0/0/0 (verified).

## Artifacts
- `ml/scripts/generate_dataset.py` (SEED=42, reproducible; shares `SPECIALTIES`/`VEHICLE_TYPES` vocab with app source)
- `ml/data/mechist_recommendation_dataset.csv` + `ml/data/mechist_recommendation_dataset_cleaned.csv` + `ml/data/splits.csv`
- `ml/features/feature_matrix.npz` + `ml/features/feature_schema.json` + `ml/reports/preprocessing_report.md`
- Phase 7: `ml/reports/data_quality_report.md`

## Reproducibility
- Seed: `42` in `generate_dataset.py` (`random` + `numpy`), `audit.py`, `feature_engineering.py`.
- Versions at verification: Python 3.13.12, pandas 3.0.5, NumPy 2.4.2, scikit-learn 1.8.0.
- Dataset SHA256 above; schema and feature-matrix SHAs in `feature_schema.json` / `feature_matrix.npz` header.

## Verbatim scope
Master: "complete ONLY Phase 6 Dataset & Problem Definition, Phase 7 Data Quality+Leakage Audit, Phase 8 Feature Engineering+Preprocessing, Phase 9 Deterministic Baseline, DO NOT start Phase 10" — this verification task: **Phases 6–8 only, STOP after Phase 8, DO NOT start Phase 9/10, DO NOT train, DO NOT modify frontend/Firebase/backend/rematching, DO NOT deploy, DO NOT enable billing.**
