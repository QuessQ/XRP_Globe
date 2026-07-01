/**
 * Payment feed: live XRP Ledger stream with a simulation fallback.
 *
 * Live mode subscribes to the public XRPL websocket cluster and emits every
 * validated XRP→XRP Payment. If no endpoint can be reached (offline demo,
 * blocked websockets), the feed switches to a statistical simulation built
 * from the same corridor weights, so the visualization always runs.
 *
 * Emitted payment shape:
 *   { amountXRP, from: {city, entity, known}, to: {city, entity, known},
 *     hash|null, live: boolean }
 */

import { locateAccount, CITIES } from './data.js';

const ENDPOINTS = [
  'wss://xrplcluster.com',
  'wss://s1.ripple.com',
  'wss://s2.ripple.com',
];

const CONNECT_TIMEOUT_MS = 6000;
const STALL_TIMEOUT_MS = 45000; // no traffic for this long → reconnect

export class PaymentFeed {
  /**
   * @param {(p: object) => void} onPayment
   * @param {(mode: 'connecting'|'live'|'sim') => void} onMode
   */
  constructor(onPayment, onMode) {
    this.onPayment = onPayment;
    this.onMode = onMode;
    this.ws = null;
    this.endpointIdx = 0;
    this.attempts = 0;
    this.simTimer = null;
    this.stallTimer = null;
    this.stopped = false;
  }

  start() {
    this.onMode('connecting');
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.simTimer);
    clearTimeout(this.stallTimer);
    if (this.ws) { this.ws.onclose = null; this.ws.close(); }
  }

  // ---------- live ----------

  connect() {
    if (this.stopped) return;
    const url = ENDPOINTS[this.endpointIdx % ENDPOINTS.length];
    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      this.retry();
      return;
    }
    this.ws = ws;

    const connectTimer = setTimeout(() => ws.close(), CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      clearTimeout(connectTimer);
      ws.send(JSON.stringify({ command: 'subscribe', streams: ['transactions'] }));
      this.attempts = 0;
      this.stopSim();
      this.onMode('live');
      this.bumpStall();
    };

    ws.onmessage = (ev) => {
      this.bumpStall();
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const p = this.parsePayment(msg);
      if (p) this.onPayment(p);
    };

    ws.onerror = () => ws.close();

    ws.onclose = () => {
      clearTimeout(connectTimer);
      clearTimeout(this.stallTimer);
      this.retry();
    };
  }

  bumpStall() {
    clearTimeout(this.stallTimer);
    this.stallTimer = setTimeout(() => {
      if (this.ws) { this.ws.onclose = null; this.ws.close(); }
      this.retry();
    }, STALL_TIMEOUT_MS);
  }

  retry() {
    if (this.stopped) return;
    this.endpointIdx++;
    this.attempts++;
    // After one full sweep of endpoints, run the simulation while retrying
    // in the background at a slower cadence.
    if (this.attempts >= ENDPOINTS.length) this.startSim();
    const delay = Math.min(30000, 1000 * 2 ** Math.min(this.attempts, 5));
    setTimeout(() => this.connect(), delay);
  }

  /** Extract a located XRP payment from a stream message, or null. */
  parsePayment(msg) {
    if (msg.type !== 'transaction' || msg.validated !== true) return null;
    if (msg.engine_result && msg.engine_result !== 'tesSUCCESS') return null;
    const tx = msg.tx_json || msg.transaction; // rippled api v2 | v1
    if (!tx || tx.TransactionType !== 'Payment') return null;

    // XRP (not an issued token) is delivered as a plain drops string.
    const delivered = msg.meta?.delivered_amount ?? tx.Amount;
    if (typeof delivered !== 'string') return null;
    const amountXRP = Number(delivered) / 1e6;
    if (!isFinite(amountXRP) || amountXRP <= 0) return null;

    return {
      amountXRP,
      from: locateAccount(tx.Account),
      to: locateAccount(tx.Destination),
      hash: msg.hash || tx.hash || null,
      live: true,
    };
  }

  // ---------- simulation fallback ----------

  startSim() {
    if (this.simTimer || this.stopped) return;
    this.onMode('sim');
    const tick = () => {
      this.simTimer = setTimeout(() => {
        this.onPayment(this.fakePayment());
        tick();
      }, 250 + Math.random() * 1600);
    };
    tick();
  }

  stopSim() {
    clearTimeout(this.simTimer);
    this.simTimer = null;
  }

  fakePayment() {
    const from = this.pickCity();
    let to = this.pickCity();
    while (to === from) to = this.pickCity();
    // Log-normal-ish sizes: mostly retail, occasional whale.
    let amountXRP = Math.exp(Math.random() * 4.5 + 4); // ~55 … ~5M
    if (Math.random() < 0.03) amountXRP *= 20;
    amountXRP = Math.min(amountXRP, 80e6);
    return {
      amountXRP: Math.round(amountXRP * 100) / 100,
      from: { city: from, entity: null, known: false },
      to: { city: to, entity: null, known: false },
      hash: null,
      live: false,
    };
  }

  pickCity() {
    const total = CITIES.reduce((s, c) => s + c.weight, 0);
    let x = Math.random() * total;
    for (const c of CITIES) {
      x -= c.weight;
      if (x <= 0) return c;
    }
    return CITIES[0];
  }
}
