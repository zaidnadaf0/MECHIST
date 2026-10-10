"""
Phase 16 - NLP Breakdown Classification
Maps free-text breakdown description -> problem_category (5 classes: flat-tyre, battery, engine, tow, other)
Uses synthetic descriptions derived from dataset categories; TF-IDF + LogisticRegression.
"""
import csv, json, hashlib
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

SEED=42
np.random.seed(SEED)
SRC = Path("ml/data/mechist_recommendation_dataset_cleaned.csv")

# synthetic text templates per category
TEMPLATES = {
 "flat-tyre": ["flat tyre on road", "tyre puncture need replacement", "air leaking from tyre", "front tyre burst", "tyre flat can't move"],
 "battery": ["battery dead won't start", "battery drained jump needed", "car not starting battery issue", "battery failure lights dim"],
 "engine": ["engine not starting", "engine making strange noise", "engine overheating", "engine failure on highway"],
 "tow": ["need tow truck car stuck", "vehicle needs towing to garage", "accident need recovery tow", "car stuck in ditch tow required"],
 "other": ["need roadside assistance", "general breakdown help needed", "car trouble need mechanic", "vehicle issue need service"],
}

rows = list(csv.DictReader(SRC.open(encoding="utf-8")))
texts=[]; labels=[]
for r in rows:
    cat=r["problem_category"]
    base=np.random.choice(TEMPLATES.get(cat, TEMPLATES["other"]))
    # add urgency/vehicle noise to mimic free text
    txt = f"{base} {r['vehicle_type']} {r['urgency']}"
    texts.append(txt); labels.append(cat)

# grouped split by request_id to avoid leakage: reuse same splits.csv logic? simple stratified split with seed
X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=SEED, stratify=labels)

vec = TfidfVectorizer(ngram_range=(1,2), max_features=500, stop_words="english")
Xt = vec.fit_transform(X_train)
clf = LogisticRegression(max_iter=400, random_state=SEED)
clf.fit(Xt, y_train)

pred = clf.predict(vec.transform(X_test))
acc = accuracy_score(y_test, pred)
report = classification_report(y_test, pred, zero_division=0)

print(f"NLP accuracy: {acc:.4f}")
print(report)

out_dir = Path("ml/model/nlp")
out_dir.mkdir(parents=True, exist_ok=True)
joblib.dump(vec, out_dir / "vectorizer.joblib")
joblib.dump(clf, out_dir / "classifier.joblib")
Path(out_dir / "metrics.json").write_text(json.dumps({"accuracy": acc, "report": report, "seed": SEED}, indent=2), encoding="utf-8")
Path(out_dir / "metadata.json").write_text(json.dumps({
    "seed": SEED, "model": "LogisticRegression+Tfidf", "categories": sorted(set(labels)),
    "n_train": len(X_train), "n_test": len(X_test),
}, indent=2), encoding="utf-8")
