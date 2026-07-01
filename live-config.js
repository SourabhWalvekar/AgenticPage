/**
 * Live Analytics configuration.
 *
 * The Live backend lives INSIDE the same TargetSetter Apps Script project
 * (see apps-script/Code.gs) and shares the SAME deployed /exec URL — live Meta
 * (Instagram + Facebook) data is served when the URL is called with ?mode=live.
 *
 * So this value = the TargetSetter SCRIPT_URL (from config.js) + "?mode=live".
 * Leave it empty ("") to run purely in demo mode using the bundled LIVE_SEED.
 *
 * IMPORTANT: this only returns LIVE data AFTER the combined Code.gs has been
 * deployed (update the existing TargetSetter deployment to a new version so the
 * URL stays the same) AND the META_ACCESS_TOKEN Script Property is set.
 *
 * Until then, live.js validates the response shape and automatically falls back
 * to the bundled LIVE_SEED sample data so the page always renders.
 */
const LIVE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4rTiXojBGsH9rbItTurQaivj69EtJyxaqYchOvVaQsxXUFElwsH8A16uTovMH476utA/exec?mode=live";
