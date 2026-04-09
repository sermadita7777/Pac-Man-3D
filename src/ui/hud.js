const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives-display');
const powerEl = document.getElementById('power-indicator');
const powerLabel = document.getElementById('power-label');
const powerContainer = document.getElementById('power-bar-container');
const powerFill = document.getElementById('power-bar-fill');
const sprintIndicator = document.getElementById('sprint-indicator');
const highScoreEl = document.getElementById('high-score');

let prevLives = -1;
let highScore = parseInt(localStorage.getItem('pacman3d_highscore') || '0', 10);
highScoreEl.textContent = highScore;

export function updateHUD(score, level, lives, powerTimer, isSprinting) {
    scoreEl.textContent = score;
    levelEl.textContent = level;

    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('pacman3d_highscore', highScore);
    }

    if (lives !== prevLives) {
        renderLives(lives);
        prevLives = lives;
    }

    if (isSprinting) {
        sprintIndicator.classList.add('active');
    } else {

        sprintIndicator.classList.remove('active');
    }

    if (powerTimer > 0) {
        // powerEl was the legacy text, but keeping it for safety or removing if we want
        powerEl.classList.remove('active'); 
        
        powerLabel.classList.add('active');
        powerContainer.classList.add('active');
        
        // Assume max power time is 8 seconds based on game.js setting player.powerTimer = 8
        const pct = Math.min((powerTimer / 8) * 100, 100);
        powerFill.style.width = `${pct}%`;
        
        if (powerTimer < 2.5) {
            powerContainer.classList.add('warning');
        } else {
            powerContainer.classList.remove('warning');
        }
    } else {
        powerEl.classList.remove('active');
        powerLabel.classList.remove('active');
        powerContainer.classList.remove('active');
        powerContainer.classList.remove('warning');
    }
}

const comboEl = document.getElementById('combo-display');

export function showCombo(combo, points) {
    if (!comboEl) return;
    comboEl.textContent = `x${combo}  ${points}pts`;
    comboEl.classList.remove('show');
    void comboEl.offsetWidth;
    comboEl.classList.add('show');
    setTimeout(() => comboEl.classList.remove('show'), 1200);
}

export function getHighScore() { return highScore; }

function renderLives(count) {
    livesEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const icon = document.createElement('div');
        icon.className = 'life-icon';
        livesEl.appendChild(icon);
    }
}
