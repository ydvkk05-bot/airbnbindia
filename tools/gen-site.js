/* ============================================================
   airbnb-india.com — full static site generator (data-driven)
   Reads data/config.json + data/destinations.json + every
   data/listings/*.json and generates the whole site:
   index, destinations (auto), BNB detail pages (auto), blog
   (per-listing details + best/cheap/luxury tier guides), legal,
   robots + sitemap. Also regenerates js/data.js (client search).

   Usage: node tools/gen-site.js
   ============================================================ */
const fs = require("fs");
const path = require("path");
const { u } = require("./images.js");
const { keywordsFor } = require("./data-store.js");

const ROOT = path.join(__dirname, "..");
const CONFIG = require(path.join(ROOT, "data", "config.json"));
const SITE = CONFIG.siteUrl;
const EMAIL = CONFIG.email;
const PHONE = CONFIG.phone;
const WA = "https://wa.me/" + String(CONFIG.phoneLink || CONFIG.phone || "").replace(/[^0-9]/g, "") + "?text=" + encodeURIComponent("Hi! I'd like to list my BNB on airbnb-india.com.");
const AUTHOR = CONFIG.author || "airbnb-india.com editors";

const DEST_PATH = path.join(ROOT, "data", "destinations.json");
const TEST_PATH = path.join(ROOT, "data", "testimonials.json");
const NOTIF_PATH = path.join(ROOT, "data", "notifications.json");
const DESTINATIONS = fs.existsSync(DEST_PATH) ? (require(DEST_PATH) || []) : [];
const LISTINGS = loadListings();
const TESTIMONIALS = fs.existsSync(TEST_PATH) ? (require(TEST_PATH) || []) : [];
const NOTIFICATIONS = fs.existsSync(NOTIF_PATH) ? (require(NOTIF_PATH) || []) : [];

const TIERS = ["best", "cheap", "luxury"];
const TIER_EMOJI = { best: "★", cheap: "₹", luxury: "◆" };
const TIER_LABEL = { best: "Best", cheap: "Cheap", luxury: "Luxury" };

const write = (rel, html) => fs.writeFileSync(path.join(ROOT, rel), html);
const inr = (n) => (n ? "₹" + Number(n).toLocaleString("en-IN") : null);
const priceFlag = (n) => (n ? inr(n) + "/night" : "Live price");
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return today().replace(/^\d{4}-(\d{2})-(\d{2})$/, "$2/$1");
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};
const fmtDateIso = (iso) => {
  if (!iso) return today();
  const d = new Date(iso);
  return isNaN(d) ? today() : d.toISOString().slice(0, 10);
};
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const firstN = (l) => DESTINATIONS.find((d) => d.slug === (l.destSlug || slug(l.city)));

function loadListings() {
  const dir = path.join(ROOT, "data", "listings");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch (e) { return null; } })
    .filter(Boolean)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
}

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const collapse = (city, state) => {
  if (!state || state === city) return [city];
  const cw = new Set(city.split(" "));
  const sw = new Set(state.split(" "));
  if (cw.has(state)) return [city];
  if (sw.has(city)) return [state];
  return [city, state];
};

const autoKw = (name, state) => {
  const n = slug(name).replace(/-/g, " ");
  const s = state ? slug(state).replace(/-/g, " ") : "";
  const base = n ? ["best airbnb in " + n, "cheap bnb in " + n, "luxury bnb in " + n, "airbnb " + n] : [];
  if (!s || s === n) return base;
  return base.concat([collapse(n, s).join(" ") + " airbnb", "homestays in " + n]).filter(Boolean);
};

const destImg = (d) => {
  const first = listingsOf(d.slug)[0];
  if (first && first.cover) return first.cover;
  try { return u(d.slug, 800, 550); } catch (e) { return u("house-exterior", 800, 550); }
};

function blurb(l) {
  const raw = l.ogDescription || l.description || "";
  let s = raw.split(/\n+/)[0].trim();
  if (s.length <= 90 && (/\|/.test(s) || /(?:^| )VILLA|Luxury 1 bedroom|VILLA with/i.test(s))) s = cleanName(s);
  if (s.length > 150) { s = s.slice(0, 147).replace(/\s+\S*$/, "") + "…"; }
  return s || `A handpicked ${(l.type || "Airbnb").toLowerCase()} in ${l.city}${l.state ? ", " + l.state : ""} — verified on Airbnb and ready to book.`;
}

/* Format a raw Airbnb description into clean, structured HTML paragraphs.
   Splits by Airbnb section markers, removes registration details and
   outdated COVID text, and returns an array of paragraph strings. */
