// Draw & Guess — pure game logic

const WORD_BANK = [
    'apple','banana','castle','dragon','elephant','flower','guitar','hammer',
    'island','jungle','kitten','lantern','mountain','ninja','ocean','piano',
    'queen','rainbow','spaceship','tornado','umbrella','volcano','waterfall',
    'xylophone','yacht','zombie','airplane','balloon','camera','dolphin',
    'eagle','forest','galaxy','hedgehog','iceberg','jellyfish','kite','lighthouse',
    'mushroom','notebook','octopus','penguin','quicksand','rocket','sandwich',
    'telescope','unicorn','vampire','wizard','xenon','yogurt','zipper',
    'bridge','candle','desert','envelope','firework','grapes','hurricane',
    'igloo','jawbreaker','kettle','lollipop','mirror','noodle','origami',
    'popcorn','quilt','rollercoaster','sunflower','treehouse','underwater',
    'vortex','windmill','excavator','yo-yo','zeppelin','anchor','boulder',
    'cactus','dandelion','eclipse','feather','goblin','hamster','icicle','juggle',
];

function _pickWords(n = 3) {
    const shuffled = [...WORD_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function _makeHint(word) {
    return word.split('').map(c => c === ' ' ? ' ' : '_').join(' ');
}

function _revealHint(word, hint, fraction) {
    const positions = word.split('').map((c,i) => c !== ' ' ? i : -1).filter(i => i >= 0);
    const revealed = Math.floor(positions.length * fraction);
    const pick = [...positions].sort(() => Math.random() - 0.5).slice(0, revealed);
    return word.split('').map((c,i) =>
        c === ' ' ? ' ' : (pick.includes(i) ? c : '_')
    ).join(' ');
}

export function initState(players) {
    const scores = {};
    const drawerOrder = players.map(p => p.userId);
    // Shuffle drawer order
    drawerOrder.sort(() => Math.random() - 0.5);
    for (const p of players) scores[p.userId] = 0;
    return {
        round: 0,
        totalRounds: Math.min(3, players.length),
        phase: 'idle',
        drawerOrder,
        currentDrawerIndex: -1,
        currentDrawerId: null,
        wordChoices: [],
        correctWord: '',      // HIDDEN from guessers
        wordHint: '',
        timeLeft: 60,
        guessedUserIds: [],
        scores
    };
}

export function startTurn(state) {
    const nextIndex = state.currentDrawerIndex + 1;
    const nextDrawerId = state.drawerOrder[nextIndex % state.drawerOrder.length];
    const choices = _pickWords(3);
    return {
        ...state,
        currentDrawerIndex: nextIndex,
        currentDrawerId: nextDrawerId,
        wordChoices: choices,
        correctWord: '',
        wordHint: '',
        phase: 'choosing',
        guessedUserIds: [],
        timeLeft: 60
    };
}

export function applyAction(state, userId, actionType, data) {
    if (actionType === 'chooseWord') {
        if (state.phase !== 'choosing') return { valid: false, error: 'Not choosing phase' };
        if (userId !== state.currentDrawerId) return { valid: false, error: 'Not the drawer' };
        const { wordIndex } = data;
        if (typeof wordIndex !== 'number' || wordIndex < 0 || wordIndex >= state.wordChoices.length)
            return { valid: false, error: 'Invalid word index' };

        const word = state.wordChoices[wordIndex];
        const newState = {
            ...state,
            correctWord: word,
            wordHint: _makeHint(word),
            phase: 'drawing',
            timeLeft: 60
        };
        return {
            valid: true,
            newState,
            event: { type: 'wordChosen', drawerId: userId, wordLength: word.length },
            gameOver: false
        };
    }

    if (actionType === 'guess') {
        if (state.phase !== 'drawing') return { valid: false, error: 'Not drawing phase' };
        if (userId === state.currentDrawerId) return { valid: false, error: 'Drawer cannot guess' };
        if (state.guessedUserIds.includes(userId)) return { valid: false, error: 'Already guessed' };

        const guess = (data.text || '').toLowerCase().trim();
        const correct = state.correctWord.toLowerCase().trim();
        if (guess !== correct) {
            return {
                valid: true,
                newState: state,
                event: { type: 'wrongGuess', userId, text: data.text },
                gameOver: false
            };
        }

        // Correct guess
        const timeFraction = state.timeLeft / 60;
        const points = Math.round(100 + timeFraction * 50);
        // Drawer also earns points per correct guesser
        const newScores = {
            ...state.scores,
            [userId]: state.scores[userId] + points,
            [state.currentDrawerId]: state.scores[state.currentDrawerId] + 30
        };
        const newGuessed = [...state.guessedUserIds, userId];
        const totalGuessers = state.drawerOrder.length - 1; // everyone except drawer
        const allGuessed = newGuessed.length >= totalGuessers;

        const newState = {
            ...state,
            scores: newScores,
            guessedUserIds: newGuessed,
            phase: allGuessed ? 'roundEnd' : 'drawing'
        };

        return {
            valid: true,
            newState,
            event: { type: 'correctGuess', userId, points },
            gameOver: false,
            allGuessed
        };
    }

    return { valid: false, error: 'Unknown action' };
}

export function revealHintAt(state, elapsed) {
    if (!state.correctWord || state.phase !== 'drawing') return state;
    const fraction = Math.min(0.4, elapsed / 60 * 0.4);
    return { ...state, wordHint: _revealHint(state.correctWord, state.wordHint, fraction) };
}

export function isRoundOver(state) {
    return state.phase === 'roundEnd' || state.timeLeft <= 0;
}

export function isGameOver(state) {
    // Game ends when all drawers have had a turn per round
    const turnsPlayed = state.currentDrawerIndex + 1;
    return turnsPlayed >= state.drawerOrder.length * state.totalRounds;
}

export function getFinalScores(state) {
    const scores = {};
    for (const [uid, s] of Object.entries(state.scores)) {
        scores[Number(uid)] = { username: null, score: s };
    }
    return scores;
}
