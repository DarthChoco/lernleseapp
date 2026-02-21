// --- GLOBALE VARIABLEN & STATUS ---
let learnedLetters = new Set(JSON.parse(localStorage.getItem('learnedLetters')) || []);
let mathRange = parseInt(localStorage.getItem('schlaufix_range')) || 20;
let score = parseInt(localStorage.getItem('schlaufix_score')) || 0;
let dictionary = [];
let filteredWords = [];
let lastWord = "";
let mathMode = 'rechnen';
let currentMathAnswer = 0;

// Meilensteine die bereits ausgelöst wurden (damit sie nicht wiederholt feuern)
const triggeredMilestones = new Set(JSON.parse(localStorage.getItem('schlaufix_milestones')) || []);

// --- INITIALISIERUNG ---
async function loadDictionary() {
    try {
        const response = await fetch('wortliste.txt');
        const text = await response.text();
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
    syncMobileScore();
    // Popups schließen wenn man außerhalb tippt
    document.querySelector('.main-content').addEventListener('click', closeAllPopups);
}

// --- NAVIGATION & KLASSENSTUFE ---
function updateGradeLevel() {
    let grade = document.getElementById('grade-level').value;
    document.querySelectorAll('.grade-1-only').forEach(el => {
        el.style.display = (grade === "1" ? "block" : "none");
    });
    if (grade === "1") {
        showGame('silben');
    } else {
        showMathGame('rechnen');
    }
}

function showGame(gameId) {
    document.querySelectorAll('.game-screen').forEach(s => s.style.display = 'none');
    const target = document.getElementById('game-' + gameId);
    if (target) target.style.display = 'block';
    updateSidebarActiveState(gameId);
    if (gameId === 'silben') renderRandomWord();
    if (gameId === 'anlaut') nextAnlautTask();
    if (gameId === 'zahlenmauer') generateZahlenmauer();
}

function showMathGame(mode) {
    mathMode = mode;
    showGame('rechnen');
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
    mathRange = parseInt(val);
    localStorage.setItem('schlaufix_range', mathRange);
    updateRangeButtons();
    if (mathMode) generateMathTask();
}

function updateRangeButtons() {
    document.querySelectorAll('.range-btn').forEach(btn => {
        const btnValue = parseInt(btn.getAttribute('onclick').match(/\d+/)[0]);
        btn.classList.toggle('active', btnValue === mathRange);
    });
}

function createAlphabet() {
    const grid = document.getElementById('alphabet-selection-grid');
    const kb = document.getElementById('anlaut-keyboard');
    if (!grid || !kb) return;
    grid.innerHTML = ""; kb.innerHTML = "";
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("").forEach(char => {
        let lower = char.toLowerCase();
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
    display.style.color = "";
    speakCurrentWord();
}

function setAnlautKeyboardEnabled(enabled) {
    inputLocked = !enabled;
}

function checkAnlaut(char) {
    if (inputLocked) return;
    inputLocked = true;
    let correctChar = lastWord.replace(/-/g, "")[0].toLowerCase();
    const display = document.getElementById('anlautWord');
    if (char === correctChar) {
        score++;
        display.innerText = lastWord.replace(/-/g, "");
        display.classList.add('correct-animation');
        updateScoreDisplay();
        showFeedback(true, 1);
        setTimeout(() => {
            display.classList.remove('correct-animation');
            nextAnlautTask();
            inputLocked = false;
        }, 1200);
    } else {
        score = Math.max(0, score - 1);
        display.classList.add('wrong-animation');
        updateScoreDisplay();
        showFeedback(false, 1);
        setTimeout(() => {
            display.classList.remove('wrong-animation');
            inputLocked = false;
        }, 400);
    }
}

// --- MATHE LOGIK ---
function generateMathTask() {
    const display = document.getElementById('math-display');
    const options = document.getElementById('math-options');
    display.innerHTML = "";
    options.innerHTML = "";

    if (mathMode === 'mengen') {
        currentMathAnswer = Math.floor(Math.random() * 10) + 1;
        let grid = document.createElement('div');
        grid.className = 'dot-container';
        grid.id = 'math-quest';
        for (let i = 0; i < currentMathAnswer; i++) {
            let d = document.createElement('div');
            d.className = 'dot';
            grid.appendChild(d);
        }
        display.appendChild(grid);
        for (let i = 1; i <= 10; i++) addMathOption(i);
    } else if (mathMode === 'vergleich') {
        let n1 = Math.floor(Math.random() * mathRange);
        let n2 = Math.floor(Math.random() * mathRange);
        display.innerHTML = `
            <div class="math-row">
                <span>${n1}</span>
                <span id="math-quest">?</span>
                <span>${n2}</span>
            </div>`;
        currentMathAnswer = n1 > n2 ? ">" : (n1 < n2 ? "<" : "=");
        [">", "<", "="].forEach(op => addMathOption(op));
    } else {
        let a = Math.floor(Math.random() * (mathRange + 1));
        let b = Math.floor(Math.random() * (mathRange + 1));
        let isMinus = Math.random() > 0.5 && a >= b;
        let op = "+";
        if (isMinus) {
            currentMathAnswer = a - b;
            op = "-";
        } else {
            a = Math.floor(Math.random() * (mathRange / 2));
            b = Math.floor(Math.random() * (mathRange / 2));
            currentMathAnswer = a + b;
        }
        display.innerHTML = `
            <div class="math-row">
                <span>${a} ${op} ${b} = </span>
                <span id="math-quest">?</span>
            </div>`;
        for (let i = 0; i <= mathRange; i++) addMathOption(i);
    }
}

let inputLocked = false;

function disableMathOptions() {
    inputLocked = true;
}

function addMathOption(val) {
    let b = document.createElement('button');
    b.innerText = val;
    b.className = "letter-btn";
    b.onclick = () => {
        if (inputLocked) return;
        inputLocked = true;
        const questEl = document.getElementById('math-quest');
        if (val == currentMathAnswer) {
            score++;
            questEl.innerText = val;
            questEl.classList.add('correct-animation');
            updateScoreDisplay();
            showFeedback(true, 1);
            setTimeout(() => {
                questEl.classList.remove('correct-animation');
                inputLocked = false;
                generateMathTask();
            }, 1000);
        } else {
            score = Math.max(0, score - 1);
            questEl.classList.add('wrong-animation');
            updateScoreDisplay();
            showFeedback(false, 1);
            setTimeout(() => {
                questEl.classList.remove('wrong-animation');
                inputLocked = false;
            }, 400);
        }
    };
    document.getElementById('math-options').appendChild(b);
}

function updateScoreDisplay() {
    document.getElementById('current-score').innerText = score;
    localStorage.setItem('schlaufix_score', score);
    syncMobileScore();
    checkMilestone();
}

// --- ZAHLENMAUER ---
// Indizes: 0=unten-links, 1=unten-mitte, 2=unten-rechts, 3=mitte-links, 4=mitte-rechts, 5=oben
let zmSolution = [];
let zmGiven = [];

function generateZahlenmauer() {
    const maxBase = Math.floor(mathRange / 4) || 5;
    let a, b, c;
    do {
        a = Math.floor(Math.random() * maxBase) + 1;
        b = Math.floor(Math.random() * maxBase) + 1;
        c = Math.floor(Math.random() * maxBase) + 1;
    } while (a + b + c + (a + b) + (b + c) > mathRange * 2);

    const ab = a + b;
    const bc = b + c;
    const top = ab + bc;
    zmSolution = [a, b, c, ab, bc, top];

    const connectedTriples = [[0,1,2],[0,3,4],[1,3,4],[2,3,4],[0,3,5],[2,4,5]];
    zmGiven = connectedTriples[Math.floor(Math.random() * connectedTriples.length)];

    renderZahlenmauer();
    document.getElementById('zahlenmauer-feedback').innerHTML = '';
}

function renderZahlenmauer() {
    const container = document.getElementById('zahlenmauer-container');
    container.innerHTML = '';
    const rows = [[5], [3, 4], [0, 1, 2]];
    rows.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'zm-row';
        row.forEach(idx => {
            const isGiven = zmGiven.includes(idx);
            const cell = document.createElement('div');
            cell.className = 'zm-cell' + (isGiven ? ' zm-given' : '');
            cell.dataset.idx = idx;
            if (isGiven) {
                cell.textContent = zmSolution[idx];
            } else {
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.max = String(mathRange * 2);
                input.placeholder = '?';
                input.inputMode = 'numeric';
                input.pattern = '[0-9]*';
                input.addEventListener('keypress', e => { if (!/[0-9]/.test(e.key)) e.preventDefault(); });
                input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9]/g, ''); });
                cell.appendChild(input);
            }
            rowEl.appendChild(cell);
        });
        container.appendChild(rowEl);
    });
}

