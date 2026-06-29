/**
 * Dashboard configuration.
 *
 * 1. Deploy the Apps Script web app (see apps-script/DEPLOY.md).
 * 2. Paste the /exec URL below to enable live read/write to Google Sheets.
 *    Leave it empty ("") to run in demo mode using the SEED_DATA below.
 */
const SCRIPT_URL = "";

/** Seed data — mirrors the original Tauri app's data.json. Used in demo mode
 *  and as the first-load fallback if the Sheet can't be reached. */
const SEED_DATA = {
  brands: [
    { id: "if",  name: "Isha Foundation", lastYearBreakdown: { IG: 10000000, FB: 5000000, X: 1000000, LI: 1000000, YT: 3000000 },  campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "dl",  name: "Dhyanlinga",      lastYearBreakdown: { IG: 10000000, FB: 2000000, X: 1000000, LI: 1000000, YT: 1000000 },  campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "ay",  name: "Adiyogi",         lastYearBreakdown: { IG: 10000000, FB: 5000000, X: 2000000, LI: 2000000, YT: 10000000 }, campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "lb",  name: "Linga Bhairavi",  lastYearBreakdown: { IG: 10000000, FB: 1000000, X: 1000000, LI: 1000000, YT: 2000000 },  campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "cp",  name: "Conscious Planet",lastYearBreakdown: { IG: 10000000, FB: 5000000, X: 5000000, LI: 3000000, YT: 5000000 },  campaign: 1, paid: 0.5, monthlyPlan: [] },
    { id: "soi", name: "Sounds of Isha",  lastYearBreakdown: { IG: 5000000,  FB: 2000000, X: 500000,  LI: 100000,  YT: 15000000 }, campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "it",  name: "Isha Tamil",      lastYearBreakdown: { IG: 8000000,  FB: 10000000,X: 1000000, LI: 100000,  YT: 12000000 }, campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "ih",  name: "Isha Hindi",      lastYearBreakdown: { IG: 7000000,  FB: 8000000, X: 1000000, LI: 100000,  YT: 10000000 }, campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "ite", name: "Isha Telugu",     lastYearBreakdown: { IG: 4000000,  FB: 4000000, X: 500000,  LI: 50000,   YT: 6000000 },  campaign: 0, paid: 0,   monthlyPlan: [] },
    { id: "ik",  name: "Isha Kannada",    lastYearBreakdown: { IG: 2000000,  FB: 2000000, X: 200000,  LI: 20000,   YT: 3000000 },  campaign: 0, paid: 0,   monthlyPlan: [] }
  ]
};
