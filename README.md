# XRP Pulse — Global Ledger Flows

An interactive, dark-themed 3D globe visualizing XRP payments flowing between
cities in real time, with an estimate of where the XRP supply is held.

![status](https://img.shields.io/badge/deps-none%20(vendored)-blue) ![stack](https://img.shields.io/badge/stack-static%20HTML%2FJS-informational)

## Features

- **Rotating night-earth globe** (globe.gl / Three.js) — drag to rotate, scroll
  to zoom, click a city for a detail card with holdings and session flow stats.
- **Live payment stream** — connects to the public XRP Ledger websocket cluster
  (`xrplcluster.com`, `s1/s2.ripple.com`) and animates every validated XRP
  payment as a glowing arc; whale payments (≥ 1M XRP) glow magenta with a
  larger impact ripple.
- **Simulation fallback** — if the websocket can't be reached, the app switches
  to a statistical simulation built from the same corridor weights (badge shows
  `SIMULATED` instead of `LIVE`).
- **Live activity panel** — payments seen, XRP moved, payments/min, largest
  payment, top corridors, and a scrolling payment feed with explorer links.
- **Holdings estimate panel** — bar charts of estimated XRP holdings by entity
  and by region, with a computed headline of where the majority sits, a table
  view, and a methodology note.

## Run it

It's a fully static site — no build step, no external CDN (the globe library
and earth textures are vendored):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

or deploy the repo as-is to GitHub Pages / any static host.

> Note: it must be served over HTTP(S) (not opened as a `file://` URL) because
> the app uses ES modules.

## How the geography works (honest caveats)

XRP transactions carry **no geographic data**. This app:

1. Maps **known exchange / institutional wallets** to the entity's home city
   (best-effort attributions in `js/data.js` — edit freely).
2. Places **unidentified wallets** at a deterministic, weighted-random city
   (weights approximate regional XRP exchange activity). These are marked with
   an asterisk in the feed and described as *estimated*.

Holdings figures combine Ripple's published escrow balance with public
rich-list / exchange-reserve snapshots — order-of-magnitude estimates, not
audited figures. The "self-custody & unidentified" remainder (~45% of supply)
cannot be located at all.

## Project layout

```
index.html        page shell + panels
css/style.css     dark theme (validated data-viz palette)
js/data.js        cities, known wallets, holdings estimates  ← edit data here
js/feed.js        XRPL websocket client + simulation fallback
js/app.js         globe rendering, arcs, stats, charts
vendor/           globe.gl (vendored, see vendor/globe.gl-LICENSE)
assets/           earth night / topology / star-field textures (from three-globe)
```
