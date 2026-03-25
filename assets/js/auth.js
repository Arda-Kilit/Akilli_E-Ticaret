/**
 * KULLANICI GİRİŞ/KAYIT İŞLEMLERİ - PROFESYONEL VERSİYON
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
                const response = await fetch(`${APP.config.baseUrl}${APP.config.apiEndpoint}auth_api.php`, {
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
                    const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
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

        const passwordInput = form.querySelector('input[name="password"]');
        passwordInput?.addEventListener('input', (e) => this.checkPasswordStrength(e.target));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

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
                const response = await fetch(`${APP.config.baseUrl}${APP.config.apiEndpoint}auth_api.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register',
                        first_name: formData.get('first_name'),
                        last_name: formData.get('last_name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        password: password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    APP.showToast('Kayıt başarılı! Giriş yapabilirsiniz.', 'success');
                    setTimeout(() => window.location.href = 'login.html', 1500);
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
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
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
        strengthText.textContent = `Şifre gücü: ${texts[strength - 1] || 'Çok Zayıf'}`;
        strengthText.style.color = colors[strength - 1] || '#ef4444';
    },

    initPasswordToggle() {
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                if (input && input.type === 'password') {
                    input.type = 'text';
                    btn.classList.remove('fa-eye');
                    btn.classList.add('fa-eye-slash');
                } else if (input) {
                    input.type = 'password';
                    btn.classList.remove('fa-eye-slash');
                    btn.classList.add('fa-eye');
                }
            });
        });
    },

    showFormError(form, message) {
        form.querySelectorAll('.alert-error').forEach(el => el.remove());
        const alert = document.createElement('div');
        alert.className = 'alert-error';
        alert.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        form.insertBefore(alert, form.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());