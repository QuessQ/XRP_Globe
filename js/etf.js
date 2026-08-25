/* XRP Pulse — US spot XRP ETF flows dashboard.
   All figures are a hand-compiled snapshot; every number carries its source below.
   Live values: https://sosovalue.com/assets/etf/us-xrp-spot and https://farside.co.uk/xrp/ */

const DATA = {
  asOf: "August 25, 2026",

  summary: [
    { label: "Past week (Aug 17–24)", value: 53.60, unit: "M", cls: "pos",
      sub: "Best week since May, extended by the Aug 24 print — SoSoValue" },
    { label: "Past month (Aug 2026, to 24th)", value: 53.47, unit: "M", cls: "pos",
      sub: "Reversed a near-flat first half of the month" },
    { label: "Since launch (Nov 2025)", value: 1550, unit: "M", cls: "pos",
      sub: "New record — ≈ $1.55B cumulative net inflow" },
    { label: "Total net assets", value: 1441, unit: "M", cls: "",
      sub: "Assets re-inflated as XRP rallied ~50% on the week" },
  ],

  // Combined monthly net flows, US$m (SoSoValue-based reporting).
  monthly: [
    { label: "Apr", value: 81.59 },
    { label: "May", value: 118.29 },
    { label: "Jun", value: 59.46 },
    { label: "Jul", value: 27.29 },
    { label: "Aug (to 24th)", value: 53.47 },
  ],

  // Individually reported trading days, August 2026, US$m.
  daily: [
    { label: "Aug 5", value: -3.58 },
    { label: "Aug 6", value: 3.45 },
    { label: "Aug 18", value: 5.81 },
    { label: "Aug 20", value: 13.24 },
    { label: "Aug 21", value: 18.38 },
    { label: "Aug 24", value: 13.82 },
  ],

  funds: [
    { name: "Bitwise XRP ETF", ticker: "XRP", exchange: "NYSE", launched: "Nov 20, 2025",
      fee: "0.34%", cumulative: 542.69, note: "Flow leader most weeks, incl. Aug 24's $8.25M" },
    { name: "Canary XRP ETF", ticker: "XRPC", exchange: "Nasdaq", launched: "Nov 13, 2025",
      fee: "0.50%", cumulative: 468.12, note: "First US spot XRP ETF" },
    { name: "Franklin XRP ETF", ticker: "XRPZ", exchange: "NYSE Arca", launched: "Nov 24, 2025",
      fee: "0.19%", cumulative: 434.16, note: "Lowest base fee" },
    { name: "Grayscale XRP Trust ETF", ticker: "GXRP", exchange: "NYSE Arca", launched: "Nov 24, 2025",
      fee: "0% intro", cumulative: 131.46, note: "$60M+ day-one inflow" },
    { name: "21Shares XRP ETF", ticker: "TOXR", exchange: "Cboe BZX", launched: "Dec 1, 2025",
      fee: "0.30%", cumulative: null, note: "Seeded with $226M" },
    { name: "REX-Osprey XRP ETF", ticker: "XRPR", exchange: "Cboe BZX", launched: "Sep 18, 2025",
      fee: "0.75%", cumulative: null, note: "40-Act structure, pre-dated spot wave" },
    { name: "Volatility Shares XRP ETF", ticker: "XRPI", exchange: "Nasdaq", launched: "May 22, 2025",
      fee: "0.94%", cumulative: null, note: "CME futures-based, not spot" },
  ],

  // Billions of XRP. Overlapping buckets from different trackers — a map, not a partition.
  supply: [
    { label: "Ripple escrow (locked)", value: 38, sub: "~38B locked on-ledger after an Aug release — verify on XRPScan" },
    { label: "Whales 1M–10M XRP", value: 16.36, sub: "+380M in one August week" },
    { label: "Whales 10M–100M XRP", value: 12.2, sub: "+1.23B year-to-date" },
    { label: "Top-3 exchanges (Upbit, Binance, Bithumb)", value: 10.84, sub: "−240M since late May" },
    { label: "US spot ETFs (cold storage)", value: 0.99, sub: "≈ 994.7M+ XRP, ~1% of supply" },
  ],
};

