# airbnb-india.com

Automated Airbnb listing site: a Telegram bot ingests Airbnb links, a scraper
pulls the listing data, and a generator rebuilds a static, SEO-ready site
(destination pages, per-BNB detail pages, best/cheap/luxury blog guides) from a
`data/` store.

## How it works

```
Telegram bot ──(Airbnb link)──► tools/fetch-listing.js ──► data/listings/*.json
                                                                │
                             data/destinations.json ◄── data-store.js
                                                                │
                          node tools/gen-site.js ◄──────────────┘
                                │
                       static site (HTML) ──► EdgeOne Pages (repo deploy)
```

- `tools/fetch-listing.js` — scrapes a public Airbnb room page (name, type,
  city/state, rating, reviews, guests, beds/baths, description, photos,
  lat/lng, best-effort price). Airbnb hides exact street addresses and loads
  prices client-side, so pages show "Check price on Airbnb" when price/address
  aren't available.
- `tools/data-store.js` — read/write of `data/` + site regeneration.
- `tools/gen-site.js` — full static generator (run: `node tools/gen-site.js`).
- `bot/bot.js` — Telegram long-polling bot (zero npm dependencies).

## Setup

1. Install Node 18+.
2. `npm install` is **not** required (zero dependencies).
3. Create `.env` from `.env.example`:
   - `BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
   - `ADMIN_ID` — your numeric Telegram id
   - `GIT_AUTOPUSH=1` — optional, auto push after each change
4. Run the bot: `node bot/bot.js`

## Bot commands

| Command | What it does |
|---|---|
| `/listbnb <link>` | Fetches the Airbnb link and publishes the listing (auto creates destination page + detail page + blog post) |
| `/update <link\|slug>` | Re-fetches and refreshes an existing listing |
| `/delete <link\|slug>` | Removes a listing |
| `/list` | Lists all current listings |
| `/help` | Help text |

A bare `https://www.airbnb.com/rooms/...` link works like `/listbnb`.

Every command regenerates the site immediately. With `GIT_AUTOPUSH=1` it also
commits and pushes, so EdgeOne Pages re-deploys automatically.

## Deploying on EdgeOne (free)

1. Push this repo to GitHub/Gitea/GitLab.
2. In Tencent EdgeOne Pages: **Create project → link the repo** (static build).
3. Build command: leave empty (static site, pre-generated) — or use
   `node tools/gen-site.js` if you rebuild in CI.
4. Output directory: `/`.
5. Every time the bot pushes a change, EdgeOne re-deploys the new site.

For a fixed hostname + custom domain on EdgeOne Pages, set your domain in
`data/config.json` (`siteUrl`) so the generator writes correct canonical URLs.

## Project structure

```
bot/bot.js                  Telegram bot
tools/fetch-listing.js      Airbnb scraper
tools/data-store.js         data/ read-write + regen helper
tools/gen-site.js           static site generator
tools/images.js             verified Unsplash image registry
data/config.json            site config (siteUrl, email, phone…)
data/destinations.json      auto-created destinations (city-level)
data/listings/*.json        one file per Airbnb listing
js/data.js                  auto-generated client search index
```

## Notes

- The site is an independent discovery platform; it is **not** affiliated with
  Airbnb, Inc. All bookings happen on Airbnb.
- Listing content is copied from the public Airbnb listing page and may change;
  prices/ratings are refreshed on every `/update`.
- `data/` is committed to the repo so the generator always has the full store.
