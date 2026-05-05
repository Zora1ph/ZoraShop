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

function closeWelcome() { document.getElementById('welcome-modal').style.display = 'none'; }

// --- DATABASE SYNC ---
db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.values(data) : [];
    renderStore();
    renderInventory();
});

// --- RENDER SHOP ---
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
}

// --- CART FUNCTIONS ---
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
    const totalElement = document.getElementById('cart-total');
    if(totalElement) totalElement.innerText = "PHP " + total.toLocaleString();
}

// --- ADMIN PANEL LOGIC ---
function renderInventory() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = products.map(p => `
        <div class="flex justify-between items-center border-b border-zinc-900 py-2">
            <span class="text-[10px] text-white uppercase font-bold">${p.name} (Qty: ${p.stocks})</span>
            <button onclick="deleteProduct(${p.id})" class="text-red-500 text-[10px] uppercase font-bold">Delete</button>
        </div>
    `).join('');
}

function addNewProduct() {
    const name = document.getElementById('add-name').value;
    const price = parseInt(document.getElementById('add-price').value);
    const stocks = parseInt(document.getElementById('add-stocks').value);
    const img = document.getElementById('add-img').value;
    const id = Date.now();
    if(!name || !price || !img) return alert("Fill all fields");
    db.ref('products/' + id).set({ id, name, price, stocks, img }).then(() => {
        alert("Product Added to Zora.ph!");
        document.getElementById('add-name').value = '';
        document.getElementById('add-price').value = '';
        document.getElementById('add-stocks').value = '';
        document.getElementById('add-img').value = '';
    });
}

function deleteProduct(id) {
    if(confirm("Delete this item?")) db.ref('products/' + id).remove();
}

// --- CHECKOUT ---
async function checkout() {
    if(cart.length === 0) return alert("EMPTY CART");
    const loc = document.getElementById('user-location').value;
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const deliveryTime = "6:00 PM to 8:00 PM";

    let text = `ORDER FROM ZORA.PH:\n\n`;
    cart.forEach(i => text += `• ${i.qty}x ${i.name} (PHP ${i.price * i.qty})\n`);
    text += `\nTOTAL: PHP ${total.toLocaleString()}`;
    text += `\n\nLocation: ${loc} 📍\nDelivery Time: ${deliveryTime} ⏰`;

    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    const updates = {};
    cart.forEach(item => {
        const p = products.find(prod => prod.id === item.id);
        if(p) updates[`/products/${item.id}/stocks`] = Math.max(0, p.stocks - item.qty);
    });
    db.ref().update(updates);

    alert(`✅ ORDER COPIED!\n\nPaste in Instagram DMs!`);
    window.location.href = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
}

// --- SECRET PASSWORD: Zora005 ---
let inputBuffer = "";
const secretCode = "Zora005";

document.addEventListener('keydown', (e) => {
    // Ignore typing if you're in the search bar or admin inputs
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    inputBuffer += e.key;
    if (inputBuffer.length > secretCode.length) {
        inputBuffer = inputBuffer.substring(inputBuffer.length - secretCode.length);
    }

    if (inputBuffer === secretCode) {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-panel').scrollIntoView();
        inputBuffer = "";
        alert("Access Granted: Welcome Zora Admin.");
    }
});

function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }
function filterStore() {
    const q = document.getElementById('search-bar').value.toLowerCase();
    renderStore(products.filter(p => p.name.toLowerCase().includes(q)));
}
