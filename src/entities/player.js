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

const DIR_ANGLES = {
    up: Math.PI,
    down: 0,
    left: -Math.PI / 2,
    right: Math.PI / 2,
};

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
        mesh: null,
        flashlight,
        flashTarget,
        ambientGlow,
        x: PLAYER_START.x,
        z: PLAYER_START.z,
        direction: 'left',
        nextDirection: null,
        speed: SPEED,
        alive: true,
        powerTimer: 0,
    };
}

export function updatePlayer(player, dt, sprinting) {
    if (!player.alive) return;

    const spd = player.speed * (sprinting ? SPRINT_MULT : 1) * dt;

    if (player.nextDirection && canMove(player, player.nextDirection)) {
        player.direction = player.nextDirection;
        player.nextDirection = null;
    }

    if (player.direction && canMove(player, player.direction)) {
        const vec = DIR_VECTORS[player.direction];
        player.x += vec.x * spd;
        player.z += vec.z * spd;
    }

    if (player.x < -0.5) player.x = COLS - 0.5;
    if (player.x > COLS - 0.5) player.x = -0.5;

    snapToCenter(player);

    const angle = DIR_ANGLES[player.direction] ?? 0;
    const lookDist = 3;

    player.flashlight.position.set(player.x, 0.5, player.z);
    player.flashTarget.position.set(
        player.x + Math.sin(angle) * lookDist,
        0.3,
        player.z + Math.cos(angle) * lookDist
    );
    player.ambientGlow.position.set(player.x, 0.4, player.z);

    if (player.powerTimer > 0) {
        player.powerTimer -= dt;
        player.ambientGlow.color.setHex(0x4444ff);
        player.ambientGlow.intensity = 1.0 + Math.sin(Date.now() * 0.01) * 0.3;
    } else {
        player.ambientGlow.color.setHex(0xffff44);
        player.ambientGlow.intensity = 0.6;
    }
}

export function resetPlayer(player) {
    player.x = PLAYER_START.x;
    player.z = PLAYER_START.z;
    player.direction = 'left';
    player.nextDirection = null;
    player.alive = true;
    player.powerTimer = 0;
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
    if (dir === 'left' || dir === 'right') {
        const targetZ = Math.floor(player.z) + 0.5;
        player.z += (targetZ - player.z) * 0.25;
    } else if (dir === 'up' || dir === 'down') {
        const targetX = Math.floor(player.x) + 0.5;
        player.x += (targetX - player.x) * 0.25;
    }
}
