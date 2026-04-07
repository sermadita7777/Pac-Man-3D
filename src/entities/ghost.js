import * as THREE from 'three';
import { GHOST_STARTS, COLS, ROWS } from '../data/mazeData.js';
import { findPath } from '../systems/pathfinding.js';

const BASE_SPEED = 3.5;
const FRIGHTENED_SPEED = 2.0;
const EATEN_SPEED = 9.0;
const RADIUS = 0.4;

const SCATTER_CORNERS = [
    { x: 1, z: 1 },
    { x: 26, z: 1 },
    { x: 1, z: 27 },
    { x: 26, z: 27 },
];

const PERSONALITY = {
    blinky: { speedMult: 1.05, aggressiveness: 1.0 },
    pinky:  { speedMult: 1.0,  aggressiveness: 0.9 },
    inky:   { speedMult: 0.95, aggressiveness: 0.8 },
    clyde:  { speedMult: 0.9,  aggressiveness: 0.7 },
};

const WAVE_TIMINGS = [
    { scatter: 7, chase: 20 },
    { scatter: 7, chase: 20 },
    { scatter: 5, chase: 20 },
    { scatter: 5, chase: Infinity },
];

const STATE = { CHASE: 0, SCATTER: 1, FRIGHTENED: 2, EATEN: 3, HOUSE: 4 };

export function createGhosts(scene) {
    return GHOST_STARTS.map((cfg, i) => {
        const group = new THREE.Group();

        const bodyGeo = new THREE.SphereGeometry(RADIUS, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.1,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;

        const skirtGeo = new THREE.CylinderGeometry(RADIUS, RADIUS * 0.85, 0.3, 16);
        const skirtMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity: 0.4,
            roughness: 0.3,
        });
        const skirt = new THREE.Mesh(skirtGeo, skirtMat);
        skirt.position.y = -0.22;

        const tentacleGroup = new THREE.Group();
        const tentGeo = new THREE.SphereGeometry(0.08, 6, 4);
        for (let t = 0; t < 6; t++) {
            const angle = (t / 6) * Math.PI * 2;
            const tent = new THREE.Mesh(tentGeo, skirtMat);
            tent.position.set(
                Math.cos(angle) * RADIUS * 0.75,
                -0.38,
                Math.sin(angle) * RADIUS * 0.75
            );
            tentacleGroup.add(tent);
        }

        const eyeGeo = new THREE.SphereGeometry(0.12, 10, 10);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 });
        const pupilGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000088, emissive: 0x000044, emissiveIntensity: 0.2 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.14, 0.1, -0.28);
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(0, 0, -0.07);
        leftEye.add(leftPupil);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.14, 0.1, -0.28);
        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(0, 0, -0.07);
        rightEye.add(rightPupil);

        const light = new THREE.PointLight(cfg.color, 1.5, 7);
        light.position.y = 0.3;

        group.add(body, skirt, tentacleGroup, leftEye, rightEye, light);
        group.position.set(cfg.x, RADIUS + 0.05, cfg.z);
        scene.add(group);

        return {
            mesh: group,
            body,
            bodyMat,
            skirtMat,
            tentacleGroup,
            leftEye,
            rightEye,
            light,
            originalColor: cfg.color,
            name: cfg.name,
            x: cfg.x,
            z: cfg.z,
            startX: cfg.x,
            startZ: cfg.z,
            state: STATE.HOUSE,
            prevState: STATE.HOUSE,
            direction: 0,
            path: [],
            pathTimer: 0,
            houseTimer: i * 3 + 1,
            scatterTarget: SCATTER_CORNERS[i],
            modeTimer: 0,
            waveIndex: 0,
            frightenFlash: false,
            personality: PERSONALITY[cfg.name] || PERSONALITY.blinky,
        };
    });
}

export function updateGhosts(ghosts, player, dt, level) {
    const levelSpeedMod = 1 + (level - 1) * 0.06;

    for (const ghost of ghosts) {
        switch (ghost.state) {
            case STATE.HOUSE:
                updateHouse(ghost, dt);
                break;
            case STATE.CHASE:
            case STATE.SCATTER:
                updateMoving(ghost, player, ghosts, dt, BASE_SPEED * levelSpeedMod * ghost.personality.speedMult);
                break;
            case STATE.FRIGHTENED:
                updateFrightened(ghost, dt, FRIGHTENED_SPEED);
                break;
            case STATE.EATEN:
                updateEaten(ghost, dt);
                break;
        }

        ghost.mesh.position.x = ghost.x;
        ghost.mesh.position.z = ghost.z;

        updateVisuals(ghost, player, dt);
    }
}

