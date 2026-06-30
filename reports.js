/* ===== SM Performance Reports — dashboard logic ===== */
(function () {
  "use strict";

  let data = {};            // { brand: { weeks:[], platforms:{ plat:{ metric:[vals] } } } }
  let chart = null;
  const $ = (id) => document.getElementById(id);

  const state = { brand: null, platform: null, metric: null, range: "12", from: 0, to: 0 };

  /* ---------- formatting ---------- */
  function fmtCompact(v) {
    if (v == null || isNaN(v)) return "—";
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return String(Math.round(v * 100) / 100);
  }
  function fmtFull(v) {
    if (v == null || isNaN(v)) return "—";
    return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  function pct(cur, prev) {
    if (prev == null || prev === 0 || cur == null) return null;
    return ((cur - prev) / Math.abs(prev)) * 100;
  }

  /* ---------- aggregation type per parameter ----------
     Decides how a metric should be summarised over a date range:
       "sum"    -> additive counts (Views, Posts, Impressions, Follows...) => show TOTAL
       "avg"    -> deduplicated audience / already-averaged / rate metrics
                   (Organic Reach, Unique Views, Avg Views, %...) => show AVERAGE
                   (summing these double-counts people, so it is meaningless)
       "latest" -> cumulative snapshots (total Followers / Subscribers count)
                   => show the most recent value                                */
  function aggType(metric) {
    const s = String(metric || "").toLowerCase();
    if (/reach|unique|\bavg\b|average|rate|%|per post/.test(s)) return "avg";
    const isGrowth = /\bnet\b|\bnew\b|gain|growth|added|follows|unfollow/.test(s);
    if (!isGrowth && /(subscriber|follower)/.test(s)) return "latest";
    return "sum";
  }
  function aggLabel(metric) {
    const t = aggType(metric);
    const s = String(metric || "");
    if (t === "sum") return "Total " + s;
    if (t === "latest") return "Latest " + s;
    // avg: avoid awkward "Avg Avg Views"
    return /\bavg\b|average/i.test(s) ? s : "Avg " + s;
  }
  function aggValue(values, metric) {
    const valid = values.filter((v) => v != null);
    if (!valid.length) return null;
    const t = aggType(metric);
    if (t === "sum") return valid.reduce((a, b) => a + b, 0);
    if (t === "latest") return valid[valid.length - 1];
    return valid.reduce((a, b) => a + b, 0) / valid.length;
  }
  function aggHint(metric) {
    const t = aggType(metric);
    if (t === "sum") return "summed across period";
    if (t === "latest") return "most recent week (cumulative)";
    return "weekly average — can't be summed";
  }

  /* ---------- dropdown population ---------- */
  function setOptions(sel, items, selected) {
    sel.innerHTML = "";
    items.forEach((it) => {
      const o = document.createElement("option");
      o.value = it.value; o.textContent = it.label;
      if (it.value === selected) o.selected = true;
      sel.appendChild(o);
    });
  }

  function brandsWithData() {
    return Object.keys(data).filter((b) => (data[b].weeks || []).length > 0);
  }

  function populateBrands() {
    const brands = brandsWithData();
    setOptions($("brandSel"), brands.map((b) => ({ value: b, label: b })), state.brand);
    if (!brands.includes(state.brand)) state.brand = brands[0];
    $("brandSel").value = state.brand;
  }

  function populatePlatforms() {
    const plats = Object.keys(data[state.brand].platforms || {})
      .filter((p) => Object.keys(data[state.brand].platforms[p]).length > 0);
    setOptions($("platSel"), plats.map((p) => ({ value: p, label: p })), state.platform);
    if (!plats.includes(state.platform)) state.platform = plats[0];
    $("platSel").value = state.platform;
  }

  function populateMetrics() {
    const metrics = Object.keys((data[state.brand].platforms[state.platform]) || {});
    setOptions($("metricSel"), metrics.map((m) => ({ value: m, label: m })), state.metric);
    if (!metrics.includes(state.metric)) state.metric = metrics[0];
    $("metricSel").value = state.metric;
  }

  function populateCustomWeeks() {
    const weeks = data[state.brand].weeks || [];
    const opts = weeks.map((w, i) => ({ value: String(i), label: w }));
    setOptions($("fromWeek"), opts, String(state.from));
    setOptions($("toWeek"), opts, String(state.to));
  }

  /* ---------- selection of weeks based on range ---------- */
  function selectedRange() {
    const weeks = data[state.brand].weeks || [];
    const n = weeks.length;
    if (state.range === "custom") {
      let a = Math.min(state.from, state.to), b = Math.max(state.from, state.to);
      return [a, b + 1];
    }
    if (state.range === "all") return [0, n];
    const count = Math.min(parseInt(state.range, 10), n);
    return [n - count, n];
  }

  /* ---------- main render ---------- */
  function render() {
    const brand = data[state.brand];
    const weeks = brand.weeks || [];
    const series = (brand.platforms[state.platform] || {})[state.metric] || [];
    const [start, end] = selectedRange();
    const labels = weeks.slice(start, end);
    const values = series.slice(start, end);

    $("chartTitle").textContent = `${state.platform} · ${state.metric}`;
    $("chartMeta").textContent = `${state.brand} — ${labels.length} week${labels.length !== 1 ? "s" : ""}`;
    $("valCol").textContent = state.metric;

    const hasData = values.some((v) => v != null);
    $("noData").hidden = hasData;
    drawChart(labels, values, hasData);
    renderKpis(values, state.metric);
    renderTable(labels, values);
  }

  function drawChart(labels, values, hasData) {
    const ctx = $("chart");
    if (chart) chart.destroy();
    if (!hasData) { return; }
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: state.metric,
          data: values,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,.12)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#10b981",
          fill: true,
          tension: 0.3,
          spanGaps: true,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => `${state.metric}: ${fmtFull(c.parsed.y)}` },
          },
        },
        scales: {
          y: { beginAtZero: false, ticks: { callback: (v) => fmtCompact(v) }, grid: { color: "#f1f5f9" } },
          x: { ticks: { maxRotation: 60, minRotation: 0, autoSkip: true, maxTicksLimit: 14 }, grid: { display: false } },
        },
      },
    });
  }

  function renderKpis(values, metric) {
    const valid = values.filter((v) => v != null);
    const latest = valid.length ? valid[valid.length - 1] : null;
    const prev = valid.length > 1 ? valid[valid.length - 2] : null;
    const change = pct(latest, prev);
    const peak = valid.length ? Math.max(...valid) : null;

    // Adaptive headline KPI: TOTAL for additive metrics, AVERAGE for
    // dedup/rate metrics (e.g. Organic Reach), LATEST for cumulative counts.
    const headVal = aggValue(values, metric);
    const headLbl = aggLabel(metric);
    const headHint = aggHint(metric);

    const changeCls = change == null ? "flat" : change > 0 ? "up" : change < 0 ? "down" : "flat";
    const changeTxt = change == null ? "—" : (change > 0 ? "▲ " : change < 0 ? "▼ " : "") + Math.abs(change).toFixed(1) + "%";

    $("kpis").innerHTML = `
      <div class="kpi kpi--head"><div class="lbl">${headLbl}</div><div class="val">${fmtCompact(headVal)}</div><div class="sub flat">${headHint}</div></div>
      <div class="kpi"><div class="lbl">Latest week</div><div class="val">${fmtCompact(latest)}</div><div class="sub ${changeCls}">${changeTxt} WoW</div></div>
      <div class="kpi"><div class="lbl">Period peak</div><div class="val">${fmtCompact(peak)}</div><div class="sub flat">highest week</div></div>
      <div class="kpi"><div class="lbl">Weeks with data</div><div class="val">${valid.length}</div><div class="sub flat">of ${values.length} shown</div></div>`;
  }

  function renderTable(labels, values) {
    const body = $("tableBody");
    body.innerHTML = "";
    labels.forEach((wk, i) => {
      const v = values[i];
      const prev = i > 0 ? values[i - 1] : null;
      const ch = pct(v, prev);
      const chCls = ch == null ? "" : ch > 0 ? "up" : ch < 0 ? "down" : "";
      const chTxt = ch == null ? "—" : (ch > 0 ? "+" : "") + ch.toFixed(1) + "%";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${wk}</td><td class="mono">${fmtFull(v)}</td><td class="${chCls}">${chTxt}</td>`;
      body.appendChild(tr);
    });
  }

  /* ---------- CSV export ---------- */
  function exportCsv() {
    const brand = data[state.brand];
    const weeks = brand.weeks || [];
    const series = (brand.platforms[state.platform] || {})[state.metric] || [];
    const [start, end] = selectedRange();
    const labels = weeks.slice(start, end), values = series.slice(start, end);
    let csv = `Week,${state.metric},WoW change %\n`;
    labels.forEach((wk, i) => {
      const ch = pct(values[i], i > 0 ? values[i - 1] : null);
      csv += `"${wk}",${values[i] == null ? "" : values[i]},${ch == null ? "" : ch.toFixed(2)}\n`;
    });
    const hv = aggValue(values, state.metric);
    csv += `\n"${aggLabel(state.metric)} (${aggHint(state.metric)})",${hv == null ? "" : hv}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${state.brand}_${state.platform}_${state.metric}.csv`.replace(/\s+/g, "-");
    a.click();
  }

  /* ---------- events ---------- */
  function onBrandChange() {
    state.brand = $("brandSel").value;
    populatePlatforms(); populateMetrics(); populateCustomWeeks();
    resetCustomDefaults(); render();
  }
  function onPlatformChange() {
    state.platform = $("platSel").value;
    populateMetrics(); render();
  }
  function onMetricChange() { state.metric = $("metricSel").value; render(); }
  function onRangeChange() {
    state.range = $("rangeSel").value;
    $("customRange").hidden = state.range !== "custom";
    render();
  }
  function resetCustomDefaults() {
    const n = (data[state.brand].weeks || []).length;
    state.from = Math.max(0, n - 12); state.to = n - 1;
    $("fromWeek").value = String(state.from);
    $("toWeek").value = String(state.to);
  }

  /* ---------- load ---------- */
  async function load() {
    let live = false;
    if (typeof REPORTS_SCRIPT_URL === "string" && REPORTS_SCRIPT_URL.trim()) {
      try {
        const res = await fetch(REPORTS_SCRIPT_URL, { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (json && typeof json === "object") { data = json; live = true; }
        }
      } catch (e) { console.warn("Live fetch failed, using demo data.", e); }
    }
    if (!live) data = JSON.parse(JSON.stringify(REPORTS_SEED));

    $("status").textContent = live ? "Live" : "Demo";
    $("status").className = "status " + (live ? "status--live" : "status--demo");

    const brands = brandsWithData();
    state.brand = brands[0];
    populateBrands(); populatePlatforms(); populateMetrics(); populateCustomWeeks();
    resetCustomDefaults();

    $("loading").hidden = true;
    $("app").hidden = false;
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("brandSel").addEventListener("change", onBrandChange);
    $("platSel").addEventListener("change", onPlatformChange);
    $("metricSel").addEventListener("change", onMetricChange);
    $("rangeSel").addEventListener("change", onRangeChange);
    $("fromWeek").addEventListener("change", () => { state.from = parseInt($("fromWeek").value, 10); render(); });
    $("toWeek").addEventListener("change", () => { state.to = parseInt($("toWeek").value, 10); render(); });
    $("csvBtn").addEventListener("click", exportCsv);
    load();
  });
})();
