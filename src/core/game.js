import { createRenderer, createScene, createCamera, updateFPSCamera, getYaw, resetFPSCamera } from './renderer.js';
import { initInput, consumeMouse, isKeyDown, isEnterPressed, clearKey, isPointerLocked } from './input.js';
import { playChomp, playPowerUp, playGhostEat, playDeath, playStart } from './audio.js';
import { buildMaze } from '../entities/maze.js';
import { createPlayer, updatePlayer, resetPlayer, resolveDirectionFromInput, updateFlashlightDirection } from '../entities/player.js';
import { createGhosts, updateGhosts, frightenGhosts, resetGhosts } from '../entities/ghost.js';
import { createPellets, updatePellets, resetPellets, countRemaining } from '../entities/pellet.js';
import { checkPelletCollisions, checkGhostCollisions } from '../systems/collision.js';
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

const player = createPlayer(scene);
const ghosts = createGhosts(scene);
const pellets = createPellets(scene);

let state = {
    phase: PHASE.MENU,
    score: 0,
    lives: STARTING_LIVES,
    level: 1,
    ghostCombo: 0,
    phaseTimer: 0,
    deathShake: 0,
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
    renderer.render(scene, camera);
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

    const eaten = checkPelletCollisions(player, pellets);
    if (eaten.dots > 0) {
        state.score += DOT_SCORE * eaten.dots;
        playChomp();
    }
    if (eaten.powers > 0) {
        state.score += POWER_SCORE * eaten.powers;
        player.powerTimer = 8;
        state.ghostCombo = 0;
        frightenGhosts(ghosts);
        playPowerUp();
    }

    const ghostResult = checkGhostCollisions(player, ghosts);
    if (ghostResult.ghostsEaten > 0) {
        for (let i = 0; i < ghostResult.ghostsEaten; i++) {
            state.ghostCombo++;
            state.score += GHOST_BASE_SCORE * Math.pow(2, state.ghostCombo - 1);
        }
        playGhostEat();
    }

    if (ghostResult.died) {
        state.phase = PHASE.DYING;
        state.phaseTimer = 1.5;
        state.deathShake = 1;
        player.alive = false;
        playDeath();
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
    state.deathShake *= 0.95;

    if (state.phaseTimer <= 0) {
        state.lives--;
        if (state.lives <= 0) {
            state.phase = PHASE.GAME_OVER;
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
    resetPlayer(player);
    resetGhosts(ghosts);
    resetPellets(pellets, scene);
    resetFPSCamera(player);
    state.phase = PHASE.READY;
    state.phaseTimer = 2;
    showReady();
    updateHUD(state.score, state.level, state.lives, player.powerTimer);
}

requestAnimationFrame(gameLoop);
