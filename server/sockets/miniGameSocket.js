// ChibiWorld Mini-Game Socket Handler

import * as gm from '../games/gameManager.js';
import * as worldState from '../services/worldState.js';

const GAME_META = {
    ticTacToe:    { label: 'Tic-Tac-Toe' },
    rps:          { label: 'Rock Paper Scissors' },
    connectFour:  { label: 'Connect Four' },
    drawGuess:    { label: 'Draw & Guess' },
    wordScramble: { label: 'Word Scramble' },
    triviaQuiz:   { label: 'Trivia Quiz' },
};

export function registerMiniGameSocket(io, socket, userId, username) {

    // ── Helpers ────────────────────────────────────────────────────────

    function _broadcastGameList() {
        io.to('plaza').emit('minigame:gameList', gm.listGames());
    }

    function _serialize(game) {
        return {
            id: game.id, type: game.type, status: game.status,
            hostId: game.hostId, hostName: game.hostName,
            maxPlayers: game.maxPlayers,
            players: game.players.map(p => ({
                userId: p.userId, username: p.username,
                ready: p.ready, score: p.score
            })),
            gameState: _sanitize(game)
        };
    }

    function _sanitize(game) {
        if (!game?.gameState) return null;
        const s = { ...game.gameState };
        // Never expose questions array (full question bank) or server-only fields
        delete s.questions;
        if (game.type === 'drawGuess') {
            delete s.wordChoices; // sent separately to drawer only
            delete s.correctWord;
        }
        if (game.type === 'wordScramble') delete s.correctWord;
        if (game.type === 'triviaQuiz' && !s.revealAnswer) delete s.correctIndex;
        return s;
    }

    function _emitDrawerInfo(game) {
        if (game.type !== 'drawGuess') return;
        const drawerId = game.gameState?.currentDrawerId;
        if (!drawerId) return;
        const socketId = worldState.getSocketIdByUserId(drawerId);
        if (socketId) {
            io.to(socketId).emit('minigame:drawerInfo', {
                wordChoices: game.gameState.wordChoices
            });
        }
    }

    // ── List ───────────────────────────────────────────────────────────

    socket.on('minigame:list', () => {
        socket.emit('minigame:gameList', gm.listGames());
    });

    // ── Create ─────────────────────────────────────────────────────────

    socket.on('minigame:create', ({ type, maxPlayers }) => {
        if (typeof type !== 'string' || !GAME_META[type]) return;
        const game = gm.createGame(userId, username, type, maxPlayers);
        if (!game) return socket.emit('minigame:error', { message: 'Invalid game type' });

        socket.join(`game:${game.id}`);
        socket.emit('minigame:created', { game: _serialize(game) });
        _broadcastGameList();
    });

    // ── Join ───────────────────────────────────────────────────────────

    socket.on('minigame:join', ({ gameId }) => {
        if (typeof gameId !== 'string') return;
        const result = gm.joinGame(gameId, userId, username);
        if (result.error) return socket.emit('minigame:error', { message: result.error });

        socket.join(`game:${gameId}`);
        const serialized = _serialize(result.game);
        socket.emit('minigame:joined', { game: serialized });
        socket.to(`game:${gameId}`).emit('minigame:playerJoined', { userId, username });
        _broadcastGameList();
    });

    // ── Leave ──────────────────────────────────────────────────────────

    socket.on('minigame:leave', ({ gameId }) => {
        if (typeof gameId !== 'string') return;
        const result = gm.leaveGame(gameId, userId);
        socket.leave(`game:${gameId}`);
        if (!result.deleted) {
            io.to(`game:${gameId}`).emit('minigame:playerLeft', { userId });
            if (result.gameOver) {
                io.to(`game:${gameId}`).emit('minigame:gameOver', {
                    scores: result.scores, winner: result.winner, reason: 'playerLeft'
                });
            }
        }
        _broadcastGameList();
    });

    // ── Ready ──────────────────────────────────────────────────────────

    socket.on('minigame:ready', ({ gameId }) => {
        if (typeof gameId !== 'string') return;
        const result = gm.setReady(gameId, userId);
        if (result.error) return socket.emit('minigame:error', { message: result.error });

        io.to(`game:${gameId}`).emit('minigame:playerReady', { userId });

        if (result.started) {
            const game = result.game;
            io.to(`game:${gameId}`).emit('minigame:started', {
                game: _serialize(game)
            });
            _emitDrawerInfo(game);
            _broadcastGameList();

            // Start server-side timer for timer-based games
            if (game.type === 'triviaQuiz') {
                _startTriviaTimer(game);
            } else if (game.type === 'wordScramble') {
                _startWordScrambleTimer(game);
            } else if (game.type === 'drawGuess') {
                _startDrawGuessTimer(game);
            }
        }
    });

    // ── Action ─────────────────────────────────────────────────────────

    socket.on('minigame:action', ({ gameId, type: actionType, data }) => {
        if (typeof gameId !== 'string' || typeof actionType !== 'string') return;

        const result = gm.applyAction(gameId, userId, actionType, data);
        if (result.error) return socket.emit('minigame:error', { message: result.error });

        const game = gm.getGame(gameId);

        // Emit state update
        io.to(`game:${gameId}`).emit('minigame:stateUpdate', {
            gameState: game ? _sanitize(game) : result.newState,
            event: result.event
        });

        // Draw & Guess: emit drawer info when word is chosen
        if (actionType === 'chooseWord' && game) {
            // Send sanitized hint to everyone, word choices only to drawer (already chosen)
            // No extra emit needed; gameState update is enough
        }

        // RPS: advance to next round after reveal
        if (result.advanceRound && game) {
            setTimeout(() => {
                const g = gm.advanceRpsRound(gameId);
                if (g) io.to(`game:${gameId}`).emit('minigame:stateUpdate', {
                    gameState: _sanitize(g), event: { type: 'nextRound', round: g.gameState.round }
                });
            }, 2500);
        }

        // Word scramble: advance after roundEnd
        if (result.roundEnd && game?.type === 'wordScramble') {
            // Clear existing timer, start next round after delay
            clearTimeout(game._timers.wordScramble);
            game._timers.wordScramble = setTimeout(() => {
                const r = gm.advanceWordScramble(gameId);
                if (!r) return;
                if (r.gameOver) {
                    io.to(`game:${gameId}`).emit('minigame:gameOver', { scores: r.scores, winner: r.winner });
                    _broadcastGameList();
                } else {
                    io.to(`game:${gameId}`).emit('minigame:stateUpdate', {
                        gameState: _sanitize(r.game), event: { type: 'nextRound', round: r.game.gameState.round }
                    });
                    _startWordScrambleTimer(r.game);
                }
            }, 2500);
        }

        // Trivia: all answered → reveal
        if (result.reveal && game) {
            clearTimeout(game._timers.trivia);
            _scheduleTriviaReveal(game, gameId);
        }

        // Draw & Guess: all guessed → end turn
        if (result.allGuessed && game?.type === 'drawGuess') {
            clearTimeout(game._timers.drawGuess);
            _scheduleDrawGuessTurnEnd(game, gameId);
        }

        if (result.gameOver) {
            io.to(`game:${gameId}`).emit('minigame:gameOver', {
                scores: result.scores, winner: result.winner
            });
            _broadcastGameList();
        }
    });

    // ── Draw stroke relay ──────────────────────────────────────────────

    socket.on('minigame:drawStroke', ({ gameId, stroke }) => {
        const game = gm.getGame(gameId);
        if (!game || game.status !== 'playing' || game.type !== 'drawGuess') return;
        if (game.gameState?.currentDrawerId !== userId) return;
        socket.to(`game:${gameId}`).emit('minigame:drawStroke', { stroke });
    });

    // ── Invite system ──────────────────────────────────────────────────

    socket.on('minigame:invite', ({ targetUserId, gameType }) => {
        const tid = Number(targetUserId);
        if (!tid || typeof gameType !== 'string') return;
        if (!GAME_META[gameType]) return;
        const targetSocket = worldState.getSocketIdByUserId(tid);
        if (!targetSocket) return socket.emit('minigame:error', { message: 'Player not online' });

        const result = gm.createInvite(userId, username, tid, gameType);
        if (result.error) return socket.emit('minigame:error', { message: result.error });

        socket.join(`game:${result.gameId}`);
        socket.emit('minigame:inviteSent', { gameId: result.gameId, gameType });
        io.to(targetSocket).emit('minigame:invited', {
            gameId: result.gameId, gameType,
            inviterName: username, label: GAME_META[gameType].label
        });
    });

    socket.on('minigame:inviteAccept', ({ gameId }) => {
        if (typeof gameId !== 'string') return;
        const result = gm.acceptInvite(gameId, userId, username);
        if (result.error) return socket.emit('minigame:error', { message: result.error });

        socket.join(`game:${gameId}`);
        const serialized = _serialize(result.game);
        io.to(`game:${gameId}`).emit('minigame:joined', { game: serialized });
        _broadcastGameList();
    });

    socket.on('minigame:inviteDecline', ({ gameId }) => {
        if (typeof gameId !== 'string') return;
        const game = gm.getGame(gameId);
        const hostId = game?.hostId;
        gm.declineInvite(gameId);
        socket.leave(`game:${gameId}`);
        if (hostId) {
            const hostSocket = worldState.getSocketIdByUserId(hostId);
            if (hostSocket) io.to(hostSocket).emit('minigame:inviteDeclined', { declinerName: username });
        }
    });

    // ── Disconnect ─────────────────────────────────────────────────────

    socket.on('disconnect', () => {
        for (const gameId of gm.getGameIdsForPlayer(userId)) {
            const result = gm.leaveGame(gameId, userId);
            if (!result.deleted && result.gameOver) {
                io.to(`game:${gameId}`).emit('minigame:gameOver', {
                    scores: result.scores, winner: result.winner, reason: 'playerLeft'
                });
            }
        }
    });

    // ── Timer helpers ──────────────────────────────────────────────────

    function _startTriviaTimer(game) {
        clearTimeout(game._timers.trivia);
        game._timers.trivia = setTimeout(() => {
            const g = gm.getGame(game.id);
            if (!g) return;
            const revealed = gm.revealTriviaQuestion(game.id);
            if (!revealed) return;
            io.to(`game:${game.id}`).emit('minigame:stateUpdate', {
                gameState: _sanitize(revealed), event: { type: 'timeUp' }
            });
            _scheduleTriviaReveal(g, game.id);
        }, 15_000);
    }

    function _scheduleTriviaReveal(game, gameId) {
        clearTimeout(game._timers.triviaReveal);
        game._timers.triviaReveal = setTimeout(() => {
            const r = gm.advanceTriviaQuestion(gameId);
            if (!r) return;
            if (r.gameOver) {
                io.to(`game:${gameId}`).emit('minigame:gameOver', { scores: r.scores, winner: r.winner });
                _broadcastGameList();
            } else {
                io.to(`game:${gameId}`).emit('minigame:stateUpdate', {
                    gameState: _sanitize(r.game),
                    event: { type: 'nextQuestion', index: r.game.gameState.questionIndex }
                });
                _startTriviaTimer(r.game);
            }
        }, 3_000);
    }

    function _startWordScrambleTimer(game) {
        clearTimeout(game._timers.wordScramble);
        game._timers.wordScramble = setTimeout(() => {
            const g = gm.getGame(game.id);
            if (!g) return;
            // Time up — advance to next round
            const r = gm.advanceWordScramble(game.id);
            if (!r) return;
            if (r.gameOver) {
                io.to(`game:${game.id}`).emit('minigame:gameOver', { scores: r.scores, winner: r.winner });
                _broadcastGameList();
            } else {
                io.to(`game:${game.id}`).emit('minigame:stateUpdate', {
                    gameState: _sanitize(r.game), event: { type: 'timeUp' }
                });
                _startWordScrambleTimer(r.game);
            }
        }, 30_000);
    }

    function _startDrawGuessTimer(game) {
        clearTimeout(game._timers.drawGuess);
        game._timers.drawGuess = setTimeout(() => {
            const g = gm.getGame(game.id);
            if (!g) return;
            io.to(`game:${game.id}`).emit('minigame:stateUpdate', {
                gameState: _sanitize(g), event: { type: 'timeUp', correctWord: g.gameState.correctWord }
            });
            _scheduleDrawGuessTurnEnd(g, game.id);
        }, 60_000);
    }

    function _scheduleDrawGuessTurnEnd(game, gameId) {
        clearTimeout(game._timers.drawGuessTurn);
        game._timers.drawGuessTurn = setTimeout(() => {
            const r = gm.advanceDrawGuessTurn(gameId);
            if (!r) return;
            if (r.gameOver) {
                io.to(`game:${gameId}`).emit('minigame:gameOver', { scores: r.scores, winner: r.winner });
                _broadcastGameList();
            } else {
                io.to(`game:${gameId}`).emit('minigame:stateUpdate', {
                    gameState: _sanitize(r.game), event: { type: 'nextTurn' }
                });
                _emitDrawerInfo(r.game);
                _startDrawGuessTimer(r.game);
            }
        }, 3_000);
    }
}
