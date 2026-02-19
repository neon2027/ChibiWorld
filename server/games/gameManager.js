// ChibiWorld Game Manager — central in-memory state for all mini-games

import * as ticTacToe    from './ticTacToe.js';
import * as rps          from './rockPaperScissors.js';
import * as connectFour  from './connectFour.js';
import * as drawGuess    from './drawGuess.js';
import * as wordScramble from './wordScramble.js';
import * as triviaQuiz   from './triviaQuiz.js';

const LOGIC = { ticTacToe, rps, connectFour, drawGuess, wordScramble, triviaQuiz };

export const GAME_CONFIG = {
    ticTacToe:    { minPlayers: 2, maxPlayers: 2,  hasTurnTimer: false },
    rps:          { minPlayers: 2, maxPlayers: 2,  hasTurnTimer: false },
    connectFour:  { minPlayers: 2, maxPlayers: 2,  hasTurnTimer: false },
    drawGuess:    { minPlayers: 2, maxPlayers: 8,  hasTurnTimer: true,  turnDuration: 60 },
    wordScramble: { minPlayers: 2, maxPlayers: 6,  hasTurnTimer: true,  turnDuration: 30 },
    triviaQuiz:   { minPlayers: 2, maxPlayers: 8,  hasTurnTimer: true,  turnDuration: 15 },
};

// ── State ─────────────────────────────────────────────────────────────
const games = new Map();   // gameId -> GameRecord
const invites = new Map(); // `${inviterId}:${targetId}` -> { gameId, expires }
let _nextId = 1;

// ── Public API ────────────────────────────────────────────────────────

export function createGame(userId, username, type, maxPlayers) {
    const cfg = GAME_CONFIG[type];
    if (!cfg) return null;
    const cap = Math.max(cfg.minPlayers, Math.min(cfg.maxPlayers, maxPlayers || cfg.maxPlayers));
    const gameId = `g_${_nextId++}`;
    const game = {
        id: gameId, type, status: 'waiting',
        hostId: userId, hostName: username,
        maxPlayers: cap,
        players: [{ userId, username, ready: false, score: 0 }],
        gameState: null,
        createdAt: Date.now(), lastActivity: Date.now(),
        _timers: {}
    };
    games.set(gameId, game);
    return game;
}

export function getGame(gameId) { return games.get(gameId) ?? null; }

export function getGameIdsForPlayer(userId) {
    const ids = [];
    for (const [id, g] of games) {
        if (g.status !== 'finished' && g.players.some(p => p.userId === userId)) ids.push(id);
    }
    return ids;
}

export function listGames() {
    return [...games.values()]
        .filter(g => g.status !== 'finished')
        .map(g => ({
            id: g.id, type: g.type, hostName: g.hostName,
            playerCount: g.players.length, maxPlayers: g.maxPlayers, status: g.status
        }));
}

export function joinGame(gameId, userId, username) {
    const game = games.get(gameId);
    if (!game) return { error: 'Game not found' };
    if (game.status !== 'waiting') return { error: 'Game already started' };
    if (game.players.find(p => p.userId === userId)) return { error: 'Already in game' };
    if (game.players.length >= game.maxPlayers) return { error: 'Game full' };
    game.players.push({ userId, username, ready: false, score: 0 });
    game.lastActivity = Date.now();
    return { game };
}

export function leaveGame(gameId, userId) {
    const game = games.get(gameId);
    if (!game) return { deleted: true };

    const wasPlaying = game.status === 'playing';
    game.players = game.players.filter(p => p.userId !== userId);

    if (game.players.length === 0) {
        _destroyGame(gameId);
        return { deleted: true };
    }

    // Reassign host if needed
    if (game.hostId === userId) game.hostId = game.players[0].userId;

    if (wasPlaying) {
        // Remaining player wins
        const winner = game.players[0];
        const scores = {};
        for (const p of game.players) scores[p.userId] = { username: p.username, score: 1 };
        _destroyGame(gameId);
        return { deleted: false, gameOver: true, winner: winner.userId, scores };
    }

    game.lastActivity = Date.now();
    return { deleted: false, gameOver: false, game };
}