const M = (v) => (v < 0 ? "−$" : "$") + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "M";
const tooltip = document.getElementById("tooltip");

function hover(el, html) {
  el.addEventListener("mousemove", (e) => {
    tooltip.innerHTML = html;
    tooltip.style.display = "block";
    tooltip.style.left = Math.min(e.clientX + 14, innerWidth - 220) + "px";
    tooltip.style.top = (e.clientY + 14) + "px";
  });
  el.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });
}

/* Vertical bar chart with a zero baseline; inflow blue, outflow red (diverging poles). */
function barChart(mountId, rows, { height = 220 } = {}) {
  const mount = document.getElementById(mountId);
  const W = Math.max(mount.clientWidth || 640, rows.length * 72), H = height;
  const max = Math.max(...rows.map((r) => r.value), 0);
  const min = Math.min(...rows.map((r) => r.value), 0);
  const pad = { t: 26, r: 8, b: min < 0 ? 44 : 26, l: 8 };
  const span = (max - min) || 1;
  const y = (v) => pad.t + (max - v) / span * (H - pad.t - pad.b);
  const bw = Math.min(44, (W - pad.l - pad.r) / rows.length - 16);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", W); svg.setAttribute("height", H);

  const base = document.createElementNS(svg.namespaceURI, "line");
  base.setAttribute("x1", pad.l); base.setAttribute("x2", W - pad.r);
  base.setAttribute("y1", y(0)); base.setAttribute("y2", y(0));
  base.setAttribute("stroke", "rgba(255,255,255,0.25)");
  svg.appendChild(base);

  rows.forEach((r, i) => {
    const x = pad.l + (i + 0.5) * ((W - pad.l - pad.r) / rows.length) - bw / 2;
    const neg = r.value < 0;
    const top = neg ? y(0) : y(r.value);
    const h = Math.max(Math.abs(y(r.value) - y(0)), 2);
    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("class", "bar");
    rect.setAttribute("x", x); rect.setAttribute("y", y(0));
    rect.setAttribute("width", bw); rect.setAttribute("height", 0);
    rect.setAttribute("rx", 4);
    rect.setAttribute("fill", neg ? "var(--outflow)" : "var(--accent)");
    rect.style.transitionDelay = (i * 0.05) + "s";
    hover(rect, `<strong>${r.label}</strong><br><span class="t-sub">net flow</span> ${M(r.value)}`);
    svg.appendChild(rect);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      rect.setAttribute("y", top); rect.setAttribute("height", h);
    }));

    const val = document.createElementNS(svg.namespaceURI, "text");
    val.setAttribute("x", x + bw / 2);
    val.setAttribute("y", neg ? top + h + 15 : top - 6);
    val.setAttribute("text-anchor", "middle");
    val.setAttribute("fill", "var(--text-secondary)");
    val.setAttribute("font-size", "11");
    val.textContent = M(r.value);
    svg.appendChild(val);

    const lab = document.createElementNS(svg.namespaceURI, "text");
    lab.setAttribute("x", x + bw / 2);
    lab.setAttribute("y", H - 8);
    lab.setAttribute("text-anchor", "middle");
    lab.setAttribute("fill", "var(--text-muted)");
    lab.setAttribute("font-size", "11");
    lab.textContent = r.label;
    svg.appendChild(lab);
  });
  mount.appendChild(svg);
}

