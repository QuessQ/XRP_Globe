/**
 * XRP Pulse — interactive globe of live XRP Ledger payment flows.
 * Rendering: globe.gl (Three.js). Data: js/feed.js (live XRPL stream or
 * simulation) + js/data.js (cities, wallets, holdings estimates).
 */

import {
  CITIES, CITY_HOLDINGS, CITY_ENTITIES, HOLDINGS, UNIDENTIFIED, TOTAL_SUPPLY_B,
} from './data.js';
import { PaymentFeed } from './feed.js';

const WHALE_XRP = 1_000_000;
const FLIGHT_MS = 2400;
const MAX_ARCS = 60;
const MIN_ARC_INTERVAL_MS = 200; // visual throttle; stats still count everything

const COLOR_ARC = ['rgba(57,135,229,0.12)', 'rgba(140,200,255,0.9)'];
const COLOR_ARC_WHALE = ['rgba(213,81,129,0.18)', 'rgba(244,140,180,0.95)'];

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- formatting

function fmtXRP(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(n < 10 ? 2 : 0);
}
const pct = (b) => (b / TOTAL_SUPPLY_B * 100).toFixed(1) + '%';

// ---------------------------------------------------------------- globe

if (typeof Globe === 'undefined') {
  document.body.insertAdjacentHTML('beforeend',
    '<p style="position:fixed;inset:40% 10% auto;text-align:center;z-index:99">' +
    'Could not load the globe library (vendor/globe.gl.min.js missing).</p>');
  throw new Error('globe.gl failed to load');
}

const cityPoints = CITIES.map(c => ({
  ...c,
  holdings: CITY_HOLDINGS[c.id] || 0,
  entities: CITY_ENTITIES[c.id] || [],
}));

const sessions = new Map(); // cityId → { in, out, txIn, txOut }
const cityStats = (id) => {
  if (!sessions.has(id)) sessions.set(id, { in: 0, out: 0, txIn: 0, txOut: 0 });
  return sessions.get(id);
};

const world = Globe()($('globe'))
  .globeImageUrl('assets/earth-night.jpg')
  .bumpImageUrl('assets/earth-topology.png')
  .backgroundImageUrl('assets/night-sky.png')
  .atmosphereColor('#3987e5')
  .atmosphereAltitude(0.16)
  .pointsData(cityPoints)
  .pointColor(d => d.holdings > 0 ? 'rgba(140,200,255,0.95)' : 'rgba(57,135,229,0.75)')
  .pointAltitude(0.005)
  .pointRadius(d => Math.min(0.85, 0.16 + Math.sqrt(d.holdings) * 0.11))
  .pointLabel(d => {
    const s = sessions.get(d.id);
    return `<div class="gtip"><b>${d.name}</b> <span class="muted">${d.country}</span><br>` +
      (d.entities.length ? `${d.entities.join(', ')}<br>` : '') +
      (d.holdings ? `Est. holdings: <b>${d.holdings.toFixed(1)}B XRP</b> (${pct(d.holdings)})<br>` : '') +
      (s ? `<span class="muted">Session: ${fmtXRP(s.in)} in · ${fmtXRP(s.out)} out</span>` :
           '<span class="muted">No session activity yet</span>') +
      '</div>';
  })
  .onPointClick(showCityCard)
  .labelsData(cityPoints.filter(d => d.holdings >= 0.3))
  .labelText('name')
  .labelSize(0.55)
  .labelDotRadius(0)
  .labelColor(() => 'rgba(195,194,199,0.85)')
  .labelAltitude(0.012)
  .labelResolution(2)
  .arcsData([])
  .arcColor(d => d.whale ? COLOR_ARC_WHALE : COLOR_ARC)
  .arcStroke(d => d.stroke)
  .arcAltitudeAutoScale(0.42)
  .arcDashLength(0.45)
  .arcDashGap(1.6)
  .arcDashInitialGap(1)
  .arcDashAnimateTime(FLIGHT_MS)
  .arcsTransitionDuration(0)
  .ringsData([])
  .ringColor(d => t => `rgba(${d.whale ? '213,81,129' : '57,135,229'},${(1 - t) * 0.75})`)
  .ringMaxRadius(d => d.whale ? 4.5 : 2.6)
  .ringPropagationSpeed(3.2)
  .ringRepeatPeriod(9999);

world.pointOfView({ lat: 22, lng: -35, altitude: 2.3 }, 0);

const controls = world.controls();
controls.autoRotate = true;
controls.autoRotateSpeed = 0.55;
controls.enableDamping = true;

window.addEventListener('resize', () =>
  world.width(window.innerWidth).height(window.innerHeight));

// Pause rotation while the user interacts; resume after a quiet spell.
let rotateEnabled = true;
let resumeTimer = null;
$('globe').addEventListener('pointerdown', () => {
  controls.autoRotate = false;
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { controls.autoRotate = rotateEnabled; }, 12000);
});

