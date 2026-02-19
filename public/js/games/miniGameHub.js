// MiniGameHub — modal controller for the mini-games lobby

import { getSocket } from '../socket.js';

const GAME_META = {
    ticTacToe:    { label: 'Tic-Tac-Toe',          icon: '✖',  minPlayers: 2, maxPlayers: 2 },
    rps:          { label: 'Rock Paper Scissors',   icon: '✊', minPlayers: 2, maxPlayers: 2 },
    connectFour:  { label: 'Connect Four',          icon: '🔵', minPlayers: 2, maxPlayers: 2 },
    drawGuess:    { label: 'Draw & Guess',          icon: '🎨', minPlayers: 2, maxPlayers: 8 },
    wordScramble: { label: 'Word Scramble',         icon: '📝', minPlayers: 2, maxPlayers: 6 },
    triviaQuiz:   { label: 'Trivia Quiz',           icon: '❓', minPlayers: 2, maxPlayers: 8 },
};

export class MiniGameHub {
    constructor(user, invitePayload = null) {
        this._user = user;
        this._socket = getSocket();
        this._currentGame = null;
        this._gameUI = null;
        this._handlers = {};
        this._el = null;

        this._build();
        this._bindSocket();
        this._socket.emit('minigame:list');

        if (invitePayload) this._acceptInvite(invitePayload);
    }

    // ── Modal DOM ─────────────────────────────────────────────────────