function checkZahlenmauer() {
    if (inputLocked) return;
    inputLocked = true;

    const container = document.getElementById('zahlenmauer-container');
    const feedback = document.getElementById('zahlenmauer-feedback');
    const inputs = container.querySelectorAll('input');
    let allFilled = true;
    let allCorrect = true;

    inputs.forEach(input => {
        const idx = parseInt(input.closest('.zm-cell').dataset.idx);
        const userVal = parseInt(input.value);
        if (input.value === '' || isNaN(userVal)) { allFilled = false; return; }
        if (userVal === zmSolution[idx]) {
            input.closest('.zm-cell').classList.remove('zm-wrong');
            input.closest('.zm-cell').classList.add('zm-correct');
        } else {
            input.closest('.zm-cell').classList.remove('zm-correct');
            input.closest('.zm-cell').classList.add('zm-wrong');
            allCorrect = false;
        }
    });

    if (!allFilled) {
        feedback.innerHTML = '<span style="color:#FF9800;font-weight:bold;">⚠️ Bitte alle Felder ausfüllen!</span>';
        inputLocked = false;
        return;
    }

    if (allCorrect) {
        score += 3;
        updateScoreDisplay();
        showFeedback(true, 3);
        feedback.innerHTML = '';
        setTimeout(() => {
            generateZahlenmauer();
            inputLocked = false;
        }, 1800);
    } else {
        score = Math.max(0, score - 1);
        updateScoreDisplay();
        showFeedback(false, 1);
        feedback.innerHTML = '<span style="color:var(--danger);font-weight:bold;">❌ Nicht ganz – schau nochmal hin!</span>';
        container.querySelectorAll('.zm-wrong').forEach(cell => {
            cell.classList.add('wrong-animation');
            setTimeout(() => cell.classList.remove('wrong-animation'), 400);
        });
        setTimeout(() => { inputLocked = false; }, 500);
    }
}

