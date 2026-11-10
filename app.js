/**
 * אפליקציית "אלוף הפועל" - תרגול מערכת הפועל לבגרות בלשון (כיתה י"א)
 * מנוע אדפטיבי מותאם אישית
 */

// מצב המשחק הראשי
const gameState = {
    studentName: "",
    mode: "diagnostic", // 'diagnostic', 'adaptive', 'drill', 'speed'
    selectedGziraFilter: "all",
    
    // מעקב אחר התקדמות
    currentQuestionIndex: 0,
    currentVerb: null,
    diagnosticQueue: [],
    adaptiveQueue: [],
    history: [],
    
    // סטטיסטיקות לפי גזרה
    gziraStats: {
        shlemim: { attempts: 0, score: 0, totalQuestions: 0 },
        merubaim: { attempts: 0, score: 0, totalQuestions: 0 },
        hafan: { attempts: 0, score: 0, totalQuestions: 0 },
        naly: { attempts: 0, score: 0, totalQuestions: 0 },
        nala: { attempts: 0, score: 0, totalQuestions: 0 },
        nafy: { attempts: 0, score: 0, totalQuestions: 0 },
        naavy: { attempts: 0, score: 0, totalQuestions: 0 }
    },

    // קטגוריות ניתוח
    categoryStats: {
        root: { correct: 0, total: 0 },
        binyan: { correct: 0, total: 0 },
        tense: { correct: 0, total: 0 },
        person: { correct: 0, total: 0 },
        infinitive: { correct: 0, total: 0 },
        verbalNoun: { correct: 0, total: 0 }
    },

    // גיימיפיקציה
    score: 0,
    streak: 0,
    maxStreak: 0,
    totalAnswered: 0,
    
    // בחירות נוכחיות של המשתמש בשאלה הפעילה
    currentSelections: {
        root: "",
        binyan: "",
        tense: "",
        person: "",
        infinitive: "",
        verbalNoun: ""
    },

    // טיימר לספידראן
    timer: null,
    timeLeft: 60
};

// -----------------------------------------------------------------------------
// פונקציות עזר לנרמול טקסט (הסרת ניקוד, גרשיים, רווחים)
// -----------------------------------------------------------------------------

function stripNiqqud(str) {
    if (!str) return "";
    return str.replace(/[\u0591-\u05C7]/g, "").trim();
}

