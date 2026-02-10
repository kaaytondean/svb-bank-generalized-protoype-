index.html
style.css
app.js
README.md
assets/
// =====================================================
// USER-FRIENDLY PROTOTYPE: SILICON VALLEY–STYLE BANK STRESS
// -----------------------------------------------------
// This model is designed as a transparent, interactive
// prototype that illustrates how the dynamics observed
// during the Silicon Valley Bank collapse can emerge
// from compounding balance-sheet risk and deposit behavior.
//
// It is NOT a prediction engine.
// It IS a teaching and exploratory tool that shows how:
// - Interest rate shocks
// - Long-duration assets
// - Uninsured deposits
// - Rapid withdrawals
// can interact over time to produce fragility.
// =====================================================


// ---------- Utilities ----------
function clamp(min, max, x) {
  return Math.max(min, Math.min(max, x));
}

function fmt(n, digits = 1) {
  return Number(n).toFixed(digits);
}


// ---------- Core Stress Model (SVB-Inspired) ----------
// Inputs are normalized into comparable ranges, then weighted.
// The weights reflect empirical lessons from the SVB collapse:
// deposit structure + duration exposure amplify rate shocks.
function computeStressScore(inputs) {
  const {
    rateShockPct,          // 0..6
    uninsuredPct,          // 0..100
    durationYears,         // 0..10
    unrealizedLossPctCap,  // 0..120
    withdrawalSpeed,       // 0..100
    concentration          // 0..100
  } = inputs;

  // Normalize to 0–1 ranges
  const r = clamp(0, 1, rateShockPct / 6);
  const u = clamp(0, 1, uninsuredPct / 100);
  const d = clamp(0, 1, durationYears / 10);
  const l = clamp(0, 1, unrealizedLossPctCap / 120);
  const w = clamp(0, 1, withdrawalSpeed / 100);
  const c = clamp(0, 1, concentration / 100);

  // Weighting scheme (sums to 100 by design)
  const weights = {
    rateShock: 18,
    uninsured: 22,
    duration: 15,
    losses: 18,
    withdrawal: 17,
    concentration: 10
  };

  const raw =
    weights.rateShock * r +
    weights.uninsured * u +
    weights.duration * d +
    weights.losses * l +
    weights.withdrawal * w +
    weights.concentration * c;

  return clamp(0, 100, raw);
}


// ---------- Duration-Based Loss Approximation ----------
// Simplified bond price sensitivity:
// duration × rate change ≈ price impact
function estimateDurationLossPct(durationYears, rateShockPct) {
  return clamp(0, 100, durationYears * rateShockPct);
}


// ---------- Qualitative Classification ----------
function classifyStatus(score) {
  if (score < 40) return { label: "Stable", colorVar: "--good" };
  if (score < 70) return { label: "At Risk", colorVar: "--warn" };
  return { label: "Critical", colorVar: "--bad" };
}

function interpretationText(score) {
  if (score < 40) {
    return "Balance-sheet and deposit dynamics remain resilient under this scenario. Risk factors do not compound rapidly enough to generate acute stress.";
  }
  if (score < 70) {
    return "Multiple vulnerabilities are present. A confidence shock or acceleration in withdrawals could trigger reinforcing liquidity pressure.";
  }
  return "Systemic fragility is elevated. Rate sensitivity and deposit flight dynamics can amplify each other, rapidly constraining liquidity.";
}


// ---------- DOM Helpers ----------
const el = (id) => document.getElementById(id);


// ---------- Slider References ----------
const sliders = {
  rateShock: el("rateShock"),
  uninsured: el("uninsured"),
  duration: el("duration"),
  losses: el("losses"),
  withdrawal: el("withdrawal"),
  concentration: el("concentration")
};


// ---------- Input Reader ----------
const readInputs = () => ({
  rateShockPct: Number(sliders.rateShock.value),
  uninsuredPct: Number(sliders.uninsured.value),
  durationYears: Number(sliders.duration.value),
  unrealizedLossPctCap: Number(sliders.losses.value),
  withdrawalSpeed: Number(sliders.withdrawal.value),
  concentration: Number(sliders.concentration.value)
});


