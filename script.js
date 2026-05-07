/* ══════════════════════════════════════
   3D INTRO
   ══════════════════════════════════════ */
(function () {
  const intro     = document.getElementById('intro');
  const skipBtn   = document.getElementById('introSkip');
  const canvas    = document.getElementById('intro-embers');
  const ctx       = canvas.getContext('2d');

  /* ── Parázs részecskék ── */
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const embers = Array.from({ length: 55 }, () => spawnEmber(true));
  function spawnEmber(random) {
    return {
      x:    Math.random() * canvas.width,
      y:    random ? Math.random() * canvas.height : canvas.height + 10,
      r:    Math.random() * 2.2 + 0.6,
      vy:   -(Math.random() * 1.2 + 0.4),
      vx:   (Math.random() - 0.5) * 0.6,
      life: Math.random(),
      decay: Math.random() * 0.004 + 0.002,
      hue:  Math.random() * 30 + 5,   /* piros–narancs */
    };
  }
  let emberRAF;
  function drawEmbers() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    embers.forEach((e, i) => {
      e.x += e.vx + Math.sin(Date.now() * 0.001 + i) * 0.3;
      e.y += e.vy;
      e.life -= e.decay;
      if (e.life <= 0 || e.y < -10) { embers[i] = spawnEmber(false); return; }
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue}, 100%, 65%, ${e.life})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsla(${e.hue}, 100%, 60%, .8)`;
      ctx.fill();
    });
    emberRAF = requestAnimationFrame(drawEmbers);
  }
  drawEmbers();

  /* ── GSAP Timeline ── */
  const curtainTop    = intro.querySelector('.intro__curtain--top');
  const curtainBottom = intro.querySelector('.intro__curtain--bottom');

  function runIntro() {
    const tl = gsap.timeline({ onComplete: hideIntro });

    /* Curtain szétnyílik → megmutatja a bg-t */
    tl.to(curtainTop,    { y: '-100%', duration: .9, ease: 'power3.inOut' })
      .to(curtainBottom, { y:  '100%', duration: .9, ease: 'power3.inOut' }, '<')

    /* Kihagyás gomb */
      .to('.intro__skip', { opacity: 1, duration: .4 }, '-=.4')

    /* "Budapest szívében" besuhan */
      .fromTo('.intro__city',
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.1')

    /* Logo 3D flip-in */
      .fromTo('.intro__logo',
        { opacity: 0, rotationX: 90, y: 40, transformOrigin: '50% 100%' },
        { opacity: 1, rotationX: 0,  y: 0,  duration: 1.1, ease: 'power4.out' }, '-=.1')

    /* "PIZZA & PUB" megjelenik */
      .fromTo('.intro__sub',
        { opacity: 0, letterSpacing: '1em' },
        { opacity: 1, letterSpacing: '.55em', duration: .8, ease: 'power3.out' }, '-=.4')

    /* Vízszintes vonal kihúzódik */
      .to('.intro__line',
        { width: 220, duration: .8, ease: 'power2.out' }, '-=.4')

    /* Hold */
      .to({}, { duration: 1.8 })

    /* Logo felerősödik, majd elillan */
      .to('.intro__logo', { scale: 1.05, filter: 'drop-shadow(0 0 80px rgba(196,30,30,.9))', duration: .5, ease: 'power2.inOut' })
      .to('.intro__content', { opacity: 0, duration: .4, ease: 'power2.in' }, '-=.1')

    /* Függöny visszacsukódik */
      .to(curtainTop,    { y: '0%', duration: .7, ease: 'power3.inOut' }, '-=.2')
      .to(curtainBottom, { y:  '0%', duration: .7, ease: 'power3.inOut' }, '<')

    /* Intro eltűnik, oldal megjelenik */
      .to(intro, { opacity: 0, duration: .5, ease: 'power2.in' }, '-=.15');
  }

  function hideIntro() {
    cancelAnimationFrame(emberRAF);
    intro.remove();
  }

  skipBtn.addEventListener('click', () => {
    gsap.killTweensOf('*');
    gsap.to(intro, { opacity: 0, duration: .4, onComplete: hideIntro });
  });

  runIntro();
})();

/* ── Nav scroll effect ── */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

/* ── Count-up animáció ── */
function countUp(el) {
  const target = +el.dataset.target;
  const duration = 1200;
  const start = performance.now();
  el.classList.add('counting');
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(tick);
    else { el.textContent = target; el.classList.remove('counting'); }
  };
  requestAnimationFrame(tick);
}

/* ── Reveal on scroll ── */
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      e.target.querySelectorAll('.stats__num[data-target]').forEach(countUp);
      observer.unobserve(e.target);
    }
  }),
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);
reveals.forEach(el => observer.observe(el));

/* ── Mobile nav ── */
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  burger.classList.toggle('active');
});
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    burger.classList.remove('active');
  });
});

/* ── Menu tabs ── */
const tabs = document.querySelectorAll('.menu-tab');
const cards = document.querySelectorAll('.menu-card');
const pizzaSizeNote = document.getElementById('pizzaSizeNote');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const cat = tab.dataset.tab;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Pizza méret fejléc csak pizza tab-nál
    if (pizzaSizeNote) {
      pizzaSizeNote.style.display = cat === 'pizza' ? '' : 'none';
    }

    cards.forEach(card => {
      if (card.dataset.category === cat) {
        const isInfo = card.classList.contains('menu-card--info');
        card.style.display = isInfo ? 'flex' : 'grid';
        requestAnimationFrame(() => {
          card.style.opacity = '0';
          card.style.transform = 'translateY(16px)';
          requestAnimationFrame(() => {
            card.style.transition = 'opacity .4s ease, transform .4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
        });
      } else {
        card.style.display = 'none';
      }
    });
  });
});

/* ── Booking form ── */
const form = document.getElementById('bookingForm');
if (form) {
  // Set min date to today
  const dateInput = document.getElementById('date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.textContent = 'Köszönjük! Hamarosan felvesszük a kapcsolatot.';
    btn.disabled = true;
    btn.style.background = '#1a3a1a';
    btn.style.borderColor = '#2d6a2d';
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
      btn.style.background = '';
      btn.style.borderColor = '';
      form.reset();
    }, 4000);
  });
}

/* ── Subtle parallax on hero image ── */
const heroImg = document.querySelector('.hero__img');
if (heroImg) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y < window.innerHeight) {
      heroImg.style.transform = `scale(1.05) translateY(${y * 0.25}px)`;
    }
  }, { passive: true });
}

/* ── Active nav link highlight ── */
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav__links a[href^="#"]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  navAnchors.forEach(a => {
    a.style.color = a.getAttribute('href') === `#${current}` ? 'var(--cream)' : '';
  });
}, { passive: true });

