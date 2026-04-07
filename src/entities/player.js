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
    const flashlight = new THREE.SpotLight(0xffffcc, 2.5, 12, Math.PI / 4, 0.4, 1.5);
    flashlight.position.set(PLAYER_START.x, 0.5, PLAYER_START.z);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(512, 512);

    const flashTarget = new THREE.Object3D();
    flashTarget.position.set(PLAYER_START.x, 0.3, PLAYER_START.z - 3);
    scene.add(flashTarget);
    flashlight.target = flashTarget;
    scene.add(flashlight);

    const ambientGlow = new THREE.PointLight(0xffff44, 0.6, 4);
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

    snapToCenter(player);
    updateLights(player);
}

export function resetPlayer(player) {
    player.x = PLAYER_START.x;
    player.z = PLAYER_START.z;
    player.direction = null;
    player.nextDirection = null;
    player.moving = false;
    player.alive = true;
    player.powerTimer = 0;
}

function updateLights(player) {
    player.flashlight.position.set(player.x, 0.5, player.z);
    player.ambientGlow.position.set(player.x, 0.4, player.z);

    if (player.powerTimer > 0) {
        player.powerTimer -= 1 / 60;
        player.ambientGlow.color.setHex(0x4444ff);
        player.ambientGlow.intensity = 1.0 + Math.sin(Date.now() * 0.01) * 0.3;
    } else {
        player.ambientGlow.color.setHex(0xffff44);
        player.ambientGlow.intensity = 0.6;
    }
}

export function updateFlashlightDirection(player, cameraYaw) {
    const lookDist = 3;
    player.flashTarget.position.set(
        player.x - Math.sin(cameraYaw) * lookDist,
        0.2,
        player.z - Math.cos(cameraYaw) * lookDist
    );
}

function canMove(player, dir) {
    const vec = DIR_VECTORS[dir];
    const checkDist = 0.55;
    const nx = player.x + vec.x * checkDist;
    const nz = player.z + vec.z * checkDist;
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