export function setReady(gameId, userId) {
    const game = games.get(gameId);
    if (!game) return { error: 'Game not found' };
    const player = game.players.find(p => p.userId === userId);
    if (!player) return { error: 'Not in game' };
    player.ready = true;

    const cfg = GAME_CONFIG[game.type];
    const allReady = game.players.length >= cfg.minPlayers && game.players.every(p => p.ready);

    if (allReady) {
        game.status = 'playing';
        game.gameState = LOGIC[game.type].initState(game.players);
        game.lastActivity = Date.now();

        // Kick off turn-based games that need immediate first action
        if (game.type === 'wordScramble') {
            game.gameState = wordScramble.startRound(game.gameState);
        } else if (game.type === 'triviaQuiz') {
            game.gameState = triviaQuiz.startQuestion(game.gameState);
            game._timers.turnStart = Date.now();
        } else if (game.type === 'drawGuess') {
            game.gameState = drawGuess.startTurn(game.gameState);
        }

        return { started: true, game };
    }

    return { started: false };
}

export function applyAction(gameId, userId, actionType, data) {
    const game = games.get(gameId);
    if (!game) return { error: 'Game not found' };
    if (game.status !== 'playing') return { error: 'Game not active' };
    if (!game.players.find(p => p.userId === userId)) return { error: 'Not a player' };

    const result = LOGIC[game.type].applyAction(game.gameState, userId, actionType, data);
    if (!result.valid) return { error: result.error };

    game.gameState = result.newState;
    game.lastActivity = Date.now();

    // Fill in usernames in scores
    if (result.scores) {
        for (const [uid, s] of Object.entries(result.scores)) {
            const p = game.players.find(pl => pl.userId === Number(uid));
            if (p) s.username = p.username;
        }
    }

    // Post-action handling per game type
    if (game.type === 'rps' && result.newState.revealed && !result.newState.matchWinner) {
        // Advance to next round after a short delay (handled by socket layer)
        result.advanceRound = true;
    }

    if (game.type === 'wordScramble' && result.gameOver === false && result.newState.phase === 'roundEnd') {
        // Socket layer should call advanceWordScramble after delay
        result.roundEnd = true;
    }

    if (game.type === 'triviaQuiz' && result.allAnswered) {
        // Reveal scores
        _revealTriviaQuestion(game);
        result.reveal = true;
        result.newState = game.gameState;
    }

    if (game.type === 'drawGuess' && result.allGuessed) {
        result.roundEnd = true;
    }

    if (result.gameOver) {
        _destroyGame(gameId);
    }

    return result;
}

// Called by socket layer to advance RPS to next round
export function advanceRpsRound(gameId) {
    const game = games.get(gameId);
    if (!game || game.type !== 'rps') return null;
    game.gameState = rps.advanceRound(game.gameState);
    return game;
}

// Called by socket layer to start next word scramble round
export function advanceWordScramble(gameId) {
    const game = games.get(gameId);
    if (!game || game.type !== 'wordScramble') return null;
    if (game.gameState.round >= game.gameState.totalRounds) {
        // Game over
        const scores = wordScramble.getFinalScores ? null : _buildScores(game);
        const s = {};
        for (const p of game.players) s[p.userId] = { username: p.username, score: game.gameState.scores[p.userId] || 0 };
        _destroyGame(gameId);
        return { gameOver: true, scores: s, winner: _findTopScorer(game) };
    }
    game.gameState = wordScramble.startRound(game.gameState);
    return { gameOver: false, game };
}

// Called after trivia reveal delay to advance to next question
export function advanceTriviaQuestion(gameId) {
    const game = games.get(gameId);
    if (!game || game.type !== 'triviaQuiz') return null;

    const nextState = triviaQuiz.startQuestion(game.gameState);
    if (!nextState) {
        // No more questions
        const s = {};
        for (const p of game.players) s[p.userId] = { username: p.username, score: game.gameState.scores[p.userId] || 0 };
        const winner = _findTopScorer(game);
        _destroyGame(gameId);
        return { gameOver: true, scores: s, winner };
    }
    game.gameState = nextState;
    game._timers.turnStart = Date.now();
    return { gameOver: false, game };
}

