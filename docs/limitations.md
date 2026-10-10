# Limitations & Future Work

- Synthetic dataset only — not real-world validated; all metrics are proxy.
- Haversine+35kmh ETA proxy, not road routing (Geoapify directions deferred).
- No temporal, traffic, pricing, fatigue modeling.
- NLP classifier toy (templated text -> perfect accuracy, not real language variance).
- ML winner LogisticRegression +6.7pp over baseline is meaningful but still synthetic.
- Matching relies on Firestore listeners + declinedBy client filter (no array-not-contains).
- ML API local (localhost:8000) unless deployed; frontend falls back cleanly.
- Future: collect real acceptance/completion labels, road ETA supervision, richer text for NLP, A/B evaluation, fairness/bias audit.
