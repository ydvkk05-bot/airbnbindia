/* ============================================================
   fetch-listing.js — Airbnb listing detail fetcher
   Given any public Airbnb room link, extracts everything that is
   reliably available from the public listing page:
     name, type, city/state, rating, reviews, guests, beds/baths,
     description, cover photo + gallery, lat/lng, host (best-effort)
     and price (best-effort — Airbnb loads it client-side).

   Strategy:
     1. Extract the numeric listing id from the URL.
     2. Follow Airbnb's country-domain handoff (airbnb.com -> .co.in).
     3. Parse the niobeClientData JSON (StayEmbedData block) — the
        most reliable server-side source.
     4. Parse og:title / meta description as fallbacks.
     5. Price via embedded JSON pricingRate, else rupee/night pattern,
        else null (pages show "Check price on Airbnb").
   ============================================================ */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const ROOM_RE = /\/rooms\/(\d+)/i;
const HOST_RE = /^https?:\/\/(?:www\.)?airbnb\.[a-z.]+\/(?:rooms|s\/)/i;

/* common Indian city -> state map used to derive state for auto-location */
const INDIA_STATE = {
  "north goa": "Goa", "south goa": "Goa", goa: "Goa", candolim: "Goa", calangute: "Goa", baga: "Goa", anjuna: "Goa",
  "vaga tor": "Goa", "assagao": "Goa", palolem: "Goa", "morjim": "Goa", "varkala": "Kerala", "ashwem": "Goa",
  mumbai: "Maharashtra", pune: "Maharashtra", "lonavala": "Maharashtra", alibaug: "Maharashtra",
  delhi: "Delhi", "new delhi": "Delhi", gurgaon: "Haryana", gurugram: "Haryana", noida: "Uttar Pradesh",
  jaipur: "Rajasthan", udaipur: "Rajasthan", jodhpur: "Rajasthan", jaisalmer: "Rajasthan", pushkar: "Rajasthan", "bikaner": "Rajasthan",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysore: "Karnataka", mysuru: "Karnataka", coorg: "Karnataka",
  chennai: "Tamil Nadu", pondicherry: "Puducherry", ooty: "Tamil Nadu", kodaikanal: "Tamil Nadu", "mahabalipuram": "Tamil Nadu",
  hyderabad: "Telangana", goa_: "Goa",
  manali: "Himachal Pradesh", shimla: "Himachal Pradesh", kufri: "Himachal Pradesh", mcleodganj: "Himachal Pradesh",
  dharamshala: "Himachal Pradesh", kasol: "Himachal Pradesh", bir: "Himachal Pradesh",
  alleppey: "Kerala", alappuzha: "Kerala", munnar: "Kerala", kochi: "Kerala", cochin: "Kerala", kumarakom: "Kerala",
  kovalam: "Kerala", thekkady: "Kerala", wayanad: "Kerala", fortcochin: "Kerala",
  rishikesh: "Uttarakhand", nainital: "Uttarakhand", mussoorie: "Uttarakhand", dehradun: "Uttarakhand",
  darjeeling: "West Bengal", gangtok: "Sikkim", shillong: "Meghalaya",
  varanasi: "Uttar Pradesh", agra: "Uttar Pradesh", lucknow: "Uttar Pradesh",
  amritsar: "Punjab", chandigarh: "Punjab",
  ahmedabad: "Gujarat", "kutch": "Gujarat", "daman": "Daman and Diu", "khajuraho": "Madhya Pradesh",
  "benaulim": "Goa", "colva": "Goa", "margao": "Goa", "parra": "Goa", "siolim": "Goa", "assagao": "Goa", "arvem": "Goa", "betalbatim": "Goa",
  "puri": "Odisha", "bhubaneswar": "Odisha", "mc mcleodganj": "Himachal Pradesh",
  "chikmagalur": "Karnataka", "hampi": "Karnataka", "gokarna": "Karnataka",
  "auli": "Uttarakhand", "jim corbett": "Uttarakhand", "ranikhet": "Uttarakhand",
  "andaman": "Andaman and Nicobar Islands", "port blair": "Andaman and Nicobar Islands"
};

function extractId(url) {
  const m = String(url).match(ROOM_RE);
  return m ? m[1] : null;
}

function isValidAirbnbUrl(url) {
  return HOST_RE.test(String(url).trim());
}

