// Connect Four — pure game logic (6 rows × 7 cols)

const ROWS = 6, COLS = 7;

export function initState(players) {
    return {
        board: new Array(ROWS * COLS).fill(null),
        currentTurn: players[0].userId,
        playerSlots: {
            [players[0].userId]: 'p1',
            [players[1].userId]: 'p2'
        },
        winner: null,
        winCells: null
    };
}

export function applyAction(state, userId, actionType, data) {
    if (actionType !== 'drop') return { valid: false, error: 'Unknown action' };
    if (state.winner) return { valid: false, error: 'Game already over' };
    if (state.currentTurn !== userId) return { valid: false, error: 'Not your turn' };

    const { col } = data;
    if (typeof col !== 'number' || col < 0 || col >= COLS)
        return { valid: false, error: 'Invalid column' };

    // Find lowest empty row in column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
        if (state.board[r * COLS + col] === null) { row = r; break; }
    }
    if (row === -1) return { valid: false, error: 'Column full' };

    const newBoard = [...state.board];
    newBoard[row * COLS + col] = userId;

    const winCells = _checkWin(newBoard, row, col, userId);
    const isDraw = !winCells && newBoard.every(c => c !== null);

    const players = Object.keys(state.playerSlots).map(Number);
    const other = players.find(p => p !== userId);

    const newState = {
        ...state,
        board: newBoard,
        currentTurn: winCells || isDraw ? null : other,
        winner: winCells ? userId : (isDraw ? 'draw' : null),
        winCells: winCells ?? null
    };

    const gameOver = !!(winCells || isDraw);
    const scores = {};
    if (gameOver) {
        for (const pid of players) {
            scores[pid] = { username: null, score: winCells && pid === userId ? 1 : 0 };
        }
    }

    return {
        valid: true,
        newState,
        event: { type: 'drop', userId, row, col },
        gameOver,
        winner: winCells ? String(userId) : (isDraw ? 'draw' : null),
        scores
    };
}

function _checkWin(board, row, col, userId) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
        const line = [row * COLS + col];
        for (const sign of [1, -1]) {
            for (let k = 1; k <= 3; k++) {
                const r = row + dr * sign * k;
                const c = col + dc * sign * k;
                if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
                if (board[r * COLS + c] !== userId) break;
                line.push(r * COLS + c);
            }
        }
        if (line.length >= 4) return line.slice(0, 4);
    }
    return null;
}
