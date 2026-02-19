// Rock Paper Scissors UI

const RPS_EMOJI = { rock: '🪨', paper: '📄', scissors: '✂️' };

export class RockPaperScissorsUI {
    constructor(container, user, gameData, callbacks) {
        this._container = container;
        this._user = user;
        this._callbacks = callbacks;
        this._userId = user.id;
        this._players = gameData.players;
        this._myChoice = null;
        this._build(gameData.gameState);
    }

    _build(gs) {
        this._container.innerHTML = `
            <div class="mg-rps">
                <div class="mg-rps-round" id="rpsRound">Round 1 — Best of 3</div>
                <div class="mg-rps-status" id="rpsStatus">Choose your move!</div>
                <div class="mg-rps-choices" id="rpsChoices">
                    <button class="mg-rps-btn" data-choice="rock">🪨<span>Rock</span></button>
                    <button class="mg-rps-btn" data-choice="paper">📄<span>Paper</span></button>
                    <button class="mg-rps-btn" data-choice="scissors">✂️<span>Scissors</span></button>
                </div>
                <div class="mg-rps-result" id="rpsResult"></div>
                <div class="mg-rps-scoreboard" id="rpsScoreboard"></div>
                <button class="mg-leave-btn btn btn-ghost" id="rpsLeave">Leave Game</button>
            </div>
        `;

        this._container.querySelectorAll('.mg-rps-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this._myChoice) return;
                this._myChoice = btn.dataset.choice;
                this._callbacks.onAction('pick', { choice: this._myChoice });
                this._container.querySelectorAll('.mg-rps-btn').forEach(b => {
                    b.disabled = true;
                    b.classList.toggle('selected', b.dataset.choice === this._myChoice);
                });
                this._container.querySelector('#rpsStatus').textContent = 'Waiting for opponent…';
            });
        });

        this._container.querySelector('#rpsLeave').addEventListener('click', () => this._callbacks.onLeave());
        this._updateScoreboard(gs);
    }

    _updateScoreboard(gs) {
        const el = this._container.querySelector('#rpsScoreboard');
        if (!el || !gs) return;
        const scores = gs.scores || {};
        el.innerHTML = this._players.map(p =>
            `<div class="mg-rps-score ${p.userId === this._userId ? 'mine' : ''}">
                <span>${p.username}</span><span>${scores[p.userId] || 0} W</span>
            </div>`
        ).join('');
    }

    onStateUpdate(gs, event) {
        this._updateScoreboard(gs);
        const resultEl = this._container.querySelector('#rpsResult');
        const statusEl = this._container.querySelector('#rpsStatus');
        const roundEl  = this._container.querySelector('#rpsRound');

        if (gs.revealed && gs.choices) {
            // Show both choices
            resultEl.innerHTML = Object.entries(gs.choices).map(([uid, choice]) => {
                const p = this._players.find(pl => String(pl.userId) === String(uid));
                return `<div class="mg-rps-reveal">
                    <span>${p?.username || 'Player'}</span>
                    <span class="mg-rps-emoji">${choice ? RPS_EMOJI[choice] : '❓'}</span>
                </div>`;
            }).join('');

            if (event?.type === 'roundWin') {
                statusEl.textContent = String(event.winnerId) === String(this._userId)
                    ? '🎉 You won this round!' : '😔 Opponent won this round…';
            } else if (event?.type === 'roundDraw') {
                statusEl.textContent = "It's a draw! Next round…";
            } else if (gs.matchWinner) {
                statusEl.textContent = String(gs.matchWinner) === String(this._userId)
                    ? '🏆 You win the match!' : '💔 You lose the match…';
            }
        } else {
            // New round reset
            resultEl.innerHTML = '';
            this._myChoice = null;
            this._container.querySelectorAll('.mg-rps-btn').forEach(b => {
                b.disabled = false;
                b.classList.remove('selected');
            });
            if (roundEl) roundEl.textContent = `Round ${gs.round || 1} — Best of 3`;
            if (statusEl) statusEl.textContent = 'Choose your move!';
        }
    }

    destroy() { this._container.innerHTML = ''; }
}

export default RockPaperScissorsUI;
