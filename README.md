# 🐾 PawFinder — Community Lost & Found Pet Network

> Every lost pet deserves a way home.

**PawFinder** turns the scattered "have you seen my dog?" posts spread across
social media, flyers, and group chats into one living map. Report a lost or
found animal in under a minute, and PawFinder's matching engine instantly
surfaces the sightings most likely to be *your* pet — then lets you generate a
printable alert poster to rally the neighborhood.

Built for **[AnimalHack 2026](https://animalhack2026.devpost.com/)** — an
international hackathon for animal welfare and human–animal relationships.

**🔗 Live demo:** _added after deploy — see below_

---

## The problem

Millions of pets go missing every year. The information that would reunite them
is out there — a neighbor saw a scared tan dog under a bandstand, someone is
feeding a friendly grey tabby by the laundromat — but it's fragmented across a
dozen platforms and never connects with the frantic owner two streets away.
There's no shared, structured, *matchable* place for "lost" and "found" to meet.

## The solution

PawFinder is a single, map-first network where:

- **Reporting takes under a minute.** Add a photo, drop a pin where the pet was
  last seen, describe them. No account required — lowering friction is the whole
  point when every hour counts.
- **Matching is automatic.** Every lost report is scored against every found
  sighting by **species, color, breed, description, and geographic distance**,
  and the strongest candidates are surfaced with a confidence percentage.
- **Alerts spread fast.** One click generates a printable **alert poster** (PNG)
  with the pet's photo, details, last-seen location, and contact info.
- **The map stays hopeful.** When a pet gets home, mark the report **reunited**
  so the community sees the wins.

## Features

| Feature | What it does |
| --- | --- |
| 🗺️ **Live sighting map** | Interactive neighborhood map; every pin is a report, color-coded lost / found / reunited. Tap a pin for details + matches. |
| ⚡ **One-minute reporting** | Guided form with photo upload and a click-to-drop location pin. |
| ✨ **Matching engine** | Scores lost↔found pairs on species, color, breed, description & distance; shows ranked matches with a confidence score. |
| 🔎 **Browse & filter** | Full-text search plus filters by status and species. |
| 🖼️ **Alert poster export** | Generates a shareable/printable PNG poster on a `<canvas>`. |
| ✅ **Mark reunited** | Close the loop and celebrate reunions. |
| 💾 **Persistent** | Reports persist in the browser via `localStorage`; ships with realistic seed data. |

## How the matching works

For a given report, PawFinder scans all **opposite-status** reports and scores
each candidate (see [`app.js`](./app.js), `scoreMatch()`):

```
species must match          → otherwise score 0
+ base similarity           (same species)
+ color token overlap       (e.g. "grey tabby" ↔ "grey striped")
+ breed token overlap
+ description / area overlap
+ proximity                 (closer last-seen pins score higher)
→ clamped to a 0–99% confidence, ranked, top matches shown
```

Example from the seed data: **Mochi** (lost Shiba Inu, red harness, Maple Park)
matches a **found tan dog with a red harness under the Maple Park bandstand** at
**73%**.

## Tech

Deliberately **dependency-free and self-contained** — plain HTML, CSS, and
vanilla JavaScript, no build step and no external requests. That makes it
instant to load, easy to audit, resilient, and trivially deployable as a static
site. The map is a hand-built inline SVG with an absolute-positioned marker
layer; posters are rendered with the Canvas API; state lives in `localStorage`.

```
index.html    — structure & markup
styles.css    — design system & responsive layout
data.js       — seed reports
app.js        — state, matching engine, map, modals, poster export
vercel.json   — static hosting config
```

## Run locally

No build needed. Serve the folder with any static server:

```bash
# Python
python3 -m http.server 4321
# or Node
npx serve .
```

Then open <http://localhost:4321>. To reset the demo data, run
`PawFinder.reset()` in the browser console.

## Deploy

Static site — deploys as-is to Vercel, Netlify, GitHub Pages, or any static
host. This project is configured for **Vercel** (`vercel.json`).

## Roadmap

- Real geolocation + map tiles and address geocoding
- Photo similarity matching (breed/color from images)
- Push/email alerts when a new report matches an open one
- Shelter & vet-clinic integrations for intake scanning

## About

Created as a submission for **AnimalHack 2026**. Demo data is fictional and
stored only in the visitor's browser — no personal data is collected.

_🐾 Bring them home._