function updateVisuals(ghost, player, dt) {
    const t = Date.now() * 0.005;
    const bobOffset = ghost.startX * 0.5;

    ghost.mesh.position.y = RADIUS + 0.05 + Math.sin(t + bobOffset) * 0.06;

    for (let i = 0; i < ghost.tentacleGroup.children.length; i++) {
        const tent = ghost.tentacleGroup.children[i];
        tent.position.y = -0.38 + Math.sin(t * 3 + i * 1.2) * 0.04;
    }

    const parentRot = ghost.mesh.rotation.y;
    const cosR = Math.cos(-parentRot);
    const sinR = Math.sin(-parentRot);
    const dx = player.x - ghost.x;
    const dz = player.z - ghost.z;
    const localX = dx * cosR - dz * sinR;
    const localZ = dx * sinR + dz * cosR;
    ghost.leftEye.lookAt(
        ghost.leftEye.position.x + localX,
        ghost.leftEye.position.y,
        ghost.leftEye.position.z + localZ
    );
    ghost.rightEye.lookAt(
        ghost.rightEye.position.x + localX,
        ghost.rightEye.position.y,
        ghost.rightEye.position.z + localZ
    );

    if (ghost.state === STATE.FRIGHTENED) {
        ghost.frightenFlash = ghost.modeTimer < 2.0;
        if (ghost.frightenFlash) {
            const flash = Math.sin(Date.now() * 0.015) > 0;
            const col = flash ? 0xffffff : 0x2222ff;
            ghost.bodyMat.color.setHex(col);
            ghost.bodyMat.emissive.setHex(col === 0xffffff ? 0xaaaaaa : 0x0000aa);
            ghost.skirtMat.color.setHex(col);
            ghost.skirtMat.emissive.setHex(col === 0xffffff ? 0xaaaaaa : 0x0000aa);
            ghost.light.color.setHex(col);
        } else {
            ghost.bodyMat.color.setHex(0x2222ff);
            ghost.bodyMat.emissive.setHex(0x0000aa);
            ghost.skirtMat.color.setHex(0x2222ff);
            ghost.skirtMat.emissive.setHex(0x0000aa);
            ghost.light.color.setHex(0x2222ff);
        }
        ghost.light.intensity = 1.0;
        ghost.mesh.scale.set(1, 1, 1);
    } else if (ghost.state === STATE.EATEN) {
        ghost.mesh.scale.set(0.4, 0.4, 0.4);
        ghost.bodyMat.color.setHex(0x444444);
        ghost.bodyMat.emissive.setHex(0x222222);
        ghost.bodyMat.opacity = 0.5;
        ghost.bodyMat.transparent = true;
        ghost.light.intensity = 0.3;
    } else {
        ghost.bodyMat.color.setHex(ghost.originalColor);
        ghost.bodyMat.emissive.setHex(ghost.originalColor);
        ghost.bodyMat.opacity = 1.0;
        ghost.bodyMat.transparent = false;
        ghost.skirtMat.color.setHex(ghost.originalColor);
        ghost.skirtMat.emissive.setHex(ghost.originalColor);
        ghost.light.color.setHex(ghost.originalColor);
        ghost.light.intensity = 1.5 + Math.sin(t * 2) * 0.3;
        ghost.mesh.scale.set(1, 1, 1);
    }
}

export function frightenGhosts(ghosts) {
    for (const ghost of ghosts) {
        if (ghost.state === STATE.CHASE || ghost.state === STATE.SCATTER) {
            ghost.prevState = ghost.state;
            ghost.state = STATE.FRIGHTENED;
            ghost.modeTimer = 8;
            ghost.path = [];
            ghost.frightenFlash = false;
        }
    }
}

export function resetGhosts(ghosts) {
    ghosts.forEach((ghost, i) => {
        ghost.x = ghost.startX;
        ghost.z = ghost.startZ;
        ghost.state = STATE.HOUSE;
        ghost.prevState = STATE.HOUSE;
        ghost.houseTimer = i * 3 + 1;
        ghost.path = [];
        ghost.modeTimer = 0;
        ghost.waveIndex = 0;
        ghost.mesh.scale.set(1, 1, 1);
        ghost.mesh.position.set(ghost.x, RADIUS + 0.05, ghost.z);
        ghost.bodyMat.transparent = false;
        ghost.bodyMat.opacity = 1.0;
    });
}

function updateHouse(ghost, dt) {
    ghost.houseTimer -= dt;
    ghost.z += Math.sin(Date.now() * 0.004) * 0.008;
    ghost.mesh.position.y = RADIUS + 0.05 + Math.sin(Date.now() * 0.003) * 0.1;
    if (ghost.houseTimer <= 0) {
        ghost.x = 13.5;
        ghost.z = 11;
        ghost.state = STATE.SCATTER;
        ghost.waveIndex = 0;
        ghost.modeTimer = WAVE_TIMINGS[0].scatter;
    }
}

