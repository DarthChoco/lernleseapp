/* --- VARIABLEN-SETUP --- */
let dictionary = [];
let filteredWords = [];
let learnedLetters = new Set(JSON.parse(localStorage.getItem('learnedLetters')) || []);
let lastWord = "";
let currentGame = 'silben';
let currentAnlautWord = "";
let mathMode = 'mengen';
let currentMathAnswer = 0;
let score = parseInt(localStorage.getItem('schlaufix_score')) || 0;

/* --- INITIALISIERUNG --- */
async function init() {
    try {
        const response = await fetch('wortliste.txt');
        const text = await response.text();
        dictionary = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    } catch (e) {
        // Fallback-Wörter, falls Datei nicht ladbar
        dictionary = ["Ma-ma", "Pa-pa", "O-ma", "E-sel", "Rol-ler", "Ha-se", "Ba-na-ne"];
    }
    createAlphabet();
    updateWordPool();
    updateScoreDisplay(false);
    showGame('silben');
}

/* --- PUNKTE-SYSTEM & KONFETTI --- */
function updateScoreDisplay(isCorrect) {
    const oldScore = parseInt(localStorage.getItem('schlaufix_score')) || 0;
    document.getElementById('current-score').innerText = score;
    localStorage.setItem('schlaufix_score', score);

    // Belohnung bei jeder vollen 100
    if (isCorrect && Math.floor(score / 100) > Math.floor(oldScore / 100) && score > 0) {
        launchConfetti();
    }
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#FF5722', '#2196F3', '#4CAF50', '#FFC107'];
    for (let i = 0; i < 80; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        c.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(c);
        setTimeout(() => c.remove(), 4000);
    }
}

/* --- NAVIGATION --- */
function showGame(gameId) {
    currentGame = gameId;
    document.querySelectorAll('.game-screen').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('game-' + gameId).style.display = 'block';
    document.getElementById('nav-' + gameId)?.classList.add('active');
    if (gameId === 'anlaut') nextAnlautTask();
}

