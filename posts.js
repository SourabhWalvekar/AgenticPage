/* ===== Post Analytics — dashboard logic =====
 *
 * Fetches a list of Instagram posts (with per-post insights) from the Apps
 * Script `?mode=posts` endpoint and renders them as filterable tiles.
 *
 * Client-side controls: page selector, type filter (All/Carousel/Reel/Creative),
 * a Meta-Business-Suite-style date range picker, keyword search, sort field +
 * order, "show last N" count, and per-tile removal.
 *
 * If the endpoint is unreachable OR returns a payload that does not look like
 * post data (e.g. the backend route has not been deployed yet), it falls back
 * to bundled sample posts so the page always renders.
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* =================================================================
   *  STATE
   * ================================================================= */
  const state = {
    posts: [],            // all posts from backend/sample
    removed: new Set(),   // ids removed by the user
    type: "ALL",
    search: "",
    sort: "views",        // default sort: views
    order: "desc",
    count: 0,             // default: show All
    range: null,          // { start: Date, end: Date } or null = all-time (set to last-week on load)
    page: { name: "Conscious Planet", logo: "" },
  };

  /* =================================================================
   *  SAMPLE DATA (demo / fallback) — mirrors GET {SCRIPT_URL}?mode=posts
   * ================================================================= */
  const CAPTIONS = [
    "Save Soil — every handful counts 🌱 Join the movement today.",
    "Rally for Rivers throwback: how it all began.",
    "Sadhguru on conscious living and the inner dimension.",
    "Volunteers in action this weekend across 12 cities 💚",
    "5 simple steps to enrich your soil this season.",
    "Nature is not outside us — we are nature.",
    "Behind the scenes at the eco-summit 🎥",
    "Your soil, your future. Act now.",
    "A moment of stillness 🧘 Take a breath with us.",
    "Community tree plantation drive — 10,000 saplings!",
    "Reel: 60 seconds on why soil matters 🎬",
    "How healthy soil fights climate change — explained.",
    "Meet the farmers leading regenerative agriculture.",
    "Water conservation tips for the dry months 💧",
    "Carousel: the journey of a single seed 🌾",
    "Live session recap: conscious planet, conscious you.",
    "Small daily habits that heal the planet.",
    "Countdown to the global eco-summit begins now.",
    "Photo story: sunrise over restored wetlands 🌅",
    "What does 3% organic content in soil really mean?",
    "Reel: quick composting hack you can start today ♻️",
    "Thank you to our 1.2M+ community for showing up!",
    "Policy win: new soil health guidelines released.",
    "Weekend workshop: build your own kitchen garden.",
    "Carousel: 7 plants that restore degraded land.",
  ];
  const TYPES = ["CAROUSEL", "REEL", "CREATIVE"];

  function rand(min, max) { return Math.round(min + Math.random() * (max - min)); }

  function buildSamplePosts() {
    const posts = [];
    const now = Date.now();
    for (let i = 0; i < CAPTIONS.length; i++) {
      // Spread posts over the last ~120 days.
      const daysAgo = Math.round((i / CAPTIONS.length) * 118) + rand(0, 2);
      const ts = new Date(now - daysAgo * 24 * 3600 * 1000).toISOString();
      const type = TYPES[i % TYPES.length];

      const reach = rand(8000, 120000);
      const isReel = type === "REEL";
      const viewsIg = isReel ? rand(reach, reach * 6) : rand(Math.round(reach * 0.3), reach);
      const likes = rand(400, Math.max(600, Math.round(reach * 0.08)));
      const comments = rand(5, 220);
      const shares = rand(20, 900);
      const saves = rand(30, 1500);
      const interactions = likes + comments + shares + saves;

      // Cross-posting: some posts (reels/creatives) are also published to Facebook.
      const crossPosted = (i % 3 === 0);
      const viewsFb = crossPosted ? rand(Math.round(viewsIg * 0.2), Math.round(viewsIg * 1.1)) : 0;
      const views = viewsIg + viewsFb; // combined views when cross-posted

      // Follower vs non-follower reach split.
      const followerPct = rand(35, 80) / 100;
      const followerReach = Math.round(reach * followerPct);
      const nonFollowerReach = reach - followerReach;

      // Reel 3-second retention (% of viewers who stayed at least 3s). Reels only.
      const retention3s = isReel ? rand(55, 95) : null;

      // Mix of singular + collab (initiated by us / by others) for demo.
      const collab = (i % 5 === 0) ? "COLLAB_US" : (i % 7 === 0 ? "COLLAB_OTHER" : "SINGULAR");
      const collabWith = collab === "SINGULAR" ? [] : ["partneraccount"];

      posts.push({
        id: "sample_" + (1000 + i),
        caption: CAPTIONS[i],
        type: type,
        collab: collab,
        collabWith: collabWith,
        crossPosted: crossPosted,
        mediaType: type === "CAROUSEL" ? "CAROUSEL_ALBUM" : (isReel ? "VIDEO" : "IMAGE"),
        productType: isReel ? "REELS" : "FEED",
        timestamp: ts,
        thumbnail: `https://media.istockphoto.com/id/1980276924/vector/no-photo-thumbnail-graphic-element-no-found-or-available-image-in-the-gallery-or-album-flat.jpg?s=612x612&w=0&k=20&c=ZBE3NqfzIeHGDPkyvulUw14SaWfDj2rZtyiKv3toItk=`,
        permalink: `https://www.instagram.com/p/sample${i}/`,
        likes, comments, shares, saves, reach, views, viewsIg, viewsFb, interactions,
        followerReach, nonFollowerReach, retention3s,
      });
    }
    return posts;
  }

  /* =================================================================
   *  FORMATTERS
   * ================================================================= */
  function fmtCompact(v) {
    if (v == null || isNaN(v)) return "—";
    v = Number(v);
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function fmtFull(v) {
    if (v == null || isNaN(v)) return "0";
    return Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  function fmtDate(s) {
    const d = new Date(s);
    if (isNaN(d)) return String(s || "—");
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
  function fmtDateTime(s) {
    const d = new Date(s);
    if (isNaN(d)) return String(s || "—");
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function fmtShort(d) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function endOfDay(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

  /* =================================================================
   *  ICONS — monochrome, Material-style SVG glyphs (single gray color)
   * ================================================================= */
  function svg(path, cls) {
    return `<svg class="pico ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  }
  const P = {
    carousel: `<path fill="currentColor" d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/>`,
    reel: `<path fill="currentColor" d="M4 6.47L5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/>`,
    creative: `<path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>`,
    person: `<path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>`,
    group: `<path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>`,
    arrowOut: `<path fill="currentColor" d="M9 5v2h6.59L4 18.59 5.41 20 17 8.41V15h2V5z"/>`,
    arrowIn: `<path fill="currentColor" d="M19 9h-2v6.59L5.41 4 4 5.41 15.59 17H9v2h10z"/>`,
    views: `<path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 7.61 17 4.5 12 4.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>`,
    reach: `<path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>`,
    likes: `<path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`,
    comments: `<path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>`,
    shares: `<path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>`,
    saves: `<path fill="currentColor" d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>`,
    crosspost: `<path fill="currentColor" d="M7.41 18.59L8.83 20 12 16.83 15.17 20l1.42-1.41L12 14l-4.59 4.59zM16.59 5.41L15.17 4 12 7.17 8.83 4 7.41 5.41 12 10l4.59-4.59z"/><path fill="currentColor" d="M4 11h16v2H4z"/>`,
    timer: `<path fill="currentColor" d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>`,
  };

  /* type icon (monochrome, no text label) */
  const TYPE_META = {
    CAROUSEL: { ico: svg(P.carousel), label: "Carousel" },
    REEL:     { ico: svg(P.reel),     label: "Reel" },
    CREATIVE: { ico: svg(P.creative), label: "Creative" },
  };

  /* collab icon (monochrome) — singular vs collab initiated by us / by others */
  const COLLAB_META = {
    SINGULAR:     { ico: svg(P.person), label: "Single post" },
    COLLAB_US:    { ico: svg(P.group) + svg(P.arrowOut, "pico-badge"), label: "Collab — initiated by us" },
    COLLAB_OTHER: { ico: svg(P.group) + svg(P.arrowIn, "pico-badge"),  label: "Collab — by another account" },
  };

  /* =================================================================
   *  FILTER + SORT PIPELINE
   * ================================================================= */
  function applyPipeline() {
    let list = state.posts.filter((p) => !state.removed.has(p.id));

    // type
    if (state.type !== "ALL") list = list.filter((p) => p.type === state.type);

    // date range
    if (state.range && state.range.start && state.range.end) {
      const s = startOfDay(state.range.start).getTime();
      const e = endOfDay(state.range.end).getTime();
      list = list.filter((p) => {
        const t = new Date(p.timestamp).getTime();
        return !isNaN(t) && t >= s && t <= e;
      });
    }

    // search
    const q = state.search.trim().toLowerCase();
    if (q) {
      const terms = q.split(/\s+/);
      list = list.filter((p) => {
        const cap = (p.caption || "").toLowerCase();
        return terms.every((t) => cap.includes(t));
      });
    }

    // sort
    const key = state.sort;
    list.sort((a, b) => {
      let av, bv;
      if (key === "date") { av = new Date(a.timestamp).getTime(); bv = new Date(b.timestamp).getTime(); }
      else { av = Number(a[key]) || 0; bv = Number(b[key]) || 0; }
      return state.order === "asc" ? av - bv : bv - av;
    });

    // count (0 = all)
    const total = list.length;
    if (state.count > 0) list = list.slice(0, state.count);

    return { list, total };
  }

  /* =================================================================
   *  RENDER
   * ================================================================= */
  function metricHtml(icoPath, label, val) {
    return `<span class="metric" title="${label}: ${fmtFull(val)}">
      ${svg(icoPath, "m-ico")}<span class="m-val">${fmtCompact(val)}</span>
    </span>`;
  }

  function avatarHtml() {
    const pg = state.page || {};
    const name = pg.name || "Page";
    if (pg.logo) {
      return `<img class="tile-avatar" src="${escapeHtml(pg.logo)}" alt="${escapeHtml(name)}"
        onerror="this.outerHTML='<span class=\\'tile-avatar tile-avatar--ph\\'>${escapeHtml(name.charAt(0).toUpperCase())}</span>'" />`;
    }
    return `<span class="tile-avatar tile-avatar--ph">${escapeHtml(name.charAt(0).toUpperCase())}</span>`;
  }

  function tileHtml(p) {
    const tm = TYPE_META[p.type] || TYPE_META.CREATIVE;
    const cm = COLLAB_META[p.collab] || COLLAB_META.SINGULAR;
    const cap = p.caption && p.caption.trim()
      ? `<div class="tile-cap">${escapeHtml(p.caption)}</div>`
      : `<div class="tile-cap empty">No caption</div>`;
    const phIco = svg((P[p.type ? p.type.toLowerCase() : "creative"]) || P.creative, "ph-ico");
    // Placeholder sits BEHIND the image; onerror simply hides a broken image
    // (no HTML in the onerror attribute -> no quote-escaping issues).
    const img = p.thumbnail
      ? `<div class="no-img">${phIco}</div><img src="${escapeHtml(p.thumbnail)}" alt="Post thumbnail" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="no-img">${phIco}</div>`;
    const collabTitle = cm.label + (p.collabWith && p.collabWith.length ? ` (with @${escapeHtml(p.collabWith.join(", @"))})` : "");

    const crossChip = p.crossPosted
      ? `<span class="tag-ico tag-ico--cross" title="Cross-posted to Facebook & Instagram">${svg(P.crosspost)}</span>`
      : "";

    return `<article class="tile" data-id="${p.id}">
      <div class="tile-media">
        ${img}
        <span class="tile-tags">
          <span class="tag-ico" title="${tm.label}">${tm.ico}</span>
          <span class="tag-ico ${p.collab === "SINGULAR" ? "" : "tag-ico--collab"}" title="${collabTitle}">${cm.ico}</span>
          ${crossChip}
        </span>
        <button class="tile-remove" data-remove="${p.id}" title="Remove this post">✕</button>
      </div>
      <div class="tile-body">
        <div class="tile-head">
          ${avatarHtml()}
          <span class="tile-page">${escapeHtml((state.page && state.page.name) || "Conscious Planet")}</span>
          <span class="tile-date">${fmtDate(p.timestamp)}</span>
        </div>
        ${cap}
        <div class="tile-metrics">
          ${viewsMetricHtml(p)}
          ${metricHtml(P.reach, "Reach", p.reach)}
          ${metricHtml(P.likes, "Likes", p.likes)}
          ${metricHtml(P.comments, "Comments", p.comments)}
          ${metricHtml(P.shares, "Shares", p.shares)}
          ${metricHtml(P.saves, "Saves", p.saves)}
        </div>
        ${insightsHtml(p)}
      </div>
      <div class="tile-foot">
        <a class="tile-link" href="${p.permalink || "#"}" target="_blank" rel="noopener">View on Instagram ↗</a>
      </div>
    </article>`;
  }

  /* Views metric — combined IG+FB when cross-posted, with a hover breakdown. */
  function viewsMetricHtml(p) {
    const cross = p.crossPosted && p.viewsFb > 0;
    const pop = cross
      ? `<span class="metric-pop">
           <span class="mp-row"><span class="mp-dot mp-dot--ig"></span>Instagram <b>${fmtFull(p.viewsIg)}</b></span>
           <span class="mp-row"><span class="mp-dot mp-dot--fb"></span>Facebook <b>${fmtFull(p.viewsFb)}</b></span>
           <span class="mp-row mp-total">Combined <b>${fmtFull(p.views)}</b></span>
         </span>`
      : `<span class="metric-pop"><span class="mp-row"><span class="mp-dot mp-dot--ig"></span>Instagram <b>${fmtFull(p.viewsIg != null ? p.viewsIg : p.views)}</b></span></span>`;
    return `<span class="metric metric--views" title="">
      ${svg(P.views, "m-ico")}<span class="m-val">${fmtCompact(p.views)}</span>${cross ? svg(P.crosspost, "m-cross") : ""}
      ${pop}
    </span>`;
  }

  /* Follower/non-follower reach split + (reels) 3-second retention. */
  function insightsHtml(p) {
    const rows = [];
    const fr = Number(p.followerReach) || 0;
    const nfr = Number(p.nonFollowerReach) || 0;
    const tot = fr + nfr;
    if (tot > 0) {
      const fpct = Math.round((fr / tot) * 100);
      rows.push(`<div class="insight">
        <div class="insight-top">
          ${svg(P.person, "i-ico")}<span class="i-lbl">Followers vs non-followers</span>
          <span class="i-val">${fpct}% / ${100 - fpct}%</span>
        </div>
        <div class="split-bar" title="Followers ${fmtFull(fr)} · Non-followers ${fmtFull(nfr)}">
          <span class="split-foll" style="width:${fpct}%"></span>
        </div>
      </div>`);
    }
    if (p.type === "REEL" && p.retention3s != null) {
      rows.push(`<div class="insight insight--inline">
        ${svg(P.timer, "i-ico")}<span class="i-lbl">Watched ≥ 3s</span>
        <span class="i-val">${p.retention3s}%</span>
      </div>`);
    } else if (p.type === "REEL" && p.avgWatchTime != null) {
      rows.push(`<div class="insight insight--inline">
        ${svg(P.timer, "i-ico")}<span class="i-lbl">Avg. watch time</span>
        <span class="i-val">${p.avgWatchTime}s</span>
      </div>`);
    }
    return rows.length ? `<div class="tile-insights">${rows.join("")}</div>` : "";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function render() {
    const { list, total } = applyPipeline();
    const tiles = $("tiles");
    const empty = $("emptyState");

    if (!list.length) {
      tiles.innerHTML = "";
      empty.hidden = false;
    } else {
      empty.hidden = true;
      tiles.innerHTML = list.map(tileHtml).join("");
    }

    // result count summary
    const activePosts = state.posts.length - state.removed.size;
    const shownTxt = state.count > 0 && total > state.count ? `${list.length} of ${total}` : `${list.length}`;
    $("resultCount").textContent =
      `Showing ${shownTxt} post${list.length === 1 ? "" : "s"}` +
      (state.removed.size ? ` · ${state.removed.size} removed` : "") +
      ` · ${activePosts} available`;
  }

  /* =================================================================
   *  DATE RANGE PICKER (Meta Business Suite style)
   * ================================================================= */
  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const picker = {
    open: false,
    // month shown in the LEFT calendar
    viewMonth: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    draftStart: null,
    draftEnd: null,
    activePreset: "last30",
  };

  function presetRange(preset) {
    const today = startOfDay(new Date());
    let start = null, end = endOfDay(new Date());
    switch (preset) {
      case "today": start = startOfDay(new Date()); break;
      case "yesterday": {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        start = startOfDay(y); end = endOfDay(y); break;
      }
      case "last7": start = new Date(today); start.setDate(start.getDate() - 6); break;
      case "last14": start = new Date(today); start.setDate(start.getDate() - 13); break;
      case "last28": start = new Date(today); start.setDate(start.getDate() - 27); break;
      case "last30": start = new Date(today); start.setDate(start.getDate() - 29); break;
      case "last90": start = new Date(today); start.setDate(start.getDate() - 89); break;
      case "thismonth": start = new Date(today.getFullYear(), today.getMonth(), 1); break;
      case "lastmonth": {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)); break;
      }
      case "maximum": start = null; end = null; break;   // all-time
      default: return null;
    }
    return { start, end };
  }

  const PRESET_LABELS = {
    today: "Today", yesterday: "Yesterday", last7: "Last 7 days", last14: "Last 14 days",
    last28: "Last 28 days", last30: "Last 30 days", last90: "Last 90 days",
    thismonth: "This month", lastmonth: "Last month", maximum: "Maximum", custom: "Custom",
  };

  function setDateLabel(preset, range) {
    if (preset === "maximum") { $("dateLabel").textContent = "Maximum"; return; }
    if (preset && preset !== "custom" && PRESET_LABELS[preset]) {
      $("dateLabel").textContent = PRESET_LABELS[preset];
    } else if (range && range.start && range.end) {
      const sameYear = range.start.getFullYear() === range.end.getFullYear();
      const startTxt = sameYear ? fmtShort(range.start) : range.start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      $("dateLabel").textContent = `${startTxt} – ${range.end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      $("dateLabel").textContent = "Maximum";
    }
  }

  function buildCalendar(container, monthDate) {
    const year = monthDate.getFullYear(), month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = startOfDay(new Date());

    let html = `<div class="cal-head">
      <button class="cal-nav" data-cal-nav="prev" data-target="${container.id}">‹</button>
      <span class="cal-title">${MONTHS[month]} ${year}</span>
      <button class="cal-nav" data-cal-nav="next" data-target="${container.id}">›</button>
    </div><div class="cal-grid">`;
    DOW.forEach((d) => { html += `<span class="cal-dow">${d}</span>`; });

    for (let i = 0; i < startDow; i++) html += `<span></span>`;

    for (let day = 1; day <= daysInMonth; day++) {
      const cur = new Date(year, month, day);
      const disabled = cur > today;
      let cls = "cal-day";
      const s = picker.draftStart, e = picker.draftEnd;
      if (s && sameDay(cur, s)) cls += " range-start";
      if (e && sameDay(cur, e)) cls += " range-end";
      if (s && e && cur > s && cur < e) cls += " in-range";
      if (s && !e && sameDay(cur, s)) cls += " range-start range-end";
      html += `<button class="${cls}" ${disabled ? "disabled" : ""} data-day="${year}-${month}-${day}">${day}</button>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  }

  function renderCalendars() {
    const left = picker.viewMonth;
    const right = new Date(left.getFullYear(), left.getMonth() + 1, 1);
    buildCalendar($("calLeft"), left);
    buildCalendar($("calRight"), right);

    // preview text
    if (picker.draftStart && picker.draftEnd) {
      $("rangePreview").textContent = `${fmtDate(picker.draftStart)} → ${fmtDate(picker.draftEnd)}`;
    } else if (picker.draftStart) {
      $("rangePreview").textContent = `${fmtDate(picker.draftStart)} → …`;
    } else {
      $("rangePreview").textContent = "All time";
    }

    // preset highlight
    document.querySelectorAll("#presetList li").forEach((li) => {
      li.classList.toggle("active", li.dataset.preset === picker.activePreset);
    });
  }

  function openPicker() {
    picker.open = true;
    $("datePop").hidden = false;
    // seed drafts from current state
    if (state.range && state.range.start) {
      picker.draftStart = state.range.start;
      picker.draftEnd = state.range.end;
      picker.viewMonth = new Date(state.range.start.getFullYear(), state.range.start.getMonth(), 1);
    }
    renderCalendars();
  }
  function closePicker() { picker.open = false; $("datePop").hidden = true; }

  function onDayClick(y, m, d) {
    const clicked = new Date(y, m, d);
    picker.activePreset = "custom";
    if (!picker.draftStart || (picker.draftStart && picker.draftEnd)) {
      // start fresh
      picker.draftStart = clicked;
      picker.draftEnd = null;
    } else {
      // set end (swap if needed)
      if (clicked < picker.draftStart) {
        picker.draftEnd = picker.draftStart;
        picker.draftStart = clicked;
      } else {
        picker.draftEnd = clicked;
      }
    }
    renderCalendars();
  }

  function wireDatePicker() {
    $("dateBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      picker.open ? closePicker() : openPicker();
    });

    // clicks inside popover shouldn't close it
    $("datePop").addEventListener("click", (e) => e.stopPropagation());

    // presets
    $("presetList").addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      const preset = li.dataset.preset;
      picker.activePreset = preset;
      if (preset === "custom") { renderCalendars(); return; }
      const r = presetRange(preset);
      picker.draftStart = r ? r.start : null;
      picker.draftEnd = r ? r.end : null;
      if (picker.draftStart) picker.viewMonth = new Date(picker.draftStart.getFullYear(), picker.draftStart.getMonth(), 1);
      renderCalendars();
    });

    // calendar nav + day selection (delegated)
    $("datePop").addEventListener("click", (e) => {
      const nav = e.target.closest("[data-cal-nav]");
      if (nav) {
        const dir = nav.dataset.calNav === "prev" ? -1 : 1;
        picker.viewMonth = new Date(picker.viewMonth.getFullYear(), picker.viewMonth.getMonth() + dir, 1);
        renderCalendars();
        return;
      }
      const day = e.target.closest("[data-day]");
      if (day && !day.disabled) {
        const [y, m, d] = day.dataset.day.split("-").map(Number);
        onDayClick(y, m, d);
      }
    });

    $("dateApply").addEventListener("click", () => {
      if (picker.activePreset === "maximum" || (!picker.draftStart && !picker.draftEnd)) {
        state.range = null;
        setDateLabel("maximum", null);
      } else {
        const start = picker.draftStart;
        const end = picker.draftEnd || picker.draftStart; // single day selection
        state.range = { start, end };
        setDateLabel(picker.activePreset === "custom" ? "custom" : picker.activePreset, { start, end });
      }
      closePicker();
      render();
    });

    $("dateCancel").addEventListener("click", closePicker);

    // click outside closes
    document.addEventListener("click", () => { if (picker.open) closePicker(); });
  }

  /* =================================================================
   *  CONTROL WIRING
   * ================================================================= */
  function populatePages() {
    const sel = $("pageSelect");
    const pages = (typeof POSTS_PAGES !== "undefined" && Array.isArray(POSTS_PAGES)) ? POSTS_PAGES : [{ value: "consciousplanet", label: "Conscious Planet", connected: true }];
    sel.innerHTML = pages.map((p) =>
      `<option value="${p.value}" data-logo="${p.logo || ""}" ${p.connected ? "" : "disabled"}>${p.label}${p.connected ? "" : " (soon)"}</option>`
    ).join("");
    const first = pages.find((p) => p.connected) || pages[0];
    if (first) state.page = { name: first.label, logo: first.logo || "" };
  }

  function wireControls() {
    // type dropdown
    $("typeSelect").addEventListener("change", (e) => {
      state.type = e.target.value;
      render();
    });

    // page selector — updates avatar/name on tiles
    $("pageSelect").addEventListener("change", (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt) state.page = { name: opt.textContent.replace(/\s*\(soon\)\s*$/, ""), logo: opt.dataset.logo || "" };
      render();
    });

    // search
    let searchTimer;
    $("searchInput").addEventListener("input", (e) => {
      const v = e.target.value;
      $("searchClear").hidden = !v;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.search = v; render(); }, 180);
    });
    $("searchClear").addEventListener("click", () => {
      $("searchInput").value = "";
      $("searchClear").hidden = true;
      state.search = "";
      render();
    });

    // sort + order
    $("sortSelect").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
    $("orderBtn").addEventListener("click", () => {
      state.order = state.order === "desc" ? "asc" : "desc";
      $("orderBtn").dataset.order = state.order;
      $("orderIco").textContent = state.order === "desc" ? "▼" : "▲";
      $("orderTxt").textContent = state.order === "desc" ? "Desc" : "Asc";
      render();
    });

    // count
    $("countSelect").addEventListener("change", (e) => { state.count = parseInt(e.target.value, 10) || 0; render(); });

    // remove tile (delegated)
    $("tiles").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      state.removed.add(btn.dataset.remove);
      render();
    });

    // reset
    function resetFilters() {
      state.type = "ALL";
      state.search = "";
      state.sort = "views";
      state.order = "desc";
      state.count = 0;
      state.removed.clear();
      const r = presetRange("last7");
      state.range = r ? { start: r.start, end: r.end } : null;
      picker.draftStart = r ? r.start : null; picker.draftEnd = r ? r.end : null; picker.activePreset = "last7";
      $("searchInput").value = ""; $("searchClear").hidden = true;
      $("sortSelect").value = "views";
      $("countSelect").value = "0";
      $("orderBtn").dataset.order = "desc";
      $("orderIco").textContent = "▼"; $("orderTxt").textContent = "Desc";
      $("typeSelect").value = "ALL";
      setDateLabel("last7", state.range);
      render();
    }
    $("resetBtn").addEventListener("click", resetFilters);
    $("emptyReset").addEventListener("click", resetFilters);

    wireDatePicker();
  }

  /* =================================================================
   *  DATA FETCH
   * ================================================================= */
  function looksLikePosts(p) {
    return p && typeof p === "object" && !p.error && Array.isArray(p.posts);
  }

  async function fetchData() {
    if (typeof POSTS_SCRIPT_URL === "string" && POSTS_SCRIPT_URL.trim()) {
      try {
        const url = POSTS_SCRIPT_URL + (POSTS_SCRIPT_URL.includes("?") ? "&" : "?") + "limit=100&t=" + Date.now();
        const res = await fetch(url, { method: "GET" });
        if (res.ok) {
          const json = await res.json();
          if (looksLikePosts(json) && json.posts.length) {
            return { posts: json.posts, generatedAt: json.generatedAt, page: json.page, live: true };
          }
        }
      } catch (e) { console.warn("Posts fetch failed, using sample data.", e); }
    }
    return { posts: buildSamplePosts(), generatedAt: new Date().toISOString(), page: null, live: false };
  }

  function setStatus(live) {
    const el = $("status");
    el.textContent = live ? "Live" : "Sample";
    el.className = "status " + (live ? "status--live" : "status--demo");
  }

  function applyData(res) {
    state.posts = (res.posts || []).map((p) => ({
      id: p.id,
      caption: p.caption || "",
      type: p.type || "CREATIVE",
      collab: p.collab || "SINGULAR",
      collabWith: Array.isArray(p.collabWith) ? p.collabWith : [],
      crossPosted: !!p.crossPosted,
      mediaType: p.mediaType || "",
      productType: p.productType || "",
      timestamp: p.timestamp || "",
      thumbnail: p.thumbnail || "",
      permalink: p.permalink || "",
      likes: Number(p.likes) || 0,
      comments: Number(p.comments) || 0,
      shares: Number(p.shares) || 0,
      saves: Number(p.saves) || 0,
      reach: Number(p.reach) || 0,
      views: Number(p.views) || 0,
      viewsIg: p.viewsIg != null ? Number(p.viewsIg) : (Number(p.views) || 0),
      viewsFb: Number(p.viewsFb) || 0,
      followerReach: Number(p.followerReach) || 0,
      nonFollowerReach: Number(p.nonFollowerReach) || 0,
      retention3s: p.retention3s != null ? Number(p.retention3s) : null,
      avgWatchTime: p.avgWatchTime != null ? Number(p.avgWatchTime) : null,
      interactions: Number(p.interactions) || 0,
    }));
    state.removed.clear();
    $("generatedAt").textContent = "Snapshot: " + fmtDateTime(res.generatedAt || new Date().toISOString());
    if (res.page && res.page.name) {
      $("pageMeta").innerHTML = `Instagram <strong>${escapeHtml(res.page.name)}</strong>`;
      state.page = { name: res.page.name, logo: res.page.logo || res.page.profilePicture || state.page.logo || "" };
    }
  }

  /* ---------- initial load ---------- */
  async function load() {
    const res = await fetchData();
    setStatus(res.live);
    applyData(res);
    $("loading").hidden = true;
    $("app").hidden = false;
    // default date range: Last 7 days
    const r = presetRange("last7");
    state.range = r ? { start: r.start, end: r.end } : null;
    picker.activePreset = "last7";
    picker.draftStart = r ? r.start : null;
    picker.draftEnd = r ? r.end : null;
    setDateLabel("last7", state.range);
    // reflect other defaults in the controls
    $("sortSelect").value = state.sort;
    $("countSelect").value = String(state.count);
    render();
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
    let res;
    try {
      res = await fetchData();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
      if (res) { setStatus(res.live); applyData(res); render(); }
      $("refreshOverlay").hidden = true;
      btn.classList.remove("is-loading");
      btn.disabled = false;
      refreshing = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    populatePages();
    wireControls();
    $("refreshBtn").addEventListener("click", refresh);
    load();
  });
})();
