// --- GLOBALE VARIABLEN & STATUS ---
let learnedLetters = new Set(JSON.parse(localStorage.getItem('learnedLetters')) || []);
let mathRange = parseInt(localStorage.getItem('schlaufix_range')) || 20;
let score = parseInt(localStorage.getItem('schlaufix_score')) || 0;
let dictionary = [];
let filteredWords = [];
let lastWord = "";
let mathMode = 'rechnen';
let currentMathAnswer = 0;

// --- INITIALISIERUNG ---
async function loadDictionary() {
    try {
        const response = await fetch('wortliste.txt');
        const text = await response.text();
        // Bereinigt die Liste von Leerzeichen und leeren Zeilen
        dictionary = text.split('\n').map(w => w.trim()).filter(w => w.length > 0);
    } catch (e) {
        console.error("wortliste.txt konnte nicht geladen werden. Nutze Backup.");
        dictionary = ["Ma-ma", "Pa-pa", "O-ma", "E-sel", "Ha-se", "Ba-na-ne"];
    }
    updateWordPool();
}

async function init() {
    document.getElementById('current-score').innerText = score;
    await loadDictionary();
    createAlphabet();
    updateGradeLevel();
    updateRangeButtons();
}

// --- NAVIGATION & KLASSENSTUFE ---
function updateGradeLevel() {
    let grade = document.getElementById('grade-level').value;
    
    // Elemente für 1. Klasse ein-/ausblenden
    document.querySelectorAll('.grade-1-only').forEach(el => {
        el.style.display = (grade === "1" ? "block" : "none");
    });

    // Start-Spiel festlegen beim Wechsel
    if (grade === "1") {
        showGame('silben');
    } else {
        showMathGame('rechnen');
    }
}

function showGame(gameId) {
    // Alle Screens verstecken
    document.querySelectorAll('.game-screen').forEach(s => s.style.display = 'none');
    // Screen anzeigen
    const target = document.getElementById('game-' + gameId);
    if (target) target.style.display = 'block';

    // Sidebar-Buttons aktualisieren
    updateSidebarActiveState(gameId);

    // Spielspezifische Aufgaben generieren
    if (gameId === 'silben') renderRandomWord();
    if (gameId === 'anlaut') nextAnlautTask();
}

function showMathGame(mode) {
    mathMode = mode;
    showGame('rechnen'); // Nutzt den Mathe-Screen
    generateMathTask();
    updateSidebarActiveState(mode);
}

function updateSidebarActiveState(activeId) {
    document.querySelectorAll('.side-nav .side-btn').forEach(btn => {
        btn.classList.remove('active');
        const onclickAttr = btn.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`'${activeId}'`)) {
            btn.classList.add('active');
        }
    });
}

// --- EINSTELLUNGEN ---
function setMathRange(val) {
    // 1. Wert konvertieren und speichern
    mathRange = parseInt(val);
    localStorage.setItem('schlaufix_range', mathRange);
    
    // 2. Visuelle Markierung der Buttons aktualisieren
    updateRangeButtons();
    
    // 3. Wenn wir gerade im Mathe-Spiel sind, Aufgabe sofort neu generieren
    if (mathMode) {
        generateMathTask();
    }
}