function formatDescription(l) {
  let raw = String(l.description || "").trim();
  if (!raw) return [blurb(l)];

  /* Clean up first */
  raw = raw
    .replace(/Registration details?\s*\w+/gi, "")
    .replace(/\(Due to the prevailing Covid-19 situation[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  /* Split by section markers — both on their own line and inline */
  const sectionParts = raw.split(/\b(The space|Guest access|Other things to note|Interaction with guests)\s*/i);
  const sections = [];
  let i = 0;

  while (i < sectionParts.length) {
    const part = sectionParts[i].trim();
    const isMarker = /^(The space|Guest access|Other things to note|Interaction with guests)$/i.test(part);

    if (isMarker) {
      /* This is a section header — the next part is the content */
      const content = (sectionParts[i + 1] || "").trim();
      if (content) sections.push(content);
      i += 2;
    } else if (part) {
      /* This is the intro text (before any marker) */
      sections.push(part);
      i++;
    } else {
      i++;
    }
  }

  if (sections.length === 0) return [blurb(l)];

  return sections
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 10)
    .slice(0, 5);
}

/* Rich meta description for BNB pages — keyword-rich, location-specific, ≤158 chars. */
function bnbMetaDesc(l) {
  const type = (l.type || "Airbnb").toLowerCase();
  const loc = l.city + listStateSuffix(l);
  const parts = [];
  if (l.name) parts.push(cleanName(l.name));
  parts.push(`${type} in ${loc}`);
  if (l.price) parts.push(`from ${inr(l.price)}/night`);
  if (l.rating) parts.push(`★ ${l.rating} (${l.reviews || 0} reviews)`);
  if (l.highlights && l.highlights.length) parts.push(l.highlights[0]);
  let desc = parts.join(" — ");
  if (desc.length > 158) desc = desc.slice(0, 155).replace(/\s+\S*$/, "") + "…";
  return desc;
}

/* Truncate a string at a word boundary to at most `max` chars (Google displays
   ~60 title / ~160 description chars; longer ones get cut in SERPs). */
function fit(str, max) {
  str = String(str || "").replace(/\s+/g, " ").trim();
  if (str.length <= max) return str;
  const cut = str.slice(0, max - 1).replace(/\s+\S*$/, "");
  return cut.length ? cut + "…" : str.slice(0, max - 1) + "…";
}

/* SEO title: keep the primary phrase whole, append the brand only when it fits,
   and gracefully drop/truncate a secondary phrase instead of the primary. */
function seoTitle(primary, secondary) {
  const brand = " | airbnb-india.com";
  const max = 60;
  let t = secondary ? `${primary} — ${secondary}` : primary;
  if (t.length + brand.length <= max) return t + brand;
  if (t.length <= max) return t;
  if (secondary) {
    const room = max - primary.length - 3;
    if (room >= 15) {
      t = `${primary} — ${fit(secondary, room)}`;
      if (t.length + brand.length <= max) return t + brand;
      return t;
    }
    t = primary;
    if (t.length + brand.length <= max) return t + brand;
    return t;
  }
  return fit(t, max);
}

/* "Entire home in Lucknow, Uttar Pradesh" (dedupes the "Goa, Goa" case). */
function locStr(l, includeType = true) {
  const state = l.state && l.state.toLowerCase() !== String(l.city).toLowerCase() ? ", " + l.state : "";
  return `${includeType && l.type ? l.type + " in " : ""}${l.city}${state}`;
}
const destStateSuffix = (d) => d.state && d.state.toLowerCase() !== d.name.toLowerCase() ? ", " + d.state : "";
const listStateSuffix = (l) => l.state && l.state.toLowerCase() !== l.city.toLowerCase() ? ", " + l.state : "";

/* Display name: clean raw host-entered Airbnb names for a professional look.
   "The Yellow House |Luxury 3bhk Villa in Gomti Nagar" -> "The Yellow House — Luxury 3bhk Villa in Gomti Nagar"
   "Luxury 1 bedroom VILLA with private pool & garden." -> "Luxury 1 Bedroom Villa with Private Pool & Garden" */
function cleanName(raw) {
  let n = String(raw || "").replace(/\s+/g, " ").trim();
  if (!n) return n;
  n = n.replace(/\s*\|\s*/g, " — ").replace(/\s+—\s+/g, " — ");
  n = n.replace(/[.,]+$/g, "");
  const small = new Set("a an the and or but of in on with to for at by from up down near via".split(" "));
  const words = n.split(" ");
  n = words.map((w, i) => {
    if (/^\d+$/.test(w)) return w;
    if (/\d/.test(w) && /^[0-9]+[a-z]+$/i.test(w)) return w;
    const low = w.toLowerCase();
    if (i !== 0 && i !== words.length - 1 && small.has(low)) return low;
    if (w === w.toUpperCase() && w.length > 1 && /^[A-Z&.'-]+$/.test(w)) return low.charAt(0).toUpperCase() + low.slice(1);
    if (w !== w.toLowerCase() && w !== w.toUpperCase()) return w;
    return low.charAt(0).toUpperCase() + low.slice(1);
  }).join(" ");
  return n.replace(/\s+—\s+/g, " — ").trim();
}

const listingsOf = (destSlug) => LISTINGS.filter((l) => (l.destSlug || slug(l.city)) === destSlug);
const destBySlug = (s) => DESTINATIONS.find((d) => d.slug === s);

/* destination keywords: base phrases + every listing's rich keywords */
function destKeywords(d) {
  const base = (d.keywords && d.keywords.length ? d.keywords : autoKw(d.name, d.state)).map((k) => String(k).toLowerCase().trim());
  const seen = new Set(base);
  for (const l of listingsOf(d.slug)) {
    for (const k of keywordsFor(l)) if (!seen.has(k)) { seen.add(k); base.push(k); }
  }
  return base.slice(0, 30);
}

const tierListings = (loc, tier) => {
  const arr = loc.slice();
  if (tier === "cheap") arr.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
  else if (tier === "luxury") arr.sort((a, b) => (b.price || 0) - (a.price || 0));
  else arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return arr;
};

const tierOf = (l) => (l.price == null ? "Mid-range" : l.price >= 4000 ? "Luxury" : l.price <= 2000 ? "Budget" : "Mid-range");

/* Auto-generate FAQs for a listing — used for FAQPage schema + on-page FAQ. */
function autoFaq(l) {
  const loc = l.city + listStateSuffix(l);
  const type = (l.type || "Airbnb").toLowerCase();
  const faqs = [
    { q: `How much does this ${type} cost in ${l.city}?`,
      a: `This ${type} in ${loc} starts from ${l.price ? inr(l.price) + " per night" : "varies by date"}. Prices may be lower on weekdays or off-season.` },
    { q: `What is the guest rating for this stay?`,
      a: `This stay has a ${l.rating || "—"} star rating based on ${l.reviews || 0} guest reviews on Airbnb.${l.isGuestFavorite ? " It is a Guest Favourite." : ""}` },
    { q: `How many guests does this ${type} accommodate?`,
      a: `This stay accommodates ${l.guests || "up to the number of guests listed"} guests with ${l.bedrooms || 1} bedroom${l.bedrooms !== 1 ? "s" : ""}${l.baths ? " and " + l.baths + " bathroom" + (l.baths !== 1 ? "s" : "") : ""}.` },
    { q: `Where exactly is this Airbnb located?`,
      a: `This ${type} is located in ${l.city}${l.state ? ", " + l.state : ""}, India${l.area ? " — " + l.area + " area" : ""}.` },
    { q: `How do I book this ${type} in ${l.city}?`,
      a: `Click "Check Price on Airbnb" to view live availability, full pricing (including fees) and book securely on Airbnb with guest protection.` }
  ];
  if (l.amenities && l.amenities.length >= 2) {
    faqs.push({
      q: `What amenities does this ${type} offer?`,
      a: `Key amenities include ${l.amenities.slice(0, 5).join(", ")}${l.amenities.length > 5 ? " and more" : ""}.`
    });
  }
  return faqs;
}

/* ---------- content helpers (auto-copy per destination) ---------- */

function destContent(d) {
  const beach = ["goa", "kerala", "puducherry", "andaman and nicobar islands", "daman and diu", "karnataka"].includes(slug(d.state));
  const hill = ["himachal pradesh", "uttarakhand", "west bengal", "sikkim", "jammu and kashmir"].includes(slug(d.state));
  const vibe = beach ? "coast" : hill ? "mountains" : "heart of India";
  const loc = listingsOf(d.slug);
  return {
    heroLead: `Find the best airbnb in ${d.name}${destStateSuffix(d)} — handpicked homestays, villas and boutique stays with live Airbnb links, honest reviews and real prices.`,
    intro: `${d.name}${d.state ? " in " + d.state : ""} is one of the most loved corners of ${d.state === "Goa" ? "India" : "the country"} for a reason. Travellers come for the ${vibe === "coast" ? "laid-back beach life, seafood and sunsets" : vibe === "mountains" ? "fresh mountain air, pine forests and dramatic views" : "culture, heritage and welcoming local hosts"}, and stay for the hospitality. Airbnb has turned private homes, heritage havelis and modern villas into some of the best places to sleep here.\n\nWe pick every stay you see below the way you would: verified listings, strong ratings, fair prices and hosts who actually care. No paid placement, no sponsored noise — just the best airbnb in ${d.name}${loc.length ? `, checked and linked live` : ""}.`,
    bestTime: `The best time to visit ${d.name} is ${beach ? `October to March, when the ${d.name} coast is warm, dry and lively` : hill ? `October to June, when the skies are clear and the ${d.name} weather is pleasant` : "October to March"}. Weekends and school holidays book out fast, so reserve early if you plan to stay on a popular long weekend.`,
    howToReach: `Fly or take a train to ${d.name}'s nearest hub, then a short taxi, auto or local bus gets you into town. Most ${d.name} hosts send precise directions after you book. If you drive, most of our listed stays offer parking — check each listing for details.`,
    faqs: [
      { q: `What is the best airbnb in ${d.name}?`, a: `The stays we feature on this ${d.name} page are the best we can find on Airbnb right now — chosen for rating, reviews, location and value. Browse the cards below or use the best/cheap/luxury guides in the blog for focused picks.` },
      { q: `How much does an airbnb in ${d.name} cost?`, a: `It depends on the season and the type of stay. You will typically find ${d.name} homestays from around ₹1,500 a night, comfortable mid-range villas between ₹2,000 and ₹4,000, and luxury properties above that. Always confirm the live price on Airbnb.` },
      { q: `How do I book a stay in ${d.name}?`, a: `Click "Book on Airbnb" on any listing card. You land on the official Airbnb listing for ${d.name}, pick your dates and complete a secure, protected booking — payment, cancellation and guest protection are handled by Airbnb.` },
      { q: `Is it safe to book through airbnb-india.com?`, a: `Yes. We never take payment. Every link points to Airbnb's own listing and booking flow, so your stay is covered by Airbnb's verification, secure payments and guest refund policy.` }
    ]
  };
}

/* ---------- client data (js/data.js) ---------- */

function clientData() {
  const D = DESTINATIONS.map((d) => {
    const loc = listingsOf(d.slug);
    return {
      slug: d.slug, name: d.name, state: d.state,
      tagline: d.tagline || `Best airbnb in ${d.name}${destStateSuffix(d)}`,
      img: destImg(d),
      url: `destinations/${d.slug}.html`,
      count: loc.length,
      keywords: destKeywords(d)
    };
  });
  const L = LISTINGS.map((l) => ({
    slug: l.slug, name: cleanName(l.name), city: l.city, state: l.state, type: l.type,
    price: l.price, rating: l.rating, reviews: l.reviews,
    img: l.cover, url: `bnbs/${l.slug}.html`, blurb: blurb(l),
    keywords: keywordsFor(l)
  }));
  const P = buildPosts().map((p) => ({
    slug: p.slug, title: p.title, category: p.category, img: p.img,
    url: p.url, date: p.date, excerpt: p.excerpt, keywords: p.keywords
  }));
  const T = TESTIMONIALS.map((t) => ({ id: t.id, name: t.name, text: t.text, rating: t.rating, post: t.post }));
  const N = NOTIFICATIONS.map((n) => ({ id: n.id, text: n.text, link: n.link }));
  fs.writeFileSync(path.join(ROOT, "js", "data.js"),
`/* ============================================================
   airbnb-india.com — Site Data (search index)
   Auto-generated by tools/gen-site.js — do not edit by hand.
   ============================================================ */

const DESTINATIONS = ${JSON.stringify(D, null, 2)};

const LISTINGS = ${JSON.stringify(L, null, 2)};

const POSTS = ${JSON.stringify(P, null, 2)};

const TESTIMONIALS = ${JSON.stringify(T, null, 2)};

const NOTIFICATIONS = ${JSON.stringify(N, null, 2)};

if (typeof window !== 'undefined') window.AIRBNB_INDIA_DATA = { destinations: DESTINATIONS, listings: LISTINGS, posts: POSTS, testimonials: TESTIMONIALS, notifications: NOTIFICATIONS };
if (typeof module !== 'undefined' && module.exports) module.exports = { DESTINATIONS, LISTINGS, POSTS, TESTIMONIALS, NOTIFICATIONS };
`);
}

/* ---------- posts ---------- */

function buildPosts() {
  const posts = [];
  for (const d of DESTINATIONS) {
    const loc = listingsOf(d.slug);
    if (!loc.length) continue;
    for (const t of TIERS) posts.push(tierPostObj(d, t, loc));
  }
  for (const l of LISTINGS) posts.push(detailsPostObj(l));
  return posts;
}

function tierPostObj(d, tier, loc) {
  const sorted = tierListings(loc, tier);
  const top = sorted[0];
  const n = loc.length;
  const priceLine = tier === "cheap" ? "under ₹2,000 per night" : tier === "luxury" ? "₹4,000+ per night" : "every budget";
  const topTitle = top ? blogTitle(top) : "";
  const topShort = topTitle.replace(/\s*\(\d{4}\)\s*$/, "").replace(/\s+in\s+.+$/, "").trim();
  const title = tier === "best" ? `Best Airbnb in ${d.name} (2026): Top-Rated Stays & Prices`
    : tier === "cheap" ? `Cheap Airbnbs in ${d.name}: ${n} Stays Under ₹2,000`
    : topShort ? `${topShort} & More — Luxury Airbnbs in ${d.name}` : `Luxury Airbnbs in ${d.name}: Premium Villas & Private Pools`;
  const topName = top ? cleanName(top.name) : "";
  const topPrice = top && top.price ? `Starting at ${inr(top.price)}/night` : "Live pricing on Airbnb";
  const topRating = top && top.rating ? `★ ${top.rating} rating` : "";
  const tierLabel = tier === "best" ? "top-rated" : tier === "cheap" ? "budget-friendly" : "luxury";
  const excerpt = tier === "best"
    ? `${n} handpicked, top-rated Airbnb ${n === 1 ? "stay" : "stays"} in ${d.name}${destStateSuffix(d)}. ${topName} leads the list — ${topPrice}${topRating ? " · " + topRating : ""}. Real prices, real reviews, one-click booking on Airbnb.`
    : tier === "cheap"
    ? `${n} affordable Airbnb ${n === 1 ? "stay" : "stays"} in ${d.name}${destStateSuffix(d)}, all under ₹2,000 per night. ${topName ? topName + " — from " + (top.price ? inr(top.price) + "/night" : "live pricing") + "." : ""} Every pick is verified, reviewed and bookable directly on Airbnb.`
    : `${n} luxury Airbnb ${n === 1 ? "stay" : "stays"} in ${d.name}${destStateSuffix(d)} — private pools, premium villas and designer homes. ${topName ? topName + " from " + (top.price ? inr(top.price) + "/night" : "live pricing") + "." : ""} Verified listings with real photos and guest reviews on Airbnb.`;
  return {
    slug: `${tier}-airbnb-in-${d.slug}`,
    title,
    category: TIER_LABEL[tier],
    img: top && top.cover ? top.cover : destImg(d),
    url: `blog/${tier}-airbnb-in-${d.slug}.html`,
    date: fmtDate(top && top.listedAt) || fmtDate(today()),
    isoDate: fmtDateIso(top && top.listedAt),
    excerpt,
    keywords: autoKw(d.name, d.state),
    tier, d, listings: sorted, priceLine
  };
}

function detailsPostObj(l) {
  const title = blogTitle(l);
  const type = (l.type || "Airbnb").toLowerCase();
  const loc = l.city + listStateSuffix(l);
  const features = extractFeatures(l);
  const parts = [
    `${cleanName(l.name)} — a verified ${type} in ${loc}`,
    l.price ? `Starting from ${inr(l.price)} per night` : null,
    l.rating ? `Rated ${l.rating}/5 by ${l.reviews || 0} guests` : null,
    l.guests ? `Sleeps ${l.guests} guests` : null,
    features.length ? `Featuring ${features.slice(0, 3).join(", ").toLowerCase()}` : null
  ].filter(Boolean);
  return {
    slug: l.slug,
    title,
    category: "Listed BNB",
    img: l.cover,
    url: `blog/${l.slug}.html`,
    date: fmtDate(l.listedAt),
    isoDate: fmtDateIso(l.listedAt),
    excerpt: parts.join(". ") + ". Book directly on Airbnb with guest protection.",
    keywords: keywordsFor(l),
    listing: l
  };
}

/* ---------- shared templates ---------- */

function head({ title, desc, canonical, image, jsonld = [], ogType = "website", keywords = "", dateModified = "" }) {
  const relPath = canonical.replace(SITE, "");
  const isSub = relPath.startsWith("/destinations/") || relPath.startsWith("/bnbs/") || relPath.startsWith("/blog/");
  const prefix = isSub ? "../" : "";
  const ld = jsonld.map((j) => `<script type="application/ld+json">\n${JSON.stringify(j, null, 2)}\n</script>`).join("\n  ");
  /* Fix SVG OG images — most platforms don't support SVG for social previews */
  const OG_FALLBACK = SITE + "/img/og-default.jpg";
  const ogImage = image && image.endsWith(".svg") ? OG_FALLBACK : image;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0b2b26">
  ${keywords ? `<meta name="keywords" content="${keywords}">` : ""}
  ${dateModified ? `<meta property="article:modified_time" content="${dateModified}">` : ""}
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/svg+xml" href="${prefix}favicon.svg">
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="preload" as="image" href="${image}">
  <link rel="stylesheet" href="${prefix}css/style.css">
  ${ld}
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  ${header(canonical)}
  `;
}

function header(canonical) {
  const p = canonical.replace(SITE, "");
  const root = p === "/" || p === "/index.html" ? "" : p.startsWith("/destinations/") || p.startsWith("/bnbs/") || p.startsWith("/blog/") ? "../" : "";
  const isActive = (name) => {
    const cur = p.split("/")[1] || "index";
    if (name === "index") return cur === "index" || cur === "";
    return cur === name;
  };
  return `<header class="site-header">
    <div class="container header-inner">
      <a class="logo" href="${root}index.html" aria-label="airbnb-india.com home">
        <span class="logo-badge"><img src="${root}img/logo.svg" alt="airbnb-india.com — Airbnb India logo" width="24" height="24"></span>
        airbnb-india<span class="dot">.com</span>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        <a href="${root}index.html"${isActive("index") ? " class=\"active\"" : ""}>Home</a>
        <a href="${root}destinations.html"${isActive("destinations") ? " class=\"active\"" : ""}>Destinations</a>
        <a href="${root}bnbs.html"${isActive("bnbs") ? " class=\"active\"" : ""}>BNBs</a>
        <a href="${root}blog/index.html"${isActive("blog") ? " class=\"active\"" : ""}>Blog</a>
        <a href="${root}contact.html"${isActive("contact") ? " class=\"active\"" : ""}>Contact</a>
        <a class="btn btn-primary nav-cta" href="${root}contact.html">List Your BNB</a>
      </nav>
      <button class="nav-toggle" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button>
    </div>
  </header>`;
}

function footer(root = "") {
  const destLinks = DESTINATIONS.slice(0, 6).map((d) => `<a href="${root}destinations/${d.slug}.html">${d.name} BNBs</a>`).join("\n");
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="logo" href="${root}index.html"><span class="logo-badge"><img src="${root}img/logo.svg" alt="airbnb-india.com — Airbnb India logo" width="24" height="24"></span> airbnb-india<span class="dot">.com</span></a>
          <p>India's friendliest guide to bed &amp; breakfasts, homestays, villas, houseboats and boutique stays across every state. Discover, compare and book through Airbnb.</p>
        </div>
        <div class="footer-col">
          <h4>Destinations</h4>
          ${destLinks}
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <a href="${root}destinations.html">All Destinations</a>
          <a href="${root}bnbs.html">All BNBs</a>
          <a href="${root}blog/index.html">Blog</a>
          <a href="${root}about.html">About Us</a>
          <a href="${root}contact.html">Contact</a>
        </div>
        <div class="footer-col">
          <h4>Contact Us</h4>
          <ul class="footer-contact">
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg><a href="mailto:${EMAIL}">${EMAIL}</a></li>
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2Z"/></svg><a href="tel:+919336076006">${PHONE}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© <span data-year>2026</span> airbnb-india.com · All rights reserved. Not affiliated with Airbnb, Inc.</span>
        <span><a href="${root}privacy.html">Privacy Policy</a> · <a href="${root}terms.html">Terms of Use</a></span>
      </div>
    </div>
  </footer>

  <button class="back-top" aria-label="Back to top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
  <div class="toast" role="status" aria-live="polite"></div>

  <script src="${root}js/data.js"></script>
  <script src="${root}js/main.js"></script>
</body>
</html>`;
}

const tail = (root = "") => footer(root);

/* ---------- card components ---------- */

function starIcon() { return '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M12 2l2.9 6.26 6.6.7-4.9 4.5 1.3 6.5L12 16.9 6.1 20l1.3-6.5L2.5 9l6.6-.7L12 2z"/></svg>'; }
function pinIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'; }

function testiCard(t) {
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<svg viewBox="0 0 24 24" fill="${i < (t.rating || 5) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1"><path d="M12 2l2.9 6.26 6.6.7-4.9 4.5 1.3 6.5L12 16.9 6.1 20l1.3-6.5L2.5 9l6.6-.7L12 2z"/></svg>`
  ).join("");
  let post = "";
  if (t.post) {
    if (/^https?:\/\//i.test(t.post)) post = `<a href="${esc(t.post)}" target="_blank" rel="noopener">${esc(t.post)}</a>`;
    else post = `<a href="bnbs/${esc(t.post.replace(/\.html$/, ""))}.html">${esc(t.post)}</a>`;
  }
  return `<div class="testi-card reveal">
    <div class="testi-stars">${stars}</div>
    <p class="testi-text">“${esc(t.text)}”</p>
    <div class="testi-meta"><strong>${esc(t.name)}</strong><span>${post ? "About: " + post : "Verified traveller"}</span></div>
  </div>`;
}

function destCard(d, p = "") {
  const loc = listingsOf(d.slug);
  return `<a class="dest-card reveal" href="${p}destinations/${d.slug}.html" aria-label="Best Airbnb in ${d.name} — ${d.tagline || "handpicked stays"}">
    <span class="dest-art"><img src="${destImg(d)}" alt="Best airbnb in ${d.name}${destStateSuffix(d)} — ${d.tagline || "handpicked stays"}" loading="lazy"></span>
    <span class="dest-overlay"><h3>${d.name}</h3><p>${d.tagline || `Best airbnb in ${d.name}${destStateSuffix(d)}`}</p></span>
    <span class="dest-count">${loc.length} stays</span>
  </a>`;
}

/* Generate a proper SEO-friendly blog post title from listing data.
   Combines property type, bedrooms, key features and location into a
   natural title like "Luxury 1BHK Villa with Private Pool in Benaulim (2026)" */
function blogTitle(l) {
  const features = extractFeatures(l);
  const bedrooms = l.bedrooms ? l.bedrooms + "BHK" : "";
  const type = (l.type || "").replace(/^entire\s*/i, "").trim() || "Stay";
  const loc = l.city + (l.state && l.state.toLowerCase() !== l.city.toLowerCase() ? ", " + l.state : "");
  const year = new Date().getFullYear();

  /* Pick the most important feature for the title — prioritise high-value features */
  const featPriority = ["pool", "chef", "beach", "sea view", "luxury", "garden", "heritage", "wifi", "view", "parking"];
  const topFeat = featPriority.reduce((best, kw) => {
    const found = features.find((f) => f.toLowerCase().includes(kw));
    return found && !best ? found : best;
  }, "") || features[0] || "";
  const featPart = topFeat ? topFeat.toLowerCase() : "";

  /* Build: "1BHK Heritage Villa with Private Pool in Benaulim (2026)" */
  const parts = [bedrooms, type, featPart ? "with " + featPart : "", "in", loc, "(" + year + ")"].filter(Boolean);
  let title = parts.join(" ");

  /* Ensure ≤ 65 chars for SEO, trim if needed */
  if (title.length > 65) {
    title = [bedrooms, type, featPart ? "with " + featPart : "", "in", loc].filter(Boolean).join(" ");
  }
  if (title.length > 65) {
    title = [bedrooms, type, "in", loc].filter(Boolean).join(" ");
  }
  return title;
}

/* Extract unique features from listing description for richer blog content. */
function extractFeatures(l) {
  const desc = String(l.description || "").toLowerCase();
  const features = [];
  const patterns = [
    [/(?:private|own)\s+(?:pool|swimming)/i, "Private pool"],
    [/(?:sea|ocean|beach)\s*(?:view|facing|front)/i, "Sea-facing views"],
    [/(?:\bgate\b.*\bbeach\b|\bbeach\b.*\bgate\b|\bbeach\b.*\baccess\b|\bbeach\b.*\bwalk\b)/i, "Beach access"],
    [/(?:lake|river|waterfront|water\s*body)/i, "Waterfront location"],
    [/(?:mountain|hill|valley)\s*(?:view|facing)/i, "Mountain views"],
    [/(?:garden|lawn|patio|verandah|balcony)/i, "Private garden or patio"],
    [/(?:kitchen|cooking|cookware)/i, "Full kitchen"],
    [/(?:wifi|wi-fi|internet)/i, "High-speed WiFi"],
    [/(?:parking|garage)/i, "Free parking"],
    [/(?:air.?cond|\bAC\b|split)/i, "Air conditioning"],
    [/(?:washer|washing\s*machine|laundry)/i, "In-unit laundry"],
    [/(?:\bTV\b|television|netflix|streaming)/i, "Smart TV with streaming"],
    [/(?:bbq|barbecue|grill)/i, "BBQ / grill area"],
    [/(?:breakfast|morning\s*meal)/i, "Breakfast included"],
    [/(?:pet.?friendly|pets?\s*(?:allowed|welcome))/i, "Pet-friendly"],
    [/(?:security|cctv|guard)/i, "24/7 security"],
    [/(?:luxury|premium|upscale|elegant)/i, "Luxury finishes"],
    [/(?:chef|cooking\s*service)/i, "Private chef available"],
    [/(?:housekeeping|cleaning|maid)/i, "Daily housekeeping"],
    [/(?:power\s*backup|generator|inverter)/i, "Power backup"],
    [/(?:terrace|rooftop)/i, "Rooftop terrace"],
    [/(?:fire\s*place|fireplace|bonfire)/i, "Bonfire or fireplace"],
    [/(?:jacuzzi|hot\s*tub)/i, "Jacuzzi or hot tub"],
    [/(?:gym|fitness|workout)/i, "Fitness area"],
    [/(?:kids?\s*(?:play|zone|friendly)|family)/i, "Family-friendly"]
  ];
  for (const [rx, label] of patterns) {
    if (rx.test(desc) && features.length < 6) features.push(label);
  }
  return features;
}

function bnbCard(l, p = "") {
  const cardImg = l.cover + (l.cover.includes("?") ? "&" : "?") + "w=600&q=75";
  return `<article class="bnb-card reveal">
    <div class="bnb-photo">
      <img src="${cardImg}" alt="${esc(cleanName(l.name))} — ${l.type || "Airbnb"} in ${l.city}${l.state ? ", " + l.state : ""} · book on Airbnb" loading="lazy" width="600" height="400">
      <span class="bnb-price-flag">${priceFlag(l.price)}</span>
      <button class="bnb-heart" aria-label="Save ${esc(cleanName(l.name))} to wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/></svg></button>
    </div>
    <div class="bnb-body">
      <div class="bnb-loc">${pinIcon()} ${l.city}${l.state ? ", " + l.state : ""}${l.type ? " · " + l.type : ""}</div>
      <h3><a href="${p}bnbs/${l.slug}.html">${esc(cleanName(l.name))}</a></h3>
      <div class="bnb-meta"><span>★ ${l.rating || "—"}</span><span>${l.reviews || 0} reviews</span><span>${tierOf(l)}</span></div>
      <p class="bnb-blurb">${blurb(l)}</p>
      <div class="bnb-actions">
        <a class="btn btn-teal" href="${p}bnbs/${l.slug}.html">View Stay</a>
        <a class="btn btn-primary" data-airbnb href="${l.url}" target="_blank" rel="nofollow noopener">Book on Airbnb</a>
      </div>
    </div>
  </article>`;
}

function postCard(p, root = "") {
  const cardImg = p.img + (p.img.includes("?") ? "&" : "?") + "w=600&q=75";
  const shortExcerpt = p.excerpt.length > 140 ? p.excerpt.slice(0, 137).replace(/\s+\S*$/, "") + "…" : p.excerpt;
  return `<article class="blog-card reveal" data-cat="${p.category.toLowerCase()}">
    <a class="blog-cover" href="${root}${p.url}"><img src="${cardImg}" alt="${esc(p.title)}" loading="lazy" width="600" height="400"><span class="cat-tag">${p.category}</span></a>
    <div class="blog-body">
      <span class="blog-date"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${p.date}</span>
      <h3><a href="${root}${p.url}">${esc(p.title)}</a></h3>
      <p>${esc(shortExcerpt)}</p>
      <a class="read-more" href="${root}${p.url}">Read article <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
    </div>
  </article>`;
}

function faqBlock(faqs) {
  return `<div class="faq-list">
    ${faqs.map((f, i) => `<div class="faq-item reveal">
      <button class="faq-q" aria-expanded="false">${f.q}<span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span></button>
      <div class="faq-a"><div class="faq-a-inner">${f.a}</div></div>
    </div>`).join("\n")}
  </div>`;
}

function breadcrumbJson(items) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.item })) };
}

const airbnbSearch = (d) => `https://www.airbnb.com/s/${encodeURIComponent(d.name)}--${encodeURIComponent(d.state || "India")}--India/homes`;

/* ============================================================
   INDEX
   ============================================================ */
function genIndex() {
  const heroImg = u("kerala", 1920, 1080);
  const c = CONFIG;
  const faqs = [
    { q: "What is airbnb-india.com?", a: "airbnb-india.com is a free discovery platform for India's best bed & breakfasts, homestays, villas and houseboats. We pull live Airbnb listings straight into focused city and state guides, then link you to the official Airbnb listing for live pricing and secure booking." },
    { q: "How do I book a stay listed here?", a: "Click 'Book on Airbnb' on any listing and you'll be taken to the matching listing on Airbnb, where you complete payment safely through Airbnb's own booking flow." },
    { q: "How much does an Airbnb in India cost?", a: "Budget stays start around ₹800–₹1,500 a night, comfortable mid-range BNBs run ₹1,800–₹3,500, and luxury villas, houseboats and camps range from ₹4,000 to ₹20,000+ depending on the destination and season." },
    { q: "How do I list my BNB on this website?", a: "It's free for a limited time — one listing per host/BNB. WhatsApp or email us your property name, city and Airbnb listing link — new listings go live automatically within minutes." },
    { q: "Is airbnb-india.com affiliated with Airbnb?", a: "No. We are an independent discovery site and are not affiliated with, endorsed by or a partner of Airbnb, Inc. Bookings are completed on Airbnb under their own terms." }
  ];
  const ld = [
    { "@context": "https://schema.org", "@type": "WebSite", name: c.siteName, url: SITE + "/", description: c.description, publisher: { "@type": "Organization", name: c.siteName, url: SITE, logo: SITE + "/img/logo.svg", contactPoint: { "@type": "ContactPoint", email: EMAIL, telephone: "+91-9336076006", contactType: "customer support" } } },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: DESTINATIONS.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/destinations/" + d.slug + ".html" })) }
  ];
  const feat = LISTINGS.slice(0, 6);
  const posts = buildPosts();
  const blogPicks = posts.slice(0, 6);
  const firstDest = DESTINATIONS[0];
  const tierHref = (t) => firstDest ? `blog/${t}-airbnb-in-${firstDest.slug}.html` : "blog/index.html";
  const marqueeNames = DESTINATIONS.length ? DESTINATIONS.map((d) => d.name) : ["Goa", "Jaipur", "Udaipur", "Manali", "Kerala", "Rishikesh", "Jaisalmer", "Shimla"];

  write("index.html", head({
    title: c.title,
    desc: c.description,
    canonical: SITE + "/",
    image: heroImg,
    jsonld: ld
  }) + `
  <main id="main-content">
    <section class="hero hero--photo">
      <img class="hero-photo" src="${heroImg}" alt="Kerala backwaters — find the best Airbnb in India" width="1920" height="1080">
      <div class="hero-shade"></div>
      <div class="container">
        <div class="hero-content">
          <span class="eyebrow eyebrow--light">Live Airbnb Stays Across India</span>
          <h1 class="display-title">The Best Airbnbs in India, <span class="text-accent">Curated by City</span></h1>
          <p class="lead">From Goa beach villas to Udaipur lakefront cottages, Kerala houseboats and Himalayan cabins — discover the best, cheap and luxury airbnb in every destination, and book it on Airbnb in one click.</p>
          <div class="search-shell">
            <form class="search-box" id="search-form" role="search" aria-label="Search for BNBs by location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input class="search-input" id="search-input" type="search" placeholder="Search BNBs by location — Goa, Udaipur, Kerala, Manali…" autocomplete="off" aria-label="Search BNBs by location">
              <button class="search-submit" type="submit">Search</button>
              <div class="search-results" id="search-results" role="listbox"></div>
            </form>
            <div class="search-popular">
              <span>Popular:</span>
              ${DESTINATIONS.slice(0, 5).map((d) => `<a href="destinations/${d.slug}.html">Best Airbnb in ${d.name}</a>`).join("\n")}
            </div>
          </div>
          <div class="hero-badges">
            <span class="hero-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/></svg>Handpicked &amp; verified</span>
            <span class="hero-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Live Airbnb pricing</span>
            <span class="hero-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>Secure booking on Airbnb</span>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-card"><div class="stat-num" data-count="${LISTINGS.length}" data-suffix="+">${LISTINGS.length}+</div><div class="stat-label">Live-listed stays</div></div>
          <div class="stat-card"><div class="stat-num" data-count="${DESTINATIONS.length}" data-suffix="">${DESTINATIONS.length}</div><div class="stat-label">Destinations covered</div></div>
          <div class="stat-card"><div class="stat-num" data-count="100" data-suffix="%">100%</div><div class="stat-label">Free to list — limited time</div></div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        ${marqueeNames.map((n) => `<span>${n} <i class="dot"></i></span>`).join("")}
        ${marqueeNames.map((n) => `<span>${n} <i class="dot"></i></span>`).join("")}
      </div>
    </div>

    <section>
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">Destinations</span>
          <h2 class="section-title">Explore the Best Airbnbs by City &amp; State</h2>
          <p class="section-sub">Location-wise guides to the best airbnb in India — sorted by destination and state so you can plan around places, not algorithms.</p>
        </div>
        <div class="dest-grid">
          ${DESTINATIONS.map((d) => destCard(d)).join("\n")}
        </div>
      </div>
    </section>

    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">Best · Cheap · Luxury</span>
          <h2 class="section-title">Every Budget, Every Destination</h2>
          <p class="section-sub">Search the way you actually travel — find the best airbnb in India, the cheapest stays, and the once-in-a-lifetime luxury villas.</p>
        </div>
        <div class="tier-grid">
          <a class="tier-card tier--best reveal" href="${tierHref("best")}">
            <span class="tier-emoji">★</span>
            <h3>Best Airbnbs in India</h3>
            <p>Top-rated, most-loved stays in every city — judged on reviews, location and hosts you can trust.</p>
            <span class="tier-link">Browse best stays <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
          </a>
          <a class="tier-card tier--cheap reveal" data-delay="1" href="${tierHref("cheap")}">
            <span class="tier-emoji">₹</span>
            <h3>Cheap Airbnbs in India</h3>
            <p>Great stays under ₹2,000 — clean beds, hot water, good hosts, zero fuss. Perfect for backpackers.</p>
            <span class="tier-link">Browse budget stays <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
          </a>
          <a class="tier-card tier--luxury reveal" data-delay="2" href="${tierHref("luxury")}">
            <span class="tier-emoji">◆</span>
            <h3>Luxury Airbnbs in India</h3>
            <p>Private pools, houseboats, lakefront palaces and desert camps — stays you'll talk about for years.</p>
            <span class="tier-link">Browse luxury stays <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
          </a>
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">Featured Stays</span>
          <h2 class="section-title">Handpicked BNBs, Ready to Book on Airbnb</h2>
          <p class="section-sub">Every stay below is verified, highly rated and linked directly to its live Airbnb listing.</p>
        </div>
        <div class="bnb-grid">
          ${feat.map((l) => bnbCard(l)).join("\n")}
        </div>
        <div style="text-align:center;margin-top:44px;"><a class="btn btn-teal btn-lg" href="bnbs.html">View all ${LISTINGS.length} BNBs</a></div>
      </div>
    </section>

    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">How It Works</span>
          <h2 class="section-title">Find &amp; Book in Three Easy Steps</h2>
        </div>
        <div class="steps-grid">
          <div class="step-card reveal"><h3>1. Search by location</h3><p>Search any city or state — Goa, Udaipur, Kerala, Manali — or browse our curated destination guides.</p></div>
          <div class="step-card reveal" data-delay="1"><h3>2. Compare curated stays</h3><p>Compare handpicked BNBs by price, rating and vibe. Our filters sort best, cheap and luxury for you.</p></div>
          <div class="step-card reveal" data-delay="2"><h3>3. Book on Airbnb</h3><p>One click takes you to the official Airbnb listing for live pricing, secure payment and full protection.</p></div>
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">From the Blog</span>
          <h2 class="section-title">Best, Cheap &amp; Luxury Airbnb Guides</h2>
          <p class="section-sub">Location-wise, keyword-rich guides to the best airbnb in India — written for the way you actually plan trips.</p>
        </div>
        <div class="blog-grid">
          ${blogPicks.map((p) => postCard(p)).join("\n")}
        </div>
        <div style="text-align:center;margin-top:44px;"><a class="btn btn-teal btn-lg" href="blog/index.html">Read all guides</a></div>
      </div>
    </section>

    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">Testimonials</span>
          <h2 class="section-title">Loved by Travellers &amp; Hosts</h2>
          <p class="section-sub">Real words from people who found their perfect stay or got their BNB listed through airbnb-india.com.</p>
        </div>
        <div class="testi-grid">
          ${TESTIMONIALS.slice(0, 6).map((t) => testiCard(t)).join("\n")}
        </div>
      </div>
    </section>

    <section>
      <div class="container">
        <div class="cta-band reveal">
          <div>
            <h2>Ready to discover your next stay?</h2>
            <p>Explore ${LISTINGS.length}+ handpicked BNBs across ${DESTINATIONS.length} destinations — search by city or state and book on Airbnb in one click.</p>
            <div class="cta-actions">
              <a class="btn btn-primary btn-lg" href="destinations.html">Explore Destinations</a>
              <a class="btn btn-ghost btn-lg" href="bnbs.html">Browse All BNBs</a>
            </div>
          </div>
          <div class="cta-art"><img src="img/logo.svg" alt="airbnb-india.com — India's best Airbnb discovery platform" width="240" height="240"></div>
        </div>
      </div>
    </section>

    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">FAQ</span>
          <h2 class="section-title">Questions, Answered</h2>
        </div>
        ${faqBlock(faqs)}
      </div>
    </section>

    <section>
      <div class="container">
        <div class="list-cta reveal">
          <div>
            <h3>Own a homestay or BNB? Get listed free — limited time, 1 per host.</h3>
            <p>WhatsApp or email us your Airbnb link — new listings go live automatically within minutes. <a href="mailto:${EMAIL}">${EMAIL}</a></p>
          </div>
          <a class="btn btn-lg" href="${WA}" target="_blank" rel="noopener">WhatsApp Us</a>
        </div>
      </div>
    </section>
  </main>
  ` + tail());
}

/* ============================================================
   DESTINATIONS INDEX
   ============================================================ */
function genDestinations() {
  const ld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "Best Airbnbs in India by City & State", url: SITE + "/destinations.html", description: "Location-wise guides to the best, cheap and luxury Airbnbs across Indian cities and states." },
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: DESTINATIONS.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/destinations/" + d.slug + ".html" })) },
    breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "Destinations", item: SITE + "/destinations.html" }])
  ];
  const chips = DESTINATIONS.map((d) => d.name).concat(["Suggest a city", "List your BNB"]);
  write("destinations.html", head({
    title: seoTitle("Best Airbnbs in India by City & State", "Location-wise Guides"),
    desc: "Explore the best airbnb in India, city and state-wise. Every destination guide links real, verified Airbnb stays with ratings, prices and one-click booking.",
    canonical: SITE + "/destinations.html",
    image: u("jaipur", 1200, 630),
    jsonld: ld
  }) + `
  <main id="main-content">
    <section class="page-hero">
      <div class="page-hero-orb one"></div><div class="page-hero-orb two"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">›</span><span>Destinations</span></nav>
        <h1>Best Airbnbs in India, City by City</h1>
        <p>Location-wise, state-wise guides to the best airbnb in India — from beach villas to mountain cabins. Pick a destination to see curated stays, budget picks and luxury stays.</p>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="dest-grid">
          ${DESTINATIONS.map((d) => destCard(d)).join("\n")}
        </div>
      </div>
    </section>
    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">More Locations</span>
          <h2 class="section-title">Also Popular with Travellers</h2>
        </div>
        <div class="more-locs">
          ${chips.map((n) => `<span class="loc-chip">${n}</span>`).join("\n")}
        </div>
        <p class="section-sub" style="text-align:center;">Don't see your city? <a href="contact.html">Suggest a destination</a> or <a href="list-your-bnb.html">list your BNB free</a> (limited time, 1 per host) — we add new locations automatically as listings come in.</p>
      </div>
    </section>
  </main>
  ` + tail());
}

