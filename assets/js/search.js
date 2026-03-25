/**
 * ARAMA VE FİLTRELEME SİSTEMİ
 */

const Search = {
    filters: {
        category: '',
        price_min: '',
        price_max: '',
        sort: 'newest',
        page: 1,
        q: ''
    },

    init() {
        this.loadFiltersFromURL();
        this.initFilters();
        this.initSort();
        this.loadProducts();
    },

    loadFiltersFromURL() {
        const params = new URLSearchParams(window.location.search);
        this.filters.q = params.get('q') || '';
        this.filters.category = params.get('category') || '';
        this.filters.price_min = params.get('price_min') || '';
        this.filters.price_max = params.get('price_max') || '';
        this.filters.sort = params.get('sort') || 'newest';
        this.filters.page = parseInt(params.get('page')) || 1;

        // Arama inputuna değeri yaz
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput && this.filters.q) {
            searchInput.value = this.filters.q;
        }

        // Kategori checkbox'larını işaretle
        if (this.filters.category) {
            const checkbox = document.querySelector(`.filter-category[value="${this.filters.category}"]`);
            if (checkbox) checkbox.checked = true;
        }

        // Fiyat inputlarını doldur
        if (this.filters.price_min) {
            const minInput = document.querySelector('.price-min');
            if (minInput) minInput.value = this.filters.price_min;
        }
        if (this.filters.price_max) {
            const maxInput = document.querySelector('.price-max');
            if (maxInput) maxInput.value = this.filters.price_max;
        }

        // Sıralama select'ini ayarla
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) sortSelect.value = this.filters.sort;
    },

    initFilters() {
        // Kategori filtreleri
        document.querySelectorAll('.filter-category').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.filters.category = checkbox.value;
                } else if (this.filters.category === checkbox.value) {
                    this.filters.category = '';
                }
                this.filters.page = 1;
                this.applyFilters();
            });
        });

        // Fiyat filtresi
        const priceInputs = document.querySelectorAll('.price-input');
        priceInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.filters.price_min = document.querySelector('.price-min')?.value || '';
                this.filters.price_max = document.querySelector('.price-max')?.value || '';
                this.filters.page = 1;
                this.applyFilters();
            });
        });

        // Filtreleri temizle
        document.querySelector('.clear-filters')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.clearFilters();
        });

        // Arama formu
        const searchForm = document.querySelector('.search-bar form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = searchForm.querySelector('input');
                this.filters.q = input?.value.trim() || '';
                this.filters.page = 1;
                this.applyFilters();
            });
        }
    },

    initSort() {
        document.querySelector('.sort-select')?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.filters.page = 1;
            this.applyFilters();
        });
    },

    applyFilters() {
        const params = new URLSearchParams();
        if (this.filters.q) params.set('q', this.filters.q);
        if (this.filters.category) params.set('category', this.filters.category);
        if (this.filters.price_min) params.set('price_min', this.filters.price_min);
        if (this.filters.price_max) params.set('price_max', this.filters.price_max);
        if (this.filters.sort) params.set('sort', this.filters.sort);
        if (this.filters.page > 1) params.set('page', this.filters.page);

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState({}, '', newUrl);

        this.loadProducts();
    },

    async loadProducts() {
        APP.showLoading();

        try {
            const params = new URLSearchParams();
            params.set('action', 'list');
            params.set('page', this.filters.page);
            params.set('sort', this.filters.sort);
            if (this.filters.q) params.set('search', this.filters.q);
            if (this.filters.category) params.set('category', this.filters.category);
            if (this.filters.price_min) params.set('min_price', this.filters.price_min);
            if (this.filters.price_max) params.set('max_price', this.filters.price_max);

            const response = await fetch(`${APP.config.baseUrl}${APP.config.apiEndpoint}product_api.php?${params}`);
            const data = await response.json();

            if (data.success) {
                this.renderProductGrid(data.products);
                this.updatePagination(data.pagination);
                this.updateResultCount(data.pagination.total_items);
            } else {
                console.error('Ürün yüklenirken hata:', data.message);
            }
        } catch (error) {
            console.error('Ürünler yüklenirken hata:', error);
            APP.showToast('Ürünler yüklenirken hata oluştu!', 'error');
        } finally {
            APP.hideLoading();
        }
    },

    renderProductGrid(products) {
        const grid = document.querySelector('.products-grid');
        if (!grid) return;

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Sonuç Bulunamadı</h3>
                    <p>Farklı arama kriterleri deneyin.</p>
                    <button class="btn btn-primary clear-filters">Filtreleri Temizle</button>
                </div>
            `;
            return;
        }

        const isFavorite = (id) => APP.state.favorites.has(id);

        grid.innerHTML = products.map(product => {
            const price = parseFloat(product.sale_price || product.price);
            const oldPrice = product.sale_price ? parseFloat(product.price) : null;
            const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

            return `
                <div class="product-card">
                    ${discount > 0 ? `<span class="product-badge">-${discount}%</span>` : ''}
                    ${product.is_new ? `<span class="product-badge new">YENİ</span>` : ''}
                    <button class="product-wishlist ${isFavorite(product.id) ? 'active' : ''}" data-product-id="${product.id}">
                        <i class="${isFavorite(product.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="product-image">
                        <img src="${product.image || 'https://via.placeholder.com/400'}" alt="${APP.escapeHtml(product.name)}" loading="lazy">
                        <div class="product-actions">
                            <button class="quick-view" data-product-id="${product.id}"><i class="fas fa-eye"></i></button>
                            <button class="add-to-cart" data-product-id="${product.id}"><i class="fas fa-shopping-cart"></i></button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${APP.escapeHtml(product.category_name || 'Ürün')}</span>
                        <h3 class="product-title"><a href="product-detail.html?id=${product.id}">${APP.escapeHtml(product.name)}</a></h3>
                        <div class="product-price">
                            <span class="current-price">${APP.formatPrice(price)}</span>
                            ${oldPrice ? `<span class="old-price">${APP.formatPrice(oldPrice)}</span>` : ''}
                        </div>
                        <button class="add-to-cart" data-product-id="${product.id}">
                            <i class="fas fa-shopping-cart"></i> Sepete Ekle
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    updatePagination(pagination) {
        const container = document.querySelector('.pagination');
        if (!container) return;

        if (pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        let html = '';

        if (pagination.current_page > 1) {
            html += `<a href="#" data-page="${pagination.current_page - 1}" class="prev"><i class="fas fa-chevron-left"></i></a>`;
        }

        for (let i = 1; i <= pagination.total_pages; i++) {
            if (i === 1 || i === pagination.total_pages || (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)) {
                html += `<a href="#" data-page="${i}" class="${i === pagination.current_page ? 'active' : ''}">${i}</a>`;
            } else if (i === pagination.current_page - 3 || i === pagination.current_page + 3) {
                html += `<span>...</span>`;
            }
        }

        if (pagination.current_page < pagination.total_pages) {
            html += `<a href="#" data-page="${pagination.current_page + 1}" class="next"><i class="fas fa-chevron-right"></i></a>`;
        }

        container.innerHTML = html;

        // Pagination click eventleri
        container.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (page && !isNaN(page)) {
                    this.filters.page = page;
                    this.applyFilters();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
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
            page: 1,
            q: ''
        };

        // Tüm checkboxları temizle
        document.querySelectorAll('.filter-category').forEach(cb => cb.checked = false);

        // Fiyat inputlarını sıfırla
        const priceInputs = document.querySelectorAll('.price-input');
        if (priceInputs.length) {
            priceInputs[0].value = '';
            priceInputs[1].value = '';
        }

        // Arama inputunu temizle
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) searchInput.value = '';

        // Sıralama select'ini sıfırla
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) sortSelect.value = 'newest';

        this.applyFilters();
    }
};

document.addEventListener('DOMContentLoaded', () => Search.init());