function toSlug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function fetchHtml(url) {
  const headers = { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-IN,en;q=0.9" };
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) throw new Error("Airbnb returned HTTP " + res.status);
  let html = await res.text();
  /* country-domain handoff: airbnb.com -> airbnb.co.in (POST form) */
  const m = html.match(/action=["']https:\/\/([^"'\/]+)\/v2\/domain_switch\/handoff["']/);
  if (m) {
    const id = String(url).match(/\/rooms\/(\d+)/);
    const next = id ? "https://" + m[1] + "/rooms/" + id[1] : url;
    const res2 = await fetch(next, { headers, redirect: "follow" });
    if (!res2.ok) throw new Error("Airbnb (" + m[1] + ") returned HTTP " + res2.status);
    html = await res2.text();
  }
  return html;
}

function parseJsonBlocks(html) {
  const out = [];
  const re = /<script[^>]*type=["']application\/json[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const txt = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x2F;/g, "/");
    try { out.push(JSON.parse(txt)); } catch (e) { /* skip */ }
  }
  return out;
}

function collect(obj, key, acc = [], depth = 0) {
  if (obj == null || depth > 80) return acc;
  if (Array.isArray(obj)) { for (const v of obj) collect(v, key, acc, depth + 1); return acc; }
  if (typeof obj === "object") for (const [k, v] of Object.entries(obj)) { if (k === key) acc.push(v); collect(v, key, acc, depth + 1); }
  return acc;
}

