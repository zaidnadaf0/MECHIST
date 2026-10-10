# ML Pipeline

Synthetic dataset, seed 42, not real-world.

## Phases 6-8
Dataset 1984 rows, 500 requests, 180 mechanics. 34-dim features (15 numeric scaled + 19 OHE). Grouped splits train 350 / val 75 / test 75 requests. Leakage audit: identifiers and raw text dropped.

## Phase 9 Baseline
Weights: specialty_match 2.0, vehicle_match 1.0, within_radius 1.2, rating 0.8, completion 0.6, distance -1.5, active -0.9, eta -0.6, available 0.7. Test Hit@1 0.84, NDCG@3 0.924.

## Phases 10-11 Training & Eval
- DecisionTree max_depth 8: test Hit@1 0.587
- RandomForest 200 trees d12: test 0.80 (overfits train 1.0)
- KNN k7: test 0.76
- LogisticRegression: test Hit@1 0.907, NDCG@3 0.959 — winner, beats baseline by +6.7pp.

## Phase 12 Packaging
ml/model/model.joblib (LogisticRegression), feature_schema.json, metrics.json, model_metadata.json with python/sklearn versions, dataset SHA, feature list.

## Phase 13 API
FastAPI at ml/api/main.py: GET /health, /model-info, POST /predict, POST /rank-mechanics. Validates inputs, preprocesses via same scaler/OHE, returns scores + model metadata. CORS open. Frontend never runs Python.

## Phase 14 Integration
RequestFlow step 4 ranks eligible candidates (already filtered by approved/available/specialty/radius/declinedBy via nearbyMechanics) via rankMechanics() -> ML API else baseline. ML does not bypass hard constraints.

## Phase 15 Fallback
Hierarchy: ML -> baseline -> distance. 1.2s timeout, invalid response -> baseline, no customer-visible Python errors, console.info diagnostic.

## Phase 16 NLP
TF-IDF (1-2gram, 500 feats) + LogisticRegression on synthetic breakdown text -> problem_category. Accuracy 1.0 on synthetic (trivial templates) — disclosed as toy, explicit category selection preserved over NLP when user picks.

## Phase 17 ETA
Not trained as ML: dataset eta_min is Haversine/35kmh + Gaussian noise synthetic proxy, not real road time. Retain deterministic routing; document limitation. Separate evaluation would need real traffic/road data.

## Phase 18 Tests
ml/tests/test_ml_pipeline.py covers schema, leakage, load/predict, api predictor, nlp, ranking fallback. Deterministic seed 42.

## Limitations
Synthetic geography Bangalore-centred, no temporal dynamics, label is noisy proxy not production acceptance, NLP trivial, ETA synthetic.
