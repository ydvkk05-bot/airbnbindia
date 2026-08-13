/* ============================================================
   airbnb-india.com — Telegram listing bot (zero dependencies)
   Runs anywhere Node 18+ exists (your PC, a VPS, a cron box).
   Long-polls the Telegram Bot API and mutates the data store,
   then regenerates the static site (and optionally git-pushes so
   EdgeOne Pages redeploys automatically).

   Setup:  .env file with
             BOT_TOKEN=123456:ABC...
             ADMIN_ID=123456789          (your Telegram numeric id)
             GIT_AUTOPUSH=1              (optional: commit+push after changes)

   Run:    node bot/bot.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CONFIG = require(path.join(ROOT, "data", "config.json"));
const SITE = CONFIG.siteUrl || "https://airbnb-india.com";

const store = require(path.join(ROOT, "tools", "data-store.js"));
const { fetchListing, isValidAirbnbUrl } = require(path.join(ROOT, "tools", "fetch-listing.js"));

loadEnv();
const TOKEN = process.env.BOT_TOKEN || "";
const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID, 10) : null;

if (!TOKEN) {
  console.error("No BOT_TOKEN set. Create a .env file with BOT_TOKEN=... (and ADMIN_ID=...).");
  process.exit(1);
}

const API = "https://api.telegram.org/bot" + TOKEN;
let offset = 0;

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tg(method, payload) {
  const res = await fetch(API + "/" + method, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.ok) return data.result;
  if (data.error_code === 409) { console.error("409: another bot instance is polling. Stop it first."); process.exit(1); }
  if (data.error_code === 429) { const t = (data.parameters && data.parameters.retry_after) || 3; await sleep(t * 1000); return tg(method, payload); }
  throw new Error("Telegram " + method + ": " + JSON.stringify(data));
}

async function send(chatId, text) {
  return tg("sendMessage", {
    chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true,
    disable_notification: true
  });
}

function isAdmin(userId) {
  if (!ADMIN_ID) return true;
  return userId === ADMIN_ID;
}

const inr = (n) => (n ? "₹" + Number(n).toLocaleString("en-IN") : null);

function listingSummary(l, action) {
  return `✅ <b>${action}</b> — <b>${esc(l.name)}</b>

🏠 ${l.type || "Airbnb"} in ${l.city}${l.state ? ", " + l.state : ""}
⭐ ${l.rating || "—"} · ${l.reviews || 0} reviews
👤 Sleeps ${l.guests || "?"}${l.bedrooms ? " · " + l.bedrooms + " bedrooms" : ""}
💰 ${l.price ? inr(l.price) + " /night" : "Live price on Airbnb"}

🔗 <a href="${l.url}">Open on Airbnb</a>
🌐 ${SITE}/bnbs/${l.slug}.html`;
}

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HELP = `🏠 <b>airbnb-india.com — Listing Bot</b>

Send me Airbnb links and I publish them on the site automatically.

<b>Listings</b>
/listbnb <i>&lt;airbnb link&gt;</i> — add a listing (fetches name, photos, rating, reviews, location automatically)
/update <i>&lt;link or slug&gt;</i> — re-fetch and refresh an existing listing
/delete <i>&lt;link or slug&gt;</i> — remove a listing
/list — show all current listings

<b>Testimonials</b>
/testimonial <i>Name - review text - rating (1-5) - optional post slug/link</i> — add a testimonial to the site
/testimonials — list all testimonials
/deletetestimonial <i>&lt;id&gt;</i> — delete a testimonial

<b>Announcements (one-time popup)</b>
/notification <i>&lt;text&gt;</i> — add an announcement popup (add a link at the end for a button)
/notifications — list all announcements
/deletenotification <i>&lt;id&gt;</i> — delete an announcement

/help — this message

<i>Tip: you can also just paste an airbnb.com/rooms/... link directly.</i>`;

/* ---------- command handlers ---------- */

async function cmdListbnb(chatId, arg) {
  const url = extractUrl(arg);
  if (!url) return send(chatId, "Send an Airbnb listing link with /listbnb, e.g. <code>/listbnb https://www.airbnb.com/rooms/15839408</code>");
  await send(chatId, "⏳ Fetching the listing from Airbnb…");
  try {
    const existing = store.readListingByUrl(url);
    if (existing) return send(chatId, `This listing is already on the site as <code>${existing.slug}</code>. Use <code>/update ${existing.slug}</code> to refresh it.`);
    const res = await fetchListing(url);
    if (!res.ok) return send(chatId, "⚠️ " + esc(res.error));
    const l = store.saveListing(res.listing);
    regenAndPush(`add ${l.slug}`);
    return send(chatId, listingSummary(l, "Listing added"));
  } catch (e) {
    console.error(e);
    return send(chatId, "❌ Could not fetch that listing: " + esc(e.message));
  }
}

