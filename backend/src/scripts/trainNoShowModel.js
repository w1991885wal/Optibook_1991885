/* eslint-disable no-console */
// Phase AI-1 — train the no-show classifier.
//
// Run:   node src/scripts/trainNoShowModel.js
//
// Pipeline:
//   1. generate synthetic dataset (deterministic, seeded)
//   2. split 80/20 train/test (seeded shuffle)
//   3. standardise features using TRAIN means/stds; apply to test
//   4. hand-written logistic regression (batch GD + L2)
//   5. evaluate on the held-out test set (accuracy, precision, recall,
//      F1, ROC-AUC, confusion matrix)
//   6. write backend/src/utils/noShowModel.json with reproducibility metadata
//
// No external ML library used. All maths in plain JS.

const fs = require('fs');
const path = require('path');

const {
  generateSyntheticAppointments,
  FEATURE_NAMES,
} = require('../utils/syntheticData');

// --- Hyperparameters -------------------------------------------------
const HYPERPARAMS = {
  seed: 42,
  sampleSize: 2400,
  trainFraction: 0.8,
  learningRate: 0.05,
  l2: 0.01,
  epochs: 1500,
  threshold: 0.5,
  qualityFloor: { accuracy: 0.65, auc: 0.7 },
};

const OUTPUT_PATH = path.join(__dirname, '..', 'utils', 'noShowModel.json');

// --- Small helpers ---------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sigmoid(z) {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

function meanStd(values) {
  const n = values.length;
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / n;
  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  const std = Math.sqrt(sq / n);
  return { mean, std: std === 0 ? 1 : std };
}

// Convert dataset rows into [n × d] X matrix and [n] y vector.
function toMatrix(rows) {
  const X = rows.map((r) => FEATURE_NAMES.map((name) => r[name]));
  const y = rows.map((r) => r.no_show);
  return { X, y };
}

function standardise(X, means, stds) {
  return X.map((row) =>
    row.map((value, i) => (value - means[i]) / stds[i]),
  );
}

// --- Logistic regression (batch GD + L2 + class weighting) ----------
// Class weighting: positives (no-shows) get weight n / (2 * nPos), negatives
// get n / (2 * nNeg). Standard "balanced" scheme. Without it, the gradient
// is dominated by the majority class and the model collapses to "always
// attend" (~85% accuracy, near-zero recall).
function trainLogReg(Xz, y, { learningRate, l2, epochs }) {
  const n = Xz.length;
  const d = Xz[0].length;
  const coef = new Array(d).fill(0);
  let intercept = 0;

  let nPos = 0;
  for (const v of y) if (v === 1) nPos += 1;
  const nNeg = n - nPos;
  const wPos = nPos > 0 ? n / (2 * nPos) : 1;
  const wNeg = nNeg > 0 ? n / (2 * nNeg) : 1;

  const lossHistory = [];

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const grad = new Array(d).fill(0);
    let gradB = 0;
    let weightSum = 0;

    for (let i = 0; i < n; i += 1) {
      let z = intercept;
      for (let j = 0; j < d; j += 1) z += coef[j] * Xz[i][j];
      const p = sigmoid(z);
      const err = p - y[i];
      const w = y[i] === 1 ? wPos : wNeg;
      weightSum += w;
      gradB += w * err;
      for (let j = 0; j < d; j += 1) grad[j] += w * err * Xz[i][j];
    }

    intercept -= learningRate * (gradB / weightSum);
    for (let j = 0; j < d; j += 1) {
      coef[j] -= learningRate * (grad[j] / weightSum + l2 * coef[j]);
    }

    if (epoch % 100 === 0 || epoch === epochs - 1) {
      // Diagnostic loss: weighted BCE matching the gradient.
      let loss = 0;
      let lossWeight = 0;
      for (let i = 0; i < n; i += 1) {
        let z = intercept;
        for (let j = 0; j < d; j += 1) z += coef[j] * Xz[i][j];
        const p = sigmoid(z);
        const eps = 1e-9;
        const w = y[i] === 1 ? wPos : wNeg;
        loss += -w * (y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));
        lossWeight += w;
      }
      loss /= lossWeight;
      lossHistory.push({ epoch, loss: Number(loss.toFixed(5)) });
    }
  }

  return { intercept, coef, lossHistory, classWeights: { wPos, wNeg } };
}

