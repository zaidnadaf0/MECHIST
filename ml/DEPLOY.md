# MECHIST ML API — deploy notes

Service: `ml/api/main.py` (FastAPI). Endpoints: `GET /health`,
`GET /model-info`, `POST /predict`, `POST /rank-mechanics`.

## Run locally

```bash
pip install fastapi uvicorn pydantic joblib numpy scikit-learn
uvicorn ml.api.main:app --port 8000
```

The frontend defaults to `http://localhost:8000` when `VITE_ML_API_URL`
is unset (`src/lib/mlRank.ts`, 1.2 s timeout, deterministic baseline
fallback — no crash, no fake ML scores).

## Production

- Frontend: set `VITE_ML_API_URL=https://<ml-host>` (see `.env.example`).
  Never hardcode hosts in source. Never commit secrets.
- Backend CORS: set `ML_CORS_ORIGINS` to the exact frontend origin(s),
  comma-separated, e.g. `ML_CORS_ORIGINS=https://roadassisst.web.app`.
  Unset = localhost dev origins only.

## Honesty contract (do not edit without team review)

- The training dataset (`ml/data/`) is **synthetic/generated** (seed 42).
  Never describe it as real-world data.
- The evaluated winner is **Logistic Regression** (`ml/model/winner.txt`,
  `Hit@1 ≈ 0.907`, `NDCG@3 ≈ 0.959` on the synthetic test split —
  proxy metrics, not real-world accuracy).
- ETA shown in the app is straight-line distance/speed based, **not**
  traffic-aware. Haversine is a distance algorithm, **not ML**.
