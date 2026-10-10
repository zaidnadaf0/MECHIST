import json
from pathlib import Path
import numpy as np
import joblib

MODEL_DIR = Path(__file__).resolve().parents[1] / "model"
SCHEMA_PATH = MODEL_DIR / "feature_schema.json"
MODEL_PATH = MODEL_DIR / "model.joblib"
META_PATH = MODEL_DIR / "model_metadata.json"

_schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
_model = joblib.load(MODEL_PATH)
_meta = json.loads(META_PATH.read_text(encoding="utf-8"))

FEATURE_NAMES = _schema["feature_names"]
NUMERIC_COLS = _schema["numeric_cols"]
CATEGORICAL_COLS = _schema["categorical_cols"]
CAT_VOCAB = _schema["cat_vocab"]
NUM_MEANS = _schema["numeric_means"]
NUM_STDS = _schema["numeric_stds"]

def _transform_one(c: dict) -> np.ndarray:
    # build 34-dim vector in feature_names order
    vec = np.zeros(len(FEATURE_NAMES), dtype=np.float64)
    # numeric
    for j, col in enumerate(NUMERIC_COLS):
        v = float(c.get(col, 0))
        mean = NUM_MEANS[col]; std = NUM_STDS[col]
        vec[j] = (v - mean) / std if std else 0.0
    offset = len(NUMERIC_COLS)
    for col in CATEGORICAL_COLS:
        vocab = CAT_VOCAB[col]
        val = c.get(col, "")
        for k, cat in enumerate(vocab):
            idx = offset + k
            vec[idx] = 1.0 if val == cat else 0.0
        offset += len(vocab)
    return vec

def score_candidate(c: dict) -> float:
    x = _transform_one(c).reshape(1, -1)
    if hasattr(_model, "predict_proba"):
        return float(_model.predict_proba(x)[0, 1])
    return float(_model.predict(x)[0])

def model_info():
    return {"model": _meta["model_type"], "winner": _meta["winner"], "version": _meta["trained_at"][:10], "feature_dim": len(FEATURE_NAMES)}
