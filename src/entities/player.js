import * as THREE from 'three';
import { PLAYER_START, isWalkable, COLS } from '../data/mazeData.js';

const SPEED = 4.5;
const SPRINT_MULT = 1.4;

const DIR_VECTORS = {
    up:    { x: 0, z: -1 },
    down:  { x: 0, z: 1 },
    left:  { x: -1, z: 0 },
    right: { x: 1, z: 0 },
};

const GRID_DIRS = ['up', 'right', 'down', 'left'];
const GRID_ANGLES = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];

export function createPlayer(scene) {
    const flashlight = new THREE.SpotLight(0xffddaa, 2.0, 8, Math.PI / 5, 0.5, 1.8);
    flashlight.position.set(PLAYER_START.x, 0.5, PLAYER_START.z);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(1024, 1024);

    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(PLAYER_START.x, 0.3, PLAYER_START.z - 3);
    scene.add(flashTarget);
    flashlight.target = flashTarget;
    scene.add(flashlight);

    const ambientGlow = new THREE.PointLight(0xaa6622, 0.3, 2.5);
    ambientGlow.position.set(PLAYER_START.x, 0.4, PLAYER_START.z);
    scene.add(ambientGlow);

    return {
        flashlight,
        flashTarget,
        ambientGlow,
        x: PLAYER_START.x,
        z: PLAYER_START.z,
        direction: null,
        nextDirection: null,
        moving: false,
        speed: SPEED,
        alive: true,
        powerTimer: 0,
        powerFlashTimer: 0,
        bobTime: 0,
        bobDecay: 0,
        sprinting: false,
        nearGhostFactor: 0,
        flickerScale: 1.0,
    };
}

export function resolveDirectionFromInput(w, a, s, d, cameraYaw) {
    let mx = 0, mz = 0;

    const sinY = Math.sin(cameraYaw);
    const cosY = Math.cos(cameraYaw);

    if (w) { mx -= sinY; mz -= cosY; }
    if (s) { mx += sinY; mz += cosY; }
    if (a) { mx -= cosY; mz += sinY; }
    if (d) { mx += cosY; mz -= sinY; }

    if (mx === 0 && mz === 0) return null;

    const moveAngle = Math.atan2(mx, mz);

    let bestDir = null;
    let bestDiff = Infinity;
    for (let i = 0; i < 4; i++) {
        let diff = Math.abs(normalizeAngle(moveAngle - GRID_ANGLES[i]));
        if (diff < bestDiff) {
            bestDiff = diff;
            bestDir = GRID_DIRS[i];
        }
    }

    return bestDir;
}

export function updatePlayer(player, dt, sprinting, inputDir) {
    if (!player.alive) return;

    if (inputDir) {
        if (inputDir !== player.direction && canMove(player, inputDir)) {
            player.direction = inputDir;
        } else if (!player.direction || !canMove(player, player.direction)) {
            if (canMove(player, inputDir)) {
                player.direction = inputDir;
            }
        }
        player.nextDirection = inputDir;
        player.moving = true;
    } else {
        player.moving = false;
    }

    if (player.nextDirection && canMove(player, player.nextDirection)) {
        player.direction = player.nextDirection;
        player.nextDirection = null;
    }

    if (player.moving && player.direction && canMove(player, player.direction)) {
        const spd = player.speed * (sprinting ? SPRINT_MULT : 1) * dt;
        const vec = DIR_VECTORS[player.direction];
        player.x += vec.x * spd;
        player.z += vec.z * spd;
    }

    if (player.x < -0.5) player.x = COLS - 0.5;
    if (player.x > COLS - 0.5) player.x = -0.5;

    player.sprinting = sprinting;
    snapToCenter(player);
    updateLights(player, dt);
}

export function resetPlayer(player) {
    player.x = PLAYER_START.x;
    player.z = PLAYER_START.z;
    player.direction = null;
    player.nextDirection = null;
    player.moving = false;
    player.alive = true;
    player.powerTimer = 0;
    player.powerFlashTimer = 0;
    player.bobTime = 0;
    player.bobDecay = 0;
    player.sprinting = false;
    player.nearGhostFactor = 0;
    player.flickerScale = 1.0;
}

