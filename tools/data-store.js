/* ============================================================
   data-store.js — read/write the site data store
   data/config.json, data/destinations.json, data/listings/*.json
   Used by the Telegram bot and any CLI tooling (seed, tests).
   ============================================================ */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const LIST_DIR = path.join(ROOT, "data", "listings");
const DEST_PATH = path.join(ROOT, "data", "destinations.json");
const CONFIG_PATH = path.join(ROOT, "data", "config.json");
const TEST_PATH = path.join(ROOT, "data", "testimonials.json");
const NOTIF_PATH = path.join(ROOT, "data", "notifications.json");

const iso = () => new Date().toISOString();
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const titleCase = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

function collapse(city, state) {
  if (!state || state === city) return [city];
  const cw = new Set(city.split(" "));
  const sw = new Set(state.split(" "));
  if (cw.has(state)) return [city];
  if (sw.has(city)) return [state];
  return [city, state];
}

function autoKw(name, state) {
  const n = slug(name).replace(/-/g, " ");
  const s = state ? slug(state).replace(/-/g, " ") : "";
  const base = n ? ["best airbnb in " + n, "cheap bnb in " + n, "luxury bnb in " + n, "airbnb " + n] : [];
  if (!s || s === n) return base;
  return base.concat([collapse(n, s).join(" ") + " airbnb", "homestays in " + n]).filter(Boolean);
}

function readConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return {};
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function readDestinations() {
  if (!fs.existsSync(DEST_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(DEST_PATH, "utf8")); } catch (e) { return []; }
}

function writeDestinations(arr) {
  fs.mkdirSync(path.dirname(DEST_PATH), { recursive: true });
  fs.writeFileSync(DEST_PATH, JSON.stringify(arr, null, 2) + "\n");
}

function listListingSlugs() {
  if (!fs.existsSync(LIST_DIR)) return [];
  return fs.readdirSync(LIST_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

function readListing(slugName) {
  const f = path.join(LIST_DIR, slugName + ".json");
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; }
}

function readListingByUrl(url) {
  const id = String(url).match(/\/rooms\/(\d+)/);
  if (!id) return null;
  return listListingSlugs().map(readListing).find((l) => l && l.id === id[1]) || null;
}

function upsertDestination(listing) {
  const city = listing.city || "India";
  const destSlug = slug(city);
  listing.destSlug = destSlug;
  const dests = readDestinations();
  const existing = dests.find((d) => d.slug === destSlug);
  const record = {
    slug: destSlug,
    name: titleCase(city),
    state: listing.state || "",
    tagline: `Best airbnb in ${titleCase(city)}${listing.state ? ", " + listing.state : ""}`,
    keywords: autoKw(city, listing.state),
    created: existing ? existing.created : iso()
  };
  if (existing) Object.assign(existing, record);
  else dests.push(record);
  dests.sort((a, b) => a.name.localeCompare(b.name));
  writeDestinations(dests);
  return destSlug;
}

function removeEmptyDestination(destSlug) {
  const dests = readDestinations();
  const idx = dests.findIndex((d) => d.slug === destSlug);
  if (idx < 0) return;
  const stillUsed = listListingSlugs().some((s) => readListing(s) && (readListing(s).destSlug || slug(readListing(s).city)) === destSlug);
  if (!stillUsed) {
    dests.splice(idx, 1);
    writeDestinations(dests);
  }
}

function saveListing(rawListing) {
  const l = Object.assign({}, rawListing);
  l.listedAt = l.listedAt || iso();
  l.updatedAt = iso();
  l.keywords = l.keywords && l.keywords.length ? l.keywords : autoKw(l.city, l.state);
  l.destSlug = upsertDestination(l);
  fs.mkdirSync(LIST_DIR, { recursive: true });
  fs.writeFileSync(path.join(LIST_DIR, l.slug + ".json"), JSON.stringify(l, null, 2) + "\n");
  return l;
}

function deleteListing(slugName) {
  const f = path.join(LIST_DIR, slugName + ".json");
  if (!fs.existsSync(f)) return null;
  const listing = JSON.parse(fs.readFileSync(f, "utf8"));
  fs.unlinkSync(f);
  removeEmptyDestination(listing.destSlug || slug(listing.city));
  return listing;
}

function regenerate() {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, [path.join(ROOT, "tools", "gen-site.js")], { encoding: "utf8", cwd: ROOT });
  return { code: res.status, stdout: res.stdout || "", stderr: res.stderr || "" };
}

/* ---------- testimonials ---------- */

function readJson(f) {
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return []; }
}

function writeJson(f, arr) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(arr, null, 2) + "\n");
}

function listTestimonials() {
  return readJson(TEST_PATH);
}

function addTestimonial({ name, text, rating, post }) {
  const arr = readJson(TEST_PATH);
  const t = { id: uid("t"), name: String(name || "").trim(), text: String(text || "").trim(), rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)), post: String(post || "").trim(), created: iso() };
  arr.unshift(t);
  writeJson(TEST_PATH, arr);
  return t;
}

function deleteTestimonial(sel) {
  const arr = readJson(TEST_PATH);
  const idx = arr.findIndex((t) => t.id === sel || String(arr.indexOf(t) + 1) === sel);
  if (idx < 0) return null;
  const [removed] = arr.splice(idx, 1);
  writeJson(TEST_PATH, arr);
  return removed;
}

/* ---------- notifications (one-time popup) ---------- */

function listNotifications() {
  return readJson(NOTIF_PATH);
}

function addNotification({ text, link }) {
  const arr = readJson(NOTIF_PATH);
  const n = { id: uid("n"), text: String(text || "").trim(), link: String(link || "").trim(), created: iso() };
  arr.unshift(n);
  writeJson(NOTIF_PATH, arr);
  return n;
}

function deleteNotification(sel) {
  const arr = readJson(NOTIF_PATH);
  const idx = arr.findIndex((n) => n.id === sel || String(arr.indexOf(n) + 1) === sel);
  if (idx < 0) return null;
  const [removed] = arr.splice(idx, 1);
  writeJson(NOTIF_PATH, arr);
  return removed;
}

module.exports = {
  readConfig, readDestinations, writeDestinations, listListingSlugs, readListing, readListingByUrl,
  saveListing, deleteListing, regenerate, autoKw, slug, titleCase,
  listTestimonials, addTestimonial, deleteTestimonial,
  listNotifications, addNotification, deleteNotification
};