/* Horizontal magnitude bars (single sequential hue), label left, value right. */
function hbarChart(mountId, rows, { fmt = M, color = "var(--accent)" } = {}) {
  const mount = document.getElementById(mountId);
  const W = Math.max(mount.clientWidth || 640, 520);
  const rowH = 34, labW = Math.min(300, W * 0.4);
  const H = rows.length * rowH + 6;
  const max = Math.max(...rows.map((r) => r.value));
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", W); svg.setAttribute("height", H);

  rows.forEach((r, i) => {
    const yy = i * rowH + 6;
    const bw = Math.max((r.value / max) * (W - labW - 110), 3);
    const lab = document.createElementNS(svg.namespaceURI, "text");
    lab.setAttribute("x", labW - 10); lab.setAttribute("y", yy + 15);
    lab.setAttribute("text-anchor", "end");
    lab.setAttribute("fill", "var(--text-secondary)");
    lab.setAttribute("font-size", "12");
    lab.textContent = r.label;
    svg.appendChild(lab);

    const rect = document.createElementNS(svg.namespaceURI, "rect");
    rect.setAttribute("class", "bar");
    rect.setAttribute("x", labW); rect.setAttribute("y", yy);
    rect.setAttribute("width", 0); rect.setAttribute("height", 20);
    rect.setAttribute("rx", 4);
    rect.setAttribute("fill", color);
    rect.style.transitionProperty = "width, filter, opacity";
    rect.style.transitionDelay = (i * 0.06) + "s";
    if (r.sub) hover(rect, `<strong>${r.label}</strong><br><span class="t-sub">${r.sub}</span>`);
    svg.appendChild(rect);
    requestAnimationFrame(() => requestAnimationFrame(() => { rect.setAttribute("width", bw); }));

    const val = document.createElementNS(svg.namespaceURI, "text");
    val.setAttribute("x", labW + bw + 8); val.setAttribute("y", yy + 15);
    val.setAttribute("fill", "var(--text-primary)");
    val.setAttribute("font-size", "12"); val.setAttribute("font-weight", "650");
    val.textContent = fmt(r.value);
    svg.appendChild(val);
  });
  mount.appendChild(svg);
}

const PALETTE = ["#3987e5", "#5fd0c6", "#f0a441", "#d55181", "#8b7ee8", "#7be07b", "#e66767", "#61a8e0"];

/* Interactive donut: hover a segment or legend row to spotlight it (others dim),
   click to lock the spotlight, center label shows the focused value. */
function donutChart(mountId, rows, { fmt = M, unitLabel = "of total" } = {}) {
  const mount = document.getElementById(mountId);
  mount.innerHTML = "";
  const total = rows.reduce((s, r) => s + r.value, 0);
  const size = 220, r = 78, cx = size / 2, cy = size / 2, sw = 34;
  const circumference = 2 * Math.PI * r;

  const wrap = document.createElement("div");
  wrap.className = "donut-wrap";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size); svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  const track = document.createElementNS(svg.namespaceURI, "circle");
  track.setAttribute("cx", cx); track.setAttribute("cy", cy); track.setAttribute("r", r);
  track.setAttribute("fill", "none"); track.setAttribute("stroke", "var(--gridline)");
  track.setAttribute("stroke-width", sw);
  svg.appendChild(track);

  const center = document.createElement("div");
  center.className = "donut-center";
  center.innerHTML = `<span class="dc-value">${fmt(total)}</span><span class="dc-label">total</span>`;

  let offsetAcc = 0;
  const segs = [], legendItems = [];
  rows.forEach((row, i) => {
    const frac = row.value / total;
    const len = frac * circumference;
    const seg = document.createElementNS(svg.namespaceURI, "circle");
    seg.setAttribute("class", "seg");
    seg.setAttribute("cx", cx); seg.setAttribute("cy", cy); seg.setAttribute("r", r);
    seg.setAttribute("fill", "none");
    seg.setAttribute("stroke", PALETTE[i % PALETTE.length]);
    seg.setAttribute("stroke-width", sw);
    seg.setAttribute("stroke-dasharray", `${len} ${circumference - len}`);
    seg.setAttribute("stroke-dashoffset", circumference);
    seg.setAttribute("transform", `rotate(${-90 + offsetAcc / circumference * 360} ${cx} ${cy})`);
    requestAnimationFrame(() => requestAnimationFrame(() => { seg.setAttribute("stroke-dashoffset", circumference - len); }));
    svg.appendChild(seg);
    segs.push(seg);
    offsetAcc += len;

    const li = document.createElement("li");
    li.innerHTML = `<span class="swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>
      <span class="lg-name">${row.label}</span>
      <span class="lg-pct">${(frac * 100).toFixed(1)}%</span>`;
    legendItems.push(li);

    const focus = (on) => {
      segs.forEach((s, j) => { s.style.opacity = (!on || j === i) ? 1 : 0.18; });
      legendItems.forEach((l, j) => l.classList.toggle("dim", on && j !== i));
      center.innerHTML = on
        ? `<span class="dc-value">${fmt(row.value)}</span><span class="dc-label">${row.label}</span>`
        : `<span class="dc-value">${fmt(total)}</span><span class="dc-label">total</span>`;
    };
    let locked = false;
    seg.addEventListener("mouseenter", () => { if (!locked) focus(true); });
    seg.addEventListener("mouseleave", () => { if (!locked) focus(false); });
    li.addEventListener("mouseenter", () => { if (!locked) focus(true); });
    li.addEventListener("mouseleave", () => { if (!locked) focus(false); });
    const toggleLock = () => { locked = !locked; focus(locked); };
    seg.addEventListener("click", toggleLock);
    li.addEventListener("click", toggleLock);
    if (row.sub) hover(seg, `<strong>${row.label}</strong><br><span class="t-sub">${row.sub}</span>`);
  });

  wrap.appendChild(svg);
  wrap.appendChild(center);
  const legend = document.createElement("ul");
  legend.className = "legend";
  legendItems.forEach((li) => legend.appendChild(li));
  mount.appendChild(wrap);
  mount.appendChild(legend);
}

