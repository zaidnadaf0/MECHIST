"""Batch 6 — ML API contract tests (CORS allowlist, validation, ranking).

Run:  python3 -m pytest ml/tests/test_api.py -q
"""
import importlib
import os


def _cand(**over):
    base = dict(
        mechanic_id="mech-001", customer_lat=12.9, customer_lng=77.5,
        problem_category="flat-tyre", vehicle_type="Sedan", urgency="medium",
        mechanic_lat=12.95, mechanic_lng=77.6, service_radius_km=20,
        rating=4.5, review_count=30, experience_years=10,
        availability="available", active_jobs=0, completion_rate=0.9,
        eta_min=12, distance_km=5, specialty_match=1, vehicle_match=1,
        within_service_radius=1,
    )
    base.update(over)
    return base


def _client():
    from fastapi.testclient import TestClient
    from ml.api.main import app
    return TestClient(app)


def test_health_reports_model():
    r = _client().get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["winner"] == "logistic_regression"
    assert body["feature_dim"] == 34


def test_rank_orders_candidates():
    c = _client()
    payload = {"candidates": [
        _cand(mechanic_id="far", distance_km=20, eta_min=40, rating=4.0),
        _cand(mechanic_id="near", distance_km=2, eta_min=6, rating=4.8),
    ]}
    r = c.post("/rank-mechanics", json=payload)
    assert r.status_code == 200
    ranked = r.json()["ranked"]
    assert [x["mechanic_id"] for x in ranked] == ["near", "far"]
    assert ranked[0]["rank"] == 1


def test_rank_rejects_empty_candidates():
    r = _client().post("/rank-mechanics", json={"candidates": []})
    assert r.status_code == 422


def test_predict_rejects_out_of_range_rating():
    r = _client().post("/predict", json={"candidate": _cand(rating=99)})
    assert r.status_code == 422


def test_predict_rejects_bad_coords():
    r = _client().post("/predict", json={"candidate": _cand(customer_lat=999)})
    assert r.status_code == 422


def test_cors_defaults_to_localhost_only():
    os.environ.pop("ML_CORS_ORIGINS", None)
    import ml.api.main as main
    importlib.reload(main)
    origins = main._cors_origins()
    assert "*" not in origins
    assert "http://localhost:5173" in origins


def test_cors_uses_allowlist_when_set():
    os.environ["ML_CORS_ORIGINS"] = "https://roadassisst.web.app, https://example.com"
    try:
        import ml.api.main as main
        importlib.reload(main)
        assert main._cors_origins() == ["https://roadassisst.web.app", "https://example.com"]
    finally:
        os.environ.pop("ML_CORS_ORIGINS", None)
        import ml.api.main as main
        importlib.reload(main)
