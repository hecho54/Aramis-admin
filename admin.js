/* ══════════════════════════════════════════════════════
   ARAMIS — Admin Panel / Konyhai Kijelző
   ══════════════════════════════════════════════════════ */

'use strict';

/* ── Állapot ── */
let db           = null;
let soundEnabled = true;
let audioCtx     = null;
let knownIds     = new Set();
let timerRef     = null;
let activeFilter = 'all';   // 'all' | 'pickup' | 'delivery'

let settings = {
  mode:         'live',
  waitTime:     30,
  deliveryTime: '2 óra',   // inline kiszállítás idő (óra alapú)
  deliveryEta:  '2 óra',   // customer-facing ETA (szinkronban a deliveryTime-mal)
  pickupEta:    '20–30',
  ordersClosed: false,
};

/* ══════════════════════════════════════════════════════
   INICIALIZÁLÁS
   ══════════════════════════════════════════════════════ */
function init() {
  startClock();
  initSoundToggle();

  const cfg = window.FIREBASE_CONFIG;
  const isConfigured = cfg && cfg.apiKey !== 'ILLESZD_BE_ITT';

  if (!isConfigured) {
    document.getElementById('setupScreen').style.display = 'flex';
    setStatus('offline');
    return;
  }

  setStatus('connecting');
  try {
    const app = firebase.initializeApp(cfg);
    db = firebase.database(app);
    listenSettings();
    listenOrders();
  } catch (err) {
    console.error('Firebase init hiba:', err);
    setStatus('offline');
    document.getElementById('setupScreen').style.display = 'flex';
  }
}

/* ══════════════════════════════════════════════════════
   BEÁLLÍTÁSOK
   ══════════════════════════════════════════════════════ */
function listenSettings() {
  db.ref('settings').on('value', snap => {
    const data = snap.val();
    if (data) settings = { ...settings, ...data };
    applySettingsToForm();
    updateModeLabel();
  });
}

function applySettingsToForm() {
  const modeRadio = document.querySelector(`input[name="settingMode"][value="${settings.mode}"]`);
  if (modeRadio) modeRadio.checked = true;
  setSelectVal('settingWaitTime',    String(settings.waitTime));
  setSelectVal('settingDeliveryEta', settings.deliveryEta);
  setSelectVal('settingPickupEta',   settings.pickupEta);
  updateClosedUI();
  updateInlineTimeBars();
}

function updateInlineTimeBars() {
  // Bejövős idő inline dropdown + gomb
  const waitSel = document.getElementById('inlineWaitTime');
  const waitBtn = document.getElementById('saveWaitTimeBtn');
  if (waitSel) {
    setSelectVal('inlineWaitTime', String(settings.waitTime));
    updateWaitSaveBtn(waitBtn, settings.waitTime);
  }

  // Kiszállítás idő inline dropdown + gomb
  const delivSel = document.getElementById('inlineDeliveryTime');
  const delivBtn = document.getElementById('saveDeliveryTimeBtn');
  if (delivSel) {
    setSelectVal('inlineDeliveryTime', settings.deliveryTime || '2 óra');
    updateDeliverySaveBtn(delivBtn, settings.deliveryTime || '2 óra');
  }
}

function updateWaitSaveBtn(btn, val) {
  if (!btn) return;
  const label = val >= 60 ? '1 óra' : `${val} perc`;
  btn.textContent = `Mentés – ${label}`;
}

function updateDeliverySaveBtn(btn, val) {
  if (!btn) return;
  btn.textContent = `Mentés – ${val}`;
}

function setSelectVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  // Megkeresi a legközelebb illő opciót
  const opt = [...el.options].find(o => o.value === val);
  if (opt) el.value = val;
}

async function saveSettings() {
  const modeRadio = document.querySelector('input[name="settingMode"]:checked');
  settings = {
    ...settings,
    mode:        modeRadio ? modeRadio.value : 'live',
    waitTime:    parseInt(document.getElementById('settingWaitTime').value),
    deliveryEta: document.getElementById('settingDeliveryEta').value,
    pickupEta:   document.getElementById('settingPickupEta').value,
  };
  if (db) await db.ref('settings').set(settings);
  updateModeLabel();
  updateClosedUI();
  closeSettingsPanel();
  showAdminToast('✓ Beállítások mentve');
}

