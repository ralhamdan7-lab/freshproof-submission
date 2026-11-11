import { readFile } from "node:fs/promises";
import { isLikelyTemporal } from "../worker/index.js";

const data = JSON.parse(await readFile(new URL("./temporal-smoke-v1.json", import.meta.url), "utf8"));
let tp = 0, fp = 0, tn = 0, fn = 0;
const errors = [];
for (const item of data.cases) {
  const predicted = isLikelyTemporal(item.text);
  if (predicted && item.expected_temporal) tp++;
  else if (predicted && !item.expected_temporal) { fp++; errors.push({ id: item.id, kind: "FALSE_POSITIVE", text: item.text }); }
  else if (!predicted && !item.expected_temporal) tn++;
  else { fn++; errors.push({ id: item.id, kind: "FALSE_NEGATIVE", text: item.text }); }
}
const precision = tp + fp ? tp / (tp + fp) : 0;
const recall = tp + fn ? tp / (tp + fn) : 0;
const fpr = fp + tn ? fp / (fp + tn) : 0;
const report = {
  dataset_id: data.dataset_id,
  dataset_scope: "Synthetic diagnostic only; not a real-world accuracy estimate.",
  sample_count: data.cases.length,
  confusion_matrix: { true_positive: tp, false_positive: fp, true_negative: tn, false_negative: fn },
  metrics: {
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    false_positive_rate: Number(fpr.toFixed(4))
  },
  error_cases: errors
};
console.log(JSON.stringify(report, null, 2));
if (data.cases.length === 0) process.exitCode = 1;
