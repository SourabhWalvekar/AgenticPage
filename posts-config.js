/**
 * Post Analytics configuration.
 *
 * The Post Analytics backend lives INSIDE the same TargetSetter Apps Script
 * project (see apps-script/Code.gs) and shares the SAME deployed /exec URL —
 * per-post Instagram data (with insights) is served when the URL is called
 * with ?mode=posts.
 *
 * So this value = the TargetSetter SCRIPT_URL (from config.js) + "?mode=posts".
 * Leave it empty ("") to run purely in demo mode using the bundled POSTS_SEED.
 *
 * IMPORTANT: this only returns LIVE data AFTER the combined Code.gs has been
 * deployed (update the existing TargetSetter deployment to a new version so the
 * URL stays the same) AND the META_ACCESS_TOKEN Script Property is set.
 *
 * Until then, posts.js validates the response shape and automatically falls
 * back to bundled sample posts so the page always renders.
 */
const POSTS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4rTiXojBGsH9rbItTurQaivj69EtJyxaqYchOvVaQsxXUFElwsH8A16uTovMH476utA/exec?mode=posts";

/**
 * Pages the user can analyze. Right now only Conscious Planet is connected;
 * more pages can be appended here as access is granted. The `value` is passed
 * to the backend as ?page=<value> (the backend currently ignores it and uses
 * the default connected account, but the contract is ready for multi-page).
 */
const POSTS_PAGES = [
  { value: "consciousplanet", label: "Conscious Planet", connected: true },
  // { value: "isha",          label: "Isha Foundation",  connected: false },
];
