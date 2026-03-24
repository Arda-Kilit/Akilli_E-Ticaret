/**
 * AKILLI E-TİCARET - ANA JAVASCRIPT
 * Tarih: 2026
 */

// Global Değişkenler
const APP = {
    baseUrl: window.location.origin + '/akilli-etiket/',
    cartCount: 0,
    user: null,

    init() {
        this.initMobileMenu();
        this.initDropdowns();
        this.initScrollEffects();
        this.initSearchAutocomplete();
        this.checkAuthStatus();
        this.updateCartCount();
    },

    // Mobil Menü
    initMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const mobileMenu = document.querySelector('.mobile-menu');
        const overlay = document.querySelector('.mobile-menu-overlay');
        const closeBtn = document.querySelector('.mobile-menu-close');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                mobileMenu?.classList.add('active');
                overlay?.classList.add('active');
                document.body.style.overflow = 'hidden';
            });
        }

        const closeMenu = () => {
            mobileMenu?.classList.remove('active');
            overlay?.classList.remove('active');
            document.body.style.overflow = '';
        };

        closeBtn?.addEventListener('click', closeMenu);
        overlay?.addEventListener('click', closeMenu);
    },

    // Dropdown Menüler
    initDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');

            toggle?.addEventListener('click', (e) => {
                e.preventDefault();
                menu?.classList.toggle('show');
            });
        });

        // Dışarı tıklama ile kapatma
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });
    },

    // Scroll Efektleri
    initScrollEffects() {
        const header = document.querySelector('.main-header');
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 100) {
                header?.classList.add('scrolled');
            } else {
                header?.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        });

        // Animasyonlu elementler
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.product-card, .feature-card, .category-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(el);
        });
    },

    // Arama Otomatik Tamamlama
    initSearchAutocomplete() {
        const searchInput = document.querySelector('.search-bar input');
        const suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'search-suggestions';

        if (searchInput) {
            searchInput.parentElement.appendChild(suggestionsBox);

            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                const query = e.target.value.trim();

                if (query.length < 2) {
                    suggestionsBox.innerHTML = '';
                    return;
                }

                debounceTimer = setTimeout(() => {
                    this.fetchSearchSuggestions(query, suggestionsBox);
                }, 300);
            });

            // Dışarı tıklama ile kapatma
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-bar')) {
                    suggestionsBox.innerHTML = '';
                }
            });
        }
    },

    async fetchSearchSuggestions(query, container) {
        try {
            const response = await fetch(`${this.baseUrl}api/search_api.php?action=suggest&q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success && data.suggestions.length > 0) {
                container.innerHTML = data.suggestions.map(item => `
                    <a href="product-detail.php?id=${item.id}" class="suggestion-item">
                        <img src="${item.image}" alt="${item.name}">
                        <div class="suggestion-info">
                            <span class="suggestion-name">${item.name}</span>
                            <span class="suggestion-price">${this.formatPrice(item.price)}</span>
                        </div>
                    </a>
                `).join('');
            } else {
                container.innerHTML = '<div class="suggestion-empty">Sonuç bulunamadı</div>';
            }
        } catch (error) {
            console.error('Arama önerileri yüklenirken hata:', error);
        }
    },

    // Kimlik Doğrulama Kontrolü
    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.baseUrl}api/auth_api.php?action=check`);
            const data = await response.json();

            if (data.success) {
                this.user = data.user;
                this.updateUIForLoggedInUser();
            }
        } catch (error) {
            console.error('Oturum kontrolü hatası:', error);
        }
    },

    updateUIForLoggedInUser() {
        const loginBtn = document.querySelector('.header-action[href="login.php"]');
        if (loginBtn && this.user) {
            loginBtn.innerHTML = `
                <i class="fas fa-user-check"></i>
                <span>${this.user.name}</span>
            `;
            loginBtn.href = 'profile.php';
        }
    },

    // Sepet Sayısını Güncelle
    async updateCartCount() {
        try {
            const response = await fetch(`${this.baseUrl}api/cart_api.php?action=count`);
            const data = await response.json();

            if (data.success) {
                this.cartCount = data.count;
                const badge = document.querySelector('.cart-count');
                if (badge) {
                    badge.textContent = this.cartCount;
                    badge.style.display = this.cartCount > 0 ? 'flex' : 'none';
                }
            }
        } catch (error) {
            console.error('Sepet sayısı güncellenirken hata:', error);
        }
    },

    // Toast Bildirim
    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || (() => {
            const div = document.createElement('div');
            div.className = 'toast-container';
            document.body.appendChild(div);
            return div;
        })();

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
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Fiyat Formatı
    formatPrice(price) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(price);
    },

    // Yükleme Göstergesi
    showLoading() {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        overlay.id = 'global-loading';
        document.body.appendChild(overlay);
    },

    hideLoading() {
        const overlay = document.getElementById('global-loading');
        overlay?.remove();
    },

    // AJAX İsteği
    async ajax(url, options = {}) {
        this.showLoading();
        try {
            const response = await fetch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                },
                ...options
            });
            return await response.json();
        } catch (error) {
            this.showToast('Bir hata oluştu!', 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => APP.init());