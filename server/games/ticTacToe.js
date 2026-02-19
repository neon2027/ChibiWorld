// Tic-Tac-Toe — pure game logic

const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
];

export function initState(players) {
    return {
        board: new Array(9).fill(null),
        currentTurn: players[0].userId,
        symbols: {
            [players[0].userId]: 'X',
            [players[1].userId]: 'O'
        },
        winner: null,
        winLine: null
    };
}

export function applyAction(state, userId, actionType, data) {
    if (actionType !== 'place') return { valid: false, error: 'Unknown action' };
    if (state.winner) return { valid: false, error: 'Game already over' };
    if (state.currentTurn !== userId) return { valid: false, error: 'Not your turn' };

    const { cellIndex } = data;
    if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex > 8)
        return { valid: false, error: 'Invalid cell' };
    if (state.board[cellIndex] !== null)
        return { valid: false, error: 'Cell already taken' };

    const newBoard = [...state.board];
    newBoard[cellIndex] = userId;

    // Check win
    let winner = null, winLine = null;
    for (const line of WIN_LINES) {
        if (line.every(i => newBoard[i] === userId)) {
            winner = userId;
            winLine = line;
            break;
        }
    }

    // Check draw
    const isDraw = !winner && newBoard.every(c => c !== null);

    const otherPlayer = Object.keys(state.symbols).find(id => Number(id) !== userId);

    const newState = {
        ...state,
        board: newBoard,
        currentTurn: winner || isDraw ? null : Number(otherPlayer),
        winner: winner ?? (isDraw ? 'draw' : null),
        winLine
    };

    const gameOver = !!winner || isDraw;
    const scores = {};
    if (gameOver) {
        for (const pid of Object.keys(state.symbols)) {
            scores[Number(pid)] = {
                username: null, // filled by gameManager
                score: winner && Number(pid) === winner ? 1 : 0
            };
        }
    }

    return {
        valid: true,
        newState,
        event: { type: 'place', userId, cellIndex, symbol: state.symbols[userId] },
        gameOver,
        winner: winner ? String(winner) : (isDraw ? 'draw' : null),
        scores
    };
}
