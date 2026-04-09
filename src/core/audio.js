let audioCtx = null;

function getCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function makeReverb(duration = 2.0, decay = 3.5) {
    const ctx = getCtx();
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
}

function playTone(freq, duration, type = 'sine', volume = 0.15, startDelay = 0) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startDelay;
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
}

// ── Basic game sounds ────────────────────────────────────────────────────────

let chompToggle = false;
export function playChomp() {
    // Alternating two-tone crunch — clearly audible, satisfying feedback
    const ctx = getCtx();
    const t = ctx.currentTime;
    chompToggle = !chompToggle;
    const baseFreq = chompToggle ? 220 : 280;

    // Tonal bite
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, t + 0.08);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);

    // Crunch layer
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 600 + Math.random() * 400;
    filt.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    src.connect(filt);
    filt.connect(g);
    g.connect(ctx.destination);
    src.start(t);
}

export function playPowerUp() {
    // Distorted horror power-up - low dissonant tones rising
    const ctx = getCtx();
    [110, 138.6, 164.8, 220].forEach((f, i) => {
        setTimeout(() => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(f * 2, ctx.currentTime + 0.3);
            g.gain.setValueAtTime(0.08, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }, i * 80);
    });
    // Deep sub-bass impact
    playTone(30, 1.5, 'sine', 0.12);
}

export function playGhostEat() {
    // Distorted scream-like sound
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
}

export function playDeath() {
    // Descending horror tones
    [400, 350, 300, 250, 200, 150].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'triangle', 0.1), i * 120);
    });
    // Horror scream descend
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 2.0);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 2.1);
}

export function playFruitEat() {
    [440, 550, 660, 880].forEach((f, i) => {
        setTimeout(() => playTone(f, 0.1, 'sine', 0.08), i * 35);
    });
}

let scoreTickPitch = 0;
export function playScoreTick() {
    // Rising pitch with each consecutive eat — resets after a pause
    const ctx = getCtx();
    const t = ctx.currentTime;
    scoreTickPitch = (scoreTickPitch + 1) % 8;
    const freq = 500 + scoreTickPitch * 80; // 500 → 1060 Hz rising scale

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.10, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
}

// ── JUMPSCARE SOUND ─────────────────────────────────────────────────────────
// FNAF-style: loud dissonant burst + noise + distorted scream

export function playJumpscare() {
    const ctx = getCtx();

    // Noise burst
    const noiseLen = Math.floor(ctx.sampleRate * 0.8);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
        const env = i < noiseLen * 0.05 ? i / (noiseLen * 0.05) : Math.pow(1 - i / noiseLen, 1.5);
        nd[i] = (Math.random() * 2 - 1) * env;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseGainNode = ctx.createGain();
    noiseGainNode.gain.value = 0.25;
    const noiseFilt = ctx.createBiquadFilter();
    noiseFilt.type = 'bandpass';
    noiseFilt.frequency.value = 1500;
    noiseFilt.Q.value = 0.8;
    noiseSrc.connect(noiseFilt);
    noiseFilt.connect(noiseGainNode);
    noiseGainNode.connect(ctx.destination);
    noiseSrc.start();

    // Dissonant chord - multiple clashing frequencies
    const freqs = [180, 190, 380, 760, 770, 1520];
    for (const f of freqs) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.08, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
    }

    // Sub-bass impact
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = 35;
    bg.gain.setValueAtTime(0.3, ctx.currentTime);
    bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    bass.connect(bg);
    bg.connect(ctx.destination);
    bass.start();
    bass.stop(ctx.currentTime + 0.7);
}

// ── Start jingle — horror version ──────────────────────────────────────────

