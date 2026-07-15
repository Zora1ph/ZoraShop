const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
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

function closeWelcome() {
    document.getElementById('welcome-modal').style.display = 'none';
}

db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.values(data) : [];

    renderStore();
    renderInventory();
});

function renderStore(data = products) {
    const grid = document.getElementById('shop-grid');

    if (!grid) return;

    grid.innerHTML = data.map(product => {

        const soldOut = product.stocks <= 0;

        return `
        <div class="product-card p-4 ${soldOut ? 'opacity-50' : ''}">
            <div class="img-container mb-6 bg-white relative">
                <img
                    src="${product.img}"
                    alt="${product.name}"
                    class="max-h-full max-w-full object-contain ${soldOut ? 'grayscale' : ''}"
                >

                ${soldOut ? `
                <div class="absolute inset-0 flex items-center justify-center bg-black/70 text-white modern-bold text-lg">
                    SOLD OUT
                </div>` : ''}
            </div>

            <h3 class="modern-bold text-center text-xl mb-2 text-white uppercase">
                ${product.name}
            </h3>

            <p class="text-center text-sm text-zinc-400 mb-4 px-2 min-h-[40px]">
                ${product.desc || ''}
            </p>

            <p class="text-center text-[10px] text-zinc-500 mb-2 uppercase">
                ${product.stocks || 0} items available
            </p>

            <p class="modern-bold text-center text-2xl mb-8">
                PHP ${product.price.toLocaleString()}
            </p>

            <button
                onclick="${soldOut ? '' : `addToCart(${product.id})`}"
                class="modern-bold w-full border border-white py-4 text-[10px] tracking-widest hover:bg-white hover:text-black transition-all"
            >
                ${soldOut ? 'OUT OF STOCK' : 'ADD TO CART'}
            </button>
        </div>
        `;
    }).join('');
}

function addToCart(id) {
    const product = products.find(p => p.id === id);

    const existing = cart.find(item => item.id === id);

    if (existing) {
        if (existing.qty < product.stocks) {
            existing.qty++;
        } else {
            alert("NO MORE STOCK AVAILABLE");
        }
    } else {
        cart.push({
            ...product,
            qty: 1
        });
    }

    updateCartUI();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);

    const product = products.find(p => p.id === id);

    if (!item) return;

    if (delta > 0 && item.qty >= product.stocks) {
        return alert("NO MORE STOCK AVAILABLE");
    }

    item.qty += delta;

    if (item.qty <= 0) {
        cart = cart.filter(i => i.id !== id);
    }

    updateCartUI();
}

function updateCartUI() {

    document.getElementById('cart-count').innerText =
        cart.reduce((sum, item) => sum + item.qty, 0);

    document.getElementById('cart-items').innerHTML =
        cart.map(item => `
        <div class="flex items-center justify-between border-b border-zinc-900 pb-6 mb-6">

            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-16 h-16 object-cover bg-white">

                <div>
                    <p class="modern-bold text-white text-[10px] uppercase">
                        ${item.name}
                    </p>

                    <p class="text-[9px] text-zinc-500">
                        PHP ${item.price.toLocaleString()}
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-3 text-white">
                <button onclick="changeQty(${item.id},-1)"
                    class="w-8 h-8 border border-zinc-800">
                    -
                </button>

                <span class="text-xs w-4 text-center">
                    ${item.qty}
                </span>

                <button onclick="changeQty(${item.id},1)"
                    class="w-8 h-8 border border-zinc-800">
                    +
                </button>
            </div>

        </div>
    `).join('');

    const total = cart.reduce(
        (sum, item) => sum + (item.price * item.qty),
        0
    );

    document.getElementById('cart-total').innerText =
        "PHP " + total.toLocaleString();
}

function renderInventory() {
    const list = document.getElementById('inventory-list');

    if (!list) return;

    list.innerHTML = products.map(product => `
        <div class="flex justify-between items-center border-b border-zinc-900 py-2">
            <span class="text-[10px] text-white uppercase font-bold">
                ${product.name} (Qty: ${product.stocks})
            </span>

            <button
                onclick="deleteProduct(${product.id})"
                class="text-red-500 text-[10px] uppercase font-bold">
                Delete
            </button>
        </div>
    `).join('');
}

function addNewProduct() {

    const name = document.getElementById('add-name').value;
    const price = parseInt(document.getElementById('add-price').value);
    const stocks = parseInt(document.getElementById('add-stocks').value);
    const img = document.getElementById('add-img').value;
    const desc = document.getElementById('add-desc').value;

    const id = Date.now();

    if (!name || !price || !img) {
        return alert("Fill all required fields");
    }

    db.ref('products/' + id).set({
        id,
        name,
        price,
        stocks,
        img,
        desc
    }).then(() => {
        alert("Product Added!");

        document.getElementById('add-name').value = '';
        document.getElementById('add-price').value = '';
        document.getElementById('add-stocks').value = '';
        document.getElementById('add-img').value = '';
        document.getElementById('add-desc').value = '';
    });
}

function deleteProduct(id) {
    if (confirm("Delete this item?")) {
        db.ref('products/' + id).remove();
    }
}

async function checkout() {

    if (cart.length === 0) {
        return alert("EMPTY CART");
    }

    const name =
        document.getElementById('customer-name').value.trim();

    const phone =
        document.getElementById('customer-phone').value.trim();

    const address =
        document.getElementById('customer-address').value.trim();

    const note =
        document.getElementById('customer-note').value.trim();

    if (!name || !phone || !address) {
        return alert(
            "Please fill in Full Name, Phone Number and Shipping Address."
        );
    }

    const total = cart.reduce(
        (sum, item) => sum + (item.price * item.qty),
        0
    );

    let order = `🛒 ZORA.PH ORDER FORM\n\n`;

    order += `Full Name: ${name}\n`;
    order += `Phone Number: ${phone}\n`;
    order += `Shipping Address: ${address}\n`;

    if (note) {
        order += `Note: ${note}\n`;
    }

    order += `\n------------------------\n`;
    order += `ORDER ITEMS\n`;
    order += `------------------------\n`;

    cart.forEach(item => {
        order += `${item.qty}x ${item.name} - PHP ${(item.qty * item.price).toLocaleString()}\n`;
    });

    order += `\nTOTAL: PHP ${total.toLocaleString()}`;

    await navigator.clipboard.writeText(order);

    const updates = {};

    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);

        if (product) {
            updates[`products/${item.id}/stocks`] =
                Math.max(0, product.stocks - item.qty);
        }
    });

    await db.ref().update(updates);

    cart = [];
    updateCartUI();

    alert(
        "✅ Order copied successfully.\n\nPaste it into our Instagram DM to place your order."
    );

    window.open(
        `https://instagram.com/${INSTAGRAM_USERNAME}`,
        '_blank'
    );
}

let inputBuffer = "";
const secretCode = "Zora005";

document.addEventListener('keydown', (e) => {

    if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA"
    ) return;

    inputBuffer += e.key;

    if (inputBuffer.length > secretCode.length) {
        inputBuffer =
            inputBuffer.substring(
                inputBuffer.length - secretCode.length
            );
    }

    if (inputBuffer === secretCode) {
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('admin-panel').scrollIntoView();

        inputBuffer = "";

        alert("Access Granted: Welcome Zora Admin.");
    }
});

function toggleCart() {
    document.getElementById('cart-modal').classList.toggle('hidden');
}

function filterStore() {
    const query =
        document.getElementById('search-bar')
        .value
        .toLowerCase();

    renderStore(
        products.filter(product =>
            product.name.toLowerCase().includes(query)
        )
    );
}
