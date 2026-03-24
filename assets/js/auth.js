/**
 * KULLANICI GİRİŞ/KAYIT İŞLEMLERİ
 */

const Auth = {
    init() {
        this.initLoginForm();
        this.initRegisterForm();
        this.initPasswordToggle();
    },

    initLoginForm() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';

            try {
                const formData = new FormData(form);
                const response = await fetch(`${APP.baseUrl}api/auth_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'login',
                        email: formData.get('email'),
                        password: formData.get('password'),
                        remember: formData.get('remember') === 'on'
                    })
                });

                const data = await response.json();

                if (data.success) {
                    APP.showToast('Giriş başarılı! Yönlendiriliyorsunuz...', 'success');

                    // Başarılı giriş sonrası yönlendirme
                    const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.php';
                    setTimeout(() => window.location.href = redirect, 1000);
                } else {
                    this.showFormError(form, data.message);
                }
            } catch (error) {
                this.showFormError(form, 'Bir hata oluştu. Lütfen tekrar deneyin.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    },

    initRegisterForm() {
        const form = document.getElementById('register-form');
        if (!form) return;

        // Şifre güçlülük kontrolü
        const passwordInput = form.querySelector('input[name="password"]');
        passwordInput?.addEventListener('input', (e) => this.checkPasswordStrength(e.target));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Şifre eşleşme kontrolü
            const password = form.querySelector('input[name="password"]').value;
            const confirmPassword = form.querySelector('input[name="confirm_password"]').value;

            if (password !== confirmPassword) {
                this.showFormError(form, 'Şifreler eşleşmiyor!');
                return;
            }

            if (password.length < 6) {
                this.showFormError(form, 'Şifre en az 6 karakter olmalıdır!');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';

            try {
                const formData = new FormData(form);
                const response = await fetch(`${APP.baseUrl}api/auth_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register',
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        password: password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    APP.showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
                    setTimeout(() => window.location.href = 'login.php', 1500);
                } else {
                    this.showFormError(form, data.message);
                }
            } catch (error) {
                this.showFormError(form, 'Kayıt sırasında bir hata oluştu.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    },

    checkPasswordStrength(input) {
        const password = input.value;
        const strengthBar = document.querySelector('.password-strength');
        if (!strengthBar) return;

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#059669'];
        const texts = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];

        strengthBar.style.width = `${(strength / 5) * 100}%`;
        strengthBar.style.backgroundColor = colors[strength - 1] || '#ef4444';
        strengthBar.textContent = texts[strength - 1] || '';
    },

    initPasswordToggle() {
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = document.querySelector(btn.dataset.target);
                if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                    btn.querySelector('i').classList.toggle('fa-eye');
                    btn.querySelector('i').classList.toggle('fa-eye-slash');
                }
            });
        });
    },

    showFormError(form, message) {
        // Mevcut hataları temizle
        form.querySelectorAll('.alert-error').forEach(el => el.remove());

        const alert = document.createElement('div');
        alert.className = 'alert alert-error';
        alert.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

        form.insertBefore(alert, form.firstChild);

        // 5 saniye sonra kaldır
        setTimeout(() => alert.remove(), 5000);
    },

    async logout() {
        try {
            const response = await fetch(`${APP.baseUrl}api/auth_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });

            const data = await response.json();

            if (data.success) {
                window.location.href = 'index.php';
            }
        } catch (error) {
            console.error('Çıkış hatası:', error);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());