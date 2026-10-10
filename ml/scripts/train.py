"""
Phase 10 - Model Training (SEED=42)
Trains 4 candidates on ml/features/feature_matrix.npz (dim 34, grouped splits).
Models: DecisionTree, RandomForest, KNN (scaled), LogisticRegression
Saves: ml/model/candidates.joblib (dict of fitted models) + per-model raw scores
Evaluation of ranking is deferred to evaluate.py; here we just fit.
"""
import json, hashlib, platform, datetime
from pathlib import Path
import numpy as np
import sklearn, pandas
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
import joblib

SEED = 42
MAT = Path("ml/features/feature_matrix.npz")
SCHEMA = Path("ml/features/feature_schema.json")
OUT_DIR = Path("ml/model")
OUT_DIR.mkdir(parents=True, exist_ok=True)

data = np.load(MAT, allow_pickle=True)
X_train = data["X_train"].astype(np.float64)
y_train = data["y_train"].astype(int)

# KNN needs scaling - but X is already StandardScaler+OHE from Phase 8 (train-fit)
# So KNN can consume directly. Document this.

models = {}

# 1) Decision Tree (classifier)
dt = DecisionTreeClassifier(random_state=SEED, max_depth=8, min_samples_leaf=4)
dt.fit(X_train, y_train)
models["decision_tree"] = dt

# 2) Random Forest
rf = RandomForestClassifier(random_state=SEED, n_estimators=200, max_depth=12, min_samples_leaf=2, n_jobs=-1)
rf.fit(X_train, y_train)
models["random_forest"] = rf

# 3) KNN (k=7)
knn = KNeighborsClassifier(n_neighbors=7, weights="distance", n_jobs=-1)
knn.fit(X_train, y_train)
models["knn"] = knn

# 4) Logistic Regression (L2)
lr = LogisticRegression(random_state=SEED, max_iter=500, solver="lbfgs")
lr.fit(X_train, y_train)
models["logistic_regression"] = lr

joblib.dump(models, OUT_DIR / "candidates.joblib")
print(f"Saved {OUT_DIR / 'candidates.joblib'} with {list(models.keys())}")

# metadata stub
meta = {
    "seed": SEED,
    "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "python": platform.python_version(),
    "sklearn": sklearn.__version__,
    "pandas": pandas.__version__,
    "numpy": np.__version__,
    "feature_dim": int(X_train.shape[1]),
    "train_rows": int(X_train.shape[0]),
    "models": {k: type(v).__name__ + " " + str(v.get_params())[:200] for k,v in models.items()},
    "sha256_feature_matrix": hashlib.sha256(MAT.read_bytes()).hexdigest(),
    "sha256_schema": hashlib.sha256(SCHEMA.read_bytes()).hexdigest() if SCHEMA.exists() else None,
}
Path(OUT_DIR / "training_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
print(json.dumps(meta, indent=2))