function updateMoving(ghost, player, allGhosts, dt, speed) {
    ghost.modeTimer -= dt;
    if (ghost.modeTimer <= 0) {
        if (ghost.state === STATE.CHASE) {
            ghost.state = STATE.SCATTER;
            ghost.waveIndex = Math.min(ghost.waveIndex + 1, WAVE_TIMINGS.length - 1);
            ghost.modeTimer = WAVE_TIMINGS[ghost.waveIndex].scatter;
        } else {
            ghost.state = STATE.CHASE;
            ghost.modeTimer = WAVE_TIMINGS[ghost.waveIndex].chase;
        }
        ghost.path = [];
    }

    ghost.pathTimer -= dt;
    if (ghost.pathTimer <= 0 || ghost.path.length === 0) {
        const target = ghost.state === STATE.CHASE
            ? getChaseTarget(ghost, player, allGhosts)
            : ghost.scatterTarget;
        ghost.path = findPath(
            Math.floor(ghost.x), Math.floor(ghost.z),
            Math.floor(target.x), Math.floor(target.z)
        );
        ghost.pathTimer = 0.25;
    }

    moveAlongPath(ghost, dt, speed);
}

function updateFrightened(ghost, dt, speed) {
    ghost.modeTimer -= dt;
    if (ghost.modeTimer <= 0) {
        ghost.state = ghost.prevState === STATE.CHASE ? STATE.CHASE : STATE.SCATTER;
        ghost.modeTimer = ghost.state === STATE.CHASE
            ? WAVE_TIMINGS[ghost.waveIndex].chase
            : WAVE_TIMINGS[ghost.waveIndex].scatter;
        ghost.path = [];
        return;
    }

    if (ghost.path.length === 0) {
        const rx = Math.floor(Math.random() * COLS);
        const rz = Math.floor(Math.random() * ROWS);
        ghost.path = findPath(
            Math.floor(ghost.x), Math.floor(ghost.z), rx, rz
        );
    }

    moveAlongPath(ghost, dt, speed);
}

function updateEaten(ghost, dt) {
    const tx = 13.5, tz = 13;
    const dx = tx - ghost.x, dz = tz - ghost.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.5) {
        ghost.state = STATE.HOUSE;
        ghost.houseTimer = 2;
        ghost.mesh.scale.set(1, 1, 1);
        ghost.bodyMat.transparent = false;
        ghost.bodyMat.opacity = 1.0;
        return;
    }

    const step = EATEN_SPEED * dt;
    ghost.x += (dx / dist) * step;
    ghost.z += (dz / dist) * step;
}

function moveAlongPath(ghost, dt, speed) {
    if (ghost.path.length === 0) return;

    const target = ghost.path[0];
    const tx = target.x + 0.5;
    const tz = target.z + 0.5;
    const dx = tx - ghost.x;
    const dz = tz - ghost.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.15) {
        ghost.x = tx;
        ghost.z = tz;
        ghost.path.shift();
        return;
    }

    const step = speed * dt;
    ghost.x += (dx / dist) * step;
    ghost.z += (dz / dist) * step;

    const targetAngle = Math.atan2(-dx, -dz);
    const currentY = ghost.mesh.rotation.y;
    let diff = targetAngle - currentY;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ghost.mesh.rotation.y += diff * Math.min(1, dt * 10);
}

function getChaseTarget(ghost, player, allGhosts) {
    switch (ghost.name) {
        case 'blinky':
            return { x: player.x, z: player.z };

        case 'pinky': {
            const ahead = 4;
            let dx = 0, dz = 0;
            if (player.direction === 'up')    { dz = -ahead; }
            else if (player.direction === 'down')  { dz = ahead; }
            else if (player.direction === 'left')  { dx = -ahead; }
            else if (player.direction === 'right') { dx = ahead; }
            else { dz = -ahead; }
            return {
                x: Math.max(0, Math.min(COLS - 1, player.x + dx)),
                z: Math.max(0, Math.min(ROWS - 1, player.z + dz)),
            };
        }

        case 'inky': {
            const blinky = allGhosts.find(g => g.name === 'blinky');
            if (!blinky) return { x: player.x, z: player.z };
            let pdx = 0, pdz = 0;
            if (player.direction === 'up')    { pdz = -2; }
            else if (player.direction === 'down')  { pdz = 2; }
            else if (player.direction === 'left')  { pdx = -2; }
            else if (player.direction === 'right') { pdx = 2; }
            const pivotX = player.x + pdx;
            const pivotZ = player.z + pdz;
            return {
                x: Math.max(0, Math.min(COLS - 1, pivotX + (pivotX - blinky.x))),
                z: Math.max(0, Math.min(ROWS - 1, pivotZ + (pivotZ - blinky.z))),
            };
        }

        case 'clyde': {
            const d = Math.sqrt((ghost.x - player.x) ** 2 + (ghost.z - player.z) ** 2);
            return d > 8 ? { x: player.x, z: player.z } : ghost.scatterTarget;
        }

        default:
            return { x: player.x, z: player.z };
    }
}

export { STATE };
