# Test strategy

Run:

```bash
npm test
npm run benchmark:temporal
```

The regression suite covers claim extraction, Arabic/English direction handling, bounded retrieval, source relevance, temporal classification, evidence confidence, correction eligibility, source quote provenance, abstention, and UI/API contracts.

A successful automated test run validates the covered deterministic behavior only. It does not establish general factual accuracy, real-world source reliability, citation correctness, production readiness, or performance at scale.

The temporal smoke benchmark is a separate 32-case synthetic diagnostic. See [BENCHMARK.md](BENCHMARK.md) for scope and limitations.