/* ── Rendelés lezárása / megnyitása ── */
async function toggleOrdersClosed() {
  settings.ordersClosed = !settings.ordersClosed;
  if (db) await db.ref('settings/ordersClosed').set(settings.ordersClosed);
  updateClosedUI();
  showAdminToast(settings.ordersClosed
    ? '🔴 Rendelés felvétel szünetel'
    : '🟢 Rendelés felvétel aktív');
}

function updateClosedUI() {
  const banner = document.getElementById('closedBanner');
  const btn    = document.getElementById('toggleOrdersBtn');
  if (!banner || !btn) return;
  const closed = !!settings.ordersClosed;
  banner.classList.toggle('visible', closed);
  btn.classList.toggle('closed', closed);
  btn.innerHTML = closed
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg> RENDELÉS MEGNYITÁSA`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> RENDELÉS ZÁRÁSA`;
}

/* ── Össztörlés ── */
async function clearDelivered() {
  if (!db) return;
  if (!confirm('Biztosan törlöd az összes lezárt rendelést?')) return;
  const today = todayStr();
  const snap  = await db.ref('orders').orderByChild('date').equalTo(today).once('value');
  const data  = snap.val() || {};
  const updates = {};
  Object.entries(data).forEach(([id, o]) => {
    if (o.status === 'delivered') updates[id] = null;
  });
  if (Object.keys(updates).length === 0) {
    showAdminToast('Nincs lezárt rendelés');
    return;
  }
  await db.ref('orders').update(updates);
  showAdminToast(`✓ ${Object.keys(updates).length} lezárt rendelés törölve`);
}

function updateModeLabel() {
  // Státusz szöveg a fejlécben
  const textEl = document.getElementById('statusText');
  if (textEl) {
    const dot = document.getElementById('statusDot');
    if (dot && dot.classList.contains('online')) {
      textEl.textContent = settings.mode === 'test' ? 'Teszt Online' : 'Online';
    }
  }
  // Mód badge frissítése
  const badge = document.getElementById('modeBadge');
  if (!badge) return;
  if (settings.mode === 'test') {
    badge.textContent = 'Teszt';
    badge.className   = 'ah__mode-badge mode-test';
    badge.title       = 'Teszt mód — kattints az Éles módra váltáshoz';
  } else {
    badge.textContent = 'Éles';
    badge.className   = 'ah__mode-badge mode-live';
    badge.title       = 'Éles mód — kattints a Teszt módra váltáshoz';
  }
}

function openSettingsPanel()  { document.getElementById('settingsOverlay').classList.add('open'); }
function closeSettingsPanel() { document.getElementById('settingsOverlay').classList.remove('open'); }

function showAdminToast(msg) {
  const el = document.getElementById('adminToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════════════
   FIREBASE — Rendelések figyelése
   ══════════════════════════════════════════════════════ */
function listenOrders() {
  const today = todayStr();

  db.ref('orders')
    .orderByChild('date')
    .equalTo(today)
    .on('value', snap => {
      setStatus('online');
      const raw   = snap.val() || {};
      const orders = Object.values(raw);
      detectNewOrders(orders);
      renderBoard(orders);
      updateStats(orders);
    }, () => setStatus('offline'));
}

function detectNewOrders(orders) {
  let hasNew = false;
  orders.forEach(o => {
    if (o.status === 'new' && !knownIds.has(o.id)) {
      if (knownIds.size > 0) hasNew = true;   // ne szóljon az első betöltésnél
      knownIds.add(o.id);
    }
  });
  if (hasNew) playSound();
}

/* ══════════════════════════════════════════════════════
   BOARD RENDERELÉSE
   ══════════════════════════════════════════════════════ */
function renderBoard(orders) {
  const buckets = { new: [], preparing: [], ready: [], delivered: [] };

  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    // Típus szűrő alkalmazása
    if (activeFilter === 'pickup'   && o.type !== 'pickup')   return;
    if (activeFilter === 'delivery' && o.type !== 'delivery') return;
    if (buckets[o.status]) buckets[o.status].push(o);
  });

  // Rendezés: új rendelések legújabb elöl, többi legrégebben fogadott elöl
  buckets.new.sort((a, b)       => b.createdAt - a.createdAt);
  buckets.preparing.sort((a, b) => a.createdAt - b.createdAt);
  buckets.ready.sort((a, b)     => a.updatedAt - b.updatedAt);
  buckets.delivered.sort((a, b) => b.updatedAt - a.updatedAt);

  const emptyTexts = {
    new:       'Nincs új rendelés',
    preparing: 'Nincs folyamatban lévő',
    ready:     'Nincs kész rendelés',
    delivered: 'Nincs lezárt rendelés',
  };

  Object.entries(buckets).forEach(([status, list]) => {
    const body  = document.getElementById(`cards-${status}`);
    const badge = document.getElementById(`count-${status}`);

    badge.textContent = list.length;
    badge.classList.toggle('has-items', list.length > 0 && status === 'new');

    body.innerHTML = list.length === 0
      ? `<p class="ac__empty">${emptyTexts[status]}</p>`
      : list.map(buildCard).join('');
  });

  // Fejléc alert gomb
  const newCount = buckets.new.length;
  const alert    = document.getElementById('newOrderAlert');
  document.getElementById('newOrderCount').textContent = newCount;
  alert.classList.toggle('has-orders', newCount > 0);

  // Időzítő az eltelt időhöz
  clearInterval(timerRef);
  timerRef = setInterval(refreshTimers, 30_000);

  // Scroll jelzők inicializálása
  ['new','preparing','ready','delivered'].forEach(initScrollHints);
}

