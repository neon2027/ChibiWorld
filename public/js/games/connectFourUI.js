// Connect Four UI

export class ConnectFourUI {
    constructor(container, user, gameData, callbacks) {
        this._container = container;
        this._user = user;
        this._callbacks = callbacks;
        this._userId = user.id;
        this._players = gameData.players;
        this._build(gameData.gameState);
    }

    _build(gs) {
        this._container.innerHTML = `
            <div class="mg-c4">
                <div class="mg-c4-status" id="c4Status">Loading…</div>
                <div class="mg-c4-legend" id="c4Legend"></div>
                <div class="mg-c4-board-wrap">
                    <div class="mg-c4-cols" id="c4ColBtns"></div>
                    <div class="mg-c4-board" id="c4Board"></div>
                </div>
                <button class="mg-leave-btn btn btn-ghost" id="c4Leave">Leave Game</button>
            </div>
        `;
        this._renderBoard(gs);
        this._updateStatus(gs);
        this._container.querySelector('#c4Leave').addEventListener('click', () => this._callbacks.onLeave());
    }

    _renderBoard(gs) {
        const boardEl  = this._container.querySelector('#c4Board');
        const colBtns  = this._container.querySelector('#c4ColBtns');
        const legendEl = this._container.querySelector('#c4Legend');
        if (!boardEl) return;

        const board = gs?.board || Array(42).fill(null);
        const isMyTurn = gs?.currentTurn === this._userId && !gs?.winner;

        // Drop buttons
        colBtns.innerHTML = '';
        for (let col = 0; col < 7; col++) {
            const btn = document.createElement('button');
            btn.className = 'mg-c4-col-btn';
            btn.textContent = '▼';
            btn.disabled = !isMyTurn;
            btn.addEventListener('click', () => this._callbacks.onAction('drop', { col }));
            colBtns.appendChild(btn);
        }

        // Grid cells (row 0 = top)
        boardEl.innerHTML = '';
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                const idx = row * 7 + col;
                const cell = document.createElement('div');
                cell.className = 'mg-c4-cell';
                const slot = board[idx];
                if (slot) cell.classList.add(slot);
                if (gs?.winCells?.includes(idx)) cell.classList.add('win-cell');
                boardEl.appendChild(cell);
            }
        }

        // Legend
        if (gs?.playerSlots && legendEl) {
            legendEl.innerHTML = Object.entries(gs.playerSlots).map(([uid, slot]) => {
                const p = this._players.find(pl => String(pl.userId) === String(uid));
                return `<span class="mg-c4-legend-dot ${slot}"></span><span>${p?.username || 'Player'}</span>`;
            }).join('');
        }
    }

    _updateStatus(gs) {
        const el = this._container.querySelector('#c4Status');
        if (!el || !gs) return;

        if (gs.winner === 'draw') {
            el.textContent = "It's a draw! 🤝";
        } else if (gs.winner) {
            el.textContent = String(gs.winner) === String(this._userId) ? '🎉 You win!' : '😔 You lose…';
        } else if (gs.currentTurn === this._userId) {
            el.textContent = 'Your turn — drop a piece!';
        } else {
            const opp = this._players.find(p => p.userId === gs.currentTurn);
            el.textContent = `${opp?.username || 'Opponent'}'s turn…`;
        }
    }

    onStateUpdate(gs) {
        this._renderBoard(gs);
        this._updateStatus(gs);
    }

    destroy() { this._container.innerHTML = ''; }
}

export default ConnectFourUI;
