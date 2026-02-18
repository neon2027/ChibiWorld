import { api } from '../api.js';
import { navigate } from '../router.js';

export async function renderRoomBrowser(container) {
    container.innerHTML = `
        <div class="room-browser scrollbar">
            <h2>Browse Rooms</h2>
            <div style="margin-bottom:16px">
                <button class="btn btn-primary" id="goToMyRoom">Go to My Room</button>
            </div>
            <div id="roomGrid" class="room-grid">
                <div class="loading"><div class="spinner"></div>Loading rooms...</div>
            </div>
        </div>
    `;

    container.querySelector('#goToMyRoom').addEventListener('click', () => navigate('#/my-room'));

    try {
        const rooms = await api.getPublicRooms();
        const grid = container.querySelector('#roomGrid');

        if (rooms.length === 0) {
            grid.innerHTML = '<div style="color:var(--text-muted);font-size:14px;grid-column:1/-1">No public rooms yet. Make yours public in room settings!</div>';
            return;
        }

        grid.innerHTML = rooms.map(r => `
            <div class="room-card" data-id="${r.id}">
                <div class="room-card-icon">🏠</div>
                <div class="room-card-name">${escapeHTML(r.name)}</div>
                <div class="room-card-owner">by ${escapeHTML(r.owner_name)}</div>
                <div class="room-card-count">${r.playerCount > 0 ? `👥 ${r.playerCount} online` : 'Empty'}</div>
            </div>
        `).join('');

        grid.querySelectorAll('[data-id]').forEach(card => {
            card.addEventListener('click', () => navigate(`#/room/${card.dataset.id}`));
        });
    } catch (err) {
        container.querySelector('#roomGrid').innerHTML = `<div style="color:#ff6b6b">Failed to load rooms</div>`;
    }
}

function escapeHTML(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
