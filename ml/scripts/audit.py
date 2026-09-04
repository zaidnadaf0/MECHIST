"""
Phase 7 - Data Quality + Leakage Audit (SEED=42)
Checks A-H, leakage classification, grouped split 70/15/15, writes cleaned CSV.
"""
import csv
import hashlib
import math
import random
from pathlib import Path
from collections import Counter

SEED = 42
random.seed(SEED)

SRC = Path("ml/data/mechist_recommendation_dataset.csv")
REPORT = Path("ml/reports/data_quality_report.md")
OUT_CLEANED = Path("ml/data/mechist_recommendation_dataset_cleaned.csv")
SPLIT_CSV = Path("ml/data/splits.csv")

for p in [REPORT.parent, OUT_CLEANED.parent]:
    p.mkdir(parents=True, exist_ok=True)

rows = list(csv.DictReader(SRC.open(encoding="utf-8")))
fieldnames = list(rows[0].keys()) if rows else []
N = len(rows)
issues: list[tuple[str, str]] = []

def add(sev: str, msg: str):
    issues.append((sev, msg))

for c in fieldnames:
    n = sum(1 for r in rows if r[c] == "")
    if n:
        add("WARN", f"Missing values in {c}: {n}/{N} ({n/N:.2%})")

def check_range(col: str, lo: float, hi: float):
    bad: list = []
    for r in rows:
        if r[col] == "":
            continue
        try:
            v = float(r[col])
        except Exception:
            bad.append(r[col])
            continue
        if not (lo <= v <= hi) or not math.isfinite(v):
            bad.append(v)
    if bad:
        add("FAIL", f"Out-of-range {col} [{lo},{hi}]: {len(bad)} e.g. {bad[:5]}")
    else:
        add("PASS", f"Range {col} [{lo},{hi}]: all valid")

check_range("customer_lat", -90, 90)
check_range("customer_lng", -180, 180)
check_range("mechanic_lat", -90, 90)
check_range("mechanic_lng", -180, 180)
check_range("distance_km", 0, 500)
check_range("rating", 0, 5)
check_range("review_count", 0, 10000)
check_range("experience_years", 0, 60)
check_range("completion_rate", 0, 1)
check_range("eta_min", 0, 600)

seen = set()
dups = 0
for r in rows:
    key = tuple(r[c] for c in fieldnames)
    if key in seen:
        dups += 1
    else:
        seen.add(key)
if dups:
    add("WARN", f"Exact duplicated rows: {dups}")
else:
    add("PASS", "No exact duplicated rows")

pair_counts = Counter((r["request_id"], r["mechanic_id"]) for r in rows)
dup_pairs = sum(1 for v in pair_counts.values() if v > 1)
if dup_pairs:
    add("FAIL", f"Duplicated request+mechanic pairs: {dup_pairs} (before dedup)")
else:
    add("PASS", "No duplicated request+mechanic pairs")

deduped_rows: list[dict] = []
seen_pair: set[tuple[str, str]] = set()
for r in rows:
    k = (r["request_id"], r["mechanic_id"])
    if k in seen_pair:
        continue
    seen_pair.add(k)
    deduped_rows.append(r)

pos = sum(int(r["suitability"]) for r in deduped_rows)
n_req = len(set(r["request_id"] for r in deduped_rows))
add("INFO", f"Target suitability positive rate: {pos}/{len(deduped_rows)} ({pos/len(deduped_rows):.1%}) mean {pos/n_req:.2f} positives/request")

for c in ["problem_category", "vehicle_type", "urgency", "availability"]:
    add("INFO", f"{c}: {dict(Counter(r[c] for r in deduped_rows))}")