/* ══════════════════════════════════════════════════════
   RENDELÉS KÁRTYA HTML
   ══════════════════════════════════════════════════════ */
function buildCard(order) {
  const isDelivery = order.type === 'delivery';
  const elapsed    = elapsedStr(order.createdAt);
  const urgency    = urgencyClass(order.createdAt);

  /* Típus jelvény */
  const typeBadge = isDelivery
    ? `<span class="oc__type oc__type--delivery">
         ${icon('truck')} Kiszállítás
       </span>`
    : `<span class="oc__type oc__type--pickup">
         ${icon('home')} Személyes
       </span>`;

  /* Cím (kiszállításnál) */
  const addressRow = (isDelivery && order.address)
    ? `<span class="oc__info-row address">
         ${icon('pin')} ${esc(order.address)}
       </span>`
    : '';

  /* Tételek */
  const itemRows = (order.items || []).map(it =>
    `<div class="oc__item">
       <span class="oc__item-name">${esc(it.key)}</span>
       <span class="oc__item-qty">×${it.qty}</span>
       <span class="oc__item-price">${fmt(it.price * it.qty)}</span>
     </div>`
  ).join('');

  /* Megjegyzés */
  const notesRow = order.notes
    ? `<div class="oc__notes">${icon('chat')} ${esc(order.notes)}</div>`
    : '';

  /* Előre léptetés gomb */
  const nextMap = {
    new:       { label: 'Elkészítésre →', next: 'preparing' },
    preparing: { label: 'Kész →',         next: 'ready'     },
    ready:     { label: '✓ Átadva',       next: 'delivered' },
    delivered: null,
  };
  const adv = nextMap[order.status];
  const advBtn = adv
    ? `<button class="oc__btn oc__btn--advance"
               onclick="advance('${order.id}','${adv.next}')">${adv.label}</button>`
    : `<button class="oc__btn oc__btn--advance" disabled>Lezárva</button>`;

  const cancelBtn = (order.status !== 'delivered')
    ? `<button class="oc__btn oc__btn--cancel"
               onclick="cancelOrder('${order.id}')" title="Rendelés törlése">
         ${icon('x')}
       </button>`
    : '';

  return `
<div class="order-card order-card--${order.status}" id="card-${order.id}">
  <div class="oc__head">
    <span class="oc__num">#${String(order.orderNum || '?').padStart(3,'0')}</span>
    ${typeBadge}
    <span class="oc__elapsed oc__elapsed--${urgency}" data-ts="${order.createdAt}">${elapsed}</span>
  </div>
  <div class="oc__body">
    <div class="oc__customer">
      <span class="oc__name">${esc(order.name)}</span>
      <span class="oc__info-row">
        ${icon('phone')} ${esc(order.phone)}
      </span>
      ${addressRow}
    </div>
    <div class="oc__rule"></div>
    <div class="oc__items">${itemRows}</div>
    ${notesRow}
    <div class="oc__total">
      <span class="oc__total-label">Összesen</span>
      <span class="oc__total-amount">${fmt(order.total)}</span>
    </div>
  </div>
  <div class="oc__actions">
    ${cancelBtn}
    ${advBtn}
  </div>
</div>`;
}

/* ══════════════════════════════════════════════════════
   ÁLLAPOT VÁLTOZTATÁS
   ══════════════════════════════════════════════════════ */
window.advance = async function(id, newStatus) {
  if (!db) return;
  const btn = document.querySelector(`#card-${id} .oc__btn--advance`);
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    await db.ref(`orders/${id}`).update({ status: newStatus, updatedAt: Date.now() });
  } catch(e) {
    if (btn) { btn.disabled = false; }
    alert('Hiba: nem sikerült frissíteni a rendelést.');
  }
};

