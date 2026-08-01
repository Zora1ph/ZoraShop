(function () {
  'use strict';

  const STORAGE_KEYS = {
    draft: 'zora_products_draft',
    settings: 'zora_settings',
    welcomeSeen: 'zora_welcome_seen',
    promoUsage: 'zora_promo_usage'
  };

  const DEFAULT_SETTINGS = {
    instagram: 'zora.ph_',
    facebook: 'Zora.Official.ph',
    facebookUrl: 'https://www.facebook.com/share/1EtKmbeuGo/?mibextid=wwXIfr',
    adminPassword: 'zora2024',
    promos: [],
    // Default hero slides (array of objects: src, title, subtitle, ctaText, ctaUrl)
    heroSlides: [
      { src: 'https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=1200&h=700&fit=crop', title: 'FALL 2026 COLLECTION', subtitle: 'Signature pieces', ctaText: 'SHOP NOW', ctaUrl: '#' },
      { src: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&h=700&fit=crop', title: 'LUCENA CITY CRAFT', subtitle: 'Handmade with care', ctaText: 'VIEW', ctaUrl: '#' },
      { src: 'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=1200&h=700&fit=crop', title: 'PREMIUM DESIGNS', subtitle: 'Timeless elegance', ctaText: 'EXPLORE', ctaUrl: '#' }
    ],
    collections: [
      { name: 'RINGS', category: 'rings', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop' },
      { name: 'EARRINGS', category: 'earrings', image: 'https://images.unsplash.com/photo-1617038260897-41a6084a5560?w=400&h=400&fit=crop' },
      { name: 'NECKLACES', category: 'necklaces', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop' },
      { name: 'BRACELETS', category: 'bracelets', image: 'https://images.unsplash.com/photo-1611652028916-3ace4a659eb4?w=400&h=400&fit=crop' }
    ]
  };

  const DEFAULT_PRODUCTS = [
    {
      id: '1',
      name: 'LUSH APEX',
      subtitle: 'STAINLESS STEEL',
      category: 'rings',
      price: 65,
      stock: 9,
      requiresSize: true,
      sizes: ['6', '7', '8', '9'],
      discountActive: false,
      discountPercent: 0,
      images: [
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1588444837495-c5d469f45715?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop'
      ]
    },
    {
      id: '2',
      name: 'DOT BLING',
      subtitle: 'CRYSTAL STUD',
      category: 'earrings',
      price: 80,
      stock: 43,
      requiresSize: false,
      sizes: [],
      discountActive: true,
      discountPercent: 15,
      images: [
        'https://images.unsplash.com/photo-1617038260897-41a6084a5560?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1603561596112-0a132756a22f?w=400&h=400&fit=crop'
      ]
    },
    {
      id: '3',
      name: 'ROPE CHAIN SILVER',
      subtitle: '925 SILVER PLATED',
      category: 'bracelets',
      price: 150,
      stock: 47,
      requiresSize: true,
      sizes: ['17CM', '19CM', '21CM'],
      discountActive: false,
      discountPercent: 0,
      images: [
        'https://images.unsplash.com/photo-1611652028916-3ace4a659eb4?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1599643477877-5737707064c8?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop'
      ]
    },
    {
      id: '4',
      name: 'GOLD PEARL NECKLACE',
      subtitle: 'PREMIUM 925 SILVER',
      category: 'necklaces',
      price: 150,
      stock: 10,
      requiresSize: true,
      sizes: ['40CM', '45CM', '50CM'],
      discountActive: false,
      discountPercent: 0,
      images: [
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1611591437281-460bfbead0db?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=400&fit=crop'
      ]
    }
  ];

  let products = [];
  let publishedProducts = [];
  let publishedStoreSettings = {};
  let settings = {};
  let cart = [];
  let currentProduct = null;
  let selectedSize = null;
  let detailQuantity = 1;
  let selectedAngleIndex = 0;
  let activeCategory = 'all';
  let appliedPromo = null;
  let adminTapCount = 0;
  let adminTapTimer = null;
  let hasUnpublishedChanges = false;
  let heroIndex = 0;
  let heroTimer = null;
  let lastSupabaseError = '';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function normalizeProduct(p) {
    const sizes = Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [];
    const stock = Number(p.stock) || 0;
    const limitedSizes = sizes.slice(0, Math.max(stock, 0));
    return {
      ...p,
      category: p.category || 'rings',
      sizes: limitedSizes,
      stock,
      requiresSize: p.requiresSize ?? limitedSizes.length > 0,
      discountPercent: Number(p.discountPercent) || 0,
      discountActive: Boolean(p.discountActive),
      images: getValidImages(p.images)
    };
  }

  function getValidImages(images) {
    if (!Array.isArray(images)) return [];
    const seen = new Set();
    return images.filter(src => {
      if (!src || typeof src !== 'string') return false;
      const trimmed = src.trim();
      if (!trimmed || seen.has(trimmed)) return false;
      seen.add(trimmed);
      return true;
    });
  }

  function getDisplayPrice(product) {
    const original = Number(product.price) || 0;
    if (product.discountActive && product.discountPercent > 0) {
      const sale = original * (1 - product.discountPercent / 100);
      return { original, sale, percent: product.discountPercent, hasDiscount: true };
    }
    return { original, sale: original, percent: 0, hasDiscount: false };
  }

  function renderPriceHtml(product, large = false) {
    const { original, sale, percent, hasDiscount } = getDisplayPrice(product);
    if (hasDiscount) {
      return `
        <span class="price-original${large ? ' price-original--lg' : ''}">${formatPrice(original)}</span>
        <span class="price-sale${large ? ' price-sale--lg' : ''}">${formatPrice(sale)}</span>
        <span class="badge-discount">-${percent}%</span>
      `;
    }
    return `<span class="price-single${large ? ' price-single--lg' : ''}">${formatPrice(sale)}</span>`;
  }

  function getItemUnitPrice(product) {
    return getDisplayPrice(product).sale;
  }

  function cartKey(id, size) {
    return size ? `${id}::${size}` : id;
  }

  function getPromoUsage() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.promoUsage) || '{}');
    } catch {
      return {};
    }
  }

  function savePromoUsage(usage) {
    localStorage.setItem(STORAGE_KEYS.promoUsage, JSON.stringify(usage));
  }

  function getSupabaseConfig() {
    const cfg = window.ZORA_CONFIG || {};
    if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
    return {
      ...cfg,
      supabaseUrl: String(cfg.supabaseUrl).replace(/\/+$/, '')
    };
  }

  async function supabaseRequest(path, options = {}) {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    const headers = {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      ...(options.headers || {})
    };

    const res = await fetch(`${cfg.supabaseUrl}${path}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Supabase request failed: ${res.status}${errorText ? ` — ${errorText}` : ''}`);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function supaRequest(path, options = {}) {
    const cfg = getSupabaseConfig();
    if (!cfg) return null;

    const headers = {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      ...(options.headers || {})
    };

    const res = await fetch(`${cfg.supabaseUrl}${path}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      throw new Error(`Supabase request failed: ${res.status}`);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function loadSettingsFromSupabase() {
    try {
      const data = await supaRequest('/rest/v1/store_settings?id=eq.store&select=*');
      const row = Array.isArray(data) && data.length ? data[0] : null;
      if (!row) return null;

      return {
        instagram: row.instagram || DEFAULT_SETTINGS.instagram,
        facebook: row.facebook || DEFAULT_SETTINGS.facebook,
        facebookUrl: row.facebook_url || DEFAULT_SETTINGS.facebookUrl,
        adminPassword: row.admin_password || DEFAULT_SETTINGS.adminPassword,
        promos: Array.isArray(row.promos) ? row.promos : [],
        heroSlides: Array.isArray(row.hero_slides) && row.hero_slides.length ? row.hero_slides : DEFAULT_SETTINGS.heroSlides,
        collections: Array.isArray(row.collections) && row.collections.length ? row.collections : DEFAULT_SETTINGS.collections
      };
    } catch {
      return null;
    }
  }

  async function loadSettings() {
    const storedSettings = localStorage.getItem(STORAGE_KEYS.settings);
    settings = storedSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
      : { ...DEFAULT_SETTINGS };

    if (settings.instagram === 'zora.ph') settings.instagram = 'zora.ph_';
    if (!Array.isArray(settings.promos)) settings.promos = [];

    try {
      const supabaseSettings = await loadSettingsFromSupabase();
      if (supabaseSettings) {
        publishedStoreSettings = {
          instagram: supabaseSettings.instagram,
          facebook: supabaseSettings.facebook,
          facebookUrl: supabaseSettings.facebookUrl,
          promos: supabaseSettings.promos || [],
          heroSlides: supabaseSettings.heroSlides || DEFAULT_SETTINGS.heroSlides
          ,collections: supabaseSettings.collections || DEFAULT_SETTINGS.collections
        };
        settings.instagram = supabaseSettings.instagram;
        settings.facebook = supabaseSettings.facebook;
        settings.facebookUrl = supabaseSettings.facebookUrl;
        settings.adminPassword = supabaseSettings.adminPassword;
        settings.promos = supabaseSettings.promos || [];
        settings.heroSlides = supabaseSettings.heroSlides || DEFAULT_SETTINGS.heroSlides;
        settings.collections = supabaseSettings.collections || DEFAULT_SETTINGS.collections;
      } else {
        const res = await fetch('store-settings.json?t=' + Date.now());
        if (res.ok) {
          publishedStoreSettings = await res.json();
          if (!storedSettings) {
            if (publishedStoreSettings.instagram) settings.instagram = publishedStoreSettings.instagram;
            if (publishedStoreSettings.facebook) settings.facebook = publishedStoreSettings.facebook;
            if (publishedStoreSettings.facebookUrl) settings.facebookUrl = publishedStoreSettings.facebookUrl;
            if (Array.isArray(publishedStoreSettings.promos)) settings.promos = publishedStoreSettings.promos;
            if (Array.isArray(publishedStoreSettings.collections)) settings.collections = publishedStoreSettings.collections;
          }
        }
      }
    } catch {
      // offline or file://
    }

    if (!storedSettings) await saveSettings();
  }

  async function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    const cfg = getSupabaseConfig();
    let savedToSupabase = !cfg;
    try {
      if (cfg) {
        const settingsPayload = {
          id: 'store',
          instagram: settings.instagram,
          facebook: settings.facebook,
          facebook_url: settings.facebookUrl,
          promos: settings.promos || [],
          admin_password: settings.adminPassword,
          hero_slides: settings.heroSlides || []
          ,collections: settings.collections || []
        };
        try {
          await supaRequest('/rest/v1/store_settings?on_conflict=id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates'
            },
            body: JSON.stringify([settingsPayload])
          });
        } catch (err) {
          const errorMessage = String(err.message || '');
          const legacyPayload = { ...settingsPayload };
          if (errorMessage.includes('hero_slides')) delete legacyPayload.hero_slides;
          if (errorMessage.includes('collections')) delete legacyPayload.collections;
          if (legacyPayload.hero_slides === settingsPayload.hero_slides &&
              legacyPayload.collections === settingsPayload.collections) throw err;
          await supaRequest('/rest/v1/store_settings?on_conflict=id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates'
            },
            body: JSON.stringify([legacyPayload])
          });
          lastSupabaseError = 'Account settings saved. Run the missing content-column migration to publish all content edits.';
        }
        savedToSupabase = true;
      }
    } catch (err) {
      savedToSupabase = false;
      lastSupabaseError = err?.message || 'Unknown Supabase error';
    }
    checkUnpublishedChanges();
    return savedToSupabase;
  }

  function getPublicStoreSettings() {
    return {
      instagram: settings.instagram,
      facebook: settings.facebook,
      facebookUrl: settings.facebookUrl,
      promos: settings.promos || [],
      heroSlides: settings.heroSlides || DEFAULT_SETTINGS.heroSlides
      ,collections: settings.collections || DEFAULT_SETTINGS.collections
    };
  }

  // Render hero slides in the main page from publishedStoreSettings or local settings
  function renderHeroSlides() {
    const carousel = $('#hero-carousel');
    if (!carousel) return;
    const slides = (publishedStoreSettings && Array.isArray(publishedStoreSettings.heroSlides) && publishedStoreSettings.heroSlides.length)
      ? publishedStoreSettings.heroSlides
      : (settings.heroSlides || DEFAULT_SETTINGS.heroSlides);

    carousel.innerHTML = slides.map((slide, i) => {
      const src = (typeof slide === 'string') ? slide : (slide && slide.src) ? slide.src : '';
      const title = slide && slide.title ? slide.title : '';
      const subtitle = slide && slide.subtitle ? slide.subtitle : '';
      const ctaText = slide && slide.ctaText ? slide.ctaText : '';
      const ctaUrl = slide && slide.ctaUrl ? slide.ctaUrl : '';

      const overlayHtml = (title || subtitle || ctaText) ? `
        <div class="hero-overlay">
          ${title ? `<h2 class="hero-title">${title}</h2>` : ''}
          ${subtitle ? `<p class="hero-sub">${subtitle}</p>` : ''}
          ${ctaText ? `<a href="${ctaUrl || '#'}" class="btn hero-cta">${ctaText}</a>` : ''}
        </div>` : `
        <div class="hero-overlay">
          <p class="hero-tag">ZORA.PH SIGNATURE SERIES</p>
          <h2 class="hero-title">FALL 2026 COLLECTION</h2>
          <p class="hero-sub">Exquisite Lucena City Craftsmanship</p>
        </div>`;

      return `
        <div class="hero-slide${i === 0 ? ' active' : ''}">
          <img src="${src}" alt="Hero ${i + 1}" loading="lazy">
          ${overlayHtml}
        </div>`;
    }).join('');
  }

  // Admin UI: render hero slides editor (preview + file inputs and per-slide text)
  function renderHeroSlidesEditor() {
    const editor = $('#hero-slides-editor');
    if (!editor) return;
    settings.heroSlides = settings.heroSlides || [];

    if (!settings.heroSlides.length) {
      editor.innerHTML = '<p class="cart-empty">NO SLIDES YET</p>';
      return;
    }

    editor.innerHTML = settings.heroSlides.map((slide, i) => {
      const src = (typeof slide === 'string') ? slide : (slide && slide.src) ? slide.src : '';
      const title = slide && slide.title ? slide.title : '';
      const subtitle = slide && slide.subtitle ? slide.subtitle : '';
      const ctaText = slide && slide.ctaText ? slide.ctaText : '';
      const ctaUrl = slide && slide.ctaUrl ? slide.ctaUrl : '';

      return `
      <div class="hero-slide-admin" data-index="${i}">
        <img src="${src}" class="hero-slide-preview" alt="Slide ${i + 1}" style="max-width:200px;display:block;margin-bottom:8px;">
        <input type="file" accept="image/*" data-index="${i}" class="hero-slide-file">
        <input type="text" data-field="title" data-index="${i}" class="hero-slide-input" placeholder="Title" value="${escapeHtml(title)}">
        <input type="text" data-field="subtitle" data-index="${i}" class="hero-slide-input" placeholder="Subtitle" value="${escapeHtml(subtitle)}">
        <input type="text" data-field="ctaText" data-index="${i}" class="hero-slide-input" placeholder="CTA Text (button)" value="${escapeHtml(ctaText)}">
        <input type="text" data-field="ctaUrl" data-index="${i}" class="hero-slide-input" placeholder="CTA URL" value="${escapeHtml(ctaUrl)}">
        <button type="button" class="remove-hero-slide-btn btn btn-outline" data-index="${i}">Remove</button>
      </div>`;
    }).join('');

    // Attach handlers: file inputs
    editor.querySelectorAll('.hero-slide-file').forEach(input => {
      input.addEventListener('change', async (e) => {
        const idx = Number(e.target.dataset.index);
        const file = e.target.files[0];
        if (!file) return;
        try {
          const dataUrl = await compressImage(file);
          if (!settings.heroSlides[idx] || typeof settings.heroSlides[idx] === 'string') settings.heroSlides[idx] = {};
          settings.heroSlides[idx].src = dataUrl;
          await saveSettings();
          renderHeroSlidesEditor();
          renderHeroSlides();
          initHeroCarousel();
          renderCollections();
        } catch (err) {
          alert('Failed to process image: ' + (err?.message || ''));
        }
      });
    });

    // Attach handlers: text inputs
    editor.querySelectorAll('.hero-slide-input').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.index);
        const field = input.dataset.field;
        if (!settings.heroSlides[idx] || typeof settings.heroSlides[idx] === 'string') settings.heroSlides[idx] = {};
        settings.heroSlides[idx][field] = input.value;
        // Save locally immediately; save to Supabase in background
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
        saveSettings();
        renderHeroSlides();
      });
    });

    // Remove buttons
    editor.querySelectorAll('.remove-hero-slide-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.dataset.index);
        settings.heroSlides.splice(idx, 1);
        await saveSettings();
        renderHeroSlidesEditor();
        renderCollectionsEditor();
        renderHeroSlides();
        initHeroCarousel();
      });
    });
  }

  // Small helper to escape values inserted into input value attributes
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function loadProductsFromSupabase() {
    try {
      const data = await supaRequest('/rest/v1/products?select=*');
      if (!Array.isArray(data) || !data.length) return null;
      return data.map(row => normalizeProduct({
        id: row.id,
        name: row.name,
        subtitle: row.subtitle,
        category: row.category,
        price: row.price,
        stock: row.stock,
        requiresSize: row.requires_size,
        sizes: row.sizes,
        discountActive: row.discount_active,
        discountPercent: row.discount_percent,
        images: row.images
      }));
    } catch {
      return null;
    }
  }

  async function syncProductsToSupabase(productList) {
    const cfg = getSupabaseConfig();
    if (!cfg) return false;

    try {
      const payload = productList.map(product => ({
        id: product.id,
        name: product.name,
        subtitle: product.subtitle || '',
        category: product.category || 'rings',
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        requires_size: Boolean(product.requiresSize),
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        discount_active: Boolean(product.discountActive),
        discount_percent: Number(product.discountPercent) || 0,
        images: Array.isArray(product.images) ? product.images : []
      }));

      await supaRequest('/rest/v1/products?on_conflict=id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      return true;
    } catch {
      lastSupabaseError = 'Product write failed.';
      return false;
    }
  }

  // Save an order record to Supabase (best-effort). The orders table must exist in your Supabase schema.
  async function saveOrderToSupabase(order) {
    const cfg = getSupabaseConfig();
    if (!cfg) return false;
    try {
      // Supabase REST accepts an array payload for inserts
      await supaRequest('/rest/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify([order])
      });
      return true;
    } catch (err) {
      // ignore errors (best-effort)
      return false;
    }
  }

  async function loadProducts() {
    const supabaseProducts = await loadProductsFromSupabase();
    if (supabaseProducts) {
      publishedProducts = supabaseProducts;
    } else {
      try {
        const res = await fetch('products.json?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length) {
            publishedProducts = data.map(normalizeProduct);
          }
        }
      } catch {
        // file:// or missing file
      }
    }

    if (!publishedProducts.length) {
      publishedProducts = DEFAULT_PRODUCTS.map(normalizeProduct);
    }

    products = publishedProducts.map(p => ({ ...p }));
    checkUnpublishedChanges();
  }

  function checkUnpublishedChanges() {
    const productsChanged = JSON.stringify(products) !== JSON.stringify(publishedProducts);
    const settingsChanged = JSON.stringify(getPublicStoreSettings()) !== JSON.stringify({
      instagram: publishedStoreSettings.instagram || settings.instagram,
      facebook: publishedStoreSettings.facebook || settings.facebook,
      facebookUrl: publishedStoreSettings.facebookUrl || settings.facebookUrl,
      promos: publishedStoreSettings.promos || [],
      heroSlides: publishedStoreSettings.heroSlides || settings.heroSlides || DEFAULT_SETTINGS.heroSlides,
      collections: publishedStoreSettings.collections || settings.collections || DEFAULT_SETTINGS.collections
    });
    hasUnpublishedChanges = productsChanged || settingsChanged;
    updatePublishBanner();
  }

  function renderCollections() {
    const grid = $('#collections-grid');
    if (!grid) return;
    const collectionList = Array.isArray(settings.collections) && settings.collections.length
      ? settings.collections
      : DEFAULT_SETTINGS.collections;
    grid.innerHTML = collectionList.map(collection => `
      <button class="collection-card" data-category="${escapeHtml(collection.category)}">
        <div class="collection-img">
          <img src="${escapeHtml(collection.image)}" alt="${escapeHtml(collection.name)}" loading="lazy">
        </div>
        <span class="collection-name">${escapeHtml(collection.name)} →</span>
      </button>
    `).join('');
    grid.querySelectorAll('.collection-card').forEach(card => {
      card.addEventListener('click', () => setActiveCategory(card.dataset.category));
    });
  }

  function renderCollectionsEditor() {
    const editor = $('#collections-editor');
    if (!editor) return;
    settings.collections = Array.isArray(settings.collections) && settings.collections.length
      ? settings.collections
      : DEFAULT_SETTINGS.collections.map(item => ({ ...item }));
    editor.innerHTML = settings.collections.map((collection, index) => `
      <div class="collection-admin-item" data-index="${index}">
        <img src="${escapeHtml(collection.image)}" class="collection-admin-preview" alt="${escapeHtml(collection.name)}">
        <label class="file-label">
          <span>IMAGE</span>
          <input type="file" accept="image/*" class="collection-file" data-index="${index}">
        </label>
        <label class="admin-field">
          <span>NAME</span>
          <input type="text" class="collection-name-input" data-index="${index}" value="${escapeHtml(collection.name)}" placeholder="Example: RINGS">
        </label>
        <label class="admin-field">
          <span>PRODUCT CATEGORY</span>
          <select class="collection-category-input" data-index="${index}">
            ${['rings', 'earrings', 'necklaces', 'bracelets'].map(category =>
              `<option value="${category}"${collection.category === category ? ' selected' : ''}>${category.toUpperCase()}</option>`
            ).join('')}
          </select>
        </label>
      </div>
    `).join('');

    editor.querySelectorAll('.collection-file').forEach(input => {
      input.addEventListener('change', async event => {
        const file = event.target.files[0];
        const index = Number(event.target.dataset.index);
        if (!file) return;
        settings.collections[index].image = await compressImage(file);
        renderCollectionsEditor();
        renderCollections();
      });
    });
    editor.querySelectorAll('.collection-name-input').forEach(input => {
      input.addEventListener('input', event => {
        settings.collections[Number(event.target.dataset.index)].name = event.target.value.toUpperCase();
        renderCollections();
      });
    });
    editor.querySelectorAll('.collection-category-input').forEach(input => {
      input.addEventListener('change', event => {
        settings.collections[Number(event.target.dataset.index)].category = event.target.value;
        renderCollections();
      });
    });
  }

  async function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(products));
      await syncProductsToSupabase(products);
      checkUnpublishedChanges();
      return true;
    } catch (err) {
      alert(
        'Could not save product (storage full).\n\n' +
        'Tips:\n• Use smaller / fewer photos\n• Click SAVE CHANGES then clear draft\n\n' +
        (err && err.message ? err.message : '')
      );
      return false;
    }
  }

  function updatePublishBanner() {
    const banner = $('#publish-banner');
    if (!banner) return;
    if (hasUnpublishedChanges) {
      banner.classList.remove('hidden');
      banner.innerHTML =
        '<strong>UNPUBLISHED CHANGES</strong> — Customers will NOT see updates until you click ' +
        '<em>SAVE CHANGES</em> and the Supabase tables are updated.';
    } else {
      banner.classList.add('hidden');
    }
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function publishProducts() {
    const syncedToSupabase = await syncProductsToSupabase(products);
    const settingsSavedToSupabase = await saveSettings();

    downloadJson('products.json', products);
    downloadJson('store-settings.json', getPublicStoreSettings());

    if (syncedToSupabase && settingsSavedToSupabase) {
      publishedProducts = JSON.parse(JSON.stringify(products));
      publishedStoreSettings = getPublicStoreSettings();
      localStorage.removeItem(STORAGE_KEYS.draft);
      hasUnpublishedChanges = false;
      updatePublishBanner();
      alert('Products and settings synced to Supabase.\n\nJSON files were also downloaded as a backup.');
    } else {
      alert(
        'Supabase was not updated successfully.\n\n' +
        (lastSupabaseError ? lastSupabaseError + '\n\n' : '') +
        'Check your Supabase URL, anon key, table permissions, and network connection. ' +
        'The JSON files were downloaded as a backup.'
      );
    }
  }

  function getInstagramDmUrl(message) {
    const username = settings.instagram.replace('@', '').trim();
    const encoded = encodeURIComponent(message);
    return `https://ig.me/m/${username}?text=${encoded}`;
  }

  function getMessengerUrl(message) {
    const encoded = encodeURIComponent(message);
    // Share URLs contain temporary tokens, not a Messenger page identifier.
    const page = (settings.facebook || '').replace(/^@/, '').trim();
    if (page) return `https://www.facebook.com/messages/t/${encodeURIComponent(page)}?text=${encoded}`;

    const fbUrl = (settings.facebookUrl || '').trim();
    if (fbUrl) return `${fbUrl}${fbUrl.includes('?') ? '&' : '?'}text=${encoded}`;

    return `https://www.facebook.com/messages/t/Zora.Official.ph?text=${encoded}`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function openCheckoutChannel(channel, message, winRef) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let url;

    if (channel === 'messenger') {
      url = getMessengerUrl(message);
      $('#toast-title').textContent = 'OPENING MESSENGER...';
      $('#checkout-fallback').textContent = 'OPEN MESSENGER';
    } else {
      url = getInstagramDmUrl(message);
      $('#toast-title').textContent = 'OPENING INSTAGRAM...';
      $('#checkout-fallback').textContent = 'OPEN @' + settings.instagram.toUpperCase();
    }

    $('#checkout-fallback').href = url;

    if (isMobile) {
      // On mobile, navigate directly
      window.location.href = url;
    } else {
      // Use the provided window reference (opened earlier) to avoid popup blocking
      try {
        if (winRef && !winRef.closed) {
          winRef.location.href = url;
          winRef.focus();
        } else {
          window.open(url, '_blank');
        }
      } catch (err) {
        // Fallback
        window.open(url, '_blank');
      }
    }
  }

  function showRedirectToast() {
    const toast = $('#redirect-toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 10000);
  }

  function formatPrice(amount) {
    return 'PHP ' + Number(amount).toFixed(2);
  }

  function formatCartPrice(amount) {
    return '₱' + Number(amount).toFixed(2);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function compressImage(file, maxSize = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#111111';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function parseSizesInput(value) {
    return value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  }

  function limitSizesToStock(sizes, stock) {
    if (stock <= 0) return [];
    if (sizes.length <= stock) return sizes;
    return sizes.slice(0, stock);
  }

  function validateSizesForStock(sizes, stock, showAlert = true) {
    if (sizes.length > stock) {
      if (showAlert) {
        alert(`You can only add up to ${stock} size(s) when stock is ${stock}. Extra sizes were removed.`);
      }
      return limitSizesToStock(sizes, stock);
    }
    return sizes;
  }

  function updateSizeLimitHint() {
    const stockInput = $('#add-stock-input');
    const sizesInput = $('#add-sizes-input');
    const hint = $('#size-limit-hint');
    if (!stockInput || !sizesInput || !hint) return;

    const stock = parseInt(stockInput.value, 10) || 0;
    const sizes = parseSizesInput(sizesInput.value);
    if (stock > 0 && sizes.length > stock) {
      hint.textContent = `Warning: ${sizes.length} sizes entered but stock is ${stock}. Only ${stock} will be saved.`;
      hint.style.color = '#ffcc00';
    } else if (stock > 0) {
      hint.textContent = `You can add up to ${stock} size(s) based on stock.`;
      hint.style.color = '';
    } else {
      hint.textContent = 'Sizes cannot exceed stock amount.';
      hint.style.color = '';
    }
  }

  function preloadProductImages() {
    products.forEach(p => {
      (p.images || []).forEach(src => {
        if (!src) return;
        const img = new Image();
        img.src = src;
      });
    });
  }

  function setActiveCategory(category) {
    activeCategory = category;
    $$('.category-tab').forEach(t => t.classList.toggle('active', t.dataset.category === category));
    const titles = {
      all: 'ALL JEWELLERY',
      bracelets: 'BRACELETS',
      rings: 'RINGS',
      earrings: 'EARRINGS',
      necklaces: 'NECKLACES'
    };
    const titleEl = $('#shop-section-title');
    if (titleEl) titleEl.textContent = titles[category] || 'ALL JEWELLERY';
    renderProducts($('#search-input')?.value || '');
    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
  }

  function renderProducts(filter = '') {
    const grid = $('#product-grid');
    const term = filter.toLowerCase().trim();
    const filtered = products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(term) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(term));
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="cart-empty" style="grid-column:1/-1">NO PRODUCTS FOUND</p>';
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const images = getValidImages(p.images);
      const mainImg = images[0] || '';
      return `
      <article class="product-card" data-id="${p.id}">
        <div class="img-wrap card-gallery" data-id="${p.id}">
          <div class="card-gallery-track">
            ${images.map((img, i) => `
              <div class="card-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                <img src="${img}" alt="${p.name} angle ${i + 1}" loading="lazy" decoding="async">
              </div>
            `).join('')}
          </div>
          ${images.length > 1 ? `
            <p class="card-swipe-hint">← SWIPE →</p>
            <div class="card-dots">
              ${images.map((_, i) => `<span class="card-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join('')}
            </div>
            <button type="button" class="card-arrow card-arrow--prev" aria-label="Previous angle">‹</button>
            <button type="button" class="card-arrow card-arrow--next" aria-label="Next angle">›</button>
          ` : ''}
          ${p.stock <= 0 ? '<span class="card-badge-sold-out">SOLD OUT</span>' : ''}
          ${p.discountActive && p.discountPercent && p.stock > 0 ? `<span class="card-badge-discount">-${p.discountPercent}%</span>` : ''}
        </div>
        <h3 class="name">${p.name}</h3>
        ${p.subtitle ? `<p class="subtitle">${p.subtitle}</p>` : ''}
        <p class="stock${p.stock <= 0 ? ' stock--sold-out' : ''}">${p.stock <= 0 ? 'SOLD OUT' : p.stock + ' ITEMS AVAILABLE'}</p>
        <div class="price">${renderPriceHtml(p)}</div>
      </article>
    `;
    }).join('');

    bindCardGalleries();

    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-arrow')) return;
        if (card.dataset.swiped === '1') return;
        openProductDetail(card.dataset.id);
      });
    });
  }

  function setCardSlide(gallery, index) {
    const slides = gallery.querySelectorAll('.card-slide');
    const dots = gallery.querySelectorAll('.card-dot');
    if (!slides.length) return;

    const next = ((index % slides.length) + slides.length) % slides.length;
    gallery.dataset.angle = String(next);

    slides.forEach((slide, i) => slide.classList.toggle('active', i === next));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === next));
  }

  function bindCardGalleries() {
    $$('.card-gallery').forEach(gallery => {
      if (gallery.dataset.bound) return;
      gallery.dataset.bound = '1';
      gallery.dataset.angle = '0';

      const slides = gallery.querySelectorAll('.card-slide');
      if (slides.length <= 1) return;

      const card = gallery.closest('.product-card');

      gallery.querySelector('.card-arrow--prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        setCardSlide(gallery, Number(gallery.dataset.angle) - 1);
      });

      gallery.querySelector('.card-arrow--next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        setCardSlide(gallery, Number(gallery.dataset.angle) + 1);
      });

      gallery.querySelectorAll('.card-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          setCardSlide(gallery, Number(dot.dataset.index));
        });
      });

      let startX = 0;
      gallery.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      gallery.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (Math.abs(diff) < 40) return;
        if (card) {
          card.dataset.swiped = '1';
          setTimeout(() => { card.dataset.swiped = '0'; }, 300);
        }
        setCardSlide(gallery, Number(gallery.dataset.angle) + (diff < 0 ? 1 : -1));
      }, { passive: true });
    });
  }

  function setDetailAngle(index) {
    if (!currentProduct) return;
    const images = getValidImages(currentProduct.images);
    if (!images.length) return;
    selectedAngleIndex = ((index % images.length) + images.length) % images.length;
    $('#detail-main-img').src = images[selectedAngleIndex];
    $$('#angle-thumbs img').forEach((t, i) => {
      t.classList.toggle('active', i === selectedAngleIndex);
    });
  }

  function bindGallerySwipe(el) {
    let startX = 0;
    el.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) < 40) return;
      setDetailAngle(selectedAngleIndex + (diff < 0 ? 1 : -1));
    }, { passive: true });
  }

  function openProductDetail(id) {
    currentProduct = products.find(p => p.id === id);
    if (!currentProduct) return;

    selectedSize = null;
    detailQuantity = 1;
    selectedAngleIndex = 0;

    const images = getValidImages(currentProduct.images);

    $('#detail-name').textContent = currentProduct.name;
    $('#detail-subtitle').textContent = currentProduct.subtitle || '';
    $('#detail-category').textContent = 'CATEGORY: ' + String(currentProduct.category || '').toUpperCase();
    $('#detail-stock').textContent = currentProduct.stock <= 0
      ? 'SOLD OUT'
      : currentProduct.stock + ' ITEMS AVAILABLE';
    $('#detail-stock').classList.toggle('stock--sold-out', currentProduct.stock <= 0);
    $('#detail-save-cart').disabled = currentProduct.stock <= 0;
    $('#detail-price-wrap').innerHTML = renderPriceHtml(currentProduct, true);
    $('#detail-qty').textContent = detailQuantity;

    const mainImg = $('#detail-main-img');
    mainImg.src = images[0] || '';
    mainImg.alt = currentProduct.name;

    const hint = $('#gallery-hint');
    if (hint) hint.classList.toggle('hidden', images.length <= 1);

    const thumbs = $('#angle-thumbs');
    if (images.length > 1) {
      thumbs.innerHTML = images.map((img, i) =>
        `<img src="${img}" alt="Angle ${i + 1}" class="${i === 0 ? 'active' : ''}" data-index="${i}">`
      ).join('');
      thumbs.classList.remove('hidden');
      thumbs.querySelectorAll('img').forEach(thumb => {
        thumb.addEventListener('click', () => setDetailAngle(Number(thumb.dataset.index)));
      });
    } else {
      thumbs.innerHTML = '';
      thumbs.classList.add('hidden');
    }

    const sizeSelector = $('#size-selector');
    const sizeOptions = $('#size-options');
    if (currentProduct.requiresSize && currentProduct.sizes.length) {
      sizeSelector.classList.remove('hidden');
      sizeOptions.innerHTML = currentProduct.sizes.map(size =>
        `<button type="button" class="size-btn" data-size="${size}">${size}</button>`
      ).join('');
      sizeOptions.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          selectedSize = btn.dataset.size;
        });
      });
    } else {
      sizeSelector.classList.add('hidden');
      sizeOptions.innerHTML = '';
    }

    $('#product-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeProductDetail() {
    $('#product-modal').classList.add('hidden');
    document.body.style.overflow = '';
    currentProduct = null;
    selectedSize = null;
    detailQuantity = 1;
  }

  function showCartConfirmation(product, quantity) {
    $('#confirmation-name').textContent = product.name;
    $('#confirmation-summary').textContent = `${quantity} item${quantity === 1 ? '' : 's'} saved to your cart.`;
    $('#cart-confirmation').classList.remove('hidden');
  }

  function addToCart(id, size = null, quantity = 1) {
    const product = products.find(p => p.id === id);
    if (!product || product.stock <= 0) {
      alert('Sorry, this item is out of stock.');
      return;
    }

    if (product.requiresSize && product.sizes.length && !size) {
      openProductDetail(id);
      alert('Please select a size first.');
      return;
    }

    const key = cartKey(id, size);
    const unitPrice = getItemUnitPrice(product);
    const existing = cart.find(item => item.cartKey === key);

    const safeQuantity = Math.max(1, Math.min(Number(quantity) || 1, product.stock));
    if (existing) {
      if (existing.qty + safeQuantity > product.stock) {
        alert('Maximum stock reached for this item.');
        return;
      }
      existing.qty += safeQuantity;
    } else {
      cart.push({
        id,
        cartKey: key,
        name: product.name,
        image: getValidImages(product.images)[0] || '',
        code: product.code || product.id,
        size: size || null,
        price: unitPrice,
        qty: safeQuantity
      });
    }

    updateCartUI();
    closeProductDetail();
    showCartConfirmation(product, safeQuantity);
  }

  function removeFromCart(key) {
    cart = cart.filter(item => item.cartKey !== key);
    updateCartUI();
  }

  function changeQty(key, delta) {
    const item = cart.find(i => i.cartKey === key);
    const product = products.find(p => p.id === item?.id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(key);
    } else if (product && item.qty > product.stock) {
      item.qty = product.stock;
      updateCartUI();
    } else {
      updateCartUI();
    }
  }

  function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function validatePromo(code) {
    const promo = (settings.promos || []).find(
      p => p.code.toUpperCase() === code.toUpperCase()
    );
    if (!promo) return { valid: false, message: 'Invalid promo code.' };

    const subtotal = getCartSubtotal();
    if (promo.minOrder && subtotal < promo.minOrder) {
      return {
        valid: false,
        message: `Minimum order ${formatPrice(promo.minOrder)} required.`
      };
    }

    const maxRedemptions = Number(promo.maxRedemptions) || 0;
    if (maxRedemptions > 0) {
      const usage = getPromoUsage();
      const used = Number(usage[promo.code.toUpperCase()]) || 0;
      if (used >= maxRedemptions) {
        return {
          valid: false,
          message: `This promo has reached its redemption limit (${maxRedemptions}).`
        };
      }
    }

    return { valid: true, promo };
  }

  function recordPromoRedemption(code) {
    const maxRedemptions = (settings.promos || []).find(
      p => p.code.toUpperCase() === code.toUpperCase()
    )?.maxRedemptions;
    if (!maxRedemptions || maxRedemptions <= 0) return;

    const usage = getPromoUsage();
    const key = code.toUpperCase();
    usage[key] = (Number(usage[key]) || 0) + 1;
    savePromoUsage(usage);
  }

  function getPromoDiscount(subtotal) {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === 'percent') {
      return subtotal * (appliedPromo.value / 100);
    }
    return Math.min(appliedPromo.value, subtotal);
  }

  function getCartTotal() {
    const subtotal = getCartSubtotal();
    return Math.max(0, subtotal - getPromoDiscount(subtotal));
  }

  function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    $('#cart-count').textContent = count;

    const subtotal = getCartSubtotal();
    const discount = getPromoDiscount(subtotal);
    const total = getCartTotal();
    const totalQuantity = cart.reduce((sum, item) => sum + item.qty, 0);

    $('#cart-subtotal').textContent = formatCartPrice(subtotal);
    $('#cart-discount').textContent = '- ' + formatCartPrice(discount);
    $('#cart-total').textContent = formatCartPrice(total);
    $('#cart-total-quantity').textContent = totalQuantity;

    $('#cart-subtotal-row').classList.toggle('hidden', !appliedPromo || discount === 0);
    $('#cart-discount-row').classList.toggle('hidden', !appliedPromo || discount === 0);

    const container = $('#cart-items');
    if (cart.length === 0) {
      container.innerHTML = '<p class="cart-empty">YOUR CART IS EMPTY</p>';
      return;
    }

    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img class="cart-item-image" src="${item.image || ''}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}${item.size ? ` (${item.size})` : ''}</div>
          <div class="cart-item-code">CODE: ${item.code || item.id}</div>
          <div class="cart-item-price">${formatCartPrice(item.price * item.qty)}</div>
        </div>
        <div class="cart-item-controls">
          <button type="button" data-qty="${item.cartKey}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button type="button" data-qty="${item.cartKey}" data-delta="1">+</button>
          <button type="button" class="cart-remove" data-remove="${item.cartKey}" aria-label="Remove item">▥</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        changeQty(btn.dataset.qty, Number(btn.dataset.delta));
      });
    });
    container.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.remove));
    });
  }

  function applyPromoCode() {
    const input = $('#promo-input');
    const msg = $('#promo-message');
    const code = input.value.trim();
    if (!code) {
      appliedPromo = null;
      msg.classList.add('hidden');
      updateCartUI();
      return;
    }

    const result = validatePromo(code);
    if (!result.valid) {
      appliedPromo = null;
      msg.textContent = result.message;
      msg.classList.remove('hidden');
      msg.classList.add('promo-message--error');
      updateCartUI();
      return;
    }

    appliedPromo = result.promo;
    const maxNote = result.promo.maxRedemptions > 0
      ? ` (${result.promo.maxRedemptions - (getPromoUsage()[result.promo.code.toUpperCase()] || 0)} left)`
      : '';
    msg.textContent = `Promo "${result.promo.code}" applied!${maxNote}`;
    msg.classList.remove('hidden', 'promo-message--error');
    updateCartUI();
  }

  function openCart() {
    updateCartUI();
    $('#cart-modal').classList.remove('hidden');
  }

  function openCheckout() {
    if (!cart.length) {
      alert('Your cart is empty.');
      return;
    }
    closeCart();
    $('#checkout-modal').classList.remove('hidden');
  }

  function closeCart() {
    $('#cart-modal').classList.add('hidden');
  }

  function buildOrderMessage(formData) {
    const subtotal = getCartSubtotal();
    const discount = getPromoDiscount(subtotal);
    const lines = [
      'NEW ORDER — ZORA.PH',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      'ITEMS:'
    ];

    cart.forEach(item => {
      const label = item.size ? `${item.name} (${item.size})` : item.name;
      lines.push(`  • ${label} × ${item.qty} — ${formatPrice(item.price * item.qty)}`);
    });

    lines.push('');
    if (appliedPromo && discount > 0) {
      lines.push(`PROMO: ${appliedPromo.code}`);
      lines.push(`DISCOUNT: -${formatPrice(discount)}`);
    }
    lines.push(`TOTAL: ${formatPrice(getCartTotal())}`);
    lines.push('');
    lines.push('CUSTOMER DETAILS:');
    lines.push(`  Name: ${formData.name}`);
    lines.push(`  Phone: ${formData.phone}`);
    lines.push(`  Address: ${formData.address}`);
    if (formData.notes) lines.push(`  Notes: ${formData.notes}`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('Sent via Zora.ph');

    return lines.join('\n');
  }

  async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    // Open a blank window early on non-mobile to avoid popup blockers.
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let checkoutWin = null;
    if (!isMobileDevice) checkoutWin = window.open('', '_blank');

    const form = e.target;
    const formData = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      notes: form.notes.value.trim()
    };

    const channel = form.querySelector('input[name="channel"]:checked')?.value || 'instagram';
    const message = buildOrderMessage(formData);

    await copyToClipboard(message);

    // Record promo redemption locally
    if (appliedPromo) {
      recordPromoRedemption(appliedPromo.code);
    }

    // Capture cart snapshot for order record before mutating
    const cartSnapshot = cart.map(item => ({ id: item.id, name: item.name, size: item.size, qty: item.qty, price: item.price }));

    // Decrement local stock and save draft (and sync to Supabase if configured)
    cart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) product.stock = Math.max(0, product.stock - item.qty);
    });
    await saveDraft();

    // Build order object and try to save to Supabase (best-effort)
    const order = {
      id: generateId(),
      items: cartSnapshot,
      total: getCartTotal(),
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      notes: formData.notes,
      created_at: new Date().toISOString()
    };
    // best-effort: try to save order record to Supabase
    saveOrderToSupabase(order).catch(() => {});

    // Clear cart and UI
    cart = [];
    appliedPromo = null;
    $('#promo-input').value = '';
    $('#promo-message').classList.add('hidden');
    updateCartUI();
    renderProducts($('#search-input')?.value || '');

    closeCart();
    $('#checkout-modal').classList.add('hidden');
    form.reset();
    form.querySelector('input[name="channel"][value="instagram"]').checked = true;
    showRedirectToast();
    openCheckoutChannel(channel, message, checkoutWin);
  }

  function showWelcome() {
    $('#welcome-modal').classList.remove('hidden');
  }

  function dismissWelcome() {
    $('#welcome-modal').classList.add('hidden');
    sessionStorage.setItem(STORAGE_KEYS.welcomeSeen, '1');
  }

  function handleLogoTap() {
    adminTapCount++;
    clearTimeout(adminTapTimer);
    adminTapTimer = setTimeout(() => { adminTapCount = 0; }, 800);

    if (adminTapCount >= 3) {
      adminTapCount = 0;
      $('#admin-login').classList.remove('hidden');
    }
  }

  function openMobileNav() {
    $('#mobile-nav').classList.remove('hidden');
    $('#nav-backdrop').classList.remove('hidden');
  }

  function closeMobileNav() {
    $('#mobile-nav').classList.add('hidden');
    $('#nav-backdrop').classList.add('hidden');
  }

  function initHeroCarousel() {
    const slides = $$('.hero-slide');
    if (!slides.length) return;

    const dotsContainer = $('#hero-dots');
    dotsContainer.innerHTML = Array.from(slides).map((_, i) =>
      `<button class="hero-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`
    ).join('');

    function goTo(index) {
      heroIndex = ((index % slides.length) + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === heroIndex));
      dotsContainer.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === heroIndex));
    }

    $('#hero-prev')?.addEventListener('click', () => goTo(heroIndex - 1));
    $('#hero-next')?.addEventListener('click', () => goTo(heroIndex + 1));
    dotsContainer.querySelectorAll('.hero-dot').forEach(dot => {
      dot.addEventListener('click', () => goTo(Number(dot.dataset.index)));
    });

    clearInterval(heroTimer);
    heroTimer = setInterval(() => goTo(heroIndex + 1), 5000);
  }

  function openAdminPanel() {
    $('#admin-login').classList.add('hidden');
    $('#admin-panel').classList.remove('hidden');
    renderAdminProducts();
    renderPromoAdminList();
    $('#setting-instagram').value = settings.instagram;
    $('#setting-facebook').value = settings.facebook;
    updatePublishBanner();
    updateSizeLimitHint();
  }

  function closeAdminPanel() {
    $('#admin-panel').classList.add('hidden');
  }

  function switchAdminTab(tab) {
    $$('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.admin-tab-content').forEach(c => c.classList.add('hidden'));
    $(`#tab-${tab}`).classList.remove('hidden');
    if (tab === 'manage') renderAdminProducts();
    if (tab === 'discounts') renderPromoAdminList();
    if (tab === 'content') {
      renderHeroSlidesEditor();
      renderCollectionsEditor();
    }
  }

  async function handleAddProduct(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'UPLOADING...';

    try {
      const angle1 = form.angle1.files[0];
      if (!angle1) {
        alert('Please upload at least the main image.');
        return;
      }

      const images = [await compressImage(angle1)];
      for (const field of ['angle2', 'angle3', 'angle4']) {
        const file = form[field].files[0];
        if (file) images.push(await compressImage(file));
      }

      const stock = parseInt(form.stock.value, 10) || 0;
      let sizes = parseSizesInput(form.sizes.value);
      const requiresSize = form.requiresSize.checked || sizes.length > 0;

      if (requiresSize && sizes.length > stock) {
        sizes = validateSizesForStock(sizes, stock);
      }

      const product = normalizeProduct({
        id: generateId(),
        name: form.name.value.trim().toUpperCase(),
        subtitle: form.subtitle.value.trim().toUpperCase(),
        category: form.category.value,
        price: parseFloat(form.price.value),
        stock,
        requiresSize,
        sizes,
        discountActive: form.discountActive.checked,
        discountPercent: parseInt(form.discountPercent.value, 10) || 0,
        images
      });

      products.push(product);
      if (!(await saveDraft())) {
        products.pop();
        return;
      }

      form.reset();
      preloadProductImages();
      renderProducts($('#search-input')?.value || '');
      switchAdminTab('manage');
      alert('Product added successfully.');
    } catch (err) {
      alert('Failed to add product. Try a smaller image.\n\n' + (err?.message || ''));
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ADD PRODUCT';
    }
  }

  function renderAdminProducts() {
    const list = $('#admin-product-list');
    if (products.length === 0) {
      list.innerHTML = '<p class="cart-empty">NO PRODUCTS YET</p>';
      return;
    }

    list.innerHTML = products.map(p => {
      const priceInfo = getDisplayPrice(p);
      return `
      <div class="admin-product-item" data-id="${p.id}">
        <img src="${p.images[0] || ''}" alt="${p.name}">
        <div class="info">
          <div class="name">${p.name}</div>
          <div class="meta">${p.category} · ${formatPrice(priceInfo.sale)} · ${p.stock <= 0 ? 'SOLD OUT' : p.stock + ' stock'}</div>
          ${p.sizes.length ? `<div class="meta">Sizes: ${p.sizes.join(', ')}</div>` : ''}
        </div>
        <div class="admin-item-actions">
          <button type="button" class="edit-btn" data-id="${p.id}">EDIT</button>
          <button type="button" class="delete-btn" data-id="${p.id}">DELETE</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Delete this product?')) {
          products = products.filter(p => p.id !== btn.dataset.id);
          saveDraft();
          renderProducts($('#search-input')?.value || '');
          renderAdminProducts();
        }
      });
    });

    list.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditProduct(btn.dataset.id));
    });
  }

  function openEditProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const list = $('#admin-product-list');
    const existing = list.querySelector('.admin-edit-form');
    if (existing) existing.remove();

    const editor = document.createElement('form');
    editor.className = 'admin-edit-form';
    editor.innerHTML = `
      <div class="admin-edit-title">
        <h3>EDIT PRODUCT</h3>
        <p>Change the product details below, then press SAVE PRODUCT. Leave a field as it is if you do not want to change it.</p>
      </div>
      <label class="admin-field">
        <span>PRODUCT NAME *</span>
        <input name="name" value="${escapeHtml(p.name)}" placeholder="Example: LUSH APEX" required>
        <small>Use the name customers should see in the shop.</small>
      </label>
      <label class="admin-field">
        <span>SUBTITLE / MATERIAL</span>
        <input name="subtitle" value="${escapeHtml(p.subtitle || '')}" placeholder="Example: STAINLESS STEEL">
        <small>Optional short description, material, or style.</small>
      </label>
      <label class="admin-field">
        <span>CATEGORY *</span>
        <select name="category" required>
        ${['bracelets', 'rings', 'earrings', 'necklaces'].map(category =>
          `<option value="${category}"${p.category === category ? ' selected' : ''}>${category.toUpperCase()}</option>`
        ).join('')}
        </select>
        <small>Choose where this product appears in the shop.</small>
      </label>
      <label class="admin-field">
        <span>PRICE (PHP) *</span>
        <input type="number" name="price" value="${Number(p.price) || 0}" min="1" placeholder="Example: 200" required>
        <small>Enter the regular price in Philippine pesos.</small>
      </label>
      <label class="admin-field">
        <span>STOCK *</span>
        <input type="number" name="stock" value="${Number(p.stock) || 0}" min="0" placeholder="Example: 10" required>
        <small>Enter 0 when no items are available. The shop will show SOLD OUT.</small>
      </label>
      <label class="admin-field">
        <span>SIZES (OPTIONAL)</span>
        <input name="sizes" value="${escapeHtml((p.sizes || []).join(', '))}" placeholder="Example: 6, 7, 8, 9">
        <small>Separate sizes with commas. The number of sizes cannot exceed stock.</small>
      </label>
      <label class="admin-field">
        <span>DISCOUNT PERCENT (OPTIONAL)</span>
        <input type="number" name="discountPercent" value="${Number(p.discountPercent) || 0}" min="0" max="99" placeholder="Example: 15">
        <small>Enter 0 for no discount.</small>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" name="discountActive"${p.discountActive ? ' checked' : ''}>
        <span>Product on sale</span>
      </label>
      <div class="admin-edit-actions">
        <button type="submit" class="btn btn-solid">SAVE PRODUCT</button>
        <button type="button" class="btn btn-outline cancel-edit-btn">CANCEL</button>
      </div>`;

    list.prepend(editor);
    editor.querySelector('[name="name"]').focus();
    editor.addEventListener('submit', async (event) => {
      event.preventDefault();
      const stock = parseInt(editor.elements.stock.value, 10) || 0;
      const sizes = validateSizesForStock(parseSizesInput(editor.elements.sizes.value), stock);
      p.name = editor.elements.name.value.trim().toUpperCase();
      p.subtitle = editor.elements.subtitle.value.trim().toUpperCase();
      p.category = editor.elements.category.value;
      p.price = parseFloat(editor.elements.price.value) || p.price;
      p.stock = stock;
      p.sizes = sizes;
      p.requiresSize = sizes.length > 0;
      p.discountPercent = parseInt(editor.elements.discountPercent.value, 10) || 0;
      p.discountActive = editor.elements.discountActive.checked && p.discountPercent > 0;
      await saveDraft();
      renderProducts($('#search-input')?.value || '');
      renderAdminProducts();
      alert('Product saved successfully.');
    });
    editor.querySelector('.cancel-edit-btn').addEventListener('click', () => editor.remove());
  }

  function renderPromoAdminList() {
    const container = $('#promo-list');
    if (!settings.promos.length) {
      container.innerHTML = '<p class="cart-empty">NO PROMO CODES YET</p>';
      return;
    }

    const usage = getPromoUsage();

    container.innerHTML = settings.promos.map((promo, i) => {
      const used = Number(usage[promo.code.toUpperCase()]) || 0;
      const max = Number(promo.maxRedemptions) || 0;
      const usageLabel = max > 0 ? `Used: ${used}/${max}` : 'Unlimited';
      return `
      <div class="promo-admin-item" data-index="${i}">
        <input type="text" class="promo-code" value="${promo.code}" placeholder="CODE">
        <select class="promo-type">
          <option value="percent"${promo.type === 'percent' ? ' selected' : ''}>% OFF</option>
          <option value="fixed"${promo.type === 'fixed' ? ' selected' : ''}>PHP OFF</option>
        </select>
        <input type="number" class="promo-value" value="${promo.value}" min="1" placeholder="Value">
        <input type="number" class="promo-min" value="${promo.minOrder || 0}" min="0" placeholder="Min order">
        <input type="number" class="promo-max" value="${max || ''}" min="0" placeholder="Max redemptions (0 = unlimited)">
        <span class="field-hint promo-usage">${usageLabel}</span>
        <button type="button" class="delete-btn remove-promo-btn" data-index="${i}">× REMOVE</button>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.remove-promo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.promos.splice(Number(btn.dataset.index), 1);
        renderPromoAdminList();
      });
    });
  }

  function handleAddPromo() {
    if (!Array.isArray(settings.promos)) settings.promos = [];
    settings.promos.push({ code: 'NEWCODE', type: 'percent', value: 10, minOrder: 0, maxRedemptions: 0 });
    renderPromoAdminList();
  }

  async function handleDiscountsSave(e) {
    e.preventDefault();
    const items = $$('.promo-admin-item');
    settings.promos = Array.from(items).map(el => ({
      code: el.querySelector('.promo-code').value.trim().toUpperCase(),
      type: el.querySelector('.promo-type').value,
      value: parseFloat(el.querySelector('.promo-value').value) || 0,
      minOrder: parseFloat(el.querySelector('.promo-min').value) || 0,
      maxRedemptions: parseInt(el.querySelector('.promo-max').value, 10) || 0
    })).filter(p => p.code && p.value > 0);

    await saveSettings();
    alert('Discounts saved!');
  }

  async function handleSettings(e) {
    e.preventDefault();
    const form = e.target;
    const ig = form.instagram.value.trim().replace('@', '');
    if (ig) settings.instagram = ig;

    const fb = form.facebook.value.trim().replace('@', '');
    if (fb) settings.facebook = fb;

    const newPass = form.adminPassword.value.trim();
    const confirmPass = form.adminPasswordConfirm.value.trim();
    if (newPass) {
      if (newPass.length < 6) {
        alert('Admin password must be at least 6 characters.');
        return;
      }
      if (newPass !== confirmPass) {
        alert('New password and confirmation do not match.');
        return;
      }
      settings.adminPassword = newPass;
    } else if (confirmPass) {
      alert('Enter a new password first, or leave both password fields blank.');
      return;
    }

    await saveSettings();
    alert('Settings saved!');
    form.adminPassword.value = '';
    form.adminPasswordConfirm.value = '';
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    const pass = e.target.password.value;
    if (pass === settings.adminPassword) {
      openAdminPanel();
      e.target.reset();
    } else {
      alert('Incorrect password.');
    }
  }

  async function init() {
    await loadSettings();
    await loadProducts();

    // Render public content from settings then initialize the carousel.
    renderHeroSlides();
    initHeroCarousel();
    renderCollections();

    preloadProductImages();
    renderProducts();
    updateCartUI();

    // Prepare content editors (hidden until admin opens the panel).
    renderHeroSlidesEditor();
    renderCollectionsEditor();
    renderCollectionsEditor();

    if (!sessionStorage.getItem(STORAGE_KEYS.welcomeSeen)) {
      showWelcome();
    }

    $('#start-shopping-btn').addEventListener('click', dismissWelcome);
    $('#cart-btn').addEventListener('click', openCart);
    $('#close-cart').addEventListener('click', closeCart);
    $('#close-product').addEventListener('click', closeProductDetail);
    const saveCurrentProduct = () => {
      if (currentProduct) addToCart(currentProduct.id, selectedSize, detailQuantity);
    };
    $('#detail-save-cart').addEventListener('click', saveCurrentProduct);
    $('#detail-qty-minus').addEventListener('click', () => {
      detailQuantity = Math.max(1, detailQuantity - 1);
      $('#detail-qty').textContent = detailQuantity;
    });
    $('#detail-qty-plus').addEventListener('click', () => {
      if (!currentProduct) return;
      detailQuantity = Math.min(currentProduct.stock, detailQuantity + 1);
      $('#detail-qty').textContent = detailQuantity;
    });

    $('#checkout-form').addEventListener('submit', handleCheckout);
    $('#cart-checkout-btn').addEventListener('click', openCheckout);
    $('#close-checkout').addEventListener('click', () => $('#checkout-modal').classList.add('hidden'));
    $('#close-cart-confirmation').addEventListener('click', () => $('#cart-confirmation').classList.add('hidden'));
    $('#confirmation-continue-btn').addEventListener('click', () => $('#cart-confirmation').classList.add('hidden'));
    $('#confirmation-cart-btn').addEventListener('click', () => {
      $('#cart-confirmation').classList.add('hidden');
      openCart();
    });
    $('#apply-promo-btn').addEventListener('click', applyPromoCode);
    $('#search-input')?.addEventListener('input', (e) => renderProducts(e.target.value));
    $('#logo-trigger').addEventListener('click', handleLogoTap);

    $('#search-toggle')?.addEventListener('click', () => {
      $('#search-bar').classList.toggle('hidden');
      if (!$('#search-bar').classList.contains('hidden')) {
        $('#search-input')?.focus();
      }
    });

    $('#nav-toggle')?.addEventListener('click', openMobileNav);
    $('#mobile-nav-close')?.addEventListener('click', closeMobileNav);
    $('#nav-backdrop')?.addEventListener('click', closeMobileNav);

    $$('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveCategory(link.dataset.category);
        closeMobileNav();
      });
    });

    $$('.collection-card').forEach(card => {
      card.addEventListener('click', () => setActiveCategory(card.dataset.category));
    });

    $$('.section-link').forEach(link => {
      link.addEventListener('click', () => setActiveCategory(link.dataset.category));
    });

    $$('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => setActiveCategory(tab.dataset.category));
    });

    $('#add-stock-input')?.addEventListener('input', updateSizeLimitHint);
    $('#add-sizes-input')?.addEventListener('input', updateSizeLimitHint);

    $('#admin-login-form').addEventListener('submit', handleAdminLogin);
    $('#close-admin-login').addEventListener('click', () => $('#admin-login').classList.add('hidden'));
    $('#close-admin').addEventListener('click', closeAdminPanel);
    $('#add-product-form').addEventListener('submit', handleAddProduct);
    $('#settings-form').addEventListener('submit', handleSettings);
    $('#save-content-btn').addEventListener('click', async () => {
      renderCollections();
      renderHeroSlides();
      await saveSettings();
      alert('Hero slides and collections saved!');
    });
    $('#discounts-form').addEventListener('submit', handleDiscountsSave);
    $('#add-promo-btn').addEventListener('click', handleAddPromo);
    $('#publish-btn').addEventListener('click', publishProducts);

    // Add handler for adding new hero slides in admin
    const addHeroBtn = $('#add-hero-slide-btn');
    if (addHeroBtn) {
      addHeroBtn.addEventListener('click', async () => {
        settings.heroSlides = settings.heroSlides || [];
        settings.heroSlides.push({ src: '', title: '', subtitle: '', ctaText: '', ctaUrl: '' });
        await saveSettings();
        renderHeroSlidesEditor();
        // auto-open file input for new slide
        const editor = $('#hero-slides-editor');
        const input = editor.querySelector('input[data-index="' + (settings.heroSlides.length - 1) + '"]');
        if (input) input.click();
      });
    }
    const detailGallery = $('#detail-gallery');
    if (detailGallery) bindGallerySwipe(detailGallery);

    $$('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab));
    });

    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target !== overlay) return;
        if (overlay.id === 'welcome-modal') return;
        if (overlay.id === 'product-modal') {
          closeProductDetail();
          return;
        }
        overlay.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal-overlay:not(.hidden)').forEach(m => {
          if (m.id === 'welcome-modal') return;
          if (m.id === 'product-modal') closeProductDetail();
          else m.classList.add('hidden');
        });
        closeAdminPanel();
        closeMobileNav();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
