import { createRenderer, createScene, createCamera, updateFPSCamera, getYaw, resetFPSCamera, setupPostProcessing, renderScene, setCameraShake } from './renderer.js';
import { initInput, consumeMouse, isKeyDown, isEnterPressed, clearKey, isPointerLocked } from './input.js';
import { playChomp, playPowerUp, playGhostEat, playDeath, playStart, playFruitEat, playFootstep, initAmbient, updateAmbient, stopAmbient, startSiren, stopSiren, updateSiren } from './audio.js';
import { buildMaze } from '../entities/maze.js';
import { createPlayer, updatePlayer, resetPlayer, resolveDirectionFromInput, updateFlashlightDirection } from '../entities/player.js';
import { createGhosts, updateGhosts, frightenGhosts, resetGhosts } from '../entities/ghost.js';
import { createPellets, updatePellets, resetPellets, countRemaining } from '../entities/pellet.js';
import { createFruit, updateFruit, resetFruit, notifyPelletEaten, checkFruitCollision } from '../entities/fruit.js';
import { checkPelletCollisions, checkGhostCollisions } from '../systems/collision.js';
import { createParticleSystem, updateParticles, spawnParticles } from '../systems/particles.js';
import { updateHUD } from '../ui/hud.js';
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

const lockPrompt = document.getElementById('lock-prompt');

showStartScreen();
updateHUD(state.score, state.level, state.lives, player.powerTimer);
resetFPSCamera(player);

let lastTime = 0;

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    const mouse = consumeMouse();

    if (lockPrompt) {
        lockPrompt.classList.toggle('hidden', isPointerLocked() || state.phase !== PHASE.PLAYING);
    }

    switch (state.phase) {
        case PHASE.MENU:
            handleMenu();
            break;
        case PHASE.READY:
            handleReady(dt);
            break;
        case PHASE.PLAYING:
            handlePlaying(dt);
            break;
        case PHASE.DYING:
            handleDying(dt);
            break;
        case PHASE.LEVEL_COMPLETE:
            handleLevelComplete(dt);
            break;
        case PHASE.GAME_OVER:
            handleGameOver();
            break;
    }

    updateFPSCamera(camera, player, dt, mouse);
    updateFlashlightDirection(player, getYaw());
    renderScene(renderer, scene, camera);
}

function handleMenu() {
    if (isEnterPressed()) {
        clearKey('Enter');
        playStart();
        startGame();
    }
}

function handleReady(dt) {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
        state.phase = PHASE.PLAYING;
        hideOverlay();
        if (!state.ambientStarted) {
            initAmbient();
            startSiren();
            state.ambientStarted = true;
        }
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
    const anyFrightened = ghosts.some(g => g.state === 2);
    updateSiren(state.level, anyFrightened);

    const isMoving = player.moving && player.direction;
    if (isMoving) {
        state.stepTimer -= dt;
        if (state.stepTimer <= 0) {
            playFootstep();
            state.stepTimer = sprinting ? 0.22 : 0.32;
        }
    } else {
        state.stepTimer = 0;
    }

    const eaten = checkPelletCollisions(player, pellets);
    if (eaten.dots > 0) {
        state.score += DOT_SCORE * eaten.dots;
        playChomp();
        spawnParticles(player.x, 0.3, player.z, 0xffff44, 4, 1.5, 0.4);
        for (let i = 0; i < eaten.dots; i++) notifyPelletEaten(fruit, state.level);
    }
    if (eaten.powers > 0) {
        state.score += POWER_SCORE * eaten.powers;
        player.powerTimer = 8;
        state.ghostCombo = 0;
        frightenGhosts(ghosts, state.level);
        playPowerUp();
        spawnParticles(player.x, 0.4, player.z, 0x4444ff, 12, 3, 0.8);
    }

    const fruitScore = checkFruitCollision(player, fruit);
    if (fruitScore > 0) {
        state.score += fruitScore;
        playFruitEat();
        spawnParticles(fruit.x, 0.4, fruit.z, 0xff8800, 20, 3.5, 1.0);
        showFruitScore(fruitScore);
    }

    const ghostResult = checkGhostCollisions(player, ghosts);
    if (ghostResult.ghostsEaten > 0) {
        for (let i = 0; i < ghostResult.ghostsEaten; i++) {
            state.ghostCombo++;
            state.score += GHOST_BASE_SCORE * Math.pow(2, state.ghostCombo - 1);
        }
        playGhostEat();
        spawnParticles(player.x, 0.4, player.z, 0x2222ff, 16, 4, 0.7);
    }

    if (ghostResult.died) {
        state.phase = PHASE.DYING;
        state.phaseTimer = 1.5;
        player.alive = false;
        playDeath();
        setCameraShake(1.0);
        triggerDeathFlash();
        spawnParticles(player.x, 0.5, player.z, 0xff0000, 30, 5, 1.2);
    }

    if (countRemaining(pellets) === 0) {
        state.phase = PHASE.LEVEL_COMPLETE;
        state.phaseTimer = 2;
        showLevelComplete(state.level);
    }

    updateHUD(state.score, state.level, state.lives, player.powerTimer);
    updateMinimap(player, ghosts, pellets);
}

function handleDying(dt) {
    state.phaseTimer -= dt;
    updateParticles(dt);

    if (state.phaseTimer <= 0) {
        state.lives--;
        if (state.lives <= 0) {
            state.phase = PHASE.GAME_OVER;
            stopAmbient();
            stopSiren();
            state.ambientStarted = false;
            showGameOver(state.score);
        } else {
            resetPlayer(player);
            resetGhosts(ghosts);
            resetFPSCamera(player);
            state.phase = PHASE.READY;
            state.phaseTimer = 2;
            showReady();
        }
        updateHUD(state.score, state.level, state.lives, player.powerTimer);
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
        state.phaseTimer = 2;
        showReady();
        updateHUD(state.score, state.level, state.lives, player.powerTimer);
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
    stopAmbient();
    stopSiren();
    state.ambientStarted = false;
    resetPlayer(player);
    resetGhosts(ghosts);
    resetPellets(pellets, scene);
    resetFruit(fruit);
    resetFPSCamera(player);
    state.phase = PHASE.READY;
    state.phaseTimer = 2;
    showReady();
    updateHUD(state.score, state.level, state.lives, player.powerTimer);
}

function triggerDeathFlash() {
    deathFlash.classList.remove('active');
    void deathFlash.offsetWidth;
    deathFlash.classList.add('active');
    setTimeout(() => deathFlash.classList.remove('active'), 1500);
}

function showFruitScore(score) {
    fruitScoreEl.textContent = score;
    fruitScoreEl.classList.remove('show');
    void fruitScoreEl.offsetWidth;
    fruitScoreEl.classList.add('show');
    setTimeout(() => fruitScoreEl.classList.remove('show'), 1500);
}

requestAnimationFrame(gameLoop);
