import * as THREE from 'three';
import { GHOST_STARTS, COLS, ROWS } from '../data/mazeData.js';
import { findPath } from '../systems/pathfinding.js';

const SPEED = 3.5;
const FRIGHTENED_SPEED = 2.0;
const RADIUS = 0.4;
const SCATTER_CORNERS = [
    { x: 1, z: 1 },
    { x: 26, z: 1 },
    { x: 1, z: 27 },
    { x: 26, z: 27 },
];

const STATE = { CHASE: 0, SCATTER: 1, FRIGHTENED: 2, EATEN: 3, HOUSE: 4 };

export function createGhosts(scene) {
    return GHOST_STARTS.map((cfg, i) => {
        const group = new THREE.Group();

        const bodyGeo = new THREE.SphereGeometry(RADIUS, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: cfg.color,
            emissive: cfg.color,
            emissiveIntensity: 0.5,
            roughness: 0.4,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;

        const skirtGeo = new THREE.CylinderGeometry(RADIUS, RADIUS * 0.9, 0.25, 12);
        const skirt = new THREE.Mesh(skirtGeo, bodyMat);
        skirt.position.y = -0.2;

        const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeo = new THREE.SphereGeometry(0.05, 6, 6);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 0.1, -0.3);
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
        leftPupil.position.set(-0.12, 0.1, -0.37);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 0.1, -0.3);
        const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
        rightPupil.position.set(0.12, 0.1, -0.37);

        const light = new THREE.PointLight(cfg.color, 1.2, 6);
        light.position.y = 0.3;

        group.add(body, skirt, leftEye, leftPupil, rightEye, rightPupil, light);
        group.position.set(cfg.x, RADIUS + 0.05, cfg.z);
        scene.add(group);

        return {
            mesh: group,
            body,
            bodyMat,
            light,
            originalColor: cfg.color,
            name: cfg.name,
            x: cfg.x,
            z: cfg.z,
            startX: cfg.x,
            startZ: cfg.z,
            state: STATE.HOUSE,
            direction: 0,
            path: [],
            pathTimer: 0,
            houseTimer: i * 3 + 1,
            scatterTarget: SCATTER_CORNERS[i],
            modeTimer: 0,
        };
    });
}

export function updateGhosts(ghosts, player, dt, level) {
    const speedMod = 1 + (level - 1) * 0.05;

    for (const ghost of ghosts) {
        switch (ghost.state) {
            case STATE.HOUSE:
                updateHouse(ghost, dt);
                break;
            case STATE.CHASE:
            case STATE.SCATTER:
                updateMoving(ghost, player, dt, SPEED * speedMod);
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

        if (ghost.state === STATE.FRIGHTENED) {
            ghost.bodyMat.color.setHex(0x2222ff);
            ghost.bodyMat.emissive.setHex(0x0000aa);
            ghost.light.color.setHex(0x2222ff);
        } else if (ghost.state === STATE.EATEN) {
            ghost.mesh.scale.set(0.5, 0.5, 0.5);
        } else {
            ghost.bodyMat.color.setHex(ghost.originalColor);
            ghost.bodyMat.emissive.setHex(ghost.originalColor);
            ghost.light.color.setHex(ghost.originalColor);
            ghost.mesh.scale.set(1, 1, 1);
        }

        ghost.mesh.position.y = RADIUS + 0.05 + Math.sin(Date.now() * 0.005) * 0.05;
    }
}

export function frightenGhosts(ghosts) {
    for (const ghost of ghosts) {
        if (ghost.state === STATE.CHASE || ghost.state === STATE.SCATTER) {
            ghost.state = STATE.FRIGHTENED;
            ghost.modeTimer = 8;
            ghost.path = [];
        }
    }
}

export function resetGhosts(ghosts) {
    ghosts.forEach((ghost, i) => {
        ghost.x = ghost.startX;
        ghost.z = ghost.startZ;
        ghost.state = STATE.HOUSE;
        ghost.houseTimer = i * 3 + 1;
        ghost.path = [];
        ghost.modeTimer = 0;
        ghost.mesh.scale.set(1, 1, 1);
        ghost.mesh.position.set(ghost.x, RADIUS + 0.05, ghost.z);
    });
}

function updateHouse(ghost, dt) {
    ghost.houseTimer -= dt;
    ghost.z += Math.sin(Date.now() * 0.003) * 0.01;
    if (ghost.houseTimer <= 0) {
        ghost.x = 13.5;
        ghost.z = 11;
        ghost.state = STATE.SCATTER;
        ghost.modeTimer = 7;
    }
}

function updateMoving(ghost, player, dt, speed) {
    ghost.modeTimer -= dt;
    if (ghost.modeTimer <= 0) {
        ghost.state = ghost.state === STATE.CHASE ? STATE.SCATTER : STATE.CHASE;
        ghost.modeTimer = ghost.state === STATE.CHASE ? 20 : 7;
        ghost.path = [];
    }

    ghost.pathTimer -= dt;
    if (ghost.pathTimer <= 0 || ghost.path.length === 0) {
        const target = ghost.state === STATE.CHASE
            ? getChaseTarget(ghost, player)
            : ghost.scatterTarget;
        ghost.path = findPath(
            Math.floor(ghost.x), Math.floor(ghost.z),
            Math.floor(target.x), Math.floor(target.z)
        );
        ghost.pathTimer = 0.3;
    }

    moveAlongPath(ghost, dt, speed);
}

function updateFrightened(ghost, dt, speed) {
    ghost.modeTimer -= dt;
    if (ghost.modeTimer <= 0) {
        ghost.state = STATE.SCATTER;
        ghost.modeTimer = 7;
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
        return;
    }

    const speed = SPEED * 2.5 * dt;
    ghost.x += (dx / dist) * speed;
    ghost.z += (dz / dist) * speed;
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

    if (Math.abs(dx) > Math.abs(dz)) {
        ghost.mesh.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
        ghost.mesh.rotation.y = dz > 0 ? 0 : Math.PI;
    }
}

function getChaseTarget(ghost, player) {
    switch (ghost.name) {
        case 'blinky':
            return { x: player.x, z: player.z };
        case 'pinky': {
            const ahead = 4;
            const dx = ghost.name === 'left' ? -ahead : ghost.name === 'right' ? ahead : 0;
            return { x: player.x + dx, z: player.z - ahead };
        }
        case 'inky': {
            const blinky = { x: player.x, z: player.z };
            return {
                x: player.x + (player.x - blinky.x),
                z: player.z + (player.z - blinky.z),
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
