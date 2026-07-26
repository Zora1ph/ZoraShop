(function () {
  'use strict';

  const STORAGE_KEYS = {
    draft: 'zora_products_draft',
    settings: 'zora_settings',
    welcomeSeen: 'zora_welcome_seen'
  };

  const DEFAULT_SETTINGS = {
    instagram: 'zora.ph_',
    adminPassword: 'zora2024',
    promos: []
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
  let selectedAngleIndex = 0;
  let activeCategory = 'all';
  let appliedPromo = null;
  let adminTapCount = 0;
  let adminTapTimer = null;
  let hasUnpublishedChanges = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function normalizeProduct(p) {
    const sizes = Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [];
    return {
      ...p,
      category: p.category || 'rings',
      sizes,
      requiresSize: p.requiresSize ?? sizes.length > 0,
      discountPercent: Number(p.discountPercent) || 0,
      discountActive: Boolean(p.discountActive)
    };
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

  async function loadSettings() {
    const storedSettings = localStorage.getItem(STORAGE_KEYS.settings);
    settings = storedSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
      : { ...DEFAULT_SETTINGS };

    if (settings.instagram === 'zora.ph') settings.instagram = 'zora.ph_';
    if (!Array.isArray(settings.promos)) settings.promos = [];

    try {
      const res = await fetch('store-settings.json?t=' + Date.now());
      if (res.ok) {
        publishedStoreSettings = await res.json();
        if (!storedSettings) {
          if (publishedStoreSettings.instagram) {
            settings.instagram = publishedStoreSettings.instagram;
          }
          if (Array.isArray(publishedStoreSettings.promos)) {
            settings.promos = publishedStoreSettings.promos;
          }
        }
      }
    } catch {
      // offline or file://
    }

    if (!storedSettings) saveSettings();
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    checkUnpublishedChanges();
  }

  function getPublicStoreSettings() {
    return {
      instagram: settings.instagram,
      promos: settings.promos || []
    };
  }

  async function loadProductsFromSupabase() {
    const cfg = window.ZORA_CONFIG || {};
    if (!cfg.useSupabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;

    try {
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/products?select=*`, {
        headers: {
          apikey: cfg.supabaseAnonKey,
          Authorization: `Bearer ${cfg.supabaseAnonKey}`
        }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length ? data.map(normalizeProduct) : null;
    } catch {
      return null;
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

    const draft = localStorage.getItem(STORAGE_KEYS.draft);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (Array.isArray(parsed) && parsed.length) {
          products = parsed.map(normalizeProduct);
          checkUnpublishedChanges();
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.draft);
      }
    }

    products = publishedProducts.map(p => ({ ...p }));
    checkUnpublishedChanges();
  }

  function checkUnpublishedChanges() {
    const productsChanged = JSON.stringify(products) !== JSON.stringify(publishedProducts);
    const settingsChanged = JSON.stringify(getPublicStoreSettings()) !== JSON.stringify({
      instagram: publishedStoreSettings.instagram || settings.instagram,
      promos: publishedStoreSettings.promos || []
    });
    hasUnpublishedChanges = productsChanged || settingsChanged;
    updatePublishBanner();
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(products));
      checkUnpublishedChanges();
      return true;
    } catch (err) {
      alert(
        'Could not save product (storage full).\n\n' +
        'Tips:\n• Use smaller / fewer photos\n• Click PUBLISH TO WEBSITE then clear draft\n\n' +
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
        '<em>PUBLISH TO WEBSITE</em>, replace the JSON files, and push to GitHub.';
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

  function publishProducts() {
    downloadJson('products.json', products);
    downloadJson('store-settings.json', getPublicStoreSettings());

    publishedProducts = JSON.parse(JSON.stringify(products));
    publishedStoreSettings = getPublicStoreSettings();
    localStorage.removeItem(STORAGE_KEYS.draft);
    hasUnpublishedChanges = false;
    updatePublishBanner();

    alert(
      'products.json + store-settings.json downloaded!\n\n' +
      'TO SHOW UPDATES TO ALL CUSTOMERS:\n' +
      '1. Replace both files in your project folder\n' +
      '2. Commit & push to GitHub\n' +
      '3. Wait ~1 minute for GitHub Pages to update'
    );
  }

  function getInstagramDmUrl() {
    const username = settings.instagram.replace('@', '').trim();
    return `https://ig.me/m/${username}`;
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

  function openInstagramDm() {
    const url = getInstagramDmUrl();
    $('#instagram-fallback').href = url;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  }

  function showRedirectToast() {
    const toast = $('#redirect-toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 8000);
  }

  function formatPrice(amount) {
    return 'PHP ' + Number(amount).toFixed(2);
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
          ctx.fillStyle = '#ffffff';
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

  function preloadProductImages() {
    products.forEach(p => {
      (p.images || []).forEach(src => {
        if (!src) return;
        const img = new Image();
        img.src = src;
      });
    });
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

    grid.innerHTML = filtered.map(p => `
      <article class="product-card" data-id="${p.id}">
        <div class="img-wrap card-gallery" data-id="${p.id}">
          <div class="card-gallery-track">
            ${p.images.map((img, i) => `
              <div class="card-slide${i === 0 ? ' active' : ''}" data-index="${i}">
                <img src="${img}" alt="${p.name} angle ${i + 1}" loading="eager" decoding="async">
              </div>
            `).join('')}
          </div>
          ${p.images.length > 1 ? `
            <p class="card-swipe-hint">
              <span class="swipe-arrow swipe-arrow--left">←</span>
              SWIPE FOR ANGLES
              <span class="swipe-arrow swipe-arrow--right">→</span>
            </p>
            <div class="card-dots">
              ${p.images.map((_, i) => `<span class="card-dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join('')}
            </div>
            <button type="button" class="card-arrow card-arrow--prev" aria-label="Previous angle">‹</button>
            <button type="button" class="card-arrow card-arrow--next" aria-label="Next angle">›</button>
          ` : ''}
          ${p.discountActive && p.discountPercent ? `<span class="card-badge-discount">-${p.discountPercent}%</span>` : ''}
        </div>
        <h3 class="name">${p.name}</h3>
        ${p.subtitle ? `<p class="subtitle">${p.subtitle}</p>` : ''}
        <p class="stock">${p.stock} ITEMS AVAILABLE</p>
        <div class="price">${renderPriceHtml(p)}</div>
        <button class="btn btn-outline add-btn" data-id="${p.id}">ADD TO CART</button>
      </article>
    `).join('');

    bindCardGalleries();

    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-btn')) return;
        if (e.target.closest('.card-arrow')) return;
        if (card.dataset.swiped === '1') return;
        openProductDetail(card.dataset.id);
      });
    });

    grid.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const product = products.find(p => p.id === btn.dataset.id);
        if (product && product.requiresSize && product.sizes.length) {
          openProductDetail(product.id);
        } else {
          addToCart(product.id);
        }
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

      let mouseDown = false;
      gallery.addEventListener('mousedown', (e) => {
        mouseDown = true;
        startX = e.clientX;
      });
      gallery.addEventListener('mouseup', (e) => {
        if (!mouseDown) return;
        mouseDown = false;
        const diff = e.clientX - startX;
        if (Math.abs(diff) < 40) return;
        if (card) {
          card.dataset.swiped = '1';
          setTimeout(() => { card.dataset.swiped = '0'; }, 300);
        }
        setCardSlide(gallery, Number(gallery.dataset.angle) + (diff < 0 ? 1 : -1));
      });
      gallery.addEventListener('mouseleave', () => { mouseDown = false; });
    });
  }

  function setDetailAngle(index) {
    if (!currentProduct) return;
    const images = currentProduct.images;
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
    selectedAngleIndex = 0;

    $('#detail-name').textContent = currentProduct.name;
    $('#detail-subtitle').textContent = currentProduct.subtitle || '';
    $('#detail-stock').textContent = currentProduct.stock + ' ITEMS AVAILABLE';
    $('#detail-price-wrap').innerHTML = renderPriceHtml(currentProduct, true);

    const mainImg = $('#detail-main-img');
    mainImg.src = currentProduct.images[0];
    mainImg.alt = currentProduct.name;

    const thumbs = $('#angle-thumbs');
    thumbs.innerHTML = currentProduct.images.map((img, i) =>
      `<img src="${img}" alt="Angle ${i + 1}" class="${i === 0 ? 'active' : ''}" data-index="${i}">`
    ).join('');

    thumbs.querySelectorAll('img').forEach(thumb => {
      thumb.addEventListener('click', () => setDetailAngle(Number(thumb.dataset.index)));
    });

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
  }

  function closeProductDetail() {
    $('#product-modal').classList.add('hidden');
    currentProduct = null;
    selectedSize = null;
  }

  function addToCart(id, size = null) {
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

    if (existing) {
      if (existing.qty >= product.stock) {
        alert('Maximum stock reached for this item.');
        return;
      }
      existing.qty++;
    } else {
      cart.push({
        id,
        cartKey: key,
        name: product.name,
        size: size || null,
        price: unitPrice,
        qty: 1
      });
    }

    updateCartUI();
    closeProductDetail();
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
    return { valid: true, promo };
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

    $('#cart-subtotal').textContent = formatPrice(subtotal);
    $('#cart-discount').textContent = '- ' + formatPrice(discount);
    $('#cart-total').textContent = formatPrice(total);

    $('#cart-subtotal-row').classList.toggle('hidden', !appliedPromo || discount === 0);
    $('#cart-discount-row').classList.toggle('hidden', !appliedPromo || discount === 0);

    const container = $('#cart-items');
    if (cart.length === 0) {
      container.innerHTML = '<p class="cart-empty">YOUR CART IS EMPTY</p>';
      return;
    }

    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}${item.size ? ` (${item.size})` : ''}</div>
          <div class="cart-item-price">${formatPrice(item.price)} × ${item.qty}</div>
        </div>
        <div class="cart-item-controls">
          <button type="button" data-qty="${item.cartKey}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button type="button" data-qty="${item.cartKey}" data-delta="1">+</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        changeQty(btn.dataset.qty, Number(btn.dataset.delta));
      });
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
    msg.textContent = `Promo "${result.promo.code}" applied!`;
    msg.classList.remove('hidden', 'promo-message--error');
    updateCartUI();
  }

  function openCart() {
    updateCartUI();
    $('#cart-modal').classList.remove('hidden');
  }

  function closeCart() {
    $('#cart-modal').classList.add('hidden');
  }

  function buildOrderMessage(formData) {
    const subtotal = getCartSubtotal();
    const discount = getPromoDiscount(subtotal);
    const lines = [
      '🛍️ NEW ORDER — ZORA.PH',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      '📦 ITEMS:'
    ];

    cart.forEach(item => {
      const label = item.size ? `${item.name} (${item.size})` : item.name;
      lines.push(`  • ${label} × ${item.qty} — ${formatPrice(item.price * item.qty)}`);
    });

    lines.push('');
    if (appliedPromo && discount > 0) {
      lines.push(`🏷️ PROMO: ${appliedPromo.code}`);
      lines.push(`💸 DISCOUNT: -${formatPrice(discount)}`);
    }
    lines.push(`💰 TOTAL: ${formatPrice(getCartTotal())}`);
    lines.push('');
    lines.push('👤 CUSTOMER DETAILS:');
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

    const form = e.target;
    const formData = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      notes: form.notes.value.trim()
    };

    const message = buildOrderMessage(formData);
    await copyToClipboard(message);

    cart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) product.stock = Math.max(0, product.stock - item.qty);
    });
    saveDraft();
    cart = [];
    appliedPromo = null;
    $('#promo-input').value = '';
    $('#promo-message').classList.add('hidden');
    updateCartUI();
    renderProducts($('#search-input').value);

    closeCart();
    form.reset();
    showRedirectToast();
    openInstagramDm();
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

  function openAdminPanel() {
    $('#admin-login').classList.add('hidden');
    $('#admin-panel').classList.remove('hidden');
    renderAdminProducts();
    renderPromoAdminList();
    $('#setting-instagram').value = settings.instagram;
    updatePublishBanner();
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
        else images.push(images[images.length - 1]);
      }
      while (images.length < 4) images.push(images[0]);

      const sizes = parseSizesInput(form.sizes.value);
      const requiresSize = form.requiresSize.checked || sizes.length > 0;

      const product = normalizeProduct({
        id: generateId(),
        name: form.name.value.trim().toUpperCase(),
        subtitle: form.subtitle.value.trim().toUpperCase(),
        category: form.category.value,
        price: parseFloat(form.price.value),
        stock: parseInt(form.stock.value, 10),
        requiresSize,
        sizes,
        discountActive: form.discountActive.checked,
        discountPercent: parseInt(form.discountPercent.value, 10) || 0,
        images: images.slice(0, 4)
      });

      products.push(product);
      if (!saveDraft()) {
        products.pop();
        return;
      }

      form.reset();
      preloadProductImages();
      renderProducts($('#search-input').value);
      switchAdminTab('manage');
      alert('Product added. Publish to show all customers.');
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
        <img src="${p.images[0]}" alt="${p.name}">
        <div class="info">
          <div class="name">${p.name}</div>
          <div class="meta">${p.category} · ${formatPrice(priceInfo.sale)} · ${p.stock} stock</div>
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
          renderProducts($('#search-input').value);
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

    const newName = prompt('Product name:', p.name);
    if (newName === null) return;
    const newPrice = prompt('Price (PHP):', p.price);
    if (newPrice === null) return;
    const newStock = prompt('Stock:', p.stock);
    if (newStock === null) return;
    const newSizes = prompt('Sizes (comma-separated, leave empty if none):', p.sizes.join(', '));
    if (newSizes === null) return;
    const newDiscount = prompt('Discount % (0 for none):', p.discountPercent);
    if (newDiscount === null) return;

    p.name = newName.trim().toUpperCase();
    p.price = parseFloat(newPrice) || p.price;
    p.stock = parseInt(newStock, 10) || 0;
    p.sizes = parseSizesInput(newSizes);
    p.requiresSize = p.sizes.length > 0;
    p.discountPercent = parseInt(newDiscount, 10) || 0;
    p.discountActive = p.discountPercent > 0;

    saveDraft();
    renderProducts($('#search-input').value);
    renderAdminProducts();
  }

  function renderPromoAdminList() {
    const container = $('#promo-list');
    if (!settings.promos.length) {
      container.innerHTML = '<p class="cart-empty">NO PROMO CODES YET</p>';
      return;
    }

    container.innerHTML = settings.promos.map((promo, i) => `
      <div class="promo-admin-item" data-index="${i}">
        <input type="text" class="promo-code" value="${promo.code}" placeholder="CODE">
        <select class="promo-type">
          <option value="percent"${promo.type === 'percent' ? ' selected' : ''}>% OFF</option>
          <option value="fixed"${promo.type === 'fixed' ? ' selected' : ''}>PHP OFF</option>
        </select>
        <input type="number" class="promo-value" value="${promo.value}" min="1" placeholder="Value">
        <input type="number" class="promo-min" value="${promo.minOrder || 0}" min="0" placeholder="Min order">
        <button type="button" class="delete-btn remove-promo-btn" data-index="${i}">×</button>
      </div>
    `).join('');

    container.querySelectorAll('.remove-promo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.promos.splice(Number(btn.dataset.index), 1);
        renderPromoAdminList();
      });
    });
  }

  function handleAddPromo() {
    if (!Array.isArray(settings.promos)) settings.promos = [];
    settings.promos.push({ code: 'NEWCODE', type: 'percent', value: 10, minOrder: 0 });
    renderPromoAdminList();
  }

  function handleDiscountsSave(e) {
    e.preventDefault();
    const items = $$('.promo-admin-item');
    settings.promos = Array.from(items).map(el => ({
      code: el.querySelector('.promo-code').value.trim().toUpperCase(),
      type: el.querySelector('.promo-type').value,
      value: parseFloat(el.querySelector('.promo-value').value) || 0,
      minOrder: parseFloat(el.querySelector('.promo-min').value) || 0
    })).filter(p => p.code && p.value > 0);

    saveSettings();
    alert('Discounts saved! Publish to show customers.');
  }

  function handleSettings(e) {
    e.preventDefault();
    const form = e.target;
    const ig = form.instagram.value.trim().replace('@', '');
    if (ig) settings.instagram = ig;

    const newPass = form.adminPassword.value.trim();
    if (newPass) settings.adminPassword = newPass;

    saveSettings();
    alert('Settings saved!');
    form.adminPassword.value = '';
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
    preloadProductImages();
    renderProducts();
    updateCartUI();

    if (!sessionStorage.getItem(STORAGE_KEYS.welcomeSeen)) {
      showWelcome();
    }

    $('#start-shopping-btn').addEventListener('click', dismissWelcome);

    $('#cart-btn').addEventListener('click', openCart);
    $('#close-cart').addEventListener('click', closeCart);
    $('#close-product').addEventListener('click', closeProductDetail);
    $('#detail-add-cart').addEventListener('click', () => {
      if (currentProduct) addToCart(currentProduct.id, selectedSize);
    });

    $('#checkout-form').addEventListener('submit', handleCheckout);
    $('#apply-promo-btn').addEventListener('click', applyPromoCode);
    $('#search-input').addEventListener('input', (e) => renderProducts(e.target.value));
    $('#logo-trigger').addEventListener('click', handleLogoTap);

    $$('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeCategory = tab.dataset.category;
        renderProducts($('#search-input').value);
      });
    });

    $('#admin-login-form').addEventListener('submit', handleAdminLogin);
    $('#close-admin-login').addEventListener('click', () => $('#admin-login').classList.add('hidden'));
    $('#close-admin').addEventListener('click', closeAdminPanel);
    $('#add-product-form').addEventListener('submit', handleAddProduct);
    $('#settings-form').addEventListener('submit', handleSettings);
    $('#discounts-form').addEventListener('submit', handleDiscountsSave);
    $('#add-promo-btn').addEventListener('click', handleAddPromo);
    $('#publish-btn').addEventListener('click', publishProducts);

    const detailGallery = $('#detail-gallery');
    if (detailGallery) bindGallerySwipe(detailGallery);

    $$('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab));
    });

    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target !== overlay) return;
        if (overlay.id === 'welcome-modal') return;
        overlay.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal-overlay:not(.hidden)').forEach(m => {
          if (m.id !== 'welcome-modal') m.classList.add('hidden');
        });
        closeAdminPanel();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