window.cancelOrder = async function(id) {
  if (!db || !confirm('Biztosan törlöd ezt a rendelést?')) return;
  try {
    await db.ref(`orders/${id}`).update({ status: 'cancelled', updatedAt: Date.now() });
  } catch(e) {
    alert('Hiba: nem sikerült törölni a rendelést.');
  }
};

/* ══════════════════════════════════════════════════════
   STATISZTIKÁK
   ══════════════════════════════════════════════════════ */
function updateStats(orders) {
  const visible  = orders.filter(o => o.status !== 'cancelled');
  const active   = visible.filter(o => ['new','preparing','ready'].includes(o.status));
  const waiting  = visible.filter(o => o.status === 'new');
  const done     = visible.filter(o => o.status === 'delivered');
  const revenue  = done.reduce((s, o) => s + (o.total || 0), 0);

  setText('statTotal',   visible.length);
  setText('statActive',  active.length);
  setText('statWaiting', waiting.length);
  setText('statDone',    done.length);
  setText('statRevenue', fmt(revenue));
}

/* ══════════════════════════════════════════════════════
   ÉLŐ ÓRA
   ══════════════════════════════════════════════════════ */
function startClock() {
  const el = document.getElementById('adminClock');
  function tick() {
    const d = new Date();
    el.textContent =
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  tick();
  setInterval(tick, 1000);
}

/* ══════════════════════════════════════════════════════
   IDŐZÍTŐK FRISSÍTÉSE
   ══════════════════════════════════════════════════════ */
function refreshTimers() {
  document.querySelectorAll('.oc__elapsed[data-ts]').forEach(el => {
    const ts = parseInt(el.dataset.ts, 10);
    el.textContent  = elapsedStr(ts);
    el.className    = `oc__elapsed oc__elapsed--${urgencyClass(ts)}`;
  });
}

/* ══════════════════════════════════════════════════════
   HANGJELZÉS
   ══════════════════════════════════════════════════════ */
function playSound() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Három rövid felcsendülő hang
    [[0, 660], [0.2, 880], [0.4, 1100]].forEach(([delay, freq]) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type            = 'sine';
      osc.frequency.value = freq;
      const t = audioCtx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  } catch (_) { /* AudioContext nem elérhető */ }
}

function initSoundToggle() {
  const btn   = document.getElementById('soundToggle');
  const iconOn  = document.getElementById('iconSoundOn');
  const iconOff = document.getElementById('iconSoundOff');
  btn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btn.classList.toggle('active', soundEnabled);
    btn.title = soundEnabled ? 'Hangjelzés kikapcsolása' : 'Hangjelzés bekapcsolása';
    iconOn.style.display  = soundEnabled ? '' : 'none';
    iconOff.style.display = soundEnabled ? 'none' : '';
    // AudioContext életjel (böngésző gesztus szükséges)
    if (soundEnabled && !audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_) {}
    }
  });
}

/* ══════════════════════════════════════════════════════
   STÁTUSZ JELZŐ
   ══════════════════════════════════════════════════════ */
function setStatus(state) {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.className = `ah__status-dot ${state}`;
  if (state === 'online') {
    text.textContent = settings.mode === 'test' ? 'Teszt Online' : 'Online';
  } else {
    const labels = { offline: 'Offline', connecting: 'Kapcsolódás…' };
    text.textContent = labels[state] || state;
  }
}

/* ══════════════════════════════════════════════════════
   SEGÉDFÜGGVÉNYEK
   ══════════════════════════════════════════════════════ */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function pad(n)  { return String(n).padStart(2, '0'); }
function setText(id, val) { document.getElementById(id).textContent = val; }

function fmt(n) {
  return Number(n || 0).toLocaleString('hu-HU') + ' Ft';
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function elapsedStr(ts) {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1)  return 'most';
  if (mins < 60) return `${mins} p`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h} ó ${m} p` : `${h} óra`;
}

function urgencyClass(ts) {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  const warn = Math.max(1, Math.floor(settings.waitTime * 0.5));
  if (mins >= settings.waitTime) return 'urgent';
  if (mins >= warn)              return 'warning';
  return 'ok';
}

/* SVG ikonok */
function icon(name) {
  const icons = {
    truck: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="1" y="3" width="15" height="13" rx="1"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
    home:  `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    phone: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.68 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.16 6.16l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    pin:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    chat:  `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:2px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    x:     `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  };
  return icons[name] || '';
}