/* Animated cumulative-sum area chart for a monthly series: draws the running total,
   with a scrubbable crosshair like the live price chart. */
function cumulativeChart(mountId, rows) {
  const mount = document.getElementById(mountId);
  mount.innerHTML = "";
  let running = 0;
  const points = rows.map((r) => ({ label: r.label, total: (running += r.value) }));
  const W = Math.max(mount.clientWidth || 900, 560), H = 220;
  const pad = { t: 20, r: 16, b: 28, l: 54 };
  const max = Math.max(...points.map((p) => p.total)), min = Math.min(0, ...points.map((p) => p.total));
  const X = (i) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (max - v) / ((max - min) || 1) * (H - pad.t - pad.b);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", W); svg.setAttribute("height", H);

  [max, (max + min) / 2, min].forEach((v) => {
    const g = document.createElementNS(svg.namespaceURI, "line");
    g.setAttribute("x1", pad.l); g.setAttribute("x2", W - pad.r);
    g.setAttribute("y1", Y(v)); g.setAttribute("y2", Y(v));
    g.setAttribute("stroke", "var(--gridline)");
    svg.appendChild(g);
    const t = document.createElementNS(svg.namespaceURI, "text");
    t.setAttribute("x", pad.l - 8); t.setAttribute("y", Y(v) + 4);
    t.setAttribute("text-anchor", "end"); t.setAttribute("fill", "var(--text-muted)"); t.setAttribute("font-size", "11");
    t.textContent = M(v);
    svg.appendChild(t);
  });

  const d = points.map((p, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.total).toFixed(1)).join(" ");
  const len = points.length;
  const area = document.createElementNS(svg.namespaceURI, "path");
  area.setAttribute("class", "area-fade");
  area.setAttribute("d", d + ` L${X(len - 1).toFixed(1)} ${Y(0)} L${X(0).toFixed(1)} ${Y(0)} Z`);
  area.setAttribute("fill", "var(--accent-soft)");
  area.style.opacity = 0;
  svg.appendChild(area);

  const line = document.createElementNS(svg.namespaceURI, "path");
  line.setAttribute("class", "line-draw");
  line.setAttribute("d", d);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "var(--accent)");
  line.setAttribute("stroke-width", "2.5");
  svg.appendChild(line);
  const pathLen = line.getTotalLength();
  line.style.strokeDasharray = pathLen;
  line.style.strokeDashoffset = pathLen;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    line.style.strokeDashoffset = 0;
    area.style.opacity = 1;
  }));

  points.forEach((p, i) => {
    const dot = document.createElementNS(svg.namespaceURI, "circle");
    dot.setAttribute("class", "dot-pt");
    dot.setAttribute("cx", X(i)); dot.setAttribute("cy", Y(p.total)); dot.setAttribute("r", 4);
    dot.setAttribute("fill", "var(--page)"); dot.setAttribute("stroke", "var(--accent)"); dot.setAttribute("stroke-width", "2");
    hover(dot, `<strong>${p.label}</strong><br><span class="t-sub">running total</span> ${M(p.total)}`);
    svg.appendChild(dot);

    const lab = document.createElementNS(svg.namespaceURI, "text");
    lab.setAttribute("x", X(i)); lab.setAttribute("y", H - 8);
    lab.setAttribute("text-anchor", "middle"); lab.setAttribute("fill", "var(--text-muted)"); lab.setAttribute("font-size", "11");
    lab.textContent = p.label;
    svg.appendChild(lab);
  });
  mount.appendChild(svg);
}

