"""
Phase 12 - Model Packaging
Packs winner (logistic_regression) + preprocessing into ml/model/
"""
import json, hashlib, platform, datetime
from pathlib import Path
import joblib, numpy as np
import sklearn, pandas

SEED = 42
MAT = Path("ml/features/feature_matrix.npz")
SCHEMA = Path("ml/features/feature_schema.json")
CAND = Path("ml/model/candidates.joblib")
WINNER_TXT = Path("ml/model/winner.txt")
OUT = Path("ml/model")

winner = WINNER_TXT.read_text(encoding="utf-8").strip()
models = joblib.load(CAND)
best = models[winner]

# Build pipeline-like dict: keep schema + model
schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
metrics = json.loads(Path("ml/reports/model_metrics.json").read_text(encoding="utf-8"))

# Save single model + schema together
import joblib as jb
jb.dump(best, OUT / "model.joblib")
# also save feature_schema copy
Path(OUT / "feature_schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")

# metrics.json -> for api
test_metrics = metrics["results"]["test"]["candidates"][winner]
baseline_test = metrics["results"]["test"]["baseline"]
Path(OUT / "metrics.json").write_text(json.dumps({
    "winner": winner,
    "test": test_metrics,
    "baseline_test": baseline_test,
    "all": metrics["results"],
}, indent=2), encoding="utf-8")

metadata = {
    "model_type": type(best).__name__,
    "winner": winner,
    "params": best.get_params(),
    "seed": SEED,
    "python": platform.python_version(),
    "sklearn": sklearn.__version__,
    "pandas": pandas.__version__,
    "numpy": np.__version__,
    "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "dataset_sha256": hashlib.sha256(Path("ml/data/mechist_recommendation_dataset_cleaned.csv").read_bytes()).hexdigest(),
    "feature_dim": schema["feature_dim"],
    "feature_names": schema["feature_names"],
    "target": schema["target"],
    "numeric_cols": schema["numeric_cols"],
    "categorical_cols": schema["categorical_cols"],
    "cat_vocab": schema["cat_vocab"],
    "numeric_means": schema["numeric_means"],
    "numeric_stds": schema["numeric_stds"],
    "splits": schema["splits"],
    "evaluation": test_metrics,
    "sha256_feature_matrix": hashlib.sha256(MAT.read_bytes()).hexdigest(),
    "sha256_schema": hashlib.sha256(SCHEMA.read_bytes()).hexdigest(),
}
Path(OUT / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
print(f"Packaged winner={winner} -> {OUT}")
print(json.dumps(metadata, indent=2)[:2000])
