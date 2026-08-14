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

/* SEO keyword stop-words stripped from description-derived phrases */
const KW_STOP = new Set("a an and are as at be by for from in is it its of on or that the this to was were with your you our we".split(" "));

/* Generate a rich, search-friendly keyword list from og details, the full
   Airbnb description, amenities and highlights. Falls back to autoKw(). */
function richKeywords(l) {
  const out = [];
  const seen = new Set();
  const city = slug(l.city || "").replace(/-/g, " ");
  const state = l.state ? slug(l.state).replace(/-/g, " ") : "";
  const type = slug(l.type || "").replace(/-/g, " ");
  const name = String(l.name || "").toLowerCase().replace(/\s+/g, " ").trim();
  const text = String(l.ogDescription || "").toLowerCase() + " " + String(l.description || "").toLowerCase();
  const push = (k) => {
    k = String(k || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (k && k.length > 2 && !seen.has(k)) { seen.add(k); out.push(k); }
  };

  /* base location phrases */
  autoKw(city, state).forEach(push);

  /* og:title e.g. "Bungalow in Goa · ★4.93 · 3 bedrooms · 3 beds · 4 bathrooms" */
  const ogTitle = String(l.ogTitle || "");
  const ogLead = ogTitle.split("·")[0].trim().toLowerCase();
  if (ogLead) push(ogLead + " india");
  const ogType = ogLead.replace(/\s+in\s+.*$/, "").trim();
  if (ogType && city) { push(ogType + " in " + city); push("airbnb " + ogType + " in " + city); }
  const bedM = ogTitle.match(/(\d+)\s+bedrooms?/i); if (bedM) push(bedM[0].toLowerCase() + " " + (type || "bnb") + " " + city);
  const starM = ogTitle.match(/★\s*([\d.]+)/); if (starM) push(starM[1] + " rated airbnb " + city);

  /* guest-review signals are high-value — keep them near the top */
  if (l.isGuestFavorite && city) { push("guest favorite airbnb " + city); push("most loved airbnb " + city); }
  if (l.qualityPercentile) { push(l.qualityPercentile.toLowerCase() + " airbnb " + city); push("top rated airbnb " + city); }
  for (const c of (l.reviewCategories || []).slice(0, 4)) {
    const label = String(c.label || "").toLowerCase().replace(/[^\w\s]/g, " ").trim();
    if (label && c.rating >= 4.9) push(c.rating + " " + label + " " + city);
  }

  /* type + location */
  if (type && city) {
    push(type + " in " + city);
    push("airbnb " + type + " in " + city);
    push("book " + type + " in " + city);
    if (state) push(type + " " + city + " " + state);
  }

  /* name-based long-tails: "3 bhk luxury beach villa candolim" */
  if (name) {
    const words = name.replace(/[^\w\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !KW_STOP.has(w));
    if (words.length) {
      push(words.slice(0, 5).join(" "));
      if (city) push(words.slice(0, 4).join(" ") + " in " + city);
      if (state) push(words.slice(0, 4).join(" ") + " " + state);
      const bh = name.match(/(\d+)\s*(?:bhk|br|bedroom)/i);
      if (bh) { push(bh[0].toLowerCase() + " " + (type || "villa") + " " + city); push(bh[0].toLowerCase() + " " + (type || "villa") + " in " + city); }
    }
  }

  /* phrases from amenities: "shared pool goa", "beachfront villa goa" */
  const amenPhrases = (l.amenities || []).map((a) => String(a).toLowerCase().replace(/[–—]/g, " ").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const a of amenPhrases.slice(0, 12)) {
    push(a + " " + city);
    if (type) push(a + " " + type + " " + city);
  }

  /* content keywords from description/ogDescription: pick 2-3 word noun phrases */
  const tokens = text.replace(/[^\w\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !KW_STOP.has(w));
  const phrases = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const p2 = tokens[i] + " " + tokens[i + 1];
    if (!KW_STOP.has(tokens[i]) && !KW_STOP.has(tokens[i + 1]) && p2.length > 8 && !phrases.includes(p2)) phrases.push(p2);
    if (i < tokens.length - 2) {
      const p3 = p2 + " " + tokens[i + 2];
      if (!KW_STOP.has(tokens[i + 2]) && p3.length > 14 && !phrases.includes(p3)) phrases.push(p3);
    }
  }
  for (const p of phrases.slice(0, 10)) {
    push(p);
    if (city) push(p + " " + city);
  }

  /* highlights are short marketing blurbs — keep as-is, city-qualified */
  for (const h of (l.highlights || []).slice(0, 3)) {
    const k = String(h).split(/[—–]/)[0].trim().toLowerCase();
    if (k && k.length > 4) { push(k); push(k + " " + city); }
  }

  /* dedupe, cap at 30 */
  const unique = [];
  for (const k of out) if (!unique.includes(k)) unique.push(k);
  return unique.slice(0, 30);
}

/* keywordsFor: stored manual keywords win, enriched by auto-generated ones */
function keywordsFor(l) {
  const auto = richKeywords(l);
  const manual = Array.isArray(l.keywords) ? l.keywords.map((k) => String(k).toLowerCase().trim()).filter(Boolean) : [];
  const merged = [];
  const seen = new Set();
  for (const k of manual.concat(auto)) {
    if (k && !seen.has(k)) { seen.add(k); merged.push(k); }
  }
  return merged.slice(0, 30);
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
  l.keywords = keywordsFor(l);
  l.destSlug = upsertDestination(l);
  fs.mkdirSync(LIST_DIR, { recursive: true });
  fs.writeFileSync(path.join(LIST_DIR, l.slug + ".json"), JSON.stringify(l, null, 2) + "\n");
  return l;
}

function saveHostDetails(slugName, host) {
  const l = readListing(slugName);
  if (!l) return null;
  l.host = String(host.name || "").trim() || l.host;
  l.hostWhatsapp = String(host.whatsapp || "").trim();
  l.hostPhone = String(host.phone || "").trim();
  l.hostEmail = String(host.email || "").trim();
  l.updatedAt = iso();
  fs.writeFileSync(path.join(LIST_DIR, l.slug + ".json"), JSON.stringify(l, null, 2) + "\n");
  return l;
}

function deleteListing(slugName) {
  const f = path.join(LIST_DIR, slugName + ".json");
  if (!fs.existsSync(f)) return null;
  const listing = JSON.parse(fs.readFileSync(f, "utf8"));
  fs.unlinkSync(f);
  /* remove the generated BNB page + blog post for this listing too */
  for (const rel of ["bnbs/" + slugName + ".html", "blog/" + slugName + ".html"]) {
    try { fs.rmSync(path.join(ROOT, rel), { force: true }); } catch (e) { /* best-effort */ }
  }
  removeEmptyDestination(listing.destSlug || slug(listing.city));
  return listing;
}

function regenerate() {
  const { spawnSync } = require("child_process");
  const res = spawnSync(process.execPath, [path.join(ROOT, "tools", "gen-site.js")], {
    encoding: "utf8", cwd: ROOT, timeout: 90000, killSignal: "SIGTERM"
  });
  const err = (res.error ? String(res.error.message || res.error) : "") + (res.stderr || "");
  return { code: res.status, stdout: res.stdout || "", stderr: err.trim() };
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
  saveListing, deleteListing, saveHostDetails, regenerate, autoKw, richKeywords, keywordsFor, slug, titleCase,
  listTestimonials, addTestimonial, deleteTestimonial,
  listNotifications, addNotification, deleteNotification
};
