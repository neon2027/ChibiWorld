// Draw & Guess UI

const PALETTE = [
    '#000000','#ffffff','#ef4444','#f97316','#eab308',
    '#22c55e','#3b82f6','#a855f7','#ec4899','#6b7280',
    '#92400e','#065f46','#1e3a8a','#581c87','#be185d'
];

export class DrawGuessUI {
    constructor(container, user, gameData, callbacks) {
        this._container = container;
        this._user = user;
        this._callbacks = callbacks;
        this._userId = user.id;
        this._players = gameData.players;
        this._isDrawer = false;
        this._drawing = false;
        this._lastX = 0;
        this._lastY = 0;
        this._color = '#000000';
        this._size = 4;
        this._canvas = null;
        this._ctx = null;

        this._build(gameData.gameState);
        if (gameData.gameState) this._updateState(gameData.gameState, null);
    }

    _build() {
        this._container.innerHTML = `
            <div class="mg-dg">
                <div class="mg-dg-top">
                    <div class="mg-dg-hint" id="dgHint">---</div>
                    <div class="mg-dg-timer" id="dgTimer">60</div>
                </div>
                <div class="mg-dg-main">
                    <canvas class="mg-dg-canvas" id="dgCanvas" width="480" height="300"></canvas>
                    <div class="mg-dg-sidebar">
                        <div class="mg-dg-scores" id="dgScores"></div>
                        <div class="mg-dg-chat-log" id="dgChatLog"></div>
                        <input class="mg-dg-guess" id="dgGuessInput" placeholder="Type your guess…" maxlength="64" autocomplete="off" />
                    </div>
                </div>
                <div class="mg-dg-toolbar" id="dgToolbar">
                    <div class="mg-dg-colors" id="dgColors"></div>
                    <div class="mg-dg-sizes">
                        <button class="mg-dg-size-btn active" data-size="3" style="font-size:10px">●</button>
                        <button class="mg-dg-size-btn" data-size="7" style="font-size:16px">●</button>
                        <button class="mg-dg-size-btn" data-size="14" style="font-size:24px">●</button>
                    </div>
                    <button class="mg-dg-clear-btn" id="dgClear">🗑 Clear</button>
                    <button class="mg-dg-eraser-btn" id="dgEraser">◻ Erase</button>
                </div>
                <div class="mg-dg-word-choice" id="dgWordChoice" style="display:none"></div>
                <button class="mg-leave-btn btn btn-ghost" id="dgLeave">Leave</button>
            </div>
        `;

        this._canvas = this._container.querySelector('#dgCanvas');
        this._ctx = this._canvas.getContext('2d');
        this._ctx.lineCap = 'round';
        this._ctx.lineJoin = 'round';

        this._buildPalette();
        this._bindCanvasEvents();

        const guessInput = this._container.querySelector('#dgGuessInput');
        guessInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && guessInput.value.trim()) {
                this._callbacks.onAction('guess', { text: guessInput.value.trim() });
                guessInput.value = '';
            }
        });

        this._container.querySelector('#dgLeave').addEventListener('click', () => this._callbacks.onLeave());

        this._container.querySelector('#dgClear').addEventListener('click', () => {
            if (this._isDrawer) this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        });

        this._container.querySelector('#dgEraser').addEventListener('click', () => {
            this._color = '#ffffff';
            this._size = 20;
        });
    }

    _buildPalette() {
        const colorEl = this._container.querySelector('#dgColors');
        PALETTE.forEach(c => {
            const swatch = document.createElement('button');
            swatch.className = 'mg-dg-swatch';
            swatch.style.background = c;
            if (c === '#ffffff') swatch.style.border = '1px solid #666';
            swatch.title = c;
            swatch.addEventListener('click', () => {
                this._color = c;
                colorEl.querySelectorAll('.mg-dg-swatch').forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
            });
            colorEl.appendChild(swatch);
        });

        this._container.querySelectorAll('.mg-dg-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._size = parseInt(btn.dataset.size);
                this._container.querySelectorAll('.mg-dg-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    _bindCanvasEvents() {
        const c = this._canvas;
        const pos = (e) => {
            const r = c.getBoundingClientRect();
            return [(e.clientX - r.left) * (c.width / r.width),
                    (e.clientY - r.top) * (c.height / r.height)];
        };

        c.addEventListener('mousedown', (e) => {
            if (!this._isDrawer) return;
            this._drawing = true;
            [this._lastX, this._lastY] = pos(e);
        });
        c.addEventListener('mousemove', (e) => {
            if (!this._drawing) return;
            const [x, y] = pos(e);
            this._emitStroke(this._lastX, this._lastY, x, y);
            [this._lastX, this._lastY] = [x, y];
        });
        c.addEventListener('mouseup',    () => { this._drawing = false; });
        c.addEventListener('mouseleave', () => { this._drawing = false; });

        c.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this._isDrawer) return;
            this._drawing = true;
            const t = e.touches[0];
            const r = c.getBoundingClientRect();
            this._lastX = (t.clientX - r.left) * (c.width / r.width);
            this._lastY = (t.clientY - r.top) * (c.height / r.height);
        }, { passive: false });

        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this._drawing) return;
            const t = e.touches[0];
            const r = c.getBoundingClientRect();
            const x = (t.clientX - r.left) * (c.width / r.width);
            const y = (t.clientY - r.top) * (c.height / r.height);
            this._emitStroke(this._lastX, this._lastY, x, y);
            [this._lastX, this._lastY] = [x, y];
        }, { passive: false });

        c.addEventListener('touchend', () => { this._drawing = false; });
    }

    _emitStroke(x0, y0, x1, y1) {
        const stroke = { x0, y0, x1, y1, color: this._color, size: this._size };
        this._drawStroke(stroke);
        this._callbacks.onDrawStroke(stroke);
    }

    _drawStroke({ x0, y0, x1, y1, color, size }) {
        const ctx = this._ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    _updateState(gs, event) {
        if (!gs) return;
        this._isDrawer = gs.currentDrawerId === this._userId;

        const toolbar = this._container.querySelector('#dgToolbar');
        if (toolbar) toolbar.style.display = this._isDrawer ? 'flex' : 'none';

        const hintEl = this._container.querySelector('#dgHint');
        if (hintEl) {
            hintEl.textContent = this._isDrawer
                ? '🎨 You are drawing!'
                : (gs.wordHint || '---');
        }

        const timerEl = this._container.querySelector('#dgTimer');
        if (timerEl) timerEl.textContent = gs.timeLeft ?? 60;

        const guessInput = this._container.querySelector('#dgGuessInput');
        if (guessInput) {
            const alreadyGuessed = gs.guessedUserIds?.includes(this._userId);
            guessInput.disabled = this._isDrawer || alreadyGuessed;
            guessInput.placeholder = alreadyGuessed ? '✓ You guessed!' : 'Type your guess…';
        }

        // Word-choice panel
        const wordChoiceEl = this._container.querySelector('#dgWordChoice');
        if (wordChoiceEl && gs.phase === 'choosing' && this._isDrawer) {
            // Panel will be populated by onDrawerInfo
            wordChoiceEl.style.display = 'flex';
        } else if (wordChoiceEl && gs.phase !== 'choosing') {
            wordChoiceEl.style.display = 'none';
        }

        // Handle events
        if (event?.type === 'correctGuess') {
            const guesserName = String(event.userId) === String(this._userId)
                ? 'You' : (this._players.find(p => String(p.userId) === String(event.userId))?.username || 'Someone');
            this._appendChat(`✓ ${guesserName} guessed correctly! (+${event.points})`, '#7ddf64');
        } else if (event?.type === 'timeUp') {
            this._appendChat(`⏰ Time's up! The word was: ${event.correctWord || '?'}`, '#ffd166');
        } else if (event?.type === 'nextTurn') {
            this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            this._appendChat('--- Next turn ---', '#8888a8');
        } else if (event?.type === 'wordChosen') {
            const drawerName = this._players.find(p => String(p.userId) === String(event.drawerId))?.username || 'Drawer';
            this._appendChat(`${drawerName} chose a word (${event.wordLength} letters)`, '#7ec8e3');
        }

        this._updateScores(gs.scores);
    }

    _appendChat(msg, color = null) {
        const log = this._container.querySelector('#dgChatLog');
        if (!log) return;
        const div = document.createElement('div');
        div.className = 'mg-dg-chat-msg';
        if (color) div.style.color = color;
        div.textContent = msg;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }

    _updateScores(scores) {
        const el = this._container.querySelector('#dgScores');
        if (!el || !scores) return;
        const sorted = [...this._players].sort((a, b) =>
            (scores[b.userId] || 0) - (scores[a.userId] || 0)
        );
        el.innerHTML = sorted.map((p, i) =>
            `<div class="mg-dg-score-row ${String(p.userId) === String(this._userId) ? 'mine' : ''}">
                <span>${i + 1}. ${p.username}</span>
                <span>${scores[p.userId] || 0}</span>
            </div>`
        ).join('');
    }

    onStateUpdate(gs, event) { this._updateState(gs, event); }

    onDrawStroke(stroke) {
        if (!this._isDrawer) this._drawStroke(stroke);
    }

    onDrawerInfo(wordChoices) {
        const wordChoiceEl = this._container.querySelector('#dgWordChoice');
        if (!wordChoiceEl) return;
        wordChoiceEl.innerHTML = '<span class="mg-dg-word-prompt">Choose a word:</span>';
        wordChoices.forEach((word, i) => {
            const btn = document.createElement('button');
            btn.className = 'mg-dg-word-btn btn';
            btn.textContent = word;
            btn.addEventListener('click', () => {
                this._callbacks.onAction('chooseWord', { wordIndex: i });
                wordChoiceEl.style.display = 'none';
            });
            wordChoiceEl.appendChild(btn);
        });
        wordChoiceEl.style.display = 'flex';
    }

    destroy() { this._container.innerHTML = ''; }
}

export default DrawGuessUI;