export function playStart() {
    const ctx = getCtx();
    const reverb = makeReverb(2.5, 4);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.45;
    reverb.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    // Classic Pac-Man melody but detuned and minor
    const melody = [
        [494,0.09],[988,0.09],[740,0.09],[622,0.09],
        [988,0.09],[740,0.18],[622,0.27],
        [523,0.09],[1047,0.09],[784,0.09],[659,0.09],
        [1047,0.09],[784,0.18],[659,0.27],
        [494,0.09],[988,0.09],[740,0.09],[622,0.09],
        [988,0.09],[740,0.18],[622,0.09],
        [622,0.09],[659,0.09],[698,0.09],[698,0.09],
        [740,0.09],[784,0.09],[831,0.09],[880,0.09],[988,0.27],
    ];

    let t = 0;
    for (const [freq, dur] of melody) {
        const t0 = ctx.currentTime + t;

        // Main tone — heavily detuned for unease
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq * 0.49; // One octave down, detuned
        g.gain.setValueAtTime(0.06, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur + 0.12);
        osc.connect(g); g.connect(reverb); g.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + dur + 0.15);

        // Dissonant shadow - tritone interval
        const shadow = ctx.createOscillator();
        const sg = ctx.createGain();
        shadow.type = 'sawtooth';
        shadow.frequency.value = freq * 0.354; // tritone below
        sg.gain.setValueAtTime(0.02, t0);
        sg.gain.exponentialRampToValueAtTime(0.001, t0 + dur + 0.15);
        shadow.connect(sg); sg.connect(reverb);
        shadow.start(t0); shadow.stop(t0 + dur + 0.18);

        t += dur + 0.025;
    }

    // Deep menacing drone
    const drone = ctx.createOscillator();
    const dg = ctx.createGain();
    drone.type = 'sine';
    drone.frequency.value = 30;
    dg.gain.setValueAtTime(0, ctx.currentTime);
    dg.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
    dg.gain.linearRampToValueAtTime(0, ctx.currentTime + t + 0.6);
    drone.connect(dg); dg.connect(ctx.destination);
    drone.start(ctx.currentTime); drone.stop(ctx.currentTime + t + 0.7);
}

// ── Footsteps — dark echoing corridor ──────────────────────────────────────

export function playFootstep() {
    const ctx = getCtx();
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.05);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        const env = i < len * 0.06 ? i / (len * 0.06) : Math.pow(1 - (i - len * 0.06) / (len * 0.94), 5);
        data[i] = (Math.random() * 2 - 1) * env;
    }

    function playBuf(when, volume, filterFreq) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass';
        filt.frequency.value = filterFreq;
        filt.Q.value = 1.5;
        const g = ctx.createGain();
        g.gain.value = volume;
        src.connect(filt); filt.connect(g); g.connect(ctx.destination);
        src.start(when);
    }

    const now = ctx.currentTime;
    playBuf(now, 0.12, 400);          // direct step
    playBuf(now + 0.08, 0.05, 250);   // echo
    playBuf(now + 0.18, 0.02, 200);   // distant echo
}

// ── Whisper system ──────────────────────────────────────────────────────────

export function playWhisper() {
    const ctx = getCtx();
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
        const env = Math.sin(Math.PI * i / len);
        // Modulated noise that sounds like whispering
        const mod = Math.sin(i / ctx.sampleRate * Math.PI * 2 * (3 + Math.sin(i / ctx.sampleRate * 2))) * 0.5 + 0.5;
        d[i] = (Math.random() * 2 - 1) * env * mod;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 1800 + Math.random() * 1000;
    filt.Q.value = 3;
    const g = ctx.createGain();
    g.gain.value = 0.04 + Math.random() * 0.03;
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.6;
    src.connect(filt); filt.connect(g); g.connect(pan); pan.connect(ctx.destination);
    src.start();
}

// ── Metal scrape ────────────────────────────────────────────────────────────

export function playMetalScrape() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    const baseFreq = 800 + Math.random() * 600;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + 1.2);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 600;
    filt.Q.value = 5;
    osc.connect(filt); filt.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 1.4);
}

// ── Distant scream ──────────────────────────────────────────────────────────

export function playDistantScream() {
    const ctx = getCtx();
    const reverb = makeReverb(3, 5);
    const rg = ctx.createGain();
    rg.gain.value = 0.3;
    reverb.connect(rg);
    rg.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600 + Math.random() * 400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.connect(g); g.connect(reverb);
    osc.start(); osc.stop(ctx.currentTime + 1.0);
}

// ── Creepy laugh ────────────────────────────────────────────────────────────

