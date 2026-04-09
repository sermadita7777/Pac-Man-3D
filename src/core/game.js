import { createRenderer, createScene, createCamera, updateFPSCamera, getYaw, resetFPSCamera, setupPostProcessing, renderScene, setCameraShake } from './renderer.js';
import { initInput, consumeMouse, isKeyDown, isEnterPressed, clearKey, isPointerLocked } from './input.js';
import { playChomp, playPowerUp, playGhostEat, playDeath, playStart, playFruitEat, playFootstep, initAmbient, updateAmbient, stopAmbient, playJumpscare, playFlickerSound, playScoreTick } from './audio.js';
import { buildMaze } from '../entities/maze.js';
import { createPlayer, updatePlayer, resetPlayer, resolveDirectionFromInput, updateFlashlightDirection } from '../entities/player.js';
import { createGhosts, updateGhosts, frightenGhosts, resetGhosts } from '../entities/ghost.js';
import { createPellets, updatePellets, resetPellets, countRemaining } from '../entities/pellet.js';
import { createFruit, updateFruit, resetFruit, notifyPelletEaten, checkFruitCollision } from '../entities/fruit.js';
import { checkPelletCollisions, checkGhostCollisions } from '../systems/collision.js';
import { createParticleSystem, updateParticles, spawnParticles } from '../systems/particles.js';
import { updateHUD, showCombo, getHighScore } from '../ui/hud.js';
import { showStartScreen, showGameOver, showLevelComplete, showReady, hideOverlay } from '../ui/screens.js';
import { createMinimap, updateMinimap } from '../ui/minimap.js';

const PHASE = { MENU: 0, READY: 1, PLAYING: 2, DYING: 3, LEVEL_COMPLETE: 4, GAME_OVER: 5 };
const DOT_SCORE = 10;
const POWER_SCORE = 50;
const GHOST_BASE_SCORE = 200;
const STARTING_LIVES = 3;

const canvas = document.getElementById('game-canvas');
const renderer = createRenderer(canvas);
const scene = createScene();
const camera = createCamera();

initInput(canvas);
buildMaze(scene);
createMinimap();
createParticleSystem(scene);

const player = createPlayer(scene);
const ghosts = createGhosts(scene);
const pellets = createPellets(scene);
const fruit = createFruit(scene);

setupPostProcessing(renderer, scene, camera);

const deathFlash = document.getElementById('death-flash');
const fruitScoreEl = document.getElementById('fruit-score');
const lockPrompt = document.getElementById('lock-prompt');
const pauseOverlay = document.getElementById('pause-overlay');
const countdownEl = document.getElementById('countdown');
const jumpscareOverlay = document.getElementById('jumpscare-overlay');
const staticNoise = document.getElementById('static-noise');
const gameCanvas = document.getElementById('game-canvas');

let state = {
    phase: PHASE.MENU,
    score: 0,
    lives: STARTING_LIVES,
    level: 1,
    ghostCombo: 0,
    phaseTimer: 0,
    stepTimer: 0,
    ambientStarted: false,
};

let isPaused = false;
let flickerTimer = 0;
let nextFlickerTime = 8 + Math.random() * 15;

window.__gameLoaded = true;
showStartScreen();
updateHUD(state.score, state.level, state.lives, player.powerTimer, false);
resetFPSCamera(player);

let lastTime = 0;

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const mouse = consumeMouse();

    // Pause toggle
    if (isKeyDown('Escape') && state.phase === PHASE.PLAYING) {
        clearKey('Escape');
        isPaused = !isPaused;
        pauseOverlay.classList.toggle('active', isPaused);
        if (!isPaused) canvas.requestPointerLock();
        else document.exitPointerLock();
    }

    if (isPaused) { renderScene(renderer, scene, camera); return; }

    if (lockPrompt) lockPrompt.classList.toggle('hidden', isPointerLocked() || state.phase !== PHASE.PLAYING);

    switch (state.phase) {
        case PHASE.MENU:         handleMenu(); break;
        case PHASE.READY:        handleReady(dt); break;
        case PHASE.PLAYING:      handlePlaying(dt); break;
        case PHASE.DYING:        handleDying(dt); break;
        case PHASE.LEVEL_COMPLETE: handleLevelComplete(dt); break;
        case PHASE.GAME_OVER:    handleGameOver(); break;
    }

    updateFPSCamera(camera, player, dt, mouse);
    updateFlashlightDirection(player, getYaw(), dt);
    renderScene(renderer, scene, camera);
}