function firstStr(v) { return typeof v === "string" && v.trim() ? v.trim() : null; }
function firstNum(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = Number(v.replace(/[^0-9.]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; }
  return null;
}

function getMeta(html, prop) {
  const a = html.match(new RegExp('<meta[^>]*property=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', "i"));
  const b = html.match(new RegExp('<meta[^>]*name=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', "i"));
  const v = (a && a[1]) || (b && b[1]);
  return v ? v.trim() : null;
}

function extractStayEmbed(blocks) {
  for (const b of blocks) {
    const found = collect(b, "StayEmbedData").filter((v) => v && v.id && v.name);
    if (found.length) return found[0];
    const ss = collect(b, "shareSave").filter((v) => v && v.embedData);
    if (ss.length && ss[0].embedData.name) return ss[0].embedData;
  }
  return null;
}

function extractLatLng(html, blocks) {
  for (const b of blocks) {
    const la = collect(b, "latitude").map(firstNum).filter(Boolean);
    const lo = collect(b, "longitude").map(firstNum).filter(Boolean);
    if (la.length && lo.length) return { lat: la[0], lng: lo[0] };
  }
  const m = html.match(/"latitude":([-\d.]+),"longitude":([-\d.]+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

function extractImages(html) {
  const urls = [];
  const seen = new Set();
  const re = /https:\/\/a0\.muscache\.com\/im\/pictures\/[^\s"'<>]+/g;
  let m;
  while ((m = re.exec(html))) {
    let u = m[0];
    u = u.replace(/&amp;/g, "&").replace(/\?.*$/, "");
    u = u.replace(/[),;:]+$/, "");
    if (seen.has(u)) continue;
    seen.add(u);
    /* keep only real listing photos, drop UI assets / truncated paths */
    if (/favicon|search-bar|platform-assets|UserProfile|airbnb-platform-assets/i.test(u)) continue;
    if (!/\.(jpe?g|png|webp|avif)(\?.*)?$/i.test(u)) continue;
    if (!/Hosting-|\/original\/|miso|pro_photo|pictures/i.test(u)) continue;
    urls.push(u);
  }
  return urls.slice(0, 12);
}

function deriveState(city) {
  if (!city) return null;
  const k = city.trim().toLowerCase().replace(/\s+/g, " ");
  if (INDIA_STATE[k]) return INDIA_STATE[k];
  const parts = k.split(/[ -]/);
  for (const p of parts) if (INDIA_STATE[p]) return INDIA_STATE[p];
  return null;
}

async function fetchListing(inputUrl) {
  const url = String(inputUrl).trim();
  if (!isValidAirbnbUrl(url)) return { ok: false, error: "That doesn't look like an Airbnb listing link. Send a link in the form https://www.airbnb.com/rooms/12345678" };
  const id = extractId(url);
  if (!id) return { ok: false, error: "Could not find a listing id in that link (expected /rooms/{id})." };

  const html = await fetchHtml("https://www.airbnb.com/rooms/" + id);
  const blocks = parseJsonBlocks(html);
  const embed = extractStayEmbed(blocks);
  const ogTitle = getMeta(html, "og:title") || "";
  const metaDesc = getMeta(html, "description") || "";
  const ogImg = getMeta(html, "og:image");

  const d = {
    ok: true, id, url: "https://www.airbnb.com/rooms/" + id,
    name: null, type: null, city: null, state: null, country: "India",
    address: null, price: null, currency: "INR", rating: null, reviews: null,
    guests: null, bedrooms: null, beds: null, baths: null,
    host: null, amenities: [], description: "", images: [], cover: null, lat: null, lng: null
  };

  if (embed) {
    d.name = firstStr(embed.name) || d.name;
    d.type = firstStr(embed.propertyType) || d.type;
    d.rating = firstNum(embed.starRating) || d.rating;
    d.reviews = firstNum(embed.reviewCount) || d.reviews;
    d.guests = firstNum(embed.personCapacity) || d.guests;
    d.cover = firstStr(embed.pictureUrl) || d.cover;
  }
  if (d.name) d.name = d.name.replace(/\s+/g, " ").trim();

  /* og:title e.g. "Villa in North Goa · ★4.63 · 3 bedrooms · 3 beds · 3 bathrooms" */
  const ogParts = ogTitle.split("·").map((s) => s.trim()).filter(Boolean);
  if (!d.city && ogParts.length) {
    const inMatch = ogParts[0].match(/^(.+?)\s+in\s+(.+)$/);
    if (inMatch) d.city = inMatch[2].trim().replace(/,?\s*India$/i, "");
  }
  const bedM = ogTitle.match(/(\d+)\s+bedrooms?/i); if (bedM) d.bedrooms = Number(bedM[1]);
  const bedM2 = ogTitle.match(/·\s*(\d+)\s+beds?\b/i); if (bedM2) d.beds = Number(bedM2[1]);
  const bathM = ogTitle.match(/(\d+)\s+bathrooms?/i); if (bathM) d.baths = Number(bathM[1]);
  const rateM = ogTitle.match(/★\s*([\d.]+)/i); if (rateM) d.rating = Number(rateM[1]);

  /* meta description e.g. "13 Aug 2026 · Entire villa · Nestled in ..." */
  const descParts = metaDesc.split("·").map((s) => s.trim()).filter(Boolean);
  if (descParts.length) {
    if (!d.type && descParts[1]) d.type = descParts[1];
    if (!d.description && descParts[2]) d.description = descParts[2];
  }

  /* state from city map, else reverse-geocode from coordinates */
  d.state = deriveState(d.city) || null;

  /* lat/lng */
  const ll = extractLatLng(html, blocks);
  if (ll) { d.lat = ll.lat; d.lng = ll.lng; }

  if (!d.state && d.lat && d.lng) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      const g = await fetch(
        "https://nominatim.openstreetmap.org/reverse?lat=" + d.lat + "&lon=" + d.lng + "&format=jsonv2&accept-language=en",
        { headers: { "User-Agent": "airbnb-india.com listing bot (contact: " + "jayantydavrbl558@gmail.com)" }, signal: ctrl.signal }
      );
      clearTimeout(to);
      if (g.ok) {
        const geo = await g.json();
        const ad = geo.address || {};
        d.state = ad.state || ad.state_district || ad.region || null;
        if (!d.city && (ad.city || ad.town || ad.village)) d.city = ad.city || ad.town || ad.village;
        if (ad.country && /India/i.test(ad.country)) d.country = "India";
      }
    } catch (e) { /* geocode optional */ }
  }

  /* address: Airbnb hides full street address — city-level only */
  d.address = [d.city, d.state, d.country].filter(Boolean).join(", ") || d.city;

  /* host */
  const hostVals = collect(blocks, "hostName").map(firstStr).filter(Boolean)
    .concat(collect(blocks, "firstName").map(firstStr).filter(Boolean));
  d.host = hostVals[0] || null;
  /* price: embedded pricingRate -> rupee/night pattern -> null */
  const pr = collect(blocks, "pricingRate").concat(collect(blocks, "priceRate")).map(firstNum).filter(Boolean);
  if (pr.length) d.price = Math.round(pr[0]);
  if (!d.price) {
    const m = html.match(/₹\s?([\d,]+)[^₹\n]{0,60}?\/?\s?night/i);
    if (m) d.price = Number(m[1].replace(/,/g, ""));
  }
  if (d.price) d.price = Math.round(d.price);

  /* images */
  d.images = extractImages(html);
  d.cover = d.cover || d.images[0] || ogImg || null;

  const missing = [];
  if (!d.name) missing.push("name");
  if (!d.city) missing.push("city");
  if (!d.cover) missing.push("photos");
  if (missing.length) {
    return { ok: false, error: "Fetched the listing but couldn't extract " + missing.join(", ") + ". Airbnb may have changed its layout — try a different link." };
  }

  d.slug = (toSlug(d.city) || "stay") + "-" + id;
  return { ok: true, listing: d };
}

module.exports = { fetchListing, extractId, isValidAirbnbUrl, toSlug };
