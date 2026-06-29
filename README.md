# AgenticPage

A simple, attractive static site deployed with **GitHub Pages**.

🔗 **Live site:** https://SourabhWalvekar.github.io/AgenticPage/

## Project structure
- `index.html` — landing page
- `styles.css` — landing page styles
- `dashboard.html` / `dashboard.css` / `dashboard.js` — the TargetSetter dashboard
- `config.js` — dashboard data-source config
- `apps-script/` — Google Sheets backend (`Code.gs`) + setup guide (`DEPLOY.md`)

## Local preview
```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment
Served via GitHub Pages from the `main` branch root. Pushes to `main` auto-deploy.

## TargetSetter Dashboard

A single-page, mobile-friendly web replica of the **target-setter** Tauri desktop
app, living at [`dashboard.html`](dashboard.html).

- **dashboard.html / dashboard.css / dashboard.js** — the dashboard UI + logic
  (faithful port of the original React/Tailwind layout, in plain HTML/CSS/JS).
- **config.js** — set `SCRIPT_URL` to your Apps Script web-app URL to enable
  live read/write to Google Sheets. Empty = demo mode (bundled seed data).
- **apps-script/** — `Code.gs` (the backend) and `DEPLOY.md` (one-time setup steps).

### Data storage
Instead of a local JSON file (Tauri), data is stored in a **Google Sheet**
("TargetSetter Data") accessed through a Google Apps Script web app. See
[`apps-script/DEPLOY.md`](apps-script/DEPLOY.md) to connect it. Until then the
dashboard runs in demo mode and works fully, but edits won't persist.
