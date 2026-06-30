/**
 * AgenticPage — Combined Google Apps Script Web App
 * =================================================
 * Host this in the "TargetSetter Data" spreadsheet's Apps Script project
 * (Extensions ▸ Apps Script). It serves BOTH dashboards from ONE deployment:
 *
 *   • Default GET (no params)  → TargetSetter data (Brands + MonthlyPlan tabs)
 *   • GET ?mode=reports        → Weekly SM Performance parsed series
 *   • POST                     → overwrite TargetSetter Brands + MonthlyPlan
 *
 * WHY THIS LAYOUT:
 * The Weekly SM Performance sheet lives under a Workspace (sadhguru.org) whose
 * admin BLOCKS Apps Script web-app deployment. The TargetSetter sheet is owned
 * by an account that CAN deploy. A script can read ANY sheet the executing
 * account has access to — so we host here and read the Weekly sheet by ID.
 *
 * REQUIREMENT: the account that deploys/runs this script (Execute as: Me) must
 * have at least Viewer access to the Weekly SM Performance sheet.
 *
 * DEPLOY:  Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me
 *          ▸ Who has access: Anyone ▸ Deploy.
 *   - Put the /exec URL in config.js          → SCRIPT_URL
 *   - Put the SAME url + "?mode=reports" in reports-config.js → REPORTS_SCRIPT_URL
 *
 * Reports note: only numeric metric rows are returned. Qualitative rows
 * (Learnings, Remarks, What worked, etc.) are intentionally excluded so no
 * commentary text leaves the private sheet.
 */

// TargetSetter Data spreadsheet (this script is normally bound to it).
var TS_SPREADSHEET_ID = '1EuvPfL6b-XvNYRuuGWr5Ab_Bk5Pbz4H8Etk5YdTBqn0';

// Weekly SM Performance spreadsheet (read by ID; executing account needs Viewer).
var REPORTS_SPREADSHEET_ID = '1nB1sUNYWD8LImcBtcdgeMA0c_F2Zgj-gjp0e4FQc-54';

// Default Targets Sheet (read-only; source for the reset-to-defaults operation).
var DEFAULT_TARGETS_SHEET_ID = '1Zg1rtrsXcLoQNk6ciNBGQfhLfDkACkzW3W5hxvFbTnY';

/* ======================================================================
 *  ROUTING
 * ====================================================================== */

/** GET → TargetSetter data by default, or Reports data when ?mode=reports. */
function doGet(e) {
  var mode = (e && e.parameter && e.parameter.mode) ? String(e.parameter.mode) : '';
  if (mode === 'reports') {
    return getReports();
  }
  return json(readData());
}

/** POST → body is the full { brands: [...] } object; overwrites both tabs.
 *  POST ?mode=reset → reads Default Targets Sheet and resets TargetSetter Data. */
