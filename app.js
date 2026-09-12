(function () {
  'use strict';

  const CONFIG = window.ZORA_CONFIG || {};
  const STORE_EMAIL = CONFIG.storeEmail || 'zoraofficial005@gmail.com';
  const KEYS = {
    cart: 'zora_cart',
    session: 'zora_account_user',
    accounts: 'zora_accounts',
    settings: 'zora_settings',
    promoUsage: 'zora_promo_usage',
    adminSession: 'zora_admin_session',
    visitorId: 'zora_visitor_id',
    ordersReset: 'zora_orders_reset_v2'
  };

  const PACKAGING_FEE = 100;
  const MEMBER_MONTHLY_OFF = 50;

  const DEFAULT_QRS = {
    GCash: 'assets/payments/gcash.png',
    Maya: 'assets/payments/maya.png',
    'Bank Transfer': 'assets/payments/bank.png'
  };

  const DEFAULT_SETTINGS = {
    instagram: 'zora.ph_',
    facebook: 'Zora.Official.ph',
    facebookUrl: CONFIG.social?.facebook || '',
    adminPassword: CONFIG.adminPassword || 'zora2024',
    promos: [{ code: 'ZORA10', type: 'percent', value: 10, minOrder: 500, maxRedemptions: 100, perCustomerLimit: 1 }],
    paymentQrs: { ...DEFAULT_QRS },
    web3formsKey: '',
    paymongoPublicKey: CONFIG.paymongoPublicKey || '',
    paymentMode: 'automatic',
    shippingFee: 0,
    freeShippingMin: 0,
    freeShippingAll: false,
    ourStoryTitle: 'Our story',
    ourStoryBody:
      'What started as a passion for sculptural jewelry has evolved into a full collection of pieces made to move from morning light to evening glow.',
    heroSlides: JSON.parse(JSON.stringify(CONFIG.heroSlides || [])),
    collections: JSON.parse(JSON.stringify(CONFIG.collections || [])),
    categoryCards: JSON.parse(JSON.stringify(CONFIG.categoryCards || [])),
    blogs: JSON.parse(JSON.stringify(CONFIG.blogs || [])),
    shippingText:
      'Orders ship from the Philippines after payment is confirmed. Metro Manila usually 2–4 days; provincial 4–8 days.',
    returnsText:
      'Unused pieces can be exchanged within 7 days. Earrings are final sale for hygiene. Contact customer service with your order number.',
    sizeCharts: {
      rings:
        'US 6 — 16.5 mm inner diameter\nUS 7 — 17.3 mm\nUS 8 — 18.1 mm\nUS 9 — 18.9 mm\n\nMeasure at the end of the day. If you are between sizes, choose the larger one.',
      earrings:
        '2mm — petite stud\n3mm — everyday stud\n4mm — classic stud\n5mm — statement stud\n6mm — bold stud\n\nMeasured across the face of the stud.',
      bracelets:
        '17CM — petite wrist\n19CM — average wrist\n21CM — larger wrist\n\nMeasure your wrist, then add 1–2 cm for comfort. Adjustable pieces may list a range such as 24–25CM.',
      necklaces:
        '40CM — choker / high neck\n45CM — standard\n50CM — longer drop\n\nMeasure from the base of the neck. Layered looks often mix 40CM and 45CM.'
    }
  };

  let products = [];
  let cart = [];
  let settings = { ...DEFAULT_SETTINGS };
  let currentAccount = null;
  let orders = [];
  let activeProduct = null;
  let selectedColor = null;
  let selectedSize = null;
  let quantity = 1;
  let heroIndex = 0;
  let heroTimer = null;
  let galleryImages = [];
  let galleryIndex = 0;
  let appliedPromo = null;
  let lastOrder = null;
  let adminTapCount = 0;
  let paymentPollTimer = null;
  let paymentPollBusy = false;
  let adminTapTimer = null;
  let productFilter = 'all';
  let showAllProducts = false;
  let updateHeaderTheme = () => {};
  let orderWatchTimer = null;
  let pendingResetEmail = '';
  let galleryLiteBound = false;
  let galleryScale = 1;
  let galleryPanX = 0;
  let galleryPanY = 0;
  let closeGalleryLite = () => {};
  let memberOffUsed = false;
  let premiumPackaging = false;
  let presenceTimer = null;
  let liveStatsTimer = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const escapeHtml = (str) =>
    String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formatPrice = (amount) =>
    '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const generateId = () => 'z' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const MAX_PRODUCT_PHOTOS = 12;

  const parseSizeList = (value) =>
    String(value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const variantKey = (size, color) => `${size || ''}||${color || ''}`;

  const getVariantStock = (product, size, color) => {
    const map = product?.variantStocks && typeof product.variantStocks === 'object' ? product.variantStocks : {};
    const exact = map[variantKey(size, color)];
    if (exact != null && exact !== '') return Math.max(0, Number(exact) || 0);
    if (size && map[variantKey(size, '')] != null) return Math.max(0, Number(map[variantKey(size, '')]) || 0);
    if (color && map[variantKey('', color)] != null) return Math.max(0, Number(map[variantKey('', color)]) || 0);
    if (size && map[size] != null) return Math.max(0, Number(map[size]) || 0);
    if (color && map[color] != null) return Math.max(0, Number(map[color]) || 0);
    if (Object.keys(map).length) return 0;
    return Math.max(0, Number(product?.stock) || 0);
  };

  const sizeIsSoldOut = (product, size) => {
    const colors = product?.colors || [];
    if (colors.length) return colors.every((color) => getVariantStock(product, size, color) <= 0);
    return getVariantStock(product, size, '') <= 0;
  };

  const colorIsSoldOut = (product, color, size) => {
    if (size) return getVariantStock(product, size, color) <= 0;
    const sizes = product?.sizes || [];
    if (sizes.length) return sizes.every((s) => getVariantStock(product, s, color) <= 0);
    return getVariantStock(product, '', color) <= 0;
  };

  const firstInStockOptions = (product) => {
    const sizes = product?.sizes || [];
    const colors = product?.colors || [];
    if (sizes.length && colors.length) {
      for (const size of sizes) {
        for (const color of colors) {
          if (getVariantStock(product, size, color) > 0) return { size, color };
        }
      }
      return { size: sizes[0], color: colors[0] };
    }
    if (sizes.length) {
      const size = sizes.find((s) => getVariantStock(product, s, '') > 0) || sizes[0];
      return { size, color: null };
    }
    if (colors.length) {
      const color = colors.find((c) => getVariantStock(product, '', c) > 0) || colors[0];
      return { size: null, color };
    }
    return { size: null, color: null };
  };

  const stockKeyForItem = (product, size, color) => {
    const map = product?.variantStocks && typeof product.variantStocks === 'object' ? product.variantStocks : {};
    const keys = [variantKey(size, color), variantKey(size, ''), variantKey('', color), size, color, '||'];
    const found = keys.find((k) => k != null && k !== '' && map[k] != null);
    return found || (Object.keys(map).length ? variantKey(size || '', color || '') : '');
  };

  const applyStockDelta = async (items, direction) => {
    const sign = direction < 0 ? -1 : 1;
    const seen = new Map();
    const planned = [];
    for (const item of items || []) {
      const product = (await refreshProductStockRow(item.id)) || products.find((p) => p.id === item.id);
      if (!product) {
        if (sign < 0) return false;
        continue;
      }
      const qty = Math.max(1, Number(item.quantity || item.qty) || 1);
      const map = { ...(product.variantStocks || {}) };
      const key = stockKeyForItem(product, item.size || '', item.color || '');
      if (key || Object.keys(map).length) {
        const use = key || '||';
        const next = (Number(map[use]) || 0) + sign * qty;
        if (sign < 0 && next < 0) return false;
        planned.push({ product, qty, use, next: Math.max(0, next), variant: true });
      } else {
        const next = (Number(product.stock) || 0) + sign * qty;
        if (sign < 0 && next < 0) return false;
        planned.push({ product, qty, next: Math.max(0, next), variant: false });
      }
    }
    planned.forEach((row) => {
      const product = row.product;
      if (row.variant) {
        const map = { ...(product.variantStocks || {}) };
        map[row.use] = row.next;
        product.variantStocks = map;
      } else {
        product.stock = row.next;
      }
      product.stock = productTotalStock(product);
      seen.set(product.id, product);
    });
    for (const product of seen.values()) {
      await saveProductRemote(product);
    }
    if (seen.size) {
      persistProductsCache();
      renderProducts();
      if (activeProduct && seen.has(activeProduct.id)) {
        activeProduct = products.find((p) => p.id === activeProduct.id) || activeProduct;
        refreshPdpStock();
      }
    }
    return seen.size > 0;
  };

  const deductOrderStock = async (items) => applyStockDelta(items, -1);
  const restoreOrderStock = async (items) => applyStockDelta(items, 1);

  const refreshProductStockRow = async (id) => {
    try {
      const rows = await supaRequest(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id,stock,variant_stocks,sizes,colors`
      );
      const row = Array.isArray(rows) && rows[0];
      if (!row) return products.find((p) => p.id === id) || null;
      let product = products.find((p) => p.id === id);
      if (!product) {
        product = mapProductRow(row);
        products.push(product);
      } else {
        if (row.stock != null) product.stock = Number(row.stock) || 0;
        if (row.variant_stocks && typeof row.variant_stocks === 'object') product.variantStocks = row.variant_stocks;
      }
      return product;
    } catch {
      return products.find((p) => p.id === id) || null;
    }
  };

  const cartStockError = async (items) => {
    for (const item of items || []) {
      const product = await refreshProductStockRow(item.id);
      const label = [item.name, item.size, item.color].filter(Boolean).join(' · ') || 'This piece';
      if (!product) return label + ' is no longer available.';
      const qty = Math.max(1, Number(item.quantity || item.qty) || 1);
      const have = getVariantStock(product, item.size, item.color);
      if (have < qty) {
        return have <= 0
          ? label + ' just sold out. Someone else is paying for the last piece, or it was already bought.'
          : 'Only ' + have + ' left for ' + label + '.';
      }
    }
    return '';
  };

  const refreshCatalogStock = async () => {
    try {
      const rows = await supaRequest('/rest/v1/products?select=id,stock,variant_stocks');
      if (!Array.isArray(rows) || !rows.length) return;
      const byId = new Map(rows.map((row) => [row.id, row]));
      products.forEach((product) => {
        const row = byId.get(product.id);
        if (!row) return;
        if (row.stock != null) product.stock = Number(row.stock) || 0;
        if (row.variant_stocks && typeof row.variant_stocks === 'object') product.variantStocks = row.variant_stocks;
        product.stock = productTotalStock(product);
      });
      persistProductsCache();
      renderProducts();
      if (activeProduct) {
        activeProduct = products.find((p) => p.id === activeProduct.id) || activeProduct;
        refreshPdpStock();
      }
      updateCartUI();
    } catch {
      /* ignore */
    }
  };

  const productTotalStock = (product) => {
    const map = product?.variantStocks && typeof product.variantStocks === 'object' ? product.variantStocks : {};
    const vals = Object.values(map)
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n));
    if (vals.length) return vals.reduce((a, b) => a + b, 0);
    return Math.max(0, Number(product?.stock) || 0);
  };

  const stockSummary = (product) => {
    const sizes = product?.sizes || [];
    const colors = product?.colors || [];
    if (sizes.length && !colors.length) {
      return sizes.map((s) => `${s} ${getVariantStock(product, s, '')}`).join(' · ');
    }
    if (colors.length && !sizes.length) {
      return colors.map((c) => `${c} ${getVariantStock(product, '', c)}`).join(' · ');
    }
    return 'stock ' + productTotalStock(product);
  };

  const readChipList = (root, tabSel) =>
    [...(root?.querySelectorAll(tabSel) || [])]
      .map((input) => input.value.trim())
      .filter(Boolean);

  const readVariantStocksFrom = (root) => {
    const box = root?.querySelector('[data-variant-stock]');
    const map = {};
    [...(box?.querySelectorAll('[data-var-stock]') || [])].forEach((input) => {
      map[input.dataset.varStock] = Math.max(0, parseInt(input.value, 10) || 0);
    });
    return map;
  };

  const renderVariantStockGrid = (root, savedMap = {}) => {
    const box = root?.querySelector('[data-variant-stock]');
    if (!box) return;
    const sizes = readChipList(root, '[data-size-tab]');
    const colors = readChipList(root, '[data-color-tab]');
    const pairs = [];
    if (sizes.length && colors.length) {
      sizes.forEach((size) => colors.forEach((color) => pairs.push({ size, color, key: variantKey(size, color), label: `${size} · ${color}` })));
    } else if (sizes.length) {
      sizes.forEach((size) => pairs.push({ size, color: '', key: variantKey(size, ''), label: size }));
    } else if (colors.length) {
      colors.forEach((color) => pairs.push({ size: '', color, key: variantKey('', color), label: color }));
    }
    if (!pairs.length) {
      box.innerHTML =
        '<label class="admin-line">Stock (whole product)<input type="number" min="0" data-var-stock="||" value="' +
        (savedMap['||'] ?? '') +
        '" /></label>';
      return;
    }
    box.innerHTML =
      '<p class="admin-hint">Stock per option</p>' +
      pairs
        .map((row) => {
          const val = savedMap[row.key] ?? savedMap[row.size] ?? savedMap[row.color] ?? '';
          return `<label class="admin-line">${escapeHtml(row.label)}<input type="number" min="0" data-var-stock="${escapeHtml(row.key)}" value="${val}" /></label>`;
        })
        .join('');
  };

  const bindChipPicker = (root, { pickerSel, rowSel, hiddenName, tabAttr, addSel, selected, placeholder, emptyCount }) => {
    const picker = root.querySelector(pickerSel);
    const row = root.querySelector(rowSel);
    const hidden = root.querySelector(`[name="${hiddenName}"]`);
    if (!picker || !row || !hidden) return;

    const collect = () =>
      [...row.querySelectorAll(`[${tabAttr}]`)]
        .map((input) => input.value.trim())
        .filter(Boolean);

    const syncHidden = () => {
      hidden.value = collect().join(', ');
      renderVariantStockGrid(root, readVariantStocksFrom(root));
    };

    const addTab = (value = '') => {
      const tab = document.createElement('span');
      tab.className = 'size-tab';
      tab.innerHTML = `
        <input type="text" ${tabAttr} value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" maxlength="48" inputmode="text" autocomplete="off" />
        <button type="button" class="size-tab-remove" aria-label="Remove">×</button>`;
      row.appendChild(tab);
    };

    const filled =
      selected && selected.length
        ? selected.map((s) => String(s).trim()).filter(Boolean)
        : parseSizeList(hidden.value);
    row.innerHTML = '';
    (filled.length ? filled : Array.from({ length: emptyCount }, () => '')).forEach((v) => addTab(v));
    syncHidden();

    picker.onclick = (e) => {
      if (e.target.closest(addSel)) {
        addTab('');
        row.querySelector(`.size-tab:last-child [${tabAttr}]`)?.focus();
        return;
      }
      const remove = e.target.closest('.size-tab-remove');
      if (!remove) return;
      remove.closest('.size-tab')?.remove();
      if (!row.querySelector('.size-tab')) addTab('');
      syncHidden();
    };
    picker.oninput = syncHidden;
    picker.onkeydown = (e) => {
      if (e.key === 'Enter' && e.target.closest(`[${tabAttr}]`)) e.preventDefault();
    };
  };

  const bindSizePicker = (root, { selected, colors, variantStocks } = {}) => {
    if (!root) return;
    bindChipPicker(root, {
      pickerSel: '[data-size-picker]',
      rowSel: '[data-size-presets]',
      hiddenName: 'sizes',
      tabAttr: 'data-size-tab',
      addSel: '[data-add-size]',
      selected,
      placeholder: '4mm or Adjustable 24-25CM',
      emptyCount: 2
    });
    bindChipPicker(root, {
      pickerSel: '[data-color-picker]',
      rowSel: '[data-color-presets]',
      hiddenName: 'colors',
      tabAttr: 'data-color-tab',
      addSel: '[data-add-color]',
      selected: colors,
      placeholder: 'Black Gold',
      emptyCount: 0
    });
    renderVariantStockGrid(root, variantStocks || {});
  };

  const getEffectivePrice = (product) => {
    if (product.discountActive && product.discountPercent > 0) {
      return product.price * (1 - product.discountPercent / 100);
    }
    return Number(product.price) || 0;
  };

  const isOnSale = (product) => Boolean(product?.discountActive && Number(product.discountPercent) > 0);

  const saleBadgeHTML = (product) =>
    isOnSale(product) ? `<span class="sale-badge">Sale −${product.discountPercent}%</span>` : '';

  const priceHTML = (product) => {
    if (!isOnSale(product)) return `<span class="price-now">${formatPrice(getEffectivePrice(product))}</span>`;
    return `<span class="price-sale-wrap"><span class="sale-tag">Sale −${product.discountPercent}%</span><span class="original">${formatPrice(product.price)}</span><span class="price-now price-now--sale">${formatPrice(getEffectivePrice(product))}</span></span>`;
  };

  const itemQty = (item) => {
    const n = Number(item && (item.quantity ?? item.qty));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const monthKey = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };

  const itemPackagingTotal = (item) => (item && item.packaging ? PACKAGING_FEE * itemQty(item) : 0);

  const itemLineTotal = (item) => (Number(item.price) || 0) * itemQty(item) + itemPackagingTotal(item);

  const cartUnitCount = () => cart.reduce((sum, item) => sum + itemQty(item), 0);

  const cartSubtotal = () => cart.reduce((sum, item) => sum + itemLineTotal(item), 0);

  const memberDiscount = () => {
    const n = cartUnitCount();
    if (n < 2) return 0;
    if (n === 2) return MEMBER_MONTHLY_OFF;
    return MEMBER_MONTHLY_OFF * 2;
  };

  const promoDiscount = (subtotal) => {
    if (!appliedPromo) return 0;
    if (subtotal < (Number(appliedPromo.minOrder) || 0)) return 0;
    if (appliedPromo.type === 'fixed') return Math.min(Number(appliedPromo.value) || 0, subtotal);
    return subtotal * ((Number(appliedPromo.value) || 0) / 100);
  };

  const getLocalPromoUsage = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.promoUsage) || '{}');
    } catch {
      return {};
    }
  };

  const recordPromoUse = (code, email) => {
    const key = String(code || '').toUpperCase();
    if (!key) return;
    const usage = getLocalPromoUsage();
    if (!usage[key]) usage[key] = { count: 0, emails: {} };
    usage[key].count += 1;
    const em = String(email || '').toLowerCase();
    if (em) usage[key].emails[em] = (usage[key].emails[em] || 0) + 1;
    localStorage.setItem(KEYS.promoUsage, JSON.stringify(usage));
  };

  const loadAllPromoUsage = async () => {
    const byCode = {};
    const bump = (code, email) => {
      const key = String(code || '').toUpperCase().trim();
      if (!key) return;
      if (!byCode[key]) byCode[key] = { count: 0, byEmail: {} };
      byCode[key].count += 1;
      const em = String(email || '').toLowerCase();
      if (em) byCode[key].byEmail[em] = (byCode[key].byEmail[em] || 0) + 1;
    };
    try {
      const rows = await supaRequest('/rest/v1/orders?select=user_email,notes');
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const match = String(row.notes || '').match(/promo=([^;]*)/i);
        bump(match?.[1], row.user_email);
      });
    } catch {
      /* local only */
    }
    Object.entries(getLocalPromoUsage()).forEach(([code, data]) => {
      if (!byCode[code]) byCode[code] = { count: 0, byEmail: {} };
      byCode[code].count = Math.max(byCode[code].count, Number(data.count) || 0);
      Object.entries(data.emails || {}).forEach(([em, n]) => {
        byCode[code].byEmail[em] = Math.max(byCode[code].byEmail[em] || 0, Number(n) || 0);
      });
    });
    return byCode;
  };

  const promoLimitReason = async (promo, email) => {
    if (!promo) return 'Invalid promo code.';
    const max = Number(promo.maxRedemptions) || 0;
    const perRaw = Number(promo.perCustomerLimit);
    const perLimit = Number.isFinite(perRaw) ? perRaw : 1;
    const usage = (await loadAllPromoUsage())[String(promo.code || '').toUpperCase()] || {
      count: 0,
      byEmail: {}
    };
    if (max > 0 && usage.count >= max) return 'This coupon has reached its use limit.';
    const em = String(email || '').toLowerCase();
    if (perLimit > 0 && em && (usage.byEmail[em] || 0) >= perLimit) {
      return perLimit === 1 ? 'You already used this coupon.' : 'You already used this coupon the allowed number of times.';
    }
    return '';
  };

  const cartTotal = () =>
    Math.max(0, cartSubtotal() - promoDiscount(cartSubtotal()) - memberDiscount() + cartShipping());

  const cartShipping = () => {
    if (!cart.length) return 0;
    if (settings.freeShippingAll) return 0;
    const goods = cartSubtotal() - promoDiscount(cartSubtotal()) - memberDiscount();
    const min = Number(settings.freeShippingMin) || 0;
    if (min > 0 && goods >= min) return 0;
    const allFree = cart.every((item) => Boolean(products.find((p) => p.id === item.id)?.freeShipping));
    if (allFree) return 0;
    return Math.max(0, Number(settings.shippingFee) || 0);
  };

  const isAutomaticPay = () => String(settings.paymentMode || 'automatic') !== 'manual';

  const showToast = (message) => {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.add('hidden'), 2800);
  };

  const setFormMessage = (el, text, type) => {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + (type || '');
    el.classList.toggle('hidden', !text);
  };

  /* ---------- Supabase ---------- */
  const getSupabaseConfig = () => {
    if (!CONFIG.useSupabase || !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey) return null;
    return {
      supabaseUrl: String(CONFIG.supabaseUrl).replace(/\/+$/, ''),
      supabaseAnonKey: CONFIG.supabaseAnonKey
    };
  };

  const supaRequest = async (path, options = {}) => {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;
    const res = await fetch(`${cfg.supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Supabase ${res.status}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  const invokeEdge = async (fnName, body) => {
    const cfg = getSupabaseConfig();
    if (!cfg) throw new Error('Supabase is not configured.');
    const url = `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/${fnName}`;
    const headers = {
      'Content-Type': 'application/json',
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`
    };
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    } catch (err) {
      throw new Error(
        err && /failed to fetch/i.test(err.message)
          ? 'Could not reach the reset email service. Check your internet, then try again.'
          : err.message || 'Could not reach the server.'
      );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || `Function ${fnName} failed (${res.status})`);
    }
    return data;
  };

  const getPaymongoPublicKey = () =>
    (settings.paymongoPublicKey || CONFIG.paymongoPublicKey || localStorage.getItem('zora_paymongo_pk') || '').trim();

  const stopPaymentPoll = () => {
    if (paymentPollTimer) {
      clearInterval(paymentPollTimer);
      paymentPollTimer = null;
    }
    paymentPollBusy = false;
  };

  /* ---------- Email ---------- */
  const getWeb3Key = () =>
    (settings.web3formsKey || CONFIG.web3formsKey || localStorage.getItem('zora_web3forms_key') || '').trim();

  const sendStoreEmail = async ({ subject, name, email, message, extra }) => {
    const safeName = name || 'Zora customer';
    const safeEmail = email || STORE_EMAIL;
    const payment = extra?.payment || '';
    const orderId = extra?.order_id || '';
    const paid = extra?.paid || '';
    let delivered = false;

    const web3Key = getWeb3Key();
    if (web3Key) {
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: web3Key,
            subject,
            from_name: 'ZORA Shop',
            name: safeName,
            email: safeEmail,
            message,
            payment,
            order_id: orderId,
            paid,
            to: STORE_EMAIL
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success === true || data.success === 'true')) delivered = true;
      } catch {
        /* try next method */
      }
    }

    if (!delivered) {
      try {
        const body = new FormData();
        body.append('_subject', subject);
        body.append('_template', 'table');
        body.append('_captcha', 'false');
        body.append('_replyto', safeEmail);
        body.append('name', safeName);
        body.append('email', safeEmail);
        body.append('message', message);
        body.append('payment', payment);
        body.append('order_id', orderId);
        body.append('paid', paid);
        const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(STORE_EMAIL), {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body
        });
        const data = await res.json().catch(() => ({}));
        const text = String(data.message || '');
        if (res.ok && !/activat|confirm/i.test(text) && data.success !== false && data.success !== 'false') {
          delivered = true;
        } else if (/activat|confirm/i.test(text)) {
          showToast('Open Gmail Spam and click FormSubmit Confirm once — then orders will arrive.');
        }
      } catch {
        /* fall through */
      }
    }

    if (!delivered) {
      const form = $('#zoraMailForm');
      if (form) {
        form.action = 'https://formsubmit.co/' + encodeURIComponent(STORE_EMAIL);
        const fields = {
          _subject: subject,
          _template: 'table',
          _captcha: 'false',
          _replyto: safeEmail,
          name: safeName,
          email: safeEmail,
          message,
          payment,
          order_id: orderId,
          paid
        };
        Object.entries(fields).forEach(([key, value]) => {
          let input = form.elements.namedItem(key);
          if (input && 'length' in input && input[0]) input = input[0];
          if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            form.appendChild(input);
          }
          input.value = String(value ?? '');
        });
        form.submit();
      }
    }

    if (!delivered) {
      const mailto =
        'mailto:' +
        encodeURIComponent(STORE_EMAIL) +
        '?subject=' +
        encodeURIComponent(subject) +
        '&body=' +
        encodeURIComponent(message);
      try {
        window.open(mailto, '_blank');
      } catch {
        window.location.href = mailto;
      }
      showToast('Opening email to send this order to ' + STORE_EMAIL);
    }

    return delivered;
  };

  /* ---------- Accounts ---------- */
  const hashPassword = async (password) => {
    const data = new TextEncoder().encode('zora::' + password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const getLocalAccounts = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.accounts) || '[]');
    } catch {
      return [];
    }
  };

  const saveLocalAccounts = (accounts) => localStorage.setItem(KEYS.accounts, JSON.stringify(accounts));

  const saveSession = () => {
    if (currentAccount) localStorage.setItem(KEYS.session, JSON.stringify(currentAccount));
    else localStorage.removeItem(KEYS.session);
  };

  const getSavedSession = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.session) || 'null');
    } catch {
      return null;
    }
  };

  const findLocalAccount = (email) =>
    getLocalAccounts().find((a) => a.email === String(email || '').toLowerCase()) || null;

  const upsertLocalAccount = (account) => {
    const accounts = getLocalAccounts().filter((a) => a.email !== account.email);
    accounts.push(account);
    saveLocalAccounts(accounts);
  };

  const fetchRemoteAccount = async (email) => {
    try {
      const rows = await supaRequest(`/rest/v1/accounts?email=eq.${encodeURIComponent(email)}&select=email,password_hash,name,phone,address,reset_code_hash,reset_expires`);
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch {
      return null;
    }
  };

  const saveRemoteAccount = async (account) => {
    try {
      await supaRequest('/rest/v1/accounts?on_conflict=email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([
          {
            email: account.email,
            password_hash: account.passwordHash,
            name: account.name || '',
            phone: account.phone || '',
            address: account.address || '',
            reset_code_hash: account.resetCodeHash || '',
            reset_expires: account.resetExpires || null
          }
        ])
      });
    } catch {
      /* local still works */
    }
  };

  const registerAccount = async ({ name, email, password }) => {
    const normalized = email.toLowerCase();
    if (findLocalAccount(normalized) || (await fetchRemoteAccount(normalized))) {
      throw new Error('An account already exists with this email.');
    }
    const account = {
      email: normalized,
      passwordHash: await hashPassword(password),
      name,
      phone: '',
      address: '',
      createdAt: new Date().toISOString()
    };
    upsertLocalAccount(account);
    await saveRemoteAccount(account);
    return account;
  };

  const loginAccount = async (email, password) => {
    const normalized = email.toLowerCase();
    const passwordHash = await hashPassword(password);
    let account = findLocalAccount(normalized);
    if (!account) {
      const remote = await fetchRemoteAccount(normalized);
      if (remote) {
        account = {
          email: remote.email,
          passwordHash: remote.password_hash,
          name: remote.name,
          phone: remote.phone,
          address: remote.address
        };
        upsertLocalAccount(account);
      }
    }
    if (!account || account.passwordHash !== passwordHash) {
      throw new Error('Login failed. Check your email and password.');
    }
    return account;
  };

  const hashResetCode = (email, code) =>
    hashPassword('reset::' + String(email || '').toLowerCase() + '::' + String(code || '').replace(/\s/g, ''));

  const maskEmail = (email) => {
    const raw = String(email || '').trim().toLowerCase();
    const at = raw.indexOf('@');
    if (at < 1) return raw;
    return raw.slice(0, 1) + '***' + raw.slice(at);
  };

  const sendResetCodeFallback = async (email) => {
    const remote = await fetchRemoteAccount(email);
    const local = findLocalAccount(email);
    if (!remote && !local) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await hashResetCode(email, code);
    const expiresIso = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const account = {
      email,
      passwordHash: local?.passwordHash || remote?.password_hash || '',
      name: local?.name || remote?.name || '',
      phone: local?.phone || remote?.phone || '',
      address: local?.address || remote?.address || '',
      resetCodeHash: codeHash,
      resetExpires: expiresIso
    };
    upsertLocalAccount(account);
    try {
      await supaRequest(`/rest/v1/accounts?email=eq.${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_code_hash: codeHash, reset_expires: expiresIso })
      });
    } catch {
      /* still try email */
    }
    const message = [
      account.name ? `Hi ${account.name},` : 'Hi,',
      '',
      'Your ZORA password reset code is:',
      '',
      code,
      '',
      'This code expires in 15 minutes.'
    ].join('\n');
    try {
      const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: 'Your ZORA password reset code',
          _captcha: 'false',
          _template: 'box',
          name: 'ZORA',
          email,
          message
        })
      });
      if (res.ok) return;
    } catch {
      /* next */
    }
    const web3Key = getWeb3Key();
    if (web3Key) {
      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: web3Key,
          subject: 'ZORA password reset for ' + email,
          from_name: 'ZORA Shop',
          name: account.name || 'Customer',
          email,
          message: 'Forward this reset code to ' + email + ':\n\n' + code
        })
      }).catch(() => {});
    }
  };

  const requestPasswordReset = async (email) => {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      throw new Error('Enter the email for your account.');
    }
    const generic =
      'If this email has a ZORA account, we sent a 6-digit code to that inbox. Check Inbox and Spam.';
    try {
      const result = await invokeEdge('send-reset-code', { email: normalized });
      if (result?.ok) return generic;
      throw new Error(result?.error || 'Could not send the reset code.');
    } catch (err) {
      try {
        await sendResetCodeFallback(normalized);
        return generic;
      } catch {
        const msg = String(err.message || '');
        if (/failed to fetch|could not reach|404/i.test(msg)) {
          throw new Error(
            'Could not send the reset email. Check your internet, then try again. If it still fails, message zoraofficial005@gmail.com'
          );
        }
        throw new Error(msg || 'Could not send the reset code to that email.');
      }
    }
  };

  const completePasswordReset = async ({ email, code, password }) => {
    const normalized = String(email || '').trim().toLowerCase();
    const codeHash = await hashResetCode(normalized, String(code || '').replace(/\s/g, ''));
    let account = findLocalAccount(normalized);
    const remote = await fetchRemoteAccount(normalized);
    if (!account && remote) {
      account = {
        email: remote.email,
        passwordHash: remote.password_hash,
        name: remote.name,
        phone: remote.phone,
        address: remote.address,
        resetCodeHash: remote.reset_code_hash,
        resetExpires: remote.reset_expires
      };
    } else if (account && remote?.reset_code_hash) {
      account.resetCodeHash = remote.reset_code_hash;
      account.resetExpires = remote.reset_expires;
    }
    if (!account) throw new Error('That reset code is not valid.');
    const expires = Date.parse(account.resetExpires || '') || 0;
    if (!account.resetCodeHash || account.resetCodeHash !== codeHash || expires < Date.now()) {
      throw new Error('That code is wrong or expired. Request a new one.');
    }
    account.passwordHash = await hashPassword(password);
    account.resetCodeHash = '';
    account.resetExpires = '';
    upsertLocalAccount(account);
    await saveRemoteAccount(account);
    return account;
  };

  const cartStorageKey = () => (currentAccount ? `zora_cart_${currentAccount.email}` : KEYS.cart);

  const loadCart = () => {
    try {
      cart = JSON.parse(localStorage.getItem(cartStorageKey()) || '[]');
    } catch {
      cart = [];
    }
    if (!Array.isArray(cart)) cart = [];
    if (currentAccount) {
      try {
        const guest = JSON.parse(localStorage.getItem(KEYS.cart) || '[]');
        if ((!cart || !cart.length) && Array.isArray(guest) && guest.length) {
          cart = guest;
          localStorage.removeItem(KEYS.cart);
        }
      } catch {
        /* ignore */
      }
    }
    cart = cart
      .filter((item) => item && item.id)
      .map((item) => ({
        ...slimLineItem(item),
        price: Number(item.price) || 0,
        quantity: itemQty(item) || 1
      }));
    saveCart();
  };

  const saveCart = () => {
    try {
      localStorage.setItem(cartStorageKey(), JSON.stringify(cart.map(slimLineItem)));
    } catch {
      try {
        localStorage.setItem(
          cartStorageKey(),
          JSON.stringify(cart.map((item) => ({ ...slimLineItem(item), image: '' })))
        );
      } catch {
        /* quota */
      }
    }
    updateCartUI();
    if (!$('#checkoutModal')?.classList.contains('hidden')) updateCheckoutTotals();
  };

  const loadOrdersForEmail = async (email) => {
    orders = [];
    if (!email) return;
    const key = `zora_orders_${email}`;
    try {
      const rows = await supaRequest(
        `/rest/v1/orders?user_email=eq.${encodeURIComponent(email)}&select=${ORDER_COLS}&order=created_at.desc`
      );
      if (Array.isArray(rows)) {
        orders = rows.map(slimOrder);
        try {
          localStorage.setItem(key, JSON.stringify(orders));
        } catch {
          try {
            localStorage.setItem(key, JSON.stringify(orders.map((o) => ({ ...o, items: (o.items || []).map((i) => ({ ...i, image: '' })) }))));
          } catch {
            /* quota */
          }
        }
        renderAccountDetails();
        return;
      }
    } catch {
      /* local fallback */
    }
    try {
      orders = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      orders = [];
    }
    renderAccountDetails();
  };

  const storeLocalOrder = (order) => {
    if (!order.user_email) return;
    const key = `zora_orders_${order.user_email}`;
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      existing = [];
    }
    existing = [slimOrder(order), ...existing.filter((o) => o.id !== order.id)];
    localStorage.setItem(key, JSON.stringify(existing));
    orders = existing;
  };

  /* ---------- Settings / products ---------- */
  const normalizeProduct = (p) => ({
    id: String(p.id),
    name: p.name,
    subtitle: p.subtitle || '',
    description: p.description || '',
    details: p.details || '',
    category: p.category || 'rings',
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    requiresSize: Boolean(p.requiresSize ?? (p.sizes && p.sizes.length)),
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    discountActive: Boolean(p.discountActive),
    discountPercent: Number(p.discountPercent) || 0,
    freeShipping: Boolean(p.freeShipping),
    variantStocks: p.variantStocks && typeof p.variantStocks === 'object' ? p.variantStocks : {},
    images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
    thumb: p.thumb || '',
    updatedAt: p.updatedAt || p.updated_at || ''
  });

  const PRODUCT_CACHE_KEY = 'zora_products_cache_v4';

  const LIGHT_IMAGE_CHARS = 90000;
  const isLightImage = (src) => {
    const s = String(src || '');
    if (!s) return false;
    if (s.startsWith('data:')) return s.length <= LIGHT_IMAGE_CHARS;
    return true;
  };

  const productCover = (p) => {
    if (p?.thumb) return p.thumb;
    if (isLightImage(p?.images?.[0])) return p.images[0];
    return '';
  };

  const slimLineItem = (item) => {
    const product = products.find((p) => p.id === item?.id) || {};
    const image = isLightImage(item?.image) ? item.image : productCover(product);
    return {
      id: item.id,
      name: item.name || product.name || '',
      price: Number(item.price) || 0,
      image: image || '',
      color: item.color || null,
      size: item.size || null,
      quantity: item.quantity || item.qty || 1,
      packaging: Boolean(item.packaging),
      subtitle: item.subtitle || product.subtitle || '',
      category: item.category || product.category || ''
    };
  };

  const slimOrder = (order) => ({
    ...order,
    items: Array.isArray(order?.items) ? order.items.map(slimLineItem) : []
  });

  const ORDER_COLS =
    'id,items,total,payment_method,status,name,phone,address,user_email,notes,created_at';

  const persistProductsCache = () => {
    try {
      localStorage.setItem(
        PRODUCT_CACHE_KEY,
        JSON.stringify(
          products.map((p) => ({
            ...p,
            images: [],
            thumb: isLightImage(p.thumb) ? p.thumb : '',
            updatedAt: p.updatedAt || ''
          }))
        )
      );
    } catch {
      /* quota */
    }
  };

  const mapProductRow = (row) =>
    normalizeProduct({
      id: row.id,
      name: row.name,
      subtitle: row.subtitle,
      description: row.description,
      details: row.details,
      category: row.category,
      price: row.price,
      stock: row.stock,
      requiresSize: row.requires_size,
      sizes: row.sizes,
      colors: row.colors,
      discountActive: row.discount_active,
      discountPercent: row.discount_percent,
      freeShipping: row.free_shipping,
      variantStocks: row.variant_stocks,
      images: row.images,
      thumb: row.thumb,
      updatedAt: row.updated_at
    });

  const loadSettings = async () => {
    const keepHero = lookbookHasPhotos(settings.heroSlides) ? settings.heroSlides : null;
    const keepCats = lookbookHasPhotos(settings.categoryCards) ? settings.categoryCards : null;
    const keepBlogs = lookbookHasPhotos(settings.blogs) ? settings.blogs : null;
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEYS.settings) || '{}') };
    } catch {
      settings = { ...DEFAULT_SETTINGS };
    }
    if (!settings.paymentQrs) settings.paymentQrs = { ...DEFAULT_QRS };
    settings.paymentQrs = {
      GCash: settings.paymentQrs.GCash && !String(settings.paymentQrs.GCash).endsWith('.svg')
        ? settings.paymentQrs.GCash
        : DEFAULT_QRS.GCash,
      Maya: settings.paymentQrs.Maya && !String(settings.paymentQrs.Maya).endsWith('.svg')
        ? settings.paymentQrs.Maya
        : DEFAULT_QRS.Maya,
      'Bank Transfer':
        settings.paymentQrs['Bank Transfer'] && !String(settings.paymentQrs['Bank Transfer']).endsWith('.svg')
          ? settings.paymentQrs['Bank Transfer']
          : DEFAULT_QRS['Bank Transfer']
    };
    if (!settings.web3formsKey && CONFIG.web3formsKey) settings.web3formsKey = CONFIG.web3formsKey;
    if (!settings.web3formsKey) settings.web3formsKey = localStorage.getItem('zora_web3forms_key') || '';
    if (!settings.paymongoPublicKey && CONFIG.paymongoPublicKey) settings.paymongoPublicKey = CONFIG.paymongoPublicKey;
    if (!settings.paymongoPublicKey) settings.paymongoPublicKey = localStorage.getItem('zora_paymongo_pk') || '';
    if (!Array.isArray(settings.heroSlides) || !settings.heroSlides.length) {
      settings.heroSlides = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.heroSlides));
    }
    if (!Array.isArray(settings.collections) || !settings.collections.length) {
      settings.collections = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.collections));
    }
    if (!Array.isArray(settings.categoryCards) || !settings.categoryCards.length) {
      settings.categoryCards = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.categoryCards));
    }
    if (!Array.isArray(settings.blogs) || !settings.blogs.length) {
      settings.blogs = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.blogs));
    }
    if (keepHero && !lookbookHasPhotos(settings.heroSlides)) settings.heroSlides = keepHero;
    if (keepCats && !lookbookHasPhotos(settings.categoryCards)) settings.categoryCards = keepCats;
    if (keepBlogs && !lookbookHasPhotos(settings.blogs)) settings.blogs = keepBlogs;
    settings.sizeCharts = { ...DEFAULT_SETTINGS.sizeCharts, ...(settings.sizeCharts || {}) };
    const applySettingsRow = (row, media) => {
      if (!row) return;
      if (!media) {
        settings.instagram = row.instagram || settings.instagram;
        settings.facebook = row.facebook || settings.facebook;
        settings.facebookUrl = row.facebook_url || settings.facebookUrl;
        settings.adminPassword = row.admin_password || settings.adminPassword;
        if (Array.isArray(row.promos)) settings.promos = row.promos;
        if (row.paymongo_public_key) settings.paymongoPublicKey = row.paymongo_public_key;
        if (row.web3forms_key) settings.web3formsKey = row.web3forms_key;
        if (row.shipping_text) settings.shippingText = row.shipping_text;
        if (row.returns_text) settings.returnsText = row.returns_text;
        if (row.size_charts && typeof row.size_charts === 'object') {
          settings.sizeCharts = { ...DEFAULT_SETTINGS.sizeCharts, ...row.size_charts };
        }
        if (row.payment_mode) settings.paymentMode = row.payment_mode;
        if (row.shipping_fee != null) settings.shippingFee = Number(row.shipping_fee) || 0;
        if (row.free_shipping_min != null) settings.freeShippingMin = Number(row.free_shipping_min) || 0;
        if (row.free_shipping_all != null) settings.freeShippingAll = Boolean(row.free_shipping_all);
        if (row.our_story_title) settings.ourStoryTitle = row.our_story_title;
        if (row.our_story_body) settings.ourStoryBody = row.our_story_body;
        return;
      }
      if (row.payment_qrs && typeof row.payment_qrs === 'object') {
        settings.paymentQrs = { ...DEFAULT_QRS, ...row.payment_qrs };
      }
      if (Array.isArray(row.hero_slides) && row.hero_slides.length) settings.heroSlides = row.hero_slides;
      if (Array.isArray(row.collections) && row.collections.length) settings.collections = row.collections;
      if (Array.isArray(row.category_cards) && row.category_cards.length) settings.categoryCards = row.category_cards;
      if (Array.isArray(row.blogs) && row.blogs.length) settings.blogs = row.blogs;
    };
    try {
      const data = await supaRequest(
        '/rest/v1/store_settings?id=eq.store&select=instagram,facebook,facebook_url,promos,admin_password,paymongo_public_key,web3forms_key,shipping_text,returns_text,size_charts,payment_mode,shipping_fee,free_shipping_min,free_shipping_all,our_story_title,our_story_body'
      );
      applySettingsRow(Array.isArray(data) && data[0], false);
    } catch {
      try {
        const data = await supaRequest('/rest/v1/store_settings?id=eq.store&select=*');
        const row = Array.isArray(data) && data[0];
        applySettingsRow(row, false);
        applySettingsRow(row, true);
      } catch {
        /* offline */
      }
    }
    persistSettingsLocal();
    applyProductPolicies();
  };

  const loadSettingsMedia = async () => {
    try {
      const heroData = await supaRequest('/rest/v1/store_settings?id=eq.store&select=hero_slides');
      const heroRow = Array.isArray(heroData) && heroData[0];
      if (Array.isArray(heroRow?.hero_slides) && heroRow.hero_slides.length) {
        settings.heroSlides = heroRow.hero_slides;
        renderHero();
      }
    } catch {
      /* keep cached hero */
    }
    try {
      const data = await supaRequest(
        '/rest/v1/store_settings?id=eq.store&select=category_cards,blogs'
      );
      const row = Array.isArray(data) && data[0];
      if (row) {
        if (Array.isArray(row.category_cards) && row.category_cards.length) settings.categoryCards = row.category_cards;
        if (Array.isArray(row.blogs) && row.blogs.length) settings.blogs = row.blogs;
        renderCategories();
        renderBlogs();
        fillNavCollections();
      }
    } catch {
      /* keep cached tiles */
    }
    try {
      const heroSlides = await slimLookbookList(settings.heroSlides, 720, 0.52);
      const categoryCards = await slimLookbookList(settings.categoryCards, 640, 0.58);
      const blogs = await slimLookbookList(settings.blogs, 720, 0.55);
      await writeLookbookCache({ heroSlides, categoryCards, blogs });
      if (!lookbookHasPhotos(settings.heroSlides) && lookbookHasPhotos(heroSlides)) {
        settings.heroSlides = heroSlides;
        renderHero();
      }
    } catch {
      /* cache best-effort */
    }
  };

  const LOOKBOOK_DB = 'zora_lookbook_v1';
  const LOOKBOOK_STORE = 'media';
  const LOOKBOOK_KEY = 'store';
  const LOOKBOOK_SLIM_CHARS = 110000;

  const lookbookHasPhotos = (list) =>
    Array.isArray(list) && list.some((item) => String(item?.image || item?.src || '').length > 40);

  const applyLookbookCache = (cached) => {
    if (!cached || typeof cached !== 'object') return false;
    if (lookbookHasPhotos(cached.heroSlides)) settings.heroSlides = cached.heroSlides;
    if (lookbookHasPhotos(cached.categoryCards)) settings.categoryCards = cached.categoryCards;
    if (lookbookHasPhotos(cached.blogs)) settings.blogs = cached.blogs;
    return true;
  };

  const openLookbookDb = () =>
    new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(LOOKBOOK_DB, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(LOOKBOOK_STORE)) {
            req.result.createObjectStore(LOOKBOOK_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

  const readLookbookCache = async () => {
    const db = await openLookbookDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(LOOKBOOK_STORE, 'readonly');
        const req = tx.objectStore(LOOKBOOK_STORE).get(LOOKBOOK_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  };

  const writeLookbookCache = async (payload) => {
    const db = await openLookbookDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(LOOKBOOK_STORE, 'readwrite');
        tx.objectStore(LOOKBOOK_STORE).put(payload, LOOKBOOK_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  };

  const slimLookbookImage = async (src, maxSize, quality) => {
    const image = String(src || '');
    if (!image.startsWith('data:') || image.length <= LOOKBOOK_SLIM_CHARS) return image;
    try {
      return await resizeDataUrl(image, maxSize, quality);
    } catch {
      return image;
    }
  };

  const slimLookbookList = async (list, maxSize, quality) => {
    const out = [];
    for (const item of list || []) {
      const image = await slimLookbookImage(item.image || item.src || '', maxSize, quality);
      out.push({ ...item, image, src: image || item.src || '' });
    }
    return out;
  };

  const persistSettingsLocal = () => {
    try {
      localStorage.setItem(KEYS.settings, JSON.stringify(settings));
      return true;
    } catch {
      try {
        const slim = {
          instagram: settings.instagram,
          facebook: settings.facebook,
          facebookUrl: settings.facebookUrl,
          adminPassword: settings.adminPassword,
          promos: settings.promos,
          paymongoPublicKey: settings.paymongoPublicKey,
          web3formsKey: settings.web3formsKey,
          heroSlides: (settings.heroSlides || []).map((s) => ({
            alt: s.alt || s.title || '',
            image: String(s.image || s.src || '').startsWith('data:') ? '' : s.image || s.src || ''
          }))
        };
        localStorage.setItem(KEYS.settings, JSON.stringify(slim));
      } catch {
        /* quota full */
      }
      return false;
    }
  };

  const saveSettingsRemote = async () => {
    persistSettingsLocal();
    const payload = {
      id: 'store',
      instagram: settings.instagram,
      facebook: settings.facebook,
      facebook_url: settings.facebookUrl,
      promos: settings.promos || [],
      admin_password: settings.adminPassword,
      payment_qrs: settings.paymentQrs || DEFAULT_QRS,
      paymongo_public_key: settings.paymongoPublicKey || '',
      web3forms_key: settings.web3formsKey || '',
      hero_slides: settings.heroSlides || [],
      collections: settings.collections || [],
      category_cards: settings.categoryCards || [],
      blogs: settings.blogs || [],
      shipping_text: settings.shippingText || '',
      returns_text: settings.returnsText || '',
      size_charts: getSizeCharts(),
      payment_mode: settings.paymentMode || 'automatic',
      shipping_fee: settings.shippingFee || 0,
      free_shipping_min: settings.freeShippingMin || 0,
      free_shipping_all: Boolean(settings.freeShippingAll),
      our_story_title: settings.ourStoryTitle || '',
      our_story_body: settings.ourStoryBody || ''
    };
    try {
      await supaRequest('/rest/v1/store_settings?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([payload])
      });
      return true;
    } catch {
      try {
        const fallback = { ...payload };
        delete fallback.payment_qrs;
        delete fallback.paymongo_public_key;
        delete fallback.web3forms_key;
        delete fallback.shipping_text;
        delete fallback.returns_text;
        delete fallback.size_charts;
        delete fallback.payment_mode;
        delete fallback.shipping_fee;
        delete fallback.free_shipping_min;
        delete fallback.free_shipping_all;
        delete fallback.our_story_title;
        delete fallback.our_story_body;
        await supaRequest('/rest/v1/store_settings?on_conflict=id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify([fallback])
        });
        return true;
      } catch {
        try {
          await supaRequest('/rest/v1/store_settings?id=eq.store', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hero_slides: settings.heroSlides || [] })
          });
          return true;
        } catch {
          return false;
        }
      }
    }
  };

  const patchStoreSettings = async (fields) => {
    persistSettingsLocal();
    try {
      await supaRequest('/rest/v1/store_settings?id=eq.store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      return true;
    } catch {
      return saveSettingsRemote();
    }
  };

  let paymentQrsLoaded = false;
  const loadPaymentQrs = async () => {
    if (paymentQrsLoaded) return;
    try {
      const data = await supaRequest('/rest/v1/store_settings?id=eq.store&select=payment_qrs');
      const row = Array.isArray(data) && data[0];
      if (row?.payment_qrs && typeof row.payment_qrs === 'object') {
        settings.paymentQrs = { ...DEFAULT_QRS, ...row.payment_qrs };
      }
    } catch {
      /* keep defaults */
    }
    paymentQrsLoaded = true;
  };

  const lookbookPatchFields = (group) => {
    if (group === 'hero') return { hero_slides: settings.heroSlides || [] };
    if (group === 'collection') return { collections: settings.collections || [] };
    if (group === 'category') return { category_cards: settings.categoryCards || [] };
    return { blogs: settings.blogs || [] };
  };

  const SIZE_CHART_LABELS = {
    rings: 'Rings',
    earrings: 'Earrings',
    bracelets: 'Bracelets',
    necklaces: 'Necklaces'
  };

  const getSizeCharts = () => ({ ...DEFAULT_SETTINGS.sizeCharts, ...(settings.sizeCharts || {}) });

  const sizeChartText = (category) => {
    const charts = getSizeCharts();
    const key = String(category || '').toLowerCase();
    return String(charts[key] || charts.rings || '').trim();
  };

  const applyProductPolicies = () => {
    const shipping = $('#shippingPolicyText');
    const returns = $('#returnsPolicyText');
    if (shipping) {
      shipping.textContent =
        settings.shippingText || DEFAULT_SETTINGS.shippingText;
    }
    if (returns) {
      returns.textContent = settings.returnsText || DEFAULT_SETTINGS.returnsText;
    }
    const guide = $('#sizeGuideList');
    if (guide) guide.innerHTML = '';
    const storyTitle = $('#ourStoryTitle');
    const storyBody = $('#ourStoryBody');
    if (storyTitle) storyTitle.textContent = settings.ourStoryTitle || DEFAULT_SETTINGS.ourStoryTitle;
    if (storyBody) storyBody.textContent = settings.ourStoryBody || DEFAULT_SETTINGS.ourStoryBody;
    const howPay = $('#howToPayStep');
    if (howPay) {
      howPay.textContent = isAutomaticPay()
        ? 'Scan the QR in that app and pay the exact amount. Paid orders reach us automatically by email.'
        : 'Scan the GCash, Maya, or Bank QR and pay the exact amount. We confirm payment in Admin.';
    }
  };

  const openSizeChart = (category) => {
    const key = String(category || activeProduct?.category || 'rings').toLowerCase();
    const title = (SIZE_CHART_LABELS[key] || 'Product') + ' size chart';
    if ($('#sizeChartTitle')) $('#sizeChartTitle').textContent = title;
    if ($('#sizeChartBody')) $('#sizeChartBody').textContent = sizeChartText(key) || 'No size chart yet for this category.';
    openModal('sizeChartModal');
  };

  const PRODUCT_LIST_COLS =
    'id,name,subtitle,description,details,category,price,stock,requires_size,sizes,colors,discount_active,discount_percent,free_shipping,variant_stocks,thumb,updated_at';

  const fetchFirstProductImage = async (id) => {
    try {
      const data = await supaRequest(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=cover:images->0`
      );
      const cover = Array.isArray(data) && data[0] ? data[0].cover : '';
      if (typeof cover === 'string' && cover) return cover;
    } catch {
      /* fallback */
    }
    try {
      const data = await supaRequest(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=images`
      );
      const images = Array.isArray(data) && data[0] && data[0].images;
      return (Array.isArray(images) && images.find(Boolean)) || '';
    } catch {
      return '';
    }
  };

  let thumbWarmBusy = false;
  const warmProductThumbs = async () => {
    if (thumbWarmBusy) return;
    thumbWarmBusy = true;
    for (const product of products) {
      if (isLightImage(product.thumb)) continue;
      try {
        const src = await fetchFirstProductImage(product.id);
        if (!src) continue;
        const small = await makeSquareThumb(src, 480, 0.74);
        product.thumb = small;
        try {
          await supaRequest(`/rest/v1/products?id=eq.${encodeURIComponent(product.id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumb: small })
          });
        } catch {
          /* thumb column may be missing */
        }
        persistProductsCache();
        renderProducts();
      } catch {
        /* skip this product */
      }
    }
    thumbWarmBusy = false;
  };

  const loadProducts = async () => {
    try {
      let data;
      try {
        data = await supaRequest(`/rest/v1/products?select=${PRODUCT_LIST_COLS}&order=created_at.desc`);
      } catch {
        data = await supaRequest(
          '/rest/v1/products?select=id,name,subtitle,description,details,category,price,stock,requires_size,sizes,colors,discount_active,discount_percent,thumb,updated_at&order=created_at.desc'
        );
      }
      if (Array.isArray(data) && data.length) {
        products = data.map(mapProductRow);
        try {
          const cached = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || '[]');
          if (Array.isArray(cached)) {
            const byId = new Map(cached.map((p) => [String(p.id), p]));
            products.forEach((p) => {
              if (isLightImage(p.thumb)) return;
              const prev = byId.get(p.id);
              if (!prev || !isLightImage(prev.thumb)) return;
              if (p.updatedAt && prev.updatedAt && p.updatedAt !== prev.updatedAt) return;
              p.thumb = prev.thumb;
            });
          }
        } catch {
          /* ignore */
        }
        persistProductsCache();
        renderProducts();
        warmProductThumbs();
        return;
      }
    } catch {
      /* fallback */
    }
    try {
      const res = await fetch('products.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          products = data.map(normalizeProduct);
          renderProducts();
          return;
        }
      }
    } catch {
      /* ignore */
    }
    products = (CONFIG.products || []).map(normalizeProduct);
    renderProducts();
  };

  const productRow = (product) => ({
    id: product.id,
    name: product.name,
    subtitle: product.subtitle || '',
    description: product.description || '',
    details: product.details || '',
    category: product.category || 'rings',
    price: Number(product.price) || 0,
    stock: productTotalStock(product),
    requires_size: Boolean(product.requiresSize),
    sizes: product.sizes || [],
    colors: product.colors || [],
    discount_active: Boolean(product.discountActive),
    discount_percent: Number(product.discountPercent) || 0,
    free_shipping: Boolean(product.freeShipping),
    variant_stocks: product.variantStocks || {},
    images: product.images || [],
    thumb: product.thumb || '',
    updated_at: new Date().toISOString()
  });

  const saveProductRemote = async (product) => {
    const row = productRow(product);
    const upsert = async (payload) => {
      await supaRequest('/rest/v1/products?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([payload])
      });
    };
    let saved = false;
    try {
      await upsert(row);
      saved = true;
    } catch {
      try {
        const slim = { ...row };
        delete slim.thumb;
        delete slim.variant_stocks;
        delete slim.free_shipping;
        await upsert(slim);
        saved = true;
      } catch {
        try {
          const slim = { ...row };
          delete slim.thumb;
          delete slim.description;
          delete slim.details;
          await upsert(slim);
          saved = true;
        } catch {
          saved = false;
        }
      }
    }
    if (saved) {
      try {
        await supaRequest(`/rest/v1/products?id=eq.${encodeURIComponent(product.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thumb: product.thumb || '',
            updated_at: row.updated_at
          })
        });
      } catch {
        /* shop still uses the new local thumbnail */
      }
    }
    persistProductsCache();
    return saved;
  };

  const PDP_IMG_DB = 'zora_pdp_imgs_v1';
  const openPdpImgDb = () =>
    new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(PDP_IMG_DB, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('images')) req.result.createObjectStore('images');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

  const readPdpImageCache = async (id, updatedAt) => {
    const db = await openPdpImgDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const req = db.transaction('images', 'readonly').objectStore('images').get(String(id));
        req.onsuccess = () => {
          const row = req.result;
          if (!row?.images?.length) {
            resolve(null);
            return;
          }
          if (updatedAt && row.updatedAt && row.updatedAt !== updatedAt) {
            resolve(null);
            return;
          }
          resolve(row.images);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  };

  const writePdpImageCache = async (id, updatedAt, images) => {
    const db = await openPdpImgDb();
    if (!db || !id || !images?.length) return;
    try {
      db.transaction('images', 'readwrite').objectStore('images').put(
        { images, updatedAt: updatedAt || '' },
        String(id)
      );
    } catch {
      /* quota */
    }
  };

  const fetchProductImageAt = async (id, index) => {
    try {
      const data = await supaRequest(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=photo:images->${index}`
      );
      const photo = Array.isArray(data) && data[0] ? data[0].photo : '';
      if (typeof photo === 'string' && photo && photo !== 'null') return photo;
    } catch {
      /* try text form */
    }
    try {
      const data = await supaRequest(
        `/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=photo:images->>${index}`
      );
      const photo = Array.isArray(data) && data[0] ? data[0].photo : '';
      if (typeof photo === 'string' && photo && photo !== 'null') return photo;
    } catch {
      /* missing */
    }
    return '';
  };

  const hydrateProductImages = async (product, onPartial) => {
    if (!product) return product;
    const notify = () => {
      try {
        onPartial?.(product);
      } catch {
        /* ignore */
      }
    };
    if (product.imagesComplete && Array.isArray(product.images) && product.images.length) {
      notify();
      return product;
    }
    try {
      const cached = await readPdpImageCache(product.id, product.updatedAt);
      if (cached?.length) {
        product.images = cached;
        product.imagesComplete = true;
        notify();
        return product;
      }
    } catch {
      /* download */
    }

    const first = await fetchProductImageAt(product.id, 0);
    if (first) {
      product.images = [first];
      notify();
    }

    try {
      const data = await supaRequest(
        `/rest/v1/products?id=eq.${encodeURIComponent(product.id)}&select=images,thumb`
      );
      const row = Array.isArray(data) && data[0];
      if (row) {
        if (Array.isArray(row.images) && row.images.length) product.images = row.images.filter(Boolean);
        if (row.thumb) product.thumb = row.thumb;
      }
    } catch {
      if (!product.images?.length && first) product.images = [first];
    }

    product.imagesComplete = true;
    notify();
    writePdpImageCache(product.id, product.updatedAt, product.images);
    return product;
  };

  const syncProducts = async () => {
    if (!products.length) return true;
    const latest = products[0];
    return saveProductRemote(latest);
  };

  const resizeDataUrl = (src, maxSize, quality) =>
    new Promise((resolve, reject) => {
      if (!src) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const longest = Math.max(img.width, img.height);
        const scale = longest > maxSize ? maxSize / longest : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = src;
    });

  const makeSquareThumb = (src, size = 480, quality = 0.74) =>
    new Promise((resolve, reject) => {
      if (!src) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = Math.max(0, Math.round((img.width - side) / 2));
        const sy = Math.max(0, Math.round((img.height - side) / 2));
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ece8e2';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = src;
    });

  const compressImage = (file, maxSize = 900, quality = 0.7) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.onload = () => {
        resizeDataUrl(reader.result, maxSize, quality).then(resolve).catch(reject);
      };
      reader.readAsDataURL(file);
    });

  const attachProductThumb = async (product) => {
    const src = product.images?.[0] || product.thumb || '';
    if (!src) {
      product.thumb = '';
      return product;
    }
    try {
      product.thumb = await makeSquareThumb(src, 480, 0.74);
    } catch {
      try {
        product.thumb = await resizeDataUrl(src, 360, 0.62);
      } catch {
        product.thumb = src;
      }
    }
    product.updatedAt = new Date().toISOString();
    return product;
  };

  const productPhotoSlotHTML = (index, preview) => `
    <div class="admin-photo-slot" data-photo-slot>
      ${preview ? `<img class="admin-photo-preview" src="${preview}" alt="" />` : ''}
      <p class="admin-photo-caption" data-photo-caption>${index === 0 ? 'Main photo' : 'Photo ' + (index + 1)}</p>
      <label class="admin-photo-file">
        <span>${preview ? 'Replace photo' : 'Choose photo'}</span>
        <input type="file" accept="image/*" data-product-photo ${!preview && index === 0 ? 'required' : ''} />
      </label>
      <button type="button" class="btn btn-outline-dark admin-photo-remove">Remove</button>
    </div>`;

  const refreshPhotoSlotLabels = (list) => {
    [...(list?.querySelectorAll('[data-photo-slot]') || [])].forEach((slot, i) => {
      const caption = slot.querySelector('[data-photo-caption]');
      if (caption) caption.textContent = i === 0 ? 'Main photo' : 'Photo ' + (i + 1);
      const hint = slot.querySelector('.admin-photo-file span');
      if (hint) hint.textContent = slot.querySelector('.admin-photo-preview') ? 'Replace photo' : 'Choose photo';
      const input = slot.querySelector('input[data-product-photo]');
      if (input) input.required = i === 0 && !slot.querySelector('.admin-photo-preview');
    });
  };

  const bindProductPhotoList = (list) => {
    if (!list || list.dataset.photoBound === '1') return;
    list.dataset.photoBound = '1';
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-photo-remove');
      if (!btn) return;
      if (list.querySelectorAll('[data-photo-slot]').length <= 1) {
        showToast('Keep at least one photo.');
        return;
      }
      btn.closest('[data-photo-slot]')?.remove();
      refreshPhotoSlotLabels(list);
    });
    list.addEventListener('change', async (e) => {
      const input = e.target.closest('input[data-product-photo]');
      const file = input?.files?.[0];
      const slot = input?.closest('[data-photo-slot]');
      if (!file || !slot) return;
      try {
        const compressed = await compressImage(file, 800, 0.58);
        let img = slot.querySelector('.admin-photo-preview');
        if (!img) {
          img = document.createElement('img');
          img.className = 'admin-photo-preview';
          slot.insertBefore(img, slot.firstChild);
        }
        img.src = compressed;
        input.required = false;
        refreshPhotoSlotLabels(list);
      } catch {
        showToast('Could not read that photo. Try another file.');
      }
    });
  };

  const addProductPhotoSlot = (list, preview = '') => {
    if (!list) return;
    if (list.querySelectorAll('[data-photo-slot]').length >= MAX_PRODUCT_PHOTOS) {
      showToast('Maximum ' + MAX_PRODUCT_PHOTOS + ' photos.');
      return;
    }
    list.insertAdjacentHTML('beforeend', productPhotoSlotHTML(list.querySelectorAll('[data-photo-slot]').length, preview));
    refreshPhotoSlotLabels(list);
  };

  const fillProductPhotoList = (list, images = []) => {
    if (!list) return;
    list.innerHTML = '';
    list.dataset.photoBound = '';
    bindProductPhotoList(list);
    const srcs = (images || []).filter(Boolean);
    if (!srcs.length) addProductPhotoSlot(list, '');
    else srcs.forEach((src) => addProductPhotoSlot(list, src));
  };

  const readProductPhotosFromList = async (list, fallbackImages = []) => {
    const slots = [...(list?.querySelectorAll('[data-photo-slot]') || [])];
    const out = await Promise.all(
      slots.map(async (slot) => {
        const file = slot.querySelector('input[data-product-photo]')?.files?.[0];
        const preview = slot.querySelector('.admin-photo-preview')?.getAttribute('src') || '';
        if (preview.startsWith('data:image/')) return preview;
        if (file) return compressImage(file, 800, 0.58);
        return preview;
      })
    );
    const photos = out.filter(Boolean);
    return photos.length ? photos.slice(0, MAX_PRODUCT_PHOTOS) : fallbackImages.filter(Boolean).slice(0, MAX_PRODUCT_PHOTOS);
  };

  /* ---------- UI helpers ---------- */
  const openOverlay = () => $('#overlay')?.classList.remove('hidden');
  const closeOverlay = () => $('#overlay')?.classList.add('hidden');

  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
      openOverlay();
      document.body.style.overflow = 'hidden';
    }
  };

  const closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
    if (id === 'productModal') {
      closeGalleryLite();
      $('#sizeChartModal')?.classList.add('hidden');
    }
    if (id === 'sizeChartModal' && !$('#productModal')?.classList.contains('hidden')) {
      return;
    }
    if ($$('.modal:not(.hidden)').length === 0 && $('#adminPanel')?.classList.contains('hidden')) {
      closeOverlay();
      document.body.style.overflow = '';
    }
  };

  const closeAllPanels = () => {
    $$('.modal, .drawer, .search-panel, .mobile-menu').forEach((el) => el.classList.add('hidden'));
    closeGalleryLite();
    if ($('#adminPanel')?.classList.contains('hidden')) {
      closeOverlay();
      document.body.style.overflow = '';
    }
  };

  const initHeader = () => {
    const header = $('#siteHeader');
    if (!header) return;
    updateHeaderTheme = () => {
      const catalog = document.body.classList.contains('is-catalog');
      const scrolled = catalog || window.scrollY > 48;
      header.classList.toggle('site-header--solid', scrolled);
      header.classList.toggle('site-header--light', !scrolled);
    };
    window.addEventListener('scroll', updateHeaderTheme, { passive: true });
    updateHeaderTheme();
  };

  const refreshAdminEntry = () => {};

  const initDropdowns = () => {
    const shopDropdown = $('#shopDropdown');
    if (shopDropdown && CONFIG.shopMenu) {
      shopDropdown.innerHTML = CONFIG.shopMenu
        .map(
          (group) => `
        <div class="dropdown-group">
          <p class="dropdown-label">${group.label}</p>
          ${group.links.map((link) => `<a href="${link.filter ? '#shop/' + link.filter : link.href}" data-filter="${link.filter || ''}">${link.label}</a>`).join('')}
        </div>`
        )
        .join('');
    }

    const collectionsDropdown = $('#collectionsDropdown');
    const cats = settings.categoryCards?.length ? settings.categoryCards : CONFIG.categoryCards || [];
    if (collectionsDropdown && cats.length) {
      collectionsDropdown.innerHTML = cats
        .map((c) => `<a href="#shop/${c.filter || 'all'}" data-filter="${c.filter || ''}">${escapeHtml(c.label || '')}</a>`)
        .join('');
    }

    $$('[data-dropdown]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.closest('.has-dropdown');
        const isOpen = parent?.classList.contains('open');
        $$('.has-dropdown').forEach((d) => d.classList.remove('open'));
        if (!isOpen) parent?.classList.add('open');
      });
    });

    document.addEventListener('click', () => $$('.has-dropdown').forEach((d) => d.classList.remove('open')));
  };

  const initMobileMenu = () => {
    const nav = $('#mobileMenuNav');
    if (!nav) return;
    const shopLinks = (CONFIG.shopMenu || [])
      .flatMap((g) => g.links)
      .map((l) => `<a href="${l.filter ? '#shop/' + l.filter : l.href}" data-filter="${l.filter || ''}">${l.label}</a>`)
      .join('');
    const collectionLinks = (settings.categoryCards?.length ? settings.categoryCards : CONFIG.categoryCards || [])
      .map((c) => `<a href="#shop/${c.filter || 'all'}" data-filter="${c.filter || ''}">${c.label || ''}</a>`)
      .join('');
    nav.innerHTML = `
      <a href="#home" class="mobile-home-link">– HOME</a>
      <a href="#shop">Shop</a>
      <div class="mobile-sub">${shopLinks}</div>
      <a href="#collections">Collection</a>
      <div class="mobile-sub">${collectionLinks}</div>
      <a href="#about">About</a>
      <a href="#blogs">Journal</a>
      <a href="#contact">Contact</a>
      <button type="button" id="mobileAccountBtn">Account</button>
      <button type="button" id="mobileSupportBtn">Customer Service</button>
    `;
    $('#menuBtn')?.addEventListener('click', () => {
      $('#mobileMenu')?.classList.remove('hidden');
      openOverlay();
    });
    $('#closeMobileMenu')?.addEventListener('click', closeAllPanels);
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeAllPanels));
    $('#mobileSupportBtn')?.addEventListener('click', () => {
      closeAllPanels();
      openModal('supportModal');
    });
    $('#mobileAccountBtn')?.addEventListener('click', () => {
      closeAllPanels();
      setFormMessage($('#accountMessage'), '', '');
      showAccountAuthView('login');
      refreshAccountView();
      openModal('accountModal');
    });
  };

  const getHeroSlides = () =>
    settings.heroSlides?.length ? settings.heroSlides : CONFIG.heroSlides || [];

  const heroSlideSrc = (slide) => String(slide?.image || slide?.src || '');

  const fillHeroSlideImg = (index) => {
    const slides = getHeroSlides();
    const src = heroSlideSrc(slides[index]);
    const img = document.querySelector(`.hero-slide[data-index="${index}"] img`);
    if (!img || !src) return;
    if (img.getAttribute('src') === src) return;
    img.src = src;
  };

  const renderHero = () => {
    const slider = $('#heroSlider');
    const dots = $('#heroDots');
    const slides = getHeroSlides();
    if (!slider || !slides.length) return;
    slider.innerHTML = slides
      .map(
        (s, i) => `
      <div class="hero-slide${i === 0 ? ' active' : ''}" data-index="${i}">
        <img alt="${escapeHtml(s.alt || s.title || '')}" decoding="async" ${i === 0 ? 'fetchpriority="high"' : ''} />
      </div>`
      )
      .join('');
    fillHeroSlideImg(0);
    if (slides.length > 1) fillHeroSlideImg(1);
    dots.innerHTML = slides
      .map((_, i) => `<button class="hero-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>`)
      .join('');
    dots.querySelectorAll('.hero-dot').forEach((dot) => {
      dot.addEventListener('click', () => goToSlide(Number(dot.dataset.index)));
    });
    const next = $('#heroNext');
    if (next && !next.dataset.bound) {
      next.dataset.bound = '1';
      next.addEventListener('click', () => goToSlide((heroIndex + 1) % getHeroSlides().length));
    }
    startHeroAutoplay();
  };

  const goToSlide = (index) => {
    const slides = getHeroSlides();
    if (!slides.length) return;
    heroIndex = ((index % slides.length) + slides.length) % slides.length;
    $$('.hero-slide').forEach((s, i) => s.classList.toggle('active', i === heroIndex));
    $$('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === heroIndex));
    fillHeroSlideImg(heroIndex);
    fillHeroSlideImg((heroIndex + 1) % slides.length);
    startHeroAutoplay();
  };

  const startHeroAutoplay = () => {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => {
      const slides = getHeroSlides();
      if (slides.length) goToSlide(heroIndex + 1);
    }, 5000);
  };

  const productCardHTML = (product) => {
    const hasDiscount = isOnSale(product);
    const colors = product.colors || [];
    const soldOut = productTotalStock(product) <= 0;
    return `
      <article class="product-card${hasDiscount ? ' is-sale' : ''}" data-id="${product.id}">
        <div class="product-card-media">
          ${saleBadgeHTML(product)}
          ${soldOut ? '<span class="sold-badge">Sold out</span>' : ''}
          <a href="#" class="product-link" data-id="${product.id}">
            ${
              productCover(product)
                ? `<img src="${productCover(product)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" />`
                : '<span class="product-card-ph" aria-hidden="true"></span>'
            }
          </a>
          <div class="product-card-actions">
            <button class="view-product-chip" data-id="${product.id}" type="button">${soldOut ? 'View product' : 'View product'}</button>
          </div>
        </div>
        <a href="#" class="product-card-name product-link" data-id="${product.id}">${escapeHtml(product.name)}</a>
        <div class="product-card-price">
          ${priceHTML(product)}
        </div>
        ${
          colors.length
            ? `<div class="product-swatches">${colors.map((c, i) => `<span class="swatch${i === 0 ? ' active' : ''}" data-color="${escapeHtml(c)}" title="${escapeHtml(c)}"></span>`).join('')}</div>`
            : ''
        }
      </article>`;
  };

  const CATALOG_TITLES = {
    all: 'ALL JEWELRY',
    rings: 'RINGS',
    earrings: 'EARRINGS',
    bracelets: 'BRACELETS',
    necklaces: 'NECKLACES'
  };

  const renderProducts = () => {
    const grid = $('#newArrivalsGrid');
    if (!grid) return;
    const shown = products.slice(0, 4);
    if (!shown.length) {
      grid.innerHTML = '<p class="empty-state">No products yet.</p>';
      return;
    }
    grid.innerHTML = shown.map(productCardHTML).join('');
    bindProductEvents(grid);
    if (!$('#catalogPage')?.classList.contains('hidden')) renderCatalog();
  };

  const renderCatalog = () => {
    const grid = $('#catalogGrid');
    if (!grid) return;
    const list =
      productFilter && productFilter !== 'all'
        ? products.filter((p) => p.category === productFilter)
        : products;
    const count = $('#catalogCount');
    if (count) count.textContent = list.length ? `${list.length} piece${list.length === 1 ? '' : 's'}` : '';
    if (!list.length) {
      grid.innerHTML = '<p class="empty-state">No products in this category yet.</p>';
      return;
    }
    grid.innerHTML = list.map(productCardHTML).join('');
    bindProductEvents(grid);
  };

  const bindProductEvents = (container) => {
    container.querySelectorAll('.choose-btn, .view-product-chip, .product-link').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openProductModal(el.dataset.id);
      });
    });
    container.querySelectorAll('.product-card').forEach((card) => {
      const id = card.dataset.id;
      if (id) {
        card.addEventListener(
          'pointerenter',
          () => {
            const p = products.find((x) => x.id === id);
            if (!p || p.imagesComplete || p.images?.length || p._prefetch) return;
            p._prefetch = true;
            fetchProductImageAt(p.id, 0).then((src) => {
              if (!src || p.imagesComplete) return;
              if (!p.images?.length) p.images = [src];
            });
          },
          { once: true }
        );
      }
      card.querySelectorAll('.swatch').forEach((swatch) => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          card.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });
    });
  };

  const showHome = ({ fromHash, scrollId } = {}) => {
    document.body.classList.remove('is-catalog');
    $('#homeView')?.classList.remove('hidden');
    $('#catalogPage')?.classList.add('hidden');
    productFilter = 'all';
    showAllProducts = false;
    const heading = $('#productHeading');
    if (heading) heading.textContent = 'NEW ARRIVALS';
    renderProducts();
    updateHeaderTheme();
    if (!fromHash && String(location.hash).startsWith('#shop/')) {
      history.pushState(null, '', `${location.pathname}${location.search}`);
    }
    if (scrollId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(scrollId);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      });
    }
  };

  const openCatalog = (filter, { fromHash } = {}) => {
    productFilter = filter || 'all';
    document.body.classList.add('is-catalog');
    $('#homeView')?.classList.add('hidden');
    $('#catalogPage')?.classList.remove('hidden');
    const title = $('#catalogTitle');
    if (title) title.textContent = CATALOG_TITLES[productFilter] || String(productFilter).toUpperCase();
    $$('.catalog-cat').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.filter === productFilter);
    });
    renderCatalog();
    updateHeaderTheme();
    const next = `#shop/${productFilter}`;
    if (!fromHash && location.hash !== next) {
      history.pushState({ catalog: productFilter }, '', next);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
    closeAllPanels();
  };

  const filterProducts = (filter) => {
    openCatalog(filter || 'all');
  };

  const applyLocation = () => {
    const hash = location.hash || '';
    const shop = hash.match(/^#shop\/([\w-]+)/);
    if (shop) {
      openCatalog(shop[1], { fromHash: true });
      return;
    }
    const id = hash.replace(/^#/, '');
    if (!id || id === 'home') {
      showHome({ fromHash: true });
      return;
    }
    showHome({ fromHash: true, scrollId: id });
  };

  const fillProductCopy = (product) => {
    const subtitleEl = $('#modalProductSubtitle');
    const descriptionEl = $('#modalProductDescription');
    const fold = $('#productDetailsFold');
    const body = $('#productDetailsBody');
    const subtitle = String(product.subtitle || '').trim();
    const description = String(product.description || '').trim();
    const details = String(product.details || '').trim();
    if (subtitleEl) {
      subtitleEl.textContent = subtitle;
      subtitleEl.classList.toggle('hidden', !subtitle);
    }
    if (descriptionEl) {
      descriptionEl.textContent = description;
      descriptionEl.classList.toggle('hidden', !description);
    }
    if (fold && body) {
      body.textContent = details;
      fold.classList.toggle('hidden', !details);
    }
  };

  const currentVariantStock = () =>
    activeProduct ? getVariantStock(activeProduct, selectedSize, selectedColor) : 0;

  const refreshPdpStock = () => {
    if (!activeProduct) return;
    const n = currentVariantStock();
    const soldOut = n <= 0;
    if ($('#stockNote')) {
      $('#stockNote').textContent = soldOut ? 'Sold out' : `${n} in stock`;
      $('#stockNote').classList.toggle('is-sold', soldOut);
    }
    if ($('#addToCartBtn')) {
      $('#addToCartBtn').disabled = soldOut;
      $('#addToCartBtn').textContent = soldOut ? 'Sold out' : 'Add to cart';
    }
    if ($('#buyNowBtn')) {
      $('#buyNowBtn').disabled = soldOut;
      $('#buyNowBtn').textContent = soldOut ? 'Sold out' : 'Buy it now';
    }
    $('#sizeOptions')?.querySelectorAll('.size-btn').forEach((btn) => {
      const sold = sizeIsSoldOut(activeProduct, btn.dataset.size);
      btn.classList.toggle('is-sold', sold);
      const tag = btn.querySelector('i');
      if (sold && !tag) {
        const i = document.createElement('i');
        i.textContent = 'Sold out';
        btn.appendChild(i);
      } else if (!sold && tag) tag.remove();
    });
    $('#colorSwatches')?.querySelectorAll('.swatch').forEach((btn) => {
      btn.classList.toggle('is-sold', colorIsSoldOut(activeProduct, btn.dataset.color, selectedSize));
    });
    if (quantity > n && n > 0) {
      quantity = n;
      if ($('#qtyValue')) $('#qtyValue').textContent = String(quantity);
    }
    if (soldOut && quantity > 1) {
      quantity = 1;
      if ($('#qtyValue')) $('#qtyValue').textContent = '1';
    }
  };

  const paintProductModal = (product, keepView) => {
    const cover = productCover(product);
    const gallery = product.images?.length ? product.images : [cover].filter(Boolean);
    const img = $('#modalProductImage');
    if (img && !keepView) {
      img.src = cover || gallery[0] || '';
      img.alt = product.name;
    }
    renderProductGallery(gallery, keepView);
  };

  const openProductModal = async (id) => {
    activeProduct = products.find((p) => p.id === id);
    if (!activeProduct) return;
    refreshProductStockRow(id).then((row) => {
      if (activeProduct?.id !== id || !row) return;
      activeProduct = products.find((p) => p.id === id) || activeProduct;
      refreshPdpStock();
    });
    premiumPackaging = false;
    const packEl = $('#premiumPackaging');
    if (packEl) packEl.checked = false;
    quantity = 1;
    const pick = firstInStockOptions(activeProduct);
    selectedColor = pick.color;
    selectedSize = pick.size;
    $('#modalProductImage').src = productCover(activeProduct);
    $('#modalProductImage').alt = activeProduct.name;
    $('#modalProductCategory').textContent = activeProduct.category;
    $('#modalProductName').textContent = activeProduct.name;
    const pdpPrice = $('#modalProductPrice');
    if (pdpPrice) pdpPrice.innerHTML = priceHTML(activeProduct);
    const pdpSale = $('#pdpSaleBadge');
    if (pdpSale) {
      if (isOnSale(activeProduct)) {
        pdpSale.textContent = `Sale −${activeProduct.discountPercent}%`;
        pdpSale.classList.remove('hidden');
      } else {
        pdpSale.textContent = '';
        pdpSale.classList.add('hidden');
      }
    }
    $('#qtyValue').textContent = '1';
    fillProductCopy(activeProduct);
    if ($('#selectedColorLabel')) $('#selectedColorLabel').textContent = selectedColor || '';
    paintProductModal(activeProduct);
    hydrateProductImages(activeProduct, (product) => {
      if (activeProduct?.id !== id) return;
      paintProductModal(product, true);
    });

    const colorGroup = $('#colorGroup');
    const colorSwatches = $('#colorSwatches');
    if (activeProduct.colors?.length) {
      colorGroup.classList.remove('hidden');
      colorSwatches.innerHTML = activeProduct.colors
        .map((c) => `<button type="button" class="swatch${c === selectedColor ? ' active' : ''}${colorIsSoldOut(activeProduct, c, selectedSize) ? ' is-sold' : ''}" data-color="${escapeHtml(c)}" title="${escapeHtml(c)}"></button>`)
        .join('');
      colorSwatches.querySelectorAll('.swatch').forEach((s) => {
        s.addEventListener('click', () => {
          selectedColor = s.dataset.color;
          if ($('#selectedColorLabel')) $('#selectedColorLabel').textContent = selectedColor;
          colorSwatches.querySelectorAll('.swatch').forEach((x) => x.classList.remove('active'));
          s.classList.add('active');
          refreshPdpStock();
        });
      });
    } else colorGroup.classList.add('hidden');

    const sizeGroup = $('#sizeGroup');
    const sizeOptions = $('#sizeOptions');
    if (activeProduct.sizes?.length) {
      sizeGroup.classList.remove('hidden');
      sizeOptions.innerHTML = activeProduct.sizes
        .map((s) => {
          const sold = sizeIsSoldOut(activeProduct, s);
          return `<button type="button" class="size-btn${s === selectedSize ? ' active' : ''}${sold ? ' is-sold' : ''}" data-size="${escapeHtml(s)}">${escapeHtml(s)}${sold ? '<i>Sold out</i>' : ''}</button>`;
        })
        .join('');
      sizeOptions.querySelectorAll('.size-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedSize = btn.dataset.size;
          sizeOptions.querySelectorAll('.size-btn').forEach((x) => x.classList.remove('active'));
          btn.classList.add('active');
          refreshPdpStock();
        });
      });
    } else sizeGroup.classList.add('hidden');

    refreshPdpStock();
    renderProductReviews(activeProduct);
    renderRelatedProducts(activeProduct);
    openModal('productModal');
    if (currentAccount) {
      const ready = orders.length ? Promise.resolve() : loadOrdersForEmail(currentAccount.email);
      ready.then(() => {
        if (activeProduct?.id === id) renderPdpTracking(activeProduct);
      });
    } else {
      renderPdpTracking(activeProduct);
    }
  };

  const setGalleryImage = (index) => {
    if (!galleryImages.length) return;
    galleryIndex = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
    const img = $('#modalProductImage');
    if (img) {
      const src = galleryImages[galleryIndex];
      img.alt = `${activeProduct?.name || 'Product'} view ${galleryIndex + 1}`;
      if (img.getAttribute('src') !== src) img.src = src;
    }
    $$('.product-thumb, .pdp-dot').forEach((thumb, i) => thumb.classList.toggle('active', i === galleryIndex));
  };

  const renderProductGallery = (images, keepView) => {
    const prevIndex = galleryIndex;
    galleryImages = (Array.isArray(images) ? images : []).filter(Boolean).slice(0, MAX_PRODUCT_PHOTOS);
    const thumbs = $('#productThumbs');
    if (!thumbs) return;
    if (!galleryImages.length) {
      thumbs.innerHTML = '';
      return;
    }
    thumbs.innerHTML = galleryImages
      .map(
        (_src, i) => `
      <button type="button" class="pdp-dot product-thumb${keepView && i === prevIndex ? ' active' : !keepView && i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Photo ${i + 1}"></button>`
      )
      .join('');
    thumbs.querySelectorAll('.product-thumb').forEach((btn) => {
      const index = Number(btn.dataset.index);
      btn.addEventListener('mouseenter', () => setGalleryImage(index));
      btn.addEventListener('focus', () => setGalleryImage(index));
      btn.addEventListener('click', () => setGalleryImage(index));
    });
    const nextIndex = keepView ? Math.min(prevIndex, galleryImages.length - 1) : 0;
    setGalleryImage(nextIndex);
  };

  const initProductZoom = () => {
    const zoom = $('#productZoom');
    if (!zoom) return;

    $('#zoomHint')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openGalleryLite();
    });

    let startX = 0;
    zoom.addEventListener('touchstart', (e) => {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    zoom.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 40) return;
      setGalleryImage(galleryIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  };

  const resetGalleryTransform = () => {
    galleryScale = 1;
    galleryPanX = 0;
    galleryPanY = 0;
    const img = $('#galleryLiteImg');
    if (img) img.style.transform = '';
    $('#galleryStage')?.classList.toggle('is-zoomed', false);
  };

  const applyGalleryTransform = () => {
    const img = $('#galleryLiteImg');
    if (!img) return;
    img.style.transform = `translate(${galleryPanX}px, ${galleryPanY}px) scale(${galleryScale})`;
    $('#galleryStage')?.classList.toggle('is-zoomed', galleryScale > 1);
  };

  const syncGalleryLiteImage = () => {
    const img = $('#galleryLiteImg');
    if (!img || !galleryImages.length) return;
    img.src = galleryImages[galleryIndex];
    img.alt = `${activeProduct?.name || 'Product'} photo ${galleryIndex + 1}`;
    resetGalleryTransform();
    const many = galleryImages.length > 1;
    $('#galleryPrev')?.classList.toggle('is-disabled', !many);
    $('#galleryNext')?.classList.toggle('is-disabled', !many);
    $('#galleryPrev')?.toggleAttribute('disabled', !many);
    $('#galleryNext')?.toggleAttribute('disabled', !many);
  };

  closeGalleryLite = () => {
    $('#galleryLite')?.classList.add('hidden');
    resetGalleryTransform();
  };

  const openGalleryLite = () => {
    if (!galleryImages.length) return;
    const box = $('#galleryLite');
    if (!box) return;
    box.classList.remove('hidden');
    syncGalleryLiteImage();
    initGalleryLite();
  };

  const initGalleryLite = () => {
    if (galleryLiteBound) return;
    const stage = $('#galleryStage');
    const img = $('#galleryLiteImg');
    if (!stage || !img) return;
    galleryLiteBound = true;

    $('#galleryLiteClose')?.addEventListener('click', closeGalleryLite);
    $('#galleryPrev')?.addEventListener('click', () => {
      setGalleryImage(galleryIndex - 1);
      syncGalleryLiteImage();
    });
    $('#galleryNext')?.addEventListener('click', () => {
      setGalleryImage(galleryIndex + 1);
      syncGalleryLiteImage();
    });

    stage.addEventListener('click', (e) => {
      if (e.target.closest('.gallery-lite-fab, .gallery-lite-dock')) return;
      if (galleryScale > 1) {
        resetGalleryTransform();
        return;
      }
      galleryScale = 2.4;
      const rect = stage.getBoundingClientRect();
      galleryPanX = (rect.width / 2 - (e.clientX - rect.left)) * 0.35;
      galleryPanY = (rect.height / 2 - (e.clientY - rect.top)) * 0.35;
      applyGalleryTransform();
    });

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onMove = (x, y) => {
      if (!dragging || galleryScale <= 1) return;
      galleryPanX += x - lastX;
      galleryPanY += y - lastY;
      lastX = x;
      lastY = y;
      applyGalleryTransform();
    };
    stage.addEventListener('pointerdown', (e) => {
      if (galleryScale <= 1) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
    stage.addEventListener('pointerup', () => {
      dragging = false;
    });
    stage.addEventListener('pointercancel', () => {
      dragging = false;
    });

    let swipeX = 0;
    stage.addEventListener('touchstart', (e) => {
      swipeX = e.changedTouches[0].clientX;
    }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (galleryScale > 1) return;
      const dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) < 50) return;
      setGalleryImage(galleryIndex + (dx < 0 ? 1 : -1));
      syncGalleryLiteImage();
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if ($('#galleryLite')?.classList.contains('hidden')) return;
      if (e.key === 'Escape') closeGalleryLite();
      if (e.key === 'ArrowLeft') {
        setGalleryImage(galleryIndex - 1);
        syncGalleryLiteImage();
      }
      if (e.key === 'ArrowRight') {
        setGalleryImage(galleryIndex + 1);
        syncGalleryLiteImage();
      }
    });
  };

  $('#qtyMinus')?.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      $('#qtyValue').textContent = String(quantity);
    }
  });

  $('#qtyPlus')?.addEventListener('click', () => {
    const max = currentVariantStock();
    if (activeProduct && quantity < max) {
      quantity++;
      $('#qtyValue').textContent = String(quantity);
    }
  });

  const addCurrentProductToCart = async () => {
    if (!activeProduct) return false;
    await refreshProductStockRow(activeProduct.id);
    activeProduct = products.find((p) => p.id === activeProduct.id) || activeProduct;
    refreshPdpStock();
    if (activeProduct.sizes?.length && !selectedSize) {
      showToast('Please select a size');
      return false;
    }
    if (activeProduct.colors?.length && !selectedColor) {
      showToast('Please select a color');
      return false;
    }
    const max = currentVariantStock();
    if (max <= 0) {
      showToast('That size/color is out of stock');
      return false;
    }
    const wantBox = Boolean($('#premiumPackaging')?.checked);
    const existing = cart.find(
      (item) =>
        item.id === activeProduct.id &&
        item.color === selectedColor &&
        item.size === selectedSize &&
        Boolean(item.packaging) === wantBox
    );
    if (existing) existing.quantity = Math.min(itemQty(existing) + quantity, max);
    else {
      const product = activeProduct;
      cart.push({
        id: product.id,
        name: product.name,
        price: getEffectivePrice(product),
        image: productCover(product),
        color: selectedColor,
        size: selectedSize,
        quantity: Math.min(Number(quantity) || 1, max),
        packaging: wantBox,
        subtitle: product.subtitle || '',
        category: product.category || '',
        freeShipping: Boolean(product.freeShipping)
      });
    }
    saveCart();
    return true;
  };

  $('#addToCartBtn')?.addEventListener('click', async () => {
    if (!(await addCurrentProductToCart())) return;
    closeModal('productModal');
    showToast('Added to cart');
  });
  $('#buyNowBtn')?.addEventListener('click', async () => {
    if (!(await addCurrentProductToCart())) return;
    closeModal('productModal');
    $('#checkoutBtn')?.click();
  });
  $('#sizeChartBtn')?.addEventListener('click', () => {
    openSizeChart(activeProduct?.category);
  });

  const reviewStorageKey = (id) => 'zora_reviews_' + id;
  const loadReviews = (id) => {
    try {
      return JSON.parse(localStorage.getItem(reviewStorageKey(id)) || '[]');
    } catch {
      return [];
    }
  };
  const renderProductReviews = (product) => {
    const box = $('#productReviews');
    if (!box || !product) return;
    const reviews = loadReviews(product.id);
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + Number(r.stars || 0), 0) / reviews.length).toFixed(1)
      : '0.0';
    box.innerHTML = `
      <h2>Reviews for ${escapeHtml(product.name)}</h2>
      <p class="review-summary">${avg}/5 · ${reviews.length ? reviews.length + ' review' + (reviews.length === 1 ? '' : 's') : 'No reviews yet'}</p>
      ${reviews.map((r) => `<article class="review-card"><strong>${'★'.repeat(Number(r.stars) || 5)}</strong><h3>${escapeHtml(r.title || 'Review')}</h3><p>${escapeHtml(r.body || '')}</p><p>${escapeHtml(r.name || 'Customer')}</p></article>`).join('')}
      <form class="review-form" id="reviewForm">
        <input name="name" placeholder="Your name" required />
        <input name="title" placeholder="Headline" required />
        <select name="stars"><option value="5">5 stars</option><option value="4">4 stars</option><option value="3">3 stars</option><option value="2">2 stars</option><option value="1">1 star</option></select>
        <textarea name="body" rows="3" placeholder="Share your experience" required></textarea>
        <button type="submit" class="btn btn-primary">Write a review</button>
      </form>`;
    $('#reviewForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const next = [...loadReviews(product.id), { ...data, stars: Number(data.stars) || 5 }];
      localStorage.setItem(reviewStorageKey(product.id), JSON.stringify(next));
      renderProductReviews(product);
      showToast('Review posted');
    });
  };
  const renderRelatedProducts = (product) => {
    const box = $('#relatedProducts');
    if (!box) return;
    const others = products.filter((p) => p.id !== product.id);
    const same = others.filter((p) => p.category === product.category);
    const rest = others.filter((p) => p.category !== product.category);
    const shuffle = (list) => [...list].sort(() => Math.random() - 0.5);
    const related = [...shuffle(same), ...shuffle(rest)].slice(0, 4);
    if (!related.length) {
      box.innerHTML = '<p class="empty-state">More pieces will show here as you add products.</p>';
      return;
    }
    box.innerHTML = related
      .map(
        (p) => `
      <button type="button" class="pdp-related-card" data-id="${p.id}">
        <span class="pdp-related-media">${saleBadgeHTML(p)}<img src="${productCover(p)}" alt="${escapeHtml(p.name)}" loading="lazy" /></span>
        <strong>${escapeHtml(p.name)}</strong>
        ${priceHTML(p)}
      </button>`
      )
      .join('');
    box.querySelectorAll('[data-id]').forEach((btn) => {
      btn.addEventListener('click', () => openProductModal(btn.dataset.id));
    });
  };

  const updateCartUI = () => {
    const badge = $('#cartBadge');
    const itemsEl = $('#cartItems');
    const footer = $('#cartFooter');
    const subtotalEl = $('#cartSubtotal');
    const totalItems = cart.reduce((sum, item) => sum + itemQty(item), 0);
    if (badge) badge.textContent = String(Number.isFinite(totalItems) ? totalItems : 0);
    if (!itemsEl) return;
    if (cart.length === 0) {
      itemsEl.innerHTML = '<p class="empty-state">Your cart is empty</p>';
      footer?.classList.add('hidden');
      return;
    }
    footer?.classList.remove('hidden');
    itemsEl.innerHTML = cart
      .map((item, i) => {
        const meta = [item.color, item.size, item.packaging ? 'Premium box +₱100' : '']
          .filter(Boolean)
          .join(' · ');
        return `
      <div class="cart-item">
        <img src="${item.image}" alt="${escapeHtml(item.name)}" />
        <div class="cart-item-info">
          <h4>${escapeHtml(item.name)}</h4>
          ${meta ? `<p>${escapeHtml(meta)}</p>` : ''}
          <div class="cart-qty-row">
            <div class="cart-qty">
              <button type="button" class="cart-qty-btn" data-index="${i}" data-delta="-1" aria-label="Decrease quantity">−</button>
              <span>${itemQty(item)}</span>
              <button type="button" class="cart-qty-btn" data-index="${i}" data-delta="1" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="cart-item-remove" data-index="${i}">Remove</button>
          </div>
        </div>
        <span class="cart-item-price">${formatPrice(itemLineTotal(item))}</span>
      </div>`;
      })
      .join('');
    if (subtotalEl) subtotalEl.textContent = formatPrice(cartSubtotal());
    itemsEl.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.index), 1);
        saveCart();
      });
    });
    itemsEl.querySelectorAll('.cart-qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => changeCartQty(Number(btn.dataset.index), Number(btn.dataset.delta)));
    });
  };

  const changeCartQty = (index, delta) => {
    const item = cart[index];
    if (!item) return;
    const product = products.find((p) => p.id === item.id);
    const max = product ? getVariantStock(product, item.size, item.color) : 99;
    const next = itemQty(item) + delta;
    if (next < 1) {
      cart.splice(index, 1);
      saveCart();
      return;
    }
    if (next > max) {
      showToast(`Only ${max} in stock`);
      return;
    }
    item.quantity = next;
    saveCart();
  };

  $('#cartBtn')?.addEventListener('click', () => {
    $('#cartDrawer')?.classList.remove('hidden');
    openOverlay();
  });
  $('#closeCart')?.addEventListener('click', closeAllPanels);

  const updateCheckoutTotals = () => {
    const subtotal = cartSubtotal();
    const discount = promoDiscount(subtotal);
    const perk = memberDiscount();
    $('#checkoutSubtotal').textContent = formatPrice(subtotal);
    const row = $('#checkoutDiscountRow');
    if (discount > 0) {
      row.classList.remove('hidden');
      $('#checkoutDiscount').textContent = '−' + formatPrice(discount);
    } else row.classList.add('hidden');
    const memberRow = $('#checkoutMemberRow');
    if (memberRow) {
      if (perk > 0) {
        memberRow.classList.remove('hidden');
        const n = cartUnitCount();
        if ($('#checkoutMemberLabel')) {
          $('#checkoutMemberLabel').textContent =
            n >= 3 ? 'Piece perk (₱50 × 2)' : '2 pieces perk';
        }
        if ($('#checkoutMember')) $('#checkoutMember').textContent = '−' + formatPrice(perk);
      } else memberRow.classList.add('hidden');
    }
    const ship = cartShipping();
    const shipRow = $('#checkoutShipRow');
    if (shipRow && $('#checkoutShipping')) {
      $('#checkoutShipping').textContent = ship > 0 ? formatPrice(ship) : 'Free';
    }
    $('#checkoutTotal').textContent = formatPrice(cartTotal());
  };

  const fillCheckoutFromAccount = () => {
    const form = $('#checkoutForm');
    if (!form) return;
    if (currentAccount) {
      form.email.value = currentAccount.email || '';
      form.name.value = currentAccount.name || form.name.value;
      form.phone.value = currentAccount.phone || form.phone.value;
      form.address.value = currentAccount.address || form.address.value;
      $('#checkoutAccountNote').textContent = `Ordering as ${currentAccount.email}`;
    } else {
      $('#checkoutAccountNote').textContent = 'Create an account so this order is saved when you log in again.';
    }
  };

  $('#checkoutBtn')?.addEventListener('click', async () => {
    if (cart.length === 0) return;
    if (!currentAccount) {
      closeAllPanels();
      showAccountAuthView('login');
      openModal('accountModal');
      setFormMessage($('#accountMessage'), 'Sign in or create an account to checkout.', 'error');
      return;
    }
    closeAllPanels();
    appliedPromo = null;
    $('#promoInput').value = '';
    setFormMessage($('#promoMessage'), '', '');
    setFormMessage($('#checkoutMessage'), '', '');
    fillCheckoutFromAccount();
    if ($('#checkoutPayNote')) {
      $('#checkoutPayNote').textContent = isAutomaticPay()
        ? 'After a successful PayMongo payment we receive the order by email. You do not send a screenshot.'
        : 'Scan the GCash, Maya, or Bank QR on the next screen. We confirm payment in Admin.';
    }
    await refreshMemberOffUsed(currentAccount.email);
    await releaseExpiredStockHolds();
    updateCheckoutTotals();
    openModal('checkoutModal');
  });

  const refreshMemberOffUsed = async (email) => {
    memberOffUsed = false;
    const em = String(email || '').toLowerCase();
    if (!em) return;
    const stamp = 'member50=' + monthKey();
    try {
      const rows = await supaRequest(
        `/rest/v1/orders?user_email=eq.${encodeURIComponent(em)}&select=notes`
      );
      memberOffUsed = Array.isArray(rows) && rows.some((row) => String(row.notes || '').includes(stamp));
    } catch {
      memberOffUsed = false;
    }
  };

  const enrichCartItems = () => cart.map(slimLineItem);

  const orderItemImage = (item) => {
    if (isLightImage(item?.image)) return item.image;
    return productCover(products.find((p) => p.id === item?.id));
  };

  const findPromo = (code) =>
    (settings.promos || []).find((p) => p.code && p.code.toUpperCase() === code.toUpperCase());

  $('#applyPromoBtn')?.addEventListener('click', async () => {
    const code = $('#promoInput').value.trim();
    const promo = findPromo(code);
    const email = ($('#checkoutForm')?.email?.value || currentAccount?.email || '').toLowerCase();
    if (!promo) {
      appliedPromo = null;
      setFormMessage($('#promoMessage'), 'Invalid promo code.', 'error');
    } else if (cartSubtotal() < (Number(promo.minOrder) || 0)) {
      appliedPromo = null;
      setFormMessage($('#promoMessage'), `Minimum order is ${formatPrice(promo.minOrder)}.`, 'error');
    } else {
      const limit = await promoLimitReason(promo, email);
      if (limit) {
        appliedPromo = null;
        setFormMessage($('#promoMessage'), limit, 'error');
      } else {
        appliedPromo = promo;
        const left =
          Number(promo.maxRedemptions) > 0
            ? ` · ${promo.maxRedemptions} total uses max`
            : '';
        setFormMessage($('#promoMessage'), `Promo ${promo.code} applied${left}.`, 'success');
      }
    }
    updateCheckoutTotals();
  });

  const paymentLabel = (method) => {
    const m = String(method || '');
    if (m === 'PayMaya' || m === 'Maya') return 'PayMaya';
    if (m === 'Bank Transfer') return 'Bank Transfer';
    if (m === 'QRPh') return 'GCash / PayMaya / Bank';
    return m || 'GCash';
  };

  const paymentScanHint = (method) => {
    const label = paymentLabel(method);
    if (label === 'PayMaya') return 'Open Maya, tap Scan, and pay the exact amount.';
    if (label === 'Bank Transfer') return 'Open your bank or InstaPay app, scan this QR, and pay the exact amount.';
    return 'Open GCash, tap Scan QR, and pay the exact amount.';
  };

  const buildOrderMessage = (order, paidStatus) => {
    const lines = [
      'ZORA — ORDER TO PREPARE',
      '━━━━━━━━━━━━━━━━━━━━',
      `Order: ${order.id}`,
      `Status: ${paidStatus}`,
      `Payment method: ${paymentLabel(order.payment_method)}`,
      `Total: ${formatPrice(order.total)}`
    ];
    if (order.paymongo_intent_id) lines.push(`PayMongo: ${order.paymongo_intent_id}`);
    lines.push('');
    lines.push('SHIP TO:');
    lines.push(`  Name: ${order.name}`);
    lines.push(`  Phone: ${order.phone}`);
    lines.push(`  Email: ${order.user_email}`);
    lines.push(`  Address: ${order.address}`);
    lines.push('');
    lines.push('ITEMS:');
    (order.items || []).forEach((item) => {
      const qty = item.quantity || item.qty || 1;
      const product = products.find((p) => p.id === item.id) || {};
      lines.push(`  • ${item.name || product.name || 'Item'}`);
      lines.push(`      Qty: ${qty}`);
      if (item.size) lines.push(`      Size: ${item.size}`);
      if (item.color) lines.push(`      Color: ${item.color}`);
      if (item.category || product.category) lines.push(`      Category: ${item.category || product.category}`);
      if (item.subtitle || product.subtitle) lines.push(`      Subtitle: ${item.subtitle || product.subtitle}`);
      if (item.packaging) lines.push(`      Packaging: Premium box with sticker (+${formatPrice(PACKAGING_FEE * qty)})`);
      const details = String(item.details || product.details || '').trim();
      if (details) {
        lines.push('      Details:');
        details.split('\n').forEach((line) => lines.push(`        ${line}`));
      }
      lines.push(`      Line total: ${formatPrice(itemLineTotal(item))}`);
      lines.push('');
    });
    if (order.memberOff) {
      lines.push(`Piece perk: −${formatPrice(order.memberOff)}`);
    }
    if (order.promo) lines.push(`Promo: ${order.promo}`);
    if (/paid/i.test(String(paidStatus)) && !/unpaid/i.test(String(paidStatus))) {
      lines.push('');
      lines.push('Payment is confirmed. Prepare and pack this order.');
    }
    return lines.join('\n');
  };

  const isPaidStatus = (status) => {
    const s = String(status || '').toLowerCase();
    return s.includes('paid') && !s.includes('unpaid');
  };

  const setPaymentWaitUi = (paid, waitingText) => {
    const waitEl = $('#paymentWaitStatus');
    if (!waitEl) return;
    waitEl.classList.remove('hidden');
    if (paid) {
      waitEl.textContent = 'Payment received';
      waitEl.classList.add('is-paid');
      waitEl.classList.remove('is-unpaid');
    } else {
      waitEl.textContent = waitingText || 'Waiting for payment';
      waitEl.classList.add('is-unpaid');
      waitEl.classList.remove('is-paid');
    }
  };

  const markOrderPaidAuto = async (order, source) => {
    if (!order) return;
    const already = isPaidStatus(order.status);
    order.status = 'Paid';
    storeLocalOrder(order);
    setPaymentWaitUi(true);
    setFormMessage($('#paymentMessage'), 'Payment received. We are preparing your order.', 'success');
    renderAccountDetails();
    if (already) return;
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Paid',
          payment_method: order.payment_method || 'GCash',
          notes: serializeOrderNotes(order.notes, {
            promo: order.promo || '',
            paymongo: 'paid',
            source: source || 'poll',
            method: order.payment_method || '',
            ship: getShipment({ ...order, status: 'Paid' }).ship === 'unpaid' ? 'paid' : getShipment(order).ship,
            member50: order.memberOff ? monthKey() : parseOrderNotes(order.notes).member50,
            hold: '0'
          })
        })
      });
    } catch {
      /* ignore */
    }
    if (source !== 'webhook') {
      await sendStoreEmail({
        subject: `ZORA PAID ${order.id} — ${paymentLabel(order.payment_method)} — ${order.name} / ${order.phone}`,
        name: order.name,
        email: order.user_email,
        message: buildOrderMessage(order, 'PAID — prepare this order'),
        extra: { payment: order.payment_method, order_id: order.id, paid: 'yes' }
      });
    }
    showToast('Payment received — we have the order details');
  };

  const pollPaymongoStatus = async (order) => {
    if (!order || paymentPollBusy) return;
    paymentPollBusy = true;
    try {
      try {
        const rows = await supaRequest(
          `/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}&select=status`
        );
        const remote = rows?.[0];
        if (isPaidStatus(remote?.status)) {
          stopPaymentPoll();
          await markOrderPaidAuto(order, 'webhook');
          return;
        }
        if (/fail|cancel/i.test(String(remote?.status || ''))) {
          stopPaymentPoll();
          setPaymentWaitUi(false, 'Payment failed');
          setFormMessage(
            $('#paymentMessage'),
            'Payment did not go through. The piece is available again for other customers.',
            'error'
          );
          return;
        }
      } catch {
        /* keep polling */
      }
      if (!order.paymongo_intent_id || !order.paymongo_client_key) {
        setPaymentWaitUi(false, 'Waiting for payment');
        return;
      }
      const pk = getPaymongoPublicKey();
      if (!pk) return;
      const url =
        `https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(order.paymongo_intent_id)}` +
        `?client_key=${encodeURIComponent(order.paymongo_client_key)}`;
      const res = await fetch(url, {
        headers: { Authorization: 'Basic ' + btoa(pk + ':') }
      });
      const data = await res.json().catch(() => ({}));
      const status = data?.data?.attributes?.status;
      if (status === 'succeeded') {
        stopPaymentPoll();
        await markOrderPaidAuto(order, 'poll');
      } else if (/fail|cancel|expir/i.test(String(status || ''))) {
        stopPaymentPoll();
        await releaseOrderHold(order, 'failed');
        setPaymentWaitUi(false, 'Payment failed');
        setFormMessage(
          $('#paymentMessage'),
          'Payment did not go through. The piece is available again for other customers.',
          'error'
        );
      } else {
        setPaymentWaitUi(false, 'Waiting for payment');
      }
    } catch {
      /* keep polling */
    } finally {
      paymentPollBusy = false;
    }
  };

  const startPaymentPoll = (order) => {
    stopPaymentPoll();
    pollPaymongoStatus(order);
    paymentPollTimer = setInterval(() => pollPaymongoStatus(order), 3000);
  };

  const qrForMethod = (method) => {
    const qrs = settings.paymentQrs || DEFAULT_QRS;
    if (method === 'PayMaya' || method === 'Maya') return qrs.Maya || DEFAULT_QRS.Maya;
    if (method === 'Bank Transfer') return qrs['Bank Transfer'] || DEFAULT_QRS['Bank Transfer'];
    return qrs.GCash || DEFAULT_QRS.GCash;
  };

  const paymentOrderCard = (order, qrSrc, note) => `
      <p class="payment-amount">${formatPrice(order.total)}</p>
      <div class="order-info">
        <p><strong>Order</strong> ${escapeHtml(order.id)}</p>
        <p><strong>Name</strong> ${escapeHtml(order.name || '')}</p>
        <p><strong>Phone</strong> ${escapeHtml(order.phone || '')}</p>
      </div>
      <img class="payment-qr" src="${qrSrc}" alt="Payment QR" />
      <p class="payment-note">${escapeHtml(note)}</p>`;

  const showStaticPayment = (order) => {
    const method = paymentLabel(order.payment_method);
    if ($('#paymentTitle')) $('#paymentTitle').textContent = 'Pay with ' + method;
    $('#paymentInstructions').textContent = `${paymentScanHint(method)} Exact amount ${formatPrice(order.total)}. Stay on this page.`;
    $('#paymentDetails').innerHTML = paymentOrderCard(
      order,
      qrForMethod(order.payment_method),
      isAutomaticPay()
        ? 'Backup QR. Automatic confirmation needs PayMongo.'
        : 'Manual QR. Scan to pay, then we mark this Paid in Admin → Orders.'
    );
    setPaymentWaitUi(false, 'Waiting for payment');
    setFormMessage($('#paymentMessage'), '', '');
    openModal('paymentModal');
  };

  const showPaymentModal = async (order) => {
    stopPaymentPoll();
    await loadPaymentQrs();
    const method = paymentLabel(order.payment_method);
    if ($('#paymentTitle')) $('#paymentTitle').textContent = 'Pay with ' + method;
    $('#paymentInstructions').textContent =
      `${paymentScanHint(method)} Exact amount ${formatPrice(order.total)}. When payment succeeds, this order is confirmed automatically.`;
    $('#paymentDetails').innerHTML = '<p class="payment-note">Preparing your secure QR…</p>';
    setPaymentWaitUi(false, 'Waiting for payment');
    setFormMessage($('#paymentMessage'), '', '');
    openModal('paymentModal');

    if (!isAutomaticPay()) {
      showStaticPayment(order);
      setPaymentWaitUi(false, 'Waiting for payment');
      setFormMessage(
        $('#paymentMessage'),
        'Pay with this QR. The piece is held for you until we confirm payment. If payment does not go through, it returns to stock.',
        ''
      );
      startPaymentPoll(order);
      return;
    }

    try {
      const created = await invokeEdge('create-qrph-payment', {
        orderId: order.id,
        amount: order.total,
        description: `ZORA ${order.id}`,
        name: order.name,
        email: order.user_email,
        phone: order.phone,
        paymentMethod: order.payment_method || 'GCash'
      });
      order.paymongo_intent_id = created.intentId;
      order.paymongo_client_key = created.clientKey;
      storeLocalOrder(order);
      try {
        await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymongo_intent_id: order.paymongo_intent_id,
            payment_method: order.payment_method || 'GCash',
            notes: serializeOrderNotes(order.notes, {
              promo: order.promo || '',
              paymongo_intent: order.paymongo_intent_id,
              method: order.payment_method || ''
            })
          })
        });
      } catch {
        /* column may be missing until SQL is run */
      }

      const qrSrc = String(created.qrImage || '');
      const imgSrc = qrSrc.startsWith('data:')
        ? qrSrc
        : qrSrc.startsWith('http')
          ? qrSrc
          : `data:image/png;base64,${qrSrc}`;
      $('#paymentDetails').innerHTML = paymentOrderCard(
        order,
        imgSrc,
        'Stay on this page until it says payment received.'
      );
      setPaymentWaitUi(false, 'Waiting for payment');
      startPaymentPoll(order);
    } catch (err) {
      showStaticPayment(order);
      setFormMessage(
        $('#paymentMessage'),
        err.message || 'Live QR is unavailable. Use the backup QR, or finish PayMongo setup in Admin → Payments.',
        'error'
      );
    }
  };

  $('#checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data.payment = data.payment || 'GCash';
    const btn = $('#placeOrderBtn');
    btn.disabled = true;
    btn.textContent = 'Placing order...';

    if (currentAccount) {
      currentAccount.name = data.name;
      currentAccount.phone = data.phone;
      currentAccount.address = data.address;
      upsertLocalAccount(currentAccount);
      saveSession();
      saveRemoteAccount(currentAccount);
    }

    const perk = memberDiscount();
    const order = {
      id: 'ORD-' + Date.now(),
      items: enrichCartItems(),
      total: cartTotal(),
      payment_method: data.payment,
      status: 'Unpaid',
      name: data.name,
      phone: data.phone,
      address: data.address,
      user_email: (data.email || currentAccount?.email || '').toLowerCase(),
      promo: appliedPromo?.code || '',
      memberOff: perk,
      created_at: new Date().toISOString()
    };

    if (appliedPromo) {
      const limit = await promoLimitReason(appliedPromo, order.user_email);
      if (limit) {
        appliedPromo = null;
        order.promo = '';
        order.total = cartTotal();
        updateCheckoutTotals();
        setFormMessage($('#promoMessage'), limit, 'error');
        btn.disabled = false;
        btn.textContent = 'Place order and pay';
        return;
      }
    }

    await releaseExpiredStockHolds();
    const stockErr = await cartStockError(order.items);
    if (stockErr) {
      setFormMessage($('#checkoutMessage'), stockErr, 'error');
      showToast(stockErr);
      btn.disabled = false;
      btn.textContent = 'Place order and pay';
      renderProducts();
      return;
    }

    const held = await deductOrderStock(order.items);
    if (!held) {
      setFormMessage($('#checkoutMessage'), 'Could not hold stock for this order. Try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Place order and pay';
      return;
    }

    order.notes = serializeOrderNotes('', {
      promo: order.promo || '',
      member50: order.memberOff ? monthKey() : '',
      ship: 'unpaid',
      hold: '1',
      pay: isAutomaticPay() ? 'auto' : 'manual'
    });
    storeLocalOrder(order);
    lastOrder = order;
    try {
      await supaRequest('/rest/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify([{
          id: order.id,
          items: order.items,
          total: order.total,
          payment_method: order.payment_method,
          status: order.status,
          name: order.name,
          phone: order.phone,
          address: order.address,
          user_email: order.user_email,
          notes: order.notes
        }])
      });
    } catch {
      await restoreOrderStock(order.items);
      setFormMessage($('#checkoutMessage'), 'Could not place the order. Stock was returned. Try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Place order and pay';
      return;
    }

    if (order.promo) recordPromoUse(order.promo, order.user_email);

    cart = [];
    appliedPromo = null;
    saveCart();
    form.reset();
    const firstPay = form.querySelector('input[name="payment"]');
    if (firstPay) firstPay.checked = true;
    closeModal('checkoutModal');
    await showPaymentModal(order);
    showToast('Complete payment with ' + paymentLabel(order.payment_method));
    btn.disabled = false;
    btn.textContent = 'Place order and pay';
  });

  const patchOrderRemote = async (order) => {
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          notes: serializeOrderNotes(order.notes, { promo: order.promo || '' })
        })
      });
    } catch {
      /* ignore */
    }
  };

  const updateOrderStatus = async (status) => {
    if (!lastOrder) return;
    stopPaymentPoll();
    lastOrder.status = status;
    storeLocalOrder(lastOrder);
    await patchOrderRemote(lastOrder);
    closeModal('paymentModal');
    showToast(status === 'Unpaid' ? 'Order saved. You can pay later from a new checkout.' : 'Order updated.');
    renderAccountDetails();
  };

  $('#markUnpaidBtn')?.addEventListener('click', () => updateOrderStatus('Unpaid'));
  document.querySelectorAll('[data-close="paymentModal"]').forEach((el) => {
    el.addEventListener('click', () => stopPaymentPoll());
  });

  /* Search */
  const initSearch = () => {
    $('#searchBtn')?.addEventListener('click', () => {
      $('#searchPanel')?.classList.remove('hidden');
      openOverlay();
      setTimeout(() => $('#searchInput')?.focus(), 100);
    });
    $('#closeSearch')?.addEventListener('click', closeAllPanels);
    $('#searchInput')?.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      const results = $('#searchResults');
      if (!results) return;
      if (!query) {
        results.innerHTML = '';
        return;
      }
      const matches = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.subtitle || '').toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query)
      );
      if (!matches.length) {
        results.innerHTML = '<p class="empty-state">No products found</p>';
        return;
      }
      results.innerHTML = matches
        .map(
          (p) => `
        <div class="search-result" data-id="${p.id}">
          <img src="${productCover(p)}" alt="${escapeHtml(p.name)}" />
          <div>
            <h4>${escapeHtml(p.name)}</h4>
            <p>${priceHTML(p)}</p>
          </div>
        </div>`
        )
        .join('');
      results.querySelectorAll('.search-result').forEach((el) => {
        el.addEventListener('click', () => {
          closeAllPanels();
          openProductModal(el.dataset.id);
        });
      });
    });
  };

  /* Account UI */
  const parseOrderNotes = (notes) => {
    const out = {};
    String(notes || '')
      .split(';')
      .forEach((part) => {
        const [k, ...rest] = part.split('=');
        if (!k) return;
        out[k.trim()] = rest.join('=').trim();
      });
    return out;
  };

  const serializeOrderNotes = (notes, extra = {}) => {
    const meta = { ...parseOrderNotes(notes), ...extra };
    return Object.entries(meta)
      .filter(([, v]) => v != null && String(v) !== '')
      .map(([k, v]) => k + '=' + String(v))
      .join(';');
  };

  const STOCK_HOLD_MS = 30 * 60 * 1000;
  const STOCK_HOLD_MANUAL_MS = 24 * 60 * 60 * 1000;

  const patchOrderHold = async (order, hold, status) => {
    if (!order?.id) return;
    const notes = serializeOrderNotes(order.notes, { hold });
    order.notes = notes;
    if (status) order.status = status;
    const body = { notes };
    if (status) body.status = status;
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch {
      /* ignore */
    }
    storeLocalOrder(order);
  };

  const releaseOrderHold = async (order, reason) => {
    if (!order || isPaidStatus(order.status)) return false;
    if (String(parseOrderNotes(order.notes).hold) !== '1') return false;
    await restoreOrderStock(order.items || []);
    await patchOrderHold(order, '0', reason === 'failed' ? 'Failed' : order.status);
    return true;
  };

  const releaseExpiredStockHolds = async () => {
    let rows = [];
    try {
      const data = await supaRequest(`/rest/v1/orders?select=${ORDER_COLS}&order=created_at.desc`);
      if (Array.isArray(data)) rows = data;
    } catch {
      return;
    }
    const now = Date.now();
    for (const row of rows) {
      if (isPaidStatus(row.status)) continue;
      if (String(parseOrderNotes(row.notes).hold) !== '1') continue;
      const failed = /fail|cancel/i.test(String(row.status || ''));
      const age = now - Date.parse(row.created_at || '');
      const pay = String(parseOrderNotes(row.notes).pay || '');
      const limit = pay === 'manual' ? STOCK_HOLD_MANUAL_MS : STOCK_HOLD_MS;
      if (!failed && !(Number.isFinite(age) && age > limit)) continue;
      await releaseOrderHold(row, failed ? 'failed' : 'expired');
    }
  };

  const COURIERS = ['J&T Express', 'LBC', 'Ninja Van', 'Flash Express', 'JRS Express', 'Grab Express', 'Lalamove', 'Other'];
  const SHIP_STEPS = [
    { key: 'unpaid', label: 'To pay' },
    { key: 'paid', label: 'Paid' },
    { key: 'packed', label: 'Packed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const getShipment = (order) => {
    const meta = parseOrderNotes(order?.notes);
    const ship =
      String(order?.ship_status || meta.ship || (isPaidStatus(order?.status) ? 'paid' : 'unpaid')).toLowerCase() ||
      'unpaid';
    return {
      courier: order?.courier || meta.courier || '',
      trackingNo: order?.tracking_no || meta.track || '',
      trackingUrl: order?.tracking_url || meta.trackurl || '',
      ship
    };
  };

  const courierTrackUrl = (courier, trackingNo, customUrl) => {
    const custom = String(customUrl || '').trim();
    if (custom) return custom;
    const n = encodeURIComponent(String(trackingNo || '').trim());
    if (!n) return '';
    const c = String(courier || '').toLowerCase();
    if (c.includes('j&t') || c.includes('jnt') || c === 'jt') return 'https://www.jtexpress.ph/vl/track?billcode=' + n;
    if (c.includes('lbc')) return 'https://www.lbcexpress.com/track/?tracking_no=' + n;
    if (c.includes('ninja')) return 'https://www.ninjavan.co/en-ph/tracking?id=' + n;
    if (c.includes('flash')) return 'https://www.flashexpress.ph/fle/tracking?se=' + n;
    if (c.includes('jrs')) return 'https://jrs-express.com/';
    if (c.includes('grab')) return 'https://www.grab.com/ph/express/';
    if (c.includes('lalamove')) return 'https://www.lalamove.com/philippines/manila/en-ph/';
    return '';
  };

  const shipStepIndex = (key) => {
    const i = SHIP_STEPS.findIndex((s) => s.key === key);
    return i < 0 ? (key === 'paid' ? 1 : 0) : i;
  };

  const shipmentTrackHTML = (order, { compact } = {}) => {
    const ship = getShipment(order);
    const current = shipStepIndex(ship.ship);
    const url = courierTrackUrl(ship.courier, ship.trackingNo, ship.trackingUrl);
    const steps = SHIP_STEPS.map((step, i) => {
      const state = i < current ? 'is-done' : i === current ? 'is-now' : '';
      return `<span class="ship-step ${state}"><i></i>${escapeHtml(step.label)}</span>`;
    }).join('');
    const meta = [
      ship.courier ? `<p><strong>Courier</strong> ${escapeHtml(ship.courier)}</p>` : '',
      ship.trackingNo ? `<p><strong>Tracking no.</strong> ${escapeHtml(ship.trackingNo)}</p>` : '',
      current <= 1 && !ship.trackingNo ? '<p>We pack after payment is confirmed, then add the courier number here.</p>' : ''
    ].join('');
    const trackBtn =
      url && ship.trackingNo
        ? `<a class="btn account-solid-btn btn-full ship-track-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">Track with courier</a>`
        : '';
    return `
      <div class="ship-tracker"${compact ? ' data-compact' : ''}>
        ${compact ? `<p class="ship-order-id">${escapeHtml(order.id)}</p>` : '<h5>Order tracker</h5>'}
        <div class="ship-steps">${steps}</div>
        <div class="ship-meta">${meta}</div>
        ${trackBtn}
      </div>`;
  };

  const renderPdpTracking = (product) => {
    const fold = $('#pdpTrackFold');
    const body = $('#pdpTrackBody');
    if (!fold || !body) return;
    const mine = (orders || []).filter((o) => (o.items || []).some((item) => item.id === product.id));
    if (!currentAccount || !mine.length) {
      fold.classList.add('hidden');
      body.innerHTML = '';
      return;
    }
    fold.classList.remove('hidden');
    body.innerHTML = mine.slice(0, 4).map((o) => shipmentTrackHTML(o, { compact: true })).join('');
  };

  const renderAccountDetails = () => {
    if (!currentAccount) return;
    $('#accountWelcome').textContent = `Welcome back, ${currentAccount.name || currentAccount.email}`;
    $('#accountEmail').textContent = currentAccount.email;
    $('#accountOrderCount').textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
    const box = $('#accountOrders');
    const detail = $('#accountOrderDetail');
    if (detail) {
      detail.classList.add('hidden');
      detail.innerHTML = '';
    }
    if (!box) return;
    box.classList.remove('hidden');
    if (!orders.length) {
      box.innerHTML = '<p class="empty-state">No orders yet.</p>';
      return;
    }
    box.innerHTML = orders
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const paid = isPaidStatus(order.status);
        const cover = orderItemImage(items[0]);
        return `
        <article class="order-card order-card--click" data-order-id="${escapeHtml(order.id)}">
          <div class="account-order-row">
            ${cover ? `<img class="account-order-thumb" src="${cover}" alt="" />` : ''}
            <div class="account-order-copy">
              <h4>${escapeHtml(order.id)}</h4>
              <p>${paid ? 'Paid' : 'Waiting for payment'} · ${escapeHtml(paymentLabel(order.payment_method))} · ${escapeHtml(SHIP_STEPS[shipStepIndex(getShipment(order).ship)]?.label || '')}</p>
              <p>${formatPrice(order.total || 0)}</p>
              <ul>${items.map((item) => `<li>${escapeHtml(item.name || '')}${item.size ? ' · ' + escapeHtml(item.size) : ''} × ${item.quantity || item.qty || 1}</li>`).join('')}</ul>
              <p class="account-order-hint">Tap for full details</p>
            </div>
          </div>
        </article>`;
      })
      .join('');
    box.querySelectorAll('[data-order-id]').forEach((card) => {
      card.addEventListener('click', () => showAccountOrderDetail(card.dataset.orderId));
    });
  };

  const showAccountOrderDetail = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    const box = $('#accountOrders');
    const detail = $('#accountOrderDetail');
    if (!order || !detail) return;
    const items = Array.isArray(order.items) ? order.items : [];
    const paid = isPaidStatus(order.status);
    box?.classList.add('hidden');
    detail.classList.remove('hidden');
    detail.innerHTML = `
      <button type="button" class="account-text-link" id="accountOrderBack">← All orders</button>
      <h4>${escapeHtml(order.id)}</h4>
      <p><strong>${paid ? 'Paid' : 'Waiting for payment'}</strong> · ${escapeHtml(paymentLabel(order.payment_method))}</p>
      <p>${formatPrice(order.total || 0)}</p>
      <p>${escapeHtml(order.created_at ? new Date(order.created_at).toLocaleString() : '')}</p>
      <p>${escapeHtml(order.name || '')} · ${escapeHtml(order.phone || '')}</p>
      <p>${escapeHtml(order.address || '')}</p>
      ${shipmentTrackHTML(order)}
      <ul class="account-order-items">
        ${items
          .map((item) => {
            const qty = item.quantity || item.qty || 1;
            const cover = orderItemImage(item);
            return `<li class="account-order-line">
              ${cover ? `<img src="${cover}" alt="" />` : ''}
              <div>
                <strong>${escapeHtml(item.name || '')}</strong>
                <span>${item.size ? 'Size ' + escapeHtml(item.size) : ''}${item.color ? ' · ' + escapeHtml(item.color) : ''}</span>
                <span>× ${qty}${item.packaging ? ' · Premium box +₱100' : ''}</span>
                <span>${formatPrice(itemLineTotal(item))}</span>
              </div>
            </li>`;
          })
          .join('')}
      </ul>
      <div class="account-order-actions">
        <button type="button" class="btn account-solid-btn btn-full" id="reorderBtn">Order again</button>
        ${paid ? '' : '<button type="button" class="btn account-solid-btn btn-full" id="payAgainBtn">Pay now</button>'}
      </div>`;
    $('#accountOrderBack')?.addEventListener('click', () => renderAccountDetails());
    $('#reorderBtn')?.addEventListener('click', () => reorderFromOrder(order));
    $('#payAgainBtn')?.addEventListener('click', () => resumeOrderPayment(order));
  };

  const reorderFromOrder = (order) => {
    (order.items || []).forEach((item) => {
      cart.push({
        id: item.id,
        name: item.name,
        price: Number(item.price) || 0,
        image: item.image || orderItemImage(item),
        color: item.color || null,
        size: item.size || null,
        quantity: item.quantity || item.qty || 1,
        packaging: Boolean(item.packaging),
        subtitle: item.subtitle || '',
        details: item.details || '',
        category: item.category || ''
      });
    });
    saveCart();
    closeModal('accountModal');
    $('#cartDrawer')?.classList.remove('hidden');
    openOverlay();
    showToast('Items added to cart');
  };

  const resumeOrderPayment = async (order) => {
    lastOrder = order;
    closeModal('accountModal');
    await showPaymentModal(order);
  };

  const refreshAccountView = async () => {
    const loggedIn = Boolean(currentAccount);
    $('#accountLoggedOut')?.classList.toggle('hidden', loggedIn);
    $('#accountLoggedIn')?.classList.toggle('hidden', !loggedIn);
    if (loggedIn) {
      await loadOrdersForEmail(currentAccount.email);
      renderAccountDetails();
    }
  };

  const showAccountAuthView = (view) => {
    $('#loginForm')?.classList.toggle('hidden', view !== 'login');
    $('#registerForm')?.classList.toggle('hidden', view !== 'register');
    $('#forgotForm')?.classList.toggle('hidden', view !== 'forgot');
    $('#resetForm')?.classList.toggle('hidden', view !== 'reset');
    $('#accountTabs')?.classList.toggle('hidden', view === 'forgot' || view === 'reset');
    if ($('#accountTitle')) {
      $('#accountTitle').textContent =
        view === 'register'
          ? 'Create account'
          : view === 'forgot'
            ? 'Forgot password'
            : view === 'reset'
              ? 'Reset password'
              : 'Sign in';
    }
    if ($('#accountLead')) {
      $('#accountLead').textContent =
        view === 'register'
          ? 'Create an account to save your cart and orders.'
            : view === 'forgot'
            ? 'Enter the email you use to sign in.'
            : view === 'reset'
              ? pendingResetEmail
                ? 'Enter the 6-digit code we sent to ' + maskEmail(pendingResetEmail) + ', then choose a new password.'
                : 'Enter the 6-digit code from your email, then choose a new password.'
              : 'Your cart and orders stay on this account every time you log in.';
    }
    $$('[data-account-tab]').forEach((b) => b.classList.toggle('active', b.dataset.accountTab === view));
  };

  $('#accountBtn')?.addEventListener('click', () => {
    setFormMessage($('#accountMessage'), '', '');
    showAccountAuthView('login');
    refreshAccountView();
    openModal('accountModal');
  });

  $$('[data-account-tab]').forEach((btn) => {
    btn.addEventListener('click', () => showAccountAuthView(btn.dataset.accountTab));
  });

  $('#forgotPasswordBtn')?.addEventListener('click', () => {
    setFormMessage($('#accountMessage'), '', '');
    const loginEmail = $('#loginForm')?.email?.value;
    if (loginEmail && $('#forgotForm')?.email) $('#forgotForm').email.value = loginEmail;
    showAccountAuthView('forgot');
  });

  $$('[data-account-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFormMessage($('#accountMessage'), '', '');
      showAccountAuthView('login');
    });
  });

  const startResetForEmail = async (email) => {
    pendingResetEmail = String(email || '').trim().toLowerCase();
    const msg = await requestPasswordReset(pendingResetEmail);
    showAccountAuthView('reset');
    setFormMessage($('#accountMessage'), msg, 'success');
  };

  $('#forgotForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get('email');
    try {
      await startResetForEmail(email);
    } catch (err) {
      setFormMessage($('#accountMessage'), err.message, 'error');
    }
  });

  $('#resendResetCode')?.addEventListener('click', async () => {
    if (!pendingResetEmail) {
      showAccountAuthView('forgot');
      return;
    }
    try {
      await startResetForEmail(pendingResetEmail);
    } catch (err) {
      setFormMessage($('#accountMessage'), err.message, 'error');
    }
  });

  $('#resetForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (data.password !== data.confirm) {
      setFormMessage($('#accountMessage'), 'Passwords do not match.', 'error');
      return;
    }
    try {
      currentAccount = await completePasswordReset({
        email: pendingResetEmail,
        code: data.code,
        password: data.password
      });
      saveSession();
      loadCart();
      e.target.reset();
      showAccountAuthView('login');
      await refreshAccountView();
      setFormMessage($('#accountMessage'), '', '');
      showToast('Password updated. You are signed in.');
    } catch (err) {
      setFormMessage($('#accountMessage'), err.message, 'error');
    }
  });

  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      currentAccount = await loginAccount(data.email, data.password);
      saveSession();
      loadCart();
      await refreshAccountView();
      showToast('Welcome back');
    } catch (err) {
      setFormMessage($('#accountMessage'), err.message, 'error');
    }
  });

  $('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    if (data.password !== data.confirm) {
      setFormMessage($('#accountMessage'), 'Passwords do not match.', 'error');
      return;
    }
    try {
      currentAccount = await registerAccount(data);
      saveSession();
      loadCart();
      await refreshAccountView();
      showToast('Account created');
    } catch (err) {
      setFormMessage($('#accountMessage'), err.message, 'error');
    }
  });

  $('#logoutBtn')?.addEventListener('click', () => {
    currentAccount = null;
    saveSession();
    cart = [];
    loadCart();
    refreshAccountView();
    showToast('Logged out');
  });

  /* Support */
  const openSupport = () => {
    const form = $('#supportForm');
    if (currentAccount && form) {
      form.name.value = currentAccount.name || '';
      form.email.value = currentAccount.email || '';
    }
    setFormMessage($('#supportMessage'), '', '');
    openModal('supportModal');
  };
  $('#supportFab')?.addEventListener('click', openSupport);
  $('#openSupportFooter')?.addEventListener('click', openSupport);
  $('#openSupportAbout')?.addEventListener('click', openSupport);

  $('#supportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const payload = {
      id: generateId(),
      name: data.name,
      email: data.email,
      message: data.message,
      created_at: new Date().toISOString()
    };
    try {
      await supaRequest('/rest/v1/support_messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify([payload])
      });
    } catch {
      /* email still sends */
    }
    const ok = await sendStoreEmail({
      subject: `Zora customer service — ${data.name}`,
      name: data.name,
      email: data.email,
      message: `Complaint / inquiry from ${data.name} (${data.email})\n\n${data.message}`
    });
    setFormMessage(
      $('#supportMessage'),
      ok ? 'Message sent to Zora customer service.' : 'Opening your email app to send the complaint.',
      'success'
    );
    e.target.reset();
    showToast('Customer service message sent');
  });

  /* Collections / categories / blogs */
  const renderCollections = () => {
    const banners = $('#collectionBanners');
    if (banners) banners.innerHTML = '';
  };

  const renderCategories = () => {
    const grid = $('#categoryGrid');
    const cards = settings.categoryCards?.length ? settings.categoryCards : CONFIG.categoryCards || [];
    if (!grid || !cards.length) return;
    grid.innerHTML = cards
      .map(
        (c) => `
      <button type="button" class="category-card" data-filter="${c.filter}">
          <img src="${c.image}" alt="${escapeHtml(c.label)}" loading="lazy" decoding="async" />
        <div class="category-card-content">
          <h3>${escapeHtml(c.label)}</h3>
          <span>→</span>
        </div>
      </button>`
      )
      .join('');
    grid.querySelectorAll('.category-card').forEach((card) => {
      card.addEventListener('click', () => filterProducts(card.dataset.filter));
    });
  };

  const renderBlogs = () => {
    const grid = $('#blogGrid');
    const blogs = settings.blogs?.length ? settings.blogs : CONFIG.blogs || [];
    if (!grid || !blogs.length) return;
    grid.innerHTML = blogs
      .map(
        (b, i) => `
      <article class="blog-card" data-blog-index="${i}" role="button" tabindex="0">
        <div class="blog-card-image">
          <img src="${b.image}" alt="${escapeHtml(b.title)}" loading="lazy" decoding="async" />
        </div>
        <h3>${escapeHtml(b.title)}</h3>
        <p>${escapeHtml(b.excerpt || '')}</p>
        <button type="button" class="read-more" data-blog-index="${i}">Read more</button>
      </article>`
      )
      .join('');
    const open = (index) => openJournalPost(blogs[Number(index)]);
    grid.querySelectorAll('.blog-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        open(card.dataset.blogIndex);
      });
    });
  };

  const openJournalPost = (post) => {
    if (!post) return;
    const img = $('#journalModalImage');
    if (img) {
      img.src = post.image || '';
      img.alt = post.title || '';
      img.classList.toggle('hidden', !post.image);
    }
    if ($('#journalModalTitle')) $('#journalModalTitle').textContent = post.title || '';
    const body = $('#journalModalBody');
    if (body) body.textContent = String(post.body || post.excerpt || '').trim() || 'No story text yet.';
    openModal('journalModal');
  };

  const renderFooter = () => {
    const social = $('#footerSocial');
    if (!social || !CONFIG.social) return;
    const icon = (name, path) =>
      `<a href="${CONFIG.social[name]}" target="_blank" rel="noopener" aria-label="${name}">${path}</a>`;
    const links = [];
    if (CONFIG.social.instagram) {
      links.push(icon('instagram', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg>'));
    }
    if (CONFIG.social.tiktok) {
      links.push(icon('tiktok', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 3c.4 2.6 2.1 4.4 4.7 4.8v3.1c-1.6 0-3.1-.5-4.4-1.4v6.3c0 3.6-2.8 6.2-6.3 6.2S2.2 19.4 2.2 15.8c0-3.5 2.8-6.2 6.3-6.2.4 0 .8 0 1.2.1v3.2c-.4-.1-.8-.2-1.2-.2-1.8 0-3.2 1.4-3.2 3.1s1.4 3.1 3.2 3.1 3.2-1.4 3.2-3.1V3h2.8z"/></svg>'));
    }
    if (CONFIG.social.facebook) {
      links.push(icon('facebook', '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h3l1-3h-4V10c0-.6.4-1 1-1z"/></svg>'));
    }
    social.innerHTML = links.join('');
  };

  $('#newsletterForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get('email');
    await sendStoreEmail({
      subject: 'Zora newsletter signup',
      name: 'Newsletter',
      email,
      message: `${email} subscribed to the Zora newsletter.`
    });
    setFormMessage($('#newsletterMessage'), `Thanks for subscribing, ${email}!`, 'success');
    e.target.reset();
  });

  /* Admin */
  const switchAdminTab = (tab) => {
    $$('.admin-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.admin-tab-content').forEach((c) => c.classList.add('hidden'));
    $(`#tab-${tab}`)?.classList.remove('hidden');
    if (tab === 'products') renderAdminProducts();
    if (tab === 'orders') renderAdminOrders();
    if (tab === 'coupons') renderPromoAdminList();
    if (tab === 'payments') {
      loadPaymentQrs().then(() => {
        renderPaymentPreviews();
        syncPaymentModeUi();
      });
    }
    if (tab === 'lookbook') renderLookbookEditors();
    if (tab === 'add') bindSizePicker($('#addProductForm'));
    if (tab === 'live') {
      renderLiveStats();
      if (liveStatsTimer) clearInterval(liveStatsTimer);
      liveStatsTimer = setInterval(renderLiveStats, 8000);
    } else if (liveStatsTimer) {
      clearInterval(liveStatsTimer);
      liveStatsTimer = null;
    }
  };

  const fillNavCollections = () => {
    const collectionsDropdown = $('#collectionsDropdown');
    const cats = settings.categoryCards?.length ? settings.categoryCards : CONFIG.categoryCards || [];
    if (collectionsDropdown && cats.length) {
      collectionsDropdown.innerHTML = cats
        .map((c) => `<a href="#shop/${c.filter || 'all'}" data-filter="${c.filter || ''}">${escapeHtml(c.label || '')}</a>`)
        .join('');
    }
  };

  const refreshStorefront = () => {
    renderHero();
    renderCollections();
    renderCategories();
    renderBlogs();
    fillNavCollections();
    applyProductPolicies();
  };

  const lookbookCardHTML = (item, index, group) => {
    if (group === 'category') {
      return `
      <div class="lookbook-card" data-group="${group}" data-index="${index}">
        <img src="${item.image || ''}" alt="" />
        <label>Title<input class="lookbook-text" data-field="label" data-group="${group}" data-index="${index}" value="${escapeHtml(item.label || '')}" /></label>
        <label>Photo<input type="file" accept="image/*" class="lookbook-file" data-group="${group}" data-index="${index}" /></label>
      </div>`;
    }
    if (group === 'collection') {
      return `
      <div class="lookbook-card" data-group="${group}" data-index="${index}">
        <img src="${item.image || ''}" alt="" />
        <label>Small label<input class="lookbook-text" data-field="label" data-group="${group}" data-index="${index}" value="${escapeHtml(item.label || '')}" /></label>
        <label>Title<input class="lookbook-text" data-field="title" data-group="${group}" data-index="${index}" value="${escapeHtml(item.title || item.name || '')}" /></label>
        <label>Photo<input type="file" accept="image/*" class="lookbook-file" data-group="${group}" data-index="${index}" /></label>
      </div>`;
    }
    if (group === 'hero') {
      const canRemove = (settings.heroSlides || []).length > 1;
      return `
      <div class="lookbook-card" data-group="${group}" data-index="${index}">
        <img src="${item.image || item.src || ''}" alt="" />
        <label>Caption<input class="lookbook-text" data-field="alt" data-group="${group}" data-index="${index}" value="${escapeHtml(item.alt || item.title || '')}" /></label>
        <label>Photo<input type="file" accept="image/*" class="lookbook-file" data-group="${group}" data-index="${index}" /></label>
        ${canRemove ? `<button type="button" class="btn btn-outline-dark lookbook-remove" data-group="${group}" data-index="${index}">Remove slide</button>` : '<p class="admin-hint">Keep at least one slide.</p>'}
      </div>`;
    }
    return `
      <div class="lookbook-card" data-group="${group}" data-index="${index}">
        <img src="${item.image || ''}" alt="" />
        <label>Title<input class="lookbook-text" data-field="title" data-group="${group}" data-index="${index}" value="${escapeHtml(item.title || '')}" /></label>
        <label>Card preview<textarea class="lookbook-text" data-field="excerpt" data-group="${group}" data-index="${index}" rows="3">${escapeHtml(item.excerpt || '')}</textarea></label>
        <label>Full story<textarea class="lookbook-text" data-field="body" data-group="${group}" data-index="${index}" rows="6">${escapeHtml(item.body || item.excerpt || '')}</textarea></label>
        <label>Photo<input type="file" accept="image/*" class="lookbook-file" data-group="${group}" data-index="${index}" /></label>
      </div>`;
  };

  const lookbookList = (group) => {
    if (group === 'category') return settings.categoryCards;
    if (group === 'collection') return settings.collections;
    if (group === 'hero') return settings.heroSlides;
    return settings.blogs;
  };

  const bindLookbookEditors = (container) => {
    container.querySelectorAll('.lookbook-text').forEach((input) => {
      input.addEventListener('input', () => {
        const list = lookbookList(input.dataset.group);
        const item = list?.[Number(input.dataset.index)];
        if (!item) return;
        item[input.dataset.field] = input.value;
      });
    });
    container.querySelectorAll('.lookbook-file').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        const group = input.dataset.group;
        const list = lookbookList(group);
        const item = list?.[Number(input.dataset.index)];
        if (!file || !item) return;
        const maxSize = group === 'hero' ? 720 : 700;
        const quality = group === 'hero' ? 0.52 : 0.58;
        try {
          item.image = await compressImage(file, maxSize, quality);
          item.src = item.image;
          const preview = input.closest('.lookbook-card')?.querySelector('img');
          if (preview) preview.src = item.image;
          showToast('Photo ready. Tap Save under this section.');
        } catch {
          showToast('Could not read that photo. Try another file.');
        }
      });
    });
    container.querySelectorAll('.lookbook-remove').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const list = lookbookList(btn.dataset.group);
        const index = Number(btn.dataset.index);
        if (!Array.isArray(list) || list.length <= 1) {
          showToast('Keep at least one hero slide.');
          return;
        }
        list.splice(index, 1);
        renderLookbookEditors();
        showToast('Slide removed. Tap Save hero photos.');
      });
    });
  };

  const renderLookbookEditors = () => {
    const categoryBox = $('#categoryPhotoEditor');
    const heroBox = $('#heroPhotoEditor');
    const blogBox = $('#blogPhotoEditor');
    if (categoryBox) {
      categoryBox.innerHTML = (settings.categoryCards || []).map((item, i) => lookbookCardHTML(item, i, 'category')).join('');
      bindLookbookEditors(categoryBox);
    }
    if (heroBox) {
      heroBox.innerHTML = (settings.heroSlides || []).map((item, i) => lookbookCardHTML(item, i, 'hero')).join('');
      bindLookbookEditors(heroBox);
    }
    if (blogBox) {
      blogBox.innerHTML = (settings.blogs || []).map((item, i) => lookbookCardHTML(item, i, 'blog')).join('');
      bindLookbookEditors(blogBox);
    }
  };

  const setAdminOrderStatus = async (orderId, status) => {
    let order = null;
    try {
      const rows = await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=${ORDER_COLS}`);
      order = Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch {
      order = null;
    }
    if (!order) {
      showToast('Could not load that order.');
      return;
    }
    const meta = parseOrderNotes(order.notes);
    order.promo = meta.promo;
    order.user_email = order.user_email || '';

    if (/fail|cancel/i.test(String(status))) {
      const released = await releaseOrderHold(order, 'failed');
      if (!released) await patchOrderHold(order, '0', 'Failed');
      await sendStoreEmail({
        subject: `Zora order ${order.id} — Failed — ${order.name} / ${order.phone}`,
        name: order.name,
        email: order.user_email || STORE_EMAIL,
        message: buildOrderMessage({ ...order, status: 'Failed' }, 'Failed — piece returned to stock'),
        extra: { payment: order.payment_method, order_id: order.id, paid: 'no' }
      });
      showToast('Payment failed. The piece is back in stock.');
      await refreshCatalogStock();
      renderAdminOrders();
      return;
    }

    order.status = status;
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: serializeOrderNotes(order.notes, {
            promo: meta.promo || '',
            ship: status === 'Paid' && getShipment(order).ship === 'unpaid' ? 'paid' : getShipment(order).ship,
            hold: status === 'Paid' ? '0' : parseOrderNotes(order.notes).hold
          })
        })
      });
    } catch {
      /* ignore */
    }
    await sendStoreEmail({
      subject: `Zora order ${order.id} — ${status} — ${order.name} / ${order.phone}`,
      name: order.name,
      email: order.user_email || STORE_EMAIL,
      message: buildOrderMessage(order, status + ' — verified by admin'),
      extra: { payment: order.payment_method, order_id: order.id, paid: status === 'Paid' ? 'yes' : 'no' }
    });
    showToast(status === 'Paid' ? 'Marked Paid after your verification' : 'Order set to ' + status);
    renderAdminOrders();
  };

  const renderAdminOrders = async () => {
    const list = $('#adminOrderList');
    if (!list) return;
    list.innerHTML = '<p class="admin-hint">Loading orders...</p>';
    let rows = [];
    try {
      const data = await supaRequest(`/rest/v1/orders?select=${ORDER_COLS}&order=created_at.desc`);
      if (Array.isArray(data)) rows = data.map(slimOrder);
    } catch {
      rows = [];
    }
    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">No orders yet. Place a test checkout, then tap Refresh orders.</p>';
      return;
    }
    const chrono = [...rows].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    const queueMap = new Map(chrono.map((order, i) => [order.id, i + 1]));
    const seen = JSON.parse(localStorage.getItem('zora_seen_orders') || '[]');
    list.innerHTML = rows
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const queue = String(queueMap.get(order.id) || 0).padStart(4, '0');
        const isNew = !seen.includes(order.id);
        const paid = isPaidStatus(order.status);
        const itemLines = items
          .map((item) => {
            const qty = item.quantity || item.qty || 1;
            const size = item.size ? ` · ${item.size}` : '';
            const cover = orderItemImage(item);
            return `<li class="account-order-line">${cover ? `<img src="${cover}" alt="" />` : ''}<span>${escapeHtml(item.name || '')}${escapeHtml(size)} × ${qty}</span></li>`;
          })
          .join('');
        return `
        <div class="order-card${paid ? ' order-card--paid' : ''}" data-order-id="${escapeHtml(order.id)}">
          <span class="order-queue">${paid ? 'PAID' : 'WAITING'} · #${queue}${isNew ? ' · NEW' : ''}</span>
          <h4>${escapeHtml(order.id)}</h4>
          <p><strong>When:</strong> ${escapeHtml(order.created_at ? new Date(order.created_at).toLocaleString() : '')}</p>
          <p><strong>Payment:</strong> ${paid ? 'Paid automatically' : 'Waiting for payment'}</p>
          <p>${escapeHtml(paymentLabel(order.payment_method))} · ${formatPrice(order.total || 0)}</p>
          <div class="payment-identity">
            <p class="payment-identity-title">Customer</p>
            <p><strong>Name</strong><span class="copy-line">${escapeHtml(order.name || '')}</span></p>
            <p><strong>Phone</strong><span class="copy-line">${escapeHtml(order.phone || '')}</span></p>
            <p><strong>Address</strong><span class="copy-line">${escapeHtml(order.address || '')}</span></p>
            <p><strong>Email</strong><span class="copy-line">${escapeHtml(order.user_email || '')}</span></p>
          </div>
          <ul>${itemLines}</ul>
          ${
            paid
              ? '<p class="admin-hint">Gmail was sent with these details when payment cleared. This piece stays out of stock.</p>'
              : `<div class="admin-order-actions">
            <button type="button" class="btn btn-outline-dark mark-paid-btn" data-id="${escapeHtml(order.id)}">Mark paid</button>
            <button type="button" class="btn btn-outline-dark mark-failed-btn" data-id="${escapeHtml(order.id)}">Payment failed</button>
          </div>
          <p class="admin-hint">Last piece is held for this order (automatic or manual). Mark paid keeps it sold. Payment failed returns it to the shop.</p>`
          }
          <div class="admin-ship">
            <p class="admin-hint">J&amp;T only. Scan or type the waybill — tracking goes live for the customer.</p>
            <select data-ship-status>${SHIP_STEPS.map((s) => `<option value="${s.key}"${s.key === getShipment(order).ship ? ' selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}</select>
            <input data-jt-scan placeholder="Scan or type J&T waybill" value="${escapeHtml(getShipment(order).trackingNo)}" autocomplete="off" />
            <p class="admin-hint" data-jt-hint>${getShipment(order).trackingNo ? 'J&T · ' + escapeHtml(getShipment(order).trackingNo) : 'Waiting for waybill'}</p>
          </div>
        </div>`;
      })
      .join('');
    localStorage.setItem('zora_seen_orders', JSON.stringify(rows.map((o) => o.id)));
    list.querySelectorAll('.copy-line').forEach((el) => {
      el.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(el.textContent || '');
          showToast('Copied');
        } catch {
          showToast(el.textContent || '');
        }
      });
    });
    list.querySelectorAll('.mark-paid-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAdminOrderStatus(btn.dataset.id, 'Paid'));
    });
    list.querySelectorAll('.mark-failed-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAdminOrderStatus(btn.dataset.id, 'Failed'));
    });
    list.querySelectorAll('.mark-unpaid-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAdminOrderStatus(btn.dataset.id, 'Unpaid'));
    });
    list.querySelectorAll('[data-jt-scan]').forEach((input) => {
      let wait;
      const run = () => {
        const waybill = input.value.trim();
        if (waybill.length < 8) return;
        const card = input.closest('.order-card');
        const ship = card?.querySelector('[data-ship-status]')?.value || 'shipped';
        saveOrderShipment(card?.dataset.orderId, {
          courier: 'J&T Express',
          trackingNo: waybill,
          trackingUrl: courierTrackUrl('J&T Express', waybill, ''),
          ship: ship === 'unpaid' || ship === 'paid' ? 'shipped' : ship
        });
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(wait);
          run();
        }
      });
      input.addEventListener('change', run);
      input.addEventListener('input', () => {
        clearTimeout(wait);
        wait = setTimeout(run, 450);
      });
    });
    list.querySelectorAll('[data-ship-status]').forEach((sel) => {
      sel.addEventListener('change', () => {
        const card = sel.closest('.order-card');
        const waybill = card?.querySelector('[data-jt-scan]')?.value.trim() || '';
        saveOrderShipment(card?.dataset.orderId, {
          courier: 'J&T Express',
          trackingNo: waybill,
          trackingUrl: waybill ? courierTrackUrl('J&T Express', waybill, '') : '',
          ship: sel.value
        });
      });
    });
  };

  const saveOrderShipment = async (orderId, ship) => {
    let order = null;
    try {
      const rows = await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=${ORDER_COLS}`);
      order = Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch {
      order = null;
    }
    if (!order) {
      showToast('Could not load that order.');
      return;
    }
    const notes = serializeOrderNotes(order.notes, {
      courier: ship.courier,
      track: ship.trackingNo,
      trackurl: ship.trackingUrl,
      ship: ship.ship
    });
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          courier: ship.courier,
          tracking_no: ship.trackingNo,
          tracking_url: ship.trackingUrl,
          ship_status: ship.ship
        })
      });
    } catch {
      try {
        await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes })
        });
      } catch {
        showToast('Could not save tracking.');
        return;
      }
    }
    showToast('Tracking updated for the customer');
    const card = document.querySelector(`.order-card[data-order-id="${CSS.escape(orderId)}"]`);
    const hint = card?.querySelector('[data-jt-hint]');
    if (hint) hint.textContent = ship.trackingNo ? 'J&T · ' + ship.trackingNo : 'Waiting for waybill';
  };

  const renderPaymentPreviews = () => {
    if ($('#previewGcash')) $('#previewGcash').src = settings.paymentQrs.GCash || DEFAULT_QRS.GCash;
    if ($('#previewMaya')) $('#previewMaya').src = settings.paymentQrs.Maya || DEFAULT_QRS.Maya;
    if ($('#previewBank')) $('#previewBank').src = settings.paymentQrs['Bank Transfer'] || DEFAULT_QRS['Bank Transfer'];
  };

  const PAY_TUTORIAL = {
    automatic:
      '<p><strong>Automatic</strong> uses PayMongo QRPh. Last piece is held at Place order. Paid keeps it sold. Failed or expired payment returns it to stock. Finish step 5 (webhook) below, then Save.</p>',
    manual:
      '<p><strong>Manual</strong> uses your own GCash, Maya, and Bank Transfer QR. Last-piece stock is the same: held at Place order, sold when you Mark paid, back in stock if you tap Payment failed.</p><ol><li>Upload the three QR photos below and tap Save payments.</li><li>Customer scans the QR at checkout.</li><li>In Admin → Orders tap Mark paid if they paid, or Payment failed if they did not.</li><li>Then scan the J&amp;T waybill so tracking goes live.</li></ol>'
  };

  const syncPaymentModeUi = () => {
    const mode = settings.paymentMode || 'automatic';
    const isManual = mode === 'manual';
    const hidden = $('#paymentModeValue');
    if (hidden) hidden.value = mode;
    const sw = $('#paymentModeSwitch');
    if (sw) {
      sw.classList.toggle('is-manual', isManual);
      sw.setAttribute('aria-checked', isManual ? 'true' : 'false');
    }
    $$('.pay-mode-side').forEach((el) => el.classList.toggle('is-on', el.dataset.paySide === mode));
    const guide = $('#paymentModeTutorial');
    if (guide) guide.innerHTML = PAY_TUTORIAL[isManual ? 'manual' : 'automatic'];
    $('#paymongoAutoBox')?.classList.toggle('hidden', isManual);
    applyProductPolicies();
  };

  const renderPromoAdminList = async () => {
    const container = $('#promoList');
    if (!container) return;
    if (!settings.promos.length) {
      container.innerHTML = '<p class="empty-state">No coupons yet.</p>';
      return;
    }
    const usageMap = await loadAllPromoUsage();
    container.innerHTML = settings.promos
      .map((promo, i) => {
        const used = usageMap[String(promo.code || '').toUpperCase()]?.count || 0;
        const max = Number(promo.maxRedemptions) || 0;
        return `
      <div class="promo-admin-item" data-index="${i}">
        <input class="promo-code" value="${escapeHtml(promo.code)}" placeholder="CODE" />
        <select class="promo-type">
          <option value="percent"${promo.type === 'percent' ? ' selected' : ''}>% off</option>
          <option value="fixed"${promo.type === 'fixed' ? ' selected' : ''}>₱ off</option>
        </select>
        <input type="number" class="promo-value" value="${promo.value}" min="1" title="Discount amount" />
        <input type="number" class="promo-min" value="${promo.minOrder || 0}" min="0" placeholder="Min order" title="Minimum order" />
        <input type="number" class="promo-max" value="${max}" min="0" placeholder="Max uses" title="Max total uses. 0 = unlimited" />
        <input type="number" class="promo-per" value="${promo.perCustomerLimit ?? 1}" min="0" placeholder="Per customer" title="Uses per customer. 0 = unlimited" />
        <p class="admin-hint promo-used">Used ${used}${max > 0 ? ' / ' + max : ''}</p>
        <button type="button" class="remove-promo-btn" data-index="${i}">Remove</button>
      </div>`;
      })
      .join('');
    container.querySelectorAll('.remove-promo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        settings.promos.splice(Number(btn.dataset.index), 1);
        renderPromoAdminList();
      });
    });
  };

  const renderAdminProducts = () => {
    const list = $('#adminProductList');
    if (!list) return;
    list.innerHTML = products
      .map(
        (p) => `
      <div class="admin-product-block" data-id="${p.id}">
        <div class="admin-product-item">
          <img src="${productCover(p)}" alt="" />
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <p>${escapeHtml(p.category)} · ${formatPrice(getEffectivePrice(p))}${isOnSale(p) ? ' · SALE −' + p.discountPercent + '%' : ''} · ${escapeHtml(stockSummary(p))}</p>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="edit-btn" data-id="${p.id}">Edit</button>
            <button type="button" class="delete-btn" data-id="${p.id}">Delete</button>
          </div>
        </div>
        <div class="admin-edit-slot" data-slot="${p.id}"></div>
      </div>`
      )
      .join('');
    list.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this product?')) return;
        products = products.filter((p) => p.id !== btn.dataset.id);
        try {
          await supaRequest(`/rest/v1/products?id=eq.${encodeURIComponent(btn.dataset.id)}`, { method: 'DELETE' });
        } catch {
          /* ignore */
        }
        renderProducts();
        renderAdminProducts();
      });
    });
    list.querySelectorAll('.edit-btn').forEach((btn) => btn.addEventListener('click', () => openEditProduct(btn.dataset.id)));
  };

  const openEditProduct = async (id) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    await hydrateProductImages(p);
    $$('.admin-edit-slot').forEach((slot) => {
      slot.innerHTML = '';
      slot.classList.remove('is-open');
    });
    $$('.admin-product-block').forEach((block) => block.classList.remove('is-editing'));
    const slot = document.querySelector(`.admin-edit-slot[data-slot="${CSS.escape(id)}"]`);
    const block = document.querySelector(`.admin-product-block[data-id="${CSS.escape(id)}"]`);
    if (!slot || !block) return;
    block.classList.add('is-editing');
    slot.classList.add('is-open');
    const editor = document.createElement('form');
    editor.className = 'admin-edit-form';
    editor.innerHTML = `
      <div class="admin-edit-head">
        <h3>Editing: ${escapeHtml(p.name)}</h3>
        <p>Changes apply only to this product.</p>
      </div>
      <div class="admin-edit-section">
        <p class="admin-edit-label">Product copy</p>
        <label class="admin-line">Title of the product<input name="name" value="${escapeHtml(p.name)}" required placeholder="AXIS" /></label>
        <label class="admin-line">Subtitle<input name="subtitle" value="${escapeHtml(p.subtitle || '')}" placeholder="Stainless Steel Cross Pendant Necklace, 24 cm, Silver AXIS Necklace" /></label>
        <label class="admin-line">Description<textarea name="description" rows="6" placeholder="A clean take on the classic cross pendant...">${escapeHtml(p.description || '')}</textarea></label>
        <label class="admin-line">Details<textarea name="details" rows="8" placeholder="Material: Stainless Steel">${escapeHtml(p.details || '')}</textarea></label>
        <label class="admin-line">Category
          <select name="category">
            ${['rings', 'earrings', 'bracelets', 'necklaces']
              .map((c) => `<option value="${c}"${p.category === c ? ' selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </label>
      </div>
      <div class="admin-edit-section">
        <p class="admin-edit-label">Price, sale, options & stock</p>
        <div class="admin-fields-2">
          <label class="admin-line">Price (₱)<input type="number" name="price" value="${p.price}" min="1" step="0.01" required /></label>
          <label class="admin-line">Discount %<input type="number" name="discountPercent" value="${p.discountPercent}" min="0" max="99" /></label>
        </div>
        <label class="checkbox-label admin-line-check"><input type="checkbox" name="discountActive"${p.discountActive ? ' checked' : ''} /> On sale</label>
        <label class="checkbox-label admin-line-check"><input type="checkbox" name="freeShipping"${p.freeShipping ? ' checked' : ''} /> Free shipping for this product</label>
        <p class="admin-hint">Same product, separate stock. 0 on a size shows Sold out for that size only.</p>
        <div class="admin-size-picker" data-size-picker>
          <span class="admin-size-label">Sizes</span>
          <div class="size-tab-row">
            <div class="size-chip-row" data-size-presets></div>
            <button type="button" class="size-tab-add" data-add-size aria-label="Add size">+</button>
          </div>
          <input type="hidden" name="sizes" value="${escapeHtml((p.sizes || []).join(', '))}" />
        </div>
        <div class="admin-size-picker" data-color-picker>
          <span class="admin-size-label">Colors</span>
          <div class="size-tab-row">
            <div class="size-chip-row" data-color-presets></div>
            <button type="button" class="size-tab-add" data-add-color aria-label="Add color">+</button>
          </div>
          <input type="hidden" name="colors" value="${escapeHtml((p.colors || []).join(', '))}" />
        </div>
        <div data-variant-stock class="variant-stock-grid"></div>
      </div>
      <div class="admin-edit-section">
        <p class="admin-edit-label">Photos</p>
        <p class="admin-hint">Add more slides, or remove ones you do not want. Current photos stay unless you remove or replace them.</p>
        <div class="admin-photo-list" data-edit-photos></div>
        <button type="button" class="btn btn-outline-dark" data-add-edit-photo>Add more photos</button>
      </div>
      <div class="admin-edit-actions">
        <button type="submit" class="btn btn-primary">Save product</button>
        <button type="button" class="btn btn-outline-dark cancel-edit-btn">Cancel</button>
      </div>`;
    slot.appendChild(editor);
    bindSizePicker(editor, { selected: p.sizes || [], colors: p.colors || [], variantStocks: p.variantStocks || {} });
    const editPhotos = editor.querySelector('[data-edit-photos]');
    fillProductPhotoList(editPhotos, p.images || []);
    editor.querySelector('[data-add-edit-photo]')?.addEventListener('click', () => addProductPhotoSlot(editPhotos));
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    editor.addEventListener('submit', async (event) => {
      event.preventDefault();
      p.name = editor.elements.name.value.trim();
      p.subtitle = editor.elements.subtitle.value.trim();
      p.description = editor.elements.description?.value.trim() || '';
      p.details = editor.elements.details?.value.trim() || '';
      p.category = editor.elements.category.value;
      p.price = parseFloat(editor.elements.price.value) || p.price;
      p.sizes = parseSizeList(editor.elements.sizes.value);
      p.colors = parseSizeList(editor.elements.colors.value);
      p.requiresSize = p.sizes.length > 0;
      p.discountPercent = parseInt(editor.elements.discountPercent.value, 10) || 0;
      p.discountActive = editor.elements.discountActive.checked && p.discountPercent > 0;
      p.freeShipping = Boolean(editor.elements.freeShipping?.checked);
      p.variantStocks = readVariantStocksFrom(editor);
      p.stock = productTotalStock(p);
      const saveBtn = editor.querySelector('button[type="submit"]');
      if (saveBtn) saveBtn.disabled = true;
      showToast('Saving…');
      const nextImages = await readProductPhotosFromList(editPhotos, p.images || []);
      if (!nextImages.length) {
        if (saveBtn) saveBtn.disabled = false;
        showToast('Keep at least one product photo.');
        return;
      }
      p.images = [];
      for (const src of nextImages) {
        p.images.push(await slimLookbookImage(src, 900, 0.58));
      }
      p.imagesComplete = true;
      await attachProductThumb(p);
      const saved = await saveProductRemote(p);
      writePdpImageCache(p.id, p.updatedAt, p.images);
      persistProductsCache();
      if (saveBtn) saveBtn.disabled = false;
      renderProducts();
      renderAdminProducts();
      showToast(saved ? 'Product saved for all customers' : 'Saved on this device. Check internet/Supabase to publish.');
    });
    editor.querySelector('.cancel-edit-btn').addEventListener('click', () => {
      slot.innerHTML = '';
      slot.classList.remove('is-open');
      block.classList.remove('is-editing');
    });
  };

  const isAdminLoggedIn = () => {
    try {
      if (localStorage.getItem(KEYS.adminSession) === '1') return true;
      if (sessionStorage.getItem(KEYS.adminSession) === '1') {
        localStorage.setItem(KEYS.adminSession, '1');
        sessionStorage.removeItem(KEYS.adminSession);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const setAdminLoggedIn = (on) => {
    try {
      if (on) localStorage.setItem(KEYS.adminSession, '1');
      else {
        localStorage.removeItem(KEYS.adminSession);
        sessionStorage.removeItem(KEYS.adminSession);
        if (orderWatchTimer) {
          clearInterval(orderWatchTimer);
          orderWatchTimer = null;
        }
      }
    } catch {
      /* ignore */
    }
  };

  const hideAdminPanel = () => {
    $('#adminPanel')?.classList.add('hidden');
    document.body.style.overflow = '';
    closeOverlay();
  };

  const openAdminPanel = () => {
    closeModal('adminLogin');
    setAdminLoggedIn(true);
    $('#adminPanel').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    $('#adminSettingsForm').instagram.value = settings.instagram;
    $('#adminSettingsForm').facebookUrl.value = settings.facebookUrl;
    if ($('#adminSettingsForm').web3formsKey) {
      $('#adminSettingsForm').web3formsKey.value = settings.web3formsKey || '';
    }
    if ($('#adminSettingsForm').shippingText) {
      $('#adminSettingsForm').shippingText.value = settings.shippingText || DEFAULT_SETTINGS.shippingText;
    }
    if ($('#adminSettingsForm').returnsText) {
      $('#adminSettingsForm').returnsText.value = settings.returnsText || DEFAULT_SETTINGS.returnsText;
    }
    const form = $('#adminSettingsForm');
    const charts = getSizeCharts();
    if (form?.chart_rings) form.chart_rings.value = charts.rings || '';
    if (form?.chart_earrings) form.chart_earrings.value = charts.earrings || '';
    if (form?.chart_bracelets) form.chart_bracelets.value = charts.bracelets || '';
    if (form?.chart_necklaces) form.chart_necklaces.value = charts.necklaces || '';
    if (form?.ourStoryTitle) form.ourStoryTitle.value = settings.ourStoryTitle || DEFAULT_SETTINGS.ourStoryTitle;
    if (form?.ourStoryBody) form.ourStoryBody.value = settings.ourStoryBody || DEFAULT_SETTINGS.ourStoryBody;
    if (form?.shippingFee) form.shippingFee.value = settings.shippingFee || 0;
    if (form?.freeShippingMin) form.freeShippingMin.value = settings.freeShippingMin || 0;
    if (form?.freeShippingAll) form.freeShippingAll.checked = Boolean(settings.freeShippingAll);
    const payForm = $('#paymentsForm');
    if (payForm?.paymongoPublicKey) {
      payForm.paymongoPublicKey.value = settings.paymongoPublicKey || '';
    }
    syncPaymentModeUi();
    switchAdminTab('products');
    startOrderWatch();
  };

  document.querySelector('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    adminTapCount++;
    clearTimeout(adminTapTimer);
    if (adminTapCount >= 3) {
      adminTapCount = 0;
      if (isAdminLoggedIn()) openAdminPanel();
      else openModal('adminLogin');
      return;
    }
    adminTapTimer = setTimeout(() => {
      if (adminTapCount === 1) {
        showHome();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      adminTapCount = 0;
    }, 450);
  });

  $('#adminLoginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = new FormData(e.target).get('password');
    if (pass === settings.adminPassword) {
      e.target.reset();
      openAdminPanel();
    } else setFormMessage($('#adminLoginMessage'), 'Incorrect password.', 'error');
  });

  $('#closeAdmin')?.addEventListener('click', hideAdminPanel);

  $('#adminLogoutBtn')?.addEventListener('click', () => {
    setAdminLoggedIn(false);
    hideAdminPanel();
    showToast('Admin logged out on this device.');
  });

  $$('.admin-tab').forEach((tab) => tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab)));

  $('#addProductPhotoBtn')?.addEventListener('click', () => addProductPhotoSlot($('#addProductPhotos')));

  $('#addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) saveBtn.disabled = true;
    showToast('Saving photos…');
    const images = await readProductPhotosFromList($('#addProductPhotos'));
    if (!images.length) {
      if (saveBtn) saveBtn.disabled = false;
      showToast('Add at least one product photo.');
      return;
    }
    const sizes = parseSizeList(form.sizes.value);
    const colors = parseSizeList(form.colors.value);
    const variantStocks = readVariantStocksFrom(form);
    const product = normalizeProduct({
      id: generateId(),
      name: form.name.value.trim(),
      subtitle: form.subtitle.value.trim(),
      description: form.description?.value.trim() || '',
      details: form.details?.value.trim() || '',
      category: form.category.value,
      price: parseFloat(form.price.value),
      sizes,
      colors,
      requiresSize: sizes.length > 0,
      discountPercent: parseInt(form.discountPercent.value, 10) || 0,
      discountActive: form.discountActive.checked && (parseInt(form.discountPercent.value, 10) || 0) > 0,
      freeShipping: Boolean(form.freeShipping?.checked),
      variantStocks,
      images
    });
    product.images = [];
    for (const src of images) {
      product.images.push(await slimLookbookImage(src, 900, 0.58));
    }
    product.imagesComplete = true;
    product.stock = productTotalStock(product);
    await attachProductThumb(product);
    products.unshift(product);
    const saved = await saveProductRemote(product);
    writePdpImageCache(product.id, product.updatedAt, product.images);
    if (saveBtn) saveBtn.disabled = false;
    form.reset();
    fillProductPhotoList($('#addProductPhotos'));
    bindSizePicker(form);
    renderProducts();
    switchAdminTab('products');
    showToast(saved ? 'Product added for all customers' : 'Added locally. Connect Supabase to publish.');
  });

  $('#addPromoBtn')?.addEventListener('click', () => {
    settings.promos.push({ code: 'NEWCODE', type: 'percent', value: 10, minOrder: 0, maxRedemptions: 50, perCustomerLimit: 1 });
    renderPromoAdminList();
  });

  $('#couponsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    settings.promos = Array.from($$('.promo-admin-item'))
      .map((el) => ({
        code: el.querySelector('.promo-code').value.trim().toUpperCase(),
        type: el.querySelector('.promo-type').value,
        value: parseFloat(el.querySelector('.promo-value').value) || 0,
        minOrder: parseFloat(el.querySelector('.promo-min').value) || 0,
        maxRedemptions: parseInt(el.querySelector('.promo-max')?.value, 10) || 0,
        perCustomerLimit: (() => {
          const raw = el.querySelector('.promo-per')?.value;
          if (raw === '' || raw == null) return 1;
          const n = parseInt(raw, 10);
          return Number.isFinite(n) ? n : 1;
        })()
      }))
      .filter((p) => p.code && p.value > 0);
    const saved = await patchStoreSettings({ promos: settings.promos || [] });
    showToast(saved ? 'Coupons live for all customers' : 'Coupons saved on this device only.');
  });

  $('#paymentsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.paymongoPublicKey) {
      settings.paymongoPublicKey = form.paymongoPublicKey.value.trim();
      localStorage.setItem('zora_paymongo_pk', settings.paymongoPublicKey);
    }
    if (form.gcash?.files?.[0]) settings.paymentQrs.GCash = await compressImage(form.gcash.files[0], 900, 0.72);
    if (form.maya?.files?.[0]) settings.paymentQrs.Maya = await compressImage(form.maya.files[0], 900, 0.72);
    if (form.bank?.files?.[0]) settings.paymentQrs['Bank Transfer'] = await compressImage(form.bank.files[0], 900, 0.72);
    paymentQrsLoaded = true;
    settings.paymentMode = form.paymentMode?.value || $('#paymentModeValue')?.value || settings.paymentMode || 'automatic';
    const saved = await patchStoreSettings({
      payment_qrs: settings.paymentQrs || DEFAULT_QRS,
      paymongo_public_key: settings.paymongoPublicKey || '',
      payment_mode: settings.paymentMode
    });
    renderPaymentPreviews();
    syncPaymentModeUi();
    showToast(saved ? 'Payment settings saved' : 'Saved on this device only.');
  });

  $('#paymentModeSwitch')?.addEventListener('click', () => {
    settings.paymentMode = isAutomaticPay() ? 'manual' : 'automatic';
    syncPaymentModeUi();
  });
  $$('.pay-mode-side').forEach((el) => {
    el.addEventListener('click', () => {
      settings.paymentMode = el.dataset.paySide;
      syncPaymentModeUi();
    });
  });

  $('#paymentsForm')?.addEventListener('change', (e) => {
    if (e.target?.name !== 'paymentMode') return;
    settings.paymentMode = e.target.value;
    syncPaymentModeUi();
  });

  $('#refreshOrdersBtn')?.addEventListener('click', () => renderAdminOrders());

  $$('[data-save-lookbook]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const group = btn.dataset.saveLookbook;
      showToast('Saving…');
      if (group === 'hero') settings.heroSlides = await slimLookbookList(settings.heroSlides, 720, 0.52);
      if (group === 'category') settings.categoryCards = await slimLookbookList(settings.categoryCards, 640, 0.58);
      if (group === 'blog') settings.blogs = await slimLookbookList(settings.blogs, 720, 0.55);
      const saved = await patchStoreSettings(lookbookPatchFields(group));
      await writeLookbookCache({
        heroSlides: settings.heroSlides,
        categoryCards: settings.categoryCards,
        blogs: settings.blogs
      });
      refreshStorefront();
      showToast(saved ? 'Saved for all customers' : 'Saved on this device only.');
    });
  });

  $('#adminSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    settings.instagram = form.instagram.value.trim().replace('@', '') || settings.instagram;
    settings.facebookUrl = form.facebookUrl.value.trim() || settings.facebookUrl;
    if (form.shippingText) settings.shippingText = form.shippingText.value.trim() || DEFAULT_SETTINGS.shippingText;
    if (form.returnsText) settings.returnsText = form.returnsText.value.trim() || DEFAULT_SETTINGS.returnsText;
    if (form.ourStoryTitle) settings.ourStoryTitle = form.ourStoryTitle.value.trim() || DEFAULT_SETTINGS.ourStoryTitle;
    if (form.ourStoryBody) settings.ourStoryBody = form.ourStoryBody.value;
    if (form.shippingFee) settings.shippingFee = Math.max(0, Number(form.shippingFee.value) || 0);
    if (form.freeShippingMin) settings.freeShippingMin = Math.max(0, Number(form.freeShippingMin.value) || 0);
    settings.freeShippingAll = Boolean(form.freeShippingAll?.checked);
    settings.sizeCharts = {
      rings: form.chart_rings?.value.trim() || DEFAULT_SETTINGS.sizeCharts.rings,
      earrings: form.chart_earrings?.value.trim() || DEFAULT_SETTINGS.sizeCharts.earrings,
      bracelets: form.chart_bracelets?.value.trim() || DEFAULT_SETTINGS.sizeCharts.bracelets,
      necklaces: form.chart_necklaces?.value.trim() || DEFAULT_SETTINGS.sizeCharts.necklaces
    };
    if (form.web3formsKey) {
      settings.web3formsKey = form.web3formsKey.value.trim();
      localStorage.setItem('zora_web3forms_key', settings.web3formsKey);
    }
    const pass = form.adminPassword.value.trim();
    const confirm = form.adminPasswordConfirm.value.trim();
    if (pass) {
      if (pass.length < 6 || pass !== confirm) {
        showToast('Password must match and be at least 6 characters.');
        return;
      }
      settings.adminPassword = pass;
    }
    const saved = await patchStoreSettings({
      instagram: settings.instagram,
      facebook: settings.facebook,
      facebook_url: settings.facebookUrl,
      admin_password: settings.adminPassword,
      web3forms_key: settings.web3formsKey || '',
      shipping_text: settings.shippingText || '',
      returns_text: settings.returnsText || '',
      size_charts: getSizeCharts(),
      our_story_title: settings.ourStoryTitle || '',
      our_story_body: settings.ourStoryBody || '',
      shipping_fee: settings.shippingFee || 0,
      free_shipping_min: settings.freeShippingMin || 0,
      free_shipping_all: Boolean(settings.freeShippingAll)
    });
    applyProductPolicies();
    form.adminPassword.value = '';
    form.adminPasswordConfirm.value = '';
    showToast(saved ? 'Settings saved' : 'Settings saved locally.');
  });

  $('#testEmailBtn')?.addEventListener('click', async () => {
    const form = $('#adminSettingsForm');
    if (form?.web3formsKey) {
      settings.web3formsKey = form.web3formsKey.value.trim();
      localStorage.setItem('zora_web3forms_key', settings.web3formsKey);
    }
    showToast('Sending test email...');
    const ok = await sendStoreEmail({
      subject: 'ZORA test email — inbox check',
      name: 'ZORA Admin',
      email: STORE_EMAIL,
      message:
        'This is a test from your ZORA shop.\n\nIf you received this, order emails are working for ' +
        STORE_EMAIL +
        '.\n\nTime: ' +
        new Date().toLocaleString(),
      extra: { payment: 'TEST', order_id: 'TEST', paid: 'n/a' }
    });
    showToast(ok ? 'Test sent — check Gmail Inbox and Spam' : 'Email helper opened — check Gmail or click Send in your mail app');
  });

  document.addEventListener('click', (e) => {
    const closeId = e.target.closest('[data-close]')?.dataset.close;
    if (closeId) closeModal(closeId);
    const filter = e.target.closest('[data-filter]')?.dataset.filter;
    if (filter && e.target.closest('a[data-filter]')) {
      e.preventDefault();
      filterProducts(filter);
      closeAllPanels();
    }
  });

  $('#addHeroSlideBtn')?.addEventListener('click', () => {
    if (!Array.isArray(settings.heroSlides)) settings.heroSlides = [];
    settings.heroSlides.push({ image: '', alt: 'New hero slide' });
    renderLookbookEditors();
    showToast('New hero slide added. Upload a photo, then tap Save hero photos.');
  });

  const notifyNewOrder = (order) => {
    const title = 'New ZORA order ' + (order.id || '');
    const body = `${order.name || ''} · ${order.phone || ''} · ${formatPrice(order.total || 0)} · ${order.payment_method || ''}`;
    if (window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        /* ignore */
      }
    }
    showToast(title + ' — ' + body);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      /* ignore */
    }
  };

  const notifyPaidOrder = (order) => {
    const title = 'Successfully paid ' + (order.id || '');
    const body = `${order.name || ''} · ${order.phone || ''} · ${formatPrice(order.total || 0)}`;
    if (window.Notification && Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        /* ignore */
      }
    }
    showToast(title + ' — ' + body);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1320;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      /* ignore */
    }
  };

  const startOrderWatch = () => {
    if (!isAdminLoggedIn()) return;
    if (orderWatchTimer) return;
    let known = {};
    try {
      known = JSON.parse(localStorage.getItem('zora_known_order_status') || '{}') || {};
    } catch {
      known = {};
    }
    let primed = Object.keys(known).length > 0;
    const check = async () => {
      try {
        const data = await supaRequest(
          '/rest/v1/orders?select=id,name,phone,total,payment_method,status,created_at&order=created_at.desc'
        );
        if (!Array.isArray(data)) return;
        data.forEach((order) => {
          const prev = known[order.id];
          if (primed && prev === undefined) notifyNewOrder(order);
          if (primed && prev !== undefined && !isPaidStatus(prev) && isPaidStatus(order.status)) {
            notifyPaidOrder(order);
            if (!$('#adminPanel')?.classList.contains('hidden')) renderAdminOrders();
          }
          known[order.id] = order.status || 'Unpaid';
        });
        primed = true;
        localStorage.setItem('zora_known_order_status', JSON.stringify(known));
        localStorage.setItem('zora_known_orders', JSON.stringify(Object.keys(known)));
        await releaseExpiredStockHolds();
      } catch {
        /* ignore */
      }
    };
    check();
    orderWatchTimer = setInterval(check, 8000);
  };

  $('#enableOrderAlertsBtn')?.addEventListener('click', async () => {
    if (!window.Notification) {
      showToast('This browser cannot show notifications. Keep Gmail on.');
      return;
    }
    const perm = await Notification.requestPermission();
    showToast(perm === 'granted' ? 'Order alerts on for this browser' : 'Alerts blocked — Gmail is still your backup');
    startOrderWatch();
  });

  $('#overlay')?.addEventListener('click', closeAllPanels);
  $('#ourStoryBtn')?.addEventListener('click', () => {
    applyProductPolicies();
    openModal('ourStoryModal');
  });

  $('#viewAllLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    filterProducts('all');
  });
  $('#catalogBack')?.addEventListener('click', () => {
    showHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $$('.catalog-cat').forEach((btn) => {
    btn.addEventListener('click', () => filterProducts(btn.dataset.filter));
  });
  window.addEventListener('hashchange', applyLocation);
  window.addEventListener('popstate', applyLocation);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#galleryLite')?.classList.contains('hidden')) {
        closeGalleryLite();
        return;
      }
      if (!$('#sizeChartModal')?.classList.contains('hidden')) {
        closeModal('sizeChartModal');
        return;
      }
      if (!$('#ourStoryModal')?.classList.contains('hidden')) {
        closeModal('ourStoryModal');
        return;
      }
      if (!$('#journalModal')?.classList.contains('hidden')) {
        closeModal('journalModal');
        return;
      }
      closeAllPanels();
      hideAdminPanel();
    }
  });

  const getVisitorId = () => {
    try {
      let id = localStorage.getItem(KEYS.visitorId);
      if (!id) {
        id = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        localStorage.setItem(KEYS.visitorId, id);
      }
      return id;
    } catch {
      return 'v' + Date.now().toString(36);
    }
  };

  const pingPresence = async () => {
    try {
      await supaRequest('/rest/v1/site_presence?on_conflict=visitor_id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify([
          {
            visitor_id: getVisitorId(),
            last_seen: new Date().toISOString(),
            account_email: currentAccount?.email || ''
          }
        ])
      });
    } catch {
      /* table may not exist until SQL is run */
    }
  };

  const startPresencePing = () => {
    if (presenceTimer) clearInterval(presenceTimer);
    presenceTimer = setTimeout(() => {
      pingPresence();
      presenceTimer = setInterval(pingPresence, 30000);
    }, 2500);
  };

  const renderLiveStats = async () => {
    const nowEl = $('#liveNowCount');
    const accEl = $('#liveAccountCount');
    const newEl = $('#liveNewCount');
    if (!nowEl) return;
    const cutoff = new Date(Date.now() - 45000).toISOString();
    try {
      const live = await supaRequest(
        `/rest/v1/site_presence?last_seen=gte.${encodeURIComponent(cutoff)}&select=visitor_id`
      );
      nowEl.textContent = String(Array.isArray(live) ? live.length : 0);
    } catch {
      nowEl.textContent = '0';
    }
    try {
      const accounts = await supaRequest('/rest/v1/accounts?select=email,created_at');
      const list = Array.isArray(accounts) ? accounts : [];
      if (accEl) accEl.textContent = String(list.length);
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const fresh = list.filter((row) => Date.parse(row.created_at || '') >= start.getTime()).length;
      if (newEl) newEl.textContent = String(fresh);
    } catch {
      if (accEl) accEl.textContent = '0';
      if (newEl) newEl.textContent = '0';
    }
  };

  const init = async () => {
    currentAccount = getSavedSession();
    try {
      if (!localStorage.getItem(KEYS.ordersReset)) {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('zora_orders_'))
          .forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem('zora_seen_orders');
        localStorage.setItem(KEYS.ordersReset, '1');
      }
    } catch {
      /* ignore */
    }
    loadCart();
    initHeader();
    initSearch();
    initProductZoom();
    updateCartUI();
    if ($('#addProductForm')) bindSizePicker($('#addProductForm'));
    fillProductPhotoList($('#addProductPhotos'));
    try {
      const lookbookCached = await readLookbookCache();
      if (applyLookbookCache(lookbookCached)) {
        renderHero();
        renderCategories();
        renderBlogs();
      }
    } catch {
      /* first visit has no cache */
    }
    const mediaPromise = loadSettingsMedia();
    try {
      const cached = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || '[]');
      if (Array.isArray(cached) && cached.length) {
        products = cached.map(normalizeProduct);
        renderProducts();
      }
    } catch {
      /* ignore */
    }
    await Promise.all([loadSettings(), loadProducts()]);
    warmProductThumbs();
    releaseExpiredStockHolds();
    setInterval(() => {
      refreshCatalogStock();
      releaseExpiredStockHolds();
    }, 15000);
    initDropdowns();
    initMobileMenu();
    renderHero();
    renderCollections();
    renderCategories();
    renderBlogs();
    renderFooter();
    startPresencePing();
    if (isAdminLoggedIn()) startOrderWatch();
    refreshAdminEntry();
    applyLocation();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