async function cmdUpdate(chatId, arg) {
  const existing = findExisting(arg);
  if (!existing) return send(chatId, "No listing matches that link or slug. Check <code>/list</code> or use /listbnb to add it.");
  await send(chatId, "⏳ Re-fetching listing from Airbnb…");
  try {
    const res = await fetchListing(existing.url);
    if (!res.ok) return send(chatId, "⚠️ " + esc(res.error));
    const fresh = Object.assign({}, res.listing, { slug: existing.slug, listedAt: existing.listedAt, destSlug: existing.destSlug });
    store.saveListing(fresh);
    regenAndPush(`update ${fresh.slug}`);
    return send(chatId, listingSummary(fresh, "Listing updated"));
  } catch (e) {
    console.error(e);
    return send(chatId, "❌ Update failed: " + esc(e.message));
  }
}

async function cmdDelete(chatId, arg) {
  const existing = findExisting(arg);
  if (!existing) return send(chatId, "No listing matches that link or slug. Check <code>/list</code>.");
  store.deleteListing(existing.slug);
  regenAndPush(`delete ${existing.slug}`);
  return send(chatId, `🗑️ Removed <b>${esc(existing.name)}</b> (<code>${existing.slug}</code>). The site has been regenerated.`);
}

function cmdList(chatId) {
  const slugs = store.listListingSlugs();
  if (!slugs.length) return send(chatId, "No listings yet. Send /listbnb with an Airbnb link to add your first one.");
  const lines = slugs.map((s) => {
    const l = store.readListing(s);
    return `• <code>${s}</code> — ${esc(l ? l.name : s)}${l && l.price ? " · " + inr(l.price) : ""}`;
  });
  return send(chatId, `<b>Current listings (${slugs.length})</b>\n\n` + lines.join("\n"));
}

/* ---------- testimonials ---------- */

function parseTestimonial(arg) {
  const parts = String(arg).split("-").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const ratingIdx = parts.findIndex((p, i) => i > 0 && /^\d{1,2}$/.test(p) && parseInt(p, 10) >= 1 && parseInt(p, 10) <= 5);
  if (ratingIdx < 1) return null;
  const name = parts[0];
  const rating = parseInt(parts[ratingIdx], 10);
  const text = parts.slice(1, ratingIdx).join(" - ");
  const post = parts.slice(ratingIdx + 1).join("-");
  if (!name || !text) return null;
  return { name, text, rating, post };
}

async function cmdTestimonial(chatId, arg) {
  const t = parseTestimonial(arg);
  if (!t) return send(chatId, "Format: <code>/testimonial Name - Your review here - rating (1-5) - optional post slug or link</code>\nExample: <code>/testimonial Priya - Amazing villa, felt like home - 5 - north-goa-15839408</code>");
  const saved = store.addTestimonial(t);
  regenAndPush("add testimonial " + saved.id);
  return send(chatId, `Added a ${saved.rating}/5 testimonial from <b>${esc(saved.name)}</b>. It is now on the homepage.`);
}

function cmdTestimonials(chatId) {
  const arr = store.listTestimonials();
  if (!arr.length) return send(chatId, "No testimonials yet. Add one with <code>/testimonial Name - review - rating</code>.");
  const lines = arr.map((t) => {
    const s = t.text.length > 55 ? t.text.slice(0, 55) + "…" : t.text;
    return `• <code>${t.id}</code> — <b>${esc(t.name)}</b> (${t.rating}/5): ${esc(s)}`;
  });
  return send(chatId, `<b>Testimonials (${arr.length})</b>\n\n` + lines.join("\n") + `\n\nDelete with <code>/deletetestimonial &lt;id&gt;</code>`);
}

async function cmdDeleteTestimonial(chatId, arg) {
  const sel = String(arg || "").trim();
  if (!sel) {
    const arr = store.listTestimonials();
    if (!arr.length) return send(chatId, "No testimonials to delete.");
    const lines = arr.map((t) => `• <code>${t.id}</code> — <b>${esc(t.name)}</b> (${t.rating}/5)`);
    return send(chatId, `Send <code>/deletetestimonial &lt;id&gt;</code> with one of:\n\n` + lines.join("\n"));
  }
  const removed = store.deleteTestimonial(sel);
  if (!removed) return send(chatId, `No testimonial with id <code>${esc(sel)}</code>. Check /testimonials.`);
  regenAndPush("delete testimonial " + sel);
  return send(chatId, `Testimonial from <b>${esc(removed.name)}</b> deleted.`);
}

/* ---------- notifications (one-time popup) ---------- */

async function cmdNotification(chatId, arg) {
  const raw = String(arg || "").trim();
  if (!raw) return send(chatId, "Usage: <code>/notification Your announcement text</code> — add a link at the end to show a button.");
  const url = extractUrl(raw);
  const text = url ? raw.replace(url, "").trim() : raw;
  if (!text) return send(chatId, "Please add some text before the link.");
  const n = store.addNotification({ text, link: url || "" });
  regenAndPush("add notification " + n.id);
  return send(chatId, `Announcement saved (id <code>${n.id}</code>). Visitors will see it once as a popup. Manage with /notifications and /deletenotification.`);
}

