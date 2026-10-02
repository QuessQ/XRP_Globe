import { BANDS, COHORTS, SNAPSHOTS } from './distribution-data.js';

const COLORS = ['#3987e5', '#199e70', '#c98500', '#9085e9', '#d55181'];
const $ = (id) => document.getElementById(id);

const fmtInt = (n) => n.toLocaleString('en-US');
function fmtXrp(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'bn';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return n.toFixed(0);
}
const totalHeld = (s) => s.bands.reduce((t, b) => t + b[1], 0);
const pct = (v, t) => (100 * v) / t;
const fmtPct = (p) => (p < 0.01 ? '<0.01%' : p.toFixed(2) + '%');
const fmtDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

function delta(cur, prev, fmt, unit = '') {
  if (prev == null) return '';
  const d = cur - prev;
  if (Math.abs(d) < 1e-9) return '<span class="delta">0</span>';
  const cls = d > 0 ? 'delta-up' : 'delta-down';
  return `<span class="delta ${cls}">${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}${unit}</span>`;
}

function renderTiles(cur, prev) {
  const avg = (s) => totalHeld(s) / s.totalAccounts;
  const top = (s) => pct(s.bands[15][1] + s.bands[16][1], totalHeld(s));
  const tiles = [
    ['Funded accounts', fmtInt(cur.totalAccounts), delta(cur.totalAccounts, prev?.totalAccounts, fmtInt)],
    ['Avg XRP / account', fmtInt(Math.round(avg(cur))), prev ? delta(avg(cur), avg(prev), (v) => fmtInt(Math.round(v))) : ''],
    ['Held by 100M+ accounts', top(cur).toFixed(2) + '%', prev ? delta(top(cur), top(prev), (v) => v.toFixed(2), ' pp') : ''],
  ];
  $('dist-tiles').innerHTML = tiles.map(([l, v, d]) =>
    `<div class="tile"><span class="tile-label">${l}</span><span class="tile-value">${v}</span>${d}</div>`).join('');
}

function renderTable(cur, prev) {
  const tc = totalHeld(cur), tp = prev && totalHeld(prev);
  const head = `<thead><tr><th>Band (XRP)</th><th>Accounts</th><th>Δ</th><th>XRP held</th><th>Δ</th><th>% of XRP</th><th>Δ pp</th></tr></thead>`;
  const rows = BANDS.map((name, i) => {
    const [acc, held] = cur.bands[i];
    const p = pct(held, tc);
    const pa = prev?.bands[i];
    const hi = p >= 10 ? ' class="dist-hi"' : '';
    return `<tr><td>${name}</td><td>${fmtInt(acc)}</td><td>${pa ? delta(acc, pa[0], fmtInt) : ''}</td>` +
      `<td>${fmtXrp(held)}</td><td>${pa ? delta(held, pa[1], fmtXrp) : ''}</td><td${hi}>${fmtPct(p)}</td>` +
      `<td>${pa ? delta(p, pct(pa[1], tp), (v) => v.toFixed(2)) : ''}</td></tr>`;
  }).join('');
  $('dist-table').innerHTML = head + `<tbody>${rows}</tbody>`;
}

function renderChart() {
  const W = 720, H = 260, L = 44, R = 16, T = 12, B = 28;
  const series = COHORTS.map((c) => SNAPSHOTS.map((s) => {
    const t = totalHeld(s);
    return pct(c.bands.reduce((a, i) => a + s.bands[i][1], 0), t);
  }));
  const max = Math.ceil(Math.max(...series.flat()) / 10) * 10;
  const n = SNAPSHOTS.length;
  const x = (i) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - v / max) * (H - T - B);

  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" width="100%" height="${H}">`;
  for (let v = 0; v <= max; v += 10) {
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--gridline)"/>` +
      `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="dist-axis">${v}%</text>`;
  }
  SNAPSHOTS.forEach((s, i) => {
    svg += `<text x="${x(i)}" y="${H - 8}" text-anchor="${n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}" class="dist-axis">${fmtDate(s.date)}</text>`;
  });
  series.forEach((pts, k) => {
    const d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
    svg += `<path d="${d}" fill="none" stroke="${COLORS[k]}" stroke-width="2"/>`;
    pts.forEach((v, i) => {
      svg += `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${COLORS[k]}"><title>${COHORTS[k].label} · ${fmtDate(SNAPSHOTS[i].date)}: ${v.toFixed(2)}%</title></circle>`;
    });
  });
  $('dist-chart').innerHTML = svg + '</svg>';
  $('dist-legend').innerHTML = COHORTS.map((c, k) =>
    `<span class="legend-item"><span class="swatch" style="background:${COLORS[k]}"></span>${c.label} · ${series[k][n - 1].toFixed(2)}%</span>`).join('');
}

function render() {
  const from = +$('dist-from').value, to = +$('dist-to').value;
  const cur = SNAPSHOTS[to];
  const prev = from === to ? null : SNAPSHOTS[from];
  $('dist-summary').textContent =
    `As of ${fmtDate(cur.date)} · ledger ${fmtInt(cur.ledger)} · ${SNAPSHOTS.length} snapshot${SNAPSHOTS.length > 1 ? 's' : ''} tracked` +
    (prev ? ` · changes vs ${fmtDate(prev.date)}` : '');
  renderTiles(cur, prev);
  renderTable(cur, prev);
}

const opts = SNAPSHOTS.map((s, i) => `<option value="${i}">${fmtDate(s.date)}</option>`).join('');
$('dist-from').innerHTML = opts;
$('dist-to').innerHTML = opts;
$('dist-to').value = SNAPSHOTS.length - 1;
$('dist-from').value = Math.max(0, SNAPSHOTS.length - 2);
$('dist-from').onchange = $('dist-to').onchange = render;
function renderHistory() {
  const metric = $('hist-metric').value; // 0 = accounts, 1 = XRP held
  const fmt = metric === '0' ? fmtInt : fmtXrp;
  const head = '<thead><tr><th>Band (XRP)</th>' +
    SNAPSHOTS.map((s) => `<th>${fmtDate(s.date)}</th>`).join('') + '<th>Total Δ</th></tr></thead>';
  const row = (name, vals) => `<tr><td>${name}</td>` + vals.map((v, j) =>
    `<td>${fmt(v)}${j ? '<br>' + delta(v, vals[j - 1], fmt) : ''}</td>`).join('') +
    `<td>${vals.length > 1 ? delta(vals[vals.length - 1], vals[0], fmt) : ''}</td></tr>`;
  const rows = BANDS.map((name, i) => row(name, SNAPSHOTS.map((s) => s.bands[i][+metric])));
  const totals = SNAPSHOTS.map((s) => (metric === '0' ? s.totalAccounts : totalHeld(s)));
  $('hist-table').innerHTML = head + `<tbody>${rows.join('')}${row('<strong>Total</strong>', totals)}</tbody>`;
}

$('hist-metric').onchange = renderHistory;
renderChart();
renderHistory();
render();