function updateRangeButtons() {
    const buttons = document.querySelectorAll('.range-btn');
    buttons.forEach(btn => {
        // Wir extrahieren die Zahl aus dem onclick-String, z.B. "setMathRange(10)" -> 10
        const btnValue = parseInt(btn.getAttribute('onclick').match(/\d+/)[0]);
        
        if (btnValue === mathRange) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function createAlphabet() {
    const grid = document.getElementById('alphabet-selection-grid');
    const kb = document.getElementById('anlaut-keyboard');
    if (!grid || !kb) return;

    grid.innerHTML = ""; kb.innerHTML = "";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("").forEach(char => {
        let lower = char.toLowerCase();
        
        // Button für Einstellungen
        let btn = document.createElement('button');
        btn.innerText = char;
        btn.className = learnedLetters.has(lower) ? "letter-btn active" : "letter-btn";
        btn.onclick = () => {
            learnedLetters.has(lower) ? learnedLetters.delete(lower) : learnedLetters.add(lower);
            localStorage.setItem('learnedLetters', JSON.stringify([...learnedLetters]));
            createAlphabet(); 
            updateWordPool();
        };
        grid.appendChild(btn);

        // Button für Anlaut-Tastatur
        let kbtn = document.createElement('button');
        kbtn.innerText = char; 
        kbtn.className = "letter-btn";
        kbtn.onclick = () => checkAnlaut(lower);
        kb.appendChild(kbtn);
    });
}

// --- DEUTSCH LOGIK ---
function updateWordPool() {
    filteredWords = dictionary.filter(w => {
        const cleanWord = w.replace(/-/g, "").toLowerCase();
        return [...cleanWord].every(c => learnedLetters.has(c));
    });
}

function renderRandomWord() {
    const c = document.getElementById('wordContainer');
    if (filteredWords.length === 0) { c.innerText = "Wähle Buchstaben!"; return; }
    
    let word = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    lastWord = word;
    c.innerHTML = "";
    
    word.split("-").forEach((s, i) => {
        let span = document.createElement('span');
        span.innerText = s;
        span.style.color = (i % 2 === 0 ? "blue" : "red");
        c.appendChild(span);
    });
}

function speakCurrentWord() {
    if (!lastWord) return;
    let cleanWord = lastWord.replace(/-/g, "");
    let utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}

function nextAnlautTask() {
    if (filteredWords.length === 0) return;
    let word = filteredWords[Math.floor(Math.random() * filteredWords.length)];
    lastWord = word;
    const display = document.getElementById('anlautWord');
    display.innerText = "_ " + word.replace(/-/g, "").substring(1);
    display.style.color = ""; // Farbe zurücksetzen
    speakCurrentWord();
}

function checkAnlaut(char) {
    let correctChar = lastWord.replace(/-/g, "")[0].toLowerCase();
    const display = document.getElementById('anlautWord');

    if (char === correctChar) {
        score++;
        display.innerText = lastWord.replace(/-/g, "");
        display.style.color = "#4CAF50"; // Grün
        updateScoreDisplay();
        setTimeout(nextAnlautTask, 1500);
    } else {
        score = Math.max(0, score - 1);
        display.style.color = "#F44336"; // Rot
        updateScoreDisplay();
        setTimeout(() => { display.style.color = ""; }, 500);
    }
}

// --- MATHE LOGIK ---
function generateMathTask() {
    const display = document.getElementById('math-display');
    const options = document.getElementById('math-options');
    display.innerHTML = ""; options.innerHTML = "";

    if (mathMode === 'mengen') {
        currentMathAnswer = Math.floor(Math.random() * 10) + 1;
        let grid = document.createElement('div');
        grid.className = 'dot-container';
        for(let i=0; i<currentMathAnswer; i++) grid.innerHTML += '<div class="dot"></div>';
        display.appendChild(grid);
        for(let i=1; i<=10; i++) addMathOption(i);
    } 
    else if (mathMode === 'vergleich') {
        let n1 = Math.floor(Math.random() * mathRange);
        let n2 = Math.floor(Math.random() * mathRange);
        display.innerHTML = `<div class="math-big-num">${n1}</div><div id="math-quest">?</div><div class="math-big-num">${n2}</div>`;
        currentMathAnswer = n1 > n2 ? ">" : (n1 < n2 ? "<" : "=");
        [">", "<", "="].forEach(op => addMathOption(op));
    } 
    else { // Standard: Rechnen
        let a = Math.floor(Math.random() * (mathRange + 1));
        let b = Math.floor(Math.random() * (mathRange + 1));
        let isMinus = Math.random() > 0.5 && a >= b;
        
        if (isMinus) {
            currentMathAnswer = a - b;
            display.innerHTML = `<div class="math-big-num">${a} - ${b} = </div><div id="math-quest">?</div>`;
        } else {
            // Sicherstellen, dass Summe im Zahlenraum bleibt
            a = Math.floor(Math.random() * (mathRange / 2));
            b = Math.floor(Math.random() * (mathRange / 2));
            currentMathAnswer = a + b;
            display.innerHTML = `<div class="math-big-num">${a} + ${b} = </div><div id="math-quest">?</div>`;
        }
        
        // Optionen generieren (0 bis mathRange)
        for(let i=0; i<=mathRange; i++) addMathOption(i);
    }
}

function addMathOption(val) {
    let b = document.createElement('button');
    b.innerText = val;
    b.className = "letter-btn";
    b.onclick = () => {
        const questEl = document.getElementById('math-quest');
        if (val == currentMathAnswer) { 
            score++;
            questEl.innerText = val;
            questEl.classList.add('correct');
            updateScoreDisplay();
            setTimeout(generateMathTask, 1000);
        } else {
            score = Math.max(0, score - 1);
            questEl.classList.add('wrong');
            updateScoreDisplay();
            setTimeout(() => { questEl.classList.remove('wrong'); }, 500);
        }
    };
    document.getElementById('math-options').appendChild(b);
}

function updateScoreDisplay() {
    document.getElementById('current-score').innerText = score;
    localStorage.setItem('schlaufix_score', score);
}

// START
init();