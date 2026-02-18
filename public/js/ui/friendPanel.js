import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { showToast } from './toast.js';

// Manages the friends overlay (top-right panel)
export class FriendPanel {
    constructor(overlayEl, contentEl, user) {
        this.overlay = overlayEl;
        this.content = contentEl;
        this.user = user;
        this._friends = [];
        this._requests = [];
        this._bindSocket();
        this.load();
    }

    async load() {
        try {
            [this._friends, this._requests] = await Promise.all([api.getFriends(), api.getFriendRequests()]);
            this.render();
        } catch {}
    }

    render() {
        this.content.innerHTML = `
            ${this._requests.length ? `
            <div style="padding:10px 14px">
                <div class="section-title">Friend Requests (${this._requests.length})</div>
                ${this._requests.map(r => `
                    <div class="friend-card" style="margin-bottom:6px">
                        <div class="friend-avatar-dot">👤</div>
                        <div class="friend-info"><div class="friend-name">${r.from_username}</div></div>
                        <div class="friend-actions">
                            <button class="btn btn-sm btn-primary" data-accept="${r.id}">✓</button>
                            <button class="btn btn-sm btn-secondary" data-decline="${r.id}">✗</button>
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}

            <div style="padding:10px 14px">
                <div class="section-title">Friends (${this._friends.length})</div>
                ${this._friends.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No friends yet. Add someone!</div>' : ''}
                ${this._friends.map(f => `
                    <div class="friend-card">
                        <div class="friend-avatar-dot">${f.online ? '🟢' : '⚫'}</div>
                        <div class="friend-info">
                            <div class="friend-name">${f.username}</div>
                            <div class="friend-status ${f.online ? 'online' : 'offline'}">${f.online ? 'Online' : 'Offline'}</div>
                        </div>
                        <div class="friend-actions">
                            <button class="btn btn-sm btn-secondary" data-remove="${f.id}" title="Remove friend">✕</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.content.querySelectorAll('[data-accept]').forEach(btn => {
            btn.addEventListener('click', () => this._acceptRequest(parseInt(btn.dataset.accept)));
        });
        this.content.querySelectorAll('[data-decline]').forEach(btn => {
            btn.addEventListener('click', () => this._declineRequest(parseInt(btn.dataset.decline)));
        });
        this.content.querySelectorAll('[data-remove]').forEach(btn => {
            btn.addEventListener('click', () => this._removeFriend(parseInt(btn.dataset.remove)));
        });
    }

    _acceptRequest(requestId) {
        getSocket()?.emit('friend:accept', { requestId });
        this._requests = this._requests.filter(r => r.id !== requestId);
        this.render();
    }

    _declineRequest(requestId) {
        getSocket()?.emit('friend:decline', { requestId });
        this._requests = this._requests.filter(r => r.id !== requestId);
        this.render();
    }

    _removeFriend(friendId) {
        if (!confirm('Remove this friend?')) return;
        getSocket()?.emit('friend:remove', { friendId });
        this._friends = this._friends.filter(f => f.id !== friendId);
        this.render();
    }

    _bindSocket() {
        const socket = getSocket();
        if (!socket) return;

        socket.on('friend:requestReceived', ({ requestId, fromUserId, fromUsername }) => {
            this._requests.push({ id: requestId, from_user_id: fromUserId, from_username: fromUsername });
            this.render();
            showToast('Friend Request', `${fromUsername} wants to be friends!`, 'info');
        });

        socket.on('friend:requestAccepted', ({ userId, username }) => {
            this._friends.push({ id: userId, username, online: true });
            this.render();
            showToast('Friend Added!', `${username} accepted your request.`, 'success');
        });

        socket.on('friend:online', ({ userId }) => {
            const f = this._friends.find(f => f.id === userId);
            if (f) { f.online = true; this.render(); }
        });

        socket.on('friend:offline', ({ userId }) => {
            const f = this._friends.find(f => f.id === userId);
            if (f) { f.online = false; this.render(); }
        });

        socket.on('friend:removed', ({ userId }) => {
            this._friends = this._friends.filter(f => f.id !== userId);
            this.render();
        });

        socket.on('friend:requestSent', ({ toUsername }) => {
            showToast('Request Sent', `Friend request sent to ${toUsername}!`, 'success');
        });
    }

    show() { this.overlay.classList.remove('hidden'); }
    hide() { this.overlay.classList.add('hidden'); }
}
