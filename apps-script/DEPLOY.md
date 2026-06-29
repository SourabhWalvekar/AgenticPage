# Connect the Dashboard to Google Sheets (one-time setup)

The dashboard reads & writes data to a Google Sheet through a small Apps Script
web app. I created the Sheet and wrote the script for you — you just need to
deploy it (a few clicks that require your Google account).

## Spreadsheet
**TargetSetter Data** → https://docs.google.com/spreadsheets/d/1EuvPfL6b-XvNYRuuGWr5Ab_Bk5Pbz4H8Etk5YdTBqn0/edit

It has two tabs:
- **Brands** — `id | name | IG | FB | X | LI | YT | campaign | paid`
- **MonthlyPlan** — `rowId | brandId | type | posts | avg`

## Steps

1. Open the spreadsheet (link above).
2. Menu: **Extensions ▸ Apps Script**.
3. Delete any starter code, then paste the entire contents of **`Code.gs`** (in this folder).
4. Click **Save** (💾).
5. Click **Deploy ▸ New deployment**.
6. Click the gear ⚙️ next to "Select type" → choose **Web app**.
7. Set:
   - **Description**: TargetSetter API
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
8. Click **Deploy**. Authorize when prompted (choose your account → Advanced → Go to project → Allow).
9. Copy the **Web app URL** — it ends with `/exec`.

## Final step
Open **`config.js`** in the AgenticPage repo and paste your URL:

```js
const SCRIPT_URL = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

Commit/push that change (or tell me the URL and I'll wire it in and redeploy).

Until the URL is set, the dashboard runs in **demo mode** using bundled seed data —
it works fully but changes won't persist to the Sheet.