/* ══════════════════════════════════════════════════════
   SCROLL JELZŐK
   ══════════════════════════════════════════════════════ */
function initScrollHints(status) {
  const body    = document.getElementById(`cards-${status}`);
  const hintTop = document.getElementById(`hint-top-${status}`);
  const hintBot = document.getElementById(`hint-bot-${status}`);
  if (!body || !hintTop || !hintBot) return;

  function update() {
    const hasTop = body.scrollTop > 10;
    const hasBot = body.scrollTop + body.clientHeight < body.scrollHeight - 10;
    hintTop.classList.toggle('visible', hasTop);
    hintBot.classList.toggle('visible', hasBot);
  }

  body.addEventListener('scroll', update, { passive: true });
  // Kattintásra görgetés
  hintTop.addEventListener('click', () => body.scrollBy({ top: -200, behavior: 'smooth' }));
  hintBot.addEventListener('click', () => body.scrollBy({ top:  200, behavior: 'smooth' }));
  // Kis késleltetéssel fut le (DOM frissülés után)
  setTimeout(update, 50);
}

/* ══════════════════════════════════════════════════════
   ESEMÉNYKEZELŐK
   ══════════════════════════════════════════════════════ */
// Mód badge — kattintásra vált Teszt/Éles között
document.getElementById('modeBadge').addEventListener('click', async () => {
  settings.mode = settings.mode === 'test' ? 'live' : 'test';
  if (db) await db.ref('settings/mode').set(settings.mode);
  updateModeLabel();
  showAdminToast(settings.mode === 'test' ? '🧪 Teszt módra váltva' : '🟢 Éles módra váltva');
});

document.getElementById('settingsToggle').addEventListener('click', openSettingsPanel);
document.getElementById('settingsClose').addEventListener('click', closeSettingsPanel);
document.getElementById('settingsSave').addEventListener('click', saveSettings);
document.getElementById('settingsOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSettingsPanel();
});

document.getElementById('toggleOrdersBtn').addEventListener('click', toggleOrdersClosed);
document.getElementById('clearDeliveredBtn').addEventListener('click', clearDelivered);

// Inline bejövős idő — dropdown változásakor frissíti a gomb feliratát
document.getElementById('inlineWaitTime').addEventListener('change', function() {
  updateWaitSaveBtn(document.getElementById('saveWaitTimeBtn'), parseInt(this.value));
});

// Inline bejövős idő — mentés
document.getElementById('saveWaitTimeBtn').addEventListener('click', async function() {
  const val = parseInt(document.getElementById('inlineWaitTime').value);
  settings.waitTime = val;
  setSelectVal('settingWaitTime', String(val));
  if (db) await db.ref('settings/waitTime').set(val);
  updateWaitSaveBtn(this, val);
  flashSaveBtn(this);
  showAdminToast(`✓ Bejövős idő mentve: ${val >= 60 ? '1 óra' : val + ' perc'}`);
});

// Inline kiszállítás idő — dropdown változásakor frissíti a gomb feliratát
document.getElementById('inlineDeliveryTime').addEventListener('change', function() {
  updateDeliverySaveBtn(document.getElementById('saveDeliveryTimeBtn'), this.value);
});

// Inline kiszállítás idő — mentés
document.getElementById('saveDeliveryTimeBtn').addEventListener('click', async function() {
  const val = document.getElementById('inlineDeliveryTime').value;
  settings.deliveryTime = val;
  settings.deliveryEta  = val;
  setSelectVal('settingDeliveryEta', val);
  if (db) await db.ref('settings').update({ deliveryTime: val, deliveryEta: val });
  updateDeliverySaveBtn(this, val);
  flashSaveBtn(this);
  showAdminToast(`✓ Kiszállítás idő mentve: ${val}`);
});

function flashSaveBtn(btn) {
  btn.classList.add('saved');
  setTimeout(() => btn.classList.remove('saved'), 2000);
}

// Szűrő fülek
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    activeFilter = tab.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    // Újrarenderelés az aktuális adatokkal
    if (db) db.ref('orders').orderByChild('date').equalTo(todayStr()).once('value').then(snap => {
      const orders = Object.values(snap.val() || {});
      renderBoard(orders);
      updateStats(orders);
    });
  });
});

/* ══════════════════════════════════════════════════════
   INDÍTÁS
   ══════════════════════════════════════════════════════ */

// Badge alapértelmezett stílus betöltés előtt
updateModeLabel();

init();
