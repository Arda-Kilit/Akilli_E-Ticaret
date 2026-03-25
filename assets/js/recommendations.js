/**
 * ÖNERİ SİSTEMİ - "Bunu Alan Bunu da Aldı"
 */

const Recommendations = {
    init() {
        this.loadFrequentlyBought();
        this.loadRelatedProducts();
    },

    async loadFrequentlyBought() {
        const container = document.querySelector('.cart-recommendations');
        if (!container) return;

        try {
            const response = await fetch(`${APP.config.baseUrl}${APP.config.apiEndpoint}recommendation_api.php?action=frequently_bought`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                this.renderRecommendations(container, data.products, 'Bunu Alan Bunu da Aldı', true);
            }
        } catch (error) {
            console.error('Öneri yükleme hatası:', error);
        }
    },

    async loadRelatedProducts() {
        const container = document.querySelector('.product-recommendations');
        if (!container) return;

        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        if (!productId) return;

        try {
            const response = await fetch(`${APP.config.baseUrl}${APP.config.apiEndpoint}recommendation_api.php?action=related&product_id=${productId}`);
            const data = await response.json();

            if (data.success && data.products.length > 0) {
                this.renderRecommendations(container, data.products, 'Benzer Ürünler');
            } else {
                container.innerHTML = '<div class="container"><div class="section-header"><h2 class="section-title">Benzer Ürünler</h2></div><p class="text-center">Henüz öneri bulunmamaktadır.</p></div>';
            }
        } catch (error) {
            console.error('İlişkili ürün yükleme hatası:', error);
        }
    },

    renderRecommendations(container, products, title, showReason = false) {
        container.innerHTML = `
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">${title}</h2>
                </div>
                <div class="products-grid">
                    ${products.map(product => `
                        <div class="product-card">
                            ${showReason && product.reason ? `<div class="recommendation-reason">${APP.escapeHtml(product.reason)}</div>` : ''}
                            <div class="product-image">
                                <img src="${product.image || 'https://via.placeholder.com/400'}" alt="${APP.escapeHtml(product.name)}" loading="lazy">
                                <div class="product-actions">
                                    <button class="add-to-cart" data-product-id="${product.id}"><i class="fas fa-shopping-cart"></i> Ekle</button>
                                </div>
                            </div>
                            <div class="product-info">
                                <h3 class="product-title"><a href="product-detail.html?id=${product.id}">${APP.escapeHtml(product.name)}</a></h3>
                                <div class="product-price">
                                    <span class="current-price">${APP.formatPrice(product.sale_price || product.price)}</span>
                                </div>
                                ${showReason ? `<div class="bundle-discount"><i class="fas fa-tag"></i> Birlikte al %10 indirim</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => Recommendations.init());