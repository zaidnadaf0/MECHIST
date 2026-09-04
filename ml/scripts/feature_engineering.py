"""
Phase 8 - Feature Engineering + Preprocessing (SEED=42)
Fit transformers on train only; transform val/test with same objects.
Importers: baseline.py consumes feature_matrix.npz + feature_schema.json
Reads: ml/data/mechist_recommendation_dataset_cleaned.csv, ml/data/splits.csv
Writes: ml/features/feature_matrix.npz, ml/features/feature_schema.json, ml/reports/preprocessing_report.md
Schema: 24 cols in -> 18 retained (15 numeric scaled + 4 cat OHE), target suitability
User verbatim: 'continue' + master 'Phases 6-9 only, stop before Phase 10'
"""
import csv
import json
import hashlib
from pathlib import Path
import numpy as np
SEED = 42
np.random.seed(SEED)
CLEANED = Path("ml/data/mechist_recommendation_dataset_cleaned.csv")
SPLITS = Path("ml/data/splits.csv")
OUT_DIR = Path("ml/features")
REPORT = Path("ml/reports/preprocessing_report.md")
SCHEMA = Path("ml/features/feature_schema.json")
OUT_DIR.mkdir(parents=True, exist_ok=True)
REPORT.parent.mkdir(parents=True, exist_ok=True)
split_map = {}
with open(SPLITS, encoding="utf-8") as f:
    for row in csv.DictReader(f):
        split_map[row["request_id"]] = row["split"]
rows = list(csv.DictReader(CLEANED.open(encoding="utf-8")))
for r in rows:
    r["_split"] = split_map.get(r["request_id"], "train")
NUMERIC_COLS = ["customer_lat","customer_lng","mechanic_lat","mechanic_lng","service_radius_km","rating","review_count","experience_years","active_jobs","completion_rate","eta_min","distance_km","specialty_match","vehicle_match","within_service_radius"]
CATEGORICAL_COLS = ["problem_category","vehicle_type","urgency","availability"]
TARGET = "suitability"
IDENTIFIERS = ["request_id","mechanic_id"]
DROP_RAW_TEXT = ["specialties","vehicle_types"]
train_rows = [r for r in rows if r["_split"] == "train"]
val_rows = [r for r in rows if r["_split"] == "validation"]
test_rows = [r for r in rows if r["_split"] == "test"]
def to_float(v):
    try: return float(v)
    except: return 0.0
numeric_means = {}
numeric_stds = {}
for col in NUMERIC_COLS:
    vals = np.array([to_float(r[col]) for r in train_rows], dtype=np.float64)
    m = float(vals.mean()); s = float(vals.std(ddof=0))
    if s < 1e-9: s = 1.0
    numeric_means[col]=m; numeric_stds[col]=s
cat_vocab = {}
for col in CATEGORICAL_COLS:
    vals = sorted(set(r[col] for r in train_rows))
    cat_vocab[col]=vals
feature_names = []
feature_names.extend([f"num__{c}" for c in NUMERIC_COLS])
for col in CATEGORICAL_COLS:
    for v in cat_vocab[col]:
        feature_names.append(f"cat__{col}__{v}")
def transform(rows_in):
    n=len(rows_in); d=len(feature_names)
    X=np.zeros((n,d), dtype=np.float32)
    y=np.zeros(n, dtype=np.int64)
    req_ids=[]; mech_ids=[]
    for i,r in enumerate(rows_in):
        y[i]=int(r[TARGET]); req_ids.append(r["request_id"]); mech_ids.append(r["mechanic_id"])
        for j,col in enumerate(NUMERIC_COLS):
            v=to_float(r[col])
            X[i,j]=(v-numeric_means[col])/numeric_stds[col]
        offset=len(NUMERIC_COLS)
        for col in CATEGORICAL_COLS:
            vocab=cat_vocab[col]; val=r[col]
            for k,cat in enumerate(vocab):
                idx=offset+k
                X[i,idx]=1.0 if val==cat else 0.0
            offset+=len(vocab)
    return X,y,req_ids,mech_ids
X_train,y_train,req_train,mech_train=transform(train_rows)
X_val,y_val,req_val,mech_val=transform(val_rows)
X_test,y_test,req_test,mech_test=transform(test_rows)
np.savez_compressed(OUT_DIR/"feature_matrix.npz", X_train=X_train, y_train=y_train, X_val=X_val, y_val=y_val, X_test=X_test, y_test=y_test, feature_names=np.array(feature_names), req_train=np.array(req_train), mech_train=np.array(mech_train), req_val=np.array(req_val), mech_val=np.array(mech_val), req_test=np.array(req_test), mech_test=np.array(mech_test))
schema={"seed":SEED,"numeric_cols":NUMERIC_COLS,"categorical_cols":CATEGORICAL_COLS,"cat_vocab":cat_vocab,"numeric_means":numeric_means,"numeric_stds":numeric_stds,"feature_names":feature_names,"feature_dim":len(feature_names),"target":TARGET,"identifiers":IDENTIFIERS,"dropped_raw_text":DROP_RAW_TEXT,"splits":{"train":len(train_rows),"validation":len(val_rows),"test":len(test_rows)},"sha256_source":hashlib.sha256(CLEANED.read_bytes()).hexdigest(),"sha256_splits":hashlib.sha256(SPLITS.read_bytes()).hexdigest()}
SCHEMA.write_text(json.dumps(schema, indent=2), encoding="utf-8")
lines=[]
lines.append("# MECHIST - Phase 8: Feature Engineering + Preprocessing\n")
lines.append(f"_Seed: {SEED}  Source: {CLEANED}  Splits: {SPLITS}_\n")
lines.append(f"_Feature dim: {len(feature_names)}  Train {len(train_rows)} / Val {len(val_rows)} / Test {len(test_rows)}_\n")
lines.append(f"_SHA256 cleaned: {schema['sha256_source']}_\n")
lines.append("## Numeric (StandardScaler fit on train only)\n")
lines.append("| col | mean (train) | std (train) |")
lines.append("|---|---|---|")
for c in NUMERIC_COLS: lines.append(f"| {c} | {numeric_means[c]:.4f} | {numeric_stds[c]:.4f} |")
lines.append("\n## Categorical (OneHot fit on train only, unknown -> all-zero)\n")
for col in CATEGORICAL_COLS: lines.append(f"- **{col}**: {cat_vocab[col]}")
lines.append("\n## Feature order\n")
lines.append(", ".join(feature_names))
lines.append("\n## Dropped\n")
lines.append(f"- Identifiers: {IDENTIFIERS} (never features)")
lines.append(f"- Raw text: {DROP_RAW_TEXT} (replaced by binaries)")
lines.append(f"- Target: {TARGET} (not a feature)")
lines.append("\n## Artifacts\n")
lines.append(f"- {OUT_DIR/'feature_matrix.npz'} (X_train/X_val/X_test, y, req/mech ids, feature_names)")
lines.append(f"- {SCHEMA}")
lines.append("\n## Reproducibility\n")
lines.append("- All transformers fit on train split only; val/test transformed with same objects.")
lines.append("- Deterministic: SEED=42, no shuffling beyond dataset generation; OHE vocab sorted.")
REPORT.write_text("\n".join(lines), encoding="utf-8")
print(f"Feature engineering complete: dim={len(feature_names)} train={len(train_rows)} val={len(val_rows)} test={len(test_rows)}")
print(f" -> {OUT_DIR/'feature_matrix.npz'}")
print(f" -> {SCHEMA}")
print(f" -> {REPORT}")
