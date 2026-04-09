const overlay = document.getElementById('screen-overlay');
const title = document.getElementById('screen-title');
const text = document.getElementById('screen-text');
const controls = document.getElementById('screen-controls');

const DEATH_MESSAGES = [
    'They found you...',
    'You cannot hide.',
    'The darkness consumes.',
    'No escape.',
    'They are always watching.',
];

export function showStartScreen() {
    title.textContent = "DON'T LOOK BACK";
    text.textContent = 'Press ENTER... if you dare';
    controls.innerHTML = `
        <p>Mouse - Look around</p>
        <p>W / A / S / D - Move</p>
        <p>SHIFT - Run</p>
        <p>ESC - Pause</p>
        <p style="color:#660000;margin-top:12px">They are waiting for you.</p>
    `;
    controls.style.display = 'block';
    overlay.classList.remove('hidden');
}

export function showGameOver(score, isNewHighScore = false) {
    title.textContent = 'YOU DIED';
    if (isNewHighScore) {
        text.innerHTML = `<span style="color: #cc0000; text-shadow: 0 0 10px #aa0000;">SCORE: ${score}</span><br><br><span style="font-size:10px;color:#664444">Press ENTER to try again</span>`;
    } else {
        text.innerHTML = `Final Score: ${score}<br><br><span style="font-size:10px;color:#664444">Press ENTER to try again</span>`;
    }
    controls.style.display = 'none';
    overlay.classList.remove('hidden');
}

export function showLevelComplete(level) {
    title.textContent = `FLOOR ${level} CLEARED`;
    text.textContent = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
    controls.style.display = 'none';
    overlay.classList.remove('hidden');
}

export function showReady() {
    title.textContent = 'RUN.';
    text.textContent = '';
    controls.style.display = 'none';
    overlay.classList.remove('hidden');
}

export function hideOverlay() {
    overlay.classList.add('hidden');
}