// Called after drawGuess turn ends to start next turn
export function advanceDrawGuessTurn(gameId) {
    const game = games.get(gameId);
    if (!game || game.type !== 'drawGuess') return null;

    if (drawGuess.isGameOver(game.gameState)) {
        const s = {};
        for (const p of game.players) s[p.userId] = { username: p.username, score: game.gameState.scores[p.userId] || 0 };
        const winner = _findTopScorer(game);
        _destroyGame(gameId);
        return { gameOver: true, scores: s, winner };
    }
    game.gameState = drawGuess.startTurn(game.gameState);
    return { gameOver: false, game };
}

// Reveal trivia answer and calculate scores
export function revealTriviaQuestion(gameId) {
    const game = games.get(gameId);
    if (!game || game.type !== 'triviaQuiz') return null;
    _revealTriviaQuestion(game);
    return game;
}

function _revealTriviaQuestion(game) {
    const turnStart = game._timers.turnStart || Date.now();
    game.gameState = triviaQuiz.revealAndScore(game.gameState, turnStart);
    // Update player scores
    for (const p of game.players) {
        p.score = game.gameState.scores[p.userId] || 0;
    }
}

// ── Invite System ─────────────────────────────────────────────────────

export function createInvite(inviterId, inviterName, targetId, gameType) {
    const cfg = GAME_CONFIG[gameType];
    if (!cfg) return { error: 'Invalid game type' };

    const key = `${inviterId}:${targetId}`;
    // Cancel any existing invite from same pair
    const existing = invites.get(key);
    if (existing) {
        games.delete(existing.gameId);
        clearTimeout(existing.timer);
        invites.delete(key);
    }

    const game = createGame(inviterId, inviterName, gameType, cfg.maxPlayers);
    const timer = setTimeout(() => {
        games.delete(game.id);
        invites.delete(key);
    }, 30_000);

    invites.set(key, { gameId: game.id, gameType, timer });
    return { gameId: game.id };
}

export function acceptInvite(gameId, userId, username) {
    const game = games.get(gameId);
    if (!game) return { error: 'Invite expired or not found' };

    // Clear the invite
    for (const [key, inv] of invites) {
        if (inv.gameId === gameId) {
            clearTimeout(inv.timer);
            invites.delete(key);
            break;
        }
    }

    const result = joinGame(gameId, userId, username);
    if (result.error) return result;
    return { game: result.game };
}

export function declineInvite(gameId) {
    const game = games.get(gameId);
    for (const [key, inv] of invites) {
        if (inv.gameId === gameId) {
            clearTimeout(inv.timer);
            invites.delete(key);
            break;
        }
    }
    if (game) games.delete(gameId);
    return { ok: true };
}

// ── Helpers ───────────────────────────────────────────────────────────

function _destroyGame(gameId) {
    const game = games.get(gameId);
    if (!game) return;
    for (const t of Object.values(game._timers || {})) clearTimeout(t);
    game.status = 'finished';
    // Schedule removal after 60s so clients can still see final state
    setTimeout(() => games.delete(gameId), 60_000);
}

function _findTopScorer(game) {
    let best = -1, winner = null;
    for (const p of game.players) {
        const s = game.gameState?.scores?.[p.userId] ?? 0;
        if (s > best) { best = s; winner = p.userId; }
    }
    return winner ? String(winner) : null;
}

// ── Stale game cleanup ────────────────────────────────────────────────
setInterval(() => {
    const TEN_MIN = 10 * 60 * 1000;
    const now = Date.now();
    for (const [id, game] of games) {
        if (game.status !== 'finished' && now - game.lastActivity > TEN_MIN) {
            console.log(`[GameManager] Removing stale game ${id}`);
            games.delete(id);
        }
    }
}, 5 * 60 * 1000);
