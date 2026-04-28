const firebaseConfig = {
  apiKey: "AIzaSyCa65Smn_puWDXiyU5p_K9JprJ0wk42CuE",
  authDomain: "zora-shop.firebaseapp.com",
  databaseURL: "https://zora-shop-default-rtdb.asia-southeast1.firebasedatabase.app/", 
  projectId: "zora-shop",
  storageBucket: "zora-shop.firebasestorage.app",
  messagingSenderId: "356467694213",
  appId: "1:356467694213:web:485855acc743e71f00a7ec",
  measurementId: "G-9VZQMW3W9Y"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const INSTAGRAM_USERNAME = "zora.ph_";

let products = [];
let cart = [];

// 1. POPUP CONTROL
function closeWelcome() {
    document.getElementById('welcome-modal').style.display = 'none';
}

// 2. LIVE DATA SYNC
db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.values(data) : [];
    renderStore();
});

// 3. RENDER SHOP (Includes Stock Overlays)
function renderStore(data = products) {
    const grid = document.getElementById('shop-grid');
    if(!grid) return;
    
    grid.innerHTML = data.map(p => {
        const isOut = p.stocks <= 0;
        return `
        <div class="product-card p-4 ${isOut ? 'opacity-50' : ''}">
            <div class="img-container mb-6 bg-white relative">
                <img src="${p.img}" alt="${p.name}" class="max-h-full max-w-full object-contain ${isOut ? 'grayscale' : ''}">
                ${isOut ? '<div class="absolute inset-0 flex items-center justify-center bg-black/60 text-white modern-bold text-lg">SOLD OUT</div>' : ''}
            </div>
            <h3 class="modern-bold text-center text-xl mb-1 text-white uppercase">${p.name}</h3>
            <p class="text-center text-[10px] text-zinc-500 mb-2 uppercase">${p.stocks || 0} items available</p>
            <p class="modern-bold text-center text-2xl mb-8">PHP ${p.price.toLocaleString()}</p>
            <button onclick="${isOut ? '' : `addToCart(${p.id})`}" class="modern-bold w-full border border-white py-4 text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">
                ${isOut ? 'OUT OF STOCK' : 'ADD TO CART'}
            </button>
        </div>`
    }).join('');
    renderAdminList();
}

// 4. ADMIN: ADD PRODUCT
function addNewProduct() {
    const name = document.getElementById('add-name').value;
    const price = document.getElementById('add-price').value;
    const stocks = document.getElementById('add-stocks').value || 0;
    const img = document.getElementById('add-img').value;
    const desc = document.getElementById('add-desc').value;

    if(!name || !price) return alert("MISSING INFO");
    const id = Date.now();
    db.ref('products/' + id).set({
        id, name, price: parseFloat(price), stocks: parseInt(stocks), desc, img: img || 'https://via.placeholder.com/400'
    });
    alert("PRODUCT ADDED!");
}

// 5. CART LOGIC (With Max Stock Limit)
function addToCart(id) {
    const product = products.find(p => p.id === id);
    const exists = cart.find(c => c.id === id);
    if(exists) {
        if(exists.qty < product.stocks) exists.qty++;
        else alert("NO MORE STOCK AVAILABLE");
    } else {
        cart.push({...product, qty: 1});
    }
    updateCartUI();
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    const prod = products.find(p => p.id === id);
    if(!item) return;
    if(delta > 0 && item.qty >= prod.stocks) return alert("NO MORE STOCK!");
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(c => c.id !== id);
    updateCartUI();
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    if(countEl) countEl.innerText = cart.reduce((acc, i) => acc + i.qty, 0);
    const list = document.getElementById('cart-items');
    if(list) {
        list.innerHTML = cart.map(i => `
            <div class="flex items-center justify-between border-b border-zinc-900 pb-6 mb-6">
                <div class="flex items-center gap-4">
                    <img src="${i.img}" class="w-16 h-16 object-cover bg-white">
                    <div>
                        <p class="modern-bold text-white text-[10px] uppercase">${i.name}</p>
                        <p class="text-[9px] text-zinc-500">PHP ${i.price.toLocaleString()}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 text-white">
                    <button onclick="changeQty(${i.id}, -1)" class="w-8 h-8 border border-zinc-800 flex items-center justify-center">-</button>
                    <span class="text-xs w-4 text-center">${i.qty}</span>
                    <button onclick="changeQty(${i.id}, 1)" class="w-8 h-8 border border-zinc-800 flex items-center justify-center">+</button>
                </div>
            </div>`).join('');
    }
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = "PHP " + total.toLocaleString();
}

// 6. CHECKOUT: FIXED FOR IOS COPY/PASTE
async function checkout() {
    if(cart.length === 0) return alert("EMPTY CART");
    
    // UPDATED: Forced location to Poblacion
    const loc = "Poblacion";
    const deliveryTime = "6:00 PM to 8:00 PM";

    // A. PREPARE TEXT (Updated branding and delivery info)
    let text = `ORDER FROM ZORA.PH:\n\n`;
    cart.forEach(i => text += `• ${i.qty}x ${i.name} (PHP ${i.price * i.qty})\n`);
    text += `\nTotal: PHP ${cart.reduce((s, i) => s + (i.price * i.qty), 0)}\n\nLocation: ${loc} 📍\nDelivery Time: ${deliveryTime} ⏰`;

    // B. IMMEDIATE COPY
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 99999);
        document.execCommand('copy');
        document.body.removeChild(textArea);
    } catch (err) {
        console.error('Copy failed', err);
    }

    // C. UPDATE DATABASE STOCKS
    const updates = {};
    cart.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        if(p) updates[`/products/${item.id}/stocks`] = Math.max(0, p.stocks - item.qty);
    });
    db.ref().update(updates);

    // D. REDIRECT
    alert(`✅ ORDER PREPARED!\n\nLocation: ${loc.toUpperCase()}\nDelivery: ${deliveryTime}\n\nDetails have been COPIED. Please PASTE them in our Instagram messages!`);
    window.location.href = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
    
    cart = []; 
    updateCartUI(); 
    toggleCart();
    document.getElementById('thanks-banner').style.display = 'block';
}

function filterStore() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    renderStore(products.filter(p => p.name.toLowerCase().includes(q)));
}

function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }
function closeThanks() { document.getElementById('thanks-banner').style.display = 'none'; }

function renderAdminList() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = products.map(p => `
        <div class="flex justify-between py-2 border-b border-zinc-900">
            <span class="text-[10px] uppercase text-white">${p.name} (Qty: ${p.stocks})</span>
            <button onclick="if(confirm('Delete?')) db.ref('products/${p.id}').remove()" class="text-red-900 text-[10px]">DELETE</button>
        </div>`).join('');
}

// 7. ADMIN TRIGGER
let buffer = "";
window.addEventListener("keydown", (e) => {
    buffer += e.key;
    if (buffer.includes("admin123")) {
        document.getElementById('admin-panel').style.display = 'block';
        buffer = ""; alert("OWNER ACCESS GRANTED");
    }
});
