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
    const melody = [
        [494, 0.09], [988, 0.09], [740, 0.09], [622, 0.09],
        [988, 0.09], [740, 0.18],  [622, 0.27],
        [523, 0.09], [1047, 0.09], [784, 0.09], [659, 0.09],
        [1047, 0.09], [784, 0.18], [659, 0.27],
        [494, 0.09], [988, 0.09], [740, 0.09], [622, 0.09],
        [988, 0.09], [740, 0.18],  [622, 0.09],
        [622, 0.09], [659, 0.09], [698, 0.09], [698, 0.09],
        [740, 0.09], [784, 0.09], [831, 0.09], [880, 0.09], [988, 0.27],
    ];
    let t = 0;
    for (const [freq, dur] of melody) {
        const delay = t;
        setTimeout(() => playTone(freq, dur + 0.04, 'square', 0.07), delay * 1000);
        t += dur + 0.02;
    }
}

let sirenOsc = null;
let sirenGain = null;
let sirenLfo = null;

export function startSiren() {
    const ctx = getCtx();
    sirenOsc = ctx.createOscillator();
    sirenGain = ctx.createGain();
    sirenLfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    sirenOsc.type = 'sine';
    sirenOsc.frequency.value = 340;
    sirenGain.gain.value = 0.04;

    sirenLfo.type = 'sine';
    sirenLfo.frequency.value = 0.35;
    lfoGain.gain.value = 120;

    sirenLfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);
    sirenOsc.connect(sirenGain);
    sirenGain.connect(ctx.destination);

    sirenOsc.start();
    sirenLfo.start();
}

export function stopSiren() {
    try {
        if (sirenOsc) { sirenOsc.stop(); sirenOsc = null; }
        if (sirenLfo) { sirenLfo.stop(); sirenLfo = null; }
    } catch (_) {}
    sirenGain = null;
}

export function updateSiren(level, isFrightened) {
    if (!sirenOsc || !sirenGain) return;
    const ctx = getCtx();
    const t = ctx.currentTime + 0.1;
    if (isFrightened) {
        sirenOsc.frequency.linearRampToValueAtTime(200, t);
        sirenGain.gain.linearRampToValueAtTime(0.05, t);
    } else {
        const baseFreq = 300 + level * 20;
        sirenOsc.frequency.linearRampToValueAtTime(baseFreq, t);
        sirenGain.gain.linearRampToValueAtTime(0.035, t);
    }
}

export function playFruitEat() {
    [880, 1100, 1320, 1760].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.1, 'sine', 0.1), i * 35);
    });
}

export function playFootstep() {
    const ctx = getCtx();
    const len = Math.floor(ctx.sampleRate * 0.035);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const gain = ctx.createGain();
    gain.gain.value = 0.04;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
}

let droneOsc = null;
let droneGain = null;
let tensionOsc = null;
let tensionGain = null;

export function initAmbient() {
    const ctx = getCtx();

    droneOsc = ctx.createOscillator();
    droneGain = ctx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55;
    droneGain.gain.value = 0.03;
    droneOsc.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneOsc.start();

    tensionOsc = ctx.createOscillator();
    tensionGain = ctx.createGain();
    tensionOsc.type = 'sawtooth';
    tensionOsc.frequency.value = 110;
    tensionGain.gain.value = 0;
    tensionOsc.connect(tensionGain);
    tensionGain.connect(ctx.destination);
    tensionOsc.start();
}

export function updateAmbient(playerX, playerZ, ghosts) {
    if (!tensionGain) return;
    const ctx = getCtx();

    let minDist = Infinity;
    for (const g of ghosts) {
        if (g.state === 3 || g.state === 4) continue;
        const dx = playerX - g.x;
        const dz = playerZ - g.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) minDist = d;
    }

    const tension = Math.max(0, 1 - minDist / 10);
    const t = ctx.currentTime + 0.1;
    tensionGain.gain.linearRampToValueAtTime(tension * 0.06, t);
    tensionOsc.frequency.linearRampToValueAtTime(110 + tension * 220, t);
    droneGain.gain.linearRampToValueAtTime(0.03 + tension * 0.02, t);
}

export function stopAmbient() {
    try {
        if (droneOsc) { droneOsc.stop(); droneOsc = null; }
        if (tensionOsc) { tensionOsc.stop(); tensionOsc = null; }
    } catch (_) {}
    droneGain = null;
    tensionGain = null;
}
