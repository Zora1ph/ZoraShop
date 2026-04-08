const INSTAGRAM_USERNAME = "jeyi_vllstrs";

// ⌨️ SECRET KEYBOARD CODE (Type 'admin123' to show management)
let inputBuffer = "";
window.addEventListener("keydown", (e) => {
    inputBuffer += e.key;
    if (inputBuffer.includes("admin123")) {
        document.getElementById('admin-panel').style.display = 'block';
        inputBuffer = "";
        alert("ACCESS GRANTED: OWNER PANEL OPENED");
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
    if (inputBuffer.length > 20) inputBuffer = ""; 
});

let products = JSON.parse(localStorage.getItem('zora_final_store')) || [
    { id: 1, name: "Sample Earring", price: 650, img: "https://via.placeholder.com/400?text=Earring", reviews: [] }
];
let cart = [];

function renderStore(data = products) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = data.map(p => `
        <div class="product-card p-4">
            <div class="img-container mb-6">
                <img src="${p.img}" class="max-h-full object-contain">
            </div>
            <h3 class="text-center font-black text-xs tracking-widest mb-3 uppercase px-2">${p.name}</h3>
            <p class="text-center font-light text-gray-400 text-lg mb-8">PHP ${p.price.toLocaleString()}</p>
            <button onclick="addToCart(${p.id})" class="w-full border border-white py-4 font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black transition-all">Add to Bag</button>
            
            <div class="mt-8 border-t border-zinc-900 pt-4">
                <p class="text-[8px] font-black text-gray-600 mb-3 uppercase tracking-widest">Feedback (${p.reviews ? p.reviews.length : 0})</p>
                <div class="max-h-20 overflow-y-auto mb-4 space-y-2 pr-2 text-[10px] text-gray-400 italic">
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

function addNewProduct() {
    const name = document.getElementById('add-name').value;
    const price = document.getElementById('add-price').value;
    const img = document.getElementById('add-img').value;
    if(!name || !price) return alert("REQUIRED: NAME & PRICE");
    products.push({ id: Date.now(), name, price: parseFloat(price), img: img || 'https://via.placeholder.com/400?text=EARRIING', reviews: [] });
    save(); renderStore();
    document.getElementById('add-name').value = ''; 
    document.getElementById('add-price').value = ''; 
    document.getElementById('add-img').value = '';
}

function removeProduct(id) {
    if(confirm("PERMANENTLY REMOVE?")) {
        products = products.filter(p => p.id !== id);
        save(); renderStore();
    }
}

function renderAdminList() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = products.map(p => `
        <div class="flex justify-between items-center border border-zinc-900 p-4">
            <span class="text-[10px] font-black uppercase tracking-widest">${p.name}</span>
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

function updateCartUI() {
    document.getElementById('cart-count').innerText = cart.reduce((acc, i) => acc + i.qty, 0);
    const list = document.getElementById('cart-items');
    list.innerHTML = cart.map(i => `
        <div class="flex items-center justify-between border-b border-zinc-900 pb-6">
            <div class="flex items-center gap-6">
                <img src="${i.img}" class="w-16 h-16 bg-white object-contain p-2">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest">${i.name}</p>
                    <p class="text-sm font-light text-gray-500">PHP ${i.price * i.qty}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <button onclick="changeQty(${i.id}, -1)" class="text-xl font-light">-</button>
                <span class="font-black text-sm">${i.qty}</span>
                <button onclick="changeQty(${i.id}, 1)" class="text-xl font-light">+</button>
            </div>
        </div>
    `).join('');
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    document.getElementById('cart-total').innerText = "PHP " + total.toLocaleString();
}

function changeQty(id, delta) {
    const item = cart.find(c => c.id === id);
    item.qty += delta;
    if(item.qty <= 0) cart = cart.filter(c => c.id !== id);
    updateCartUI();
}

function save() { localStorage.setItem('zora_final_store', JSON.stringify(products)); }

function filterStore() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));
    renderStore(filtered);
}

function toggleCart() { document.getElementById('cart-modal').classList.toggle('hidden'); }

function addReview(id) {
    const input = document.getElementById(`rev-${id}`);
    if(!input.value) return;
    const p = products.find(p => p.id === id);
    p.reviews.push(input.value);
    save(); renderStore();
}

function checkout() {
    if(cart.length === 0) return alert("BAG IS EMPTY");
    let msg = `Hello Zora.ph! 👋 I'd like to order:\n\n`;
    cart.forEach(i => msg += `• ${i.qty}x ${i.name} (PHP ${i.price * i.qty})\n`);
    msg += `\nTotal: PHP ${cart.reduce((sum, i) => sum + (i.price * i.qty), 0)}\n\nLocation: Lucena City 📍`;
    
    // Opens Instagram Direct Message
    window.open(`https://ig.me/m/${INSTAGRAM_USERNAME}?text=${encodeURIComponent(msg)}`, '_blank');
    
    cart = []; updateCartUI(); toggleCart();
    document.getElementById('thanks-banner').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeThanks() { document.getElementById('thanks-banner').style.display = 'none'; }

renderStore();