$('toggle-rotate').addEventListener('click', (e) => {
  rotateEnabled = !rotateEnabled;
  controls.autoRotate = rotateEnabled;
  e.currentTarget.setAttribute('aria-pressed', String(rotateEnabled));
});

for (const [btnId, panelId] of [['toggle-left', 'panel-left'], ['toggle-right', 'panel-right']]) {
  $(btnId).addEventListener('click', (e) => {
    const collapsed = $(panelId).classList.toggle('collapsed');
    e.currentTarget.setAttribute('aria-pressed', String(!collapsed));
  });
}

// ---------------------------------------------------------------- arcs & rings

let arcs = [];
let rings = [];
let lastArcAt = 0;

function spawnArc(p) {
  const now = performance.now();
  const whale = p.amountXRP >= WHALE_XRP;
  if (!whale && now - lastArcAt < MIN_ARC_INTERVAL_MS) return; // keep it readable
  lastArcAt = now;

  const sameCity = p.from.city.id === p.to.city.id;
  const stroke = Math.min(1.5, 0.18 + 0.22 * Math.max(0, Math.log10(p.amountXRP) - 1));

  if (!sameCity) {
    const arc = {
      startLat: p.from.city.lat, startLng: p.from.city.lng,
      endLat: p.to.city.lat, endLng: p.to.city.lng,
      whale, stroke,
    };
    arcs.push(arc);
    if (arcs.length > MAX_ARCS) arcs.splice(0, arcs.length - MAX_ARCS);
    world.arcsData([...arcs]);
    setTimeout(() => {
      arcs = arcs.filter(a => a !== arc);
      world.arcsData([...arcs]);
    }, FLIGHT_MS * 2);
  }

  // Impact ripple at the destination when the pulse lands.
  setTimeout(() => {
    const ring = { lat: p.to.city.lat, lng: p.to.city.lng, whale };
    rings.push(ring);
    world.ringsData([...rings]);
    setTimeout(() => {
      rings = rings.filter(r => r !== ring);
      world.ringsData([...rings]);
    }, 1600);
  }, sameCity ? 0 : FLIGHT_MS);
}

// ---------------------------------------------------------------- stats & feed

const stats = { count: 0, volume: 0, largest: 0, started: Date.now() };
const corridors = new Map();

function onPayment(p) {
  stats.count++;
  stats.volume += p.amountXRP;
  if (p.amountXRP > stats.largest) stats.largest = p.amountXRP;

  const out = cityStats(p.from.city.id);
  out.out += p.amountXRP; out.txOut++;
  const inn = cityStats(p.to.city.id);
  inn.in += p.amountXRP; inn.txIn++;

  if (p.from.city.id !== p.to.city.id) {
    const key = `${p.from.city.name} → ${p.to.city.name}`;
    corridors.set(key, (corridors.get(key) || 0) + 1);
  }

  spawnArc(p);
  pushFeed(p);
}

let feedCount = 0;
function pushFeed(p) {
  const whale = p.amountXRP >= WHALE_XRP;
  // Don't churn the DOM on every retail payment once traffic is heavy.
  if (!whale && feedCount > 0 && p.amountXRP < 50 && Math.random() < 0.5) return;
  const feed = $('feed');
  feed.querySelector('.empty')?.remove();

  const label = (side) => side.entity
    ? side.entity
    : `${side.city.name}${side.known ? '' : '<span class="est">*</span>'}`;

  const li = document.createElement('li');
  li.innerHTML =
    `<span class="amt${whale ? ' whale' : ''}">${fmtXRP(p.amountXRP)} XRP</span>` +
    (whale ? ' 🐋' : '') + '<br>' +
    `<span class="route">${label(p.from)} → ${label(p.to)}</span><br>` +
    `<span class="meta">${new Date().toLocaleTimeString()} · ${p.live ? 'ledger' : 'simulated'}` +
    (p.hash ? ` · <a href="https://livenet.xrpl.org/transactions/${p.hash}" target="_blank" rel="noopener">tx ↗</a>` : '') +
    `</span>`;
  feed.prepend(li);
  feedCount++;
  while (feed.children.length > 10) feed.lastChild.remove();
}

