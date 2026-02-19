// Rock Paper Scissors — pure game logic (best of 3)

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const VALID = new Set(['rock', 'paper', 'scissors']);

export function initState(players) {
    const p1 = players[0].userId;
    const p2 = players[1].userId;
    return {
        round: 1,
        totalRounds: 3,
        choices: { [p1]: null, [p2]: null },
        revealed: false,
        roundResult: null,
        scores: { [p1]: 0, [p2]: 0 },
        matchWinner: null
    };
}

export function applyAction(state, userId, actionType, data) {
    if (actionType !== 'pick') return { valid: false, error: 'Unknown action' };
    if (state.matchWinner) return { valid: false, error: 'Match already over' };
    if (state.revealed) return { valid: false, error: 'Round in progress — wait for next round' };
    if (!(userId in state.choices)) return { valid: false, error: 'Not a player' };
    if (state.choices[userId] !== null) return { valid: false, error: 'Already picked' };
    if (!VALID.has(data.choice)) return { valid: false, error: 'Invalid choice' };

    const newChoices = { ...state.choices, [userId]: data.choice };
    const players = Object.keys(newChoices).map(Number);
    const [p1, p2] = players;
    const bothPicked = newChoices[p1] !== null && newChoices[p2] !== null;

    let newState = { ...state, choices: newChoices };
    let event = { type: 'picked', userId };
    let gameOver = false, winner = null, scores = {};

    if (bothPicked) {
        const c1 = newChoices[p1], c2 = newChoices[p2];
        let roundWinner = null;
        if (c1 === c2) roundWinner = 'draw';
        else if (BEATS[c1] === c2) roundWinner = p1;
        else roundWinner = p2;

        const newScores = { ...state.scores };
        if (roundWinner !== 'draw') newScores[roundWinner]++;

        // Check match winner (first to 2 round wins)
        let matchWinner = null;
        for (const pid of players) {
            if (newScores[pid] >= 2) { matchWinner = pid; break; }
        }
        const roundsDone = state.round >= state.totalRounds;

        if (!matchWinner && roundsDone) {
            // Tiebreak: whoever has more points, or draw
            if (newScores[p1] > newScores[p2]) matchWinner = p1;
            else if (newScores[p2] > newScores[p1]) matchWinner = p2;
            else matchWinner = 'draw';
        }

        newState = {
            ...newState,
            revealed: true,
            roundResult: { winner: roundWinner, p1Choice: c1, p2Choice: c2 },
            scores: newScores,
            matchWinner
        };

        event = { type: 'reveal', roundWinner, p1Choice: c1, p2Choice: c2, p1, p2 };
        gameOver = !!(matchWinner);

        if (gameOver) {
            for (const pid of players) {
                scores[pid] = { username: null, score: newScores[pid] };
            }
        }
    }

    return { valid: true, newState, event, gameOver, winner: String(winner ?? newState.matchWinner), scores };
}

// Called by gameManager after reveal to advance to next round
export function advanceRound(state) {
    const players = Object.keys(state.choices).map(Number);
    return {
        ...state,
        round: state.round + 1,
        choices: { [players[0]]: null, [players[1]]: null },
        revealed: false,
        roundResult: null
    };
}
