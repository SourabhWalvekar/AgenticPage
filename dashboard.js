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

  /* ---------- Rendering ---------- */
  function render() {
    if (!data.brands.length) return;
    if (!getActiveBrand()) activeBrandId = data.brands[0].id;

    const grandTotal = data.brands.reduce((a, b) => a + calcStats(b).totalOverall, 0);
    $("grandTotal").textContent = (grandTotal / 1000).toFixed(1);

    renderBrands();
    renderBrandSelect();
    renderRight();
  }

  function renderBrands() {
    const body = $("brandsBody");
    body.innerHTML = "";
    data.brands.forEach((b) => {
      const s = calcStats(b);
      const tr = document.createElement("tr");
      if (b.id === activeBrandId) tr.className = "selected";
      tr.addEventListener("click", (e) => {
        if (e.target.tagName === "INPUT") return; // don't switch when editing inputs
        activeBrandId = b.id; render();
      });

      tr.innerHTML =
        `<td class="name">${escapeHtml(b.name)}</td>` +
        `<td class="total mono">${s.totalOverall.toFixed(1)}M</td>` +
        `<td class="lau mono">${(s.lauYearly / 1e6).toFixed(1)}M</td>` +
        `<td class="inp"></td><td class="inp"></td>`;

      const campTd = tr.children[3];
      const paidTd = tr.children[4];
      campTd.appendChild(numInput(b.campaign, (v) => { b.campaign = v; render(); }));
      paidTd.appendChild(numInput(b.paid, (v) => { b.paid = v; render(); }));
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
    const s = calcStats(brand);

    // Projections
    const labels = ["Yearly", "6 Mo", "3 Mo", "1 Mo", "Week", "Daily"];
    const vals = [s.lauYearly, s.lauYearly / 2, s.lauYearly / 4, s.lauYearly / 12, s.lauYearly / 52, s.lauYearly / 365];
    $("projections").innerHTML = labels.map((l, i) =>
      `<div class="proj"><div class="lbl">${l}</div><div class="val">${fmt(vals[i])}</div></div>`
    ).join("");

    // Monthly plan rows
    const planBody = $("planBody");
    planBody.innerHTML = "";
    brand.monthlyPlan.forEach((row, idx) => {
      const tr = document.createElement("tr");
      const typeTd = document.createElement("td");
      const typeInput = document.createElement("input");
      typeInput.className = "type"; typeInput.value = row.type;
      typeInput.addEventListener("input", () => { brand.monthlyPlan[idx].type = typeInput.value; });
      typeTd.appendChild(typeInput);

      const qtyTd = document.createElement("td"); qtyTd.className = "c";
      qtyTd.appendChild(numInput(row.posts, (v) => { brand.monthlyPlan[idx].posts = v; render(); }, "num"));

      const avgTd = document.createElement("td"); avgTd.className = "c";
      avgTd.appendChild(numInput(row.avg, (v) => { brand.monthlyPlan[idx].avg = v; render(); }, "num"));

      const totTd = document.createElement("td"); totTd.className = "total mono";
      totTd.textContent = fmt(row.posts * row.avg * 1000);

      const xTd = document.createElement("td");
      const del = document.createElement("button");
      del.className = "del"; del.title = "Delete row";
      del.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      del.addEventListener("click", () => {
        brand.monthlyPlan = brand.monthlyPlan.filter((r) => r.id !== row.id);
        render();
      });
      xTd.appendChild(del);

      tr.append(typeTd, qtyTd, avgTd, totTd, xTd);
      planBody.appendChild(tr);
    });

    $("totalPosts").textContent = brand.monthlyPlan.reduce((a, b) => a + b.posts, 0);
    $("totalViews").textContent = fmt(s.monthlyIG);

    // Platform breakdown
    $("platforms").innerHTML = "";
    Object.keys(brand.lastYearBreakdown).forEach((plat) => {
      const div = document.createElement("div");
      div.className = "plat";
      const head = document.createElement("div"); head.className = "head"; head.textContent = plat;
      const bodyEl = document.createElement("div"); bodyEl.className = "body";
      const inp = document.createElement("input");
      inp.type = "number"; inp.value = brand.lastYearBreakdown[plat] / 1e6;
      inp.addEventListener("input", () => {
        brand.lastYearBreakdown[plat] = Number(inp.value) * 1e6;
        render();
      });
      const unit = document.createElement("div"); unit.className = "unit"; unit.textContent = "Million";
      bodyEl.append(inp, unit);
      div.append(head, bodyEl);
      $("platforms").appendChild(div);
    });

    $("multiplier").textContent = s.multiplier.toFixed(2) + "x";
  }

  /* ---------- Helpers ---------- */
  function numInput(value, onChange, cls) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = cls === "num" ? "num" : "cell";
    inp.value = value;
    inp.addEventListener("input", () => onChange(Number(inp.value)));
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

  /* ---------- Data load / save ---------- */
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

    const status = $("status");
    if (live) { status.textContent = "Live"; status.className = "status status--live"; }
    else { status.textContent = "Demo"; status.className = "status status--demo"; }

    $("loading").hidden = true;
    $("app").hidden = false;
    render();
  }

  async function save() {
    if (!live) {
      toast("Demo mode — connect Google Sheets to persist (see apps-script/DEPLOY.md)");
      return;
    }
    const btn = $("saveBtn");
    const label = $("saveLabel");
    btn.disabled = true; label.textContent = "Saving…";
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight
        body: JSON.stringify(data)
      });
      toast("✅ Saved to Google Sheets");
    } catch (e) {
      console.error(e);
      toast("❌ Save failed — check the script URL");
    } finally {
      btn.disabled = false; label.textContent = "Save Progress";
    }
  }

  /* ---------- Wire up ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    $("saveBtn").addEventListener("click", save);
    $("addRowBtn").addEventListener("click", () => {
      const brand = getActiveBrand();
      brand.monthlyPlan.push({ id: Date.now(), type: "New", posts: 0, avg: 0 });
      render();
    });
    load();
  });
})();