// --- Evaluation -----------------------------------------------------
function predictProbas(Xz, intercept, coef) {
  return Xz.map((row) => {
    let z = intercept;
    for (let j = 0; j < row.length; j += 1) z += coef[j] * row[j];
    return sigmoid(z);
  });
}

function evaluate(probas, yTrue, threshold) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < probas.length; i += 1) {
    const yhat = probas[i] >= threshold ? 1 : 0;
    const y = yTrue[i];
    if (y === 1 && yhat === 1) tp += 1;
    else if (y === 0 && yhat === 1) fp += 1;
    else if (y === 0 && yhat === 0) tn += 1;
    else fn += 1;
  }
  const accuracy = (tp + tn) / (tp + fp + tn + fn);
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;
  return {
    accuracy: Number(accuracy.toFixed(4)),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    confusionMatrix: { tp, fp, tn, fn },
  };
}

// ROC-AUC via the ranks method (sum of ranks of positives).
function rocAuc(probas, yTrue) {
  const n = probas.length;
  const indexed = probas.map((p, i) => ({ p, y: yTrue[i] }));
  indexed.sort((a, b) => a.p - b.p);
  let sumRanksPos = 0;
  let nPos = 0;
  let nNeg = 0;
  for (let i = 0; i < n; i += 1) {
    if (indexed[i].y === 1) {
      sumRanksPos += i + 1;
      nPos += 1;
    } else {
      nNeg += 1;
    }
  }
  if (nPos === 0 || nNeg === 0) return null;
  const auc = (sumRanksPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
  return Number(auc.toFixed(4));
}

// --- Main -----------------------------------------------------------
function run() {
  console.log('=== OptiBook no-show classifier — training ===');
  console.log('Hyperparameters:', HYPERPARAMS);

  // 1) Synthetic dataset.
  const { rows, summary } = generateSyntheticAppointments({
    n: HYPERPARAMS.sampleSize,
    seed: HYPERPARAMS.seed,
  });
  console.log('\n--- Synthetic dataset ---');
  console.log(`Sample size  : ${summary.n}`);
  console.log(`Seed         : ${summary.seed}`);
  console.log(
    `No-show rate : ${(summary.noShowRate * 100).toFixed(2)}% (${summary.noShowCount} of ${summary.n})`,
  );

  // 2) Shuffle + split (seeded).
  const shuffleRng = mulberry32(HYPERPARAMS.seed + 1);
  shuffleInPlace(rows, shuffleRng);
  const cut = Math.floor(rows.length * HYPERPARAMS.trainFraction);
  const trainRows = rows.slice(0, cut);
  const testRows = rows.slice(cut);
  console.log(`Train / test : ${trainRows.length} / ${testRows.length}`);

  // 3) Standardise on TRAIN only.
  const trainMatrix = toMatrix(trainRows);
  const testMatrix = toMatrix(testRows);
  const means = [];
  const stds = [];
  for (let j = 0; j < FEATURE_NAMES.length; j += 1) {
    const col = trainMatrix.X.map((row) => row[j]);
    const ms = meanStd(col);
    means.push(Number(ms.mean.toFixed(6)));
    stds.push(Number(ms.std.toFixed(6)));
  }
  const Xz = standardise(trainMatrix.X, means, stds);
  const Xtz = standardise(testMatrix.X, means, stds);

  // 4) Train.
  console.log('\n--- Training ---');
  const t0 = Date.now();
  const { intercept, coef, lossHistory, classWeights } = trainLogReg(
    Xz,
    trainMatrix.y,
    {
      learningRate: HYPERPARAMS.learningRate,
      l2: HYPERPARAMS.l2,
      epochs: HYPERPARAMS.epochs,
    },
  );
  const trainMs = Date.now() - t0;
  console.log(
    `Class weights — pos: ${classWeights.wPos.toFixed(3)}, neg: ${classWeights.wNeg.toFixed(3)}`,
  );
  console.log(`Trained in ${trainMs} ms`);
  console.log('Loss trajectory (every 100 epochs + final):');
  for (const lh of lossHistory) {
    console.log(`  epoch ${String(lh.epoch).padStart(4)} -> loss ${lh.loss}`);
  }

  console.log('\n--- Coefficients (standardised features) ---');
  for (let j = 0; j < FEATURE_NAMES.length; j += 1) {
    console.log(
      `  ${FEATURE_NAMES[j].padEnd(24)} : ${coef[j] >= 0 ? '+' : ''}${coef[j].toFixed(4)}`,
    );
  }
  console.log(`  ${'intercept'.padEnd(24)} : ${intercept >= 0 ? '+' : ''}${intercept.toFixed(4)}`);

  // 5) Evaluate.
  const trainProbas = predictProbas(Xz, intercept, coef);
  const testProbas = predictProbas(Xtz, intercept, coef);
  const trainMetrics = evaluate(trainProbas, trainMatrix.y, HYPERPARAMS.threshold);
  const testMetrics = evaluate(testProbas, testMatrix.y, HYPERPARAMS.threshold);
  const trainAuc = rocAuc(trainProbas, trainMatrix.y);
  const testAuc = rocAuc(testProbas, testMatrix.y);

  console.log('\n--- Training-set metrics ---');
  console.log(`Accuracy : ${trainMetrics.accuracy}`);
  console.log(`Precision: ${trainMetrics.precision}`);
  console.log(`Recall   : ${trainMetrics.recall}`);
  console.log(`F1       : ${trainMetrics.f1}`);
  console.log(`AUC      : ${trainAuc}`);

  console.log('\n--- Held-out test-set metrics ---');
  console.log(`Accuracy : ${testMetrics.accuracy}`);
  console.log(`Precision: ${testMetrics.precision}`);
  console.log(`Recall   : ${testMetrics.recall}`);
  console.log(`F1       : ${testMetrics.f1}`);
  console.log(`AUC      : ${testAuc}`);
  console.log('Confusion matrix (test set):');
  console.log(`           actual_attend  actual_no-show`);
  console.log(
    `predict_attend ${String(testMetrics.confusionMatrix.tn).padStart(6)}        ${String(
      testMetrics.confusionMatrix.fn,
    ).padStart(4)}`,
  );
  console.log(
    `predict_noshow ${String(testMetrics.confusionMatrix.fp).padStart(6)}        ${String(
      testMetrics.confusionMatrix.tp,
    ).padStart(4)}`,
  );

  // 6) Quality floor.
  const weakAccuracy = testMetrics.accuracy < HYPERPARAMS.qualityFloor.accuracy;
  const weakAuc = testAuc !== null && testAuc < HYPERPARAMS.qualityFloor.auc;
  if (weakAccuracy || weakAuc) {
    console.warn(
      '\n[WARNING] Trained model fell below the quality floor. ' +
        `accuracy=${testMetrics.accuracy} (>= ${HYPERPARAMS.qualityFloor.accuracy} required), ` +
        `auc=${testAuc} (>= ${HYPERPARAMS.qualityFloor.auc} required). ` +
        'The model JSON will still be written; review hyperparameters or feature design.',
    );
  } else {
    console.log('\nModel passes the quality floor.');
  }

  // 7) Save artifact.
  const artifact = {
    trainedAt: new Date().toISOString(),
    sampleSize: rows.length,
    seed: HYPERPARAMS.seed,
    trainSize: trainRows.length,
    testSize: testRows.length,
    featureNames: FEATURE_NAMES,
    means,
    stds,
    coefficients: coef.map((c) => Number(c.toFixed(6))),
    intercept: Number(intercept.toFixed(6)),
    metrics: {
      train: { ...trainMetrics, auc: trainAuc },
      test: { ...testMetrics, auc: testAuc },
      // Convenience: the test-set numbers are the headline metrics.
      accuracy: testMetrics.accuracy,
      precision: testMetrics.precision,
      recall: testMetrics.recall,
      f1: testMetrics.f1,
      auc: testAuc,
    },
    confusionMatrix: testMetrics.confusionMatrix,
    syntheticNoShowRate: summary.noShowRate,
    classWeights,
    hyperparameters: HYPERPARAMS,
    notes: [
      'Trained on synthetic data only.',
      'Synthesis uses Mulberry32 PRNG with the seed above; results are reproducible.',
      'Replace with real-data training before any production deployment.',
    ],
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(artifact, null, 2));
  console.log(`\nWrote ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log('Done.');
}

run();