/* ============================================================
   BNB INDEX
   ============================================================ */
function genBnbs() {
  const ld = [
    { "@context": "https://schema.org", "@type": "CollectionPage", name: "All BNBs in India — Homestays, Villas & Houseboats", url: SITE + "/bnbs.html", description: "Browse all handpicked BNBs on airbnb-india.com — every stay verified and bookable on Airbnb." },
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: LISTINGS.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/bnbs/" + l.slug + ".html" })) },
    breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "BNBs", item: SITE + "/bnbs.html" }])
  ];
  write("bnbs.html", head({
    title: seoTitle(`All BNBs in India — ${LISTINGS.length} Verified Stays`),
    desc: "Browse every handpicked BNB in India on one page — beach villas, heritage havelis, houseboats and mountain cabins. Live pricing via Airbnb.",
    canonical: SITE + "/bnbs.html",
    image: u("kerala", 1200, 630),
    jsonld: ld
  }) + `
  <main id="main-content">
    <section class="page-hero">
      <div class="page-hero-orb one"></div><div class="page-hero-orb two"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">›</span><span>All BNBs</span></nav>
        <h1>All Handpicked BNBs in India</h1>
        <p>Every stay on airbnb-india.com in one place — verified, highly rated, and one click from live pricing and booking on Airbnb.</p>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="bnb-grid">
          ${LISTINGS.map((l) => bnbCard(l)).join("\n")}
        </div>
      </div>
    </section>
    <section class="section-alt">
      <div class="container">
        <div class="list-cta reveal">
          <div><h3>Hosting an Airbnb? Get listed free — limited time, 1 per host.</h3><p>WhatsApp or email us your Airbnb link — listings go live automatically within minutes. <a href="mailto:${EMAIL}">${EMAIL}</a></p></div>
          <a class="btn btn-lg" href="${WA}" target="_blank" rel="noopener">WhatsApp Us</a>
        </div>
      </div>
    </section>
  </main>
  ` + tail());
}