function cmdNotifications(chatId) {
  const arr = store.listNotifications();
  if (!arr.length) return send(chatId, "No announcements yet. Add one with <code>/notification &lt;text&gt;</code>.");
  const lines = arr.map((n) => {
    const s = n.text.length > 60 ? n.text.slice(0, 60) + "…" : n.text;
    return `• <code>${n.id}</code> — ${esc(s)}${n.link ? " (has link)" : ""}`;
  });
  return send(chatId, `<b>Announcements (${arr.length})</b>\n\n` + lines.join("\n") + `\n\nDelete with <code>/deletenotification &lt;id&gt;</code>`);
}

async function cmdDeleteNotification(chatId, arg) {
  const sel = String(arg || "").trim();
  if (!sel) {
    const arr = store.listNotifications();
    if (!arr.length) return send(chatId, "No announcements to delete.");
    const lines = arr.map((n) => {
      const s = n.text.length > 55 ? n.text.slice(0, 55) + "…" : n.text;
      return `• <code>${n.id}</code> — ${esc(s)}`;
    });
    return send(chatId, `Send <code>/deletenotification &lt;id&gt;</code> with one of:\n\n` + lines.join("\n"));
  }
  const removed = store.deleteNotification(sel);
  if (!removed) return send(chatId, `No announcement with id <code>${esc(sel)}</code>. Check /notifications.`);
  regenAndPush("delete notification " + sel);
  return send(chatId, `Announcement deleted. It will no longer pop up for new visitors.`);
}

/* ---------- helpers ---------- */

function extractUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

function findExisting(arg) {
  const text = String(arg || "").trim();
  const url = extractUrl(text);
  if (url) return store.readListingByUrl(url);
  const bySlug = store.readListing(text.replace(/[^a-z0-9-]/gi, ""));
  return bySlug || null;
}

function regenAndPush(log) {
  const r = store.regenerate();
  console.log("regen:", r.code, (r.stdout || "").trim(), (r.stderr || "").trim());
  if (process.env.GIT_AUTOPUSH === "1" && fs.existsSync(path.join(ROOT, ".git"))) {
    try {
      execSync('git add -A && git commit -m "bot: ' + log + '" && git push', { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
      console.log("git push done for:", log);
    } catch (e) {
      console.error("git push failed:", (e.stderr || e.message || "").toString().slice(0, 300));
    }
  }
}

/* ---------- main loop ---------- */

async function handleMessage(msg) {
  const chatId = msg.chat && msg.chat.id;
  const fromId = msg.from && msg.from.id;
  const text = String(msg.text || "").trim();
  if (!text || !chatId) return;

  if (!isAdmin(fromId)) {
    return send(chatId, "Sorry, this bot is private. Only the site owner can add or edit listings.");
  }

  const first = text.split(/\s+/)[0];
  const arg = text.slice(first.length).trim();
  const isUrl = isValidAirbnbUrl(text) && !text.startsWith("/");

  if (text === "/start" || text === "/help" || first === "/help") return send(chatId, HELP);
  if (isUrl || first === "/listbnb") return cmdListbnb(chatId, isUrl ? text : arg);
  if (first === "/update") return cmdUpdate(chatId, arg);
  if (first === "/delete") return cmdDelete(chatId, arg);
  if (first === "/list") return cmdList(chatId);
  if (first === "/testimonial" || first === "/testimonal") return cmdTestimonial(chatId, arg);
  if (first === "/testimonials" || first === "/listtestimonials") return cmdTestimonials(chatId);
  if (first === "/deletetestimonial") return cmdDeleteTestimonial(chatId, arg);
  if (first === "/notifications") return cmdNotifications(chatId);
  if (first === "/notification") return cmdNotification(chatId, arg);
  if (first === "/deletenotification") return cmdDeleteNotification(chatId, arg);
  return send(chatId, HELP);
}

async function poll() {
  let result;
  try {
    result = await tg("getUpdates", { offset, timeout: 30 });
  } catch (e) {
    console.error("poll error:", e.message);
    await sleep(3000);
    return;
  }
  for (const update of result) {
    offset = update.update_id + 1;
    if (update.message && update.message.text) {
      try { await handleMessage(update.message); } catch (e) { console.error("handle error:", e.message); }
    }
  }
}

if (require.main === module) {
  (async () => {
    const me = await tg("getMe");
    console.log("Bot online:", "@" + me.username, ADMIN_ID ? "(admin id " + ADMIN_ID + ")" : "(dev mode — no ADMIN_ID set)");
    for (;;) {
      await poll();
      await sleep(300);
    }
  })().catch((e) => {
    console.error("Fatal:", e.message);
    process.exit(1);
  });
}

module.exports = { cmdListbnb, cmdUpdate, cmdDelete, cmdList, handleMessage, isAdmin, listingSummary, extractUrl, findExisting, send, parseTestimonial };
