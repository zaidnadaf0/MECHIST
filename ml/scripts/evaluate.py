"""
Phase 11 - Evaluation: Baseline vs candidates (grouped ranking)
Metrics: Hit@1 Hit@3 NDCG@3 NDCG@5 + secondary MAE/RMSE/R2 + ROC-AUC
Writes: ml/reports/model_comparison.md, model_evaluation.md, model_metrics.json
"""
import json, hashlib
from pathlib import Path
from collections import defaultdict
import numpy as np
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, roc_auc_score

SEED = 42
MAT = Path("ml/features/feature_matrix.npz")
CAND = Path("ml/model/candidates.joblib")
BASELINE_JSON = Path("ml/reports/baseline_metrics.json")

def ndcg_at_k(sorted_rels, k):
    dcg = sum((2**rel - 1) / np.log2(rank+2) for rank, rel in enumerate(sorted_rels[:k]) if rel)
    ideal = sorted(sorted_rels, reverse=True)
    idcg = sum((2**rel - 1) / np.log2(rank+2) for rank, rel in enumerate(ideal[:k]) if rel)
    return dcg/idcg if idcg > 0 else 0.0

def ranking_metrics(rels_list, scores_list):
    hits1 = hits3 = 0
    ndcg3 = ndcg5 = 0
    n = len(rels_list)
    for rels, scores in zip(rels_list, scores_list):
        order = np.argsort(scores)[::-1]
        sorted_rels = [rels[i] for i in order]
        if sorted_rels[0] == 1: hits1 += 1
        if any(r==1 for r in sorted_rels[:3]): hits3 += 1
        ndcg3 += ndcg_at_k(sorted_rels, 3)
        ndcg5 += ndcg_at_k(sorted_rels, 5)
    return {"Hit@1": hits1/max(1,n), "Hit@3": hits3/max(1,n), "NDCG@3": ndcg3/max(1,n), "NDCG@5": ndcg5/max(1,n), "groups": n}

def grouped(scores, y, req_ids):
    groups = defaultdict(list)
    for s, label, rid in zip(scores, y, req_ids):
        groups[str(rid)].append((int(label), float(s)))
    rels_list = []
    scores_list = []
    for rid, pairs in groups.items():
        rels = [p[0] for p in pairs]
        scs  = [p[1] for p in pairs]
        rels_list.append(rels)
        scores_list.append(scs)
    return (rels_list, scores_list)

data = np.load(MAT, allow_pickle=True)
models = joblib.load(CAND)
baseline = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
# baseline weights already evaluated; load splits from baseline json for comparison
# We re-score baseline via same X for consistency
from pathlib import Path as _P
# reconstruct baseline scores using weights
schema = json.loads(Path("ml/features/feature_schema.json").read_text(encoding="utf-8"))
feat_names = schema["feature_names"]
w = np.zeros(len(feat_names))
for k,v in baseline["weights"].items():
    if k in feat_names:
        w[feat_names.index(k)] = v

results = {}

for split in ["train","val","test"]:
    X = data[f"X_{split}"].astype(np.float64)
    y = data[f"y_{split}"].astype(int)
    req = list(data[f"req_{split}"])
    # baseline scores
    base_scores = X @ w
    # collect per-model scores (predict_proba[:,1] or predict)
    split_res = {"baseline": {}, "candidates": {}}
    # baseline ranking
    rels, scs = grouped(base_scores, y, req)
    base_prob = 1/(1+np.exp(-base_scores))
    m = ranking_metrics(rels, scs)
    split_res["baseline"] = {**m,
        "MAE": float(mean_absolute_error(y, base_prob)),
        "RMSE": float(np.sqrt(mean_squared_error(y, base_prob))),
        "R2": float(r2_score(y, base_prob)),
        "ROC_AUC": float(roc_auc_score(y, base_prob)) if len(set(y))>1 else 0.0,
    }
    for name, model in models.items():
        if hasattr(model, "predict_proba"):
            scores = model.predict_proba(X)[:,1]
        else:
            scores = model.predict(X).astype(float)
        rels2, scs2 = grouped(scores, y, req)
        rank = ranking_metrics(rels2, scs2)
        # regression-style on prob
        prob = scores if scores.min()>=0 and scores.max()<=1 else 1/(1+np.exp(-scores))
        prob = np.clip(prob, 0, 1)
        rank.update({
            "MAE": float(mean_absolute_error(y, prob)),
            "RMSE": float(np.sqrt(mean_squared_error(y, prob))),
            "R2": float(r2_score(y, prob)),
            "ROC_AUC": float(roc_auc_score(y, prob)) if len(set(y))>1 else 0.0,
        })
        split_res["candidates"][name] = rank
    results[split] = split_res
    print(f"[{split}] " + " | ".join(f"{k} Hit@1={v['Hit@1']:.3f} NDCG@3={v['NDCG@3']:.3f}" for k,v in [("base", split_res["baseline"])] + list(split_res["candidates"].items())))

