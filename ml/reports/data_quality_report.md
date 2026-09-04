# MECHIST - Phase 7: Data Quality + Leakage Audit

_Source: ml\data\mechist_recommendation_dataset.csv - 1984 rows -> cleaned 1984 rows, 500 requests_

_SHA256 source: b6265b1033fd24c4ff9620ad946840e177e2a696245ac37cda5e534a6f207c92_

_SHA256 cleaned: b6265b1033fd24c4ff9620ad946840e177e2a696245ac37cda5e534a6f207c92_

_Seed: 42  splits.csv: train 350 / validation 75 / test 75 requests_

## A-H Checks

- **PASS** - Range customer_lat [-90,90]: all valid
- **PASS** - Range customer_lng [-180,180]: all valid
- **PASS** - Range mechanic_lat [-90,90]: all valid
- **PASS** - Range mechanic_lng [-180,180]: all valid
- **PASS** - Range distance_km [0,500]: all valid
- **PASS** - Range rating [0,5]: all valid
- **PASS** - Range review_count [0,10000]: all valid
- **PASS** - Range experience_years [0,60]: all valid
- **PASS** - Range completion_rate [0,1]: all valid
- **PASS** - Range eta_min [0,600]: all valid
- **PASS** - No exact duplicated rows
- **PASS** - No duplicated request+mechanic pairs
- **INFO** - Target suitability positive rate: 514/1984 (25.9%) mean 1.03 positives/request
- **INFO** - problem_category: {'tow': 256, 'flat-tyre': 514, 'battery': 493, 'other': 294, 'engine': 427}
- **INFO** - vehicle_type: {'Pickup / Truck': 218, 'Tempo / Van': 248, 'SUV': 296, 'Commercial fleet': 234, 'Motorbike / Scooter': 255, 'EV (electric)': 217, 'Sedan': 292, 'Hatchback': 224}
- **INFO** - urgency: {'medium': 782, 'low': 408, 'high': 465, 'critical': 329}
- **INFO** - availability: {'busy': 471, 'available': 1513}
- **INFO** - Outliers distance_km IQR [20.79,44.10] IQR=23.31 outliers 3/1984 (0.2%)
- **INFO** - Outliers rating IQR [3.97,4.68] IQR=0.71 outliers 0/1984 (0.0%)
- **INFO** - Outliers review_count IQR [9.00,18.00] IQR=9.00 outliers 188/1984 (9.5%)
- **INFO** - Outliers eta_min IQR [35.00,76.00] IQR=41.00 outliers 3/1984 (0.2%)
- **INFO** - Outliers retained (distance reflects real geography); no clipping applied.

## Leakage Audit

| feature | decision | rationale |
|---|---|---|
| request_id | IDENTIFIER ONLY | Never a feature; grouping key for split/ranking only. |
| mechanic_id | IDENTIFIER ONLY | Never a feature; entity identifier. |
| customer_lat | KEEP | Request feature; target derived from noisy latent not raw coords. |
| customer_lng | KEEP | Same. |
| problem_category | KEEP | Request feature. |
| vehicle_type | KEEP | Request feature. |
| urgency | KEEP | Request feature. |
| mechanic_lat | KEEP | Mechanic position feature. |
| mechanic_lng | KEEP | Mechanic position feature. |
| service_radius_km | KEEP | Mechanic capability. |
| specialties | TRANSFORM | Raw text; OHE after mapping to specialty_match/vehicle_match only derived binaries are used. Raw dropped. |
| vehicle_types | TRANSFORM | Same; mapped to vehicle_match. |
| rating | KEEP | Mechanic quality feature. |
| review_count | KEEP | Mechanic quality feature. |
| experience_years | KEEP | Mechanic quality feature. |
| availability | KEEP | Mechanic state feature. |
| active_jobs | KEEP | Workload feature. |
| completion_rate | KEEP | Reliability feature. |
| eta_min | KEEP | Derived from distance; not target. Target has noise term so not a copy. |
| distance_km | KEEP | Derived via Haversine; input to score with noise so not a proxy copy. |
| specialty_match | KEEP | Binary derived legitimately from problem_category x specialties. |
| vehicle_match | KEEP | Binary derived from vehicle_type x vehicle_types. |
| within_service_radius | KEEP | Binary derived from distance <= radius. |
| suitability | TARGET | Prediction target (outcome proxy). Must not be used as input feature. |

## Dropped / Retained Features

- **Dropped as features**: request_id, mechanic_id (IDENTIFIER ONLY), suitability (TARGET). Raw specialties and vehicle_types text replaced by derived binaries specialty_match, vehicle_match.
- **Retained features (18)**: customer_lat,customer_lng,problem_category,vehicle_type,urgency,mechanic_lat,mechanic_lng,service_radius_km,rating,review_count,experience_years,availability,active_jobs,completion_rate,eta_min,distance_km,specialty_match,vehicle_match,within_service_radius.
- **Target**: suitability (binary ranking label; not a copy of any input - noisy latent with Gaussian noise + stochastic second positive).

## Action Taken

- Deduped 0 duplicate request+mechanic rows (keep first). No rows dropped for missing (none). Outliers retained. splits.csv at ml\data\splits.csv. Cleaned dataset at ml\data\mechist_recommendation_dataset_cleaned.csv.

## Historical aggregates note

`rating`/`review_count`/`completion_rate` are historical aggregates from prior service before the current request and are treated as information available at recommendation time. They do not include the outcome (rating/feedback/acceptance/completion) of the current request.

## Distance / ETA note

`distance_km` is straight-line Haversine distance (R=6371 km). `eta_min = distance_km/35*60 + N(0,1.2)` — straight-line proxy at 35 km/h, not road-routing (deferred).
