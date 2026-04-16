// 1. CLOUD CONFIG
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

// 2. LIVE DATA SYNC
db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.values(data) : [];
    renderStore();
});

// 3. RENDER SHOP
function renderStore(data = products) {
    const grid = document.getElementById('shop-grid');
    if(!grid) return;
    
    grid.innerHTML = data.map(p => {
        const isOutOfStock = p.stocks <= 0;
        return `
        <div class="product-card p-4 ${isOutOfStock ? 'opacity-50' : ''}">
            <div class="img-container mb-6 bg-white relative overflow-hidden">
                <img src="${p.img}" alt="${p.name}" class="max-h-full max-w-full object-contain ${isOutOfStock ? 'grayscale' : ''}">
                ${isOutOfStock ? '<div class="absolute inset-0 flex items-center justify-center bg-black/60 text-white modern-bold text-lg tracking-widest uppercase">Sold Out</div>' : ''}
            </div>
            <h3 class="modern-bold text-center text-xl mb-1 text-white uppercase">${p.name}</h3>
            <p class="text-center text-[10px] text-zinc-500 mb-2 uppercase tracking-tighter">${p.stocks > 0 ? `${p.stocks} pieces remaining` : 'Waiting for restock'}</p>
            <p class="modern-bold text-center text-2xl mb-8 text-white font-black">PHP ${p.price.toLocaleString()}</p>
            <button onclick="${isOutOfStock ? '' : `addToCart(${p.id})`}" 
                    class="modern-bold w-full border border-white py-4 text-[10px] tracking-widest transition-all ${isOutOfStock ? 'cursor-not-allowed border-zinc-800 text-zinc-800' : 'hover:bg-white hover:text-black'}">
                ${isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
            </button>
        </div>
    `}).join('');
    renderAdminList();
}

// 4. ADMIN: ADD PRODUCT
function addNewProduct() {
    const name = document.getElementById('add-name').value;
    const price = document.getElementById('add-price').value;
    const img = document.getElementById('add-img').value;
    const desc = document.getElementById('add-desc').value;
    const stocks = document.getElementById('add-stocks').value || 0;

    if(!name || !price) return alert("Please enter at least a Name and Price.");
    
    const id = Date.now();
    const newProduct = { 
        id: id, 
        name: name, 
        price: parseFloat(price), 
        stocks: parseInt(stocks),
        desc: desc || '',
        img: img || 'https://via.placeholder.com/400'
    };

    db.ref('products/' + id).set(newProduct);
    ['add-name', 'add-price', 'add-img', 'add-desc', 'add-stocks'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    alert("PRODUCT ADDED SUCCESSFULLY!");
}

// 5. CHECKOUT (FIXED FOR LOCATION)
async function checkout() {
    if(cart.length === 0) return alert("Your cart is empty!");

    const selectedLocation = document.getElementById('user-location').value;

    for (let item of cart) {
        const p = products.find(prod => prod.id === item.id);
        if (p.stocks < item.qty) return alert(`Sorry, only ${p.stocks} left of ${p.name}`);
    }

    const updates = {};
    cart.forEach(item => {
        const currentProduct = products.find(p => p.id === item.id);
        updates[`/products/${item.id}/stocks`] = currentProduct.stocks - item.qty;
    });
    
    await db.ref().update(updates);

    let orderDetails = `ORDER FROM ZORA.PH:\n\n`;
    cart.forEach(i => orderDetails += `• ${i.qty}x ${i.name} (PHP ${i.price * i.qty})\n`);
    orderDetails += `\nTotal: PHP ${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}\n\nLocation: ${selectedLocation} 📍`;

    try { await navigator.clipboard.writeText(orderDetails); } catch (err) { }
    
    // Show banner
    document.getElementById('thanks-banner').style.display = 'block';
    
    window.location.href = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
    
    cart = []; 
    updateCartUI(); 
    toggleCart();
}

// --- UTILITIES ---
function addToCart(id) {
    const product = products.find(p => p.id === id);
    const exists = cart.find(c => c.id === id);
    if(exists) {
        if(exists.qty < product.stocks) exists.qty++;
        else alert("You've reached the maximum stock available!");
    } else {
        cart.push({...product, qty: 1});
    }
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
                    <img src="${i.img}" class="w-16 h-16 object-cover bg-white p-1">
                    <div>
                        <p class="modern-bold text-white text-sm uppercase">${i.name}</p>
                        <p class="text-[10px] text-zinc-500">PHP ${i.price.toLocaleString()}</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 text-white">
                    <button onclick="changeQty(${i.id}, -1)" class="w-6 h-6 border border-zinc-800">-</button>
                    <span class="text-sm">${i.qty}</span>
                    <button onclick="changeQty(${i.id}, 1)" class="w-6 h-6 border border-zinc-800">+</button>
                </div>
            </div>
        `).join('');
    }
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const totalEl = document.getElementById('cart-total');
    if(totalEl) totalEl.innerText = "PHP " + total.toLocaleString();
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    const product = products.find(p => p.id === id);
    if(!item) return;
    if(delta > 0 && item.qty >= product.stocks) return alert("No more stock!");
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(c => c.id !== id);
    updateCartUI();
}

function filterStore() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q));
    renderStore(filtered);
}

function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }
function closeThanks() { document.getElementById('thanks-banner').style.display = 'none'; }

function removeProduct(id) {
    if(confirm("Delete this product permanently?")) db.ref('products/' + id).remove();
}

function renderAdminList() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = products.map(p => `
        <div class="flex justify-between items-center border-b border-zinc-900 py-2">
            <span class="text-[10px] text-white uppercase">${p.name} (${p.stocks} left)</span>
            <button onclick="removeProduct(${p.id})" class="text-red-900 text-[10px]">DELETE</button>
        </div>
    `).join('');
}

let inputBuffer = "";
window.addEventListener("keydown", (e) => {
    inputBuffer += e.key.toLowerCase();
    if (inputBuffer.includes("admin123")) {
        const panel = document.getElementById('admin-panel');
        if(panel) panel.style.display = 'block';
        inputBuffer = "";
        alert("ZORA OWNER ACCESS GRANTED");
    }
    if (inputBuffer.length > 20) inputBuffer = ""; 
});