function showMathGame(mode) {
    mathMode = mode;
    showGame('rechnen');
    document.querySelectorAll('.math-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('nav-' + mode)?.classList.add('active');
    generateMathTask();
}

/* --- DEUTSCH-LOGIK (Silben & Anlaute) --- */
function createAlphabet() {
    const selectionContainer = document.getElementById('alphabet-container');
    const gameKeyboard = document.getElementById('anlaut-keyboard');
    if(!selectionContainer || !gameKeyboard) return;

    selectionContainer.innerHTML = "";
    gameKeyboard.innerHTML = "";
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("");
    chars.forEach(char => {
        const lower = char.toLowerCase();
        
        // Buttons für die Buchstaben-Auswahl
        const selectBtn = document.createElement('button');
        selectBtn.innerText = char;
        selectBtn.className = learnedLetters.has(lower) ? 'letter-btn active' : 'letter-btn';
        selectBtn.onclick = () => {
            if (learnedLetters.has(lower)) learnedLetters.delete(lower);
            else learnedLetters.add(lower);
            localStorage.setItem('learnedLetters', JSON.stringify([...learnedLetters]));
            createAlphabet();
            updateWordPool();
        };
        selectionContainer.appendChild(selectBtn);

        // Buttons für das Anlaut-Spiel
        const gameBtn = document.createElement('button');
        gameBtn.innerText = char;
        gameBtn.className = 'key-btn';
        gameBtn.onclick = () => checkAnlaut(lower);
        gameKeyboard.appendChild(gameBtn);
    });
}

function updateWordPool() {
    filteredWords = dictionary.filter(word => {
        const clean = word.replace(/-/g, "").toLowerCase();
        return [...clean].every(c => learnedLetters.has(c));
    });
    if (currentGame === 'silben') renderRandomWord();
}

function renderRandomWord() {
    const container = document.getElementById('wordContainer');
    if (filteredWords.length === 0) { 
        container.innerText = "Wähle Buchstaben!"; 
        return; 
    }
    
    const word = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    lastWord = word; 
    container.innerHTML = ""; // Container leeren
    
    word.split("-").forEach((s, i) => {
        const span = document.createElement('span');
        span.innerText = s;
        span.style.color = (i % 2 === 0) ? "blue" : "red";
        // WICHTIG: Keine Leerzeichen beim Anhängen
        container.appendChild(span);
    });
}

function nextAnlautTask() {
    if (filteredWords.length === 0) {
        document.getElementById('anlautWord').innerText = "Wähle Buchstaben!";
        return;
    }
    const word = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    currentAnlautWord = word.replace(/-/g, "");
    lastWord = word;
    document.getElementById('anlautWord').innerText = "_ " + currentAnlautWord.substring(1);
    document.getElementById('anlautFeedback').innerText = "";
}

function checkAnlaut(char) {
    const correct = currentAnlautWord[0].toLowerCase();
    const feedback = document.getElementById('anlautFeedback');
    if (char === correct) {
        score++; feedback.innerText = "Super! +1 ⭐"; feedback.style.color = "green";
        document.getElementById('anlautWord').innerText = currentAnlautWord;
        updateScoreDisplay(true);
        setTimeout(nextAnlautTask, 1500);
    } else {
        score = Math.max(0, score - 1); feedback.innerText = "Noch mal! -1 ❌"; feedback.style.color = "red";
        updateScoreDisplay(false);
    }
}

/* --- MATHE-LOGIK --- */
function generateMathTask() {
    const display = document.getElementById('math-display');
    const options = document.getElementById('math-options');
    const range = parseInt(document.getElementById('math-range').value);
    
    display.innerHTML = ""; options.innerHTML = "";
    document.getElementById('math-feedback').innerText = "";

    if (mathMode === 'mengen') {
        currentMathAnswer = Math.floor(Math.random() * Math.min(range, 20)) + 1;
        const grid = document.createElement('div');
        grid.className = 'dot-container';
        for(let i=0; i<currentMathAnswer; i++) grid.innerHTML += '<div class="dot"></div>';
        display.appendChild(grid);
        createMathNumbers(1, Math.min(range, 20));

    } else if (mathMode === 'vergleich') {
        let n1 = Math.floor(Math.random() * (range + 1));
        let n2 = Math.floor(Math.random() * (range + 1));
        display.innerHTML = `<div class="math-big-num">${n1}</div><div id="math-quest">?</div><div class="math-big-num">${n2}</div>`;
        currentMathAnswer = n1 > n2 ? ">" : (n1 < n2 ? "<" : "=");
        [">", "<", "="].forEach(op => {
            const b = document.createElement('button'); b.innerText = op; b.className = 'key-btn';
            b.onclick = () => checkMathAnswer(op); options.appendChild(b);
        });

    } else if (mathMode === 'rechnen') {
        const op = Math.random() > 0.5 ? "+" : "-";
        let a, b;
        if (op === "+") {
            const targetSum = Math.floor(Math.random() * (range + 1));
            a = Math.floor(Math.random() * (targetSum + 1));
            b = targetSum - a;
            currentMathAnswer = targetSum;
        } else {
            a = Math.floor(Math.random() * (range + 1));
            b = Math.floor(Math.random() * (a + 1));
            currentMathAnswer = a - b;
        }
        display.innerHTML = `<div class="math-big-num">${a} ${op} ${b} =</div><div id="math-quest">?</div>`;
        createMathNumbers(0, range);
    }
}

function createMathNumbers(min, max) {
    const container = document.getElementById('math-options');
    container.innerHTML = "";
    const count = (max - min) + 1;
    // Dynamische Spalten-Berechnung (5-10 pro Zeile)
    const columns = Math.min(10, Math.max(5, Math.ceil(count / Math.ceil(count / 10))));
    container.style.maxWidth = (columns * 60) + "px";

    for (let i = min; i <= max; i++) {
        const b = document.createElement('button');
        b.innerText = i; b.className = 'key-btn';
        b.onclick = () => checkMathAnswer(i);
        container.appendChild(b);
    }
}

function checkMathAnswer(val) {
    const feedback = document.getElementById('math-feedback');
    if (val == currentMathAnswer) {
        score++; feedback.innerText = "Richtig! +1 ⭐"; feedback.style.color = "green";
        const q = document.getElementById('math-quest');
        if(q) { q.innerText = val; q.classList.add('answer-highlight'); }
        updateScoreDisplay(true);
        setTimeout(generateMathTask, 2000);
    } else {
        score = Math.max(0, score - 1); feedback.innerText = "Noch mal! -1 ❌"; feedback.style.color = "red";
        updateScoreDisplay(false);
    }
}

/* --- AUDIO --- */
function speakCurrentWord() {
    if (!lastWord) return;
    const utterance = new SpeechSynthesisUtterance(lastWord.replace(/-/g, ""));
    utterance.lang = 'de-DE';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
}

init();