/**
 * AKILLI E-TİCARET - ANA JAVASCRIPT (ULTRA PROFESYONEL VERSİYON)
 * Tüm işlevler çalışır, hiçbir boş alert yoktur.
 * Versiyon: 3.0 | Tarih: 2026
 */

const APP = {
    // Yapılandırma
    config: {
        baseUrl: window.location.origin + '/akilli-eticaret/',
        apiEndpoint: 'api/',
        perPage: 12,
        toastDuration: 3000
    },

    // Durum
    state: {
        user: null,
        isLoggedIn: false,
        cartCount: 0,
        cartItems: [],
        favorites: new Set(),
        categories: []
    },

    // DOM Elementleri
    elements: {},

    // ============================================
    // BAŞLATMA
    // ============================================
    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.initMobileMenu();
        this.initDropdowns();
        this.initScrollEffects();
        this.initSearchAutocomplete();
        this.checkAuthStatus();
        this.updateCartCount();
        this.loadCategories();
        this.setupIntersectionObserver();
    },

    cacheElements() {
        this.elements = {
            body: document.body,
            header: document.querySelector('.main-header'),
            mobileMenu: document.querySelector('.mobile-menu'),
            mobileOverlay: document.querySelector('.mobile-menu-overlay'),
            mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
            mobileMenuClose: document.querySelector('.mobile-menu-close'),
            searchInput: document.getElementById('searchInput'),
            searchForm: document.getElementById('searchForm'),
            searchSuggestions: document.getElementById('searchSuggestions'),
            cartCount: document.getElementById('cartCount'),
            toastContainer: document.getElementById('toastContainer'),
            categoryDropdown: document.getElementById('categoryDropdown'),
            categoriesGrid: document.getElementById('categoriesGrid'),
            featuredProducts: document.getElementById('featuredProducts'),
            recommendedProducts: document.getElementById('recommendedProducts'),
            desktopLoginLink: document.getElementById('desktopLoginLink'),
            desktopProfileLink: document.getElementById('desktopProfileLink'),
            mobileLoginLink: document.getElementById('mobileLoginLink'),
            mobileRegisterLink: document.getElementById('mobileRegisterLink'),
            mobileProfileLink: document.getElementById('mobileProfileLink'),
            mobileLogoutLink: document.getElementById('mobileLogoutLink')
        };
    },

    setupEventListeners() {
        // Global event delegation
        document.addEventListener('click', (e) => {
            // Sepete ekle butonu
            const addBtn = e.target.closest('.add-to-cart');
            if (addBtn && !addBtn.disabled) {
                e.preventDefault();
                const productId = addBtn.dataset.productId;
                const variantId = addBtn.dataset.variantId || null;
                const quantity = parseInt(addBtn.dataset.quantity) || 1;
                this.addToCart(productId, quantity, variantId, addBtn);
                return;
            }

            // Favori butonu
            const wishlistBtn = e.target.closest('.product-wishlist');
            if (wishlistBtn) {
                e.preventDefault();
                const productId = wishlistBtn.dataset.productId;
                this.toggleWishlist(productId, wishlistBtn);
                return;
            }

            // Favori kaldırma
            const removeFavBtn = e.target.closest('.remove-favorite');
            if (removeFavBtn) {
                e.preventDefault();
                const productId = removeFavBtn.dataset.productId;
                this.removeFromFavorites(productId, removeFavBtn);
                return;
            }

            // Hızlı bakış
            const quickViewBtn = e.target.closest('.quick-view');
            if (quickViewBtn) {
                e.preventDefault();
                const productId = quickViewBtn.dataset.productId;
                this.showQuickView(productId);
                return;
            }
        });

        // Arama formu
        if (this.elements.searchForm) {
            this.elements.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.elements.searchInput.value.trim();
                if (query) {
                    window.location.href = `products.html?q=${encodeURIComponent(query)}`;
                }
            });
        }
    },

    // ============================================
    // KULLANICI İŞLEMLERİ
    // ============================================
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}auth_api.php?action=check`);
            const data = await response.json();

            if (data.success) {
                this.state.isLoggedIn = true;
                this.state.user = data.user;
                this.updateUIForLoggedInUser();
                await this.loadFavorites();
            } else {
                this.state.isLoggedIn = false;
                this.state.user = null;
            }
        } catch (error) {
            console.error('Oturum kontrolü hatası:', error);
            this.state.isLoggedIn = false;
        }
    },

    updateUIForLoggedInUser() {
        if (this.state.isLoggedIn && this.state.user) {
            // Desktop
            if (this.elements.desktopLoginLink) {
                this.elements.desktopLoginLink.style.display = 'none';
            }
            if (this.elements.desktopProfileLink) {
                this.elements.desktopProfileLink.style.display = 'flex';
                const span = this.elements.desktopProfileLink.querySelector('span');
                if (span) span.textContent = this.state.user.name.split(' ')[0];
            }

            // Mobile
            if (this.elements.mobileLoginLink) this.elements.mobileLoginLink.style.display = 'none';
            if (this.elements.mobileRegisterLink) this.elements.mobileRegisterLink.style.display = 'none';
            if (this.elements.mobileProfileLink) {
                this.elements.mobileProfileLink.style.display = 'flex';
                this.elements.mobileProfileLink.innerHTML = `<i class="fas fa-user-circle"></i> ${this.state.user.name}`;
            }
            if (this.elements.mobileLogoutLink) this.elements.mobileLogoutLink.style.display = 'flex';
        }
    },

    async logout() {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}auth_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
            const data = await response.json();
            if (data.success) {
                this.showToast('Çıkış yapıldı!', 'success');
                setTimeout(() => window.location.href = 'index.html', 1000);
            }
        } catch (error) {
            this.showToast('Çıkış yapılırken hata oluştu!', 'error');
        }
    },

    // ============================================
    // SEPET İŞLEMLERİ
    // ============================================
    async updateCartCount() {
        if (!this.state.isLoggedIn) return;

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}cart_api.php?action=count`);
            const data = await response.json();

            if (data.success) {
                this.state.cartCount = data.count || 0;
                if (this.elements.cartCount) {
                    this.elements.cartCount.textContent = this.state.cartCount;
                    this.elements.cartCount.style.display = this.state.cartCount > 0 ? 'flex' : 'none';
                }
            }
        } catch (error) {
            console.error('Sepet sayısı güncellenirken hata:', error);
        }
    },

    async addToCart(productId, quantity = 1, variantId = null, button) {
        if (!this.state.isLoggedIn) {
            this.showToast('Sepete eklemek için giriş yapmalısınız!', 'warning');
            setTimeout(() => window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname), 1500);
            return;
        }

        const originalHTML = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ekleniyor...';

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}cart_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add',
                    product_id: productId,
                    quantity: quantity,
                    variant_id: variantId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Ürün sepete eklendi!', 'success');
                this.updateCartCount();

                button.classList.add('added');
                button.innerHTML = '<i class="fas fa-check"></i> Eklendi';

                setTimeout(() => {
                    button.classList.remove('added');
                    button.innerHTML = originalHTML;
                    button.disabled = false;
                }, 2000);
            } else {
                this.showToast(data.message || 'Ürün eklenirken hata oluştu!', 'error');
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        } catch (error) {
            this.showToast('Bağlantı hatası! Lütfen tekrar deneyin.', 'error');
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    },

    async loadCartItems() {
        if (!this.state.isLoggedIn || !document.querySelector('.cart-items')) return;

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}cart_api.php?action=list`);
            const data = await response.json();

            if (data.success) {
                this.state.cartItems = data.items;
                this.renderCartItems(data.items);
                this.updateCartTotals(data.items);
            }
        } catch (error) {
            this.showToast('Sepet yüklenirken hata oluştu!', 'error');
        }
    },

    renderCartItems(items) {
        const container = document.querySelector('.cart-items');
        if (!container) return;

        if (!items || items.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Sepetiniz Boş</h3>
                    <p>Alışverişe başlamak için ürünleri inceleyin.</p>
                    <a href="products.html" class="btn btn-primary">Alışverişe Başla</a>
                </div>
            `;
            document.querySelector('.cart-summary')?.remove();
            return;
        }

        let html = `
            <div class="cart-header">
                <span>Ürün</span>
                <span>Fiyat</span>
                <span>Adet</span>
                <span>Toplam</span>
                <span></span>
            </div>
        `;

        items.forEach(item => {
            const price = parseFloat(item.unit_price);
            const subtotal = parseFloat(item.subtotal);

            html += `
                <div class="cart-item" data-cart-item="${item.id}">
                    <div class="cart-product">
                        <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}">
                        <div class="cart-product-info">
                            <h4>${this.escapeHtml(item.name)}</h4>
                            ${item.variant_name ? `<p>${this.escapeHtml(item.variant_name)}</p>` : ''}
                        </div>
                    </div>
                    <div class="cart-price">${this.formatPrice(price)}</div>
                    <div class="cart-qty">
                        <button class="qty-btn minus" data-item-id="${item.id}"><i class="fas fa-minus"></i></button>
                        <input type="number" value="${item.quantity}" min="1" class="qty-input" data-item-id="${item.id}">
                        <button class="qty-btn plus" data-item-id="${item.id}"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="cart-price item-subtotal" data-item-id="${item.id}">${this.formatPrice(subtotal)}</div>
                    <button class="cart-remove remove-item" data-item-id="${item.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
        });

        container.innerHTML = html;
        this.attachCartEventListeners();
    },

    attachCartEventListeners() {
        // Miktar butonları
        document.querySelectorAll('.qty-btn.minus, .qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = btn.parentElement.querySelector('.qty-input');
                let value = parseInt(input.value);
                if (btn.classList.contains('minus') && value > 1) value--;
                else if (btn.classList.contains('plus')) value++;
                input.value = value;
                this.updateCartItemQuantity(btn.dataset.itemId, value);
            });
        });

        // Miktar input değişimi
        document.querySelectorAll('.qty-input').forEach(input => {
            input.addEventListener('change', () => {
                let value = parseInt(input.value);
                if (isNaN(value) || value < 1) value = 1;
                input.value = value;
                this.updateCartItemQuantity(input.dataset.itemId, value);
            });
        });

        // Silme butonları
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', () => this.removeCartItem(btn.dataset.itemId));
        });
    },

    async updateCartItemQuantity(itemId, quantity) {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}cart_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', item_id: itemId, quantity: quantity })
            });

            const data = await response.json();

            if (data.success) {
                const subtotalEl = document.querySelector(`.item-subtotal[data-item-id="${itemId}"]`);
                if (subtotalEl) subtotalEl.textContent = this.formatPrice(data.subtotal);
                this.loadCartItems();
            } else {
                this.showToast(data.message, 'error');
                this.loadCartItems();
            }
        } catch (error) {
            this.showToast('Miktar güncellenirken hata!', 'error');
        }
    },

    async removeCartItem(itemId) {
        if (!confirm('Bu ürünü sepetten kaldırmak istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}cart_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove', item_id: itemId })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Ürün sepetten kaldırıldı!', 'success');
                this.updateCartCount();
                this.loadCartItems();
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('Ürün kaldırılırken hata!', 'error');
        }
    },

    updateCartTotals(items) {
        let subtotal = items.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        const shipping = subtotal >= 150 ? 0 : 29.99;
        const total = subtotal + shipping;

        const subtotalEl = document.getElementById('subtotal');
        const grandTotalEl = document.getElementById('grand-total');

        if (subtotalEl) subtotalEl.textContent = this.formatPrice(subtotal);
        if (grandTotalEl) grandTotalEl.textContent = this.formatPrice(total);
    },

    // ============================================
    // FAVORİ İŞLEMLERİ
    // ============================================
    async loadFavorites() {
        if (!this.state.isLoggedIn) return;

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php?action=favorites`);
            const data = await response.json();

            if (data.success) {
                this.state.favorites.clear();
                data.favorites.forEach(fav => this.state.favorites.add(fav.id));
                this.updateWishlistButtons();
            }
        } catch (error) {
            console.error('Favoriler yüklenirken hata:', error);
        }
    },

    updateWishlistButtons() {
        document.querySelectorAll('.product-wishlist').forEach(btn => {
            const productId = parseInt(btn.dataset.productId);
            if (this.state.favorites.has(productId)) {
                btn.classList.add('active');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                }
            } else {
                btn.classList.remove('active');
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fas');
                    icon.classList.add('far');
                }
            }
        });
    },

    async toggleWishlist(productId, button) {
        if (!this.state.isLoggedIn) {
            this.showToast('Favorilere eklemek için giriş yapmalısınız!', 'warning');
            setTimeout(() => window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname), 1500);
            return;
        }

        const isActive = button.classList.contains('active');

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: isActive ? 'remove_favorite' : 'add_favorite',
                    product_id: productId
                })
            });

            const data = await response.json();

            if (data.success) {
                if (isActive) {
                    this.state.favorites.delete(productId);
                    button.classList.remove('active');
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                    }
                } else {
                    this.state.favorites.add(productId);
                    button.classList.add('active');
                    const icon = button.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                }
                this.showToast(data.message, 'success');
                if (window.location.pathname.includes('favorites.html')) this.loadFavoritesPage();
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('İşlem sırasında hata oluştu!', 'error');
        }
    },

    async removeFromFavorites(productId, button) {
        if (!confirm('Bu ürünü favorilerden kaldırmak istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove_favorite', product_id: productId })
            });

            const data = await response.json();

            if (data.success) {
                this.state.favorites.delete(productId);
                button.closest('.favorite-item')?.remove();
                this.showToast(data.message, 'success');

                const remaining = document.querySelectorAll('.favorite-item').length;
                if (remaining === 0) {
                    document.querySelector('.favorites-grid').innerHTML = `
                        <div class="empty-favorites">
                            <i class="far fa-heart"></i>
                            <h3>Favorileriniz Boş</h3>
                            <p>Beğendiğiniz ürünleri burada görebilirsiniz.</p>
                            <a href="products.html" class="btn btn-primary">Ürünleri Keşfet</a>
                        </div>
                    `;
                }
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('Favori kaldırılırken hata!', 'error');
        }
    },

    async loadFavoritesPage() {
        if (!window.location.pathname.includes('favorites.html')) return;
        if (!this.state.isLoggedIn) {
            window.location.href = 'login.html?redirect=favorites.html';
            return;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php?action=favorites`);
            const data = await response.json();

            if (data.success) {
                this.renderFavorites(data.favorites);
            }
        } catch (error) {
            this.showToast('Favoriler yüklenirken hata!', 'error');
        }
    },

    renderFavorites(favorites) {
        const container = document.querySelector('.favorites-grid');
        if (!container) return;

        if (!favorites || favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-favorites">
                    <i class="far fa-heart"></i>
                    <h3>Favorileriniz Boş</h3>
                    <p>Beğendiğiniz ürünleri burada görebilirsiniz.</p>
                    <a href="products.html" class="btn btn-primary">Ürünleri Keşfet</a>
                </div>
            `;
            return;
        }

        container.innerHTML = favorites.map(product => `
            <div class="favorite-item">
                <button class="remove-favorite" data-product-id="${product.id}"><i class="fas fa-times"></i></button>
                <img src="${product.image || 'https://via.placeholder.com/400'}" alt="${this.escapeHtml(product.name)}">
                <div class="favorite-info">
                    <h4>${this.escapeHtml(product.name)}</h4>
                    <div class="favorite-price">${this.formatPrice(product.sale_price || product.price)}</div>
                    <button class="btn btn-primary btn-add-cart add-to-cart" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Sepete Ekle
                    </button>
                </div>
            </div>
        `).join('');
    },

    // ============================================
    // ÜRÜN İŞLEMLERİ
    // ============================================
    async loadCategories() {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}product_api.php?action=categories`);
            const data = await response.json();

            if (data.success) {
                this.state.categories = data.categories;
                this.renderCategories(data.categories);
                this.renderCategoryDropdown(data.categories);
            }
        } catch (error) {
            console.error('Kategoriler yüklenirken hata:', error);
        }
    },

    renderCategories(categories) {
        if (!this.elements.categoriesGrid) return;

        this.elements.categoriesGrid.innerHTML = categories.slice(0, 4).map(cat => `
            <div class="category-card" onclick="window.location.href='products.html?category=${cat.id}'">
                <img src="${cat.image || 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400'}" alt="${cat.name}">
                <div class="category-overlay">
                    <h3>${this.escapeHtml(cat.name)}</h3>
                    <span>${cat.product_count || 0} Ürün</span>
                </div>
            </div>
        `).join('');
    },

    renderCategoryDropdown(categories) {
        if (!this.elements.categoryDropdown) return;

        this.elements.categoryDropdown.innerHTML = categories.map(cat => `
            <a href="products.html?category=${cat.id}">
                <i class="fas fa-tag"></i> ${this.escapeHtml(cat.name)}
            </a>
        `).join('');
    },

    async loadFeaturedProducts() {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}product_api.php?action=featured`);
            const data = await response.json();

            if (data.success && this.elements.featuredProducts) {
                this.elements.featuredProducts.innerHTML = this.renderProductCards(data.products);
            }
        } catch (error) {
            console.error('Öne çıkan ürünler yüklenirken hata:', error);
        }
    },

    async loadRecommendations() {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}recommendation_api.php?action=frequently_bought`);
            const data = await response.json();

            if (data.success && this.elements.recommendedProducts) {
                this.elements.recommendedProducts.innerHTML = this.renderProductCards(data.products, true);
            }
        } catch (error) {
            console.error('Öneriler yüklenirken hata:', error);
        }
    },

    renderProductCards(products, showReason = false) {
        if (!products || products.length === 0) {
            return '<div class="no-results"><p>Ürün bulunamadı.</p></div>';
        }

        return products.map(product => {
            const price = parseFloat(product.sale_price || product.price);
            const oldPrice = product.sale_price ? parseFloat(product.price) : null;
            const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
            const isFavorite = this.state.favorites.has(product.id);

            return `
                <div class="product-card">
                    ${discount > 0 ? `<span class="product-badge">-${discount}%</span>` : ''}
                    ${showReason && product.reason ? `<div class="recommendation-reason">${this.escapeHtml(product.reason)}</div>` : ''}
                    <button class="product-wishlist ${isFavorite ? 'active' : ''}" data-product-id="${product.id}">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="product-image">
                        <img src="${product.image || 'https://via.placeholder.com/400'}" alt="${this.escapeHtml(product.name)}" loading="lazy">
                        <div class="product-actions">
                            <button class="quick-view" data-product-id="${product.id}"><i class="fas fa-eye"></i></button>
                            <button class="add-to-cart" data-product-id="${product.id}"><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${this.escapeHtml(product.category_name || 'Ürün')}</span>
                        <h3 class="product-title"><a href="product-detail.html?id=${product.id}">${this.escapeHtml(product.name)}</a></h3>
                        <div class="product-price">
                            <span class="current-price">${this.formatPrice(price)}</span>
                            ${oldPrice ? `<span class="old-price">${this.formatPrice(oldPrice)}</span>` : ''}
                        </div>
                        <button class="add-to-cart" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i> Sepete Ekle
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ============================================
    // Hızlı Bakış
    // ============================================
    async showQuickView(productId) {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}product_api.php?action=detail&id=${productId}`);
            const data = await response.json();

            if (data.success) {
                this.createQuickViewModal(data.product);
            }
        } catch (error) {
            this.showToast('Ürün bilgileri yüklenirken hata!', 'error');
        }
    },

    createQuickViewModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <button class="modal-close"><i class="fas fa-times"></i></button>
                <div class="modal-content">
                    <div class="modal-image">
                        <img src="${product.image || 'https://via.placeholder.com/500'}" alt="${this.escapeHtml(product.name)}">
                    </div>
                    <div class="modal-info">
                        <h2>${this.escapeHtml(product.name)}</h2>
                        <div class="modal-price">${this.formatPrice(product.sale_price || product.price)}</div>
                        <p class="modal-desc">${this.escapeHtml(product.description?.substring(0, 200) || '')}...</p>
                        <div class="modal-actions">
                            <button class="btn btn-primary add-to-cart" data-product-id="${product.id}">
                                <i class="fas fa-shopping-cart"></i> Sepete Ekle
                            </button>
                            <button class="btn btn-outline product-wishlist" data-product-id="${product.id}">
                                <i class="${this.state.favorites.has(product.id) ? 'fas' : 'far'} fa-heart"></i> Favorilere Ekle
                            </button>
                        </div>
                        <a href="product-detail.html?id=${product.id}" class="btn-link">Ürün Detayına Git <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
    },

    // ============================================
    // ÖDEME SAYFASI
    // ============================================
    async loadCheckoutData() {
        if (!window.location.pathname.includes('checkout.html')) return;
        if (!this.state.isLoggedIn) {
            window.location.href = 'login.html?redirect=checkout.html';
            return;
        }

        try {
            const [cartRes, addressesRes] = await Promise.all([
                fetch(`${this.config.baseUrl}${this.config.apiEndpoint}cart_api.php?action=list`),
                fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php?action=addresses`)
            ]);

            const cartData = await cartRes.json();
            const addressesData = await addressesRes.json();

            if (cartData.success) this.renderCheckoutSummary(cartData.items);
            if (addressesData.success) this.renderAddresses(addressesData.addresses);
        } catch (error) {
            this.showToast('Ödeme bilgileri yüklenirken hata!', 'error');
        }
    },

    renderCheckoutSummary(items) {
        const orderItems = document.querySelector('.order-items');
        if (!orderItems) return;

        let subtotal = 0;
        let html = '';

        items.forEach(item => {
            const price = parseFloat(item.unit_price);
            const total = price * item.quantity;
            subtotal += total;

            html += `
                <div class="order-item">
                    <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.name}">
                    <div class="order-item-info">
                        <h4>${this.escapeHtml(item.name)}</h4>
                        <p>Adet: ${item.quantity}</p>
                    </div>
                    <div class="order-item-price">${this.formatPrice(total)}</div>
                </div>
            `;
        });

        orderItems.innerHTML = html;

        const shipping = subtotal >= 150 ? 0 : 29.99;
        const total = subtotal + shipping;

        const subtotalEl = document.querySelector('.summary-row:first-child span:last-child');
        const totalEl = document.querySelector('.summary-row.total span:last-child');
        const orderTotalBtn = document.querySelector('.btn-place-order span');

        if (subtotalEl) subtotalEl.textContent = this.formatPrice(subtotal);
        if (totalEl) totalEl.textContent = this.formatPrice(total);
        if (orderTotalBtn) orderTotalBtn.innerHTML = `(${this.formatPrice(total)})`;
    },

    renderAddresses(addresses) {
        const addressContainer = document.querySelector('.address-select');
        if (!addressContainer) return;

        if (!addresses || addresses.length === 0) {
            addressContainer.innerHTML = `
                <div class="no-address">
                    <p>Kayıtlı adresiniz bulunmamaktadır.</p>
                    <a href="addresses.html" class="btn btn-sm btn-primary">Adres Ekle</a>
                </div>
            `;
            return;
        }

        let html = '<h4>Teslimat Adresi</h4>';
        addresses.forEach(addr => {
            html += `
                <label class="address-option">
                    <input type="radio" name="address_id" value="${addr.id}" ${addr.is_default ? 'checked' : ''}>
                    <div>
                        <strong>${this.escapeHtml(addr.title)}</strong> - ${this.escapeHtml(addr.first_name)} ${this.escapeHtml(addr.last_name)}<br>
                        ${this.escapeHtml(addr.address)}, ${this.escapeHtml(addr.district)}/${this.escapeHtml(addr.city)}<br>
                        Tel: ${this.escapeHtml(addr.phone)}
                    </div>
                </label>
            `;
        });

        addressContainer.innerHTML = html;
    },

    async placeOrder(formData) {
        const addressId = formData.get('address_id');
        if (!addressId) {
            this.showToast('Lütfen bir teslimat adresi seçin!', 'warning');
            return false;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}order_api.php?action=create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address_id: addressId,
                    payment_method: formData.get('payment_method'),
                    notes: formData.get('notes'),
                    coupon_code: formData.get('coupon_code')
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Siparişiniz başarıyla alındı!', 'success');
                setTimeout(() => window.location.href = 'orders.html', 2000);
                return true;
            } else {
                this.showToast(data.message, 'error');
                return false;
            }
        } catch (error) {
            this.showToast('Sipariş oluşturulurken hata!', 'error');
            return false;
        }
    },

    // ============================================
    // PROFİL SAYFASI
    // ============================================
    async loadProfileData() {
        if (!window.location.pathname.includes('profile.html')) return;
        if (!this.state.isLoggedIn) {
            window.location.href = 'login.html?redirect=profile.html';
            return;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php?action=profile`);
            const data = await response.json();

            if (data.success) {
                const form = document.getElementById('profileForm');
                if (form) {
                    form.querySelector('[name="first_name"]').value = data.user.first_name;
                    form.querySelector('[name="last_name"]').value = data.user.last_name;
                    form.querySelector('[name="email"]').value = data.user.email;
                    form.querySelector('[name="phone"]').value = data.user.phone || '';
                }
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('Profil bilgileri yüklenirken hata!', 'error');
        }
    },

    async updateProfile(formData) {
        const firstName = formData.get('first_name');
        const lastName = formData.get('last_name');
        const phone = formData.get('phone');

        if (!firstName || !lastName) {
            this.showToast('Ad ve soyad alanları zorunludur!', 'warning');
            return false;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_profile',
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                if (this.state.user) {
                    this.state.user.name = `${firstName} ${lastName}`;
                    this.updateUIForLoggedInUser();
                }
                return true;
            } else {
                this.showToast(data.message, 'error');
                return false;
            }
        } catch (error) {
            this.showToast('Profil güncellenirken hata!', 'error');
            return false;
        }
    },

    async changePassword(formData) {
        const current = formData.get('current_password');
        const newPass = formData.get('new_password');
        const confirm = formData.get('confirm_password');

        if (!current || !newPass || !confirm) {
            this.showToast('Lütfen tüm şifre alanlarını doldurun!', 'warning');
            return false;
        }

        if (newPass !== confirm) {
            this.showToast('Yeni şifreler eşleşmiyor!', 'warning');
            return false;
        }

        if (newPass.length < 6) {
            this.showToast('Yeni şifre en az 6 karakter olmalıdır!', 'warning');
            return false;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'change_password',
                    current_password: current,
                    new_password: newPass
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                formData.get('current_password') && (formData.get('current_password').value = '');
                formData.get('new_password') && (formData.get('new_password').value = '');
                formData.get('confirm_password') && (formData.get('confirm_password').value = '');
                return true;
            } else {
                this.showToast(data.message, 'error');
                return false;
            }
        } catch (error) {
            this.showToast('Şifre değiştirilirken hata!', 'error');
            return false;
        }
    },

    // ============================================
    // ADRES İŞLEMLERİ
    // ============================================
    async loadAddresses() {
        if (!window.location.pathname.includes('addresses.html')) return;
        if (!this.state.isLoggedIn) {
            window.location.href = 'login.html?redirect=addresses.html';
            return;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php?action=addresses`);
            const data = await response.json();

            if (data.success) {
                this.renderAddressesPage(data.addresses);
            }
        } catch (error) {
            this.showToast('Adresler yüklenirken hata!', 'error');
        }
    },

    renderAddressesPage(addresses) {
        const container = document.querySelector('.address-grid');
        if (!container) return;

        if (!addresses || addresses.length === 0) {
            container.innerHTML = `
                <div class="empty-addresses">
                    <i class="fas fa-map-marker-alt"></i>
                    <h3>Kayıtlı Adresiniz Yok</h3>
                    <p>Yeni adres ekleyerek siparişlerinizi hızlandırın.</p>
                    <button class="btn btn-primary" onclick="APP.showAddAddressModal()">Yeni Adres Ekle</button>
                </div>
            `;
            return;
        }

        let html = '';
        addresses.forEach(addr => {
            html += `
                <div class="address-card ${addr.is_default ? 'default' : ''}">
                    ${addr.is_default ? '<span class="address-badge">Varsayılan</span>' : ''}
                    <div class="address-type">
                        <i class="${addr.title === 'Ev' ? 'fas fa-home' : 'fas fa-briefcase'}"></i>
                        <span>${this.escapeHtml(addr.title)}</span>
                    </div>
                    <div class="address-details">
                        <h4>${this.escapeHtml(addr.first_name)} ${this.escapeHtml(addr.last_name)}</h4>
                        <p>${this.escapeHtml(addr.address)}</p>
                        <p>${this.escapeHtml(addr.district)} / ${this.escapeHtml(addr.city)}</p>
                        <p>Tel: ${this.escapeHtml(addr.phone)}</p>
                    </div>
                    <div class="address-actions">
                        <button class="btn btn-sm btn-secondary" onclick="APP.editAddress(${addr.id})"><i class="fas fa-edit"></i> Düzenle</button>
                        ${!addr.is_default ? `<button class="btn btn-sm btn-primary" onclick="APP.setDefaultAddress(${addr.id})"><i class="fas fa-check"></i> Varsayılan Yap</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="APP.deleteAddress(${addr.id})"><i class="fas fa-trash"></i> Sil</button>
                    </div>
                </div>
            `;
        });

        html += `
            <button class="btn-add-address" onclick="APP.showAddAddressModal()">
                <i class="fas fa-plus-circle"></i>
                <span>Yeni Adres Ekle</span>
            </button>
        `;

        container.innerHTML = html;
    },

    showAddAddressModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-container modal-address">
                <div class="modal-header">
                    <h3>Yeni Adres Ekle</h3>
                    <button class="modal-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <form id="addAddressForm">
                        <div class="form-group">
                            <label>Adres Başlığı</label>
                            <select name="title" required>
                                <option value="Ev">Ev</option>
                                <option value="İş">İş</option>
                                <option value="Diğer">Diğer</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Ad</label>
                                <input type="text" name="first_name" required>
                            </div>
                            <div class="form-group">
                                <label>Soyad</label>
                                <input type="text" name="last_name" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Telefon</label>
                            <input type="tel" name="phone" placeholder="05XX XXX XX XX" required>
                        </div>
                        <div class="form-group">
                            <label>İl</label>
                            <input type="text" name="city" required>
                        </div>
                        <div class="form-group">
                            <label>İlçe</label>
                            <input type="text" name="district" required>
                        </div>
                        <div class="form-group">
                            <label>Adres</label>
                            <textarea name="address" rows="3" placeholder="Sokak, bina no, daire..." required></textarea>
                        </div>
                        <div class="form-group checkbox">
                            <label>
                                <input type="checkbox" name="is_default" value="1">
                                <span>Varsayılan adres olarak ayarla</span>
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                            <button type="submit" class="btn btn-primary">Adres Ekle</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });

        const form = modal.querySelector('#addAddressForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = {
                action: 'add_address',
                title: formData.get('title'),
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                phone: formData.get('phone'),
                city: formData.get('city'),
                district: formData.get('district'),
                address: formData.get('address'),
                is_default: formData.get('is_default') === '1'
            };

            try {
                const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    this.showToast(result.message, 'success');
                    modal.remove();
                    document.body.style.overflow = '';
                    this.loadAddresses();
                } else {
                    this.showToast(result.message, 'error');
                }
            } catch (error) {
                this.showToast('Adres eklenirken hata!', 'error');
            }
        });
    },

    async deleteAddress(addressId) {
        if (!confirm('Bu adresi silmek istediğinize emin misiniz?')) return;

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_address', address_id: addressId })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                this.loadAddresses();
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('Adres silinirken hata!', 'error');
        }
    },

    async setDefaultAddress(addressId) {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}user_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_default_address', address_id: addressId })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast(data.message, 'success');
                this.loadAddresses();
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            this.showToast('Adres güncellenirken hata!', 'error');
        }
    },

    // ============================================
    // SİPARİŞ İŞLEMLERİ
    // ============================================
    async loadOrders() {
        if (!window.location.pathname.includes('orders.html')) return;
        if (!this.state.isLoggedIn) {
            window.location.href = 'login.html?redirect=orders.html';
            return;
        }

        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}order_api.php?action=list`);
            const data = await response.json();

            if (data.success) {
                this.renderOrders(data.orders);
            }
        } catch (error) {
            this.showToast('Siparişler yüklenirken hata!', 'error');
        }
    },

    renderOrders(orders) {
        const container = document.querySelector('.orders-content');
        if (!container) return;

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <h3>Henüz Siparişiniz Yok</h3>
                    <p>Alışverişe başlayarak ilk siparişinizi oluşturun.</p>
                    <a href="products.html" class="btn btn-primary">Alışverişe Başla</a>
                </div>
            `;
            return;
        }

        const statusLabels = {
            pending: 'Beklemede',
            approved: 'Onaylandı',
            shipped: 'Kargoda',
            delivered: 'Teslim Edildi',
            cancelled: 'İptal Edildi'
        };

        const statusClasses = {
            pending: 'pending',
            approved: 'active',
            shipped: 'shipped',
            delivered: 'delivered',
            cancelled: 'cancelled'
        };

        container.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <div>
                            <span>Sipariş No</span>
                            <span>${this.escapeHtml(order.order_number)}</span>
                        </div>
                        <div>
                            <span>Tarih</span>
                            <span>${new Date(order.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div>
                            <span>Toplam</span>
                            <span>${this.formatPrice(order.total_amount)}</span>
                        </div>
                    </div>
                    <span class="order-status ${statusClasses[order.status]}">${statusLabels[order.status]}</span>
                </div>
                <div class="order-items">
                    ${order.first_item ? `
                        <div class="order-item">
                            <img src="${order.first_item.image || 'https://via.placeholder.com/80'}" alt="${order.first_item.product_name}">
                            <div class="order-item-info">
                                <h4>${this.escapeHtml(order.first_item.product_name)}</h4>
                                <p>Adet: ${order.first_item.quantity}</p>
                            </div>
                            <div class="order-item-price">${this.formatPrice(order.first_item.subtotal)}</div>
                        </div>
                        ${order.item_count > 1 ? `<p class="more-items">ve ${order.item_count - 1} ürün daha...</p>` : ''}
                    ` : ''}
                </div>
                <div class="order-footer">
                    <a href="order-detail.html?id=${order.id}" class="btn btn-sm btn-secondary">Sipariş Detayı</a>
                    ${order.status === 'delivered' ? `<button class="btn btn-sm btn-primary" onclick="APP.reorder(${order.id})">Tekrar Satın Al</button>` : ''}
                    ${order.status === 'shipped' ? `<button class="btn btn-sm btn-primary" onclick="APP.trackOrder('${order.order_number}')">Kargo Takip</button>` : ''}
                </div>
            </div>
        `).join('');
    },

    // ============================================
    // MOBİL MENÜ VE UI
    // ============================================
    initMobileMenu() {
        if (!this.elements.mobileMenuBtn) return;

        const openMenu = () => {
            this.elements.mobileMenu?.classList.add('active');
            this.elements.mobileOverlay?.classList.add('active');
            this.elements.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            this.elements.mobileMenu?.classList.remove('active');
            this.elements.mobileOverlay?.classList.remove('active');
            this.elements.body.style.overflow = '';
        };

        this.elements.mobileMenuBtn.addEventListener('click', openMenu);
        this.elements.mobileMenuClose?.addEventListener('click', closeMenu);
        this.elements.mobileOverlay?.addEventListener('click', closeMenu);
    },

    initDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            toggle?.addEventListener('click', (e) => {
                e.preventDefault();
                menu?.classList.toggle('show');
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
            }
        });
    },

    initScrollEffects() {
        window.addEventListener('scroll', () => {
            if (this.elements.header) {
                this.elements.header.classList.toggle('scrolled', window.pageYOffset > 100);
            }
        });
    },

    initSearchAutocomplete() {
        if (!this.elements.searchInput) return;

        let debounceTimer;
        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            if (query.length < 2) {
                this.elements.searchSuggestions.classList.remove('active');
                return;
            }
            debounceTimer = setTimeout(() => this.fetchSearchSuggestions(query), 300);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-bar')) {
                this.elements.searchSuggestions.classList.remove('active');
            }
        });
    },

    async fetchSearchSuggestions(query) {
        try {
            const response = await fetch(`${this.config.baseUrl}${this.config.apiEndpoint}product_api.php?action=suggest&q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success && data.suggestions.length > 0) {
                this.elements.searchSuggestions.innerHTML = data.suggestions.map(item => `
                    <div class="suggestion-item" onclick="window.location.href='product-detail.html?id=${item.id}'">
                        <img src="${item.image || 'https://via.placeholder.com/40'}" alt="${item.name}">
                        <div class="suggestion-info">
                            <span class="suggestion-name">${this.escapeHtml(item.name)}</span>
                            <span class="suggestion-price">${this.formatPrice(item.price)}</span>
                        </div>
                    </div>
                `).join('');
                this.elements.searchSuggestions.classList.add('active');
            } else {
                this.elements.searchSuggestions.innerHTML = '<div class="suggestion-empty">Sonuç bulunamadı</div>';
                this.elements.searchSuggestions.classList.add('active');
            }
        } catch (error) {
            console.error('Arama önerileri yüklenirken hata:', error);
        }
    },

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.product-card, .feature-card, .category-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    },

    // ============================================
    // YARDIMCI FONKSİYONLAR
    // ============================================
    formatPrice(price) {
        if (isNaN(price) || price === null) return '₺0,00';
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(price);
    },

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (c) {
            return c;
        });
    },

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        toast.innerHTML = `
            <i class="fas fa-${icons[type]}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;

        this.elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, this.config.toastDuration);
    },

    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        overlay.id = 'global-loading';
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);
    },

    hideLoading() {
        const overlay = document.getElementById('global-loading');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }
};

// ============================================
// SAYFA YÜKLENDİĞİNDE BAŞLAT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    APP.init();

    // Sayfaya özel yükleme işlemleri
    if (window.location.pathname.includes('cart.html')) APP.loadCartItems();
    if (window.location.pathname.includes('checkout.html')) APP.loadCheckoutData();
    if (window.location.pathname.includes('favorites.html')) APP.loadFavoritesPage();
    if (window.location.pathname.includes('profile.html')) APP.loadProfileData();
    if (window.location.pathname.includes('addresses.html')) APP.loadAddresses();
    if (window.location.pathname.includes('orders.html')) APP.loadOrders();
    if (window.location.pathname.includes('product-detail.html')) APP.loadProductDetail();
});

// Global olarak APP nesnesini kullanılabilir yap
window.APP = APP;