function handleMenu() {
    if (isEnterPressed()) {
        clearKey('Enter');
        try { playStart(); } catch (_) {}
        startGame();
    }
}

function handleReady(dt) {
    state.phaseTimer -= dt;

    // Animated countdown: phaseTimer 4→0 shows 3,2,1,GO!
    const currentCount = Math.min(Math.ceil(state.phaseTimer), 4);
    const text = currentCount === 1 ? 'GO!' : (currentCount - 1).toString();

    if (state.phaseTimer <= 0) {
        countdownEl.classList.remove('pop');
        countdownEl.textContent = '';
        state.phase = PHASE.PLAYING;
        hideOverlay();
        if (!state.ambientStarted) {
            initAmbient();
            state.ambientStarted = true;
        }
    } else if (countdownEl.textContent !== text) {
        countdownEl.textContent = text;
        countdownEl.classList.remove('pop');
        void countdownEl.offsetWidth;
        countdownEl.classList.add('pop');
    }
}

function handlePlaying(dt) {
    const w = isKeyDown('KeyW') || isKeyDown('ArrowUp');
    const a = isKeyDown('KeyA') || isKeyDown('ArrowLeft');
    const s = isKeyDown('KeyS') || isKeyDown('ArrowDown');
    const d = isKeyDown('KeyD') || isKeyDown('ArrowRight');
    const sprinting = isKeyDown('ShiftLeft') || isKeyDown('ShiftRight');

    const inputDir = resolveDirectionFromInput(w, a, s, d, getYaw());

    updatePlayer(player, dt, sprinting, inputDir);
    updateGhosts(ghosts, player, dt, state.level);
    updatePellets(pellets, dt);
    updateFruit(fruit, dt);
    updateParticles(dt);
    updateAmbient(player.x, player.z, ghosts);

    // Ghost proximity factor for flashlight disturbance (chase/scatter only)
    let minGhostDist = Infinity;
    for (const ghost of ghosts) {
        if (ghost.state <= 1) { // CHASE or SCATTER
            const dx = ghost.x - player.x;
            const dz = ghost.z - player.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < minGhostDist) minGhostDist = d;
        }
    }
    player.nearGhostFactor = Math.min(1, Math.max(0, (5 - minGhostDist) / 3));

    // Footsteps
    if (player.moving && player.direction) {
        state.stepTimer -= dt;
        if (state.stepTimer <= 0) {
            playFootstep();
            state.stepTimer = sprinting ? 0.22 : 0.32;
        }
    } else {
        state.stepTimer = 0;
    }

    // Pellets
    const eaten = checkPelletCollisions(player, pellets);
    if (eaten.dots > 0) {
        state.score += DOT_SCORE * eaten.dots;
        playChomp();
        playScoreTick();
        spawnParticles(player.x, 0.3, player.z, 0x886644, 4, 1.5, 0.4);
        for (let i = 0; i < eaten.dots; i++) notifyPelletEaten(fruit, state.level);
    }
    if (eaten.powers > 0) {
        state.score += POWER_SCORE * eaten.powers;
        player.powerTimer = 8;
        player.powerFlashTimer = 0.25;
        state.ghostCombo = 0;
        frightenGhosts(ghosts, state.level);
        playPowerUp();
        playScoreTick();
        spawnParticles(player.x, 0.4, player.z, 0x880000, 12, 3, 0.8);
    }

    // Fruit
    const fruitScore = checkFruitCollision(player, fruit);
    if (fruitScore > 0) {
        state.score += fruitScore;
        playFruitEat();
        playScoreTick();
        spawnParticles(fruit.x, 0.4, fruit.z, 0xff8800, 20, 3.5, 1.0);
        showFruitScore(fruitScore);
    }

    // Ghosts
    const ghostResult = checkGhostCollisions(player, ghosts);
    if (ghostResult.ghostsEaten > 0) {
        for (let i = 0; i < ghostResult.ghostsEaten; i++) {
            state.ghostCombo++;
            const pts = GHOST_BASE_SCORE * Math.pow(2, state.ghostCombo - 1);
            state.score += pts;
            playScoreTick();
            showCombo(state.ghostCombo, pts);
        }
        playGhostEat();
        spawnParticles(player.x, 0.4, player.z, 0xaa0000, 16, 4, 0.7);
    }

    if (ghostResult.died) {
        state.phase = PHASE.DYING;
        state.phaseTimer = 2.0;
        player.alive = false;
        playDeath();
        triggerJumpscare();
        setCameraShake(1.5);
        triggerDeathFlash();
        spawnParticles(player.x, 0.5, player.z, 0xff0000, 40, 6, 1.5);
    }

    if (countRemaining(pellets) === 0) {
        state.phase = PHASE.LEVEL_COMPLETE;
        state.phaseTimer = 2;
        showLevelComplete(state.level);
    }

    // Random flashlight flicker
    flickerTimer += dt;
    if (flickerTimer >= nextFlickerTime) {
        flickerTimer = 0;
        nextFlickerTime = 8 + Math.random() * 20;
        triggerFlicker();
    }

    updateHUD(state.score, state.level, state.lives, player.powerTimer, sprinting && player.moving);
    updateMinimap(player, ghosts, pellets, getYaw());
}