function normalizeRoot(str) {
    if (!str) return "";
    let clean = stripNiqqud(str);
    // הסרת גרשיים, מרכאות, מקפים, נקודות, רווחים
    clean = clean.replace(/[\s\-\.\'\"\״\׳\,]/g, "");
    // החלפת אותיות סופיות באותיות רגילות להשוואה מדויקת (או השוואה ישירה)
    return clean;
}

function normalizeWord(str) {
    if (!str) return "";
    let clean = stripNiqqud(str);
    clean = clean.replace(/[\s\-\.\'\"\״\׳]/g, "");
    return clean;
}

// -----------------------------------------------------------------------------
// אתחול האפליקציה וטעינת נתונים
// -----------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    loadSavedState();
    renderBinyanChips();
    renderTenseChips();
    renderPersonSelect();
    setupEventListeners();
    updateHeaderStats();
});

function loadSavedState() {
    try {
        const saved = localStorage.getItem("aluf_hapoal_save");
        if (saved) {
            const data = JSON.parse(saved);
            gameState.studentName = data.studentName || "";
            gameState.score = data.score || 0;
            gameState.maxStreak = data.maxStreak || 0;
            if (data.gziraStats) {
                gameState.gziraStats = Object.assign(gameState.gziraStats, data.gziraStats);
            }
            if (data.categoryStats) {
                gameState.categoryStats = Object.assign(gameState.categoryStats, data.categoryStats);
            }
        }
    } catch (e) {
        console.error("Failed to load saved state", e);
    }

    if (gameState.studentName) {
        const nameInput = document.getElementById("student-name-input");
        if (nameInput) nameInput.value = gameState.studentName;
        const banner = document.getElementById("welcome-banner-name");
        if (banner) banner.textContent = gameState.studentName;
    }
}

function saveState() {
    try {
        const data = {
            studentName: gameState.studentName,
            score: gameState.score,
            maxStreak: gameState.maxStreak,
            gziraStats: gameState.gziraStats,
            categoryStats: gameState.categoryStats
        };
        localStorage.setItem("aluf_hapoal_save", JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save state", e);
    }
}

// -----------------------------------------------------------------------------
// רינדור רכיבי ממשק: צ'יפים של בניינים, זמנים, גופים
// -----------------------------------------------------------------------------

function renderBinyanChips() {
    const container = document.getElementById("binyan-chips-container");
    container.innerHTML = "";
    BINYANIM_LIST.forEach(b => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-btn";
        chip.dataset.binyan = b.id;
        chip.textContent = b.name;
        chip.addEventListener("click", () => {
            sounds.playClick();
            document.querySelectorAll("#binyan-chips-container .chip-btn").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            gameState.currentSelections.binyan = b.id;
        });
        container.appendChild(chip);
    });
}

function renderTenseChips() {
    const container = document.getElementById("tense-chips-container");
    container.innerHTML = "";
    TENSES_LIST.forEach(t => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-btn";
        chip.dataset.tense = t.id;
        chip.textContent = t.name;
        chip.addEventListener("click", () => {
            sounds.playClick();
            document.querySelectorAll("#tense-chips-container .chip-btn").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            gameState.currentSelections.tense = t.id;
        });
        container.appendChild(chip);
    });
}

function renderPersonSelect() {
    const select = document.getElementById("person-select");
    select.innerHTML = `<option value="" disabled selected>בחר/י גוף...</option>`;
    PERSONS_LIST.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
    select.addEventListener("change", (e) => {
        sounds.playClick();
        gameState.currentSelections.person = e.target.value;
    });
}

// -----------------------------------------------------------------------------
// ניהול מסכים וזרימת המשחק
// -----------------------------------------------------------------------------

function showScreen(screenId) {
    document.querySelectorAll(".game-screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add("active");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function startDiagnosticMode() {
    const nameInput = document.getElementById("student-name-input");
    const nameVal = nameInput ? nameInput.value.trim() : "";
    gameState.studentName = nameVal || "תלמיד/ה";
    const banner = document.getElementById("welcome-banner-name");
    if (banner) banner.textContent = gameState.studentName;
    saveState();

    gameState.mode = "diagnostic";
    // נבנה תור של 7 פעלים - בדיוק אחד מכל גזרה לבדיקת רמה התחלתית!
    const sampleVerbs = [];
    const gzarotKeys = Object.keys(GZAROT_INFO);
    
    gzarotKeys.forEach(gziraKey => {
        const matchingVerbs = VERBS_DATABASE.filter(v => v.gzira === gziraKey);
        // נבחר פועל מגוון
        const randomVerb = matchingVerbs[Math.floor(Math.random() * matchingVerbs.length)];
        if (randomVerb) sampleVerbs.push(randomVerb);
    });

    // נערבב קלות את סדר השאלות
    gameState.diagnosticQueue = shuffleArray(sampleVerbs);
    gameState.currentQuestionIndex = 0;

    showScreen("play-screen");
    loadQuestion(gameState.diagnosticQueue[0], `שלב אבחון: שאלה 1 מתוך ${gameState.diagnosticQueue.length}`);
}

function startAdaptiveMode() {
    gameState.mode = "adaptive";
    showScreen("play-screen");
    pickNextAdaptiveVerb();
}

function startDrillMode(gziraId) {
    gameState.mode = "drill";
    gameState.selectedGziraFilter = gziraId;
    showScreen("play-screen");
    pickNextDrillVerb();
}

function pickNextDrillVerb() {
    const available = VERBS_DATABASE.filter(v => v.gzira === gameState.selectedGziraFilter);
    const chosen = available[Math.floor(Math.random() * available.length)];
    loadQuestion(chosen, `אימון ממוקד: ${GZAROT_INFO[gameState.selectedGziraFilter].name}`);
}

/**
 * מנוע בחירת שאלות אדפטיבי חכם:
 * מקצה הסתברות גבוהה יותר (משקל כבד יותר) לגזרות שבהן אחוז ההצלחה של התלמיד נמוך יותר!
 */
function pickNextAdaptiveVerb() {
    const gzarotKeys = Object.keys(GZAROT_INFO);
    const weights = [];
    
    gzarotKeys.forEach(key => {
        const stats = gameState.gziraStats[key];
        let weight = 10; // בסיס
        if (stats.attempts > 0) {
            const mastery = stats.score / stats.attempts; // 0 עד 1
            // ככל שהשליטה נמוכה יותר, המשקל גבוה משמעותית (פי 4-5)
            weight = Math.round((1.05 - mastery) * 40) + 5;
        } else {
            weight = 20; // גזרה שעדיין לא נוסתה
        }
        weights.push({ key, weight });
    });

    // הגרלה ממושקלת
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenGzira = weights[0].key;

    for (let i = 0; i < weights.length; i++) {
        if (rand < weights[i].weight) {
            chosenGzira = weights[i].key;
            break;
        }
        rand -= weights[i].weight;
    }

    const availableVerbs = VERBS_DATABASE.filter(v => v.gzira === chosenGzira);
    // נשתדל לא לחזור על הפועל הקודם
    const filtered = availableVerbs.filter(v => !gameState.currentVerb || v.id !== gameState.currentVerb.id);
    const chosen = (filtered.length > 0 ? filtered : availableVerbs)[Math.floor(Math.random() * (filtered.length > 0 ? filtered.length : availableVerbs.length))];

    const currentGziraMastery = getGziraMasteryPercent(chosenGzira);
    loadQuestion(chosen, `אימון מותאם אישית • ${GZAROT_INFO[chosenGzira].badge} (רמת שליטה: ${currentGziraMastery}%)`);
}

function getGziraMasteryPercent(gziraKey) {
    const stats = gameState.gziraStats[gziraKey];
    if (!stats || stats.attempts === 0) return 0;
    return Math.round((stats.score / stats.attempts) * 100);
}

// -----------------------------------------------------------------------------
// טעינת שאלה והצגת הפועל
// -----------------------------------------------------------------------------

function loadQuestion(verbObj, headerText) {
    gameState.currentVerb = verbObj;
    resetQuestionForm();

    document.getElementById("question-stage-indicator").textContent = headerText;
    document.getElementById("target-verb-display").textContent = verbObj.verb;
    document.getElementById("target-sentence-display").textContent = verbObj.sentence;

    const gziraPill = document.getElementById("gzira-hint-pill");
    const gziraData = GZAROT_INFO[verbObj.gzira];
    gziraPill.textContent = gziraData.badge;
    gziraPill.style.backgroundColor = `${gziraData.color}20`;
    gziraPill.style.color = gziraData.color;
    gziraPill.style.borderColor = gziraData.color;

    // התמקדות ראשונית בתיבת השורש
    setTimeout(() => {
        document.getElementById("root-input").focus();
    }, 150);
}

function resetQuestionForm() {
    // איפוס בחירות
    gameState.currentSelections = {
        root: "",
        binyan: "",
        tense: "",
        person: "",
        infinitive: "",
        verbalNoun: ""
    };

    // איפוס תיבות קלט
    document.getElementById("root-input").value = "";
    document.getElementById("infinitive-input").value = "";
    document.getElementById("verbal-noun-input").value = "";

    // איפוס צ'יפים
    document.querySelectorAll(".chip-btn").forEach(c => {
        c.classList.remove("active", "correct", "wrong");
    });

    // איפוס סלקטור גוף
    document.getElementById("person-select").value = "";

    // הסרת מחלקות בדיקה
    document.querySelectorAll(".field-validation-msg").forEach(el => el.textContent = "");
    document.querySelectorAll(".input-with-icon").forEach(el => el.classList.remove("is-valid", "is-invalid"));

    // החזרת כפתור הבדיקה למצב פעיל
    document.getElementById("check-btn").style.display = "inline-flex";
    document.getElementById("next-btn").style.display = "none";
}

// -----------------------------------------------------------------------------
// בדיקת התשובות ואימות דקדוקי
// -----------------------------------------------------------------------------

function checkCurrentAnswers() {
    const verb = gameState.currentVerb;
    if (!verb) return;

    sounds.init();

    // קריאת שדות הקלט
    const userRoot = document.getElementById("root-input").value.trim();
    const userInfinitive = document.getElementById("infinitive-input").value.trim();
    const userVerbalNoun = document.getElementById("verbal-noun-input").value.trim();
    const userBinyan = gameState.currentSelections.binyan;
    const userTense = gameState.currentSelections.tense;
    const userPerson = gameState.currentSelections.person;

    // ולידציה בסיסית - האם מולא לפחות חלק
    if (!userRoot && !userBinyan && !userTense && !userPerson) {
        alert("נא למלא את פרטי הניתוח (שורש, בניין, זמן, גוף...) לפני הבדיקה!");
        return;
    }

    // תוצאות עבור כל שדה
    const results = {
        root: false,
        binyan: false,
        tense: false,
        person: false,
        infinitive: false,
        verbalNoun: false
    };

    let specificRootFeedback = "";

    // 1. בדיקת שורש
    const normUserRoot = normalizeRoot(userRoot);
    const normCorrectRoot = normalizeRoot(verb.root);

    if (normUserRoot === normCorrectRoot) {
        results.root = true;
    } else {
        // בדיקת מקרה מיוחד של גזרת נע"ו/י!
        if (verb.gzira === "naavy") {
            const isSpecialYod = SPECIAL_YOD_ROOTS.includes(normCorrectRoot);
            if (!isSpecialYod && normUserRoot.includes("י") && normCorrectRoot.includes("ו")) {
                specificRootFeedback = `💡 שימו לב לכלל נע"ו/י: אות השורש האמצעית היא ו' (${verb.root}), למעט ששת שורשי היו"ד: שי"ר, גי"ל, רי"ב, שי"ם, שי"ח, קי"א!`;
            } else if (isSpecialYod && normUserRoot.includes("ו") && normCorrectRoot.includes("י")) {
                specificRootFeedback = `💡 השורש ${verb.root} הוא אחד מ-6 שורשי היו"ד המיוחדים בנע"ו/י ונכתב תמיד עם יו"ד!`;
            }
        }
    }

    // 2. בדיקת בניין
    if (userBinyan === verb.binyan) {
        results.binyan = true;
    }

    // 3. בדיקת זמן (זכור: "בינוני" במקום הווה, וכולל "ציווי")
    if (userTense === verb.tense) {
        results.tense = true;
    }

    // 4. בדיקת גוף
    if (userPerson === verb.person) {
        results.person = true;
    }

    // 5. בדיקת שם פועל
    const normUserInf = normalizeWord(userInfinitive);
    const normCorrectInf = normalizeWord(verb.infinitive);
    if (normUserInf === normCorrectInf || (normUserInf && normCorrectInf.endsWith(normUserInf))) {
        results.infinitive = true;
    }

    // 6. בדיקת שם פעולה
    const normUserVN = normalizeWord(userVerbalNoun);
    const normCorrectVN = normalizeWord(verb.verbalNoun);
    if (normUserVN === normCorrectVN || (normUserVN && normCorrectVN.includes(normUserVN))) {
        results.verbalNoun = true;
    }

    // עדכון ניקוד וסטטיסטיקות
    let correctCount = 0;
    const totalFields = 6;

    Object.keys(results).forEach(key => {
        gameState.categoryStats[key].total++;
        if (results[key]) {
            gameState.categoryStats[key].correct++;
            correctCount++;
        }
    });

    const isPerfect = (correctCount === totalFields);
    const scoreForThis = (correctCount * 15) + (isPerfect ? 30 : 0);
    gameState.score += scoreForThis;

    // עדכון רצף (Streak)
    if (correctCount >= 4) {
        gameState.streak++;
        if (gameState.streak > gameState.maxStreak) {
            gameState.maxStreak = gameState.streak;
        }
        if (gameState.streak >= 3 && gameState.streak % 3 === 0) {
            triggerConfetti();
        }
    } else {
        gameState.streak = 0;
    }

    // עדכון סטטיסטיקת גזרה
    const gziraKey = verb.gzira;
    gameState.gziraStats[gziraKey].attempts++;
    gameState.gziraStats[gziraKey].score += (correctCount / totalFields);
    gameState.totalAnswered++;

    // צלילים
    if (isPerfect) {
        sounds.playLevelUp();
    } else if (correctCount >= 4) {
        sounds.playCorrect();
    } else {
        sounds.playWrong();
    }

    // הצגת משוב חזותי על הטופס
    renderValidationFeedback(results, verb, specificRootFeedback);
    updateHeaderStats();
    saveState();

    // החלפת כפתור הבדיקה בכפתור "הבא"
    document.getElementById("check-btn").style.display = "none";
    document.getElementById("next-btn").style.display = "inline-flex";
    document.getElementById("next-btn").focus();
}

function renderValidationFeedback(results, verb, specificRootFeedback) {
    // שורש
    const rootGroup = document.getElementById("root-input").closest(".input-with-icon");
    const rootMsg = document.getElementById("root-feedback-msg");
    if (results.root) {
        rootGroup.classList.add("is-valid");
        rootGroup.classList.remove("is-invalid");
        rootMsg.textContent = "✓ נכון מאד!";
        rootMsg.className = "field-validation-msg valid";
    } else {
        rootGroup.classList.add("is-invalid");
        rootGroup.classList.remove("is-valid");
        rootMsg.textContent = `✗ השורש הנכון: ${verb.root}` + (specificRootFeedback ? ` | ${specificRootFeedback}` : "");
        rootMsg.className = "field-validation-msg invalid";
    }

    // בניין
    document.querySelectorAll("#binyan-chips-container .chip-btn").forEach(chip => {
        if (chip.dataset.binyan === verb.binyan) {
            chip.classList.add("correct");
        } else if (chip.dataset.binyan === gameState.currentSelections.binyan && !results.binyan) {
            chip.classList.add("wrong");
        }
    });

    // זמן
    document.querySelectorAll("#tense-chips-container .chip-btn").forEach(chip => {
        if (chip.dataset.tense === verb.tense) {
            chip.classList.add("correct");
        } else if (chip.dataset.tense === gameState.currentSelections.tense && !results.tense) {
            chip.classList.add("wrong");
        }
    });

    // גוף
    const personMsg = document.getElementById("person-feedback-msg");
    const personLabel = PERSONS_LIST.find(p => p.id === verb.person)?.name || verb.person;
    if (results.person) {
        personMsg.textContent = "✓ נכון!";
        personMsg.className = "field-validation-msg valid";
    } else {
        personMsg.textContent = `✗ הגוף הנכון: ${personLabel}`;
        personMsg.className = "field-validation-msg invalid";
    }

    // שם פועל
    const infGroup = document.getElementById("infinitive-input").closest(".input-with-icon");
    const infMsg = document.getElementById("infinitive-feedback-msg");
    if (results.infinitive) {
        infGroup.classList.add("is-valid");
        infMsg.textContent = "✓ מדויק!";
        infMsg.className = "field-validation-msg valid";
    } else {
        infGroup.classList.add("is-invalid");
        infMsg.textContent = `✗ שם פועל: ${verb.infinitive}`;
        infMsg.className = "field-validation-msg invalid";
    }

    // שם פעולה
    const vnGroup = document.getElementById("verbal-noun-input").closest(".input-with-icon");
    const vnMsg = document.getElementById("verbal-noun-feedback-msg");
    if (results.verbalNoun) {
        vnGroup.classList.add("is-valid");
        vnMsg.textContent = "✓ מצוין!";
        vnMsg.className = "field-validation-msg valid";
    } else {
        vnGroup.classList.add("is-invalid");
        vnMsg.textContent = `✗ שם פעולה: ${verb.verbalNoun}`;
        vnMsg.className = "field-validation-msg invalid";
    }

    // הצגת כרטיס הסבר מלא ומנומק
    showDetailedExplanationCard(verb, results);
}

function showDetailedExplanationCard(verb, results) {
    const card = document.getElementById("explanation-modal-content");
    const gzira = GZAROT_INFO[verb.gzira];

    card.innerHTML = `
        <div class="explanation-box" style="border-right-color: ${gzira.color};">
            <div class="explanation-header">
                <span class="badge" style="background: ${gzira.color}20; color: ${gzira.color}; border: 1px solid ${gzira.color};">
                    ${gzira.badge}
                </span>
                <h4>ניתוח דקדוקי מלא: ${verb.verb}</h4>
            </div>
            <p class="explanation-body">${verb.explanation}</p>
            <div class="full-breakdown-grid">
                <div><strong>שורש:</strong> ${verb.root}</div>
                <div><strong>בניין:</strong> ${verb.binyan}</div>
                <div><strong>זמן:</strong> ${verb.tense}</div>
                <div><strong>גוף:</strong> ${PERSONS_LIST.find(p => p.id === verb.person)?.name || verb.person}</div>
                <div><strong>שם פועל:</strong> ${verb.infinitive}</div>
                <div><strong>שם פעולה:</strong> ${verb.verbalNoun}</div>
            </div>
            <div class="gzira-golden-tip">
                <span class="tip-icon">💡</span>
                <strong>טיפ זהב לבגרות:</strong> ${gzira.tip}
            </div>
        </div>
    `;
    document.getElementById("explanation-wrapper").style.display = "block";
}

// -----------------------------------------------------------------------------
// מעבר לשאלה הבאה / לסיום שלב אבחון
// -----------------------------------------------------------------------------

function handleNextQuestion() {
    sounds.playClick();
    document.getElementById("explanation-wrapper").style.display = "none";

    if (gameState.mode === "diagnostic") {
        gameState.currentQuestionIndex++;
        if (gameState.currentQuestionIndex < gameState.diagnosticQueue.length) {
            const nextVerb = gameState.diagnosticQueue[gameState.currentQuestionIndex];
            loadQuestion(nextVerb, `שלב אבחון: שאלה ${gameState.currentQuestionIndex + 1} מתוך ${gameState.diagnosticQueue.length}`);
        } else {
            // סיום שלב אבחון -> הצגת מסך משוב ביניים חכם ומעבר לאימון מותאם!
            showDiagnosticSummaryScreen();
        }
    } else if (gameState.mode === "drill") {
        pickNextDrillVerb();
    } else {
        // מצב אדפטיבי שוטף
        pickNextAdaptiveVerb();
    }
}

// -----------------------------------------------------------------------------
// מסך משוב ביניים חכם (Diagnostic Summary)
// -----------------------------------------------------------------------------

function showDiagnosticSummaryScreen() {
    triggerConfetti();
    sounds.playLevelUp();

    const gzarotKeys = Object.keys(GZAROT_INFO);
    const summaryList = [];

    gzarotKeys.forEach(k => {
        const stats = gameState.gziraStats[k];
        const mastery = stats.attempts > 0 ? Math.round((stats.score / stats.attempts) * 100) : 0;
        summaryList.push({
            id: k,
            name: GZAROT_INFO[k].name,
            badge: GZAROT_INFO[k].badge,
            color: GZAROT_INFO[k].color,
            mastery: mastery,
            tip: GZAROT_INFO[k].tip
        });
    });

    // מיון לפי שליטה
    summaryList.sort((a, b) => b.mastery - a.mastery);

    const strengths = summaryList.filter(s => s.mastery >= 75);
    const needPractice = summaryList.filter(s => s.mastery < 75);

    // עדכון כותרת ושם
    document.getElementById("summary-student-name").textContent = gameState.studentName;
    document.getElementById("summary-overall-score").textContent = `${gameState.score} XP`;

    // רינדור חוזקות
    const strengthsContainer = document.getElementById("summary-strengths");
    if (strengths.length > 0) {
        strengthsContainer.innerHTML = strengths.map(s => `
            <div class="summary-item strength">
                <span class="icon">⭐</span>
                <div>
                    <strong>${s.badge} (${s.mastery}%)</strong>
                    <div class="desc">שליטה מצוינת! המשך כך.</div>
                </div>
            </div>
        `).join("");
    } else {
        strengthsContainer.innerHTML = `<p class="empty-note">עדיין בונים את השליטה בכל הגזרות. האימון הממוקד יעזור להעלות את הציונים!</p>`;
    }

    // רינדור נושאים לחיזוק
    const weakContainer = document.getElementById("summary-weaknesses");
    if (needPractice.length > 0) {
        weakContainer.innerHTML = needPractice.map(w => `
            <div class="summary-item weak">
                <span class="icon">🎯</span>
                <div>
                    <strong>${w.badge} (${w.mastery}%)</strong>
                    <div class="desc">${w.tip}</div>
                </div>
            </div>
        `).join("");
    } else {
        weakContainer.innerHTML = `<p class="empty-note">כל הכבוד! הפגנת שליטה מרשימה בכל הגזרות באבחון!</p>`;
    }

    // רינדור פסי התקדמות
    const progressBarsContainer = document.getElementById("summary-progress-bars");
    progressBarsContainer.innerHTML = summaryList.map(item => `
        <div class="gzira-progress-row">
            <div class="row-header">
                <span>${item.name}</span>
                <span>${item.mastery}%</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width: ${item.mastery}%; background-color: ${item.color};"></div>
            </div>
        </div>
    `).join("");

    showScreen("summary-screen");
}

// -----------------------------------------------------------------------------
// עדכון כותרת עליונה וסטטיסטיקות
// -----------------------------------------------------------------------------

function updateHeaderStats() {
    document.getElementById("hud-score").textContent = gameState.score;
    document.getElementById("hud-streak").textContent = gameState.streak;
}

// -----------------------------------------------------------------------------
// מאזיני אירועים וכפתורים
// -----------------------------------------------------------------------------

function setupEventListeners() {
    // כפתור התחלת אבחון ממסך הבית
    document.getElementById("start-diagnostic-btn").addEventListener("click", () => {
        sounds.playClick();
        startDiagnosticMode();
    });

    // כפתור התחלת אימון מותאם אישית ממסך המשוב
    document.getElementById("start-adaptive-from-summary-btn").addEventListener("click", () => {
        sounds.playClick();
        startAdaptiveMode();
    });

    // כפתורי ניווט חזרה למסך הבית
    document.querySelectorAll(".btn-go-home").forEach(btn => {
        btn.addEventListener("click", () => {
            sounds.playClick();
            showScreen("welcome-screen");
        });
    });

    // פתיחת כרטיס אימון ממוקד לפי גזרה
    document.getElementById("open-drill-modal-btn").addEventListener("click", () => {
        sounds.playClick();
        populateDrillModal();
        openModal("drill-modal");
    });

    // פתיחת ספר כללי הבגרות
    document.getElementById("open-rules-modal-btn").addEventListener("click", () => {
        sounds.playClick();
        openModal("rules-modal");
    });

    // סגירת מודאלים
    document.querySelectorAll(".modal-close-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            sounds.playClick();
            const modal = e.target.closest(".modal-backdrop");
            if (modal) modal.classList.remove("open");
        });
    });

    // כפתור בדיקה וכפתור הבא
    document.getElementById("check-btn").addEventListener("click", checkCurrentAnswers);
    document.getElementById("next-btn").addEventListener("click", handleNextQuestion);

    // קיצור מקלדת: לחיצה על Enter בתיבות הקלט
    ["root-input", "infinitive-input", "verbal-noun-input"].forEach(id => {
        const input = document.getElementById(id);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const checkBtn = document.getElementById("check-btn");
                const nextBtn = document.getElementById("next-btn");
                if (checkBtn.style.display !== "none") {
                    checkCurrentAnswers();
                } else if (nextBtn.style.display !== "none") {
                    handleNextQuestion();
                }
            }
        });
    });

    // החלפת מצב קול (Mute/Unmute)
    const soundToggle = document.getElementById("sound-toggle-btn");
    if (soundToggle) {
        soundToggle.addEventListener("click", () => {
            const isEnabled = sounds.toggle();
            soundToggle.textContent = isEnabled ? "🔊" : "🔇";
            soundToggle.title = isEnabled ? "השתק צלילים" : "הפעל צלילים";
        });
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
}

