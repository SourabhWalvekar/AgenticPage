/* ===== TargetSetter dashboard logic (ported from App.tsx) ===== */
(function () {
  "use strict";

  let data = { brands: [] };
  let activeBrandId = "cp";
  let live = false; // true when connected to Google Sheets

  const $ = (id) => document.getElementById(id);

  /* ---------- Math engine (identical to the Tauri app) ---------- */
  function calcStats(brand) {
    const igHist = brand.lastYearBreakdown.IG || 1;
    const totalHist = Object.values(brand.lastYearBreakdown).reduce((a, b) => a + b, 0);
    const multiplier = totalHist / igHist;
    const monthlyIG = brand.monthlyPlan.reduce((acc, r) => acc + (r.posts * r.avg * 1000), 0);
    const lauYearly = monthlyIG * multiplier * 12;
    const totalOverall = (lauYearly / 1e6) + brand.campaign + brand.paid;
    return { multiplier, monthlyIG, lauYearly, totalOverall };
  }

  function fmt(val) {
    return val >= 1e6 ? (val / 1e6).toFixed(1) + "M" : (val / 1000).toFixed(0) + "K";
  }

  function getActiveBrand() {
    return data.brands.find((b) => b.id === activeBrandId) || data.brands[0];
  }

  /* ---------- Full render (structural changes only: load, add/delete row, switch brand) ---------- */
  function render() {
    if (!data.brands.length) return;
    if (!getActiveBrand()) activeBrandId = data.brands[0].id;
    renderBrands();
    renderBrandSelect();
    renderRight();
    recompute();
  }

  function renderBrands() {
    const body = $("brandsBody");
    body.innerHTML = "";
    data.brands.forEach((b) => {
      const tr = document.createElement("tr");
      tr.dataset.brandId = b.id;
      if (b.id === activeBrandId) tr.className = "selected";
      tr.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return; // don't switch when editing inputs
        activeBrandId = b.id; render();
      });

      tr.innerHTML =
        `<td class="name">${escapeHtml(b.name)}</td>` +
        `<td class="total mono b-total"></td>` +
        `<td class="lau mono b-lau"></td>` +
        `<td class="inp"></td><td class="inp"></td>`;

      tr.children[3].appendChild(numInput(b.campaign, (v) => { b.campaign = v; onEdit(); }));
      tr.children[4].appendChild(numInput(b.paid, (v) => { b.paid = v; onEdit(); }));
      body.appendChild(tr);
    });
  }

  function renderBrandSelect() {
    const sel = $("brandSelect");
    sel.innerHTML = "";
    data.brands.forEach((b) => {
      const o = document.createElement("option");
      o.value = b.id; o.textContent = b.name;
      if (b.id === activeBrandId) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => { activeBrandId = sel.value; render(); };
  }

  function renderRight() {
    const brand = getActiveBrand();

    // Projections (no inputs — safe to rebuild)
    $("projections").innerHTML = ["Yearly", "6 Mo", "3 Mo", "1 Mo", "Week", "Daily"]
      .map((l) => `<div class="proj"><div class="lbl">${l}</div><div class="val proj-val"></div></div>`).join("");

    // Monthly plan rows (built once; totals updated live via recompute)
    const planBody = $("planBody");
    planBody.innerHTML = "";
    brand.monthlyPlan.forEach((row, idx) => {
      const tr = document.createElement("tr");

      const typeTd = document.createElement("td");
      const typeInput = document.createElement("input");
      typeInput.className = "type"; typeInput.value = row.type;
      typeInput.addEventListener("input", () => { brand.monthlyPlan[idx].type = typeInput.value; onEdit(); });
      typeTd.appendChild(typeInput);

      const qtyTd = document.createElement("td"); qtyTd.className = "c";
      qtyTd.appendChild(numInput(row.posts, (v) => { brand.monthlyPlan[idx].posts = v; onEdit(); }, "num"));

      const avgTd = document.createElement("td"); avgTd.className = "c";
      avgTd.appendChild(numInput(row.avg, (v) => { brand.monthlyPlan[idx].avg = v; onEdit(); }, "num"));

      const totTd = document.createElement("td"); totTd.className = "total mono row-total";

      const xTd = document.createElement("td");
      const del = document.createElement("button");
      del.className = "del"; del.title = "Delete row";
      del.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener("click", () => {
        brand.monthlyPlan = brand.monthlyPlan.filter((r) => r.id !== row.id);
        render(); onEdit();
      });
      xTd.appendChild(del);

      tr.append(typeTd, qtyTd, avgTd, totTd, xTd);
      planBody.appendChild(tr);
    });

    // Platform breakdown (inputs built once; multiplier updated via recompute)
    $("platforms").innerHTML = "";
    Object.keys(brand.lastYearBreakdown).forEach((plat) => {
      const div = document.createElement("div");
      div.className = "plat";
      const head = document.createElement("div"); head.className = "head"; head.textContent = plat;
      const bodyEl = document.createElement("div"); bodyEl.className = "body";
      const inp = document.createElement("input");
      inp.type = "number"; inp.value = brand.lastYearBreakdown[plat] / 1e6;
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("input", () => {
        brand.lastYearBreakdown[plat] = Number(inp.value) * 1e6;
        onEdit();
      });
      const unit = document.createElement("div"); unit.className = "unit"; unit.textContent = "Million";
      bodyEl.append(inp, unit);
      div.append(head, bodyEl);
      $("platforms").appendChild(div);
    });
  }

  /* ---------- Lightweight recompute: updates derived TEXT only, never touches inputs ---------- */
  function recompute() {
    if (!data.brands.length) return;

    const grandTotal = data.brands.reduce((a, b) => a + calcStats(b).totalOverall, 0);
    $("grandTotal").textContent = (grandTotal / 1000).toFixed(1);

    // Left table derived cells (rows are in the same order as data.brands)
    const rows = $("brandsBody").children;
    data.brands.forEach((b, i) => {
      const s = calcStats(b);
      const tr = rows[i];
      if (!tr) return;
      tr.querySelector(".b-total").textContent = s.totalOverall.toFixed(1) + "M";
      tr.querySelector(".b-lau").textContent = (s.lauYearly / 1e6).toFixed(1) + "M";
    });

    // Right side derived values for the active brand
    const brand = getActiveBrand();
    const s = calcStats(brand);

    const projVals = [s.lauYearly, s.lauYearly / 2, s.lauYearly / 4, s.lauYearly / 12, s.lauYearly / 52, s.lauYearly / 365];
    document.querySelectorAll(".proj-val").forEach((el, i) => { el.textContent = fmt(projVals[i]); });

    const planRows = $("planBody").children;
    brand.monthlyPlan.forEach((row, idx) => {
      const tr = planRows[idx];
      if (tr) tr.querySelector(".row-total").textContent = fmt(row.posts * row.avg * 1000);
    });

    $("totalPosts").textContent = brand.monthlyPlan.reduce((a, b) => a + b.posts, 0);
    $("totalViews").textContent = fmt(s.monthlyIG);
    $("multiplier").textContent = s.multiplier.toFixed(2) + "x";
  }

  /* ---------- Called on any edit: refresh derived values ---------- */
  function onEdit() {
    recompute();
  }

  /* ---------- Helpers ---------- */
  function numInput(value, onChange, cls) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = cls === "num" ? "num" : "cell";
    inp.value = value;
    inp.addEventListener("focus", () => inp.select()); // typing cleanly replaces the value
    inp.addEventListener("input", () => onChange(inp.value === "" ? 0 : Number(inp.value)));
    return inp;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.hidden = true; }, 2500);
  }

  function setStatus(text, cls) {
    const s = $("status");
    s.textContent = text;
    s.className = "status " + cls;
  }

  /* ---------- Data load ---------- */
  async function load() {
    let loaded = null;
    if (typeof SCRIPT_URL === "string" && SCRIPT_URL.trim()) {
      try {
        const res = await fetch(SCRIPT_URL, { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.brands)) { loaded = json; live = true; }
        }
      } catch (e) {
        console.warn("Could not reach Google Sheets, falling back to seed data.", e);
      }
    }
    data = loaded || JSON.parse(JSON.stringify(SEED_DATA));
    setStatus(live ? "Live" : "Demo", live ? "status--live" : "status--demo");

    $("loading").hidden = true;
    $("app").hidden = false;
    render();
  }

  /* ---------- Save (manual button only) ---------- */
  let saving = false;

  async function saveNow() {
    if (!live) {
      toast("Demo mode — connect Google Sheets to persist (see apps-script/DEPLOY.md)");
      return;
    }
    if (saving) return; // prevent double-clicks
    saving = true;
    const btn = $("saveBtn");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight
        body: JSON.stringify(data)
      });
      toast("✅ Saved to Google Sheets");
      btn.textContent = "Saved!";
      setTimeout(() => { btn.textContent = "Save Progress"; btn.disabled = false; }, 1500);
    } catch (e) {
      console.error(e);
      toast("❌ Save failed — check the script URL");
      btn.textContent = "Save Progress";
      btn.disabled = false;
    } finally {
      saving = false;
    }
  }

  /* ---------- Wire up ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("saveBtn").addEventListener("click", saveNow);
    $("addRowBtn").addEventListener("click", () => {
      const brand = getActiveBrand();
      brand.monthlyPlan.push({ id: Date.now(), type: "New", posts: 0, avg: 0 });
      render(); onEdit();
    });
    load();
  });
})();
