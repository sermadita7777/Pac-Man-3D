const overlay = document.getElementById('screen-overlay');
const title = document.getElementById('screen-title');
const text = document.getElementById('screen-text');
const controls = document.getElementById('screen-controls');

export function showStartScreen() {
    title.textContent = 'PAC-MAN 3D';
    text.textContent = 'Press ENTER to start';
    controls.style.display = 'block';
    overlay.classList.remove('hidden');
}

export function showGameOver(score) {
    title.textContent = 'GAME OVER';
    text.textContent = `Final Score: ${score} — Press ENTER to restart`;
    controls.style.display = 'none';
    overlay.classList.remove('hidden');
}

export function showLevelComplete(level) {
    title.textContent = `LEVEL ${level} COMPLETE`;
    text.textContent = 'Get ready...';
    controls.style.display = 'none';
    overlay.classList.remove('hidden');
}

export function showReady() {
    title.textContent = 'READY!';
    text.textContent = '';
    controls.style.display = 'none';
    overlay.classList.remove('hidden');
}

export function hideOverlay() {
    overlay.classList.add('hidden');
}