/* ══════════════════════════════════════
   KOSÁR RENDSZER
   ══════════════════════════════════════ */

const cart = [];

/* ── Ár szöveg feldolgozása ── */
function parsePriceText(text) {
  // Szóközök és nem törhető szóközök eltávolítása, "Ft" eltávolítása
  const clean = text.replace(/[\s\u00a0]/g, '').replace('Ft', '');
  if (clean.includes('/')) {
    const parts = clean.split('/');
    const small = parts[0] === '—' ? null : parseInt(parts[0]);
    const large = parseInt(parts[1]);
    return { type: 'pizza', small, large };
  }
  return { type: 'single', single: parseInt(clean) };
}

/* ── Ár formázása ── */
function formatPrice(n) {
  return n.toLocaleString('hu-HU') + ' Ft';
}

/* ── "Kosárba" gombok hozzáadása az étlapkártyákhoz ── */
function initCartButtons() {
  document.querySelectorAll('.menu-card:not(.menu-card--info)').forEach(card => {
    const nameEl = card.querySelector('h3');
    const priceEl = card.querySelector('.menu-card__price');
    const footer  = card.querySelector('.menu-card__footer');
    if (!nameEl || !priceEl || !footer) return;

    const name = nameEl.textContent.trim();
    const priceText = priceEl.textContent.trim();
    const priceData = parsePriceText(priceText);

    // Kihagyjuk ha az ár nem értelmezhető
    if (
      (priceData.type === 'single' && isNaN(priceData.single)) ||
      (priceData.type === 'pizza' && isNaN(priceData.large))
    ) return;

    const btn = document.createElement('button');
    btn.className = 'add-to-cart-btn';
    btn.textContent = '+ Kosárba';
    btn.addEventListener('click', () => handleAddToCart(name, priceData));
    footer.appendChild(btn);
  });
}