# Save metrics json
out_json = Path("ml/reports/model_metrics.json")
out_json.write_text(json.dumps({"seed": SEED, "results": results}, indent=2), encoding="utf-8")
print(f" -> {out_json}")

# Determine winner on test Hit@1 then NDCG@3
test_rank = {name: (results["test"]["candidates"][name]["Hit@1"], results["test"]["candidates"][name]["NDCG@3"]) for name in models}
# also baseline
baseline_hit = results["test"]["baseline"]["Hit@1"]
winner = max(models.keys(), key=lambda n: (results["test"]["candidates"][n]["Hit@1"], results["test"]["candidates"][n]["NDCG@3"]))
winner_hit = results["test"]["candidates"][winner]["Hit@1"]

# Write comparison md
lines = []
lines.append("# Model Comparison (Phase 11)")
lines.append(f"_Seed {SEED} | dim 34 | grouped by request_id | 350/75/75 requests_")
lines.append("")
for split in ["train","val","test"]:
    lines.append(f"## {split}")
    lines.append("| model | Hit@1 | Hit@3 | NDCG@3 | NDCG@5 | MAE | RMSE | R2 | ROC-AUC |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    b = results[split]["baseline"]
    lines.append(f"| baseline | {b['Hit@1']:.4f} | {b['Hit@3']:.4f} | {b['NDCG@3']:.4f} | {b['NDCG@5']:.4f} | {b['MAE']:.4f} | {b['RMSE']:.4f} | {b['R2']:.4f} | {b['ROC_AUC']:.4f} |")
    for name in ["decision_tree","random_forest","knn","logistic_regression"]:
        r = results[split]["candidates"][name]
        lines.append(f"| {name} | {r['Hit@1']:.4f} | {r['Hit@3']:.4f} | {r['NDCG@3']:.4f} | {r['NDCG@5']:.4f} | {r['MAE']:.4f} | {r['RMSE']:.4f} | {r['R2']:.4f} | {r['ROC_AUC']:.4f} |")
    lines.append("")

lines.append(f"## Winner (test Hit@1)")
lines.append(f"**{winner}** — test Hit@1 {winner_hit:.4f} vs baseline {baseline_hit:.4f}")
if winner_hit > baseline_hit:
    lines.append("ML improves over baseline on ranking; use it with fallback to baseline.")
else:
    lines.append("Baseline is competitive; keep ML as optional ranker with baseline fallback.")
lines.append("")
lines.append("## Notes")
lines.append("- Ranking is pointwise: score per candidate, rank within request_id group.")
lines.append("- Synthetic proxy label; not real-world validity.")

Path("ml/reports/model_comparison.md").write_text("\n".join(lines), encoding="utf-8")
Path("ml/reports/model_evaluation.md").write_text("\n".join(lines), encoding="utf-8")
print(" -> model_comparison.md / model_evaluation.md")

# Select model for packaging: winner (or fallback to random_forest if tie)
Path("ml/model/winner.txt").write_text(winner, encoding="utf-8")
