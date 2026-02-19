// Trivia Quiz — pure game logic

const QUESTIONS = [
    { q:'What is the capital of France?', opts:['London','Paris','Berlin','Madrid'], a:1 },
    { q:'How many sides does a hexagon have?', opts:['5','6','7','8'], a:1 },
    { q:'Which planet is closest to the Sun?', opts:['Venus','Earth','Mars','Mercury'], a:3 },
    { q:'What is the largest ocean?', opts:['Atlantic','Indian','Pacific','Arctic'], a:2 },
    { q:'Who painted the Mona Lisa?', opts:['Picasso','Da Vinci','Rembrandt','Van Gogh'], a:1 },
    { q:'How many colors are in a rainbow?', opts:['5','6','7','8'], a:2 },
    { q:'What is the chemical symbol for gold?', opts:['Go','Gd','Au','Ag'], a:2 },
    { q:'Which animal is the fastest on land?', opts:['Lion','Cheetah','Horse','Gazelle'], a:1 },
    { q:'How many continents are there?', opts:['5','6','7','8'], a:2 },
    { q:'What is the hardest natural substance?', opts:['Iron','Quartz','Diamond','Ruby'], a:2 },
    { q:'Which country invented pizza?', opts:['France','USA','Italy','Greece'], a:2 },
    { q:'How many strings does a standard guitar have?', opts:['4','5','6','7'], a:2 },
    { q:'What is the longest river in the world?', opts:['Amazon','Mississippi','Nile','Yangtze'], a:2 },
    { q:'Which element has the symbol "O"?', opts:['Osmium','Oxygen','Oganesson','Oxide'], a:1 },
    { q:'How many players are on a soccer team?', opts:['9','10','11','12'], a:2 },
    { q:'What year did the first iPhone launch?', opts:['2005','2006','2007','2008'], a:2 },
    { q:'Which gas makes up most of Earth\'s atmosphere?', opts:['Oxygen','Nitrogen','Carbon Dioxide','Argon'], a:1 },
    { q:'How many bones are in the human body?', opts:['196','206','216','226'], a:1 },
    { q:'What is the tallest mountain in the world?', opts:['K2','Kangchenjunga','Everest','Lhotse'], a:2 },
    { q:'Which programming language is known as the "language of the web"?', opts:['Python','Java','JavaScript','Ruby'], a:2 },
    { q:'What is the square root of 144?', opts:['10','11','12','13'], a:2 },
    { q:'Which country has the most natural lakes?', opts:['USA','Russia','Canada','Brazil'], a:2 },
    { q:'What is the smallest planet in our solar system?', opts:['Mars','Venus','Mercury','Pluto'], a:2 },
    { q:'How many teeth does an adult human have?', opts:['28','30','32','34'], a:2 },
    { q:'Which ocean is the smallest?', opts:['Southern','Arctic','Indian','Pacific'], a:1 },
    { q:'What is the capital of Japan?', opts:['Beijing','Seoul','Tokyo','Bangkok'], a:2 },
    { q:'Who wrote Romeo and Juliet?', opts:['Dickens','Shakespeare','Twain','Austen'], a:1 },
    { q:'How many hours are in a week?', opts:['148','156','168','178'], a:2 },
    { q:'What color is a ruby?', opts:['Blue','Green','Red','Yellow'], a:2 },
    { q:'Which planet has the most moons?', opts:['Jupiter','Saturn','Uranus','Neptune'], a:1 },
    { q:'What is the largest continent?', opts:['Africa','Americas','Asia','Europe'], a:2 },
    { q:'How many letters are in the English alphabet?', opts:['24','25','26','27'], a:2 },
    { q:'Which country is home to the kangaroo?', opts:['New Zealand','South Africa','Australia','India'], a:2 },
    { q:'What is water\'s chemical formula?', opts:['CO2','H2O','O2','H2O2'], a:1 },
    { q:'How many players are on a basketball team?', opts:['4','5','6','7'], a:1 },
    { q:'Which is the largest land animal?', opts:['Hippo','Giraffe','Elephant','Rhino'], a:2 },
    { q:'What year did World War II end?', opts:['1943','1944','1945','1946'], a:2 },
    { q:'How many sides does a pentagon have?', opts:['4','5','6','7'], a:1 },
    { q:'What is the capital of Australia?', opts:['Sydney','Melbourne','Canberra','Brisbane'], a:2 },
    { q:'Which fruit is known as the "king of fruits"?', opts:['Mango','Durian','Pineapple','Jackfruit'], a:1 },
    { q:'How many keys does a standard piano have?', opts:['76','80','88','92'], a:2 },
    { q:'What is the speed of light (approx)?', opts:['200,000 km/s','300,000 km/s','400,000 km/s','500,000 km/s'], a:1 },
    { q:'Which animal sleeps standing up?', opts:['Elephant','Giraffe','Horse','All of these'], a:3 },
    { q:'What does "HTML" stand for?', opts:['Hyper Transfer Markup Language','HyperText Markup Language','High Text Making Language','Hyper Text Making Links'], a:1 },
    { q:'How many hearts does an octopus have?', opts:['1','2','3','4'], a:2 },
    { q:'What is the capital of Brazil?', opts:['Rio de Janeiro','São Paulo','Brasília','Salvador'], a:2 },
    { q:'Which element is liquid at room temperature (besides mercury)?', opts:['Bromine','Chlorine','Fluorine','Iodine'], a:0 },
    { q:'How many strings does a violin have?', opts:['3','4','5','6'], a:1 },
    { q:'What is the most spoken language in the world?', opts:['English','Spanish','Mandarin','Hindi'], a:2 },
    { q:'How many time zones does Russia span?', opts:['9','10','11','12'], a:2 },
];

