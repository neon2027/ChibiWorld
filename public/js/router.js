const routes = new Map();

export function registerRoute(pattern, handler) {
    routes.set(pattern, handler);
}

export function navigate(hash) {
    window.location.hash = hash;
}

export function start() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

function handleRoute() {
    const hash = window.location.hash || '#/login';
    const app = document.getElementById('app');

    for (const [pattern, handler] of routes) {
        const params = matchRoute(pattern, hash);
        if (params !== null) {
            // Update nav active state
            document.querySelectorAll('.nav-link').forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === hash || (pattern !== '#/login' && hash.startsWith(pattern.replace('/:id', ''))));
            });
            handler(app, params);
            return;
        }
    }
    routes.get('#/login')?.(app, {});
}

function matchRoute(pattern, hash) {
    const regexStr = '^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$';
    const match = hash.match(new RegExp(regexStr));
    return match ? (match.groups || {}) : null;
}

export function currentHash() {
    return window.location.hash || '#/login';
}
