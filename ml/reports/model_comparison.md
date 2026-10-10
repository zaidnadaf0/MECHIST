# Model Comparison (Phase 11)
_Seed 42 | dim 34 | grouped by request_id | 350/75/75 requests_

## train
| model | Hit@1 | Hit@3 | NDCG@3 | NDCG@5 | MAE | RMSE | R2 | ROC-AUC |
|---|---|---|---|---|---|---|---|---|
| baseline | 0.8171 | 0.9943 | 0.9236 | 0.9260 | 0.3384 | 0.5039 | -0.3180 | 0.8653 |
| decision_tree | 0.9486 | 1.0000 | 0.9806 | 0.9806 | 0.1061 | 0.2303 | 0.7245 | 0.9769 |
| random_forest | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.1499 | 0.2086 | 0.7741 | 0.9975 |
| knn | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 |
| logistic_regression | 0.9543 | 1.0000 | 0.9813 | 0.9813 | 0.2198 | 0.3291 | 0.4376 | 0.8950 |

## val
| model | Hit@1 | Hit@3 | NDCG@3 | NDCG@5 | MAE | RMSE | R2 | ROC-AUC |
|---|---|---|---|---|---|---|---|---|
| baseline | 0.6667 | 1.0000 | 0.8682 | 0.8682 | 0.3712 | 0.5320 | -0.4834 | 0.8281 |
| decision_tree | 0.5333 | 0.9333 | 0.7717 | 0.7987 | 0.2428 | 0.4377 | -0.0040 | 0.7472 |
| random_forest | 0.9200 | 1.0000 | 0.9687 | 0.9687 | 0.2495 | 0.3403 | 0.3933 | 0.8866 |
| knn | 0.7333 | 1.0000 | 0.8946 | 0.8946 | 0.2578 | 0.3770 | 0.2551 | 0.8286 |
| logistic_regression | 0.9200 | 1.0000 | 0.9705 | 0.9705 | 0.2396 | 0.3498 | 0.3587 | 0.8777 |

## test
| model | Hit@1 | Hit@3 | NDCG@3 | NDCG@5 | MAE | RMSE | R2 | ROC-AUC |
|---|---|---|---|---|---|---|---|---|
| baseline | 0.8400 | 0.9733 | 0.9241 | 0.9356 | 0.3509 | 0.5113 | -0.3761 | 0.8811 |
| decision_tree | 0.5867 | 0.9333 | 0.7860 | 0.8183 | 0.2401 | 0.4267 | 0.0415 | 0.7775 |
| random_forest | 0.8000 | 1.0000 | 0.9199 | 0.9199 | 0.2442 | 0.3394 | 0.3934 | 0.8827 |
| knn | 0.7600 | 0.9733 | 0.8900 | 0.9009 | 0.2436 | 0.3686 | 0.2847 | 0.8425 |
| logistic_regression | 0.9067 | 1.0000 | 0.9592 | 0.9592 | 0.2220 | 0.3361 | 0.4054 | 0.8958 |

## Winner (test Hit@1)
**logistic_regression** — test Hit@1 0.9067 vs baseline 0.8400
ML improves over baseline on ranking; use it with fallback to baseline.

## Notes
- Ranking is pointwise: score per candidate, rank within request_id group.
- Synthetic proxy label; not real-world validity.