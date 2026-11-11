# Synthetic temporal benchmark

The repository includes a deterministic 32-case bilingual synthetic smoke set (16 expected temporal and 16 expected non-temporal cases). Run it with `npm run benchmark:temporal`.

The latest recorded CI diagnostic for this dataset was 32/32 expected classifications. This result is specific to a small hand-authored set and is **not** a real-world accuracy estimate. The examples and rules may share vocabulary; overfitting and vocabulary leakage are possible.

The benchmark does not measure claim extraction quality, evidence retrieval quality, source reliability, semantic entailment, contradiction accuracy, citation correctness, latency, or cost. A separately authored and reviewed held-out dataset is required for those evaluations.
