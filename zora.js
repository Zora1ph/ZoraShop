async function checkout() {

    if (cart.length === 0) {
        return alert("EMPTY CART");
    }

    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const note = document.getElementById('customer-note').value.trim();

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

    // Copy order
    try {
        await navigator.clipboard.writeText(order);
    } catch {
        alert("Unable to copy order automatically.");
    }

    // Update stocks
    const updates = {};

    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);

        if (product) {
            updates[`products/${item.id}/stocks`] =
                Math.max(0, product.stocks - item.qty);
        }
    });

    await db.ref().update(updates);

    // Clear cart
    cart = [];
    updateCartUI();

    // Close cart modal
    document.getElementById('cart-modal').classList.add('hidden');

    // Clear customer fields
    document.getElementById('customer-name').value = "";
    document.getElementById('customer-phone').value = "";
    document.getElementById('customer-address').value = "";
    document.getElementById('customer-note').value = "";

    alert(
        "✅ ORDER COPIED!\n\nYou will now be redirected to our Instagram page.\n\nPaste the copied order into our DMs to complete your purchase."
    );

    // Redirect to Instagram
    window.location.href = "https://www.instagram.com/zora.ph_/";
}
