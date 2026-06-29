/**
 * TargetSetter — Google Apps Script Web App
 * Backend for the AgenticPage dashboard (read + write to Google Sheets).
 *
 * Spreadsheet: "TargetSetter Data"
 *   - Tab "Brands":      id | name | IG | FB | X | LI | YT | campaign | paid
 *   - Tab "MonthlyPlan": rowId | brandId | type | posts | avg
 *
 * Deploy:  Extensions ▸ Apps Script ▸ paste this ▸ Deploy ▸ New deployment
 *          ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone ▸ Deploy.
 *          Copy the /exec URL into AgenticPage/config.js (SCRIPT_URL).
 */

// If you open the script from inside the spreadsheet, this auto-binds.
// Otherwise paste your spreadsheet ID here.
var SPREADSHEET_ID = '1EuvPfL6b-XvNYRuuGWr5Ab_Bk5Pbz4H8Etk5YdTBqn0';

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/** GET → returns { brands: [ { id, name, lastYearBreakdown:{IG,FB,X,LI,YT}, campaign, paid, monthlyPlan:[{id,type,posts,avg}] } ] } */
function doGet() {
  return json(readData());
}

/** POST → body is the full { brands: [...] } object; overwrites both tabs. */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    writeData(payload);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function readData() {
  var ss = getSpreadsheet();
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
  var ss = getSpreadsheet();
  var brandsSheet = ss.getSheetByName('Brands');
  var planSheet = ss.getSheetByName('MonthlyPlan');
  var brands = payload.brands || [];

  // --- Brands tab ---
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

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