/* ============================================================
   DESTINATION PAGES
   ============================================================ */
function genDestinationPages() {
  for (const d of DESTINATIONS) {
    const c = destContent(d);
    const loc = listingsOf(d.slug);
    const cities = [...new Set(loc.map((l) => l.city).filter(Boolean))];
    const areas = (cities.length ? cities : [d.name]).map((n) => ({ n, q: n, d: `Browse live Airbnbs in ${n} and book directly on Airbnb — filter by price, reviews and amenities.` }));
    const faqs = c.faqs.slice(0, 4);
    const tiers = TIERS.map((t) => buildPosts().find((p) => p.tier === t && p.d && p.d.slug === d.slug)).filter(Boolean);
    const ld = [
      { "@context": "https://schema.org", "@type": "TouristDestination", name: `${d.name}${destStateSuffix(d)}`, description: c.intro, image: destImg(d), url: SITE + "/destinations/" + d.slug + ".html", touristType: ["vacation", "homestay", "airbnb"], touristAttraction: areas.map((a) => ({ "@type": "TouristAttraction", name: a.n })) },
      breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "Destinations", item: SITE + "/destinations.html" }, { name: `${d.name}`, item: SITE + "/destinations/" + d.slug + ".html" }]),
      { "@context": "https://schema.org", "@type": "ItemList", name: `Best airbnb in ${d.name}`, itemListElement: loc.map((l, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/bnbs/" + l.slug + ".html" })) },
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }
    ];
    const keywords = destKeywords(d).join(", ");

    write(`destinations/${d.slug}.html`, head({
      title: seoTitle(`Best Airbnb in ${d.name} (2026)`, `Stays & Cheap Options`),
      desc: fit(`Explore the best airbnb in ${d.name}${destStateSuffix(d)} — curated homestays, budget stays and luxury villas. Photos and live booking on Airbnb.`, 158),
      canonical: SITE + `/destinations/${d.slug}.html`,
      image: destImg(d),
      jsonld: ld,
      keywords: destKeywords(d).join(", ")
    }) + `
  <main id="main-content">
    <section class="page-hero page-hero--photo">
      <img class="page-hero-photo" src="${destImg(d)}" alt="Best airbnb in ${d.name}${destStateSuffix(d)} — ${d.tagline || "handpicked stays"}" width="1600" height="700">
      <div class="page-hero-shade"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span class="sep">›</span><a href="../destinations.html">Destinations</a><span class="sep">›</span><span>${d.name}</span></nav>
        <h1>Best Airbnb in ${d.name}${destStateSuffix(d)}</h1>
        <p>${c.heroLead}</p>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="article-wrap">
          <div class="article-body reveal">
            <h2>Why Book an Airbnb in ${d.name}</h2>
            <p>${c.intro.split("\n\n")[0]}</p>
            <p>${c.intro.split("\n\n")[1] || ""}</p>
          </div>
        </div>
        <div class="section-head reveal" style="margin-top:56px;">
          <span class="eyebrow">Curated Stays</span>
          <h2 class="section-title">The Best Airbnb in ${d.name} — Ready to Book</h2>
        </div>
        <div class="bnb-grid">
          ${loc.map((l) => bnbCard(l, "../")).join("\n")}
          <a class="bnb-card bnb-card--more reveal" href="${airbnbSearch(d)}" target="_blank" rel="nofollow noopener">
            <div class="bnb-photo"><img src="${destImg(d)}" alt="More Airbnbs in ${d.name} — browse live listings on Airbnb" loading="lazy"><span class="bnb-price-flag">Live</span></div>
            <div class="bnb-body"><div class="bnb-loc">${pinIcon()} ${d.name}${destStateSuffix(d)}</div><h3>More Airbnbs in ${d.name}</h3>
            <p class="bnb-blurb">See every live listing in ${d.name} — filter by price, reviews and amenities directly on Airbnb.</p>
            <div class="bnb-actions"><a class="btn btn-primary" href="${airbnbSearch(d)}" target="_blank" rel="nofollow noopener">Browse on Airbnb</a></div></div>
          </a>
        </div>
        <div class="tier-inline reveal" style="margin-top:44px;">
          <h3>Best · Cheap · Luxury — ${d.name}</h3>
          <div class="tier-inline-grid">
            ${tiers.map((t) => `<a class="tier-mini tier--${t.tier}" href="../${t.url}">
                <span class="tier-emoji">${TIER_EMOJI[t.tier]}</span>
                <span><strong>${TIER_LABEL[t.tier]} Airbnb in ${d.name}</strong><small>${t.priceLine}</small></span>
              </a>`).join("\n")}
          </div>
        </div>
      </div>
    </section>
    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">Where to Stay</span>
          <h2 class="section-title">Best Areas to Book an Airbnb in ${d.name}</h2>
        </div>
        <div class="area-grid">
          ${areas.map((a, i) => `<a class="area-card reveal" data-delay="${i}" href="https://www.airbnb.com/s/${encodeURIComponent(a.q)}--${encodeURIComponent(d.state || "India")}--India/homes" target="_blank" rel="nofollow noopener">
            <h3>${a.n}</h3><p>${a.d}</p><span class="area-link">See Airbnbs in ${a.n} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
          </a>`).join("\n")}
        </div>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="split-cards">
          <div class="info-card reveal">
            <h3>Best Time to Visit ${d.name}</h3><p>${c.bestTime}</p>
          </div>
          <div class="info-card reveal" data-delay="1">
            <h3>How to Reach ${d.name}</h3><p>${c.howToReach}</p>
          </div>
        </div>
      </div>
    </section>
    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">FAQ</span>
          <h2 class="section-title">${d.name} Airbnb — FAQs</h2>
        </div>
        ${faqBlock(faqs)}
      </div>
    </section>
    <section>
      <div class="container">
        <div class="list-cta reveal">
          <div><h3>Own an Airbnb in ${d.name}?</h3><p>WhatsApp or email us your Airbnb link and get listed on this page automatically — free for a limited time (1 per host). Reach travellers planning ${d.name} trips. <a href="mailto:${EMAIL}">${EMAIL}</a></p></div>
          <a class="btn btn-lg" href="${WA}" target="_blank" rel="noopener">WhatsApp Us</a>
        </div>
      </div>
    </section>
  </main>
  <meta name="keywords" content="${keywords}">
  ` + tail("../"));
  }
}

