// Word Scramble UI

export class WordScrambleUI {
    constructor(container, user, gameData, callbacks) {
        this._container = container;
        this._user = user;
        this._callbacks = callbacks;
        this._userId = user.id;
        this._players = gameData.players;
        this._answered = false;
        this._timerInterval = null;
        this._build(gameData.gameState);
    }

    _build(gs) {
        this._container.innerHTML = `
            <div class="mg-ws">
                <div class="mg-ws-round" id="wsRound">Round 1</div>
                <div class="mg-ws-scrambled" id="wsScrambled">---</div>
                <div class="mg-ws-timer-bar">
                    <div class="mg-ws-timer-fill" id="wsTimerFill" style="width:100%"></div>
                </div>
                <div class="mg-ws-input-row">
                    <input class="mg-ws-input" id="wsInput" placeholder="Unscramble the word…" maxlength="32" autocomplete="off" />
                    <button class="btn btn-primary" id="wsSubmit">Submit</button>
                </div>
                <div class="mg-ws-status" id="wsStatus"></div>
                <div class="mg-ws-scores" id="wsScores"></div>
                <button class="mg-leave-btn btn btn-ghost" id="wsLeave">Leave Game</button>
            </div>
        `;

        const submit = () => {
            const input = this._container.querySelector('#wsInput');
            if (!input || !input.value.trim() || this._answered) return;
            this._callbacks.onAction('answer', { text: input.value.trim() });
            this._answered = true;
            input.disabled = true;
            const btn = this._container.querySelector('#wsSubmit');
            if (btn) btn.disabled = true;
            const status = this._container.querySelector('#wsStatus');
            if (status) status.textContent = 'Waiting for others…';
        };

        this._container.querySelector('#wsInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
        });
        this._container.querySelector('#wsSubmit').addEventListener('click', submit);
        this._container.querySelector('#wsLeave').addEventListener('click', () => this._callbacks.onLeave());

        this._updateState(gs, null);
        this._startTimer(gs?.timeLeft || 30);
    }

    _startTimer(seconds = 30) {
        clearInterval(this._timerInterval);
        let remaining = seconds;
        const fill = this._container.querySelector('#wsTimerFill');
        if (!fill) return;
        fill.style.width = '100%';
        fill.style.background = 'var(--green)';

        this._timerInterval = setInterval(() => {
            remaining--;
            const pct = Math.max(0, (remaining / seconds) * 100);
            fill.style.width = `${pct}%`;
            if (pct < 33) fill.style.background = 'var(--pink)';
            else if (pct < 66) fill.style.background = 'var(--yellow)';
            if (remaining <= 0) clearInterval(this._timerInterval);
        }, 1000);
    }

    _updateState(gs, event) {
        if (!gs) return;

        const roundEl = this._container.querySelector('#wsRound');
        if (roundEl) roundEl.textContent = `Round ${gs.round || 1} / ${gs.totalRounds || '?'}`;

        const scrambledEl = this._container.querySelector('#wsScrambled');
        if (scrambledEl) scrambledEl.textContent = gs.scrambled || '---';

        const statusEl = this._container.querySelector('#wsStatus');

        if (event?.type === 'nextRound' || event?.type === 'timeUp') {
            this._answered = false;
            const input = this._container.querySelector('#wsInput');
            if (input) { input.value = ''; input.disabled = false; }
            const btn = this._container.querySelector('#wsSubmit');
            if (btn) btn.disabled = false;
            if (statusEl) { statusEl.textContent = ''; statusEl.style.color = ''; }
            this._startTimer(30);
        }

        this._updateScores(gs.scores);
    }

    _updateScores(scores) {
        const el = this._container.querySelector('#wsScores');
        if (!el || !scores) return;
        const sorted = [...this._players].sort((a, b) =>
            (scores[b.userId] || 0) - (scores[a.userId] || 0)
        );
        el.innerHTML = sorted.map((p, i) =>
            `<div class="mg-ws-score-row ${String(p.userId) === String(this._userId) ? 'mine' : ''}">
                <span>${i + 1}. ${p.username}</span>
                <span>${scores[p.userId] || 0} pts</span>
            </div>`
        ).join('');
    }

    onStateUpdate(gs, event) { this._updateState(gs, event); }

    destroy() {
        clearInterval(this._timerInterval);
        this._container.innerHTML = '';
    }
}

export default WordScrambleUI;