function handleDying(dt) {
    state.phaseTimer -= dt;
    updateParticles(dt);

    if (state.phaseTimer <= 0) {
        state.lives--;
        if (state.lives <= 0) {
            state.phase = PHASE.GAME_OVER;
            stopAmbient();
            state.ambientStarted = false;
            showGameOver(state.score, state.score >= getHighScore() && state.score > 0);
        } else {
            resetPlayer(player);
            resetGhosts(ghosts);
            resetFPSCamera(player);
            state.phase = PHASE.READY;
            state.phaseTimer = 4;
            showReady();
        }
        updateHUD(state.score, state.level, state.lives, player.powerTimer, false);
    }
}

function handleLevelComplete(dt) {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
        state.level++;
        resetPlayer(player);
        resetGhosts(ghosts);
        resetPellets(pellets, scene);
        resetFruit(fruit);
        resetFPSCamera(player);
        state.phase = PHASE.READY;
        state.phaseTimer = 4;
        showReady();
        updateHUD(state.score, state.level, state.lives, player.powerTimer, false);
    }
}

function handleGameOver() {
    if (isEnterPressed()) {
        clearKey('Enter');
        startGame();
    }
}

function startGame() {
    state.score = 0;
    state.lives = STARTING_LIVES;
    state.level = 1;
    state.ghostCombo = 0;
    state.stepTimer = 0;
    isPaused = false;
    pauseOverlay.classList.remove('active');
    stopAmbient();
    state.ambientStarted = false;
    resetPlayer(player);
    resetGhosts(ghosts);
    resetPellets(pellets, scene);
    resetFruit(fruit);
    resetFPSCamera(player);
    state.phase = PHASE.READY;
    state.phaseTimer = 4;
    showReady();
    updateHUD(state.score, state.level, state.lives, player.powerTimer, false);
}

function triggerDeathFlash() {
    deathFlash.classList.remove('active');
    void deathFlash.offsetWidth;
    deathFlash.classList.add('active');
    setTimeout(() => deathFlash.classList.remove('active'), 1500);
}

function triggerJumpscare() {
    playJumpscare();
    // Full-screen jumpscare overlay
    jumpscareOverlay.classList.remove('active');
    void jumpscareOverlay.offsetWidth;
    jumpscareOverlay.classList.add('active');
    setTimeout(() => jumpscareOverlay.classList.remove('active'), 1800);
    // Static noise burst
    staticNoise.classList.add('flash');
    setTimeout(() => staticNoise.classList.remove('flash'), 600);
}

function triggerFlicker() {
    playFlickerSound();
    // Multi-burst flicker via flickerScale — updateLights multiplies by it each frame
    player.flickerScale = 0;
    gameCanvas.classList.add('flicker');
    staticNoise.classList.add('flash');

    setTimeout(() => { player.flickerScale = 1.0; },  60);
    setTimeout(() => { player.flickerScale = 0;   }, 100);
    setTimeout(() => { player.flickerScale = 0.4; }, 145);
    setTimeout(() => { player.flickerScale = 0;   }, 185);
    setTimeout(() => { player.flickerScale = 1.0; }, 235);
    setTimeout(() => { player.flickerScale = 0;   }, 285);
    setTimeout(() => { player.flickerScale = 0.7; }, 315);
    setTimeout(() => {
        player.flickerScale = 1.0;
        gameCanvas.classList.remove('flicker');
        staticNoise.classList.remove('flash');
    }, 420);
}

function showFruitScore(score) {
    if (!fruitScoreEl) return;
    fruitScoreEl.textContent = score;
    fruitScoreEl.classList.remove('show');
    void fruitScoreEl.offsetWidth;
    fruitScoreEl.classList.add('show');
    setTimeout(() => fruitScoreEl.classList.remove('show'), 1500);
}

requestAnimationFrame(gameLoop);