export function playCreepyLaugh() {
    const ctx = getCtx();
    const reverb = makeReverb(2, 4);
    const rg = ctx.createGain();
    rg.gain.value = 0.25;
    reverb.connect(rg);
    rg.connect(ctx.destination);

    // Staccato "ha ha ha" - modulated tone
    for (let i = 0; i < 4 + Math.floor(Math.random() * 3); i++) {
        const t0 = ctx.currentTime + i * 0.15;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 250 + Math.random() * 50 + (i % 2) * 80;
        g.gain.setValueAtTime(0.03, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
        osc.connect(g); g.connect(reverb); g.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 0.12);
    }
}

// ── Horror ambient ────────────────────────────────────────────────────────────

let rumbleSource = null, rumbleGain = null;
let breathSource = null, breathGain = null, breathFilter = null;
let presenceVoices = [], presenceGain = null, presencePan = null;
let whisperSource = null, whisperGain = null;
let stingerTimeout = null;
let whisperTimeout = null;
let lastHeartTime = 0;

function makeLoopedNoise() {
    const ctx = getCtx();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
}

function scheduleStinger() {
    const delay = 10000 + Math.random() * 15000; // More frequent: 10-25s
    stingerTimeout = setTimeout(() => {
        if (!rumbleSource) return;
        const ctx = getCtx();
        // Pick a random horror sound
        const roll = Math.random();
        if (roll < 0.25) {
            playMetalScrape();
        } else if (roll < 0.45) {
            playDistantScream();
        } else if (roll < 0.6) {
            playCreepyLaugh();
        } else {
            // Dissonant stinger chord
            const freq = [600, 900, 1300, 1800][Math.floor(Math.random() * 4)];
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.3, ctx.currentTime + 0.5);
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.connect(g); g.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.65);
        }
        scheduleStinger();
    }, delay);
}

function scheduleWhisper() {
    const delay = 8000 + Math.random() * 20000;
    whisperTimeout = setTimeout(() => {
        if (!rumbleSource) return;
        playWhisper();
        scheduleWhisper();
    }, delay);
}

export function initAmbient() {
    const ctx = getCtx();

    // Sub-bass rumble — atmospheric foundation, unchanged
    rumbleSource = makeLoopedNoise();
    const rumbleLow = ctx.createBiquadFilter();
    rumbleLow.type = 'lowpass';
    rumbleLow.frequency.value = 70;
    rumbleLow.Q.value = 0.7;
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.15;
    rumbleSource.connect(rumbleLow); rumbleLow.connect(rumbleGain); rumbleGain.connect(ctx.destination);
    rumbleSource.start();

    // Spectral breath — bandpass noise at air/breath frequencies (~1100 Hz).
    // Sweeping the filter in updateAmbient creates the inhale/exhale motion.
    breathSource = makeLoopedNoise();
    breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'bandpass';
    breathFilter.frequency.value = 1100;
    breathFilter.Q.value = 4.5;
    breathGain = ctx.createGain();
    breathGain.gain.value = 0;
    breathSource.connect(breathFilter); breathFilter.connect(breathGain); breathGain.connect(ctx.destination);
    breathSource.start();

    // Presence choir — three pairs of sine waves slightly detuned from each other.
    // The tiny frequency differences (~0.7 Hz) create slow interference "beating"
    // that sounds inhuman rather than mechanical.
    presencePan = ctx.createStereoPanner();
    presencePan.pan.value = 0;
    presencePan.connect(ctx.destination);
    presenceGain = ctx.createGain();
    presenceGain.gain.value = 0;
    presenceGain.connect(presencePan);

    const choirFrequencies = [55, 55.7, 82.5, 83.25, 110, 110.9];
    presenceVoices = choirFrequencies.map(f => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(presenceGain);
        osc.start();
        return osc;
    });

    // Whisper layer — narrow high-frequency bandpass noise that emerges only
    // when a ghost is very close, like something breathing right next to you.
    whisperSource = makeLoopedNoise();
    const whisperFilt = ctx.createBiquadFilter();
    whisperFilt.type = 'bandpass';
    whisperFilt.frequency.value = 3200;
    whisperFilt.Q.value = 9;
    whisperGain = ctx.createGain();
    whisperGain.gain.value = 0;
    whisperSource.connect(whisperFilt); whisperFilt.connect(whisperGain); whisperGain.connect(ctx.destination);
    whisperSource.start();

    scheduleStinger();
    scheduleWhisper();
}

