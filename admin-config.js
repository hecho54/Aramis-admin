/* ══════════════════════════════════════════════════════
   ARAMIS — Admin Konfiguráció JS
   ══════════════════════════════════════════════════════ */

'use strict';

let db       = null;
let settings = { mode: 'live', waitTime: 30, deliveryTime: '2 óra', pickupEta: '20–30', ordersClosed: false };
let allOrders = [];
let activePeriod = 'today';

/* ══ FIREBASE INIT ══ */
(function init() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || cfg.apiKey === 'ILLESZD_BE_ITT') {
    showToast('⚠ Firebase nincs beállítva');
    return;
  }
  try {
    const app = firebase.initializeApp(cfg);
    db = firebase.database(app);
    listenSettings();
    listenOrders();
  } catch (e) {
    console.error('Firebase hiba:', e);
  }
})();

/* ══ SETTINGS FIGYELÉS ══ */
function listenSettings() {
  db.ref('settings').on('value', snap => {
    const data = snap.val();
    if (data) settings = { ...settings, ...data };
    applySettings();
  });
}

function applySettings() {
  // Rendelések toggle
  const on = !settings.ordersClosed;
  setToggle('ordersToggle', on);
  setText('ordersToggleLabel', on ? 'Nyitva' : 'Zárva');
  setText('ordersStatusDesc', on ? 'Vendégek rendelhetnek a weboldalon' : 'Online rendelés szünetel');
  const msgBox = document.getElementById('closureMsgBox');
  if (msgBox) msgBox.style.display = on ? 'none' : '';

  // Mód toggle
  const modeEl = document.getElementById('modeToggle');
  if (modeEl) {
    modeEl.dataset.mode = settings.mode;
    setText('modeToggleLabel', settings.mode === 'test' ? 'Teszt' : 'Éles');
    setText('modeDesc', settings.mode === 'test'
      ? 'Teszt módban a rendelések tesztelési célúak'
      : 'Éles módban a rendelések valódiak');
  }

  // Idő beállítások
  setSelectVal('cfgWaitTime',     String(settings.waitTime));
  setSelectVal('cfgDeliveryTime', settings.deliveryTime || '2 óra');
  setSelectVal('cfgPickupTime',   settings.pickupEta   || '20–30');
  updateSaveBtn('saveWaitTimeCfg',    waitLabel(settings.waitTime));
  updateSaveBtn('saveDeliveryTimeCfg', settings.deliveryTime || '2 óra');
  updateSaveBtn('savePickupTimeCfg',   settings.pickupEta   || '20–30');
}

/* ══ RENDELÉSEK FIGYELÉS ══ */
function listenOrders() {
  db.ref('orders').on('value', snap => {
    allOrders = Object.values(snap.val() || {});
    renderStats();
    renderHourChart();
  });
}

/* ══ STATISZTIKÁK ══ */
function getFilteredOrders() {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);

  if (activePeriod === 'today') {
    return allOrders.filter(o => o.date === today && o.status !== 'cancelled');
  }
  if (activePeriod === 'week') {
    const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    return allOrders.filter(o => o.date >= weekAgo && o.status !== 'cancelled');
  }
  if (activePeriod === 'month') {
    const monthAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10);
    return allOrders.filter(o => o.date >= monthAgo && o.status !== 'cancelled');
  }
  return [];
}

function renderStats() {
  const orders    = getFilteredOrders();
  const delivered = orders.filter(o => o.status === 'delivered');
  const revenue   = delivered.reduce((s, o) => s + (o.total || 0), 0);
  const avg       = delivered.length ? Math.round(revenue / delivered.length) : 0;
  const delivery  = orders.filter(o => o.type === 'delivery').length;
  const pickup    = orders.filter(o => o.type === 'pickup').length;
  const total     = orders.length || 1;

  setText('sTotal',     orders.length);
  setText('sRevenue',   fmt(revenue));
  setText('sAvg',       avg ? fmt(avg) : '—');
  setText('sDelivered', delivered.length);

  const dPct = Math.round(delivery / total * 100);
  const pPct = Math.round(pickup   / total * 100);
  document.getElementById('barDelivery').style.width = dPct + '%';
  document.getElementById('barPickup').style.width   = pPct + '%';
  setText('pctDelivery', dPct + '%');
  setText('pctPickup',   pPct + '%');
}

