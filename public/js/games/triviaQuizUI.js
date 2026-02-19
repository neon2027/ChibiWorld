// Trivia Quiz UI

export class TriviaQuizUI {
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
            <div class="mg-trivia">
                <div class="mg-trivia-header">
                    <span class="mg-trivia-qnum" id="triviaQNum">Q1 / 10</span>
                    <div class="mg-trivia-timer-bar">
                        <div class="mg-trivia-timer-fill" id="triviaTimerFill"></div>
                    </div>
                </div>
                <div class="mg-trivia-question" id="triviaQuestion">Loading…</div>
                <div class="mg-trivia-options" id="triviaOptions"></div>
                <div class="mg-trivia-feedback" id="triviaFeedback"></div>
                <div class="mg-trivia-scores" id="triviaScores"></div>
                <button class="mg-leave-btn btn btn-ghost" id="triviaLeave">Leave Game</button>
            </div>
        `;
        this._container.querySelector('#triviaLeave').addEventListener('click', () => this._callbacks.onLeave());
        this._updateState(gs, null);
    }

    _renderQuestion(gs) {
        const qEl    = this._container.querySelector('#triviaQuestion');
        const optEl  = this._container.querySelector('#triviaOptions');
        const qNumEl = this._container.querySelector('#triviaQNum');

        if (!gs?.currentQ) {
            if (qEl) qEl.textContent = 'Loading question…';
            return;
        }

        if (qNumEl) qNumEl.textContent = `Q${gs.questionIndex + 1} / ${gs.totalQuestions}`;
        if (qEl) qEl.textContent = gs.currentQ.text;
        if (!optEl) return;

        optEl.innerHTML = '';
        gs.currentQ.options.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'mg-trivia-opt';
            btn.textContent = opt;

            if (gs.revealAnswer) {
                btn.disabled = true;
                if (i === gs.correctIndex) btn.classList.add('correct');
                else if (gs.answers?.[this._userId]?.optionIndex === i) btn.classList.add('wrong');
            } else {
                const alreadyAnswered = gs.answers?.[this._userId] !== undefined;
                btn.disabled = this._answered || alreadyAnswered;
                btn.addEventListener('click', () => {
                    if (this._answered) return;
                    this._answered = true;
                    this._callbacks.onAction('answer', { optionIndex: i });
                    optEl.querySelectorAll('.mg-trivia-opt').forEach(b => {
                        b.disabled = true;
                        if (b === btn) b.classList.add('selected');
                    });
                    const fb = this._container.querySelector('#triviaFeedback');
                    if (fb) fb.textContent = 'Answer locked in! Waiting for others…';
                });
            }
            optEl.appendChild(btn);
        });
    }

    _startTimer(seconds = 15) {
        clearInterval(this._timerInterval);
        let remaining = seconds;
        const fill = this._container.querySelector('#triviaTimerFill');
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

        const fb = this._container.querySelector('#triviaFeedback');

        if (event?.type === 'nextQuestion') {
            this._answered = false;
            clearInterval(this._timerInterval);
            this._startTimer(15);
            if (fb) fb.textContent = '';
        } else if (event?.type === 'timeUp') {
            clearInterval(this._timerInterval);
            if (fb) fb.textContent = "⏰ Time's up!";
        } else if (!event) {
            // Initial state or reveal
            if (!gs.revealAnswer) this._startTimer(gs.timeLeft || 15);
            else clearInterval(this._timerInterval);
        }

        this._renderQuestion(gs);
        this._updateScores(gs.scores);
    }

    _updateScores(scores) {
        const el = this._container.querySelector('#triviaScores');
        if (!el || !scores) return;
        const sorted = [...this._players].sort((a, b) =>
            (scores[b.userId] || 0) - (scores[a.userId] || 0)
        );
        el.innerHTML = sorted.map((p, i) =>
            `<div class="mg-trivia-score-row ${String(p.userId) === String(this._userId) ? 'mine' : ''}">
                <span>${i + 1}. ${p.username}</span>
                <span>${scores[p.userId] || 0}</span>
            </div>`
        ).join('');
    }

    onStateUpdate(gs, event) { this._updateState(gs, event); }

    destroy() {
        clearInterval(this._timerInterval);
        this._container.innerHTML = '';
    }
}

export default TriviaQuizUI;
