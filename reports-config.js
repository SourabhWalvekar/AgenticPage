/**
 * Reports dashboard configuration.
 *
 * The Reports backend is hosted INSIDE the TargetSetter Apps Script project
 * (see apps-script/Code.gs) and shares the SAME deployed /exec URL — Reports
 * data is served when the URL is called with ?mode=reports.
 *
 * So this value = the TargetSetter SCRIPT_URL (from config.js) + "?mode=reports".
 * Leave it empty ("") to run in demo mode using the bundled REPORTS_SEED data.
 *
 * IMPORTANT: this only returns live data AFTER the combined Code.gs has been
 * deployed (update the existing TargetSetter deployment to a new version so the
 * URL stays the same).
 */
const REPORTS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4rTiXojBGsH9rbItTurQaivj69EtJyxaqYchOvVaQsxXUFElwsH8A16uTovMH476utA/exec?mode=reports";
