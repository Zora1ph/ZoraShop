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
    adminSession: 'zora_admin_session'
  };

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
    promos: [{ code: 'ZORA10', type: 'percent', value: 10, minOrder: 500, maxRedemptions: 100 }],
    paymentQrs: { ...DEFAULT_QRS },
    web3formsKey: '',
    paymongoPublicKey: CONFIG.paymongoPublicKey || '',
    heroSlides: JSON.parse(JSON.stringify(CONFIG.heroSlides || [])),
    collections: JSON.parse(JSON.stringify(CONFIG.collections || [])),
    categoryCards: JSON.parse(JSON.stringify(CONFIG.categoryCards || [])),
    blogs: JSON.parse(JSON.stringify(CONFIG.blogs || []))
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

  const getEffectivePrice = (product) => {
    if (product.discountActive && product.discountPercent > 0) {
      return product.price * (1 - product.discountPercent / 100);
    }
    return Number(product.price) || 0;
  };

  const itemQty = (item) => {
    const n = Number(item && (item.quantity ?? item.qty));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const cartSubtotal = () =>
    cart.reduce((sum, item) => sum + (Number(item.price) || 0) * itemQty(item), 0);

  const promoDiscount = (subtotal) => {
    if (!appliedPromo) return 0;
    if (subtotal < (Number(appliedPromo.minOrder) || 0)) return 0;
    if (appliedPromo.type === 'fixed') return Math.min(Number(appliedPromo.value) || 0, subtotal);
    return subtotal * ((Number(appliedPromo.value) || 0) / 100);
  };

  const cartTotal = () => Math.max(0, cartSubtotal() - promoDiscount(cartSubtotal()));

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
    const res = await fetch(`${cfg.supabaseUrl}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`
      },
      body: JSON.stringify(body)
    });
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
      const rows = await supaRequest(`/rest/v1/accounts?email=eq.${encodeURIComponent(email)}&select=*`);
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
            address: account.address || ''
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
        ...item,
        price: Number(item.price) || 0,
        quantity: itemQty(item) || 1
      }));
    saveCart();
  };

  const saveCart = () => {
    localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
    updateCartUI();
  };

  const loadOrdersForEmail = async (email) => {
    orders = [];
    if (!email) return;
    try {
      orders = JSON.parse(localStorage.getItem(`zora_orders_${email}`) || '[]');
    } catch {
      orders = [];
    }
    try {
      const rows = await supaRequest(
        `/rest/v1/orders?user_email=eq.${encodeURIComponent(email)}&order=created_at.desc`
      );
      if (Array.isArray(rows) && rows.length) {
        const byId = new Map(orders.map((o) => [o.id, o]));
        rows.forEach((row) => byId.set(row.id, { ...row, ...byId.get(row.id) }));
        orders = Array.from(byId.values());
      }
    } catch {
      /* local fallback */
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
    existing = [order, ...existing.filter((o) => o.id !== order.id)];
    localStorage.setItem(key, JSON.stringify(existing));
    orders = existing;
  };

  /* ---------- Settings / products ---------- */
  const normalizeProduct = (p) => ({
    id: String(p.id),
    name: p.name,
    subtitle: p.subtitle || '',
    category: p.category || 'rings',
    price: Number(p.price) || 0,
    stock: Number(p.stock) || 0,
    requiresSize: Boolean(p.requiresSize ?? (p.sizes && p.sizes.length)),
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    colors: Array.isArray(p.colors) ? p.colors : [],
    discountActive: Boolean(p.discountActive),
    discountPercent: Number(p.discountPercent) || 0,
    images: Array.isArray(p.images) ? p.images.filter(Boolean) : []
  });

  const loadSettings = async () => {
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
    try {
      const data = await supaRequest('/rest/v1/store_settings?id=eq.store&select=*');
      const row = Array.isArray(data) && data[0];
      if (row) {
        settings.instagram = row.instagram || settings.instagram;
        settings.facebook = row.facebook || settings.facebook;
        settings.facebookUrl = row.facebook_url || settings.facebookUrl;
        settings.adminPassword = row.admin_password || settings.adminPassword;
        if (Array.isArray(row.promos)) settings.promos = row.promos;
        if (row.payment_qrs && typeof row.payment_qrs === 'object') {
          settings.paymentQrs = { ...DEFAULT_QRS, ...row.payment_qrs };
        }
        if (Array.isArray(row.hero_slides) && row.hero_slides.length) settings.heroSlides = row.hero_slides;
        if (Array.isArray(row.collections) && row.collections.length) settings.collections = row.collections;
        if (Array.isArray(row.category_cards) && row.category_cards.length) settings.categoryCards = row.category_cards;
        if (Array.isArray(row.blogs) && row.blogs.length) settings.blogs = row.blogs;
        if (row.paymongo_public_key) settings.paymongoPublicKey = row.paymongo_public_key;
        if (row.web3forms_key) settings.web3formsKey = row.web3forms_key;
      } else {
        const res = await fetch('store-settings.json?t=' + Date.now());
        if (res.ok) {
          const published = await res.json();
          if (Array.isArray(published.promos)) settings.promos = published.promos;
        }
      }
    } catch {
      /* offline */
    }
    try {
      localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  };

  const saveSettingsRemote = async () => {
    localStorage.setItem(KEYS.settings, JSON.stringify(settings));
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
      blogs: settings.blogs || []
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
        await supaRequest('/rest/v1/store_settings?on_conflict=id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify([fallback])
        });
        return true;
      } catch {
        return false;
      }
    }
  };

  const loadProducts = async () => {
    try {
      const data = await supaRequest('/rest/v1/products?select=*&order=created_at.desc');
      if (Array.isArray(data) && data.length) {
        products = data.map((row) =>
          normalizeProduct({
            id: row.id,
            name: row.name,
            subtitle: row.subtitle,
            category: row.category,
            price: row.price,
            stock: row.stock,
            requiresSize: row.requires_size,
            sizes: row.sizes,
            colors: row.colors,
            discountActive: row.discount_active,
            discountPercent: row.discount_percent,
            images: row.images
          })
        );
        renderProducts();
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

  const syncProducts = async () => {
    try {
      await supaRequest('/rest/v1/products?on_conflict=id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(
          products.map((product) => ({
            id: product.id,
            name: product.name,
            subtitle: product.subtitle || '',
            category: product.category || 'rings',
            price: Number(product.price) || 0,
            stock: Number(product.stock) || 0,
            requires_size: Boolean(product.requiresSize),
            sizes: product.sizes || [],
            colors: product.colors || [],
            discount_active: Boolean(product.discountActive),
            discount_percent: Number(product.discountPercent) || 0,
            images: product.images || [],
            updated_at: new Date().toISOString()
          }))
        )
      });
      return true;
    } catch {
      try {
        await supaRequest('/rest/v1/products?on_conflict=id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(
            products.map((product) => ({
              id: product.id,
              name: product.name,
              subtitle: product.subtitle || '',
              category: product.category || 'rings',
              price: Number(product.price) || 0,
              stock: Number(product.stock) || 0,
              requires_size: Boolean(product.requiresSize),
              sizes: product.sizes || [],
              discount_active: Boolean(product.discountActive),
              discount_percent: Number(product.discountPercent) || 0,
              images: product.images || []
            }))
          )
        });
        return true;
      } catch {
        return false;
      }
    }
  };

  const compressImage = (file, maxSize = 900) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        img.onerror = () => reject(new Error('Invalid image'));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

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
    if ($$('.modal:not(.hidden)').length === 0 && $('#adminPanel')?.classList.contains('hidden')) {
      closeOverlay();
      document.body.style.overflow = '';
    }
  };

  const closeAllPanels = () => {
    $$('.modal, .drawer, .search-panel, .mobile-menu').forEach((el) => el.classList.add('hidden'));
    if ($('#adminPanel')?.classList.contains('hidden')) {
      closeOverlay();
      document.body.style.overflow = '';
    }
  };

  const initHeader = () => {
    const header = $('#siteHeader');
    const onScroll = () => {
      const scrolled = window.scrollY > 80;
      header?.classList.toggle('site-header--solid', scrolled);
      header?.classList.toggle('site-header--light', !scrolled);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  const initDropdowns = () => {
    const shopDropdown = $('#shopDropdown');
    if (shopDropdown && CONFIG.shopMenu) {
      shopDropdown.innerHTML = CONFIG.shopMenu
        .map(
          (group) => `
        <div class="dropdown-group">
          <p class="dropdown-label">${group.label}</p>
          ${group.links.map((link) => `<a href="${link.filter ? '#new-arrivals' : link.href}" data-filter="${link.filter || ''}">${link.label}</a>`).join('')}
        </div>`
        )
        .join('');
    }

    const collectionsDropdown = $('#collectionsDropdown');
    const collections = settings.collections?.length ? settings.collections : CONFIG.collections || [];
    if (collectionsDropdown && collections.length) {
      collectionsDropdown.innerHTML = collections
        .map((c) => `<a href="#new-arrivals" data-filter="${c.filter || c.category || ''}">${escapeHtml((c.title || c.name || '').replace(/"/g, ''))}</a>`)
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
      .map((l) => `<a href="${l.filter ? '#new-arrivals' : l.href}" data-filter="${l.filter || ''}">${l.label}</a>`)
      .join('');
    const collectionLinks = (settings.collections?.length ? settings.collections : CONFIG.collections || [])
      .map((c) => `<a href="#new-arrivals" data-filter="${c.filter || c.category || ''}">${c.title || c.name}</a>`)
      .join('');
    nav.innerHTML = `
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
      refreshAccountView();
      openModal('accountModal');
    });
  };

  const getHeroSlides = () =>
    settings.heroSlides?.length ? settings.heroSlides : CONFIG.heroSlides || [];

  const renderHero = () => {
    const slider = $('#heroSlider');
    const dots = $('#heroDots');
    const slides = getHeroSlides();
    if (!slider || !slides.length) return;
    slider.innerHTML = slides
      .map(
        (s, i) => `
      <div class="hero-slide${i === 0 ? ' active' : ''}" data-index="${i}">
        <img src="${s.image || s.src || ''}" alt="${s.alt || s.title || ''}" loading="${i === 0 ? 'eager' : 'lazy'}" />
      </div>`
      )
      .join('');
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
    const price = getEffectivePrice(product);
    const hasDiscount = product.discountActive && product.discountPercent > 0;
    const colors = product.colors || [];
    return `
      <article class="product-card" data-id="${product.id}">
        <div class="product-card-media">
          ${hasDiscount ? `<span class="sale-badge">-${product.discountPercent}%</span>` : ''}
          <a href="#" class="product-link" data-id="${product.id}">
            <img src="${product.images[0] || ''}" alt="${escapeHtml(product.name)}" loading="lazy" />
          </a>
          <div class="product-card-actions">
            <button class="btn btn-primary btn-full choose-btn" data-id="${product.id}">Choose options</button>
          </div>
        </div>
        <a href="#" class="product-card-name product-link" data-id="${product.id}">${escapeHtml(product.name)}</a>
        <div class="product-card-price">
          ${hasDiscount ? `<span class="original">${formatPrice(product.price)}</span>` : ''}
          <span>${formatPrice(price)}</span>
        </div>
        ${
          colors.length
            ? `<div class="product-swatches">${colors.map((c, i) => `<span class="swatch${i === 0 ? ' active' : ''}" data-color="${escapeHtml(c)}" title="${escapeHtml(c)}"></span>`).join('')}</div>`
            : ''
        }
      </article>`;
  };

  const renderProducts = () => {
    const grid = $('#newArrivalsGrid');
    if (!grid) return;
    const filtered =
      productFilter && productFilter !== 'all' ? products.filter((p) => p.category === productFilter) : products;
    const shown = !showAllProducts && productFilter === 'all' ? filtered.slice(0, 4) : filtered;
    if (!shown.length) {
      grid.innerHTML = '<p class="empty-state">No products in this category yet.</p>';
      return;
    }
    grid.innerHTML = shown.map(productCardHTML).join('');
    bindProductEvents(grid);
  };

  const bindProductEvents = (container) => {
    container.querySelectorAll('.choose-btn, .product-link').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openProductModal(el.dataset.id);
      });
    });
    container.querySelectorAll('.product-card').forEach((card) => {
      card.querySelectorAll('.swatch').forEach((swatch) => {
        swatch.addEventListener('click', (e) => {
          e.stopPropagation();
          card.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
        });
      });
    });
  };

  const filterProducts = (filter) => {
    productFilter = filter || 'all';
    if (productFilter !== 'all') showAllProducts = true;
    const titles = {
      all: 'NEW ARRIVALS',
      rings: 'RINGS',
      earrings: 'EARRINGS',
      bracelets: 'BRACELETS',
      necklaces: 'NECKLACES'
    };
    const heading = $('#productHeading');
    if (heading) heading.textContent = titles[productFilter] || 'PRODUCTS';
    renderProducts();
    const target = $('#new-arrivals');
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  };

  const openProductModal = (id) => {
    activeProduct = products.find((p) => p.id === id);
    if (!activeProduct) return;
    quantity = 1;
    selectedColor = activeProduct.colors?.[0] || null;
    selectedSize = activeProduct.sizes?.[0] || null;
    $('#modalProductImage').src = activeProduct.images[0] || '';
    $('#modalProductImage').alt = activeProduct.name;
    $('#modalProductCategory').textContent = activeProduct.category;
    $('#modalProductName').textContent = activeProduct.name;
    $('#modalProductSubtitle').textContent = activeProduct.subtitle || '';
    $('#modalProductPrice').textContent = formatPrice(getEffectivePrice(activeProduct));
    $('#qtyValue').textContent = '1';
    $('#stockNote').textContent = activeProduct.stock > 0 ? `${activeProduct.stock} in stock` : 'Out of stock';
    renderProductGallery(activeProduct.images);
    $('#productZoom')?.classList.remove('is-zoomed');

    const colorGroup = $('#colorGroup');
    const colorSwatches = $('#colorSwatches');
    if (activeProduct.colors?.length) {
      colorGroup.classList.remove('hidden');
      colorSwatches.innerHTML = activeProduct.colors
        .map((c) => `<button type="button" class="swatch${c === selectedColor ? ' active' : ''}" data-color="${escapeHtml(c)}" title="${escapeHtml(c)}"></button>`)
        .join('');
      colorSwatches.querySelectorAll('.swatch').forEach((s) => {
        s.addEventListener('click', () => {
          selectedColor = s.dataset.color;
          colorSwatches.querySelectorAll('.swatch').forEach((x) => x.classList.remove('active'));
          s.classList.add('active');
        });
      });
    } else colorGroup.classList.add('hidden');

    const sizeGroup = $('#sizeGroup');
    const sizeOptions = $('#sizeOptions');
    if (activeProduct.requiresSize && activeProduct.sizes?.length) {
      sizeGroup.classList.remove('hidden');
      sizeOptions.innerHTML = activeProduct.sizes
        .map((s) => `<button type="button" class="size-btn${s === selectedSize ? ' active' : ''}" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`)
        .join('');
      sizeOptions.querySelectorAll('.size-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectedSize = btn.dataset.size;
          sizeOptions.querySelectorAll('.size-btn').forEach((x) => x.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    } else sizeGroup.classList.add('hidden');

    $('#addToCartBtn').disabled = activeProduct.stock <= 0;
    openModal('productModal');
  };

  const setGalleryImage = (index) => {
    if (!galleryImages.length) return;
    galleryIndex = ((index % galleryImages.length) + galleryImages.length) % galleryImages.length;
    const img = $('#modalProductImage');
    if (img) {
      img.src = galleryImages[galleryIndex];
      img.alt = `${activeProduct?.name || 'Product'} view ${galleryIndex + 1}`;
    }
    $$('.product-thumb').forEach((thumb, i) => thumb.classList.toggle('active', i === galleryIndex));
  };

  const renderProductGallery = (images) => {
    galleryImages = (Array.isArray(images) ? images : []).filter(Boolean).slice(0, 4);
    const thumbs = $('#productThumbs');
    if (!thumbs) return;
    if (!galleryImages.length) {
      thumbs.innerHTML = '';
      return;
    }
    thumbs.innerHTML = galleryImages
      .map(
        (src, i) => `
      <button type="button" class="product-thumb${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Photo ${i + 1}">
        <img src="${src}" alt="Photo ${i + 1}" />
      </button>`
      )
      .join('');
    thumbs.querySelectorAll('.product-thumb').forEach((btn) => {
      const index = Number(btn.dataset.index);
      btn.addEventListener('mouseenter', () => setGalleryImage(index));
      btn.addEventListener('focus', () => setGalleryImage(index));
      btn.addEventListener('click', () => setGalleryImage(index));
    });
    setGalleryImage(0);
  };

  const initProductZoom = () => {
    const zoom = $('#productZoom');
    const img = $('#modalProductImage');
    const hint = $('#zoomHint');
    if (!zoom || !img) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (hint) hint.textContent = canHover.matches ? 'Hover to zoom' : 'Tap image to zoom';

    zoom.addEventListener('mousemove', (e) => {
      if (!canHover.matches) return;
      const rect = zoom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    });
    zoom.addEventListener('mouseenter', () => {
      if (canHover.matches) zoom.classList.add('is-zoomed');
    });
    zoom.addEventListener('mouseleave', () => {
      zoom.classList.remove('is-zoomed');
      img.style.transformOrigin = 'center center';
    });
    zoom.addEventListener('click', () => {
      if (canHover.matches) return;
      zoom.classList.toggle('is-zoomed');
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

  $('#qtyMinus')?.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      $('#qtyValue').textContent = String(quantity);
    }
  });

  $('#qtyPlus')?.addEventListener('click', () => {
    if (activeProduct && quantity < activeProduct.stock) {
      quantity++;
      $('#qtyValue').textContent = String(quantity);
    }
  });

  $('#addToCartBtn')?.addEventListener('click', () => {
    if (!activeProduct) return;
    if (activeProduct.requiresSize && !selectedSize) {
      showToast('Please select a size');
      return;
    }
    const existing = cart.find(
      (item) => item.id === activeProduct.id && item.color === selectedColor && item.size === selectedSize
    );
    if (existing) existing.quantity = Math.min(itemQty(existing) + quantity, activeProduct.stock);
    else {
      cart.push({
        id: activeProduct.id,
        name: activeProduct.name,
        price: getEffectivePrice(activeProduct),
        image: activeProduct.images[0],
        color: selectedColor,
        size: selectedSize,
        quantity: Number(quantity) || 1
      });
    }
    saveCart();
    closeModal('productModal');
    showToast('Added to cart');
  });

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
      .map(
        (item, i) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${escapeHtml(item.name)}" />
        <div class="cart-item-info">
          <h4>${escapeHtml(item.name)}</h4>
          <p>${[item.color, item.size].filter(Boolean).join(' / ') || ''} × ${itemQty(item)}</p>
        </div>
        <span class="cart-item-price">${formatPrice((Number(item.price) || 0) * itemQty(item))}</span>
        <button class="cart-item-remove" data-index="${i}">Remove</button>
      </div>`
      )
      .join('');
    if (subtotalEl) subtotalEl.textContent = formatPrice(cartSubtotal());
    itemsEl.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.index), 1);
        saveCart();
      });
    });
  };

  $('#cartBtn')?.addEventListener('click', () => {
    $('#cartDrawer')?.classList.remove('hidden');
    openOverlay();
  });
  $('#closeCart')?.addEventListener('click', closeAllPanels);

  const updateCheckoutTotals = () => {
    const subtotal = cartSubtotal();
    const discount = promoDiscount(subtotal);
    $('#checkoutSubtotal').textContent = formatPrice(subtotal);
    const row = $('#checkoutDiscountRow');
    if (discount > 0) {
      row.classList.remove('hidden');
      $('#checkoutDiscount').textContent = '−' + formatPrice(discount);
    } else row.classList.add('hidden');
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

  $('#checkoutBtn')?.addEventListener('click', () => {
    if (cart.length === 0) return;
    if (!currentAccount) {
      closeAllPanels();
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
    updateCheckoutTotals();
    openModal('checkoutModal');
  });

  const findPromo = (code) =>
    (settings.promos || []).find((p) => p.code && p.code.toUpperCase() === code.toUpperCase());

  $('#applyPromoBtn')?.addEventListener('click', () => {
    const code = $('#promoInput').value.trim();
    const promo = findPromo(code);
    if (!promo) {
      appliedPromo = null;
      setFormMessage($('#promoMessage'), 'Invalid promo code.', 'error');
    } else if (cartSubtotal() < (Number(promo.minOrder) || 0)) {
      appliedPromo = null;
      setFormMessage($('#promoMessage'), `Minimum order is ${formatPrice(promo.minOrder)}.`, 'error');
    } else {
      appliedPromo = promo;
      setFormMessage($('#promoMessage'), `Promo ${promo.code} applied.`, 'success');
    }
    updateCheckoutTotals();
  });

  const buildOrderMessage = (order, paidStatus) => {
    const lines = [
      'ZORA ORDER',
      '━━━━━━━━━━━━━━━━━━━━',
      `Order: ${order.id}`,
      `Status: ${paidStatus}`,
      `Payment: ${order.payment_method || 'QRPh'}`,
      `Total: ${formatPrice(order.total)}`
    ];
    if (order.paymongo_intent_id) lines.push(`PayMongo intent: ${order.paymongo_intent_id}`);
    lines.push('');
    lines.push('CUSTOMER:');
    lines.push(`  Full name: ${order.name}`);
    lines.push(`  Phone / number: ${order.phone}`);
    lines.push(`  Email: ${order.user_email}`);
    lines.push(`  Full address: ${order.address}`);
    lines.push('');
    lines.push('ITEMS:');
    (order.items || []).forEach((item) => {
      lines.push(`  • ${item.name}${item.size ? ' (' + item.size + ')' : ''} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`);
    });
    if (/paid/i.test(String(paidStatus)) && !/unpaid/i.test(String(paidStatus))) {
      lines.push('');
      lines.push('Payment confirmed by PayMongo QRPh.');
    }
    return lines.join('\n');
  };

  const markOrderPaidAuto = async (order, source) => {
    if (!order || String(order.status).toLowerCase() === 'paid') return;
    order.status = 'Paid';
    order.payment_method = 'QRPh';
    storeLocalOrder(order);
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Paid',
          payment_method: 'QRPh',
          notes: `promo=${order.promo || ''};paymongo=paid;source=${source || 'poll'}`
        })
      });
    } catch {
      /* ignore */
    }
    await sendStoreEmail({
      subject: `Zora PAID ${order.id} — ${order.name} / ${order.phone}`,
      name: order.name,
      email: order.user_email,
      message: buildOrderMessage(order, 'PAID — QRPh auto-confirmed'),
      extra: { payment: 'QRPh', order_id: order.id, paid: 'yes' }
    });
    const waitEl = $('#paymentWaitStatus');
    if (waitEl) {
      waitEl.textContent = 'Payment received. Order marked Paid. Email sent to the store.';
      waitEl.classList.add('is-paid');
    }
    setFormMessage($('#paymentMessage'), 'Payment confirmed. You can close this window.', 'success');
    showToast('Payment received — Paid email sent');
    renderAccountDetails();
  };

  const pollPaymongoStatus = async (order) => {
    if (!order?.paymongo_intent_id || !order?.paymongo_client_key) return;
    const pk = getPaymongoPublicKey();
    if (!pk || paymentPollBusy) return;
    paymentPollBusy = true;
    try {
      const url =
        `https://api.paymongo.com/v1/payment_intents/${encodeURIComponent(order.paymongo_intent_id)}` +
        `?client_key=${encodeURIComponent(order.paymongo_client_key)}`;
      const res = await fetch(url, {
        headers: { Authorization: 'Basic ' + btoa(pk + ':') }
      });
      const data = await res.json().catch(() => ({}));
      const status = data?.data?.attributes?.status;
      const waitEl = $('#paymentWaitStatus');
      if (waitEl && status) waitEl.textContent = `Waiting for payment… (${status})`;
      if (status === 'succeeded') {
        stopPaymentPoll();
        await markOrderPaidAuto(order, 'poll');
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

  const showPaymentModal = async (order) => {
    stopPaymentPoll();
    $('#paymentInstructions').textContent =
      `Scan this QRPh code with GCash, Maya, or any bank app. Exact amount: ${formatPrice(order.total)}. Stay on this page — when payment succeeds, Paid is automatic.`;
    $('#paymentDetails').innerHTML = '<p class="payment-note">Creating secure QRPh…</p>';
    const waitEl = $('#paymentWaitStatus');
    if (waitEl) {
      waitEl.textContent = 'Creating QR…';
      waitEl.classList.remove('is-paid', 'hidden');
    }
    setFormMessage($('#paymentMessage'), '', '');
    openModal('paymentModal');

    try {
      const created = await invokeEdge('create-qrph-payment', {
        orderId: order.id,
        amount: order.total,
        description: `ZORA ${order.id}`,
        name: order.name,
        email: order.user_email,
        phone: order.phone
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
            notes: `promo=${order.promo || ''};paymongo_intent=${order.paymongo_intent_id}`
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
      $('#paymentDetails').innerHTML = `
        <div class="order-info">
          <p><strong>Order</strong> ${escapeHtml(order.id)}</p>
          <p><strong>Total</strong> ${formatPrice(order.total)}</p>
          <p><strong>Name</strong> ${escapeHtml(order.name || '')}</p>
          <p><strong>Phone</strong> ${escapeHtml(order.phone || '')}</p>
        </div>
        <img class="payment-qr" src="${imgSrc}" alt="QRPh payment code" />
        <p class="payment-note">Open GCash / Maya / your bank app → Scan QR → Pay. Do not close until it says Payment received.</p>
      `;
      if (waitEl) waitEl.textContent = 'Waiting for payment… scan the QR now';
      startPaymentPoll(order);
    } catch (err) {
      $('#paymentDetails').innerHTML = `
        <p class="payment-note">Could not create QRPh yet.</p>
        <p class="form-message error">${escapeHtml(err.message || 'PayMongo setup incomplete')}</p>
        <p class="admin-hint">Admin → Payments: add PayMongo public key, set secret in Supabase, deploy create-qrph-payment.</p>
      `;
      if (waitEl) waitEl.textContent = 'QRPh not ready — finish PayMongo setup in Admin → Payments';
      setFormMessage($('#paymentMessage'), err.message || 'PayMongo setup incomplete', 'error');
    }
  };

  $('#checkoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    data.payment = data.payment || 'QRPh';
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

    const order = {
      id: 'ORD-' + Date.now(),
      items: cart.map((item) => ({ ...item })),
      total: cartTotal(),
      payment_method: 'QRPh',
      status: 'Unpaid',
      name: data.name,
      phone: data.phone,
      address: data.address,
      user_email: (data.email || currentAccount?.email || '').toLowerCase(),
      promo: appliedPromo?.code || '',
      created_at: new Date().toISOString()
    };

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
          notes: `promo=${order.promo || ''}`
        }])
      });
    } catch {
      /* ignore */
    }

    await sendStoreEmail({
      subject: `New Zora order ${order.id} — waiting QRPh — ${order.name} / ${order.phone}`,
      name: order.name,
      email: order.user_email,
      message: buildOrderMessage(order, 'UNPAID — waiting for QRPh payment'),
      extra: { payment: 'QRPh', order_id: order.id, paid: 'no' }
    });

    cart = [];
    appliedPromo = null;
    saveCart();
    form.reset();
    const qrphRadio = form.querySelector('input[name="payment"][value="QRPh"]');
    if (qrphRadio) qrphRadio.checked = true;
    closeModal('checkoutModal');
    await showPaymentModal(order);
    showToast('Scan the QRPh code to pay');
    btn.disabled = false;
    btn.textContent = 'Place Order';
  });

  const patchOrderRemote = async (order) => {
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          notes: `promo=${order.promo || ''}`
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
          (p.subtitle || '').toLowerCase().includes(query)
      );
      if (!matches.length) {
        results.innerHTML = '<p class="empty-state">No products found</p>';
        return;
      }
      results.innerHTML = matches
        .map(
          (p) => `
        <div class="search-result" data-id="${p.id}">
          <img src="${p.images[0]}" alt="${escapeHtml(p.name)}" />
          <div>
            <h4>${escapeHtml(p.name)}</h4>
            <p>${formatPrice(getEffectivePrice(p))}</p>
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
  const renderAccountDetails = () => {
    if (!currentAccount) return;
    $('#accountWelcome').textContent = `Welcome back, ${currentAccount.name || currentAccount.email}`;
    $('#accountEmail').textContent = currentAccount.email;
    $('#accountOrderCount').textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
    const box = $('#accountOrders');
    if (!orders.length) {
      box.innerHTML = '<p class="empty-state">No orders yet.</p>';
      return;
    }
    box.innerHTML = orders
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        return `
        <div class="order-card">
          <h4>${escapeHtml(order.id)}</h4>
          <p>${escapeHtml(order.status || 'Pending')} · ${escapeHtml(order.payment_method || '')}</p>
          <p>${formatPrice(order.total || 0)}</p>
          <ul>${items.map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity || item.qty || 1}</li>`).join('')}</ul>
        </div>`;
      })
      .join('');
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

  $('#accountBtn')?.addEventListener('click', () => {
    setFormMessage($('#accountMessage'), '', '');
    refreshAccountView();
    openModal('accountModal');
  });

  $$('[data-account-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('[data-account-tab]').forEach((b) => b.classList.toggle('active', b === btn));
      const tab = btn.dataset.accountTab;
      $('#loginForm').classList.toggle('hidden', tab !== 'login');
      $('#registerForm').classList.toggle('hidden', tab !== 'register');
      $('#accountTitle').textContent = tab === 'register' ? 'Create account' : 'Sign in';
    });
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
    const collections = settings.collections?.length ? settings.collections : CONFIG.collections || [];
    const campaignImg = $('#campaignImage');
    const campaignPhoto = $('#campaignPhoto');
    const hero = getHeroSlides()[0];
    const first = collections[0];
    if (campaignImg) {
      campaignImg.src = first?.image || hero?.image || '';
      campaignImg.alt = first?.title || first?.name || 'ZORA campaign';
    }
    if (campaignPhoto && !campaignPhoto.dataset.bound) {
      campaignPhoto.dataset.bound = '1';
      campaignPhoto.addEventListener('click', (e) => {
        e.preventDefault();
        filterProducts(first?.filter || first?.category || 'all');
      });
    }

    const banners = $('#collectionBanners');
    if (!banners || !collections.length) return;
    banners.innerHTML = collections
      .map(
        (c) => `
      <a href="#new-arrivals" class="collection-banner" data-filter="${c.filter || c.category || 'all'}">
        <img src="${c.image}" alt="${escapeHtml(c.title || c.name || '')}" loading="lazy" />
        <div class="collection-banner-content">
          <p class="collection-banner-label">${escapeHtml(c.label || 'COLLECTION')}</p>
          <h3 class="collection-banner-title">${escapeHtml(c.title || c.name || '')}</h3>
          <span class="btn">View Collection</span>
        </div>
      </a>`
      )
      .join('');
    banners.querySelectorAll('.collection-banner').forEach((banner) => {
      banner.addEventListener('click', (e) => {
        e.preventDefault();
        filterProducts(banner.dataset.filter);
      });
    });
  };

  const renderCategories = () => {
    const grid = $('#categoryGrid');
    const cards = settings.categoryCards?.length ? settings.categoryCards : CONFIG.categoryCards || [];
    if (!grid || !cards.length) return;
    grid.innerHTML = cards
      .map(
        (c) => `
      <button type="button" class="category-card" data-filter="${c.filter}">
        <img src="${c.image}" alt="${escapeHtml(c.label)}" loading="lazy" />
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
        (b) => `
      <article class="blog-card">
        <div class="blog-card-image">
          <img src="${b.image}" alt="${escapeHtml(b.title)}" loading="lazy" />
        </div>
        <h3>${escapeHtml(b.title)}</h3>
        <p>${escapeHtml(b.excerpt || '')}</p>
        <span class="read-more">Read more</span>
      </article>`
      )
      .join('');
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
    if (tab === 'coupons') renderPromoAdminList();
    if (tab === 'payments') renderPaymentPreviews();
    if (tab === 'lookbook') renderLookbookEditors();
    if (tab === 'orders') renderAdminOrders();
  };

  const refreshStorefront = () => {
    renderHero();
    renderCollections();
    renderCategories();
    renderBlogs();
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
      return `
      <div class="lookbook-card" data-group="${group}" data-index="${index}">
        <img src="${item.image || item.src || ''}" alt="" />
        <label>Caption<input class="lookbook-text" data-field="alt" data-group="${group}" data-index="${index}" value="${escapeHtml(item.alt || item.title || '')}" /></label>
        <label>Photo<input type="file" accept="image/*" class="lookbook-file" data-group="${group}" data-index="${index}" /></label>
      </div>`;
    }
    return `
      <div class="lookbook-card" data-group="${group}" data-index="${index}">
        <img src="${item.image || ''}" alt="" />
        <label>Title<input class="lookbook-text" data-field="title" data-group="${group}" data-index="${index}" value="${escapeHtml(item.title || '')}" /></label>
        <label>Text<textarea class="lookbook-text" data-field="excerpt" data-group="${group}" data-index="${index}" rows="3">${escapeHtml(item.excerpt || '')}</textarea></label>
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
        const list = lookbookList(input.dataset.group);
        const item = list?.[Number(input.dataset.index)];
        if (!file || !item) return;
        item.image = await compressImage(file, 1200);
        const preview = input.closest('.lookbook-card')?.querySelector('img');
        if (preview) preview.src = item.image;
      });
    });
  };

  const renderLookbookEditors = () => {
    const categoryBox = $('#categoryPhotoEditor');
    const collectionBox = $('#collectionPhotoEditor');
    const heroBox = $('#heroPhotoEditor');
    const blogBox = $('#blogPhotoEditor');
    if (categoryBox) {
      categoryBox.innerHTML = (settings.categoryCards || []).map((item, i) => lookbookCardHTML(item, i, 'category')).join('');
      bindLookbookEditors(categoryBox);
    }
    if (collectionBox) {
      collectionBox.innerHTML = (settings.collections || []).map((item, i) => lookbookCardHTML(item, i, 'collection')).join('');
      bindLookbookEditors(collectionBox);
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

  const parseOrderNotes = (notes) => {
    const out = { payment_ref: '', claimed_ref: '', promo: '' };
    String(notes || '').split(';').forEach((part) => {
      const [k, ...rest] = part.split('=');
      if (!k) return;
      out[k.trim()] = rest.join('=').trim();
    });
    return out;
  };

  const setAdminOrderStatus = async (orderId, status) => {
    let order = null;
    try {
      const rows = await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`);
      order = Array.isArray(rows) && rows[0] ? rows[0] : null;
    } catch {
      order = null;
    }
    if (!order) {
      showToast('Could not load that order.');
      return;
    }
    const meta = parseOrderNotes(order.notes);
    order.status = status;
    order.promo = meta.promo;
    order.user_email = order.user_email || '';
    try {
      await supaRequest(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: `promo=${meta.promo || ''}`
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
      const data = await supaRequest('/rest/v1/orders?select=*&order=created_at.desc');
      if (Array.isArray(data)) rows = data;
    } catch {
      rows = [];
    }
    if (!rows.length) {
      list.innerHTML = '<p class="empty-state">No orders yet. Place a test checkout, then tap Refresh orders.</p>';
      return;
    }
    list.innerHTML = rows
      .map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        return `
        <div class="order-card" data-order-id="${escapeHtml(order.id)}">
          <h4>${escapeHtml(order.id)}</h4>
          <p><strong>Status:</strong> ${escapeHtml(order.status || 'Unpaid')}</p>
          <p>${escapeHtml(order.payment_method || '')} · ${formatPrice(order.total || 0)}</p>
          <div class="payment-identity">
            <p class="payment-identity-title">Identify this buyer</p>
            <p><strong>Full name</strong><span>${escapeHtml(order.name || '')}</span></p>
            <p><strong>Phone / number</strong><span>${escapeHtml(order.phone || '')}</span></p>
            <p><strong>Full address</strong><span>${escapeHtml(order.address || '')}</span></p>
            <p><strong>Email</strong><span>${escapeHtml(order.user_email || '')}</span></p>
          </div>
          <ul>${items.map((item) => `<li>${escapeHtml(item.name || '')} × ${item.quantity || item.qty || 1}</li>`).join('')}</ul>
          <div class="admin-order-actions">
            <button type="button" class="btn btn-primary mark-paid-btn" data-id="${escapeHtml(order.id)}">Mark Paid (verified)</button>
            <button type="button" class="btn btn-outline-dark mark-unpaid-btn" data-id="${escapeHtml(order.id)}">Keep Unpaid</button>
          </div>
          <p class="admin-hint">In your app, match the amount with this name / phone, then Mark Paid.</p>
        </div>`;
      })
      .join('');
    list.querySelectorAll('.mark-paid-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAdminOrderStatus(btn.dataset.id, 'Paid'));
    });
    list.querySelectorAll('.mark-unpaid-btn').forEach((btn) => {
      btn.addEventListener('click', () => setAdminOrderStatus(btn.dataset.id, 'Unpaid'));
    });
  };

  const renderPaymentPreviews = () => {
    if ($('#previewGcash')) $('#previewGcash').src = settings.paymentQrs.GCash || DEFAULT_QRS.GCash;
    if ($('#previewMaya')) $('#previewMaya').src = settings.paymentQrs.Maya || DEFAULT_QRS.Maya;
    if ($('#previewBank')) $('#previewBank').src = settings.paymentQrs['Bank Transfer'] || DEFAULT_QRS['Bank Transfer'];
  };

  const renderPromoAdminList = () => {
    const container = $('#promoList');
    if (!settings.promos.length) {
      container.innerHTML = '<p class="empty-state">No coupons yet.</p>';
      return;
    }
    container.innerHTML = settings.promos
      .map(
        (promo, i) => `
      <div class="promo-admin-item" data-index="${i}">
        <input class="promo-code" value="${escapeHtml(promo.code)}" placeholder="CODE" />
        <select class="promo-type">
          <option value="percent"${promo.type === 'percent' ? ' selected' : ''}>% off</option>
          <option value="fixed"${promo.type === 'fixed' ? ' selected' : ''}>₱ off</option>
        </select>
        <input type="number" class="promo-value" value="${promo.value}" min="1" />
        <input type="number" class="promo-min" value="${promo.minOrder || 0}" min="0" placeholder="Min order" />
        <button type="button" class="remove-promo-btn" data-index="${i}">Remove</button>
      </div>`
      )
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
          <img src="${p.images[0] || ''}" alt="" />
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <p>${escapeHtml(p.category)} · ${formatPrice(getEffectivePrice(p))} · stock ${p.stock}</p>
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
        await syncProducts();
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

  const openEditProduct = (id) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
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
        <p class="admin-edit-label">Details</p>
        <label class="admin-line">Name<input name="name" value="${escapeHtml(p.name)}" required /></label>
        <label class="admin-line">Subtitle<input name="subtitle" value="${escapeHtml(p.subtitle)}" /></label>
        <label class="admin-line">Category
          <select name="category">
            ${['rings', 'earrings', 'bracelets', 'necklaces']
              .map((c) => `<option value="${c}"${p.category === c ? ' selected' : ''}>${c}</option>`)
              .join('')}
          </select>
        </label>
      </div>
      <div class="admin-edit-section">
        <p class="admin-edit-label">Price & stock</p>
        <label class="admin-line">Price (₱)<input type="number" name="price" value="${p.price}" min="1" step="0.01" required /></label>
        <label class="admin-line">Stock<input type="number" name="stock" value="${p.stock}" min="0" required /></label>
        <label class="admin-line">Discount %<input type="number" name="discountPercent" value="${p.discountPercent}" min="0" max="99" /></label>
        <label class="checkbox-label admin-line-check"><input type="checkbox" name="discountActive"${p.discountActive ? ' checked' : ''} /> On discount</label>
      </div>
      <div class="admin-edit-section">
        <p class="admin-edit-label">Options</p>
        <label class="admin-line">Sizes<input name="sizes" value="${escapeHtml((p.sizes || []).join(', '))}" placeholder="6, 7, 8, 9" /></label>
        <label class="admin-line">Colors<input name="colors" value="${escapeHtml((p.colors || []).join(', '))}" placeholder="Gold, Silver" /></label>
      </div>
      <div class="admin-edit-section">
        <p class="admin-edit-label">Photos (up to 4)</p>
        <div class="admin-photo-grid">
          <label class="admin-photo-slot">Photo 1<input type="file" name="image1" accept="image/*" /></label>
          <label class="admin-photo-slot">Photo 2<input type="file" name="image2" accept="image/*" /></label>
          <label class="admin-photo-slot">Photo 3<input type="file" name="image3" accept="image/*" /></label>
          <label class="admin-photo-slot">Photo 4<input type="file" name="image4" accept="image/*" /></label>
        </div>
        <p class="admin-hint">Leave empty to keep current photos. Upload only the ones you want to replace.</p>
      </div>
      <div class="admin-edit-actions">
        <button type="submit" class="btn btn-primary">Save product</button>
        <button type="button" class="btn btn-outline-dark cancel-edit-btn">Cancel</button>
      </div>`;
    slot.appendChild(editor);
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    editor.addEventListener('submit', async (event) => {
      event.preventDefault();
      p.name = editor.elements.name.value.trim();
      p.subtitle = editor.elements.subtitle.value.trim();
      p.category = editor.elements.category.value;
      p.price = parseFloat(editor.elements.price.value) || p.price;
      p.stock = parseInt(editor.elements.stock.value, 10) || 0;
      p.sizes = editor.elements.sizes.value.split(',').map((s) => s.trim()).filter(Boolean);
      p.colors = editor.elements.colors.value.split(',').map((s) => s.trim()).filter(Boolean);
      p.requiresSize = p.sizes.length > 0;
      p.discountPercent = parseInt(editor.elements.discountPercent.value, 10) || 0;
      p.discountActive = editor.elements.discountActive.checked && p.discountPercent > 0;
      const files = [editor.elements.image1.files[0], editor.elements.image2.files[0], editor.elements.image3.files[0], editor.elements.image4.files[0]].filter(Boolean);
      if (files.length) {
        const next = await Promise.all(files.map((file) => compressImage(file)));
        p.images = [...next, ...(p.images || [])].slice(0, 4);
      }
      const saved = await syncProducts();
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
      return localStorage.getItem(KEYS.adminSession) === '1';
    } catch {
      return false;
    }
  };

  const setAdminLoggedIn = (on) => {
    try {
      if (on) localStorage.setItem(KEYS.adminSession, '1');
      else localStorage.removeItem(KEYS.adminSession);
    } catch {
      /* ignore */
    }
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
    const payForm = $('#paymentsForm');
    if (payForm?.paymongoPublicKey) {
      payForm.paymongoPublicKey.value = settings.paymongoPublicKey || '';
    }
    switchAdminTab('products');
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
      if (adminTapCount === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
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

  $('#closeAdmin')?.addEventListener('click', () => {
    $('#adminPanel').classList.add('hidden');
    document.body.style.overflow = '';
    closeOverlay();
  });

  $('#adminLogoutBtn')?.addEventListener('click', () => {
    setAdminLoggedIn(false);
    $('#adminPanel').classList.add('hidden');
    document.body.style.overflow = '';
    closeOverlay();
    showToast('Admin logged out. Logo ×3 will ask for password again.');
  });

  $$('.admin-tab').forEach((tab) => tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab)));

  $('#addProductForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const files = [form.image1.files[0], form.image2.files[0], form.image3.files[0], form.image4.files[0]].filter(Boolean);
    const images = await Promise.all(files.map((file) => compressImage(file)));
    const sizes = form.sizes.value.split(',').map((s) => s.trim()).filter(Boolean);
    products.unshift(
      normalizeProduct({
        id: generateId(),
        name: form.name.value.trim(),
        subtitle: form.subtitle.value.trim(),
        category: form.category.value,
        price: parseFloat(form.price.value),
        stock: parseInt(form.stock.value, 10) || 0,
        sizes,
        colors: form.colors.value.split(',').map((s) => s.trim()).filter(Boolean),
        requiresSize: sizes.length > 0,
        discountPercent: parseInt(form.discountPercent.value, 10) || 0,
        discountActive: form.discountActive.checked,
        images
      })
    );
    const saved = await syncProducts();
    form.reset();
    renderProducts();
    switchAdminTab('products');
    showToast(saved ? 'Product added for all customers' : 'Added locally. Connect Supabase to publish.');
  });

  $('#addPromoBtn')?.addEventListener('click', () => {
    settings.promos.push({ code: 'NEWCODE', type: 'percent', value: 10, minOrder: 0, maxRedemptions: 0 });
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
        maxRedemptions: 0
      }))
      .filter((p) => p.code && p.value > 0);
    const saved = await saveSettingsRemote();
    showToast(saved ? 'Coupons live for all customers' : 'Coupons saved on this device only.');
  });

  $('#paymentsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.paymongoPublicKey) {
      settings.paymongoPublicKey = form.paymongoPublicKey.value.trim();
      localStorage.setItem('zora_paymongo_pk', settings.paymongoPublicKey);
    }
    if (form.gcash?.files?.[0]) settings.paymentQrs.GCash = await compressImage(form.gcash.files[0], 700);
    if (form.maya?.files?.[0]) settings.paymentQrs.Maya = await compressImage(form.maya.files[0], 700);
    if (form.bank?.files?.[0]) settings.paymentQrs['Bank Transfer'] = await compressImage(form.bank.files[0], 700);
    const saved = await saveSettingsRemote();
    renderPaymentPreviews();
    showToast(saved ? 'PayMongo / payment settings saved' : 'Saved on this device only.');
  });

  $('#refreshOrdersBtn')?.addEventListener('click', () => renderAdminOrders());

  $('#lookbookForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saved = await saveSettingsRemote();
    refreshStorefront();
    showToast(saved ? 'Lookbook photos are live for all customers' : 'Photos saved on this device only.');
  });

  $('#adminSettingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    settings.instagram = form.instagram.value.trim().replace('@', '') || settings.instagram;
    settings.facebookUrl = form.facebookUrl.value.trim() || settings.facebookUrl;
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
    const saved = await saveSettingsRemote();
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

  $('#overlay')?.addEventListener('click', closeAllPanels);
  $('#viewAllLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    filterProducts('all');
  });
  $('#heroShopLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    filterProducts('all');
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPanels();
      $('#adminPanel')?.classList.add('hidden');
    }
  });

  const init = async () => {
    currentAccount = getSavedSession();
    await loadSettings();
    loadCart();
    initHeader();
    initDropdowns();
    initMobileMenu();
    renderHero();
    renderCollections();
    renderCategories();
    renderBlogs();
    renderFooter();
    initSearch();
    initProductZoom();
    updateCartUI();
    await loadProducts();
    if (currentAccount) await loadOrdersForEmail(currentAccount.email);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
