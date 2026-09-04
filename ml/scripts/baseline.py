"""
Phase 9 - Deterministic Baseline + Evaluation (SEED=42)
Reads: ml/features/feature_matrix.npz (dim 34) + ml/features/feature_schema.json
Writes: ml/reports/baseline_report.md + ml/reports/baseline_metrics.json
Metrics: Hit@1/Hit@3/NDCG@3/NDCG@5 per split grouped by request_id
Weights: fixed transparent (distance/rating/specialty etc), not tuned on val/test
User verbatim: 'continue' + master 'Phases 6-9 only'
"""
import json
import hashlib
from pathlib import Path
from collections import defaultdict
import numpy as np
SEED = 42
np.random.seed(SEED)
MAT = Path("ml/features/feature_matrix.npz")
SCHEMA_PATH = Path("ml/features/feature_schema.json")
REPORT = Path("ml/reports/baseline_report.md")
REPORT.parent.mkdir(parents=True, exist_ok=True)
# Security: MAT is generated locally by ml/scripts/feature_engineering.py (trusted
# first-party artifact). The stored arrays include string ids (feature_names,
# req_*/mech_*) so allow_pickle=True is required; do not load untrusted .npz here.
data = np.load(MAT, allow_pickle=True)
feature_names = list(data["feature_names"])
def idx(name):
    try: return feature_names.index(name)
    except ValueError: return None
w = np.zeros(len(feature_names), dtype=np.float64)
for feat, weight in [("num__specialty_match",2.0),("num__vehicle_match",1.0),("num__within_service_radius",1.2),("num__rating",0.8),("num__completion_rate",0.6),("num__distance_km",-1.5),("num__active_jobs",-0.9),("num__eta_min",-0.6)]:
    i = idx(feat)
    if i is not None: w[i]=weight
i_av = idx("cat__availability__available")
if i_av is not None: w[i_av]=0.7
def score(X): return X @ w
def evaluate(X, y, req_ids):
    scores = score(X)
    groups = defaultdict(list)
    for i, rid in enumerate(req_ids):
        groups[str(rid)].append((scores[i], int(y[i]), i))
    hits1=0; hits3=0; ndcg3=0.0; ndcg5=0.0
    n_groups=len(groups)
    for rid, items in groups.items():
        items_sorted=sorted(items, key=lambda x: x[0], reverse=True)
        positives=[pos for _,pos,_ in items_sorted]
        if positives[0]==1: hits1+=1
        if any(p==1 for p in positives[:3]): hits3+=1
        for k in [3,5]:
            dcg=0.0
            for rank,(sc,rel,_) in enumerate(items_sorted[:k], start=1):
                if rel: dcg+=(2**rel-1)/np.log2(rank+1)
            ideal=sorted(positives, reverse=True)
            idcg=0.0
            for rank,rel in enumerate(ideal[:k], start=1):
                if rel: idcg+=(2**rel-1)/np.log2(rank+1)
            ndcg=(dcg/idcg) if idcg>0 else 0.0
            if k==3: ndcg3+=ndcg
            else: ndcg5+=ndcg
    return {"groups":n_groups,"Hit@1":hits1/n_groups if n_groups else 0,"Hit@3":hits3/n_groups if n_groups else 0,"NDCG@3":ndcg3/n_groups if n_groups else 0,"NDCG@5":ndcg5/n_groups if n_groups else 0}
splits={}
for split in ["train","val","test"]:
    X=data[f"X_{split}"]; y=data[f"y_{split}"]
    req_key=f"req_{split}"
    req_ids=list(data[req_key]) if req_key in data else []
    if len(req_ids)==0 and split=="val": req_ids=list(data["req_val"]) if "req_val" in data else []
    if len(req_ids)==0 and split=="test": req_ids=list(data["req_test"]) if "req_test" in data else []
    metrics=evaluate(X,y,req_ids)
    splits[split]=metrics
    print(f"{split}: groups={metrics['groups']} Hit@1={metrics['Hit@1']:.3f} Hit@3={metrics['Hit@3']:.3f} NDCG@3={metrics['NDCG@3']:.3f} NDCG@5={metrics['NDCG@5']:.3f}")
weights_doc={feature_names[i]:float(w[i]) for i in range(len(w)) if w[i]!=0}
schema_hash=hashlib.sha256(SCHEMA_PATH.read_bytes()).hexdigest() if SCHEMA_PATH.exists() else "unknown"
mat_hash=hashlib.sha256(MAT.read_bytes()).hexdigest()
lines=[]
lines.append("# MECHIST - Phase 9: Deterministic Baseline + Evaluation\n")
lines.append(f"_Seed: {SEED}  Feature matrix: {MAT}  Schema: {SCHEMA_PATH}_\n")
lines.append(f"_SHA256 feature_matrix: {mat_hash}_\n")
lines.append(f"_SHA256 schema: {schema_hash}_\n")
lines.append("## Baseline: Transparent Weighted Ranker\n")
lines.append("Fixed weights (not tuned on val/test; no learning):\n")
lines.append("| feature | weight | rationale |")
lines.append("|---|---|---|")
for feat,wt in weights_doc.items(): lines.append(f"| {feat} | {wt} | {'positive signal' if wt>0 else 'penalty'} |")
lines.append("\nScore = X @ w (X is scaled/OHE from Phase 8). No bias. No training.\n")
lines.append("## Metrics (grouped by request_id, ranking within each request)\n")
lines.append("| split | groups | Hit@1 | Hit@3 | NDCG@3 | NDCG@5 |")
lines.append("|---|---|---|---|---|---|")
for split in ["train","val","test"]:
    m=splits[split]
    lines.append(f"| {split} | {m['groups']} | {m['Hit@1']:.4f} | {m['Hit@3']:.4f} | {m['NDCG@3']:.4f} | {m['NDCG@5']:.4f} |")
lines.append("\n## Notes\n")
lines.append("- Ranking per request (candidate list 3-5). NDCG uses binary relevance (suitability).")
lines.append("- Deterministic (SEED=42), not tuned against val/test.")
lines.append("- Transformers fit on train only (Phase 8); baseline reuses same X.")
REPORT.write_text("\n".join(lines), encoding="utf-8")
print(f" -> {REPORT}")
out_json=Path("ml/reports/baseline_metrics.json")
out_json.write_text(json.dumps({"seed":SEED,"weights":weights_doc,"splits":splits,"sha256_feature_matrix":mat_hash,"sha256_schema":schema_hash}, indent=2), encoding="utf-8")
print(f" -> {out_json}")
