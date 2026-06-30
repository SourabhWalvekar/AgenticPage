/**
 * Reports backend — reads the private weekly SM performance sheet and returns
 * parsed numeric series (per brand / platform / metric) as JSON.
 *
 * Deploy: Extensions > Apps Script (bound to THIS spreadsheet), paste this file,
 * then Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone.
 * Copy the /exec URL into reports-config.js (REPORTS_SCRIPT_URL).
 *
 * NOTE: only numeric metric rows are returned. Qualitative rows (Learnings,
 * Remarks, What worked, etc.) are intentionally excluded so no commentary text
 * leaves the private sheet.
 */

var SPREADSHEET_ID = '1nB1sUNYWD8LImcBtcdgeMA0c_F2Zgj-gjp0e4FQc-54';

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
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheets = ss.getSheets();
  var out = {};
  for (var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    var name = sheet.getName();
    var values = sheet.getDataRange().getValues();
    // pad rows to uniform width
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

function doGet(e) {
  var data;
  try {
    data = buildData();
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ generatedAt: new Date().toISOString(), brands: data }))
    .setMimeType(ContentService.MimeType.JSON);
}