/* ============================================================
   BNB DETAIL PAGES
   ============================================================ */
function genBnbPages() {
  for (const l of LISTINGS) {
    const dest = firstN(l);
    const destSlug = dest ? dest.slug : slug(l.city);
    const related = LISTINGS.filter((x) => (x.destSlug || slug(x.city)) === destSlug && x.slug !== l.slug).slice(0, 3);
    const others = LISTINGS.filter((x) => !related.includes(x) && x.slug !== l.slug).slice(0, 3 - related.length);
    const relAll = related.concat(others).slice(0, 3);
    const paras = formatDescription(l);
    if (!paras.length) paras.push(blurb(l));
    const amenities = (l.amenities && l.amenities.length ? l.amenities : ["Full amenity list on Airbnb"]).slice(0, 12);
    const nearby = [
      `Just ${l.city} — walking or a short drive from the ${dest ? dest.name : l.city} action`,
      `${l.city}${l.state ? ", " + l.state : ""} cafés, markets and sightseeing nearby`,
      `Nearest railway station & airport within easy reach`,
      `Free street parking & 24/7 host support on Airbnb`
    ];
    const host = l.host || "Verified Airbnb host";
    const gallery = [l.cover].concat((l.images || []).filter((i) => i !== l.cover).slice(0, 3));
    const listingFaqs = autoFaq(l);
    const features = extractFeatures(l);
    const ld = [
      {
        "@context": "https://schema.org",
        "@type": "VacationRental",
        name: cleanName(l.name),
        image: l.cover,
        url: SITE + "/bnbs/" + l.slug + ".html",
        description: blurb(l),
        address: { "@type": "PostalAddress", addressLocality: l.city, addressRegion: l.state || undefined, addressCountry: l.country || "IN" },
        ...(l.price ? { priceRange: inr(l.price) } : {}),
        numberOfRooms: l.bedrooms || 1,
        ...(l.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: l.rating, reviewCount: l.reviews || 0 } } : {}),
        ...(l.lat ? { geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng } } : {}),
        amenityFeature: amenities.slice(0, 6).map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
        provider: { "@type": "Organization", name: "Airbnb", url: l.url },
        brand: { "@type": "Organization", name: "airbnb-india.com", url: SITE }
      },
      breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "BNBs", item: SITE + "/bnbs.html" }, { name: cleanName(l.name), item: SITE + "/bnbs/" + l.slug + ".html" }]),
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: listingFaqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a }
        }))
      }
    ];
    const keywords = keywordsFor(l).join(", ");
    const destTierPosts = TIERS.map((t) => buildPosts().find((q) => q.tier === t && q.d && q.d.slug === destSlug)).filter(Boolean);
    const facts = [
      l.price ? `from ${inr(l.price)}/night` : "live pricing on Airbnb",
      l.rating ? `★ ${l.rating} rating` : null,
      l.reviews ? `${l.reviews} reviews` : null,
      l.guests ? `sleeps ${l.guests}` : null,
      l.bedrooms ? `${l.bedrooms} bedrooms` : null,
      l.baths ? `${l.baths} bathrooms` : null
    ].filter(Boolean);

    write(`bnbs/${l.slug}.html`, head({
      title: seoTitle(cleanName(l.name), `${locStr(l)}${l.price ? " (" + inr(l.price) + "/night)" : ""}`),
      desc: bnbMetaDesc(l),
      canonical: SITE + `/bnbs/${l.slug}.html`,
      image: l.cover,
      jsonld: ld,
      ogType: "article",
      keywords: keywordsFor(l).join(", ")
    }) + `
  <main id="main-content">
    <section class="bnb-hero">
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span class="sep">›</span><a href="../bnbs.html">BNBs</a><span class="sep">›</span><span>${esc(cleanName(l.name))}</span></nav>
        <div class="gallery-grid">
          <figure class="gal-main"><img src="${l.cover}" alt="${esc(cleanName(l.name))} — ${l.type || "Airbnb"} in ${l.city}${l.state ? ", " + l.state : ""}" width="900" height="620"></figure>
          ${gallery.slice(1).map((g, i) => `<figure class="gal-thumb"><img src="${g}" alt="${esc(cleanName(l.name))} — gallery ${i + 2}" loading="lazy"></figure>`).join("\n")}
        </div>
        <div class="bnb-head">
          <div>
            <div class="bnb-loc">${pinIcon()} ${l.city}${l.state ? ", " + l.state : ""}${l.type ? " · " + l.type : ""}</div>
        <h1>${esc(blogTitle(l))}</h1>
            <div class="bnb-rating">${starIcon()} ${l.rating || "—"} <small>· ${l.reviews || 0} reviews${l.host ? ` · hosted by ${l.host}` : ""}</small></div>
            ${(l.hostBadges || []).length ? `<div class="host-badges" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">${l.hostBadges.map((b) => `<span class="amen-chip" style="background:var(--teal-50,#e7f5f1);color:var(--teal-800,#0b3d34);border:1px solid var(--teal-200,#b9e2d6);border-radius:999px;padding:4px 12px;font-size:0.8rem;font-weight:600;">${esc(b)}</span>`).join("\n")}</div>` : ""}
          </div>
          <div class="book-panel">
            <div class="book-price">${l.price ? inr(l.price) : "Price varies"}<small>${l.price ? "/ night" : "— confirm on Airbnb"}</small></div>
            <a class="btn btn-primary btn-lg" data-airbnb href="${l.url}" target="_blank" rel="nofollow noopener">Check Price on Airbnb</a>
            <p class="book-note">Live pricing, instant booking &amp; guest protection on Airbnb</p>
          </div>
        </div>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="article-wrap">
          <div class="article-body reveal">
            ${paras.map((p) => `<p>${esc(p)}</p>`).join("\n")}
          </div>
          ${l.highlights && l.highlights.length ? `
          <h2 class="section-title" style="margin-top:44px;">Why Guests Love This Stay</h2>
          <div class="highlight-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:16px;">
            ${l.highlights.map((h) => `<div class="highlight-card" style="background:var(--teal-50,#e7f5f1);border:1px solid var(--teal-200,#b9e2d6);border-radius:14px;padding:16px 18px;font-size:0.92rem;line-height:1.5;"><span style="color:var(--teal-700,#0f5c4e);font-weight:700;margin-right:6px;">★</span>${esc(h)}</div>`).join("\n")}
          </div>` : ""}
          ${(l.rating || (l.reviewCategories || []).length) ? `
          <h2 class="section-title" style="margin-top:44px;">Guest Reviews &amp; Ratings</h2>
          <div class="review-summary" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin-top:16px;">
            <div class="review-card" style="background:var(--teal-50,#e7f5f1);border:1px solid var(--teal-200,#b9e2d6);border-radius:14px;padding:16px 18px;">
              <div style="font-size:2rem;font-weight:800;color:var(--teal-800,#0b3d34);line-height:1;">${l.rating || "—"}<span style="font-size:1rem;font-weight:600;color:var(--teal-700,#0f5c4e);">/5</span></div>
              <div style="margin-top:6px;font-size:0.9rem;font-weight:600;">${l.reviews ? l.reviews + " guest reviews on Airbnb" : "guest reviews on Airbnb"}</div>
              ${l.isGuestFavorite ? `<div style="margin-top:8px;font-size:0.85rem;color:var(--teal-700,#0f5c4e);">${esc(l.guestFavoriteDescription || "Guest favorite")}</div>` : ""}
            </div>
            ${(l.reviewCategories || []).map((c) => `<div class="review-card" style="background:var(--surface,#fff);border:1px solid var(--border,#e5e7eb);border-radius:14px;padding:14px 18px;"><div style="font-size:0.85rem;font-weight:600;color:var(--muted,#6b7280);">${esc(c.label)}</div><div style="font-size:1.25rem;font-weight:700;color:var(--ink,#111827);margin-top:4px;">★ ${c.rating}</div></div>`).join("\n")}
          </div>` : ""}
          <div class="fact-strip reveal" style="display:flex;flex-wrap:wrap;gap:10px;margin:28px 0;">
            ${facts.map((f) => `<span class="amen-chip">${f}</span>`).join("\n")}
          </div>
          ${features.length ? `
          <h2 class="section-title" style="margin-top:44px;">What Makes This Stay Special</h2>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;">
            ${features.map((f) => `<span class="amen-chip" style="background:var(--amber-50,#fef7ec);color:var(--amber-800,#92400e);border:1px solid var(--amber-200,#fde68a);border-radius:999px;padding:6px 16px;font-size:0.88rem;font-weight:600;">★ ${esc(f)}</span>`).join("\n")}
          </div>` : ""}
          <h2 class="section-title" style="margin-top:44px;">Amenities</h2>
          <div class="amen-grid">
            ${amenities.map((a) => `<span class="amen-chip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/></svg>${esc(a)}</span>`).join("\n")}
          </div>
          <h2 class="section-title" style="margin-top:44px;">Location &amp; Nearby</h2>
          <div class="nearby-list">
            ${nearby.map((n) => `<div class="nearby-item"><span class="nearby-dot"></span>${esc(n)}</div>`).join("\n")}
          </div>
          <h2 class="section-title" style="margin-top:44px;">Frequently Asked Questions</h2>
          <div class="faq-list" style="margin-top:16px;">
            ${listingFaqs.map((f) => `<details class="faq-item" style="border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:16px 20px;margin-bottom:10px;"><summary style="font-weight:600;cursor:pointer;font-size:0.95rem;">${esc(f.q)}</summary><p style="margin-top:10px;font-size:0.92rem;line-height:1.6;color:var(--muted,#6b7280);">${esc(f.a)}</p></details>`).join("\n")}
          </div>
          <div class="author-box reveal">
            <div class="avatar">${esc((l.host || l.name || "?").charAt(0))}</div>
            <div><h4>About the host</h4><p>${esc(host)}${l.hostEmail || l.hostPhone || l.hostWhatsapp ? " — reach the host directly:" : l.hostAbout ? "" : " — reachable through Airbnb's messaging. Booking and payment are fully protected by Airbnb's host guarantee."}</p>
              ${l.hostAbout ? `<p style="margin-top:8px;opacity:0.92;">${esc(l.hostAbout)}</p>` : ""}
              ${(l.hostHighlights || []).length ? `<p style="margin-top:8px;opacity:0.9;">${esc(l.hostHighlights.join(" · "))}</p>` : ""}
              ${l.hostEmail || l.hostPhone || l.hostWhatsapp ? `
              <div class="host-contact">
                ${l.hostWhatsapp ? `<a class="btn btn-teal btn-sm" href="https://wa.me/${String(l.hostWhatsapp).replace(/[^0-9]/g, "")}" target="_blank" rel="nofollow noopener">WhatsApp</a>` : ""}
                ${l.hostPhone ? `<a class="btn btn-teal btn-sm" href="tel:${String(l.hostPhone).replace(/[^+0-9]/g, "")}">Call</a>` : ""}
                ${l.hostEmail ? `<a class="btn btn-teal btn-sm" href="mailto:${esc(l.hostEmail)}">Email</a>` : ""}
              </div>` : ""}
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="section-alt">
      <div class="container">
        <div class="section-head reveal">
          <span class="eyebrow">More Stays</span>
          <h2 class="section-title">You May Also Like</h2>
        </div>
        <div class="bnb-grid">
          ${relAll.map((x) => bnbCard(x, "../")).join("\n")}
        </div>
        ${dest || destTierPosts.length ? `
        <div style="margin-top:32px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
          ${dest ? `<a class="btn btn-teal" href="../destinations/${destSlug}.html">Explore all stays in ${dest.name}</a>` : ""}
          ${destTierPosts.map((p) => `<a class="btn btn-teal" href="../${p.url}">${TIER_LABEL[p.tier]} ${dest ? dest.name : l.city} Guide</a>`).join("\n")}
        </div>` : ""}
      </div>
    </section>
    <section>
      <div class="container">
        <div class="list-cta reveal">
          <div><h3>Own a stay like this?</h3><p>Get listed free on airbnb-india.com — limited time, 1 per host. WhatsApp or email us your Airbnb link and go live automatically. <a href="mailto:${EMAIL}">${EMAIL}</a></p></div>
          <a class="btn btn-lg" href="${WA}" target="_blank" rel="noopener">WhatsApp Us</a>
        </div>
      </div>
    </section>
  </main>
  ` + tail("../"));
  }
}

/* ============================================================
   BLOG
   ============================================================ */
function genBlogIndex() {
  const posts = buildPosts();
  const cats = ["all", "best", "cheap", "luxury", "listed"];
  const ld = [
    { "@context": "https://schema.org", "@type": "Blog", name: "airbnb-india.com Blog — Best, Cheap & Luxury Airbnb Guides", url: SITE + "/blog/index.html", description: "Location-wise guides to the best, cheap and luxury Airbnbs across India, plus detailed listing pages for every stay.", blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: SITE + "/" + p.url, image: p.img, datePublished: p.isoDate || p.date })) },
    breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "Blog", item: SITE + "/blog/index.html" }])
  ];
  write("blog/index.html", head({
    title: seoTitle("Blog — Best, Cheap & Luxury Airbnb Guides in India"),
    desc: "India's best Airbnb guides — best, cheap and luxury stays plus detailed listing pages with real prices, photos and one-click booking on Airbnb.",
    canonical: SITE + "/blog/index.html",
    image: u("jaipur", 1200, 630),
    jsonld: ld
  }) + `
  <main id="main-content">
    <section class="page-hero">
      <div class="page-hero-orb one"></div><div class="page-hero-orb two"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span class="sep">›</span><span>Blog</span></nav>
        <h1>Best, Cheap &amp; Luxury Airbnb Guides in India</h1>
        <p>Location-wise guides written for real trip planning — find the best airbnb in India, stretch your budget, or go full luxury.</p>
        <div class="blog-filters">
          ${cats.map((cat, i) => `<button class="chip${i === 0 ? " active" : ""}" data-cat="${cat}">${cat === "all" ? "All Guides" : cat === "listed" ? "Listed BNBs" : cat[0].toUpperCase() + cat.slice(1)}</button>`).join("\n")}
        </div>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="blog-grid">
          ${posts.map((p) => postCard(p, "../")).join("\n")}
        </div>
      </div>
    </section>
  </main>
  ` + tail("../"));
}

function genTierPosts() {
  for (const d of DESTINATIONS) {
    const loc = listingsOf(d.slug);
    if (!loc.length) continue;
    for (const t of TIERS) {
      const p = buildPosts().find((x) => x.tier === t && x.d && x.d.slug === d.slug);
      if (!p) continue;
      const sorted = tierListings(loc, t);
      const c = destContent(d);
      const cities = [...new Set(loc.map((l) => l.city).filter(Boolean))];
      const areas = (cities.length ? cities : [d.name]).map((n) => ({ n, q: n, d: `Browse live ${t} Airbnbs in ${n} and book directly on Airbnb.` }));
      const faqs = c.faqs.slice(0, 4);
      const related = TIERS.filter((x) => x !== t).map((x) => buildPosts().find((q) => q.tier === x && q.d && q.d.slug === d.slug)).filter(Boolean);
      const tierLinks = {};
      for (const r of related) tierLinks[r.tier] = r;
      const priceLine = p.priceLine;
      const tier = t;
      const ld = [
        { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, image: p.img, url: SITE + "/" + p.url, datePublished: p.isoDate || p.date, dateModified: p.isoDate || p.date, author: { "@type": "Organization", name: "airbnb-india.com", url: SITE }, publisher: { "@type": "Organization", name: "airbnb-india.com", url: SITE, logo: SITE + "/img/logo.svg" }, description: p.excerpt, mainEntityOfPage: SITE + "/" + p.url },
        breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "Blog", item: SITE + "/blog/index.html" }, { name: p.title, item: SITE + "/" + p.url }]),
        { "@context": "https://schema.org", "@type": "ItemList", name: p.title, itemListElement: sorted.map((l, i) => ({ "@type": "ListItem", position: i + 1, name: cleanName(l.name), url: SITE + "/bnbs/" + l.slug + ".html" })) }
      ];

      write(`blog/${p.slug}.html`, head({
        title: p.title,
        desc: fit(p.excerpt, 158),
        canonical: SITE + `/blog/${p.slug}.html`,
        image: p.img,
        jsonld: ld,
        ogType: "article",
        keywords: (p.keywords || []).join(", "),
        dateModified: fmtDateIso(p.listedAt || today())
      }) + `
  <main id="main-content">
    <section class="page-hero">
      <div class="page-hero-orb one"></div><div class="page-hero-orb two"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span class="sep">›</span><a href="../blog/index.html">Blog</a><span class="sep">›</span><span>${TIER_LABEL[tier]} Airbnb in ${d.name}</span></nav>
        <span class="eyebrow eyebrow--light">${TIER_LABEL[tier]} Airbnb Guide · ${d.name}${destStateSuffix(d)}</span>
        <h1>${p.title.replace(" (2026)", "")}</h1>
        <p>${c.heroLead}</p>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="article-wrap">
          <div class="article-hero-cover reveal"><img src="${p.img}" alt="${esc(p.title)}" width="900" height="500"></div>
          <div class="article-meta reveal">
            <span class="author-chip"><span class="avatar">AI</span>airbnb-india.com editors</span>
            <span>${p.date}</span><span>${TIER_LABEL[tier]} · ${d.name}</span><span>${sorted.length} curated stays</span>
          </div>
          <div class="article-toc reveal">
            <h3>In this guide</h3>
            <ol>
              <li><a href="#picks">Our ${TIER_LABEL[tier].toLowerCase()} picks in ${d.name}</a></li>
              <li><a href="#areas">Where to stay in ${d.name}</a></li>
              <li><a href="#budget">What you get for your money</a></li>
              <li><a href="#book">How to book</a></li>
              <li><a href="#when">Best time to visit</a></li>
            </ol>
          </div>
          <div class="article-body">
            <p>${c.intro.split("\n\n")[0]}</p>
            <p><strong>${tier === "cheap" ? "Budget doesn't mean boring" : tier === "luxury" ? "Worth every rupee" : "Our top-rated picks"}</strong> — every recommendation below is linked straight to its live Airbnb listing, so the price you see is the price you pay, and booking stays fully protected by Airbnb.</p>
            <blockquote>Looking for something else in ${d.name}? Browse our <a href="../${tierLinks.best ? tierLinks.best.url : "#"}">best</a>, <a href="../${tierLinks.cheap ? tierLinks.cheap.url : "#"}">cheap</a> and <a href="../${tierLinks.luxury ? tierLinks.luxury.url : "#"}">luxury</a> ${d.name} Airbnb guides.</blockquote>
          </div>
          <div class="article-body">
            <h2 id="picks">The ${TIER_LABEL[tier]} Airbnb in ${d.name} — Our Picks</h2>
            <p>Prices range from ${priceLine}. Every stay is handpicked, verified and bookable in one click on Airbnb.</p>
          </div>
          <div class="bnb-grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr));">
            ${sorted.map((l) => bnbCard(l, "../")).join("\n")}
            <article class="bnb-card">
              <div class="bnb-photo"><img src="${p.img}" alt="More ${TIER_LABEL[tier].toLowerCase()} Airbnbs in ${d.name} — browse on Airbnb" loading="lazy"><span class="bnb-price-flag">Live</span></div>
              <div class="bnb-body"><div class="bnb-loc">${pinIcon()} ${d.name}${destStateSuffix(d)}</div><h3>More ${TIER_LABEL[tier]} Airbnbs in ${d.name}</h3>
              <p class="bnb-blurb">Browse every live ${TIER_LABEL[tier].toLowerCase()} Airbnb in ${d.name} on Airbnb — filter by price, reviews and amenities.</p>
              <div class="bnb-actions"><a class="btn btn-primary" href="${airbnbSearch(d)}" target="_blank" rel="nofollow noopener">Browse on Airbnb</a></div></div>
            </article>
          </div>
          <div class="article-body">
            <h2 id="areas">Where to Stay in ${d.name} — Best Areas</h2>
            <p>Area matters as much as the room. These are the neighbourhoods our ${d.name} hosts and travellers rate highest.</p>
          </div>
          <div class="area-grid">
            ${areas.map((a, i) => `<a class="area-card reveal" data-delay="${i}" href="https://www.airbnb.com/s/${encodeURIComponent(a.q)}--${encodeURIComponent(d.state || "India")}--India/homes" target="_blank" rel="nofollow noopener"><h3>${a.n}</h3><p>${a.d}</p><span class="area-link">See ${TIER_LABEL[tier].toLowerCase()} Airbnbs <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></a>`).join("\n")}
          </div>
          <div class="article-body">
            <h2 id="budget">What You Get for Your Money — ${TIER_LABEL[tier]} Breakdown</h2>
            <p>Here's exactly what a ${TIER_LABEL[tier].toLowerCase()}-tier Airbnb in ${d.name} should deliver:</p>
            <ul>
              ${(tier === "cheap"
                ? [`Clean, comfortable beds with quality linen`, `Reliable hot water and fast WiFi`, `A host who responds within the hour`, `Kitchen or breakfast access to cut meal costs`, `Walkable access to ${d.name}'s main areas`, `Total cost ${priceLine}`]
                : tier === "luxury"
                ? [`A private, exclusive space — pool, deck or lakefront access`, `Interior design worth photographing`, `Concierge-style host service`, `Premium amenities and welcome touches`, `Prime location in ${d.name}`, `Total cost ${priceLine}`]
                : [`Consistently 4.7★+ guest ratings`, `The best location in ${d.name}`, `Hosts known for fast, friendly response`, `Repeat-booked by returning guests`, `Great value for the quality`, `Total cost ${priceLine}`]).map((li) => `<li>${li}</li>`).join("\n")}
            </ul>
            <blockquote>${tier === "cheap" ? "Tip: book weekdays and shoulder-season dates in " + d.name + " to stretch a budget stay even further." : tier === "luxury" ? "Tip: for groups, luxury villas with private pools often work out cheaper per person than boutique hotels in " + d.name + "." : "Tip: filter by 'Superhost' on Airbnb to find the most reliable hosts in " + d.name + "."}</blockquote>
            <h2 id="book">How to Book the ${TIER_LABEL[tier]} Airbnb in ${d.name}</h2>
            <p>All our ${d.name} picks are bookable on Airbnb. Three steps: open the listing, pick your dates, and check out securely — Airbnb handles payment protection, host verification and cancellation policies.</p>
            <p><a class="btn btn-primary btn-lg" href="${airbnbSearch(d)}" target="_blank" rel="nofollow noopener">${TIER_EMOJI[tier]} Find ${TIER_LABEL[tier].toLowerCase()} Airbnbs in ${d.name} on Airbnb</a></p>
            <h2 id="when">Best Time to Visit ${d.name}</h2>
            <p>${c.bestTime}</p>
            <p><strong>Getting there:</strong> ${c.howToReach}</p>
          </div>
          <h2 class="section-title" style="margin-top:44px;">${d.name} Airbnb — Frequently Asked Questions</h2>
          <div style="margin-top:24px;">${faqBlock(faqs)}</div>
          <div class="author-box reveal">
            <div class="avatar">AI</div>
            <div><h4>airbnb-india.com editors</h4><p>We pull live Airbnb listings into curated, city-level guides — then link you straight to protected booking on Airbnb.</p></div>
          </div>
          <h2 class="section-title" style="margin-top:44px;">Related Guides</h2>
          <div class="blog-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
            ${related.map((r) => postCard(r, "../")).join("\n")}
          </div>
        </div>
      </div>
    </section>
  </main>
  ` + tail("../"));
  }
  }
}

function genDetailsPosts() {
  for (const l of LISTINGS) {
    const dest = firstN(l);
    const d = dest || { name: l.city, state: l.state || "" };
    const p = buildPosts().find((x) => x.listing && x.listing.slug === l.slug);
    if (!p) continue;
    const tierPosts = TIERS.map((t) => buildPosts().find((q) => q.tier === t && q.d && q.d.slug === (dest ? dest.slug : slug(l.city)))).filter(Boolean);
    const paras = formatDescription(l);
    if (!paras.length) paras.push(blurb(l));
    const facts = [
      l.price ? `from ${inr(l.price)}/night` : null,
      l.rating ? `★ ${l.rating} (${l.reviews || 0} reviews)` : null,
      l.guests ? `Sleeps ${l.guests}` : null,
      l.bedrooms ? `${l.bedrooms} bedrooms` : null,
      l.beds ? `${l.beds} beds` : null,
      l.baths ? `${l.baths} bathrooms` : null,
      l.type ? l.type : null
    ].filter(Boolean);
    const ld = [
      { "@context": "https://schema.org", "@type": "BlogPosting", headline: p.title, image: p.img, url: SITE + "/" + p.url, datePublished: p.date, dateModified: p.date, author: { "@type": "Organization", name: "airbnb-india.com", url: SITE }, publisher: { "@type": "Organization", name: "airbnb-india.com", url: SITE, logo: SITE + "/img/logo.svg" }, description: p.excerpt, mainEntityOfPage: SITE + "/" + p.url },
      breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: "Blog", item: SITE + "/blog/index.html" }, { name: p.title, item: SITE + "/" + p.url }])
    ];
    write(`blog/${p.slug}.html`, head({
      title: p.title,
      desc: fit(`${p.excerpt} See photos, amenities, ratings and live pricing for this ${(l.type || "Airbnb").toLowerCase()} in ${l.city}${listStateSuffix(l)} — book securely on Airbnb.`, 158),
      canonical: SITE + `/blog/${p.slug}.html`,
      image: p.img,
      jsonld: ld,
      ogType: "article",
      keywords: keywordsFor(l).join(", "),
      dateModified: fmtDateIso(l.listedAt || today())
    }) + `
  <main id="main-content">
    <section class="page-hero">
      <div class="page-hero-orb one"></div><div class="page-hero-orb two"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="../index.html">Home</a><span class="sep">›</span><a href="../blog/index.html">Blog</a><span class="sep">›</span><span>${esc(p.title)}</span></nav>
        <span class="eyebrow eyebrow--light">${l.type || "Airbnb"} · ${l.city}${l.state ? ", " + l.state : ""}</span>
        <h1>${esc(p.title)}</h1>
        <p>${blurb(l)}</p>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="article-wrap">
          <div class="article-hero-cover reveal"><img src="${l.cover}" alt="${esc(cleanName(l.name))} — ${l.type || "Airbnb"} in ${l.city}" width="900" height="500"></div>
          <div class="article-meta reveal">
            <span class="author-chip"><span class="avatar">${esc((cleanName(l.name) || "?").charAt(0))}</span>${esc(l.host || "Verified Airbnb host")}</span>
            <span>${p.date}</span><span>${l.city}${l.state ? ", " + l.state : ""}</span>
          </div>
          <div class="article-body">
            <div class="fact-strip reveal" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px;">
              ${facts.map((f) => `<span class="amen-chip">${esc(f)}</span>`).join("\n")}
            </div>
            ${paras.map((x) => `<p>${esc(x)}</p>`).join("\n")}
            <p><strong>Book this stay:</strong> open the official Airbnb listing for live pricing, exact availability and secure checkout.</p>
            <p><a class="btn btn-primary btn-lg" data-airbnb href="${l.url}" target="_blank" rel="nofollow noopener">${l.price ? "Book this " + l.type + " on Airbnb" : "Check Price on Airbnb"}</a></p>
          </div>
          <h2 class="section-title" style="margin-top:44px;">Photos</h2>
          <div class="gallery-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));margin-top:20px;">
            ${(l.images || []).slice(0, 6).map((g, i) => `<figure class="gal-thumb" style="margin:0;"><img src="${g}" alt="${esc(cleanName(l.name))} — photo ${i + 1}" loading="lazy"></figure>`).join("\n")}
          </div>
          <h2 class="section-title" style="margin-top:44px;">More About ${d.name}</h2>
          <div class="article-body">
            <p>Browse more verified stays, budget picks and luxury villas in ${d.name}${d.state ? ", " + d.state : ""} on our <a href="../destinations/${dest ? dest.slug : slug(l.city)}.html">${d.name} destination page</a>, or read the guides below.</p>
          </div>
          <h2 class="section-title" style="margin-top:44px;">Related Guides</h2>
          <div class="blog-grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));">
            ${tierPosts.map((r) => postCard(r, "../")).join("\n")}
          </div>
          <div class="author-box reveal">
            <div class="avatar">AI</div>
            <div><h4>airbnb-india.com editors</h4><p>Listing data is pulled live from Airbnb — photos, description, ratings and pricing are the property of the host and Airbnb.</p></div>
          </div>
        </div>
      </div>
    </section>
  </main>
  ` + tail("../"));
  }
}

/* ============================================================
   MISC + SITEMAP + ROBOTS
   ============================================================ */
function genMisc() {
  const legalHead = (title, desc, file) => head({
    title: `${title} | airbnb-india.com`,
    desc,
    canonical: `${SITE}/${file}`,
    image: SITE + "/img/logo.svg",
    jsonld: [
      { "@context": "https://schema.org", "@type": "WebPage", name: `${title} | airbnb-india.com`, url: `${SITE}/${file}`, description: desc, publisher: { "@type": "Organization", name: "airbnb-india.com", url: SITE, logo: SITE + "/img/logo.svg" } },
      breadcrumbJson([{ name: "Home", item: SITE + "/" }, { name: title, item: `${SITE}/${file}` }])
    ]
  });
  const body = (content) => `<main id="main-content">
    <section class="page-hero">
      <div class="page-hero-orb one"></div><div class="page-hero-orb two"></div>
      <div class="container">
        <nav class="crumb" aria-label="Breadcrumb"><a href="index.html">Home</a><span class="sep">›</span><span>${content.title}</span></nav>
        <h1>${content.title}</h1>
      </div>
    </section>
    <section>
      <div class="container">
        <div class="article-wrap"><div class="article-body">${content.html}</div></div>
      </div>
    </section>
  </main>` + tail();
  const P = (t) => `<p>${t}</p>`;
  const H2 = (t) => `<h2>${t}</h2>`;
  const UL = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

  write("privacy.html", legalHead("Privacy Policy", "How airbnb-india.com collects, uses and protects visitor data, cookies and contact information.", "privacy.html") + body({
    title: "Privacy Policy",
    html: H2("1. Overview") + P("airbnb-india.com (\"we\", \"our\", \"the Website\") respects your privacy. This policy explains what information we collect, how we use it, and the choices you have. By using this Website you agree to this policy.") +
      H2("2. Information We Collect") + P("<strong>Information you provide:</strong> when you contact us via the contact form or email (" + EMAIL + "), we receive your name, contact details and message contents. When you list a BNB, we collect your property details and Airbnb listing link.") + P("<strong>Automatically collected:</strong> basic analytics data — pages visited, browser type, device type, approximate location and referral source — used only to improve the Website.") +
      H2("3. How We Use Information") + UL(["To respond to your enquiries and process BNB listings.", "To publish and maintain your property listing on the Website.", "To improve our content, search and user experience.", "To communicate updates about your listing."]) +
      H2("4. Cookies & Analytics") + P("We may use cookies and similar technologies for analytics and to remember preferences. You can disable cookies in your browser settings; the Website will still function.") +
      H2("5. Third-Party Links & Airbnb") + P("Listings link out to Airbnb. airbnb-india.com is not affiliated with, endorsed by, or a partner of Airbnb, Inc. When you follow a link to Airbnb, their privacy policy governs your data there.") +
      H2("6. Data Security") + P("We take reasonable measures to protect the information you send us. No transmission over the internet is 100% secure, and we cannot guarantee absolute security.") +
      H2("7. Your Rights") + P("You may request access to, correction of, or deletion of your personal information at any time by emailing " + EMAIL + ". Listing data you ask us to remove is deleted from the Website promptly.") +
      H2("8. Children") + P("The Website is not directed at children under 13 and we do not knowingly collect their personal information.") +
      H2("9. Changes") + P("We may update this policy from time to time; the latest version is always available on this page.") +
      H2("10. Contact") + P("Questions? Email <a href=\"mailto:" + EMAIL + "\">" + EMAIL + "</a> or call <a href=\"tel:+919336076006\">" + PHONE + "</a>.")
  }));

  write("terms.html", legalHead("Terms of Use", "Terms of use for airbnb-india.com — a discovery platform linking travellers to Airbnb listings in India.", "terms.html") + body({
    title: "Terms of Use",
    html: H2("1. Acceptance of Terms") + P("By accessing airbnb-india.com you agree to these Terms of Use. If you do not agree, please do not use the Website.") +
      H2("2. The Service") + P("airbnb-india.com is a discovery and information platform. We curate and present bed &amp; breakfasts, homestays, villas and similar stays across India, and link out to their official Airbnb listings. <strong>We do not process bookings, payments or reservations.</strong> All bookings are completed on Airbnb under Airbnb's own terms.") +
      H2("3. No Affiliation") + P("airbnb-india.com is an independent website. It is not owned by, operated by, endorsed by, or affiliated with Airbnb, Inc. or its subsidiaries. \"Airbnb\" is a trademark of Airbnb, Inc.") +
      H2("4. Accuracy of Information") + P("We work to keep prices, ratings, amenities and descriptions accurate, but they are provided by hosts and may change without notice. Pricing shown is indicative. You must confirm price, availability, fees and policies on the Airbnb listing before booking.") +
      H2("5. Listings by Hosts") + P("Hosts submit their own property details. We may verify Airbnb links and basic information but do not guarantee the quality, legality or condition of any property. You interact with hosts at your own discretion.") +
      H2("6. User Conduct") + P("You agree not to misuse the Website, scrape it at scale, submit false listing information, or use it for unlawful purposes.") +
      H2("7. Intellectual Property") + P("The design, text, logos and graphics on this Website belong to airbnb-india.com. You may view and share links for personal, non-commercial use. You may not republish substantial portions without written permission.") +
      H2("8. Disclaimers") + P("The Website is provided \"as is\" without warranties of any kind, express or implied. We are not liable for loss arising from reliance on listing information, third-party sites, or interrupted availability.") +
      H2("9. Limitation of Liability") + P("To the maximum extent permitted by law, airbnb-india.com and its operators shall not be liable for any indirect, incidental or consequential damages arising from use of this Website or from any stay booked through links found here.") +
      H2("10. Governing Law") + P("These terms are governed by the laws of India. Disputes are subject to the jurisdiction of the courts of India.") +
      H2("11. Changes") + P("We may update these terms at any time. Continued use after changes constitutes acceptance.") +
      H2("12. Contact") + P("For questions, email <a href=\"mailto:" + EMAIL + "\">" + EMAIL + "</a> or call <a href=\"tel:+919336076006\">" + PHONE + "</a>.")
  }));

  write("404.html", `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Not Found (404) | airbnb-india.com</title>
  <meta name="description" content="The page you're looking for doesn't exist. Explore handpicked BNBs, homestays and villas across India instead.">
  <meta name="robots" content="noindex, follow">
  <meta name="theme-color" content="#0b2b26">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Page Not Found (404) | airbnb-india.com">
  <meta property="og:description" content="The page you're looking for doesn't exist. Explore handpicked BNBs, homestays and villas across India instead.">
  <meta property="og:url" content="${SITE}/404.html">
  <meta property="og:image" content="${SITE}/img/og-default.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Page Not Found (404) | airbnb-india.com">
  <meta name="twitter:description" content="The page you're looking for doesn't exist. Explore handpicked BNBs, homestays and villas across India instead.">
  <meta name="twitter:image" content="${SITE}/img/og-default.jpg">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <section class="hero" style="min-height:70vh;display:grid;align-items:center;">
    <div class="hero-orb orb-1"></div>
    <div class="hero-orb orb-2"></div>
    <div class="container" style="text-align:center;">
      <h1 style="font-size:clamp(5rem,20vw,11rem);line-height:1;">404</h1>
      <p class="lead" style="margin:10px auto 30px;max-width:520px;">That page packed its bags and left. But there are hundreds of amazing stays across India still waiting for you.</p>
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
        <a class="btn btn-primary btn-lg" href="index.html">Back to Home</a>
        <a class="btn btn-ghost btn-lg" href="destinations.html">Explore Destinations</a>
      </div>
    </div>
  </section>
  <script src="js/data.js"></script>
  <script src="js/main.js"></script>
</body>
</html>`);

  fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *
Allow: /
Disallow: /tools/

Sitemap: ${SITE}/sitemap.xml
`);
}

