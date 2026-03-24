/**
 * SEPET YÖNETİMİ
 */

const Cart = {
    items: [],

    init() {
        this.loadCart();
        this.initEventListeners();
    },

    initEventListeners() {
        // Sepete ekle butonları
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart')) {
                e.preventDefault();
                const btn = e.target.closest('.add-to-cart');
                const productId = btn.dataset.productId;
                const quantity = parseInt(btn.dataset.quantity) || 1;

                this.addItem(productId, quantity, btn);
            }

            // Sepetten sil
            if (e.target.closest('.remove-item')) {
                e.preventDefault();
                const itemId = e.target.closest('.remove-item').dataset.itemId;
                this.removeItem(itemId);
            }

            // Miktar güncelleme
            if (e.target.closest('.qty-btn')) {
                const btn = e.target.closest('.qty-btn');
                const input = btn.parentElement.querySelector('.qty-input');
                let value = parseInt(input.value);

                if (btn.classList.contains('minus') && value > 1) {
                    value--;
                } else if (btn.classList.contains('plus')) {
                    value++;
                }

                input.value = value;
                this.updateQuantity(input.dataset.itemId, value);
            }
        });
    },

    async addItem(productId, quantity = 1, button = null) {
        try {
            if (button) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ekleniyor...';
            }

            const response = await fetch(`${APP.baseUrl}api/cart_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add',
                    product_id: productId,
                    quantity: quantity
                })
            });

            const data = await response.json();

            if (data.success) {
                APP.showToast('Ürün sepete eklendi!', 'success');
                APP.updateCartCount();

                if (button) {
                    button.classList.add('added');
                    button.innerHTML = '<i class="fas fa-check"></i> Eklendi';

                    setTimeout(() => {
                        button.classList.remove('added');
                        button.innerHTML = '<i class="fas fa-shopping-cart"></i> Sepete Ekle';
                        button.disabled = false;
                    }, 2000);
                }

                // Mini sepeti güncelle
                this.updateMiniCart();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            APP.showToast(error.message || 'Ürün eklenirken hata oluştu!', 'error');
            if (button) {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-shopping-cart"></i> Sepete Ekle';
            }
        }
    },

    async removeItem(itemId) {
        if (!confirm('Bu ürünü sepetten kaldırmak istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${APP.baseUrl}api/cart_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'remove',
                    item_id: itemId
                })
            });

            const data = await response.json();

            if (data.success) {
                APP.showToast('Ürün sepetten kaldırıldı!', 'success');
                this.removeItemFromUI(itemId);
                APP.updateCartCount();
                this.updateCartTotals();
            }
        } catch (error) {
            APP.showToast('İşlem sırasında hata oluştu!', 'error');
        }
    },

    async updateQuantity(itemId, quantity) {
        try {
            const response = await fetch(`${APP.baseUrl}api/cart_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    item_id: itemId,
                    quantity: quantity
                })
            });

            const data = await response.json();

            if (data.success) {
                this.updateItemSubtotal(itemId, data.subtotal);
                this.updateCartTotals();
            }
        } catch (error) {
            console.error('Miktar güncellenirken hata:', error);
        }
    },

    removeItemFromUI(itemId) {
        const row = document.querySelector(`[data-cart-item="${itemId}"]`);
        row?.remove();

        // Sepet boşsa sayfayı yenile
        if (document.querySelectorAll('.cart-item').length === 0) {
            location.reload();
        }
    },

    updateItemSubtotal(itemId, subtotal) {
        const row = document.querySelector(`[data-cart-item="${itemId}"]`);
        if (row) {
            row.querySelector('.item-subtotal').textContent = APP.formatPrice(subtotal);
        }
    },

    updateCartTotals() {
        // Toplam tutarları güncelle
        fetch(`${APP.baseUrl}api/cart_api.php?action=totals`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    document.querySelector('.cart-subtotal')?.textContent = APP.formatPrice(data.subtotal);
                    document.querySelector('.cart-shipping')?.textContent = APP.formatPrice(data.shipping);
                    document.querySelector('.cart-total')?.textContent = APP.formatPrice(data.total);
                }
            });
    },

    updateMiniCart() {
        const miniCart = document.querySelector('.mini-cart-items');
        if (!miniCart) return;

        fetch(`${APP.baseUrl}api/cart_api.php?action=mini_cart`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    miniCart.innerHTML = data.items.map(item => `
                        <div class="mini-cart-item">
                            <img src="${item.image}" alt="${item.name}">
                            <div class="mini-cart-info">
                                <h4>${item.name}</h4>
                                <span>${item.quantity} x ${APP.formatPrice(item.price)}</span>
                            </div>
                        </div>
                    `).join('');
                }
            });
    },

    loadCart() {
        // Sayfa yüklendiğinde sepeti yükle
        this.updateMiniCart();
    }
};

// Başlat
document.addEventListener('DOMContentLoaded', () => Cart.init());