import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictRequest, PredictResponse, RankRequest, RankResponse, RankedItem
from .predictor import score_candidate, model_info
import logging
import traceback

log = logging.getLogger("mechist-ml")

app = FastAPI(title="MECHIST ML API", version="1.0.0")

def _cors_origins() -> list:
    """Production CORS is allowlist-driven via ML_CORS_ORIGINS.

    Dev default covers local Vite + common localhost ports. Production
    MUST set ML_CORS_ORIGINS to the exact frontend origin(s), e.g.
    ML_CORS_ORIGINS=https://roadassisst.web.app
    """
    raw = os.environ.get("ML_CORS_ORIGINS", "").strip()
    if raw:
        return [o.strip() for o in raw.split(",") if o.strip()]
    return [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@app.get("/health")
def health():
    return {"status": "ok", **model_info()}

@app.get("/model-info")
def info():
    return model_info()

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        c = req.candidate.model_dump()
        s = score_candidate(c)
        mi = model_info()
        return PredictResponse(mechanic_id=c["mechanic_id"], score=s, model=mi["model"], version=mi["version"])
    except Exception:
        # Never leak tracebacks / paths to callers; details go to server logs.
        log.exception("predict failed")
        raise HTTPException(status_code=500, detail="scoring failed")

@app.post("/rank-mechanics", response_model=RankResponse)
def rank_mechanics(req: RankRequest):
    try:
        if not req.candidates:
            raise HTTPException(status_code=422, detail="candidates must be non-empty")
        scored = []
        for c in req.candidates:
            d = c.model_dump()
            scored.append((d["mechanic_id"], score_candidate(d)))
        scored.sort(key=lambda x: x[1], reverse=True)
        mi = model_info()
        ranked = [RankedItem(mechanic_id=mid, score=sc, rank=i+1) for i, (mid, sc) in enumerate(scored)]
        return RankResponse(ranked=ranked, model=mi["model"], version=mi["version"])
    except HTTPException:
        raise
    except Exception:
        log.exception("rank-mechanics failed")
        raise HTTPException(status_code=500, detail="ranking failed")
