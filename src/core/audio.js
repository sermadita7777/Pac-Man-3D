let audioCtx = null;

function getCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

export function playChomp() {
    playTone(440 + Math.random() * 60, 0.08, 'square', 0.08);
}

export function playPowerUp() {
    const ctx = getCtx();
    [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.15, 'sine', 0.12), i * 60);
    });
}

export function playGhostEat() {
    playTone(200, 0.3, 'sawtooth', 0.1);
    setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.1), 100);
}

export function playDeath() {
    [400, 350, 300, 250, 200, 150].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'triangle', 0.12), i * 120);
    });
}

export function playStart() {
    [262, 330, 392, 523].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 150);
    });
}
