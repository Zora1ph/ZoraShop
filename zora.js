// 1. YOUR OFFICIAL ZORA CLOUD CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCa65Smn_puWDXiyU5p_K9JprJ0wk42CuE",
  authDomain: "zora-shop.firebaseapp.com",
  // Updated to your specific Singapore Database address
  databaseURL: "https://zora-shop-default-rtdb.asia-southeast1.firebasedatabase.app/", 
  projectId: "zora-shop",
  storageBucket: "zora-shop.firebasestorage.app",
  messagingSenderId: "356467694213",
  appId: "1:356467694213:web:485855acc743e71f00a7ec",
  measurementId: "G-9VZQMW3W9Y"
};

// 2. CONNECT TO THE CLOUD
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const INSTAGRAM_USERNAME = "zora.ph_";
let products = [];
let cart = [];

// 3. THE LIVE LISTENER (Updates the shop for everyone instantly)
db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.values(data) : [];
    renderStore();
});

// 4. RENDER THE SHOP
function renderStore(data = products) {
    const grid = document.getElementById('shop-grid');
    if(!grid) return;
    
    grid.innerHTML = data.map(p => `
        <div class="product-card p-4">
            <div class="img-container mb-6 bg-white">
                <img src="${p.img}" alt="${p.name}" class="max-h-full max-w-full object-contain" onerror="this.src='https://via.placeholder.com/400?text=IMAGE+NOT+FOUND'">
            </div>
            <h3 class="modern-bold text-center text-xl mb-2 px-2 text-white">${p.name}</h3>
            <p class="text-center text-[11px] text-gray-400 uppercase mb-4 px-4 leading-relaxed">${p.desc || ''}</p>
            <p class="modern-bold text-center text-2xl mb-8">PHP ${p.price.toLocaleString()}</p>
            <button onclick="addToCart(${p.id})" class="modern-bold w-full border border-white py-4 text-xs hover:bg-white hover:text-black transition-all">Add to Cart</button>
        </div>
    `).join('');
    renderAdminList();
}

// 5. ADMIN: ADD NEW PRODUCT
function addNewProduct() {
    const name = document.getElementById('add-name').value;
    const price = document.getElementById('add-price').value;
    const img = document.getElementById('add-img').value;
    const desc = document.getElementById('add-desc').value;

    if(!name || !price) return alert("MISSING INFO");
    
    const id = Date.now();
    const newProduct = { 
        id: id, 
        name: name, 
        price: parseFloat(price), 
        desc: desc || '', 
        img: img || 'https://via.placeholder.com/400'
    };

    // This PUSHES to the cloud for everyone
    db.ref('products/' + id).set(newProduct);
    
    // Clear inputs
    ['add-name', 'add-price', 'add-img', 'add-desc'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    alert("PRODUCT UPLOADED TO CLOUD!");
}

// 6. ADMIN: DELETE PRODUCT
function removeProduct(id) {
    if(confirm("DELETE PRODUCT FOR EVERYONE?")) { 
        db.ref('products/' + id).remove();
    }
}

// 7. CART UTILITIES
function addToCart(id) {
    const product = products.find(p => p.id === id);
    const exists = cart.find(c => c.id === id);
    if(exists) exists.qty++; else cart.push({...product, qty: 1});
    updateCartUI();
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    if(countEl) countEl.innerText = cart.reduce((acc, i) => acc + i.qty, 0);
    
    const list = document.getElementById('cart-items');
    if(list) {
        list.innerHTML = cart.map(i => `
            <div class="flex items-center justify-between border-b border-zinc-900 pb-6">
                <div class="flex items-center gap-6">
                    <div class="w-20 h-20 bg-white flex items-center justify-center p-1">
                        <img src="${i.img}" class="max-h-full max-w-full object-contain">
                    </div>
                    <div>
                        <p class="modern-bold text-lg text-white">${i.name}</p>
                        <p class="text-sm font-light text-gray-500">PHP ${(i.price * i.qty).toLocaleString()}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 text-white">
                    <button onclick="changeQty(${i.id}, -1)" class="text-2xl font-light">-</button>
                    <span class="modern-bold text-lg">${i.qty}</span>
                    <button onclick="changeQty(${i.id}, 1)" class="text-2xl font-light">+</button>
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
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(c => c.id !== id);
    updateCartUI();
}

function toggleCart() { 
    const modal = document.getElementById('cart-modal');
    if(modal) modal.classList.toggle('hidden'); 
}

function renderAdminList() {
    const list = document.getElementById('inventory-list');
    if(!list) return;
    list.innerHTML = products.map(p => `
        <div class="flex justify-between items-center border border-zinc-900 p-4 mb-2">
            <span class="modern-bold text-xs text-white">${p.name}</span>
            <button onclick="removeProduct(${p.id})" class="text-red-800 text-[10px] font-black uppercase">Delete</button>
        </div>
    `).join('');
}

function filterStore() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    renderStore(products.filter(p => p.name.toLowerCase().includes(query)));
}

async function checkout() {
    if(cart.length === 0) return alert("EMPTY CART");
    let orderDetails = `ORDER FROM ZORA.PH:\n\n`;
    cart.forEach(i => orderDetails += `• ${i.qty}x ${i.name} (PHP ${i.price * i.qty})\n`);
    orderDetails += `\nTotal: PHP ${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}\n\nLocation: Lucena City 📍`;
    try { await navigator.clipboard.writeText(orderDetails); } catch (err) { }
    alert("ORDER PREPARED!\n\n1. Please SCREENSHOT your cart.\n2. Tap 'MESSAGE' on our profile.\n3. PASTE your order details!");
    window.location.href = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
    cart = []; 
    updateCartUI(); 
    toggleCart();
    const banner = document.getElementById('thanks-banner');
    if(banner) banner.style.display = 'block';
}

function closeThanks() { 
    const banner = document.getElementById('thanks-banner');
    if(banner) banner.style.display = 'none'; 
}

// 8. ADMIN ACCESS TRIGGER
let inputBuffer = "";
window.addEventListener("keydown", (e) => {
    inputBuffer += e.key;
    if (inputBuffer.includes("admin123")) {
        const panel = document.getElementById('admin-panel');
        if(panel) {
            panel.style.display = 'block';
            inputBuffer = "";
            alert("OWNER ACCESS GRANTED");
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    }
    if (inputBuffer.length > 20) inputBuffer = ""; 
});
