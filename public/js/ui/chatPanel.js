import { getSocket } from '../socket.js';
import { api } from '../api.js';
import { showToast } from './toast.js';

export class ChatPanel {
    constructor(container, user) {
        this.container = container;
        this.user = user;
        this._activeTab = 'global';
        this._whisperTabs = new Map(); // userId -> { username, messages, unread }
        this._globalMessages = [];
        this._typingTimers = {};

        this._render();
        this._loadHistory();
        this._bindSocket();
    }

    _render() {
        this.container.innerHTML = `
            <div class="sidebar-header">Chat</div>
            <div class="chat-panel">
                <div class="chat-tabs" id="chatTabs">
                    <div class="chat-tab active" data-tab="global">Global</div>
                </div>
                <div class="chat-messages scrollbar" id="chatMessages"></div>
                <div class="chat-typing" id="chatTyping"></div>
                <div class="chat-input-row">
                    <input class="chat-input" id="chatInput" placeholder="Type a message... (Enter to send)" maxlength="500">
                    <button class="chat-send" id="chatSend">➤</button>
                </div>
            </div>
        `;

        this._tabsEl = this.container.querySelector('#chatTabs');
        this._messagesEl = this.container.querySelector('#chatMessages');
        this._typingEl = this.container.querySelector('#chatTyping');
        this._input = this.container.querySelector('#chatInput');
        this._sendBtn = this.container.querySelector('#chatSend');

        this._sendBtn.addEventListener('click', () => this._send());
        this._input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._send();
            else this._emitTyping();
        });
        this._tabsEl.addEventListener('click', (e) => {
            const tab = e.target.closest('[data-tab]');
            if (tab) this._switchTab(tab.dataset.tab);
            const close = e.target.closest('[data-close]');
            if (close) { e.stopPropagation(); this._closeWhisperTab(close.dataset.close); }
        });
    }

    async _loadHistory() {
        try {
            const msgs = await api.getChatHistory();
            for (const m of msgs) this._addGlobalMessage(m, false);
            this._scrollBottom();
        } catch {}
    }

    _bindSocket() {
        const socket = getSocket();
        if (!socket) return;

        socket.on('chat:global', (msg) => {
            this._addGlobalMessage(msg);
            if (this._activeTab !== 'global') this._incUnread('global');
        });

        socket.on('chat:whisper', (msg) => {
            const isFromMe = msg.senderId === this.user.id;
            const otherId = isFromMe ? msg.recipientId : msg.senderId;
            const otherName = isFromMe ? msg.recipientName : msg.senderName;
            this._addWhisperMessage(msg.senderId === this.user.id ? 'me' : msg.senderId, otherName || 'User', msg);
            if (this._activeTab !== String(otherId)) {
                if (!isFromMe) {
                    showToast(`Whisper from ${msg.senderName}`, msg.content.slice(0, 60), 'info');
                    this._incUnread(String(msg.senderId));
                }
            }
        });

        socket.on('chat:typing', ({ userId, username, channel }) => {
            if (userId === this.user.id) return;
            clearTimeout(this._typingTimers[userId]);
            this._typingEl.textContent = `${username} is typing...`;
            this._typingTimers[userId] = setTimeout(() => {
                this._typingEl.textContent = '';
            }, 2500);
        });
    }

    _send() {
        const text = this._input.value.trim();
        if (!text) return;
        const socket = getSocket();
        if (!socket) return;

        if (this._activeTab === 'global') {
            socket.emit('chat:global', { content: text });
        } else {
            const userId = parseInt(this._activeTab);
            socket.emit('chat:whisper', { toUserId: userId, content: text });
        }
        this._input.value = '';
    }

    _emitTyping() {
        const socket = getSocket();
        if (!socket) return;
        if (this._activeTab === 'global') socket.emit('chat:typing', { channel: 'global' });
        else socket.emit('chat:typing', { channel: 'whisper', toUserId: parseInt(this._activeTab) });
    }

    _addGlobalMessage(msg, scroll = true) {
        this._globalMessages.push(msg);
        if (this._activeTab !== 'global') return;
        this._appendMessage(msg, false);
        if (scroll) this._scrollBottom();
    }

    _addWhisperMessage(senderId, senderName, msg) {
        const tabId = senderId === 'me' ? String(this._activeTab) : String(senderId);
        if (!this._whisperTabs.has(tabId)) {
            this._whisperTabs.set(tabId, { username: senderName, messages: [], unread: 0 });
            this._addWhisperTab(tabId, senderName);
        }
        this._whisperTabs.get(tabId).messages.push(msg);
        if (this._activeTab === tabId) {
            this._appendMessage(msg, msg.senderId === this.user.id);
            this._scrollBottom();
        }
    }

    _appendMessage(msg, isMine = false) {
        const div = document.createElement('div');
        div.className = `chat-msg${isMine ? ' mine' : ''}`;
        const time = new Date(msg.created_at || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const name = msg.sender_name || msg.senderName || 'Unknown';
        div.innerHTML = `
            <div class="chat-msg-header">
                <span class="chat-msg-name" data-uid="${msg.sender_id || msg.senderId}">${name}</span>
                <span class="chat-msg-time">${time}</span>
            </div>
            <div class="chat-msg-text">${escapeHTML(msg.content)}</div>
        `;
        div.querySelector('.chat-msg-name').addEventListener('click', () => {
            if (msg.senderId !== this.user.id && msg.sender_id !== this.user.id) {
                this.openWhisper(msg.sender_id || msg.senderId, msg.sender_name || msg.senderName);
            }
        });
        this._messagesEl.appendChild(div);
    }

    _scrollBottom() {
        this._messagesEl.scrollTop = this._messagesEl.scrollHeight;
    }

    _addWhisperTab(tabId, username) {
        const tab = document.createElement('div');
        tab.className = 'chat-tab';
        tab.dataset.tab = tabId;
        tab.innerHTML = `💬 ${username} <span class="tab-close" data-close="${tabId}">✕</span>`;
        this._tabsEl.appendChild(tab);
    }

    _switchTab(tabId) {
        this._activeTab = tabId;
        this._tabsEl.querySelectorAll('.chat-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        this._messagesEl.innerHTML = '';

        // Remove unread badge
        const badge = this._tabsEl.querySelector(`[data-tab="${tabId}"] .unread-badge`);
        if (badge) badge.remove();

        if (tabId === 'global') {
            for (const m of this._globalMessages) this._appendMessage(m, m.sender_id === this.user.id);
        } else {
            const wt = this._whisperTabs.get(tabId);
            if (wt) {
                wt.unread = 0;
                for (const m of wt.messages) this._appendMessage(m, m.senderId === this.user.id);
            }
        }
        this._scrollBottom();
    }

    _closeWhisperTab(tabId) {
        this._whisperTabs.delete(tabId);
        const tab = this._tabsEl.querySelector(`[data-tab="${tabId}"]`);
        if (tab) tab.remove();
        if (this._activeTab === tabId) this._switchTab('global');
    }

    _incUnread(tabId) {
        const tab = this._tabsEl.querySelector(`[data-tab="${tabId}"]`);
        if (!tab) return;
        let badge = tab.querySelector('.unread-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'unread-badge';
            tab.prepend(badge);
        }
        badge.textContent = parseInt(badge.textContent || 0) + 1;
    }

    openWhisper(userId, username) {
        const tabId = String(userId);
        if (!this._whisperTabs.has(tabId)) {
            this._whisperTabs.set(tabId, { username, messages: [], unread: 0 });
            this._addWhisperTab(tabId, username);
            // Load history async
            api.getWhisperHistory(userId).then(msgs => {
                const wt = this._whisperTabs.get(tabId);
                if (wt) { wt.messages = msgs; if (this._activeTab === tabId) { this._messagesEl.innerHTML = ''; for (const m of msgs) this._appendMessage(m, m.sender_id === this.user.id); this._scrollBottom(); } }
            }).catch(() => {});
        }
        this._switchTab(tabId);
    }
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