// Shuffle a copy of questions and pick first N
function _pickQuestions(n = 10) {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

export function initState(players) {
    const scores = {};
    for (const p of players) scores[p.userId] = 0;
    const selectedQuestions = _pickQuestions(10);
    return {
        questionIndex: -1,
        totalQuestions: 10,
        questions: selectedQuestions, // full list kept server-side
        currentQ: null,              // sanitized question sent to clients
        correctIndex: -1,            // HIDDEN until revealAnswer
        revealAnswer: false,
        timeLeft: 15,
        answers: {},
        scores,
        phase: 'idle'
    };
}

export function startQuestion(state) {
    const qi = state.questionIndex + 1;
    if (qi >= state.totalQuestions) return null; // signal: game over
    const q = state.questions[qi];
    return {
        ...state,
        questionIndex: qi,
        currentQ: { text: q.q, options: q.opts },
        correctIndex: q.a,
        revealAnswer: false,
        timeLeft: 15,
        answers: {},
        phase: 'question'
    };
}

export function applyAction(state, userId, actionType, data) {
    if (actionType !== 'answer') return { valid: false, error: 'Unknown action' };
    if (state.phase !== 'question') return { valid: false, error: 'Not accepting answers' };
    if (userId in state.answers) return { valid: false, error: 'Already answered' };
    if (!(userId in state.scores)) return { valid: false, error: 'Not a player' };

    const { optionIndex } = data;
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex > 3)
        return { valid: false, error: 'Invalid option' };

    const newAnswers = { ...state.answers, [userId]: { optionIndex, answeredAt: Date.now() } };
    const newState = { ...state, answers: newAnswers };

    // Check if all players answered
    const allAnswered = Object.keys(state.scores).every(pid => pid in newAnswers);

    return {
        valid: true,
        newState,
        event: { type: 'answered', userId },
        gameOver: false,
        allAnswered
    };
}

export function revealAndScore(state, turnStartTime) {
    const correct = state.correctIndex;
    const newScores = { ...state.scores };
    const results = {};

    for (const [uid, ans] of Object.entries(state.answers)) {
        const isCorrect = ans.optionIndex === correct;
        let points = 0;
        if (isCorrect) {
            const elapsed = (ans.answeredAt - turnStartTime) / 1000;
            const speedBonus = Math.max(0, Math.round(50 * (1 - elapsed / 15)));
            points = 100 + speedBonus;
        }
        newScores[Number(uid)] = (newScores[Number(uid)] || 0) + points;
        results[uid] = { isCorrect, points };
    }

    return {
        ...state,
        scores: newScores,
        revealAnswer: true,
        phase: 'reveal',
        revealResults: results
    };
}

export function isGameOver(state) {
    return state.questionIndex >= state.totalQuestions - 1 && state.phase === 'reveal';
}

export function getFinalScores(state) {
    const scores = {};
    for (const [uid, s] of Object.entries(state.scores)) {
        scores[Number(uid)] = { username: null, score: s };
    }
    return scores;
}
