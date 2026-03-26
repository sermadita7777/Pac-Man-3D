const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives-display');
const powerEl = document.getElementById('power-indicator');

let prevLives = -1;

export function updateHUD(score, level, lives, powerTimer) {
    scoreEl.textContent = score;
    levelEl.textContent = level;

    if (lives !== prevLives) {
        renderLives(lives);
        prevLives = lives;
    }

    if (powerTimer > 0) {
        powerEl.classList.add('active');
        powerEl.textContent = `POWER MODE ${Math.ceil(powerTimer)}s`;
    } else {
        powerEl.classList.remove('active');
    }
}

function renderLives(count) {
    livesEl.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const icon = document.createElement('div');
        icon.className = 'life-icon';
        livesEl.appendChild(icon);
    }
}
