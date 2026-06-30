# Deploy the Reports backend (Apps Script)

The Reports page reads your **private** weekly SM-performance Google Sheet. Because
GitHub Pages is a static site, it cannot hold Google credentials — so a small
Apps Script web app, bound to your sheet, does the reading and returns only the
parsed **numeric** series as JSON. (Qualitative rows like Learnings / Remarks are
never returned.)

> ⚠️ **Privacy note — please read.** The web app must be deployed with
> *Who has access: Anyone*, and its `/exec` URL lives in the public AgenticPage
> repo. The **sheet itself stays private**, but anyone who has (or guesses/finds)
> the `/exec` URL could fetch the numeric report data. If that is not acceptable,
> keep the page in **Demo mode** (leave `REPORTS_SCRIPT_URL` empty) and it will
> show the bundled snapshot instead of live data.

This is a **different** spreadsheet than TargetSetter, so it needs its **own**
Apps Script project bound to **this** sheet.

## Steps

1. Open the weekly SM performance Google Sheet:
   https://docs.google.com/spreadsheets/d/1nB1sUNYWD8LImcBtcdgeMA0c_F2Zgj-gjp0e4FQc-54/edit
2. Menu: **Extensions ▸ Apps Script**. A new bound script project opens.
3. Delete any boilerplate in `Code.gs`, then paste the entire contents of
   **`Code-reports.gs`** (in this folder).
4. Click **Save** (💾).
5. Click **Deploy ▸ New deployment**.
6. Click the gear ⚙️ next to "Select type" and choose **Web app**.
7. Set:
   - **Description**: `Reports backend`
   - **Execute as**: **Me** (your account)
   - **Who has access**: **Anyone**
8. Click **Deploy**. Authorize when prompted (review the permissions and Allow).
9. Copy the **Web app URL** (ends in `/exec`).
10. Paste it into **`reports-config.js`** at the repo root:
    ```js
    const REPORTS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXX/exec";
    ```
11. Commit & push. The Reports page will switch from **Demo** to **Live**.

## Updating later
If you change the sheet structure and need to redeploy: in Apps Script use
**Deploy ▸ Manage deployments ▸ (edit) ▸ Version: New version ▸ Deploy**. The
`/exec` URL stays the same, so no config change is needed.

## Quick test
Open the `/exec` URL directly in your browser. You should see JSON like:
```json
{ "generatedAt": "...", "brands": { "Isha Foundation": { "weeks": [...], "platforms": {...} }, ... } }
```
