import { api } from '../api.js';
import { navigate } from '../router.js';
import { setUser } from '../app.js';

export function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-title">🌸 ChibiWorld</div>
                <div class="auth-subtitle">A cozy world for everyone</div>
                <div class="auth-tabs">
                    <button class="auth-tab active" data-tab="login">Login</button>
                    <button class="auth-tab" data-tab="register">Register</button>
                </div>
                <form id="authForm">
                    <div class="form-group">
                        <label class="form-label">Username</label>
                        <input class="form-input" id="authUsername" type="text" placeholder="Your username" autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input class="form-input" id="authPassword" type="password" placeholder="Your password" autocomplete="current-password">
                    </div>
                    <div id="authError" class="form-error" style="margin-bottom:10px"></div>
                    <button type="submit" class="btn btn-primary" style="width:100%">Login</button>
                </form>
            </div>
        </div>
    `;

    let mode = 'login';
    const form = container.querySelector('#authForm');
    const submitBtn = form.querySelector('button[type=submit]');
    const errEl = container.querySelector('#authError');

    container.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            mode = tab.dataset.tab;
            container.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t === tab));
            submitBtn.textContent = mode === 'login' ? 'Login' : 'Create Account';
            errEl.textContent = '';
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = container.querySelector('#authUsername').value.trim();
        const password = container.querySelector('#authPassword').value;
        errEl.textContent = '';
        submitBtn.disabled = true;

        try {
            const user = mode === 'login'
                ? await api.login(username, password)
                : await api.register(username, password);
            setUser(user);
        } catch (err) {
            errEl.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
        }
    });
}
