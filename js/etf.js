/* XRP Pulse — US spot XRP ETF flows dashboard.
   All figures are a hand-compiled snapshot; every number carries its source below.
   Live values: https://sosovalue.com/assets/etf/us-xrp-spot and https://farside.co.uk/xrp/ */

const DATA = {
  asOf: "August 22, 2026",

  summary: [
    { label: "Past week (Aug 17–21)", value: 39.78, unit: "M", cls: "pos",
      sub: "Best week since May — Wu Blockchain / SoSoValue" },
    { label: "Past month (July 2026)", value: 27.29, unit: "M", cls: "pos",
      sub: "Zero-flow days on 11 of 22 sessions" },
    { label: "Since launch (Nov 2025)", value: 1510, unit: "M", cls: "pos",
      sub: "≈ $1.51B cumulative net inflow" },
    { label: "Total net assets", value: 994, unit: "M", cls: "",
      sub: "≈ 994.7M XRP custodied (Aug 17)" },
  ],

  // Combined monthly net flows, US$m (SoSoValue-based reporting).
  monthly: [
    { label: "Apr", value: 81.59 },
    { label: "May", value: 118.29 },
    { label: "Jun", value: 59.46 },
    { label: "Jul", value: 27.29 },
    { label: "Aug (to 21st)", value: 39.65 },
  ],

  // Individually reported trading days, August 2026, US$m.
  daily: [
    { label: "Aug 5", value: -3.58 },
    { label: "Aug 6", value: 3.45 },
    { label: "Aug 18", value: 5.81 },
    { label: "Aug 20", value: 13.24 },
    { label: "Aug 21", value: 18.38 },
  ],

  funds: [
    { name: "Bitwise XRP ETF", ticker: "XRP", exchange: "NYSE", launched: "Nov 20, 2025",
      fee: "0.34%", cumulative: 510.21, note: "Flow leader most weeks" },
    { name: "Canary XRP ETF", ticker: "XRPC", exchange: "Nasdaq", launched: "Nov 13, 2025",
      fee: "0.50%", cumulative: 468.12, note: "First US spot XRP ETF" },
    { name: "Franklin XRP ETF", ticker: "XRPZ", exchange: "NYSE Arca", launched: "Nov 24, 2025",
      fee: "0.19%", cumulative: 426.53, note: "Lowest base fee" },
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
    { label: "Ripple escrow (locked)", value: 35.6, sub: "~35–36B locked on-ledger — verify on XRPScan" },
    { label: "Whales 1M–10M XRP", value: 16.36, sub: "+380M in one August week" },
    { label: "Whales 10M–100M XRP", value: 12.2, sub: "+1.23B year-to-date" },
    { label: "Top-3 exchanges (Upbit, Binance, Bithumb)", value: 10.84, sub: "−240M since late May" },
    { label: "US spot ETFs (cold storage)", value: 0.99, sub: "≈ 994.7M XRP, ~1% of supply" },
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
    rect.setAttribute("x", x); rect.setAttribute("y", top);
    rect.setAttribute("width", bw); rect.setAttribute("height", h);
    rect.setAttribute("rx", 4);
    rect.setAttribute("fill", neg ? "var(--outflow)" : "var(--accent)");
    hover(rect, `<strong>${r.label}</strong><br><span class="t-sub">net flow</span> ${M(r.value)}`);
    svg.appendChild(rect);

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
    rect.setAttribute("x", labW); rect.setAttribute("y", yy);
    rect.setAttribute("width", bw); rect.setAttribute("height", 20);
    rect.setAttribute("rx", 4);
    rect.setAttribute("fill", color);
    if (r.sub) hover(rect, `<strong>${r.label}</strong><br><span class="t-sub">${r.sub}</span>`);
    svg.appendChild(rect);

    const val = document.createElementNS(svg.namespaceURI, "text");
    val.setAttribute("x", labW + bw + 8); val.setAttribute("y", yy + 15);
    val.setAttribute("fill", "var(--text-primary)");
    val.setAttribute("font-size", "12"); val.setAttribute("font-weight", "650");
    val.textContent = fmt(r.value);
    svg.appendChild(val);
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

document.getElementById("asof-date").textContent = DATA.asOf;
renderTiles();
renderTable();
barChart("chart-monthly", DATA.monthly, { height: 240 });
barChart("chart-daily", DATA.daily, { height: 220 });
hbarChart("chart-funds", DATA.funds.filter((f) => f.cumulative != null)
  .map((f) => ({ label: `${f.name} (${f.ticker})`, value: f.cumulative, sub: `launched ${f.launched} · fee ${f.fee}` })));
hbarChart("chart-supply", DATA.supply, {
  fmt: (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "B XRP",
});