function renderTiles() {
  document.getElementById("summary-tiles").innerHTML = DATA.summary.map((t) => `
    <div class="tile">
      <span class="tile-label">${t.label}</span>
      <span class="tile-value ${t.cls}">${t.cls === "pos" ? "+" : ""}$${t.value >= 1000 ? (t.value / 1000).toFixed(2) + "B" : t.value + "M"}</span>
      <span class="tile-sub">${t.sub}</span>
    </div>`).join("");
}

function renderTable() {
  document.getElementById("fund-table").innerHTML = `
    <table>
      <thead><tr><th>Fund</th><th>Ticker</th><th>Exchange</th><th>Launched</th><th>Fee</th>
        <th class="num">Cumulative net inflow</th><th>Note</th></tr></thead>
      <tbody>${DATA.funds.map((f) => `
        <tr><td>${f.name}</td><td>${f.ticker}</td><td>${f.exchange}</td><td>${f.launched}</td><td>${f.fee}</td>
          <td class="num">${f.cumulative != null ? M(f.cumulative) : "see tracker"}</td><td>${f.note}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

/* Live XRP price line chart (CoinGecko public API, fetched client-side).
   Falls back to a link when the network or a strict CSP blocks the request. */
async function priceChart(days) {
  const mount = document.getElementById("chart-price");
  mount.innerHTML = `<p class="section-note">Loading price data…</p>`;
  let points;
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/ripple/market_chart?vs_currency=usd&days=${days}`);
    if (!res.ok) throw new Error(res.status);
    points = (await res.json()).prices; // [ms, usd]
  } catch (e) {
    mount.innerHTML = `<p class="section-note">Live price data couldn't be loaded in this context.
      See the current chart on <a href="https://www.coingecko.com/en/coins/xrp" target="_blank" rel="noopener">CoinGecko</a>
      or <a href="https://www.tradingview.com/symbols/XRPUSD/" target="_blank" rel="noopener">TradingView</a>.</p>`;
    return;
  }
  mount.innerHTML = "";
  const W = Math.max(mount.clientWidth || 900, 600), H = 260;
  const pad = { t: 16, r: 60, b: 24, l: 10 };
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const X = (t) => pad.l + (t - x0) / (x1 - x0) * (W - pad.l - pad.r);
  const Y = (v) => pad.t + (yMax - v) / ((yMax - yMin) || 1) * (H - pad.t - pad.b);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", W); svg.setAttribute("height", H);

  [yMax, (yMax + yMin) / 2, yMin].forEach((v) => {
    const g = document.createElementNS(svg.namespaceURI, "line");
    g.setAttribute("x1", pad.l); g.setAttribute("x2", W - pad.r);
    g.setAttribute("y1", Y(v)); g.setAttribute("y2", Y(v));
    g.setAttribute("stroke", "var(--gridline)");
    svg.appendChild(g);
    const t = document.createElementNS(svg.namespaceURI, "text");
    t.setAttribute("x", W - pad.r + 6); t.setAttribute("y", Y(v) + 4);
    t.setAttribute("fill", "var(--text-muted)"); t.setAttribute("font-size", "11");
    t.textContent = "$" + v.toFixed(3);
    svg.appendChild(t);
  });

  const d = points.map((p, i) => (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1)).join("");
  const area = document.createElementNS(svg.namespaceURI, "path");
  area.setAttribute("d", d + `L${X(x1)} ${H - pad.b}L${X(x0)} ${H - pad.b}Z`);
  area.setAttribute("fill", "var(--accent-soft)");
  svg.appendChild(area);
  const line = document.createElementNS(svg.namespaceURI, "path");
  line.setAttribute("d", d);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "var(--accent)");
  line.setAttribute("stroke-width", "2");
  svg.appendChild(line);

  const last = points[points.length - 1];
  const dot = document.createElementNS(svg.namespaceURI, "circle");
  dot.setAttribute("cx", X(last[0])); dot.setAttribute("cy", Y(last[1]));
  dot.setAttribute("r", 4); dot.setAttribute("fill", "var(--accent)");
  svg.appendChild(dot);

  // crosshair + tooltip
  const cross = document.createElementNS(svg.namespaceURI, "line");
  cross.setAttribute("y1", pad.t); cross.setAttribute("y2", H - pad.b);
  cross.setAttribute("stroke", "rgba(255,255,255,0.3)");
  cross.setAttribute("visibility", "hidden");
  svg.appendChild(cross);
  svg.addEventListener("mousemove", (e) => {
    const r = svg.getBoundingClientRect();
    const t = x0 + (e.clientX - r.left - pad.l) / (W - pad.l - pad.r) * (x1 - x0);
    let i = points.findIndex((p) => p[0] >= t);
    if (i < 0) i = points.length - 1;
    const p = points[Math.max(0, i)];
    cross.setAttribute("x1", X(p[0])); cross.setAttribute("x2", X(p[0]));
    cross.setAttribute("visibility", "visible");
    tooltip.innerHTML = `<strong>$${p[1].toFixed(4)}</strong><br><span class="t-sub">${new Date(p[0]).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>`;
    tooltip.style.display = "block";
    tooltip.style.left = Math.min(e.clientX + 14, innerWidth - 180) + "px";
    tooltip.style.top = (e.clientY + 14) + "px";
  });
  svg.addEventListener("mouseleave", () => { cross.setAttribute("visibility", "hidden"); tooltip.style.display = "none"; });
  mount.appendChild(svg);
}

document.querySelectorAll(".range-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".range-btn").forEach((o) => o.removeAttribute("aria-pressed"));
    b.setAttribute("aria-pressed", "true");
    priceChart(b.dataset.days);
  });
});
priceChart(365);

/* Long-range scenarios — published analyst forecasts (see page notes for sources).
   capB = implied market cap at ~64B circulating XRP, in US$ billions. */
const SCENARIOS = [
  { year: "2027", bear: 1.01, base: 2.63, bull: 7.00,
    note: "Aggregator range $1.01–$2.63 (cryptonews/Kraken); Standard Chartered target $7" },
  { year: "2030", bear: 1.57, base: 4.63, bull: 26.97,
    note: "Aggregator range $1.57–$4.63; most aggressive published call ~$27" },
  { year: "2035", bear: 2.00, base: 8.00, bull: 40.00,
    note: "Beyond most models — extrapolations only, treat as illustrative" },
];
const CIRCULATING_B = 64; // ~64B XRP circulating

function renderScenarios() {
  const cap = (p) => "$" + (p * CIRCULATING_B).toFixed(0) + "B";
  document.getElementById("scenario-table").innerHTML = `
    <table>
      <thead><tr><th>Horizon</th><th class="num">Bear</th><th class="num">Base</th><th class="num">Bull</th>
        <th class="num">Implied cap (base / bull)</th><th>Basis</th></tr></thead>
      <tbody>${SCENARIOS.map((s) => `
        <tr><td>${s.year}</td>
          <td class="num">$${s.bear.toFixed(2)}</td>
          <td class="num">$${s.base.toFixed(2)}</td>
          <td class="num">$${s.bull.toFixed(2)}</td>
          <td class="num">${cap(s.base)} / ${cap(s.bull)}</td>
          <td>${s.note}</td></tr>`).join("")}
      </tbody>
    </table>`;
}

/* Projection calculator: lump sum + monthly contributions at an average buy price,
   valued at each target price. Pure arithmetic — no return assumptions. */
function renderCalc() {
  const num = (id) => Math.max(parseFloat(document.getElementById(id).value) || 0, 0);
  const lump = num("calc-lump"), monthly = num("calc-monthly"), months = num("calc-months");
  const buy = num("calc-buy") || 0.01, target = num("calc-target") || 0.01;
  const invested = lump + monthly * months;
  const xrp = invested / buy;

  const fmt$ = (v) => "$" + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  document.getElementById("calc-tiles").innerHTML = `
    <div class="tile"><span class="tile-label">Total invested</span>
      <span class="tile-value">${fmt$(invested)}</span>
      <span class="tile-sub">${fmt$(lump)} now + ${fmt$(monthly)} × ${months} months</span></div>
    <div class="tile"><span class="tile-label">XRP accumulated</span>
      <span class="tile-value">${xrp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      <span class="tile-sub">at $${buy.toFixed(2)} average buy price</span></div>
    <div class="tile"><span class="tile-label">Value at your target ($${target.toFixed(2)})</span>
      <span class="tile-value ${target >= buy ? "pos" : "neg"}">${fmt$(xrp * target)}</span>
      <span class="tile-sub">${(target / buy).toFixed(1)}× your cost basis</span></div>`;

  const rows = [];
  SCENARIOS.forEach((s) => ["bear", "base", "bull"].forEach((k) =>
    rows.push({ label: `${s.year} ${k}`, price: s[k] })));
  rows.push({ label: "Your custom target", price: target });
  document.getElementById("calc-table").innerHTML = `
    <table>
      <thead><tr><th>Scenario</th><th class="num">XRP price</th><th class="num">Portfolio value</th>
        <th class="num">Gain / loss</th><th class="num">Multiple</th></tr></thead>
      <tbody>${rows.map((r) => {
        const v = xrp * r.price, g = v - invested;
        return `<tr><td>${r.label}</td>
          <td class="num">$${r.price.toFixed(2)}</td>
          <td class="num">${fmt$(v)}</td>
          <td class="num"><span class="${g >= 0 ? "pos" : "neg"}">${g >= 0 ? "+" : "−"}${fmt$(Math.abs(g)).slice(1)}</span></td>
          <td class="num">${(v / (invested || 1)).toFixed(2)}×</td></tr>`;
      }).join("")}
      </tbody>
    </table>`;
}

renderScenarios();
renderCalc();
["calc-lump", "calc-monthly", "calc-months", "calc-buy", "calc-target"]
  .forEach((id) => document.getElementById(id).addEventListener("input", renderCalc));

document.getElementById("asof-date").textContent = DATA.asOf;
renderTiles();
renderTable();
barChart("chart-monthly", DATA.monthly, { height: 240 });
cumulativeChart("chart-cumulative", DATA.monthly);
barChart("chart-daily", DATA.daily, { height: 220 });
hbarChart("chart-funds", DATA.funds.filter((f) => f.cumulative != null)
  .map((f) => ({ label: `${f.name} (${f.ticker})`, value: f.cumulative, sub: `launched ${f.launched} · fee ${f.fee}` })));
hbarChart("chart-supply", DATA.supply, {
  fmt: (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "B XRP",
});
donutChart("donut-funds", DATA.funds.filter((f) => f.cumulative != null)
  .map((f) => ({ label: `${f.ticker}`, value: f.cumulative, sub: `${f.name} · launched ${f.launched}` })));
donutChart("donut-supply", DATA.supply.map((s) => ({ label: s.label, value: s.value, sub: s.sub })), {
  fmt: (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "B XRP",
});