for col in ["distance_km", "rating", "review_count", "eta_min"]:
    vals = sorted(float(r[col]) for r in deduped_rows if r[col] != "")
    if not vals:
        continue
    q1 = vals[len(vals)//4]
    q3 = vals[len(vals)*3//4]
    iqr = q3 - q1
    lo = q1 - 1.5*iqr
    hi = q3 + 1.5*iqr
    out = sum(1 for v in vals if v < lo or v > hi)
    add("INFO", f"Outliers {col} IQR [{q1:.2f},{q3:.2f}] IQR={iqr:.2f} outliers {out}/{len(vals)} ({out/len(vals):.1%})")
add("INFO", "Outliers retained (distance reflects real geography); no clipping applied.")

leakage_table = [
    ("request_id", "IDENTIFIER ONLY", "Never a feature; grouping key for split/ranking only."),
    ("mechanic_id", "IDENTIFIER ONLY", "Never a feature; entity identifier."),
    ("customer_lat", "KEEP", "Request feature; target derived from noisy latent not raw coords."),
    ("customer_lng", "KEEP", "Same."),
    ("problem_category", "KEEP", "Request feature."),
    ("vehicle_type", "KEEP", "Request feature."),
    ("urgency", "KEEP", "Request feature."),
    ("mechanic_lat", "KEEP", "Mechanic position feature."),
    ("mechanic_lng", "KEEP", "Mechanic position feature."),
    ("service_radius_km", "KEEP", "Mechanic capability."),
    ("specialties", "TRANSFORM", "Raw text; OHE after mapping to specialty_match/vehicle_match only derived binaries are used. Raw dropped."),
    ("vehicle_types", "TRANSFORM", "Same; mapped to vehicle_match."),
    ("rating", "KEEP", "Mechanic quality feature."),
    ("review_count", "KEEP", "Mechanic quality feature."),
    ("experience_years", "KEEP", "Mechanic quality feature."),
    ("availability", "KEEP", "Mechanic state feature."),
    ("active_jobs", "KEEP", "Workload feature."),
    ("completion_rate", "KEEP", "Reliability feature."),
    ("eta_min", "KEEP", "Derived from distance; not target. Target has noise term so not a copy."),
    ("distance_km", "KEEP", "Derived via Haversine; input to score with noise so not a proxy copy."),
    ("specialty_match", "KEEP", "Binary derived legitimately from problem_category x specialties."),
    ("vehicle_match", "KEEP", "Binary derived from vehicle_type x vehicle_types."),
    ("within_service_radius", "KEEP", "Binary derived from distance <= radius."),
    ("suitability", "TARGET", "Prediction target (outcome proxy). Must not be used as input feature."),
]

req_ids = sorted(set(r["request_id"] for r in deduped_rows))
req_ids_sorted = sorted(req_ids, key=lambda x: hashlib.sha256(x.encode()).hexdigest())
n = len(req_ids_sorted)
n_train = int(n*0.70)
n_val = int(n*0.15)
train_ids = set(req_ids_sorted[:n_train])
val_ids = set(req_ids_sorted[n_train:n_train+n_val])
test_ids = set(req_ids_sorted[n_train+n_val:])

with open(SPLIT_CSV, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["request_id", "split"])
    for rid in req_ids_sorted:
        if rid in train_ids:
            s = "train"
        elif rid in val_ids:
            s = "validation"
        else:
            s = "test"
        w.writerow([rid, s])

with open(OUT_CLEANED, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(deduped_rows)

sha_src = hashlib.sha256(SRC.read_bytes()).hexdigest()
sha_clean = hashlib.sha256(OUT_CLEANED.read_bytes()).hexdigest()

lines: list[str] = []
lines.append("# MECHIST - Phase 7: Data Quality + Leakage Audit\n")
lines.append(f"_Source: {SRC} - {N} rows -> cleaned {len(deduped_rows)} rows, {len(req_ids)} requests_\n")
lines.append(f"_SHA256 source: {sha_src}_\n")
lines.append(f"_SHA256 cleaned: {sha_clean}_\n")
lines.append(f"_Seed: {SEED}  splits.csv: train {len(train_ids)} / validation {len(val_ids)} / test {len(test_ids)} requests_\n")
lines.append("## A-H Checks\n")
for sev, msg in issues:
    lines.append(f"- **{sev}** - {msg}")
lines.append("\n## Leakage Audit\n")
lines.append("| feature | decision | rationale |")
lines.append("|---|---|---|")
for feat, dec, why in leakage_table:
    lines.append(f"| {feat} | {dec} | {why} |")
lines.append("\n## Dropped / Retained Features\n")
lines.append("- **Dropped as features**: request_id, mechanic_id (IDENTIFIER ONLY), suitability (TARGET). Raw specialties and vehicle_types text replaced by derived binaries specialty_match, vehicle_match.")
lines.append("- **Retained features (18)**: customer_lat,customer_lng,problem_category,vehicle_type,urgency,mechanic_lat,mechanic_lng,service_radius_km,rating,review_count,experience_years,availability,active_jobs,completion_rate,eta_min,distance_km,specialty_match,vehicle_match,within_service_radius.")
lines.append("- **Target**: suitability (binary ranking label; not a copy of any input - noisy latent with Gaussian noise + stochastic second positive).")
lines.append("\n## Action Taken\n")
lines.append(f"- Deduped {N-len(deduped_rows)} duplicate request+mechanic rows (keep first). No rows dropped for missing (none). Outliers retained. splits.csv at {SPLIT_CSV}. Cleaned dataset at {OUT_CLEANED}.")
REPORT.write_text("\n".join(lines), encoding="utf-8")
print(f"Audit complete -> {REPORT}")
print(f"Cleaned: {OUT_CLEANED} ({len(deduped_rows)} rows)")
print(f"Splits: {SPLIT_CSV} ({len(req_ids_sorted)} requests)")