function updateLights(player, dt) {
    // Ambient glow follows player directly (no bob)
    player.ambientGlow.position.set(player.x, 0.4, player.z);

    const now = Date.now() * 0.001;
    const scale = player.flickerScale;

    // Power activation flash: bright white burst fades into power mode
    if (player.powerFlashTimer > 0) {
        player.powerFlashTimer -= dt;
        const t = Math.max(0, player.powerFlashTimer / 0.25); // 1→0
        player.flashlight.color.setHex(0xffffff);
        player.flashlight.intensity = (2.0 + t * 4.0) * scale;
        player.flashlight.angle = Math.PI / 3.5;
        player.ambientGlow.color.setHex(0xffffff);
        player.ambientGlow.intensity = (0.3 + t * 2.5) * scale;
        player.ambientGlow.distance = 4 + t * 3;
        return;
    }

    if (player.powerTimer > 0) {
        player.powerTimer -= dt;
        // Pulsing red spotlight in power mode
        player.flashlight.color.setHex(0xff3300);
        player.flashlight.intensity = (2.3 + Math.sin(now * 5) * 0.15) * scale;
        player.flashlight.angle = Math.PI / 4.2;
        player.ambientGlow.color.setHex(0x880000);
        player.ambientGlow.intensity = (0.7 + Math.sin(now * 6) * 0.2) * scale;
        player.ambientGlow.distance = 3.5;
    } else {
        // Normal warm light with subtle breathing pulse
        player.flashlight.color.setHex(0xffddaa);
        const breathe = Math.sin(now * 1.1) * 0.04;
        player.flashlight.intensity = (2.0 + breathe) * scale;
        player.flashlight.angle = Math.PI / 5;
        player.ambientGlow.color.setHex(0xaa6622);
        player.ambientGlow.distance = 2.5;

        // Ghost proximity disturbance: light trembles as danger approaches
        if (player.nearGhostFactor > 0.1) {
            const rattle = player.nearGhostFactor * (Math.random() * 0.35 - 0.18);
            player.flashlight.intensity = Math.max(0.5, player.flashlight.intensity + rattle) * scale;
            player.ambientGlow.intensity = (0.3 + player.nearGhostFactor * (Math.random() * 0.12 - 0.02)) * scale;
        } else {
            player.ambientGlow.intensity = 0.3 * scale;
        }
    }
}

export function updateFlashlightDirection(player, cameraYaw, dt) {
    const moving = player.moving && !!player.direction;

    // Bob decay: ease in when moving, ease out when stopped
    if (moving) {
        player.bobDecay = Math.min(1, player.bobDecay + dt * 6);
        player.bobTime += dt * (player.sprinting ? 13 : 8);
    } else {
        player.bobDecay = Math.max(0, player.bobDecay - dt * 4);
    }

    const bobAmpY = (player.sprinting ? 0.055 : 0.035) * player.bobDecay;
    const bobAmpX = (player.sprinting ? 0.030 : 0.018) * player.bobDecay;
    const bobY = Math.sin(player.bobTime) * bobAmpY;
    const swayX = Math.cos(player.bobTime * 0.5) * bobAmpX;

    player.flashlight.position.set(player.x + swayX, 0.5 + bobY, player.z);

    // Micro-jitter on target simulates holding the flashlight in unsteady hands
    const jitterX = (Math.random() - 0.5) * 0.006;
    const jitterY = (Math.random() - 0.5) * 0.004;

    const lookDist = 3;
    player.flashTarget.position.set(
        player.x - Math.sin(cameraYaw) * lookDist + jitterX,
        0.2 + jitterY,
        player.z - Math.cos(cameraYaw) * lookDist
    );
}

function canMove(player, dir) {
    const vec = DIR_VECTORS[dir];
    const checkDist = 0.55;
    let nx = player.x + vec.x * checkDist;
    const nz = player.z + vec.z * checkDist;
    // Wrap x for lateral tunnels so canMove works at both edges
    if (nx < 0) nx += COLS;
    if (nx >= COLS) nx -= COLS;
    return isWalkable(nx, nz);
}

function snapToCenter(player) {
    const dir = player.direction;
    if (!dir) return;
    if (dir === 'left' || dir === 'right') {
        const targetZ = Math.floor(player.z) + 0.5;
        player.z += (targetZ - player.z) * 0.25;
    } else {
        const targetX = Math.floor(player.x) + 0.5;
        player.x += (targetX - player.x) * 0.25;
    }
}

function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
}