function doPost(e) {
  var mode = (e && e.parameter && e.parameter.mode) ? String(e.parameter.mode) : '';
  if (mode === 'reset') {
    return resetToDefaults();
  }
  try {
    var payload = JSON.parse(e.postData.contents);
    writeData(payload);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ======================================================================
 *  TARGETSETTER  (Brands + MonthlyPlan)
 * ====================================================================== */

function getTargetSetterSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  return SpreadsheetApp.openById(TS_SPREADSHEET_ID);
}

function readData() {
  var ss = getTargetSetterSpreadsheet();
  var brandsSheet = ss.getSheetByName('Brands');
  var planSheet = ss.getSheetByName('MonthlyPlan');

  var bRows = brandsSheet.getDataRange().getValues();
  var pRows = planSheet.getDataRange().getValues();

  // Group monthly plan rows by brandId
  var plansByBrand = {};
  for (var i = 1; i < pRows.length; i++) {
    var r = pRows[i];
    if (r[1] === '' || r[1] === null) continue;
    var bid = String(r[1]);
    if (!plansByBrand[bid]) plansByBrand[bid] = [];
    plansByBrand[bid].push({
      id: Number(r[0]),
      type: String(r[2]),
      posts: Number(r[3]) || 0,
      avg: Number(r[4]) || 0
    });
  }

  var brands = [];
  for (var j = 1; j < bRows.length; j++) {
    var b = bRows[j];
    if (b[0] === '' || b[0] === null) continue;
    var id = String(b[0]);
    brands.push({
      id: id,
      name: String(b[1]),
      lastYearBreakdown: {
        IG: Number(b[2]) || 0,
        FB: Number(b[3]) || 0,
        X: Number(b[4]) || 0,
        LI: Number(b[5]) || 0,
        YT: Number(b[6]) || 0
      },
      campaign: Number(b[7]) || 0,
      paid: Number(b[8]) || 0,
      monthlyPlan: plansByBrand[id] || []
    });
  }
  return { brands: brands };
}

function writeData(payload) {
  var ss = getTargetSetterSpreadsheet();
  var brandsSheet = ss.getSheetByName('Brands');
  var planSheet = ss.getSheetByName('MonthlyPlan');
  var brands = payload.brands || [];

  var bOut = [['id', 'name', 'IG', 'FB', 'X', 'LI', 'YT', 'campaign', 'paid']];
  var pOut = [['rowId', 'brandId', 'type', 'posts', 'avg']];

  brands.forEach(function (b) {
    var lb = b.lastYearBreakdown || {};
    bOut.push([
      b.id, b.name,
      Number(lb.IG) || 0, Number(lb.FB) || 0, Number(lb.X) || 0,
      Number(lb.LI) || 0, Number(lb.YT) || 0,
      Number(b.campaign) || 0, Number(b.paid) || 0
    ]);
    (b.monthlyPlan || []).forEach(function (row) {
      pOut.push([row.id, b.id, row.type, Number(row.posts) || 0, Number(row.avg) || 0]);
    });
  });

  brandsSheet.clearContents();
  brandsSheet.getRange(1, 1, bOut.length, 9).setValues(bOut);

  planSheet.clearContents();
  planSheet.getRange(1, 1, pOut.length, 5).setValues(pOut);
}

/* ======================================================================
 *  RESET TO DEFAULTS  (read Default Targets Sheet and reset TargetSetter)
 * ====================================================================== */

function resetToDefaults() {
  try {
    var ss = SpreadsheetApp.openById(DEFAULT_TARGETS_SHEET_ID);
    var sgTab = ss.getSheetByName('SG Brands - 2026 Target');
    var lauTab = ss.getSheetByName('LAU Target Breakup');
    
    if (!sgTab || !lauTab) {
      return json({ ok: false, error: 'Required tabs not found in Default Targets Sheet' });
    }
    
    var sgData = sgTab.getDataRange().getValues();
    var lauData = lauTab.getDataRange().getValues();
    
    var parsed = parseDefaultTargets(sgData, lauData);
    writeData(parsed);
    
    return json({ ok: true, message: 'Reset to defaults successful' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function parseDefaultTargets(sgRows, lauRows) {
  // Parse number values like "1278.6M", "520M", "43,750,000"
  function num(val) {
    if (!val) return 0;
    var s = String(val).trim().replace(/,/g, '').replace(/₹/g, '').replace(/\$/g, '');
    if (!s || s === '-') return 0;
    var match = s.match(/^([\d.]+)\s*([MmKkBb]?)$/);
    if (!match) {
      var n = parseFloat(s);
      return isNaN(n) ? 0 : n;
    }
    var v = parseFloat(match[1]);
    var u = match[2].toLowerCase();
    if (u === 'k') v *= 1e3;
    else if (u === 'm') v *= 1e6;
    else if (u === 'b') v *= 1e9;
    return v;
  }
  
  var platMap = { 'youtube': 'YT', 'instagram': 'IG', 'facebook': 'FB', 'twitter': 'X', 'linkedin': 'LI' };
  
  // Parse SG Brands tab (starts at row 5, index 4)
  var brands = {};
  var current = null;
  for (var i = 4; i < sgRows.length; i++) {
    var row = sgRows[i];
    if (row.length < 10) continue;
    
    var channel = String(row[0] || '').trim();
    var plat = String(row[1] || '').trim().toLowerCase();
    
    if (!channel && !plat) continue;
    
    if (plat === 'all') {
      current = channel;
      brands[current] = {
        id: brandNameToId(channel),
        name: channel,
        actual2025: {},
        annual: num(row[5]),      // F: 2026 annual target
        organic: num(row[6]),     // G: organic
        lau: num(row[7]),         // H: LAU
        campaigns: num(row[8]),   // I: campaigns
        paid: num(row[9])         // J: paid
      };
    } else if (current && platMap[plat]) {
      var code = platMap[plat];
      brands[current].actual2025[code] = num(row[2]); // C: 2025 actual
    }
  }
  
  // Parse LAU Target Breakup tab
  var lauContent = {};
  var cur = null;
  var headerRe = /^(.+?)\s*\(([\d.]+\s*[MmKk]?)\)\s*$/;
  
  for (var j = 0; j < lauRows.length; j++) {
    var row = lauRows[j];
    if (row.length < 3) continue;
    
    var a = String(row[0] || '').trim();
    var match = a.match(headerRe);
    
    if (match) {
      cur = match[1].trim();
      lauContent[cur] = [];
      continue;
    }
    
    if (!cur) continue;
    
    var aLower = a.toLowerCase();
    if (aLower.indexOf('total') === 0 || aLower === '1 month content' || aLower === '1 month contents') {
      continue;
    }
    
    var posts = num(row[1]);
    var avgK = num(row[2]);
    
    if (posts === 0 || avgK === 0) continue;
    
    // Normalize avg to K format (the app expects avg in K)
    var avg_k = avgK >= 1e3 ? avgK / 1e3 : avgK;
    
    lauContent[cur].push({
      id: Date.now() + j, // unique ID
      type: a,
      posts: Math.round(posts),
      avg: Math.round(avg_k * 100) / 100
    });
  }
  
  // Build output matching TargetSetter format
  var out = { brands: [] };
  
  for (var brandName in brands) {
    var b = brands[brandName];
    out.brands.push({
      id: b.id,
      name: b.name,
      lastYearBreakdown: b.actual2025,
      campaign: b.campaigns / 1e6,  // convert to M for storage
      paid: b.paid / 1e6,           // convert to M for storage
      monthlyPlan: lauContent[brandName] || []
    });
  }
  
  return out;
}

function brandNameToId(name) {
  var map = {
    'Isha Foundation': 'if',
    'Conscious Planet': 'cp',
    'Dhyanalinga': 'dl',
    'Adiyogi': 'ay',
    'Linga Bhairavi': 'lb',
    'Sounds of Isha': 'soi',
    'Isha Tamil': 'it',
    'Isha Hindi': 'ih',
    'Isha Telugu': 'ite',
    'Isha Kannada': 'ik'
  };
  return map[name] || name.toLowerCase().replace(/\s+/g, '');
}

/* ======================================================================
 *  REPORTS  (parsed Weekly SM Performance series)
 * ====================================================================== */

var MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
var PLATFORMS = ['instagram', 'facebook', 'youtube', 'twitter', 'x', 'linkedin'];
var QUALITATIVE = ['remark', 'what worked', 'what didnt', 'what didn', 'next month',
  'learning', 'actions', '\u2705', '\u274C', '\u{1F680}'];

function norm(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function isWeekly(label) {
  var s = norm(label).toLowerCase();
  if (!s) return false;
  if (s === 'wow growth' || s === 'w avg' || s === '%' || s === 'wow') return false;
  if (s.indexOf('/') !== -1) return false;
  if (/20\d{2}/.test(s)) return false;
  if (/[a-z]{3,}\s?\d{2}\b/.test(s) && /-\s*[a-z]{3,}\s?\d{2}\b/.test(s)) return false;
  if (s.indexOf('-') === -1) return false;
  if (!(new RegExp(MONTHS)).test(s)) return false;
  if (!/\d{1,2}/.test(s)) return false;
  return true;
}

function isPlatform(label) {
  var s = norm(label).toLowerCase();
  return PLATFORMS.indexOf(s) !== -1 || s === 'x (twitter)';
}

function isQualitative(label) {
  var s = norm(label).toLowerCase();
  for (var i = 0; i < QUALITATIVE.length; i++) {
    if (s.indexOf(QUALITATIVE[i].toLowerCase()) !== -1) return true;
  }
  return false;
}

function toNumber(v) {
  var s = norm(v);
  if (!s) return null;
  if (s.indexOf('%') !== -1) return null;
  s = s.replace(/,/g, '').replace(/\u20B9/g, '').replace(/\$/g, '');
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

function detectHeaderRow(grid) {
  var best = null, bestCount = 0;
  var rows = Math.min(8, grid.length);
  for (var i = 0; i < rows; i++) {
    var cnt = 0;
    for (var c = 0; c < grid[i].length; c++) if (isWeekly(grid[i][c])) cnt++;
    if (cnt > bestCount) { best = i; bestCount = cnt; }
  }
  return bestCount >= 2 ? best : null;
}

function detectLabelCol(grid, headerRow) {
  var scores = [0, 0];
  for (var r = headerRow + 1; r < grid.length; r++) {
    for (var ci = 0; ci < 2; ci++) {
      var cell = ci < grid[r].length ? grid[r][ci] : '';
      if (isPlatform(cell)) scores[ci] += 3;
      else if (norm(cell)) scores[ci] += 1;
    }
  }
  return scores[0] >= scores[1] ? 0 : 1;
}

function parseTab(grid) {
  var hr = detectHeaderRow(grid);
  if (hr === null) return { weeks: [], platforms: {} };
  var lc = detectLabelCol(grid, hr);
  var weeks = [];
  for (var c = 0; c < grid[hr].length; c++) {
    if (isWeekly(grid[hr][c])) weeks.push({ col: c, label: norm(grid[hr][c]) });
  }
  var platforms = {}, current = null;
  var hdrLabel = lc < grid[hr].length ? grid[hr][lc] : '';
  if (isPlatform(hdrLabel)) {
    current = norm(hdrLabel).toLowerCase().charAt(0) === 'x' ? 'Twitter' : titleCase(norm(hdrLabel));
    if (!platforms[current]) platforms[current] = {};
  }
  for (var r = hr + 1; r < grid.length; r++) {
    var row = grid[r];
    var label = lc < row.length ? row[lc] : '';
    if (isPlatform(label)) {
      current = norm(label).toLowerCase().charAt(0) === 'x' ? 'Twitter' : titleCase(norm(label));
      if (!platforms[current]) platforms[current] = {};
      continue;
    }
    if (!norm(label) || isQualitative(label) || current === null) continue;
    var series = [];
    var hasVal = false;
    for (var w = 0; w < weeks.length; w++) {
      var col = weeks[w].col;
      var val = col < row.length ? toNumber(row[col]) : null;
      if (val !== null) hasVal = true;
      series.push(val);
    }
    if (hasVal) platforms[current][norm(label)] = series;
  }
  var weekLabels = weeks.map(function (w) { return w.label; });
  return { weeks: weekLabels, platforms: platforms };
}

function titleCase(s) {
  return s.replace(/\w\S*/g, function (t) {
    return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
  });
}

function buildData() {
  var ss = SpreadsheetApp.openById(REPORTS_SPREADSHEET_ID);
  var sheets = ss.getSheets();
  var out = {};
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var name = sheet.getName();
    var values = sheet.getDataRange().getValues();
    var width = 0;
    for (var r = 0; r < values.length; r++) width = Math.max(width, values[r].length);
    var grid = [];
    for (var r2 = 0; r2 < values.length; r2++) {
      var row = values[r2].slice();
      while (row.length < width) row.push('');
      grid.push(row);
    }
    var parsed = parseTab(grid);
    if (parsed.weeks.length > 0) out[name] = parsed;
  }
  return out;
}

function getReports() {
  var data;
  try {
    data = buildData();
  } catch (err) {
    return json({ error: String(err) });
  }
  return json({ generatedAt: new Date().toISOString(), brands: data });
}