// ---------- UI Sync ----------
function syncValueLabels(inputs) {
  el("rateShockVal").textContent = fmt(inputs.rateShockPct, 2) + "%";
  el("uninsuredVal").textContent = fmt(inputs.uninsuredPct, 0) + "%";
  el("durationVal").textContent = fmt(inputs.durationYears, 1);
  el("lossesVal").textContent = fmt(inputs.unrealizedLossPctCap, 0) + "%";
  el("withdrawalVal").textContent = fmt(inputs.withdrawalSpeed, 0);
  el("concentrationVal").textContent = fmt(inputs.concentration, 0);
}


// ---------- Charts ----------
let stressChart, driversChart;

function initCharts() {
  const stressCtx = el("stressChart");
  const driversCtx = el("driversChart");

  stressChart = new Chart(stressCtx, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label: "Stress Score Over Time",
        data: [],
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: 0, max: 100 } }
    }
  });

  driversChart = new Chart(driversCtx, {
    type: "bar",
    data: {
      labels: [
        "Rate Shock",
        "Uninsured Deposits",
        "Duration",
        "Unrealized Losses",
        "Withdrawal Speed",
        "Concentration"
      ],
      datasets: [{
        label: "Normalized Driver Intensity",
        data: [0, 0, 0, 0, 0, 0]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: 0, max: 1 } }
    }
  });

  stressCtx.parentElement.style.height = "220px";
  driversCtx.parentElement.style.height = "220px";
}


// ---------- Chart Updates ----------
function updateCharts(inputs, score) {
  const nowLabel = new Date().toLocaleTimeString();
  stressChart.data.labels.push(nowLabel);
  stressChart.data.datasets[0].data.push(score);

  if (stressChart.data.labels.length > 30) {
    stressChart.data.labels.shift();
    stressChart.data.datasets[0].data.shift();
  }

  stressChart.update();

  driversChart.data.datasets[0].data = [
    clamp(0, 1, inputs.rateShockPct / 6),
    clamp(0, 1, inputs.uninsuredPct / 100),
    clamp(0, 1, inputs.durationYears / 10),
    clamp(0, 1, inputs.unrealizedLossPctCap / 120),
    clamp(0, 1, inputs.withdrawalSpeed / 100),
    clamp(0, 1, inputs.concentration / 100)
  ];

  driversChart.update();
}


// ---------- Preset Scenarios ----------
const presets = {
  svb: {
    rateShockPct: 2.5,
    uninsuredPct: 80,
    durationYears: 6.5,
    unrealizedLossPctCap: 65,
    withdrawalSpeed: 85,
    concentration: 85
  },
  stable: {
    rateShockPct: 1.0,
    uninsuredPct: 25,
    durationYears: 3.0,
    unrealizedLossPctCap: 15,
    withdrawalSpeed: 25,
    concentration: 30
  },
  rateShock: {
    rateShockPct: 4.5,
    uninsuredPct: 45,
    durationYears: 7.5,
    unrealizedLossPctCap: 55,
    withdrawalSpeed: 40,
    concentration: 45
  },
  run: {
    rateShockPct: 2.0,
    uninsuredPct: 70,
    durationYears: 5.5,
    unrealizedLossPctCap: 35,
    withdrawalSpeed: 95,
    concentration: 90
  }
};

function setPreset(p) {
  Object.keys(p).forEach(k => {
    sliders[k.replace("Pct", "").replace("Years", "")].value = p[k];
  });
  render();
}


// ---------- Render Loop ----------
function render() {
  const inputs = readInputs();
  syncValueLabels(inputs);

  const score = computeStressScore(inputs);
  el("stressScore").textContent = fmt(score, 1);

  const status = classifyStatus(score);
  const pill = el("statusPill");
  pill.textContent = status.label;
  pill.style.background = `color-mix(in srgb, var(${status.colorVar}) 22%, transparent)`;

  const durLoss = estimateDurationLossPct(inputs.durationYears, inputs.rateShockPct);
  el("durationLoss").textContent = `~${fmt(durLoss, 1)}% estimated price impact`;

  el("interpretation").textContent = interpretationText(score);

  updateCharts(inputs, score);
}


// ---------- Initialization ----------
function attachListeners() {
  Object.values(sliders).forEach(s =>
    s.addEventListener("input", render)
  );

  el("presetSVB").addEventListener("click", () => setPreset(presets.svb));
  el("presetStable").addEventListener("click", () => setPreset(presets.stable));
  el("presetRateShock").addEventListener("click", () => setPreset(presets.rateShock));
  el("presetRun").addEventListener("click", () => setPreset(presets.run));
}

document.addEventListener("DOMContentLoaded", () => {
  initCharts();
  attachListeners();
  render();
});
