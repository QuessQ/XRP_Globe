/**
 * XRP Pulse — interactive globe of live XRP Ledger payment flows.
 * Rendering: globe.gl (Three.js). Data: js/feed.js (live XRPL stream or
 * simulation) + js/data.js (cities, wallets, holdings estimates).
 */

import {
  CITIES, CITY_HOLDINGS, CITY_ENTITIES, HOLDINGS, HOLDINGS_AS_OF, UNIDENTIFIED,
  TOTAL_SUPPLY_B, TIERS, classifyAmount,
} from './data.js';
import { PaymentFeed } from './feed.js';

const WHALE_XRP = 1_000_000;
const FLIGHT_MS = 2400;
const MAX_ARCS = 60;
const MIN_ARC_INTERVAL_MS = 200; // visual throttle; stats still count everything

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
  .arcColor(d => [d.tier.color.replace(/[\d.]+\)$/, '0.12)'), d.tier.head])
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
let minArcAmount = 0; // arc-size filter; stats always count everything

function spawnArc(p) {
  const now = performance.now();
  const whale = p.amountXRP >= WHALE_XRP;
  if (p.amountXRP < minArcAmount) return;
  if (!whale && now - lastArcAt < MIN_ARC_INTERVAL_MS) return; // keep it readable
  lastArcAt = now;

  const sameCity = p.from.city.id === p.to.city.id;
  const stroke = Math.min(1.5, 0.18 + 0.22 * Math.max(0, Math.log10(p.amountXRP) - 1));

  if (!sameCity) {
    const arc = {
      startLat: p.from.city.lat, startLng: p.from.city.lng,
      endLat: p.to.city.lat, endLng: p.to.city.lng,
      whale, stroke, tier: classifyAmount(p.amountXRP),
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
const tierStats = new Map(TIERS.map(t => [t.id, { count: 0, volume: 0 }]));
const exFlow = { in: 0, out: 0, txIn: 0, txOut: 0 }; // vs identified exchange wallets
const whaleLog = [];
const ledgerLog = []; // every observed payment, for CSV export
const LEDGER_LOG_MAX = 20000;

function onPayment(p) {
  stats.count++;
  stats.volume += p.amountXRP;
  if (p.amountXRP > stats.largest) stats.largest = p.amountXRP;

  const tier = classifyAmount(p.amountXRP);
  const ts = tierStats.get(tier.id);
  ts.count++; ts.volume += p.amountXRP;

  if (ledgerLog.length < LEDGER_LOG_MAX) {
    ledgerLog.push({ t: new Date().toISOString(), p, tier: tier.id });
  }

  // Exchange deposit/withdrawal detection (identified wallets only).
  // Deposits (→ exchange) read as potential sell-side pressure; withdrawals
  // (← exchange) read as accumulation into custody.
  const toEx = p.to.type === 'exchange';
  const fromEx = p.from.type === 'exchange';
  if (toEx && !fromEx) { exFlow.in += p.amountXRP; exFlow.txIn++; }
  if (fromEx && !toEx) { exFlow.out += p.amountXRP; exFlow.txOut++; }

  if (tier.id === 'whale') {
    whaleLog.unshift({ ...p, at: new Date() });
    if (whaleLog.length > 25) whaleLog.pop();
    renderWhaleLog();
  }

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

const sideLabel = (side) => side.entity || side.city.name + (side.known ? '' : '*');

function renderWhaleLog() {
  const el = $('whale-log');
  el.innerHTML = whaleLog.slice(0, 6).map(w =>
    `<li><span class="amt whale">${fmtXRP(w.amountXRP)} XRP</span>` +
    `<span class="tag">${w.live ? 'ledger' : 'sim'}</span><br>` +
    `<span class="route">${sideLabel(w.from)} → ${sideLabel(w.to)}</span> ` +
    `<span class="meta">${w.at.toLocaleTimeString()}</span>` +
    (w.hash ? ` <span class="meta"><a href="https://livenet.xrpl.org/transactions/${w.hash}" target="_blank" rel="noopener">tx ↗</a></span>` : '') +
    `</li>`).join('');
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
    `<span class="tag">${classifyAmount(p.amountXRP).label}</span>` +
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

  // Size-cohort mix: share of session volume per tier, with payment counts.
  if (stats.volume > 0) {
    const maxVol = Math.max(...TIERS.map(t => tierStats.get(t.id).volume), 1);
    $('tier-chart').innerHTML = TIERS.map(t => {
      const s = tierStats.get(t.id);
      const share = (s.volume / stats.volume * 100).toFixed(1);
      return `<div class="hbar">
        <div class="hbar-head">
          <span class="hbar-name">${t.label} <span class="loc">· ${s.count} tx</span></span>
          <span class="hbar-val">${fmtXRP(s.volume)} · ${share}%</span>
        </div>
        <div class="hbar-track"><div class="hbar-fill" style="width:${(s.volume / maxVol * 100).toFixed(1)}%;background:${t.head}"></div></div>
      </div>`;
    }).join('');
  }

  // Exchange deposit/withdrawal balance.
  $('ex-in').textContent = exFlow.txIn ? `${fmtXRP(exFlow.in)}` : '0';
  $('ex-out').textContent = exFlow.txOut ? `${fmtXRP(exFlow.out)}` : '0';
  const net = exFlow.in - exFlow.out;
  $('ex-net').innerHTML = (exFlow.txIn || exFlow.txOut)
    ? `<span class="${net >= 0 ? 'dir-out' : 'dir-in'}">${net >= 0 ? '+' : '−'}${fmtXRP(Math.abs(net))}</span>`
    : '–';
  $('ex-read').textContent = (exFlow.txIn || exFlow.txOut)
    ? (net > 0
        ? 'Net flow into exchanges — coins moving toward liquid markets (potential sell-side pressure).'
        : net < 0
          ? 'Net flow out of exchanges — coins moving to custody (accumulation signal).'
          : 'Exchange deposits and withdrawals are balanced.')
    : 'No payments touching identified exchange wallets yet this session.';

  // Net flow leaders: cities gaining / losing the most XRP this session.
  const flows = [...sessions.entries()]
    .map(([id, s]) => ({ id, net: s.in - s.out }))
    .filter(f => Math.abs(f.net) > 0)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 6);
  if (flows.length) {
    $('netflow').innerHTML = flows.map(f => {
      const c = cityPoints.find(x => x.id === f.id);
      const gain = f.net >= 0;
      return `<li><span class="route">${c.name}</span>` +
        `<span class="n" style="color:${gain ? 'var(--good)' : 'var(--whale)'}">${gain ? '+' : '−'}${fmtXRP(Math.abs(f.net))}</span></li>`;
    }).join('');
  }
}, 800);

// CSV export of everything observed this session, so a session can be taken
// into a spreadsheet or notebook rather than only watched.
$('export-csv').addEventListener('click', () => {
  if (!ledgerLog.length) return;
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ['timestamp_utc', 'amount_xrp', 'tier', 'from_entity', 'from_city', 'from_country',
     'from_identified', 'to_entity', 'to_city', 'to_country', 'to_identified',
     'source', 'tx_hash'].join(','),
    ...ledgerLog.map(({ t, p, tier }) => [
      t, p.amountXRP, tier,
      p.from.entity || '', p.from.city.name, p.from.city.country, p.from.known,
      p.to.entity || '', p.to.city.name, p.to.city.country, p.to.known,
      p.live ? 'ledger' : 'simulated', p.hash || '',
    ].map(esc).join(',')),
  ].join('\n');

  const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `xrp-pulse-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Arc size filter buttons.
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    minArcAmount = Number(btn.dataset.min);
    document.querySelectorAll('.filter-btn').forEach(b =>
      b.setAttribute('aria-pressed', String(b === btn)));
  });
});

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
  $('holdings-asof').textContent = HOLDINGS_AS_OF;

  // Holder-type rollup: institutional (Ripple treasury/escrow), exchange
  // reserves (custodial, effectively retail+institutional client funds),
  // and the unlocatable self-custody remainder.
  const instB = HOLDINGS.filter(h => h.entity.startsWith('Ripple')).reduce((s, h) => s + h.billions, 0);
  const exB = HOLDINGS.filter(h => !h.entity.startsWith('Ripple')).reduce((s, h) => s + h.billions, 0);
  const types = [
    ['Institutional — Ripple treasury & escrow', instB],
    ['Exchange reserves (custodial client funds)', exB],
  ];
  const tmax = Math.max(instB, exB, UNIDENTIFIED.billions);
  $('type-chart').innerHTML =
    types.map(([name, b]) => bar(name, '', b, tmax)).join('') +
    bar('Self-custody & unidentified', '', UNIDENTIFIED.billions, tmax, true);

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
