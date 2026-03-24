/**
 * ARAMA VE FİLTRELEME
 */

const Search = {
    filters: {
        category: '',
        price_min: '',
        price_max: '',
        sort: 'newest',
        page: 1
    },

    init() {
        this.initFilters();
        this.initPriceSlider();
        this.initSort();
        this.initPagination();
    },

    initFilters() {
        // Kategori filtreleri
        document.querySelectorAll('.filter-category').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.applyFilters();
            });
        });

        // Fiyat filtresi
        const priceInputs = document.querySelectorAll('.price-input');
        priceInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.filters.price_min = document.querySelector('.price-min').value;
                this.filters.price_max = document.querySelector('.price-max').value;
                this.applyFilters();
            });
        });

        // Filtreleri temizle
        document.querySelector('.clear-filters')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearFilters();
        });
    },

    initPriceSlider() {
        const slider = document.querySelector('.price-slider');
        if (!slider) return;

        noUiSlider.create(slider, {
            start: [0, 10000],
            connect: true,
            range: {
                'min': 0,
                'max': 50000
            },
            step: 100
        });

        slider.noUiSlider.on('update', (values) => {
            document.querySelector('.price-min-display').textContent = APP.formatPrice(values[0]);
            document.querySelector('.price-max-display').textContent = APP.formatPrice(values[1]);
        });

        slider.noUiSlider.on('change', (values) => {
            this.filters.price_min = values[0];
            this.filters.price_max = values[1];
            this.applyFilters();
        });
    },

    initSort() {
        document.querySelector('.sort-select')?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.applyFilters();
        });
    },

    initPagination() {
        document.querySelectorAll('.pagination a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.filters.page = parseInt(link.dataset.page);
                this.applyFilters();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    },

    applyFilters() {
        const params = new URLSearchParams(window.location.search);

        // Mevcut arama terimini koru
        const searchQuery = params.get('q');
        if (searchQuery) params.set('q', searchQuery);

        // Filtreleri ekle
        Object.keys(this.filters).forEach(key => {
            if (this.filters[key]) {
                params.set(key, this.filters[key]);
            } else {
                params.delete(key);
            }
        });

        // URL'i güncelle ve sayfayı yenile
        window.history.pushState({}, '', `${window.location.pathname}?${params}`);
        this.fetchResults(params);
    },

    async fetchResults(params) {
        APP.showLoading();

        try {
            const response = await fetch(`${APP.baseUrl}api/product_api.php?action=filter&${params}`);
            const data = await response.json();

            if (data.success) {
                this.updateProductGrid(data.products);
                this.updatePagination(data.pagination);
                this.updateResultCount(data.total);
            }
        } catch (error) {
            console.error('Filtreleme hatası:', error);
        } finally {
            APP.hideLoading();
        }
    },

    updateProductGrid(products) {
        const grid = document.querySelector('.products-grid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Sonuç Bulunamadı</h3>
                    <p>Farklı arama kriterleri deneyin.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => `
            <div class="product-card">
                ${product.discount ? `<span class="product-badge">-${product.discount}%</span>` : ''}
                <button class="product-wishlist" data-product-id="${product.id}">
                    <i class="far fa-heart"></i>
                </button>
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                    <div class="product-actions">
                        <button class="quick-view" data-product-id="${product.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="add-to-cart" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <h3 class="product-title">
                        <a href="product-detail.php?id=${product.id}">${product.name}</a>
                    </h3>
                    <div class="product-rating">
                        <span class="stars">${this.renderStars(product.rating)}</span>
                        <span class="rating-count">(${product.review_count})</span>
                    </div>
                    <div class="product-price">
                        <span class="current-price">${APP.formatPrice(product.price)}</span>
                        ${product.old_price ? `<span class="old-price">${APP.formatPrice(product.old_price)}</span>` : ''}
                    </div>
                    <button class="add-to-cart" data-product-id="${product.id}">
                        <i class="fas fa-shopping-cart"></i> Sepete Ekle
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5;
        let html = '';

        for (let i = 0; i < full; i++) html += '<i class="fas fa-star"></i>';
        if (half) html += '<i class="fas fa-star-half-alt"></i>';
        for (let i = full + (half ? 1 : 0); i < 5; i++) html += '<i class="far fa-star"></i>';

        return html;
    },

    updatePagination(pagination) {
        const container = document.querySelector('.pagination');
        if (!container) return;

        let html = '';

        if (pagination.current > 1) {
            html += `<a href="#" data-page="${pagination.current - 1}" class="prev"><i class="fas fa-chevron-left"></i></a>`;
        }

        for (let i = 1; i <= pagination.total; i++) {
            if (i === 1 || i === pagination.total || (i >= pagination.current - 2 && i <= pagination.current + 2)) {
                html += `<a href="#" data-page="${i}" class="${i === pagination.current ? 'active' : ''}">${i}</a>`;
            } else if (i === pagination.current - 3 || i === pagination.current + 3) {
                html += `<span>...</span>`;
            }
        }

        if (pagination.current < pagination.total) {
            html += `<a href="#" data-page="${pagination.current + 1}" class="next"><i class="fas fa-chevron-right"></i></a>`;
        }

        container.innerHTML = html;
        this.initPagination();
    },

    updateResultCount(count) {
        const element = document.querySelector('.result-count');
        if (element) {
            element.textContent = `${count} ürün bulundu`;
        }
    },

    clearFilters() {
        this.filters = {
            category: '',
            price_min: '',
            price_max: '',
            sort: 'newest',
            page: 1
        };

        // Tüm checkboxları temizle
        document.querySelectorAll('.filter-category').forEach(cb => cb.checked = false);

        // Fiyat inputlarını sıfırla
        const priceInputs = document.querySelectorAll('.price-input');
        if (priceInputs.length) {
            priceInputs[0].value = '';
            priceInputs[1].value = '';
        }

        this.applyFilters();
    }
};

document.addEventListener('DOMContentLoaded', () => Search.init());