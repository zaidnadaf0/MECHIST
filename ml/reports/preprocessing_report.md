# MECHIST - Phase 8: Feature Engineering + Preprocessing

_Seed: 42  Source: ml\data\mechist_recommendation_dataset_cleaned.csv  Splits: ml\data\splits.csv_

_Feature dim: 34  Train 1386 / Val 296 / Test 302_

_SHA256 cleaned: b6265b1033fd24c4ff9620ad946840e177e2a696245ac37cda5e534a6f207c92_

## Numeric (StandardScaler fit on train only)

| col | mean (train) | std (train) |
|---|---|---|
| customer_lat | 12.9669 | 0.1371 |
| customer_lng | 77.5924 | 0.1269 |
| mechanic_lat | 12.9586 | 0.2003 |
| mechanic_lng | 77.6122 | 0.1865 |
| service_radius_km | 23.0844 | 9.9555 |
| rating | 4.2930 | 0.4670 |
| review_count | 24.6710 | 65.8861 |
| experience_years | 14.7128 | 7.9890 |
| active_jobs | 0.7186 | 0.8324 |
| completion_rate | 0.8792 | 0.0645 |
| eta_min | 56.9228 | 26.8479 |
| distance_km | 33.1801 | 15.6419 |
| specialty_match | 0.5108 | 0.4999 |
| vehicle_match | 0.3240 | 0.4680 |
| within_service_radius | 0.3030 | 0.4596 |

## Categorical (OneHot fit on train only, unknown -> all-zero)

- **problem_category**: ['battery', 'engine', 'flat-tyre', 'other', 'tow']
- **vehicle_type**: ['Commercial fleet', 'EV (electric)', 'Hatchback', 'Motorbike / Scooter', 'Pickup / Truck', 'SUV', 'Sedan', 'Tempo / Van']
- **urgency**: ['critical', 'high', 'low', 'medium']
- **availability**: ['available', 'busy']

## Feature order

num__customer_lat, num__customer_lng, num__mechanic_lat, num__mechanic_lng, num__service_radius_km, num__rating, num__review_count, num__experience_years, num__active_jobs, num__completion_rate, num__eta_min, num__distance_km, num__specialty_match, num__vehicle_match, num__within_service_radius, cat__problem_category__battery, cat__problem_category__engine, cat__problem_category__flat-tyre, cat__problem_category__other, cat__problem_category__tow, cat__vehicle_type__Commercial fleet, cat__vehicle_type__EV (electric), cat__vehicle_type__Hatchback, cat__vehicle_type__Motorbike / Scooter, cat__vehicle_type__Pickup / Truck, cat__vehicle_type__SUV, cat__vehicle_type__Sedan, cat__vehicle_type__Tempo / Van, cat__urgency__critical, cat__urgency__high, cat__urgency__low, cat__urgency__medium, cat__availability__available, cat__availability__busy

## Dropped

- Identifiers: ['request_id', 'mechanic_id'] (never features)
- Raw text: ['specialties', 'vehicle_types'] (replaced by binaries)
- Target: suitability (not a feature)

## Artifacts

- ml\features\feature_matrix.npz (X_train/X_val/X_test, y, req/mech ids, feature_names)
- ml\features\feature_schema.json

## Reproducibility

- All transformers fit on train split only; val/test transformed with same objects.
- Deterministic: SEED=42, no shuffling beyond dataset generation; OHE vocab sorted (5 problem_category + 8 vehicle_type + 4 urgency + 2 availability -> 34 total). Unknown categories -> all-zero (safe). `distance_km` is Haversine (not road-routing).

## Feature leakage

Identifiers request_id/mechanic_id, target suitability, raw specialties/vehicle_types, and future fields are not in matrix. rating/review_count/completion_rate are historical aggregates before this request.

## Versions

Python 3.13.12 pandas 3.0.5 NumPy 2.4.2 scikit-learn 1.8.0. Haversine is geometric distance, not road routing.
