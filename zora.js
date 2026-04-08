const INSTAGRAM_USERNAME = "jeyi_vllstrs";

// SECRET KEY: Type 'admin123' to unlock owner tools
let inputBuffer = "";
window.addEventListener("keydown", (e) => {
    inputBuffer += e.key;
    if (inputBuffer.includes("admin123")) {
        document.getElementById('admin-panel').style.display = 'block';
        inputBuffer = "";
        alert("OWNER ACCESS GRANTED");
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    if (inputBuffer.length > 20) inputBuffer = ""; 
});

let products = JSON.parse(localStorage.getItem('zora_final_store')) || [
    { id: 1, name: "Sample Earring", price: 650, desc: "Premium quality stainless steel.", img: "https://via.placeholder.com/400?text=Earring", reviews: [] }
];
let cart = [];

function renderStore(data = products) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = data.map(p => `
        <div class="product-card p-4">
            <div class="img-container mb-6">
                <img src="${p.img}" alt="${p.name}" class="max-h-full max-w-full object-contain">
            </div>
            <h3 class="modern-bold text-center text-xl mb-2 px-2 text-white">${p.name}</h3>
            <p class="text-center text-[11px] text-gray-400 uppercase mb-4 px-4 leading-relaxed">${p.desc || ''}</p>
            <p class="modern-bold text-center text-2xl mb-8">PHP ${p.price.toLocaleString()}</p>
            <button onclick="addToCart(${p.id})" class="modern-bold w-full border border-white py-4 text-xs hover:bg-white hover:text-black transition-all">Add to Cart</button>
            <div class="mt-8 border-t border-zinc-900 pt-4">
                <div class="max-h-20 overflow-y-auto mb-4 space-y-2 pr-2 text-[10px] text-gray-500 italic">
                    ${(p.reviews || []).map(r => `<p>"${r}"</p>`).join('')}
                </div>
                <div class="flex gap-2">
                    <input type="text" id="rev-${p.id}" placeholder="COMMENT..." class="text-[9px] flex-grow p-3 bg-transparent border-zinc-800">
                    <button onclick="addReview(${p.id})" class="text-[9px] font-black border border-white px-4">POST</button>
                </div>
            </div>
        </div>
    `).join('');
    renderAdminList();
}

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.reduce((acc, i) => acc + i.qty, 0);
    const list = document.getElementById('cart-items');
    list.innerHTML = cart.map(i => `
        <div class="flex items-center justify-between border-b border-zinc-900 pb-6">
            <div class="flex items-center gap-6">
                <div class="w-20 h-20 bg-white flex items-center justify-center p-1">
                    <img src="${i.img}" class="max-h-full max-w-full object-contain">
                </div>
                <div>
                    <p class="modern-bold text-lg">${i.name}</p>
                    <p class="text-sm font-light text-gray-500">PHP ${(i.price * i.qty).toLocaleString()}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <button onclick="changeQty(${i.id}, -1)" class="text-2xl font-light">-</button>
                <span class="modern-bold text-lg">${i.qty}</span>
                <button onclick="changeQty(${i.id}, 1)" class="text-2xl font-light">+</button>
            </div>
        </div>
    `).join('');
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = "PHP " + total.toLocaleString();
}

function addNewProduct() {
    const name = document.getElementById('add-name').value;
    const price = document.getElementById('add-price').value;
    const img = document.getElementById('add-img').value;
    const desc = document.getElementById('add-desc').value;
    if(!name || !price) return alert("MISSING INFO");
    products.push({ id: Date.now(), name, price: parseFloat(price), desc: desc || '', img: img || 'https://via.placeholder.com/400', reviews: [] });
    save(); renderStore();
    document.getElementById('add-name').value = ''; document.getElementById('add-price').value = ''; document.getElementById('add-img').value = ''; document.getElementById('add-desc').value = '';
}

function removeProduct(id) {
    if(confirm("DELETE PRODUCT?")) { products = products.filter(p => p.id !== id); save(); renderStore(); }
}

function renderAdminList() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = products.map(p => `
        <div class="flex justify-between items-center border border-zinc-900 p-4">
            <span class="modern-bold text-xs">${p.name}</span>
            <button onclick="removeProduct(${p.id})" class="text-red-800 text-[10px] font-black uppercase">Delete</button>
        </div>
    `).join('');
}

function addToCart(id) {
    const product = products.find(p => p.id === id);
    const exists = cart.find(c => c.id === id);
    if(exists) exists.qty++; else cart.push({...product, qty: 1});
    updateCartUI();
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if(!item) return;
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(c => c.id !== id);
    updateCartUI();
}

function save() { localStorage.setItem('zora_final_store', JSON.stringify(products)); }

function filterStore() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    renderStore(products.filter(p => p.name.toLowerCase().includes(query)));
}

function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }

function addReview(id) {
    const input = document.getElementById(`rev-${id}`);
    if(!input.value) return;
    products.find(p => p.id === id).reviews.push(input.value);
    save(); renderStore();
}

// THE "WORKS EVERY TIME" CHECKOUT
async function checkout() {
    if(cart.length === 0) return alert("EMPTY CART");
    
    let orderDetails = `ORDER FROM ZORA.PH:\n\n`;
    cart.forEach(i => orderDetails += `• ${i.qty}x ${i.name} (PHP ${i.price * i.qty})\n`);
    orderDetails += `\nTotal: PHP ${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}\n\nLocation: Lucena City 📍`;

    // 1. Copy to clipboard immediately
    try {
        await navigator.clipboard.writeText(orderDetails);
    } catch (err) {
        console.error('Clipboard failed', err);
    }

    // 2. Alert the user so they know what to do if IG acts up
    alert("ORDER DETAILS COPIED!\n\nWe are opening Instagram. If the message box is empty, just PASTE your order.");

    // 3. Try to open the DM link
    // This is the officially supported URL to start a DM
    const igDirectUrl = `https://www.instagram.com/direct/t/${INSTAGRAM_USERNAME}/`;
    
    window.location.href = igDirectUrl;

    // 4. Reset cart
    cart = []; 
    updateCartUI(); 
    toggleCart();
    document.getElementById('thanks-banner').style.display = 'block';
}

function closeThanks() { document.getElementById('thanks-banner').style.display = 'none'; }

renderStore();