function genSitemap() {
  const posts = buildPosts();
  const pages = [
    "/destinations.html", "/bnbs.html", "/about.html", "/contact.html", "/list-your-bnb.html",
    "/privacy.html", "/terms.html",
    ...DESTINATIONS.map((d) => `/destinations/${d.slug}.html`),
    ...LISTINGS.map((l) => `/bnbs/${l.slug}.html`),
    "/blog/index.html",
    ...posts.map((p) => `/blog/${p.slug}.html`)
  ];
  const urls = pages.map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p.startsWith("/blog/") ? "0.7" : "0.8"}</priority>\n  </url>`).join("\n");
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n${urls}\n</urlset>\n`);
  console.log("sitemap entries:", pages.length);
}

/* ============================================================
   RUN
   ============================================================ */
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
  } else fs.mkdirSync(dir, { recursive: true });
}

function main() {
  cleanDir(path.join(ROOT, "destinations"));
  cleanDir(path.join(ROOT, "bnbs"));
  cleanDir(path.join(ROOT, "blog"));
  CONFIG.updatedAt = today();
  fs.writeFileSync(path.join(ROOT, "data", "config.json"), JSON.stringify(CONFIG, null, 2) + "\n");
  clientData();
  genIndex();
  genDestinations();
  genBnbs();
  genDestinationPages();
  genBnbPages();
  genBlogIndex();
  genTierPosts();
  genDetailsPosts();
  genMisc();
  genSitemap();
  console.log(`Site generated. ${LISTINGS.length} listings, ${DESTINATIONS.length} destinations, ${buildPosts().length} blog posts.`);
}
main();