    _build() {
        const modal = document.createElement('div');
        modal.className = 'mg-overlay';
        modal.innerHTML = `
            <div class="mg-modal">
                <div class="mg-header">
                    <span class="mg-title">🎮 Mini Games</span>
                    <button class="mg-close" id="mgClose">✕</button>
                </div>
                <div class="mg-body" id="mgBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
        this._el = modal;

        modal.querySelector('#mgClose').addEventListener('click', () => this.destroy());
        modal.addEventListener('click', (e) => { if (e.target === modal) this.destroy(); });

        this._showLobby();
    }

    // ── Lobby ─────────────────────────────────────────────────────────

    _showLobby(games = []) {
        const body = this._el.querySelector('#mgBody');
        body.innerHTML = `
            <div class="mg-lobby">
                <div class="mg-section-title">Create a Game</div>
                <div class="mg-create-grid" id="mgCreateGrid"></div>
                <div class="mg-section-title" style="margin-top:16px">Open Games</div>
                <div class="mg-game-list" id="mgGameList">
                    <div class="mg-empty">No open games. Create one above!</div>
                </div>
            </div>
        `;
        const grid = body.querySelector('#mgCreateGrid');
        for (const [type, meta] of Object.entries(GAME_META)) {
            const btn = document.createElement('button');
            btn.className = 'mg-create-btn';
            btn.innerHTML = `<span class="mg-create-icon">${meta.icon}</span><span>${meta.label}</span>`;
            btn.addEventListener('click', () => this._createGame(type));
            grid.appendChild(btn);
        }
        this._updateGameList(games);
    }

    _updateGameList(games) {
        const listEl = this._el?.querySelector('#mgGameList');
        if (!listEl) return;
        if (!games || games.length === 0) {
            listEl.innerHTML = '<div class="mg-empty">No open games. Create one above!</div>';
            return;
        }
        listEl.innerHTML = '';
        for (const g of games) {
            const meta = GAME_META[g.type] || { label: g.type, icon: '🎮' };
            const row = document.createElement('div');
            row.className = 'mg-game-row';
            row.innerHTML = `
                <span class="mg-game-icon">${meta.icon}</span>
                <span class="mg-game-info">
                    <span class="mg-game-name">${meta.label}</span>
                    <span class="mg-game-host">by ${g.hostName}</span>
                </span>
                <span class="mg-game-players">${g.playerCount}/${g.maxPlayers}</span>
                <button class="mg-join-btn btn-sm" data-gid="${g.id}">Join</button>
            `;
            row.querySelector('.mg-join-btn').addEventListener('click', () => {
                this._socket.emit('minigame:join', { gameId: g.id });
            });
            listEl.appendChild(row);
        }
    }

    // ── Waiting Room ──────────────────────────────────────────────────

    _showWaitingRoom(game) {
        this._currentGame = game;
        const body = this._el.querySelector('#mgBody');
        const meta = GAME_META[game.type] || { label: game.type, icon: '🎮' };

        body.innerHTML = `
            <div class="mg-waiting">
                <div class="mg-wt-title">${meta.icon} ${meta.label}</div>
                <div class="mg-wt-subtitle" id="mgWtSubtitle">
                    Waiting for players (${game.players.length}/${game.maxPlayers})…
                </div>
                <div class="mg-player-list" id="mgPlayerList"></div>
                <div class="mg-wt-hint">All players must click Ready to start.</div>
                <div class="mg-wt-actions">
                    <button class="btn btn-primary" id="mgReadyBtn">✓ Ready</button>
                    <button class="btn btn-ghost" id="mgLeaveBtn">Leave</button>
                </div>
            </div>
        `;

        this._renderPlayerList(game.players);

        body.querySelector('#mgReadyBtn').addEventListener('click', () => {
            this._socket.emit('minigame:ready', { gameId: game.id });
            const btn = body.querySelector('#mgReadyBtn');
            btn.disabled = true;
            btn.textContent = 'Waiting…';
        });
        body.querySelector('#mgLeaveBtn').addEventListener('click', () => {
            this._socket.emit('minigame:leave', { gameId: game.id });
            this._currentGame = null;
            this._socket.emit('minigame:list');
            this._showLobby();
        });
    }

    _renderPlayerList(players) {
        const listEl = this._el?.querySelector('#mgPlayerList');
        if (!listEl) return;
        listEl.innerHTML = '';
        for (const p of players) {
            const row = document.createElement('div');
            row.className = 'mg-player-row';
            const isMe = p.userId === this._user.id;
            row.innerHTML = `
                <span class="mg-player-name">${p.username}${isMe ? ' <em>(you)</em>' : ''}</span>
                <span class="mg-player-ready ${p.ready ? 'ready' : ''}">${p.ready ? '✓ Ready' : '…'}</span>
            `;
            listEl.appendChild(row);
        }
        const subtitle = this._el?.querySelector('#mgWtSubtitle');
        if (subtitle && this._currentGame) {
            subtitle.textContent = `Waiting for players (${players.length}/${this._currentGame.maxPlayers})…`;
        }
    }

    // ── Active game ───────────────────────────────────────────────────

    async _showGame(game) {
        this._currentGame = game;
        const body = this._el.querySelector('#mgBody');
        body.innerHTML = '<div class="mg-game-viewport" id="mgGameViewport"></div>';

        const callbacks = {
            onAction: (actionType, data) => {
                this._socket.emit('minigame:action', { gameId: game.id, type: actionType, data });
            },
            onLeave: () => {
                this._socket.emit('minigame:leave', { gameId: game.id });
                this._currentGame = null;
                this._gameUI?.destroy();
                this._gameUI = null;
                this._socket.emit('minigame:list');
                this._showLobby();
            },
            onDrawStroke: (stroke) => {
                this._socket.emit('minigame:drawStroke', { gameId: game.id, stroke });
            }
        };

        const UIClass = await this._loadGameUI(game.type);
        if (!UIClass) return;
        this._gameUI?.destroy();
        this._gameUI = new UIClass(body.querySelector('#mgGameViewport'), this._user, game, callbacks);
    }

    async _loadGameUI(type) {
        const map = {
            ticTacToe:    () => import('./ticTacToeUI.js'),
            rps:          () => import('./rockPaperScissorsUI.js'),
            connectFour:  () => import('./connectFourUI.js'),
            drawGuess:    () => import('./drawGuessUI.js'),
            wordScramble: () => import('./wordScrambleUI.js'),
            triviaQuiz:   () => import('./triviaQuizUI.js'),
        };
        const loader = map[type];
        if (!loader) return null;
        const mod = await loader();
        return mod.default || Object.values(mod)[0];
    }

    // ── Game Over ─────────────────────────────────────────────────────

    _showGameOver(scores, winner) {
        this._gameUI?.destroy();
        this._gameUI = null;

        const body = this._el?.querySelector('#mgBody');
        if (!body) return;

        const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b.score - a.score);
        const medals = ['🥇', '🥈', '🥉'];
        const winnerData = scores[winner];

        body.innerHTML = `
            <div class="mg-gameover">
                <div class="mg-gameover-title">🏆 Game Over!</div>
                ${winnerData ? `<div class="mg-gameover-winner">Winner: <strong>${winnerData.username || 'Player'}</strong></div>` : ''}
                <div class="mg-score-list">
                    ${sortedScores.map(([uid, s], i) => `
                        <div class="mg-score-row ${String(uid) === String(winner) ? 'winner' : ''}">
                            <span>${medals[i] || '  '} ${s.username || 'Player'}</span>
                            <span>${s.score} pts</span>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary" id="mgBackBtn">Back to Hub</button>
            </div>
        `;
        body.querySelector('#mgBackBtn').addEventListener('click', () => {
            this._currentGame = null;
            this._socket.emit('minigame:list');
            this._showLobby();
        });
    }

    // ── Socket listeners ──────────────────────────────────────────────

    _bindSocket() {
        const s = this._socket;
        const on = (event, fn) => { s.on(event, fn); this._handlers[event] = fn; };

        on('minigame:gameList', (games) => {
            if (!this._currentGame) this._updateGameList(games);
        });

        on('minigame:created', ({ game }) => {
            this._showWaitingRoom(game);
        });

        on('minigame:joined', ({ game }) => {
            this._showWaitingRoom(game);
        });

        on('minigame:playerJoined', ({ userId, username }) => {
            if (this._currentGame) {
                this._currentGame.players.push({ userId, username, ready: false, score: 0 });
                this._renderPlayerList(this._currentGame.players);
            }
        });

        on('minigame:playerLeft', ({ userId }) => {
            if (this._currentGame) {
                this._currentGame.players = this._currentGame.players.filter(p => p.userId !== userId);
                this._renderPlayerList(this._currentGame.players);
            }
        });

        on('minigame:playerReady', ({ userId }) => {
            if (this._currentGame) {
                const p = this._currentGame.players.find(pl => pl.userId === userId);
                if (p) p.ready = true;
                this._renderPlayerList(this._currentGame.players);
            }
        });

        on('minigame:started', ({ game }) => {
            this._showGame(game);
        });

        on('minigame:stateUpdate', ({ gameState, event }) => {
            this._gameUI?.onStateUpdate?.(gameState, event);
        });

        on('minigame:drawStroke', ({ stroke }) => {
            this._gameUI?.onDrawStroke?.(stroke);
        });

        on('minigame:drawerInfo', ({ wordChoices }) => {
            this._gameUI?.onDrawerInfo?.(wordChoices);
        });

        on('minigame:gameOver', ({ scores, winner, reason }) => {
            this._showGameOver(scores, winner);
        });

        on('minigame:error', ({ message }) => {
            this._showToast(message, 'error');
        });

        on('minigame:invited', ({ gameId, gameType, inviterName, label }) => {
            this._showInviteToast(gameId, gameType, inviterName, label);
        });

        on('minigame:inviteDeclined', ({ declinerName }) => {
            this._showToast(`${declinerName} declined your invite`, 'warn');
        });
    }

    // ── Actions ───────────────────────────────────────────────────────

    _createGame(type) {
        const meta = GAME_META[type];
        this._socket.emit('minigame:create', { type, maxPlayers: meta.maxPlayers });
    }

    _acceptInvite({ gameId }) {
        this._socket.emit('minigame:inviteAccept', { gameId });
    }

    challengePlayer(targetUserId, gameType) {
        if (!GAME_META[gameType]) return;
        this._socket.emit('minigame:invite', { targetUserId, gameType });
    }

    // ── Toasts ────────────────────────────────────────────────────────

    _showToast(msg, type = 'info') {
        if (!this._el) return;
        const t = document.createElement('div');
        t.className = `mg-toast mg-toast-${type}`;
        t.textContent = msg;
        this._el.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    _showInviteToast(gameId, gameType, inviterName, label) {
        const meta = GAME_META[gameType] || { icon: '🎮' };
        const t = document.createElement('div');
        t.className = 'mg-invite-toast';
        t.innerHTML = `
            <span>${meta.icon} <strong>${inviterName}</strong> invites you to <em>${label}</em></span>
            <div class="mg-invite-btns">
                <button class="btn btn-primary btn-sm mg-accept-btn">Accept</button>
                <button class="btn btn-ghost btn-sm mg-decline-btn">Decline</button>
            </div>
        `;
        document.body.appendChild(t);
        const timer = setTimeout(() => t.remove(), 20_000);

        t.querySelector('.mg-accept-btn').addEventListener('click', () => {
            clearTimeout(timer);
            t.remove();
            this._acceptInvite({ gameId });
        });
        t.querySelector('.mg-decline-btn').addEventListener('click', () => {
            clearTimeout(timer);
            t.remove();
            this._socket.emit('minigame:inviteDecline', { gameId });
        });
    }

    // ── Cleanup ───────────────────────────────────────────────────────

    destroy() {
        const s = this._socket;
        for (const [event, fn] of Object.entries(this._handlers)) s.off(event, fn);
        this._handlers = {};
        this._gameUI?.destroy();
        this._gameUI = null;
        this._el?.remove();
        this._el = null;
    }
}
