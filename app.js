(function () {
  'use strict';

  const STORAGE_KEYS = {
    draft: 'zora_products_draft',
    settings: 'zora_settings'
  };

  const DEFAULT_SETTINGS = {
    instagram: 'zora.ph_',
    adminPassword: 'zora2024'
  };

  const DEFAULT_PRODUCTS = [
    {
      id: '1',
      name: 'LUSH APEX',
      subtitle: 'STAINLESS STEEL',
      price: 65,
      stock: 9,
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
      price: 80,
      stock: 43,
      images: [
        'https://images.unsplash.com/photo-1617038260897-41a6084a5560?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1515562141203-7a88fb7ce338?w=400&h=400&fit=crop',
        'https://images.unsplash.com/photo-1603561596112-0a132756a22f?w=400&h=400&fit=crop'
      ]
    },
    {
      id: '3',
      name: 'ROPE CHAIN SILVER 19CM',
      subtitle: '925 SILVER PLATED',
      price: 150,
      stock: 47,
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
      price: 150,
      stock: 10,
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
  let settings = {};
  let cart = [];
  let currentProduct = null;
  let adminTapCount = 0;
  let adminTapTimer = null;
  let hasUnpublishedChanges = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function loadSettings() {
    const storedSettings = localStorage.getItem(STORAGE_KEYS.settings);
    settings = storedSettings
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) }
      : { ...DEFAULT_SETTINGS };
    if (settings.instagram === 'zora.ph') settings.instagram = 'zora.ph_';
    if (!storedSettings) saveSettings();
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }

  async function loadProducts() {
    // 1) Live catalog everyone sees (products.json on GitHub / local folder)
    try {
      const res = await fetch('products.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          publishedProducts = data;
        }
      }
    } catch {
      // file:// or missing file — use defaults
    }

    if (!publishedProducts.length) {
      publishedProducts = [...DEFAULT_PRODUCTS];
    }

    // 2) Admin draft (only on this device) — preview before publishing
    const draft = localStorage.getItem(STORAGE_KEYS.draft);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (Array.isArray(parsed) && parsed.length) {
          products = parsed;
          hasUnpublishedChanges = JSON.stringify(parsed) !== JSON.stringify(publishedProducts);
          updatePublishBanner();
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.draft);
      }
    }

    products = [...publishedProducts];
    hasUnpublishedChanges = false;
    updatePublishBanner();
  }

  function saveDraft() {
    try {
      localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(products));
      hasUnpublishedChanges = true;
      updatePublishBanner();
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
        '<strong>UNPUBLISHED CHANGES</strong> — Customers will NOT see new products until you click ' +
        '<em>PUBLISH TO WEBSITE</em>, replace <code>products.json</code> in VS Code, and push to GitHub.';
    } else {
      banner.classList.add('hidden');
    }
  }

  function publishProducts() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    publishedProducts = JSON.parse(JSON.stringify(products));
    localStorage.removeItem(STORAGE_KEYS.draft);
    hasUnpublishedChanges = false;
    updatePublishBanner();

    alert(
      'products.json downloaded!\n\n' +
      'TO SHOW PRODUCTS TO ALL CUSTOMERS:\n' +
      '1. Put this file in your project folder (replace the old products.json)\n' +
      '2. In VS Code / GitHub: commit & push\n' +
      '3. Wait ~1 minute for GitHub Pages to update\n\n' +
      'Until you push, only YOU see the new products on this device.'
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

  /** Compress image so products.json / storage stay small */
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

  function renderProducts(filter = '') {
    const grid = $('#product-grid');
    const term = filter.toLowerCase().trim();
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(term))
    );

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="cart-empty" style="grid-column:1/-1">NO PRODUCTS FOUND</p>';
      return;
    }

    grid.innerHTML = filtered.map(p => `
      <article class="product-card" data-id="${p.id}">
        <div class="img-wrap">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
        </div>
        <h3 class="name">${p.name}</h3>
        ${p.subtitle ? `<p class="subtitle">${p.subtitle}</p>` : ''}
        <p class="stock">${p.stock} ITEMS AVAILABLE</p>
        <p class="price">${formatPrice(p.price)}</p>
        <button class="btn btn-outline add-btn" data-id="${p.id}">ADD TO CART</button>
      </article>
    `).join('');

    grid.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-btn')) return;
        openProductDetail(card.dataset.id);
      });
    });

    grid.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.dataset.id);
      });
    });
  }

  function openProductDetail(id) {
    currentProduct = products.find(p => p.id === id);
    if (!currentProduct) return;

    $('#detail-name').textContent = currentProduct.name;
    $('#detail-subtitle').textContent = currentProduct.subtitle || '';
    $('#detail-stock').textContent = currentProduct.stock + ' ITEMS AVAILABLE';
    $('#detail-price').textContent = formatPrice(currentProduct.price);

    const mainImg = $('#detail-main-img');
    mainImg.src = currentProduct.images[0];
    mainImg.alt = currentProduct.name;

    const thumbs = $('#angle-thumbs');
    thumbs.innerHTML = currentProduct.images.map((img, i) =>
      `<img src="${img}" alt="Angle ${i + 1}" class="${i === 0 ? 'active' : ''}" data-index="${i}">`
    ).join('');

    thumbs.querySelectorAll('img').forEach(thumb => {
      thumb.addEventListener('click', () => {
        thumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        mainImg.src = currentProduct.images[thumb.dataset.index];
      });
    });

    $('#product-modal').classList.remove('hidden');
  }

  function closeProductDetail() {
    $('#product-modal').classList.add('hidden');
    currentProduct = null;
  }

  function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product || product.stock <= 0) {
      alert('Sorry, this item is out of stock.');
      return;
    }

    const existing = cart.find(item => item.id === id);
    if (existing) {
      if (existing.qty >= product.stock) {
        alert('Maximum stock reached for this item.');
        return;
      }
      existing.qty++;
    } else {
      cart.push({ id, name: product.name, price: product.price, qty: 1 });
    }

    updateCartUI();
    closeProductDetail();
  }

  function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
  }

  function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    const product = products.find(p => p.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(id);
    } else if (product && item.qty > product.stock) {
      item.qty = product.stock;
    } else {
      updateCartUI();
    }
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    $('#cart-count').textContent = count;
    $('#cart-total').textContent = formatPrice(getCartTotal());

    const container = $('#cart-items');
    if (cart.length === 0) {
      container.innerHTML = '<p class="cart-empty">YOUR CART IS EMPTY</p>';
      return;
    }

    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${formatPrice(item.price)} × ${item.qty}</div>
        </div>
        <div class="cart-item-controls">
          <button type="button" data-qty="${item.id}" data-delta="-1">−</button>
          <span>${item.qty}</span>
          <button type="button" data-qty="${item.id}" data-delta="1">+</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-qty]').forEach(btn => {
      btn.addEventListener('click', () => {
        changeQty(btn.dataset.qty, Number(btn.dataset.delta));
      });
    });
  }

  function openCart() {
    updateCartUI();
    $('#cart-modal').classList.remove('hidden');
  }

  function closeCart() {
    $('#cart-modal').classList.add('hidden');
  }

  function buildOrderMessage(formData) {
    const lines = [
      '🛍️ NEW ORDER — ZORA.PH',
      '━━━━━━━━━━━━━━━━━━━━',
      '',
      '📦 ITEMS:'
    ];

    cart.forEach(item => {
      lines.push(`  • ${item.name} × ${item.qty} — ${formatPrice(item.price * item.qty)}`);
    });

    lines.push('');
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

    // Stock changes stay local until you publish products.json again
    cart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) product.stock = Math.max(0, product.stock - item.qty);
    });
    saveDraft();
    cart = [];
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
        if (file) {
          images.push(await compressImage(file));
        } else {
          images.push(images[images.length - 1]);
        }
      }

      while (images.length < 4) images.push(images[0]);

      const product = {
        id: generateId(),
        name: form.name.value.trim().toUpperCase(),
        subtitle: form.subtitle.value.trim().toUpperCase(),
        price: parseFloat(form.price.value),
        stock: parseInt(form.stock.value, 10),
        images: images.slice(0, 4)
      };

      products.push(product);
      if (!saveDraft()) {
        products.pop();
        return;
      }

      form.reset();
      renderProducts($('#search-input').value);
      switchAdminTab('manage');
      alert(
        'Product added on THIS device.\n\n' +
        'Customers will NOT see it until you click PUBLISH TO WEBSITE and push products.json to GitHub.'
      );
    } catch (err) {
      alert('Failed to add product. Try a smaller image.\n\n' + (err && err.message ? err.message : ''));
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

    list.innerHTML = products.map(p => `
      <div class="admin-product-item">
        <img src="${p.images[0]}" alt="${p.name}">
        <div class="info">
          <div class="name">${p.name}</div>
          <div class="meta">${formatPrice(p.price)} · ${p.stock} in stock</div>
        </div>
        <button type="button" class="delete-btn" data-id="${p.id}">DELETE</button>
      </div>
    `).join('');

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
    loadSettings();
    await loadProducts();
    renderProducts();
    updateCartUI();
    showWelcome();

    $('#start-shopping-btn').addEventListener('click', dismissWelcome);
    $('#cart-btn').addEventListener('click', openCart);
    $('#close-cart').addEventListener('click', closeCart);
    $('#close-product').addEventListener('click', closeProductDetail);
    $('#detail-add-cart').addEventListener('click', () => {
      if (currentProduct) addToCart(currentProduct.id);
    });

    $('#checkout-form').addEventListener('submit', handleCheckout);
    $('#search-input').addEventListener('input', (e) => renderProducts(e.target.value));
    $('#logo-trigger').addEventListener('click', handleLogoTap);

    $('#admin-login-form').addEventListener('submit', handleAdminLogin);
    $('#close-admin-login').addEventListener('click', () => $('#admin-login').classList.add('hidden'));
    $('#close-admin').addEventListener('click', closeAdminPanel);
    $('#add-product-form').addEventListener('submit', handleAddProduct);
    $('#settings-form').addEventListener('submit', handleSettings);
    $('#publish-btn').addEventListener('click', publishProducts);

    $$('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab));
    });

    $$('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target !== overlay) return;
        overlay.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
        closeAdminPanel();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