/* ══ ÓRÁNKÉNTI DIAGRAM ══ */
function renderHourChart() {
  const orders = getFilteredOrders();
  const hours  = Array.from({ length: 13 }, (_, i) => i + 11); // 11–23
  const counts = hours.map(h =>
    orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getHours() === h;
    }).length
  );
  const maxCount = Math.max(...counts, 1);

  const chart  = document.getElementById('hourChart');
  const labels = document.getElementById('hourLabels');
  if (!chart || !labels) return;

  chart.innerHTML = counts.map((c, i) => `
    <div class="hour-bar" style="height:${Math.max(4, Math.round(c / maxCount * 100))}%">
      <span class="hour-bar__tip">${hours[i]}:00 — ${c} db</span>
    </div>`).join('');

  labels.innerHTML = hours.map(h =>
    `<span class="hour-label">${h}</span>`
  ).join('');
}

/* ══ ESEMÉNYEK ══ */

// Rendelések toggle
document.getElementById('ordersToggle').addEventListener('click', async function() {
  settings.ordersClosed = !settings.ordersClosed;
  if (db) await db.ref('settings/ordersClosed').set(settings.ordersClosed);
  applySettings();
  showToast(settings.ordersClosed ? '🔴 Online rendelés lezárva' : '🟢 Online rendelés megnyitva');
});

// Mód toggle
document.getElementById('modeToggle').addEventListener('click', async function() {
  settings.mode = settings.mode === 'test' ? 'live' : 'test';
  if (db) await db.ref('settings/mode').set(settings.mode);
  applySettings();
  showToast(settings.mode === 'test' ? '🧪 Teszt mód' : '🟢 Éles mód');
});

// Zárás üzenet mentés
document.getElementById('saveMsgBtn').addEventListener('click', async () => {
  const msg = document.getElementById('closureMsgText').value.trim();
  if (db) await db.ref('settings/closureMsg').set(msg || null);
  showToast('✓ Üzenet mentve');
});

// Bejövős idő mentés
document.getElementById('cfgWaitTime').addEventListener('change', function() {
  updateSaveBtn('saveWaitTimeCfg', waitLabel(this.value));
});
document.getElementById('saveWaitTimeCfg').addEventListener('click', async function() {
  const val = parseInt(document.getElementById('cfgWaitTime').value);
  settings.waitTime = val;
  if (db) await db.ref('settings/waitTime').set(val);
  flashSaved(this);
  showToast('✓ Bejövős idő mentve: ' + waitLabel(val));
});

// Kiszállítás idő mentés
document.getElementById('cfgDeliveryTime').addEventListener('change', function() {
  updateSaveBtn('saveDeliveryTimeCfg', this.value);
});
document.getElementById('saveDeliveryTimeCfg').addEventListener('click', async function() {
  const val = document.getElementById('cfgDeliveryTime').value;
  settings.deliveryTime = val;
  settings.deliveryEta  = val;
  if (db) await db.ref('settings').update({ deliveryTime: val, deliveryEta: val });
  flashSaved(this);
  showToast('✓ Kiszállítás idő mentve: ' + val);
});

// Személyes átvétel mentés
document.getElementById('cfgPickupTime').addEventListener('change', function() {
  updateSaveBtn('savePickupTimeCfg', this.value);
});
document.getElementById('savePickupTimeCfg').addEventListener('click', async function() {
  const val = document.getElementById('cfgPickupTime').value;
  settings.pickupEta = val;
  if (db) await db.ref('settings/pickupEta').set(val);
  flashSaved(this);
  showToast('✓ Átvételi idő mentve: ' + val);
});

// Period tabs
document.querySelectorAll('.period-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    activePeriod = tab.dataset.period;
    document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderStats();
    renderHourChart();
  });
});

/* ══ SEGÉDFÜGGVÉNYEK ══ */
function setToggle(id, on) {
  const el = document.getElementById(id);
  if (el) el.dataset.on = on ? 'true' : 'false';
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setSelectVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const opt = [...el.options].find(o => o.value === val);
  if (opt) el.value = val;
}
function updateSaveBtn(id, label) {
  const el = document.getElementById(id);
  if (el) el.textContent = `Mentés – ${label}`;
}
function flashSaved(btn) {
  btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('saved'), 2200);
}
function waitLabel(val) {
  return parseInt(val) >= 60 ? '1 óra' : val + ' perc';
}
function fmt(n) {
  return Number(n || 0).toLocaleString('hu-HU') + ' Ft';
}
function showToast(msg) {
  const el = document.getElementById('cfgToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}
