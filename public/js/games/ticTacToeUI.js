// Tic-Tac-Toe UI

export class TicTacToeUI {
    constructor(container, user, gameData, callbacks) {
        this._container = container;
        this._user = user;
        this._callbacks = callbacks;
        this._userId = user.id;
        this._players = gameData.players;
        this._mySymbol = gameData.gameState?.symbols?.[this._userId] || '?';
        this._build(gameData.gameState);
    }

    _build(gs) {
        this._container.innerHTML = `
            <div class="mg-ttt">
                <div class="mg-ttt-status" id="tttStatus">Loading…</div>
                <div class="mg-ttt-board" id="tttBoard"></div>
                <button class="mg-leave-btn btn btn-ghost" id="tttLeave">Leave Game</button>
            </div>
        `;
        this._renderBoard(gs);
        this._updateStatus(gs);
        this._container.querySelector('#tttLeave').addEventListener('click', () => this._callbacks.onLeave());
    }

    _renderBoard(gs) {
        const boardEl = this._container.querySelector('#tttBoard');
        if (!boardEl) return;
        boardEl.innerHTML = '';
        const board = gs?.board || Array(9).fill(null);
        const isMyTurn = gs?.currentTurn === this._userId && !gs?.winner;

        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('button');
            cell.className = 'mg-ttt-cell';
            const val = board[i];
            if (val) {
                cell.textContent = val;
                cell.classList.add('taken', val === 'X' ? 'x-cell' : 'o-cell');
                cell.disabled = true;
            } else {
                cell.disabled = !isMyTurn;
                if (isMyTurn) cell.classList.add('available');
                cell.addEventListener('click', () => this._callbacks.onAction('place', { cellIndex: i }));
            }
            if (gs?.winLine?.includes(i)) cell.classList.add('winner-cell');
            boardEl.appendChild(cell);
        }
    }

    _updateStatus(gs) {
        const el = this._container.querySelector('#tttStatus');
        if (!el || !gs) return;

        if (gs.winner === 'draw') {
            el.textContent = "It's a draw! 🤝";
        } else if (gs.winner) {
            el.textContent = String(gs.winner) === String(this._userId) ? '🎉 You win!' : '😔 You lose…';
        } else if (gs.currentTurn === this._userId) {
            el.textContent = `Your turn — play ${this._mySymbol}`;
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

export default TicTacToeUI;