function populateDrillModal() {
    const container = document.getElementById("drill-gzarot-grid");
    container.innerHTML = "";

    Object.keys(GZAROT_INFO).forEach(key => {
        const g = GZAROT_INFO[key];
        const mastery = getGziraMasteryPercent(key);
        const card = document.createElement("button");
        card.type = "button";
        card.className = "drill-gzira-card";
        card.style.borderColor = g.color;
        card.innerHTML = `
            <div class="drill-card-top">
                <span class="badge" style="background: ${g.color}20; color: ${g.color};">${g.name}</span>
                <span class="mastery-badge">${mastery}%</span>
            </div>
            <h4>${g.badge}</h4>
            <p>${g.description}</p>
        `;
        card.addEventListener("click", () => {
            sounds.playClick();
            document.getElementById("drill-modal").classList.remove("open");
            startDrillMode(key);
        });
        container.appendChild(card);
    });
}

// -----------------------------------------------------------------------------
// אפקט קונפטי קל לחגיגות והישגים
// -----------------------------------------------------------------------------

function triggerConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ef4444", "#06b6d4"];

    for (let i = 0; i < 70; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height * 0.5,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 4 + 2,
            speedX: Math.random() * 2 - 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 8 - 4
        });
    }

    let animationFrame;
    const startTime = Date.now();

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();

            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotationSpeed;
        });

        if (Date.now() - startTime < 2500) {
            animationFrame = requestAnimationFrame(render);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            cancelAnimationFrame(animationFrame);
        }
    }

    render();
}

function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