// =============================================
// FEEDBACK TOAST
// =============================================
let feedbackTimer = null;

function showFeedback(correct, points) {
    const toast = document.getElementById('feedback-toast');
    if (feedbackTimer) clearTimeout(feedbackTimer);

    if (correct) {
        toast.className = 'feedback-toast feedback-correct';
        toast.innerHTML = `✅ Richtig! <span class="toast-points">+${points} ${points === 1 ? 'Punkt' : 'Punkte'}</span>`;
    } else {
        toast.className = 'feedback-toast feedback-wrong';
        toast.innerHTML = `❌ Falsch! <span class="toast-points">-1 Punkt</span>`;
    }

    toast.classList.add('toast-visible');
    feedbackTimer = setTimeout(() => {
        toast.classList.remove('toast-visible');
    }, 1500);
}

// =============================================
// MEILENSTEIN-ANIMATIONEN
// =============================================
const MILESTONES = [
    { score: 100, key: 'm100' },
    { score: 200, key: 'm200' },
    { score: 500, key: 'm500' },
];

function checkMilestone() {
    for (const m of MILESTONES) {
        if (score >= m.score && !triggeredMilestones.has(m.key)) {
            triggeredMilestones.add(m.key);
            localStorage.setItem('schlaufix_milestones', JSON.stringify([...triggeredMilestones]));
            triggerMilestone(m.score);
            break;
        }
    }
}