setInterval(() => {
  $('stat-count').textContent = stats.count.toLocaleString();
  $('stat-volume').textContent = fmtXRP(stats.volume);
  $('stat-largest').textContent = stats.largest ? fmtXRP(stats.largest) : '–';
  const mins = (Date.now() - stats.started) / 60000;
  $('stat-rate').textContent = mins > 0.05 ? (stats.count / mins).toFixed(1) : '–';

  const top = [...corridors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (top.length) {
    $('corridors').innerHTML = top
      .map(([route, n]) => `<li><span class="route">${route}</span><span class="n">${n}</span></li>`)
      .join('');
  }
}, 800);

// ---------------------------------------------------------------- feed mode

const feed = new PaymentFeed(onPayment, (mode) => {
  const badge = $('mode-badge');
  badge.className = 'badge badge-' + (mode === 'live' ? 'live' : mode === 'sim' ? 'sim' : 'connecting');
  $('mode-text').textContent =
    mode === 'live' ? 'LIVE · XRP LEDGER' : mode === 'sim' ? 'SIMULATED' : 'CONNECTING…';
  badge.title = mode === 'live'
    ? 'Streaming validated payments from the public XRP Ledger websocket'
    : mode === 'sim'
      ? 'Ledger websocket unreachable — showing statistically simulated flows'
      : 'Connecting to the XRP Ledger…';
});
feed.start();

// ---------------------------------------------------------------- city card

function showCityCard(d) {
  const s = sessions.get(d.id);
  $('cc-name').textContent = `${d.name}, ${d.country}`;
  $('cc-entities').textContent = d.entities.length
    ? 'Known entities: ' + d.entities.join(', ')
    : 'No major identified custodians — traffic here is geo-estimated.';
  $('cc-holdings').textContent = d.holdings ? d.holdings.toFixed(2) + 'B XRP' : '—';
  $('cc-share').textContent = d.holdings ? pct(d.holdings) : '—';
  $('cc-in').textContent = s ? `${fmtXRP(s.in)} (${s.txIn} tx)` : '0';
  $('cc-out').textContent = s ? `${fmtXRP(s.out)} (${s.txOut} tx)` : '0';
  $('city-card').classList.remove('hidden');
  world.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.6 }, 900);
  controls.autoRotate = false;
  clearTimeout(resumeTimer);
  resumeTimer = setTimeout(() => { controls.autoRotate = rotateEnabled; }, 12000);
}
$('city-card-close').addEventListener('click', () => $('city-card').classList.add('hidden'));

// ---------------------------------------------------------------- holdings charts

function bar(name, loc, billions, max, other = false) {
  return `<div class="hbar">
    <div class="hbar-head">
      <span class="hbar-name">${name}${loc ? ` <span class="loc">· ${loc}</span>` : ''}</span>
      <span class="hbar-val">${billions.toFixed(billions < 1 ? 2 : 1)}B · ${pct(billions)}</span>
    </div>
    <div class="hbar-track"><div class="hbar-fill${other ? ' other' : ''}" style="width:${(billions / max * 100).toFixed(1)}%"></div></div>
  </div>`;
}

function renderHoldings() {
  const rows = [...HOLDINGS].sort((a, b) => b.billions - a.billions);
  const max = Math.max(rows[0].billions, UNIDENTIFIED.billions);
  $('holdings-chart').innerHTML =
    rows.map(h => {
      const city = h.cityId ? cityPoints.find(c => c.id === h.cityId) : null;
      return bar(h.entity, city ? city.name : 'various', h.billions, max);
    }).join('') +
    bar(UNIDENTIFIED.entity, '', UNIDENTIFIED.billions, max, true);

  // Region rollup (identifiable holdings only + the unknown remainder).
  const regions = new Map();
  for (const h of HOLDINGS) regions.set(h.region, (regions.get(h.region) || 0) + h.billions);
  const sorted = [...regions.entries()].sort((a, b) => b[1] - a[1]);
  const rmax = Math.max(sorted[0][1], UNIDENTIFIED.billions);
  $('region-chart').innerHTML =
    sorted.map(([r, b]) => bar(r, '', b, rmax)).join('') +
    bar('Unknown (self-custody)', '', UNIDENTIFIED.billions, rmax, true);

  const [topRegion, topB] = sorted[0];
  const ripple = HOLDINGS.filter(h => h.entity.startsWith('Ripple')).reduce((s, h) => s + h.billions, 0);
  const seoul = HOLDINGS.filter(h => h.cityId === 'sel').reduce((s, h) => s + h.billions, 0);
  $('region-headline').innerHTML =
    `Of the XRP that can be placed, the majority sits in <strong>${topRegion}</strong> ` +
    `(~${pct(topB)} of supply) — driven by Ripple's San Francisco treasury &amp; escrow ` +
    `(<strong>${pct(ripple)}</strong>). The largest exchange hub is <strong>Seoul</strong> ` +
    `(~${pct(seoul)}). The remaining <strong>${pct(UNIDENTIFIED.billions)}</strong> is ` +
    `self-custodied or unidentified and cannot be located.`;

  $('holdings-table').innerHTML =
    '<tr><th>Entity</th><th>Location</th><th>B XRP</th></tr>' +
    rows.map(h => {
      const city = h.cityId ? cityPoints.find(c => c.id === h.cityId) : null;
      return `<tr><td>${h.entity}</td><td>${city ? city.name : 'various'}</td><td>${h.billions.toFixed(2)}</td></tr>`;
    }).join('') +
    `<tr><td>${UNIDENTIFIED.entity}</td><td>unknown</td><td>${UNIDENTIFIED.billions.toFixed(2)}</td></tr>`;
}
renderHoldings();
