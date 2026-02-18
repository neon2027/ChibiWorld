import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { showToast } from '../ui/toast.js';

export function renderFriends(container) {
    container.innerHTML = `
        <div class="friends-view scrollbar">
            <h2>Friends</h2>

            <div class="add-friend-row">
                <input class="form-input" id="addFriendInput" placeholder="Enter username..." maxlength="20">
                <button class="btn btn-primary" id="addFriendBtn">Add Friend</button>
            </div>

            <div class="section-title">Pending Requests</div>
            <div id="requestsList"><div style="color:var(--text-muted);font-size:13px">Loading...</div></div>

            <div class="section-title" style="margin-top:20px">Friends</div>
            <div id="friendsList"><div style="color:var(--text-muted);font-size:13px">Loading...</div></div>
        </div>
    `;

    const input = container.querySelector('#addFriendInput');
    const addBtn = container.querySelector('#addFriendBtn');
    const requestsList = container.querySelector('#requestsList');
    const friendsList = container.querySelector('#friendsList');

    addBtn.addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) return;
        getSocket()?.emit('friend:request', { toUsername: name });
        input.value = '';
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });

    async function load() {
        try {
            const [friends, requests] = await Promise.all([api.getFriends(), api.getFriendRequests()]);

            requestsList.innerHTML = requests.length === 0
                ? '<div style="color:var(--text-muted);font-size:13px">No pending requests</div>'
                : requests.map(r => `
                    <div class="friend-card">
                        <div class="friend-avatar-dot">👤</div>
                        <div class="friend-info"><div class="friend-name">${r.from_username}</div><div class="friend-status">Wants to be friends</div></div>
                        <div class="friend-actions">
                            <button class="btn btn-sm btn-primary" data-accept="${r.id}">Accept</button>
                            <button class="btn btn-sm btn-secondary" data-decline="${r.id}">Decline</button>
                        </div>
                    </div>`).join('');

            friendsList.innerHTML = friends.length === 0
                ? '<div style="color:var(--text-muted);font-size:13px">No friends yet. Add someone!</div>'
                : friends.map(f => `
                    <div class="friend-card">
                        <div class="friend-avatar-dot">${f.online ? '🟢' : '⚫'}</div>
                        <div class="friend-info">
                            <div class="friend-name">${f.username}</div>
                            <div class="friend-status ${f.online ? 'online' : 'offline'}">${f.online ? 'Online now' : 'Offline'}</div>
                        </div>
                        <div class="friend-actions">
                            <button class="btn btn-sm btn-danger" data-remove="${f.id}">Remove</button>
                        </div>
                    </div>`).join('');

            // Bind buttons
            requestsList.querySelectorAll('[data-accept]').forEach(btn =>
                btn.addEventListener('click', () => { getSocket()?.emit('friend:accept', { requestId: parseInt(btn.dataset.accept) }); load(); })
            );
            requestsList.querySelectorAll('[data-decline]').forEach(btn =>
                btn.addEventListener('click', () => { getSocket()?.emit('friend:decline', { requestId: parseInt(btn.dataset.decline) }); load(); })
            );
            friendsList.querySelectorAll('[data-remove]').forEach(btn =>
                btn.addEventListener('click', () => {
                    if (!confirm('Remove friend?')) return;
                    getSocket()?.emit('friend:remove', { friendId: parseInt(btn.dataset.remove) });
                    load();
                })
            );
        } catch (err) {
            friendsList.innerHTML = `<div style="color:#ff6b6b">Error loading friends</div>`;
        }
    }

    load();

    // Live updates via socket
    const socket = getSocket();
    if (socket) {
        const refresh = () => load();
        socket.on('friend:requestReceived', refresh);
        socket.on('friend:requestAccepted', refresh);
        socket.on('friend:online', refresh);
        socket.on('friend:offline', refresh);
        socket.on('friend:removed', refresh);
        // Cleanup when view changes
        container._cleanup = () => {
            socket.off('friend:requestReceived', refresh);
            socket.off('friend:requestAccepted', refresh);
            socket.off('friend:online', refresh);
            socket.off('friend:offline', refresh);
            socket.off('friend:removed', refresh);
        };
    }
}