function playHeartbeat(intensity) {
    const ctx = getCtx();
    const vol = 0.08 + intensity * 0.15;
    function thump(delay, freq, v) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.2, ctx.currentTime + delay + 0.2);
        g.gain.setValueAtTime(v, ctx.currentTime + delay);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.22);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.24);
    }
    thump(0,    65, vol);          // LUB
    thump(0.12, 45, vol * 0.6);   // dub
}

export function updateAmbient(playerX, playerZ, ghosts) {
    if (!breathGain || !presenceGain) return;
    const ctx = getCtx();

    let minDist = Infinity;
    let nearestGhost = null;
    for (const g of ghosts) {
        if (g.state === 3 || g.state === 4) continue;
        const dx = playerX - g.x, dz = playerZ - g.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) { minDist = d; nearestGhost = g; }
    }

    const tension = Math.max(0, 1 - minDist / 14);
    const t = ctx.currentTime + 0.15;

    // Pan the presence toward the nearest ghost for spatial awareness
    if (nearestGhost && presencePan) {
        const pan = Math.max(-0.8, Math.min(0.8, (nearestGhost.x - playerX) / 6));
        presencePan.pan.linearRampToValueAtTime(pan, t);
    }

    // Layer 1: sub-bass rumble swell
    rumbleGain.gain.linearRampToValueAtTime(0.15 + tension * 0.12, t);

    // Layer 2: spectral breath — slow filter sweep simulates inhale/exhale
    // ~1.1 rad/s → one breath cycle every ~5.7 s, eerie and slow
    const breathCycle = (Math.sin(Date.now() * 0.00055 * Math.PI * 2) + 1) * 0.5;
    const breathTarget = Math.max(0, tension - 0.12) * 0.13 * (0.4 + breathCycle * 0.6);
    breathGain.gain.linearRampToValueAtTime(breathTarget, t + 0.06);
    breathFilter.frequency.linearRampToValueAtTime(750 + breathCycle * 700, t + 0.12);

    // Layer 3: presence choir drone — fades in as ghost enters range
    presenceGain.gain.linearRampToValueAtTime(Math.max(0, tension - 0.25) * 0.065, t);
    // Widen the beating interval slightly as tension rises — more dissonant
    if (presenceVoices.length >= 2) {
        presenceVoices[0].frequency.linearRampToValueAtTime(55 - tension * 1.5, t);
        presenceVoices[1].frequency.linearRampToValueAtTime(55.7 + tension * 2, t);
    }

    // Layer 4: close-whisper — only audible when the ghost is nearly on top of you
    if (whisperGain) {
        whisperGain.gain.linearRampToValueAtTime(Math.max(0, tension - 0.65) * 0.07, t);
    }

    // Layer 5: heartbeat — accelerates with tension
    if (tension > 0.5) {
        const bps = 0.8 + (tension - 0.5) * 4.0;
        if (ctx.currentTime - lastHeartTime > 1 / bps) {
            playHeartbeat(tension);
            lastHeartTime = ctx.currentTime;
        }
    }
}

export function stopAmbient() {
    try { if (rumbleSource)  { rumbleSource.stop();  rumbleSource  = null; } } catch (_) {}
    try { if (breathSource)  { breathSource.stop();  breathSource  = null; } } catch (_) {}
    try { if (whisperSource) { whisperSource.stop(); whisperSource = null; } } catch (_) {}
    for (const osc of presenceVoices) { try { osc.stop(); } catch (_) {} }
    presenceVoices = [];
    rumbleGain = breathGain = breathFilter = presenceGain = presencePan = whisperGain = null;
    lastHeartTime = 0;
    if (stingerTimeout) { clearTimeout(stingerTimeout); stingerTimeout = null; }
    if (whisperTimeout) { clearTimeout(whisperTimeout); whisperTimeout = null; }
}

// ── Flashlight flicker sound ────────────────────────────────────────────────

export function playFlickerSound() {
    const ctx = getCtx();
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.04;
    src.connect(g); g.connect(ctx.destination);
    src.start();
}