function triggerMilestone(targetScore) {
    const overlay = document.getElementById('milestone-overlay');
    const content = document.getElementById('milestone-content');
    const canvas = document.getElementById('firework-canvas');

    overlay.style.display = 'flex';

    if (targetScore === 100) {
        content.innerHTML = `<div class="milestone-badge">🎉</div><div class="milestone-text">100 Punkte!</div><div class="milestone-sub">Super gemacht!</div>`;
        startConfetti(canvas);
    } else if (targetScore === 200) {
        content.innerHTML = `<div class="milestone-badge">🎆</div><div class="milestone-text">200 Punkte!</div><div class="milestone-sub">Unglaublich!</div>`;
        startFirework(canvas);
    } else if (targetScore === 500) {
        content.innerHTML = `<div class="milestone-badge fox-dance">🦊</div><div class="milestone-text">500 Punkte!</div><div class="milestone-sub">Du bist ein SchlauFix-Profi!</div>`;
        startFirework(canvas);
    }

    setTimeout(() => {
        overlay.style.display = 'none';
        stopAnimation(canvas);
    }, 4000);
}

// --- KONFETTI (100 Punkte) ---
let animFrame = null;

function stopAnimation(canvas) {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startConfetti(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#FF5722','#2196F3','#4CAF50','#FFC107','#E91E63','#9C27B0'];
    const pieces = Array.from({length: 120}, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: Math.random() * 12 + 6,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        vr: (Math.random() - 0.5) * 0.2,
    }));

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        animFrame = requestAnimationFrame(draw);
    }
    draw();
}

// --- FEUERWERK (200 & 500 Punkte) ---
function startFirework(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#FF5722','#FFD700','#00E5FF','#FF4081','#69F0AE','#FFEB3B','#FF6D00'];
    let rockets = [];

    function spawnRocket() {
        const x = canvas.width * 0.2 + Math.random() * canvas.width * 0.6;
        const targetY = canvas.height * 0.15 + Math.random() * canvas.height * 0.35;
        const color = colors[Math.floor(Math.random() * colors.length)];
        rockets.push({ x, y: canvas.height, targetY, vy: -14 - Math.random() * 6, color, exploded: false, particles: [] });
    }

    function explode(r) {
        r.exploded = true;
        const count = 60 + Math.floor(Math.random() * 40);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = 2 + Math.random() * 5;
            r.particles.push({
                x: r.x, y: r.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: r.color,
                size: 2 + Math.random() * 2,
            });
        }
    }

    let spawnCount = 0;
    const maxRockets = 6;

    function draw() {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Neue Rakete spawnen
        if (spawnCount < maxRockets && Math.random() < 0.05) {
            spawnRocket();
            spawnCount++;
        }

        rockets.forEach(r => {
            if (!r.exploded) {
                r.y += r.vy;
                r.vy += 0.3; // Schwerkraft
                ctx.beginPath();
                ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = r.color;
                ctx.fill();
                if (r.y <= r.targetY) explode(r);
            } else {
                r.particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.1;
                    p.alpha -= 0.022;
                    if (p.alpha > 0) {
                        ctx.globalAlpha = p.alpha;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                });
                r.particles = r.particles.filter(p => p.alpha > 0);
            }
        });
        rockets = rockets.filter(r => !r.exploded || r.particles.length > 0);
        animFrame = requestAnimationFrame(draw);
    }
    draw();
}

// --- MOBILE NAV ---
function toggleMobilePopup(which) {
    const popup = document.getElementById('popup-' + which);
    const tab = document.getElementById('tab-' + which);
    const otherKey = which === 'deutsch' ? 'mathe' : 'deutsch';
    const otherPopup = document.getElementById('popup-' + otherKey);
    const otherTab = document.getElementById('tab-' + otherKey);

    const isOpen = popup.classList.contains('popup-open');
    // Alles schließen
    otherPopup.classList.remove('popup-open');
    otherTab.classList.remove('tab-active');
    if (isOpen) {
        popup.classList.remove('popup-open');
        tab.classList.remove('tab-active');
    } else {
        popup.classList.add('popup-open');
        tab.classList.add('tab-active');
    }
}

function closeAllPopups() {
    document.querySelectorAll('.mobile-popup').forEach(p => p.classList.remove('popup-open'));
    document.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('tab-active'));
}

function mobileNav(gameId) {
    closeAllPopups();
    showGame(gameId);
}

function mobileNavMath(mode) {
    closeAllPopups();
    showMathGame(mode);
}

function syncMobileScore() {
    const el = document.getElementById('mobile-score-val');
    if (el) el.textContent = score;
}

// START
init();