/* ── "Kosárba" gomb kezelése ── */
function handleAddToCart(name, priceData) {
  if (priceData.type === 'pizza') {
    showSizePicker(name, priceData);
  } else {
    addToCart(name, priceData.single, '');
  }
}

/* ── Pizza méret választó ── */
let pendingSizeItem = null;

function showSizePicker(name, priceData) {
  pendingSizeItem = { name, priceData };
  document.getElementById('sizeModalName').textContent = name;

  const smallBtn = document.getElementById('sizeSmall');
  const largePriceEl = document.getElementById('sizePriceLarge');

  if (priceData.small) {
    smallBtn.style.display = '';
    document.getElementById('sizePriceSmall').textContent = formatPrice(priceData.small);
  } else {
    smallBtn.style.display = 'none';
  }

  largePriceEl.textContent = formatPrice(priceData.large);
  document.getElementById('sizeModalOverlay').classList.add('active');
}

function hideSizePicker() {
  document.getElementById('sizeModalOverlay').classList.remove('active');
  pendingSizeItem = null;
}

document.getElementById('sizeSmall').addEventListener('click', () => {
  if (!pendingSizeItem) return;
  addToCart(pendingSizeItem.name, pendingSizeItem.priceData.small, '26 cm');
  hideSizePicker();
});
document.getElementById('sizeLarge').addEventListener('click', () => {
  if (!pendingSizeItem) return;
  addToCart(pendingSizeItem.name, pendingSizeItem.priceData.large, '32 cm');
  hideSizePicker();
});
document.getElementById('sizeCancel').addEventListener('click', hideSizePicker);
document.getElementById('sizeModalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) hideSizePicker();
});

/* ── Kosárba adás / eltávolítás ── */
function addToCart(name, price, size) {
  const key = size ? `${name} (${size})` : name;
  const existing = cart.find(i => i.key === key);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ key, name, price, size, qty: 1 });
  }
  updateCartUI();
  flashFab();
}

function changeQty(key, delta) {
  const idx = cart.findIndex(i => i.key === key);
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartUI();
}

/* ── Kosár UI frissítése ── */
function getCartCount() { return cart.reduce((s, i) => s + i.qty, 0); }
function getCartTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }

