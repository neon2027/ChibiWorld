import { registerRoute, navigate, start } from './router.js';
import { api } from './api.js';
import { initSocket, getSocket } from './socket.js';
import { showToast } from './ui/toast.js';
import { FriendPanel } from './ui/friendPanel.js';

// Views (lazy-ish — import all, they're small)
import { renderLogin } from './views/loginView.js';
import { renderPlaza, destroyPlaza } from './views/plazaView.js';
import { renderProfile, destroyProfile } from './views/profileView.js';
import { renderFriends } from './views/friendsView.js';
import { renderRoom, destroyRoom } from './views/roomView.js';
import { renderRoomBrowser } from './views/roomBrowserView.js';
import { renderWorldMap, destroyWorldMap } from './views/worldMapView.js';

// Global state
window._currentUser = null;
let _friendPanel = null;
let _currentView = null;

export function setUser(user) {
    window._currentUser = user;
    showNavbar(user);
    initSocket();
    _bindGlobalSocketEvents();
    navigate('#/plaza');
}

async function init() {
    const user = await api.me();

    if (user) {
        window._currentUser = user;
    }

    // Register routes
    registerRoute('#/login', (el) => {
        cleanup();
        renderLogin(el);
        _currentView = 'login';
    });

    registerRoute('#/plaza', (el) => {
        if (!requireAuth()) return;
        cleanup();
        renderPlaza(el);
        _currentView = 'plaza';
    });

    registerRoute('#/profile', (el) => {
        if (!requireAuth()) return;
        cleanup();
        renderProfile(el);
        _currentView = 'profile';
    });

    registerRoute('#/friends', (el) => {
        if (!requireAuth()) return;
        cleanup();
        renderFriends(el);
        _currentView = 'friends';
    });

    registerRoute('#/my-room', (el) => {
        if (!requireAuth()) return;
        cleanup();
        renderRoom(el, { id: 'mine' });
        _currentView = 'room';
    });

    registerRoute('#/room/:id', (el, params) => {
        if (!requireAuth()) return;
        cleanup();
        renderRoom(el, params);
        _currentView = 'room';
    });

    registerRoute('#/rooms', (el) => {
        if (!requireAuth()) return;
        cleanup();
        renderRoomBrowser(el);
        _currentView = 'rooms';
    });

    registerRoute('#/world-map', (el) => {
        if (!requireAuth()) return;
        cleanup();
        renderWorldMap(el);
        _currentView = 'world-map';
    });

    if (user) {
        showNavbar(user);
        initSocket();
        _bindGlobalSocketEvents();
        navigate('#/plaza');
    } else {
        navigate('#/login');
    }

    start();
}

function requireAuth() {
    if (!window._currentUser) { navigate('#/login'); return false; }
    return true;
}

function cleanup() {
    if (_currentView === 'plaza') destroyPlaza();
    if (_currentView === 'room') destroyRoom();
    if (_currentView === 'profile') destroyProfile();
    if (_currentView === 'world-map') destroyWorldMap();
    // Run view-specific cleanup
    const app = document.getElementById('app');
    if (app._cleanup) { app._cleanup(); app._cleanup = null; }
    if (app._roomCleanup) { app._roomCleanup(); app._roomCleanup = null; }
}

function showNavbar(user) {
    const navbar = document.getElementById('navbar');
    const navUser = document.getElementById('navUsername');
    if (navbar) navbar.classList.remove('hidden');
    if (navUser) navUser.textContent = user.username;

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await api.logout();
            window._currentUser = null;
            const sock = getSocket();
            if (sock) sock.disconnect();
            navbar.classList.add('hidden');
            navigate('#/login');
        }, { once: true });
    }

    // Friends overlay
    const overlay = document.getElementById('friendsOverlay');
    const content = document.getElementById('friendsContent');
    const btnFriends = document.getElementById('btnFriends');
    const closeFriends = document.getElementById('closeFriends');

    if (overlay && content && !_friendPanel) {
        _friendPanel = new FriendPanel(overlay, content, user);
    }

    btnFriends?.addEventListener('click', () => {
        overlay?.classList.toggle('hidden');
    });
    closeFriends?.addEventListener('click', () => {
        overlay?.classList.add('hidden');
    });
    // Click outside to close
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });
}

function _bindGlobalSocketEvents() {
    const socket = getSocket();
    if (!socket) return;

    socket.on('error', ({ message }) => {
        showToast('Error', message);
    });

    // Global room invite toast (handled inside roomView too, but good to have here as fallback)
    socket.on('room:invited', ({ roomId, roomName, inviterName }) => {
        showToast('Room Invite!', `${inviterName} invited you to "${roomName}"`, 'info');
    });
}

init();
