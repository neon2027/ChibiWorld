// Word Scramble — pure game logic

const WORD_LIST = [
    'APPLE','BRAVE','CRANE','DANCE','EARTH','FLAME','GRACE','HEART','IMAGE','JUNGLE',
    'KNIFE','LEMON','MAGIC','NOBLE','OCEAN','PIANO','QUEEN','RIVER','STONE','TIGER',
    'UNITY','VIVID','WATER','XENON','YACHT','ZEBRA','BLAST','CLOUD','DREAM','EAGLE',
    'FROST','GLOBE','HONEY','INPUT','JOKER','KARMA','LIGHT','MONEY','NIGHT','ORBIT',
    'PIZZA','QUICK','RADIO','SMILE','TOWER','URBAN','VAPOR','WITCH','XYLEM','YOUTH',
    'AMBER','BEACH','CEDAR','DELTA','ELITE','FAIRY','GRAND','HORSE','IONIC','JEWEL',
    'LUNAR','MAPLE','NINJA','ONION','PIXEL','RALLY','SPINE','TITAN','ULTRA','VIBES',
    'WINGS','EXTRA','YIELD','ZONES','BINGO','CHESS','DISCO','FEAST','GLOOM','HASTE',
    'IVORY','JAZZY','KNACK','LASER','MANGO','NERVE','OASIS','PROSE','RIDGE','SQUAD',
    'TRUCE','USHER','VAULT','WORLD','XEROX','ZONAL','BLAZE','CAMEL','DUNES','EMBER',
];

export function initState(players) {
    const scores = {};
    for (const p of players) scores[p.userId] = 0;
    return {
        round: 0,
        totalRounds: 5,
        scrambled: '',
        correctWord: '',   // HIDDEN from clients
        roundWinner: null,
        roundStartTime: 0,
        scores,
        phase: 'idle'
    };
}

export function startRound(state) {
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    return {
        ...state,
        round: state.round + 1,
        scrambled: _scramble(word),
        correctWord: word,
        roundWinner: null,
        roundStartTime: Date.now(),
        phase: 'active'
    };
}

export function applyAction(state, userId, actionType, data) {
    if (actionType !== 'answer') return { valid: false, error: 'Unknown action' };
    if (state.phase !== 'active') return { valid: false, error: 'Round not active' };
    if (state.roundWinner !== null) return { valid: false, error: 'Round already won' };
    if (!(userId in state.scores)) return { valid: false, error: 'Not a player' };

    const answer = (data.text || '').toUpperCase().trim();
    if (answer !== state.correctWord) return { valid: false, error: 'Wrong answer', newState: state };

    const elapsed = (Date.now() - state.roundStartTime) / 1000;
    const speedBonus = Math.max(0, Math.round(50 * (1 - elapsed / 30)));
    const points = 100 + speedBonus;

    const newScores = { ...state.scores, [userId]: state.scores[userId] + points };
    const newState = { ...state, scores: newScores, roundWinner: userId, phase: 'roundEnd' };

    const gameOver = state.round >= state.totalRounds;
    const scores = {};
    if (gameOver) {
        for (const pid of Object.keys(state.scores)) {
            scores[Number(pid)] = { username: null, score: newScores[Number(pid)] };
        }
    }

    return {
        valid: true,
        newState,
        event: { type: 'correct', userId, word: state.correctWord, points },
        gameOver,
        winner: gameOver ? _findWinner(newScores) : null,
        scores
    };
}

function _scramble(word) {
    const arr = word.split('');
    let result;
    do {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        result = arr.join('');
    } while (result === word);
    return result;
}

function _findWinner(scores) {
    let best = -1, winner = null;
    for (const [uid, s] of Object.entries(scores)) {
        if (s > best) { best = s; winner = uid; }
    }
    return winner;
}