function updateCartUI() {
  const count = getCartCount();
  const fab = document.getElementById('cartFab');
  document.getElementById('cartCount').textContent = count;
  fab.style.display = count > 0 ? 'flex' : 'none';

  const itemsEl = document.getElementById('cartItems');
  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">A kosár üres</p>';
  } else {
    itemsEl.innerHTML = cart.map(item => {
      const safeKey = item.key.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<div class="cart-item">
        <div class="cart-item__info">
          <span class="cart-item__name">${item.key}</span>
          <span class="cart-item__price">${formatPrice(item.price)} / db</span>
        </div>
        <div class="cart-item__controls">
          <button class="cart-qty-btn" onclick="changeQty('${safeKey}', -1)">−</button>
          <span class="cart-qty">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeQty('${safeKey}', 1)">+</button>
        </div>
        <span class="cart-item__subtotal">${formatPrice(item.price * item.qty)}</span>
      </div>`;
    }).join('');
  }

  document.getElementById('cartTotal').textContent = formatPrice(getCartTotal());
}

function flashFab() {
  const fab = document.getElementById('cartFab');
  fab.classList.remove('bounce');
  void fab.offsetWidth; // reflow
  fab.classList.add('bounce');
}

/* ── Kosár fiók nyitás/zárás ── */
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('active');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('active');
}

document.getElementById('cartFab').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

/* ── Rendelési form megnyitás ── */
function openOrderForm() {
  closeCart();
  // Összefoglaló frissítése
  const sumEl = document.getElementById('orderSummary');
  sumEl.innerHTML = cart.map(i =>
    `<div class="order-summary-row">
       <span class="order-summary-name">${i.key} × ${i.qty}</span>
       <span class="order-summary-price">${formatPrice(i.price * i.qty)}</span>
     </div>`
  ).join('') +
  `<div class="order-summary-row">
     <span class="order-summary-name">Összesen</span>
     <span>${formatPrice(getCartTotal())}</span>
   </div>`;
  document.getElementById('orderModalOverlay').classList.add('active');
}
function closeOrderForm() {
  document.getElementById('orderModalOverlay').classList.remove('active');
}

document.getElementById('cartCheckout').addEventListener('click', openOrderForm);
document.getElementById('orderModalClose').addEventListener('click', closeOrderForm);
document.getElementById('orderModalOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeOrderForm();
});

/* ── Kiszállítás / átvétel toggle ── */
document.querySelectorAll('input[name="orderType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const isDelivery = radio.value === 'delivery';
    const ag = document.getElementById('addressGroup');
    ag.style.display = isDelivery ? '' : 'none';
    if (isDelivery) {
      document.getElementById('orderAddress').setAttribute('required', '');
    } else {
      document.getElementById('orderAddress').removeAttribute('required');
    }
  });
});

/* ══════════════════════════════════════════════════════
   FIREBASE INICIALIZÁLÁS
   ══════════════════════════════════════════════════════ */
let db = null;

(function initFirebase() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || cfg.apiKey === 'ILLESZD_BE_ITT') return;
  try {
    const app = firebase.initializeApp(cfg);
    db = firebase.database(app);
  } catch (e) {
    console.warn('Firebase init hiba:', e);
  }
})();

/* ── WhatsApp üzenet összeállítása ── */
function buildWhatsAppMsg(data, isDelivery) {
  let msg = '🍕 *ARAMIS RENDELÉS*\n\n';
  msg += `*${isDelivery ? '🚗 Kiszállítás' : '🏠 Személyes átvétel'}*\n`;
  msg += `Név: ${data.get('name')}\n`;
  msg += `Tel: ${data.get('phone')}\n`;
  if (isDelivery && data.get('address')) msg += `Cím: ${data.get('address')}\n`;
  if (data.get('notes')) msg += `Megjegyzés: ${data.get('notes')}\n`;
  msg += '\n*Rendelt tételek:*\n';
  cart.forEach(i => { msg += `• ${i.key} × ${i.qty}  —  ${formatPrice(i.price * i.qty)}\n`; });
  msg += `\n*Összesen: ${formatPrice(getCartTotal())}*`;
  return msg;
}

/* ── Rendelés elküldése Firebase-be ── */
async function submitOrderToFirebase(orderData) {
  // Sorszám atomikus növelése
  const counterRef = db.ref('meta/orderCounter');
  let orderNum = 1;
  await counterRef.transaction(cur => { orderNum = (cur || 0) + 1; return orderNum; });

  const id = `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await db.ref(`orders/${id}`).set({
    id,
    orderNum,
    date:      new Date().toISOString().slice(0, 10),
    status:    'new',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...orderData,
  });
  return orderNum;
}

/* ── Sikeres rendelés képernyő megjelenítése ── */
function showOrderSuccess(orderNum, waMsg, orderType) {
  const form    = document.getElementById('orderForm');
  const success = document.getElementById('orderSuccess');
  const numEl   = document.getElementById('successOrderNum');
  const etaEl   = document.getElementById('successEta');

  form.style.display    = 'none';
  success.style.display = '';
  numEl.textContent     = `#${String(orderNum).padStart(3, '0')}`;

  // Becsült idő Firebase beállításokból
  if (db) {
    db.ref('settings').once('value').then(snap => {
      const s   = snap.val() || {};
      const eta = orderType === 'delivery'
        ? (s.deliveryEta || '45–60')
        : (s.pickupEta   || '20–30');
      const label = orderType === 'delivery' ? 'Kiszállítás' : 'Személyes átvétel';
      etaEl.textContent = `${label}: ~${eta} perc`;
    }).catch(() => {
      etaEl.textContent = 'Hamarosan felvesszük a kapcsolatot.';
    });
  } else {
    etaEl.textContent = 'Hamarosan felvesszük a kapcsolatot.';
  }

  // Bezárás
  document.getElementById('successCloseBtn').onclick = () => {
    closeOrderForm();
    setTimeout(() => {
      form.style.display    = '';
      success.style.display = 'none';
    }, 400);
  };
}

/* ── Form beküldés ── */
document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data       = new FormData(e.target);
  const isDelivery = data.get('orderType') === 'delivery';
  const waMsg      = buildWhatsAppMsg(data, isDelivery);

  const orderData = {
    type:    data.get('orderType'),
    name:    data.get('name'),
    phone:   data.get('phone'),
    address: isDelivery ? (data.get('address') || '') : '',
    notes:   data.get('notes') || '',
    items:   cart.map(i => ({ key: i.key, name: i.name, price: i.price, size: i.size, qty: i.qty })),
    total:   getCartTotal(),
  };

  const submitBtn = document.getElementById('orderSubmitBtn');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Küldés…';

  // Kosár törlése (UI-ban már nem látszik)
  const cartSnapshot = [...cart];

  if (db) {
    try {
      const orderNum = await submitOrderToFirebase(orderData);
      cart.length = 0;
      updateCartUI();
      e.target.reset();
      document.getElementById('addressGroup').style.display = '';
      showOrderSuccess(orderNum, waMsg, orderData.type);
    } catch (err) {
      console.error('Rendelés mentési hiba:', err);
      // Fallback: WhatsApp
      window.open(`https://wa.me/36305710530?text=${encodeURIComponent(waMsg)}`, '_blank');
      cart.length = 0;
      updateCartUI();
      e.target.reset();
      document.getElementById('addressGroup').style.display = '';
      closeOrderForm();
      showToast('✓ Rendelésed WhatsApp-on elküldve!');
    }
  } else {
    // Firebase nincs beállítva → WhatsApp
    window.open(`https://wa.me/36305710530?text=${encodeURIComponent(waMsg)}`, '_blank');
    cart.length = 0;
    updateCartUI();
    e.target.reset();
    document.getElementById('addressGroup').style.display = '';
    closeOrderForm();
    showToast('✓ Rendelésed WhatsApp-on elküldve!');
  }

  submitBtn.disabled    = false;
  submitBtn.innerHTML   = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Rendelés elküldése';
});

function showToast(msg) {
  const toast = document.createElement('div');
  toast.className   = 'order-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

/* ── Rendelés zárva figyelés ── */
(function watchOrdersClosed() {
  if (!db) return;
  db.ref('settings/ordersClosed').on('value', snap => {
    const closed  = !!snap.val();
    const checkout = document.getElementById('cartCheckout');
    const submitBtn = document.getElementById('orderSubmitBtn');
    const banner  = document.getElementById('orderClosedBanner');

    if (checkout) {
      checkout.disabled    = closed;
      checkout.textContent = closed ? 'Rendelés szünetel' : 'Rendelés leadása →';
    }
    if (submitBtn) submitBtn.disabled = closed;
    if (banner) banner.style.display = closed ? '' : 'none';
  });
})();

/* ── Inicializálás ── */
initCartButtons();
