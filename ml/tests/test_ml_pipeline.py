import json, hashlib
from pathlib import Path
import numpy as np
import joblib

def test_feature_schema():
    s=json.loads(Path("ml/features/feature_schema.json").read_text())
    assert s["feature_dim"]==34
    assert len(s["feature_names"])==34
    assert s["target"]=="suitability"
def test_no_leakage_ids():
    s=json.loads(Path("ml/features/feature_schema.json").read_text())
    assert "request_id" not in s["feature_names"]
    assert "mechanic_id" not in s["feature_names"]
def test_model_load_and_predict():
    m=joblib.load(Path("ml/model/model.joblib"))
    X=np.random.randn(2,34)
    p=m.predict_proba(X)
    assert p.shape==(2,2)
def test_api_predictor():
    from ml.api.predictor import score_candidate
    c=dict(mechanic_id="mech-001", customer_lat=12.9, customer_lng=77.5, problem_category="flat-tyre", vehicle_type="Sedan", urgency="medium", mechanic_lat=12.95, mechanic_lng=77.6, service_radius_km=20, rating=4.5, review_count=30, experience_years=10, availability="available", active_jobs=0, completion_rate=0.9, eta_min=12, distance_km=5, specialty_match=1, vehicle_match=1, within_service_radius=1)
    s=score_candidate(c)
    assert 0 <= s <= 1
def test_baseline_vs_ml():
    import json as j
    metrics=j.loads(Path("ml/reports/model_metrics.json").read_text())
    assert "results" in metrics
    assert metrics["results"]["test"]["baseline"]["Hit@1"] > 0.5
def test_nlp():
    vec=joblib.load(Path("ml/model/nlp/vectorizer.joblib"))
    clf=joblib.load(Path("ml/model/nlp/classifier.joblib"))
    X=vec.transform(["flat tyre puncture"])
    p=clf.predict(X)
    assert p[0]=="flat-tyre"
def test_fallback_ranker():
    assert Path("src/lib/mlRank.ts").exists()
