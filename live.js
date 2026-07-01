/* ===== Live Social Media Analytics — dashboard logic =====
 *
 * Fetches a fresh snapshot + accumulated history from the Apps Script
 * `?mode=live` endpoint and renders it as Chart.js charts + tables.
 *
 * If the endpoint is unreachable OR returns a payload that does not look like
 * live data (e.g. the backend route has not been deployed yet), it falls back
 * to the bundled LIVE_SEED sample data below so the page always renders. This
 * lets the UI be reviewed/refined before the real Meta Graph API is wired up.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const charts = {}; // keep references so we can destroy before re-draw

  /* =================================================================
   *  BUNDLED SAMPLE DATA (demo / fallback)
   *  Mirrors the exact JSON contract of GET {SCRIPT_URL}?mode=live.
   *  Numbers are illustrative — replace automatically once the live
   *  Meta Graph API route is deployed.
   * ================================================================= */
  const IG_HEADERS = ["Timestamp", "Username", "Followers", "Following", "Media",
    "Reach", "FollowerChange", "ProfileViews", "AccountsEngaged", "TotalInteractions",
    "Likes", "Comments", "Shares", "Saves", "Views"];
  const FB_HEADERS = ["Timestamp", "Page", "Fans", "Followers", "TalkingAbout", "WereHere"];

  // 14 daily-ish snapshots to make trend lines look meaningful.
  const SAMPLE_DAYS = 14;
  function buildSampleHistory() {
    const igRows = [];
    const fbRows = [];
    const now = Date.now();
    let followers = 305200;
    let fbFans = 1208900;
    let fbFollowers = 1244000;
    for (let i = SAMPLE_DAYS - 1; i >= 0; i--) {
      const ts = new Date(now - i * 24 * 3600 * 1000).toISOString();
      const followerChange = 250 + Math.round(Math.random() * 900);
      followers += followerChange;
      const reach = 4200 + Math.round(Math.random() * 6500);
      const profileViews = 900 + Math.round(Math.random() * 1200);
      const accountsEngaged = 700 + Math.round(Math.random() * 900);
      const likes = 800 + Math.round(Math.random() * 1200);
      const comments = 5 + Math.round(Math.random() * 40);
      const shares = 90 + Math.round(Math.random() * 220);
      const saves = 40 + Math.round(Math.random() * 120);
      const views = 15000 + Math.round(Math.random() * 25000);
      const totalInteractions = likes + comments + shares + saves;
      igRows.push([ts, "consciousplanet", followers, 12, 3200 + (SAMPLE_DAYS - i),
        reach, followerChange, profileViews, accountsEngaged, totalInteractions,
        likes, comments, shares, saves, views]);

      const fanChange = 400 + Math.round(Math.random() * 1400);
      fbFans += fanChange;
      fbFollowers += fanChange + Math.round(Math.random() * 300);
      const talkingAbout = 3500 + Math.round(Math.random() * 3500);
      fbRows.push([ts, "Conscious Planet", fbFans, fbFollowers, talkingAbout, 0]);
    }
    return { igRows, fbRows };
  }

  function buildSeed() {
    const { igRows, fbRows } = buildSampleHistory();
    const lastIG = igRows[igRows.length - 1];
    const lastFB = fbRows[fbRows.length - 1];

    const captions = [
      "Save Soil — every handful counts 🌱", "Rally for Rivers throwback",
      "Sadhguru on conscious living", "Volunteers in action this weekend",
      "5 simple steps to enrich your soil", "Nature is not outside us",
      "Behind the scenes at the eco-summit", "Your soil, your future",
      "A moment of stillness 🧘", "Community tree plantation drive"];
    const types = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM", "IMAGE", "VIDEO",
      "IMAGE", "REELS", "IMAGE", "VIDEO", "CAROUSEL_ALBUM"];
    const recentMedia = [];
    for (let i = 0; i < 10; i++) {
      recentMedia.push({
        id: "media_" + (1000 + i),
        caption: captions[i],
        media_type: types[i],
        timestamp: new Date(Date.now() - i * 22 * 3600 * 1000).toISOString(),
        like_count: 600 + Math.round(Math.random() * 2400),
        comments_count: 3 + Math.round(Math.random() * 60),
        media_url: `https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png`,
        thumbnail_url: `https://placeholdpicsum.dev/600x400/4f46e5/ffffff`,
        permalink: `https://www.instagram.com/p/demo${i}/`
      });
    }

    const fbMessages = [
      "Join us for the Save Soil movement — link in bio.",
      "Watch Sadhguru's latest talk on ecology and consciousness.",
      "Thank you to our 1.2M+ community for making change happen!",
      "New policy recommendations for soil health released today.",
      "Photos from this weekend's volunteer gathering.",
      "How healthy soil fights climate change — a thread.",
      "Live session announcement: conscious planet, conscious you.",
      "Reposting your beautiful nature captures 🌍",
      "Small daily habits that heal the planet.",
      "Countdown to the global eco-summit begins now."];
    const recentPosts = [];
    for (let i = 0; i < 10; i++) {
      recentPosts.push({
        id: "post_" + (2000 + i),
        message: fbMessages[i],
        created_time: new Date(Date.now() - i * 26 * 3600 * 1000).toISOString(),
        shares: 4 + Math.round(Math.random() * 80),
        full_picture: `https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEg_b_KqAE6GFvYneYGHCZZ_-mvRKA6OacadLXH-DAFDt_ruh80RRVaYUREqxuVdONnRgW-zmKW1zJSyhmpivTExoDrK4n20ogLyGG5QtndKhBlsMC7pZbiUjWpQ4G9_-enyWN-0pYdGVdw/s1600/7998802501_f4633002de_b.jpg`,
        permalink_url: `https://www.facebook.com/consciousplanet/posts/demo${i}`
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      instagram: {
        account: {
          username: "consciousplanet",
          followers_count: lastIG[2],
          follows_count: 12,
          media_count: lastIG[4]
        },
        daily: { reach: lastIG[5], follower_count: lastIG[6] },
        engagement: {
          profile_views: lastIG[7], accounts_engaged: lastIG[8],
          total_interactions: lastIG[9], likes: lastIG[10],
          comments: lastIG[11], shares: lastIG[12], saves: lastIG[13],
          views: lastIG[14]
        },
        recentMedia: recentMedia
      },
      facebook: {
        page: {
          name: "Conscious Planet",
          fan_count: lastFB[2], followers_count: lastFB[3],
          talking_about_count: lastFB[4], were_here_count: 0
        },
        recentPosts: recentPosts
      },
      history: {
        instagram: { headers: IG_HEADERS, rows: igRows },
        facebook: { headers: FB_HEADERS, rows: fbRows }
      }
    };
  }

  /* ---------- formatting ---------- */
  function fmtCompact(v) {
    if (v == null || isNaN(v)) return "—";
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function fmtFull(v) {
    if (v == null || isNaN(v)) return "—";
    return Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function fmtDate(s) {
    const d = new Date(s);
    if (isNaN(d)) return String(s || "—");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function fmtDateTime(s) {
    const d = new Date(s);
    if (isNaN(d)) return String(s || "—");
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  /* ---------- history column helpers ---------- */
  // Returns { labels:[], values:[] } for a named column in a history block.
  function seriesFromHistory(hist, colName) {
    if (!hist || !Array.isArray(hist.headers) || !Array.isArray(hist.rows)) {
      return { labels: [], values: [] };
    }
    const tsIdx = hist.headers.indexOf("Timestamp");
    const colIdx = hist.headers.indexOf(colName);
    if (colIdx === -1) return { labels: [], values: [] };
    const labels = [], values = [];
    hist.rows.forEach((r) => {
      labels.push(fmtDate(r[tsIdx]));
      const n = Number(r[colIdx]);
      values.push(isNaN(n) ? null : n);
    });
    return { labels, values };
  }

  /* ---------- chart builders ---------- */
  const COLORS = {
    green: "#10b981", greenSoft: "rgba(16,185,129,.12)",
    blue: "#3b82f6", blueSoft: "rgba(59,130,246,.12)",
    violet: "#8b5cf6", violetSoft: "rgba(139,92,246,.12)",
    amber: "#f59e0b", pink: "#ec4899", cyan: "#06b6d4"
  };

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); charts[key] = null; }
  }

  function lineChart(canvasId, label, labels, values, color, soft) {
    destroyChart(canvasId);
    const ctx = $(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label, data: values,
          borderColor: color, backgroundColor: soft,
          borderWidth: 2.5, pointRadius: 2.5, pointHoverRadius: 5,
          pointBackgroundColor: color, fill: true, tension: 0.35, spanGaps: true
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${label}: ${fmtFull(c.parsed.y)}` } }
        },
        scales: {
          y: { beginAtZero: false, ticks: { callback: (v) => fmtCompact(v) }, grid: { color: "#f1f5f9" } },
          x: { ticks: { maxRotation: 60, autoSkip: true, maxTicksLimit: 10 }, grid: { display: false } }
        }
      }
    });
  }

  function barChart(canvasId, label, labels, values, color) {
    destroyChart(canvasId);
    const ctx = $(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label, data: values, backgroundColor: color, borderRadius: 6, maxBarThickness: 42 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => `${label}: ${fmtFull(c.parsed.y)}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v) => fmtCompact(v) }, grid: { color: "#f1f5f9" } },
          x: { ticks: { maxRotation: 60, autoSkip: false }, grid: { display: false } }
        }
      }
    });
  }

  function doughnutChart(canvasId, labels, values, colors) {
    destroyChart(canvasId);
    const ctx = $(canvasId);
    if (!ctx) return;
    charts[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "58%",
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, padding: 14, font: { size: 12 } } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const total = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
                const pct = ((c.parsed / total) * 100).toFixed(1);
                return `${c.label}: ${fmtFull(c.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /* ---------- KPI + tables ---------- */
  function renderKpis(d) {
    const ig = d.instagram || {}, fb = d.facebook || {};
    const acct = ig.account || {}, daily = ig.daily || {}, eng = ig.engagement || {};
    const page = fb.page || {};
    $("kpis").innerHTML = `
      <div class="kpi kpi--ig"><div class="lbl">IG Followers</div><div class="val">${fmtCompact(acct.followers_count)}</div><div class="sub up">▲ ${fmtFull(daily.follower_count)} today</div></div>
      <div class="kpi kpi--ig"><div class="lbl">IG Reach (day)</div><div class="val">${fmtCompact(daily.reach)}</div><div class="sub flat">${fmtFull(eng.accounts_engaged)} engaged</div></div>
      <div class="kpi kpi--ig"><div class="lbl">IG Interactions</div><div class="val">${fmtCompact(eng.total_interactions)}</div><div class="sub flat">${fmtFull(eng.views)} views</div></div>
      <div class="kpi kpi--fb"><div class="lbl">FB Fans</div><div class="val">${fmtCompact(page.fan_count)}</div><div class="sub flat">${fmtCompact(page.followers_count)} followers</div></div>
      <div class="kpi kpi--fb"><div class="lbl">FB Talking About</div><div class="val">${fmtCompact(page.talking_about_count)}</div><div class="sub flat">people</div></div>
      <div class="kpi"><div class="lbl">IG Media</div><div class="val">${fmtCompact(acct.media_count)}</div><div class="sub flat">total posts</div></div>`;
  }

  function renderSnapshotTable(d) {
    const ig = d.instagram || {}, fb = d.facebook || {};
    const acct = ig.account || {}, daily = ig.daily || {}, eng = ig.engagement || {};
    const page = fb.page || {};
    const rows = [
      ["Instagram", "Username", "@" + (acct.username || "—")],
      ["Instagram", "Followers", fmtFull(acct.followers_count)],
      ["Instagram", "Following", fmtFull(acct.follows_count)],
      ["Instagram", "Media count", fmtFull(acct.media_count)],
      ["Instagram", "Reach (day)", fmtFull(daily.reach)],
      ["Instagram", "Follower change (day)", fmtFull(daily.follower_count)],
      ["Instagram", "Profile views", fmtFull(eng.profile_views)],
      ["Instagram", "Accounts engaged", fmtFull(eng.accounts_engaged)],
      ["Instagram", "Total interactions", fmtFull(eng.total_interactions)],
      ["Instagram", "Likes", fmtFull(eng.likes)],
      ["Instagram", "Comments", fmtFull(eng.comments)],
      ["Instagram", "Shares", fmtFull(eng.shares)],
      ["Instagram", "Saves", fmtFull(eng.saves)],
      ["Instagram", "Views", fmtFull(eng.views)],
      ["Facebook", "Page", page.name || "—"],
      ["Facebook", "Fans", fmtFull(page.fan_count)],
      ["Facebook", "Followers", fmtFull(page.followers_count)],
      ["Facebook", "Talking about", fmtFull(page.talking_about_count)],
      ["Facebook", "Were here", fmtFull(page.were_here_count)]
    ];
    $("snapshotBody").innerHTML = rows.map((r) => {
      const cls = r[0] === "Instagram" ? "tag tag--ig" : "tag tag--fb";
      return `<tr><td><span class="${cls}">${r[0]}</span></td><td>${r[1]}</td><td class="mono">${r[2]}</td></tr>`;
    }).join("");
  }

  function renderIgPostsTable(media) {
    const body = $("igPostsBody");
    if (!media || !media.length) { body.innerHTML = `<tr><td colspan="6" class="empty">No recent media.</td></tr>`; return; }
    body.innerHTML = media.map((m) => {
      const cap = (m.caption || "").length > 70 ? m.caption.slice(0, 70) + "…" : (m.caption || "—");
      const thumbUrl = m.thumbnail_url || m.media_url || '';
      const permalink = m.permalink || '';
      const thumbHtml = thumbUrl 
        ? `<a href="${permalink}" target="_blank" rel="noopener"><img src="${thumbUrl}" alt="Post thumbnail" class="post-thumb" /></a>`
        : '—';
      return `<tr>
        <td class="thumb-cell">${thumbHtml}</td>
        <td>${fmtDate(m.timestamp)}</td>
        <td><span class="tag tag--type">${m.media_type || "—"}</span></td>
        <td class="cap">${cap}</td>
        <td class="mono">${fmtFull(m.like_count)}</td>
        <td class="mono">${fmtFull(m.comments_count)}</td>
      </tr>`;
    }).join("");
  }

  function renderFbPostsTable(posts) {
    const body = $("fbPostsBody");
    if (!posts || !posts.length) { body.innerHTML = `<tr><td colspan="4" class="empty">No recent posts.</td></tr>`; return; }
    body.innerHTML = posts.map((p) => {
      const msg = (p.message || "").length > 80 ? p.message.slice(0, 80) + "…" : (p.message || "—");
      const thumbUrl = p.full_picture || '';
      const permalink = p.permalink_url || '';
      const thumbHtml = thumbUrl 
        ? `<a href="${permalink}" target="_blank" rel="noopener"><img src="${thumbUrl}" alt="Post thumbnail" class="post-thumb" /></a>`
        : '—';
      return `<tr>
        <td class="thumb-cell">${thumbHtml}</td>
        <td>${fmtDate(p.created_time)}</td>
        <td class="cap">${msg}</td>
        <td class="mono">${fmtFull(p.shares)}</td>
      </tr>`;
    }).join("");
  }

  /* ---------- master render ---------- */
  function render(d) {
    // KPI strip
    renderKpis(d);

    // Trend lines from history
    const igHist = (d.history && d.history.instagram) || { headers: [], rows: [] };
    const fbHist = (d.history && d.history.facebook) || { headers: [], rows: [] };

    const followers = seriesFromHistory(igHist, "Followers");
    lineChart("igFollowersChart", "IG Followers", followers.labels, followers.values, COLORS.violet, COLORS.violetSoft);

    const reach = seriesFromHistory(igHist, "Reach");
    lineChart("igReachChart", "IG Reach", reach.labels, reach.values, COLORS.green, COLORS.greenSoft);

    const fans = seriesFromHistory(fbHist, "Fans");
    lineChart("fbFansChart", "FB Fans", fans.labels, fans.values, COLORS.blue, COLORS.blueSoft);

    // Engagement doughnut
    const eng = (d.instagram && d.instagram.engagement) || {};
    doughnutChart("engagementChart",
      ["Likes", "Comments", "Shares", "Saves"],
      [eng.likes || 0, eng.comments || 0, eng.shares || 0, eng.saves || 0],
      [COLORS.pink, COLORS.amber, COLORS.blue, COLORS.violet]);

    // Recent posts bar charts
    const media = ((d.instagram && d.instagram.recentMedia) || []).slice(0, 10);
    barChart("igLikesChart", "Likes",
      media.map((m) => fmtDate(m.timestamp)),
      media.map((m) => Number(m.like_count) || 0), COLORS.pink);

    const posts = ((d.facebook && d.facebook.recentPosts) || []).slice(0, 10);
    barChart("fbSharesChart", "Shares",
      posts.map((p) => fmtDate(p.created_time)),
      posts.map((p) => Number(p.shares) || 0), COLORS.blue);

    // Tables
    renderSnapshotTable(d);
    renderIgPostsTable(media);
    renderFbPostsTable(posts);

    // Meta line
    $("generatedAt").textContent = "Snapshot: " + fmtDateTime(d.generatedAt || new Date().toISOString());
    $("historyMeta").textContent = `${igHist.rows.length} IG · ${fbHist.rows.length} FB snapshots in history`;
  }

  /* ---------- validation: does a payload look like live data? ---------- */
  function looksLikeLive(p) {
    return p && typeof p === "object" && !p.error &&
      p.instagram && typeof p.instagram === "object" &&
      p.facebook && typeof p.facebook === "object";
  }

  /* ---------- data fetch ---------- */
  async function fetchData() {
    if (typeof LIVE_SCRIPT_URL === "string" && LIVE_SCRIPT_URL.trim()) {
      try {
        const url = LIVE_SCRIPT_URL + (LIVE_SCRIPT_URL.includes("?") ? "&" : "?") + "t=" + Date.now();
        const res = await fetch(url, { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (looksLikeLive(json)) return { data: json, live: true };
        }
      } catch (e) { console.warn("Live fetch failed, using sample data.", e); }
    }
    return { data: buildSeed(), live: false };
  }

  function setStatus(live) {
    const el = $("status");
    el.textContent = live ? "Live" : "Sample";
    el.className = "status " + (live ? "status--live" : "status--demo");
  }

  /* ---------- initial load ---------- */
  async function load() {
    const { data, live } = await fetchData();
    setStatus(live);
    $("loading").hidden = true;
    $("app").hidden = false;
    render(data);
  }

  /* ---------- refresh ---------- */
  let refreshing = false;
  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    const btn = $("refreshBtn");
    btn.disabled = true;
    btn.classList.add("is-loading");
    $("refreshOverlay").hidden = false;
    const startedAt = Date.now();
    let result;
    try {
      result = await fetchData();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
      setStatus(result ? result.live : false);
      if (result) render(result.data);
      $("refreshOverlay").hidden = true;
      btn.classList.remove("is-loading");
      btn.disabled = false;
      refreshing = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("refreshBtn").addEventListener("click", refresh);
    load();
  });
})();
