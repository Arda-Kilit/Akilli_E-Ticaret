/**
 * ÖNERİ SİSTEMİ - "Bunu Alan Bunu da Aldı"
 */

const Recommendations = {
    init() {
        this.loadProductRecommendations();
        this.loadCartRecommendations();
        this.loadUserRecommendations();
    },

    // Ürün Detay Sayfası - İlişkili Ürünler
    async loadProductRecommendations() {
        const container = document.querySelector('.product-recommendations');
        if (!container) return;

        const productId = container.dataset.productId;

        try {
            const response = await fetch(`${APP.baseUrl}api/recommendation_api.php?action=related&product_id=${productId}`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                this.renderRecommendations(container, data.products, 'Benzer Ürünler');
            }
        } catch (error) {
            console.error('Öneri yükleme hatası:', error);
        }
    },

    // "Bunu Alan Bunu da Aldı" Algoritması
    async loadCartRecommendations() {
        const container = document.querySelector('.cart-recommendations');
        if (!container) return;

        try {
            const response = await fetch(`${APP.baseUrl}api/recommendation_api.php?action=frequently_bought`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                this.renderRecommendations(container, data.products, 'Bunu Alan Bunu da Aldı', true);
            }
        } catch (error) {
            console.error('Sepet önerileri hatası:', error);
        }
    },

    // Kullanıcı Bazlı Öneriler
    async loadUserRecommendations() {
        const container = document.querySelector('.user-recommendations');
        if (!container) return;

        try {
            const response = await fetch(`${APP.baseUrl}api/recommendation_api.php?action=for_you`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                this.renderRecommendations(container, data.products, 'Sizin İçin Seçtiklerimiz');
            }
        } catch (error) {
            console.error('Kullanıcı önerileri hatası:', error);
        }
    },

    renderRecommendations(container, products, title, isBundle = false) {
        const section = document.createElement('div');
        section.className = 'recommendations-section';

        section.innerHTML = `
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">${title}</h2>
                </div>
                <div class="products-grid recommendations-grid">
                    ${products.map(product => `
                        <div class="product-card ${isBundle ? 'bundle-card' : ''}">
                            ${isBundle ? `<div class="recommendation-reason">${product.reason}</div>` : ''}
                            <div class="product-image">
                                <img src="${product.image}" alt="${product.name}" loading="lazy">
                                <div class="product-actions">
                                    <button class="add-to-cart" data-product-id="${product.id}">
                                        <i class="fas fa-plus"></i> Ekle
                                    </button>
                                </div>
                            </div>
                            <div class="product-info">
                                <h3 class="product-title">
                                    <a href="product-detail.php?id=${product.id}">${product.name}</a>
                                </h3>
                                <div class="product-price">
                                    <span class="current-price">${APP.formatPrice(product.price)}</span>
                                </div>
                                ${isBundle ? `
                                    <div class="bundle-discount">
                                        <i class="fas fa-tag"></i> Birlikte %${product.bundle_discount} indirim
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.appendChild(section);
    },

    // Sepete Ekleme Animasyonu
    animateAddToCart(button) {
        button.innerHTML = '<i class="fas fa-check"></i> Eklendi';
        button.classList.add('added');

        setTimeout(() => {
            button.innerHTML = '<i class="fas fa-plus"></i> Ekle';
            button.classList.remove('added');
        }, 1500);
    }
};

document.addEventListener('DOMContentLoaded', () => Recommendations.init());