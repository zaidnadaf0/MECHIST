# MECHIST - Phase 9: Deterministic Baseline + Evaluation

_Seed: 42  Feature matrix: ml\features\feature_matrix.npz  Schema: ml\features\feature_schema.json_

_SHA256 feature_matrix: 160d9352bd471ee375e7cf15d5d9c64dc1329339ae2736db403a0fb12fdc6aa4_

_SHA256 schema: b82cc40c501ac83a74cacd4c445963f18a4f37af7bcf7401aaf04192ba2a43a1_

## Baseline: Transparent Weighted Ranker

Fixed weights (not tuned on val/test; no learning):

| feature | weight | rationale |
|---|---|---|
| num__rating | 0.8 | positive signal |
| num__active_jobs | -0.9 | penalty |
| num__completion_rate | 0.6 | positive signal |
| num__eta_min | -0.6 | penalty |
| num__distance_km | -1.5 | penalty |
| num__specialty_match | 2.0 | positive signal |
| num__vehicle_match | 1.0 | positive signal |
| num__within_service_radius | 1.2 | positive signal |
| cat__availability__available | 0.7 | positive signal |

Score = X @ w (X is scaled/OHE from Phase 8). No bias. No training.

## Metrics (grouped by request_id, ranking within each request)

| split | groups | Hit@1 | Hit@3 | NDCG@3 | NDCG@5 |
|---|---|---|---|---|---|
| train | 350 | 0.8171 | 0.9943 | 0.9236 | 0.9260 |
| val | 75 | 0.6667 | 1.0000 | 0.8682 | 0.8682 |
| test | 75 | 0.8400 | 0.9733 | 0.9241 | 0.9356 |

## Notes

- Ranking per request (candidate list 3-5). NDCG uses binary relevance (suitability).
- Deterministic (SEED=42), not tuned against val/test.
- Transformers fit on train only (Phase 8); baseline reuses same X.