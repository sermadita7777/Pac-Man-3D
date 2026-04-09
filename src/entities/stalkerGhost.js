import * as THREE from 'three';
import { findPath } from '../systems/pathfinding.js';
import { COLS, ROWS } from '../data/mazeData.js';

const STILL_THRESHOLD = 3.0;    // seconds still before it starts appearing
const MATERIALIZE_TIME = 2.5;   // seconds to fully materialize
const DEMATERIALIZE_TIME = 1.0; // seconds to vanish after player moves
const STALKER_SPEED = 3.0;
const RADIUS = 0.45;
const SPAWN_DIST_MIN = 5;
const SPAWN_DIST_MAX = 8;

const STATE = { DORMANT: 0, MATERIALIZING: 1, HUNTING: 2, DEMATERIALIZING: 3 };

export function createStalkerGhost(scene) {
    const group = new THREE.Group();

    // Darker, more ethereal appearance
    const bodyGeo = new THREE.SphereGeometry(RADIUS, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.75);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x220022,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0,
        roughness: 0.2,
        metalness: 0.5,
        side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;

    const skirtGeo = new THREE.CylinderGeometry(RADIUS, RADIUS * 0.6, 0.35, 12);
    const skirtMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        emissive: 0x110011,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0,
        roughness: 0.3,
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = -0.25;

    // Glowing eyes — piercing white/purple
    const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff00ff,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.13, 0.1, -0.32);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.13, 0.1, -0.32);

    // Eerie purple glow
    const light = new THREE.PointLight(0x440044, 0, 5);
    light.position.y = 0.3;

    group.add(body, skirt, leftEye, rightEye, light);
    group.position.set(0, -5, 0); // hidden below map
    group.visible = false;
    scene.add(group);

    return {
        mesh: group,
        bodyMat,
        skirtMat,
        eyeMat,
        light,
        leftEye,
        rightEye,
        x: 0,
        z: 0,
        state: STATE.DORMANT,
        stillTimer: 0,
        materializeProgress: 0,
        path: [],
        pathTimer: 0,
        lastPlayerX: 0,
        lastPlayerZ: 0,
    };
}

export function updateStalkerGhost(stalker, player, dt) {
    const playerMoving = player.moving && !!player.direction;

    // Track how long player has been still
    if (!playerMoving && player.alive) {
        stalker.stillTimer += dt;
    } else {
        stalker.stillTimer = 0;
    }

    switch (stalker.state) {
        case STATE.DORMANT:
            if (stalker.stillTimer >= STILL_THRESHOLD) {
                // Spawn behind or near the player
                spawnNearPlayer(stalker, player);
                stalker.state = STATE.MATERIALIZING;
                stalker.materializeProgress = 0;
                stalker.mesh.visible = true;
            }
            break;

        case STATE.MATERIALIZING:
            if (playerMoving) {
                stalker.state = STATE.DEMATERIALIZING;
                break;
            }
            stalker.materializeProgress = Math.min(1, stalker.materializeProgress + dt / MATERIALIZE_TIME);
            updateOpacity(stalker, stalker.materializeProgress);

            if (stalker.materializeProgress >= 1) {
                stalker.state = STATE.HUNTING;
            }
            break;

        case STATE.HUNTING:
            if (playerMoving) {
                stalker.state = STATE.DEMATERIALIZING;
                break;
            }
            // Slowly approach the player
            moveTowardPlayer(stalker, player, dt);
            updateOpacity(stalker, 1.0);

            // Check kill distance
            const dx = stalker.x - player.x;
            const dz = stalker.z - player.z;
            if (Math.sqrt(dx * dx + dz * dz) < 0.6) {
                return { killed: true };
            }
            break;

        case STATE.DEMATERIALIZING:
            stalker.materializeProgress = Math.max(0, stalker.materializeProgress - dt / DEMATERIALIZE_TIME);
            updateOpacity(stalker, stalker.materializeProgress);

            if (stalker.materializeProgress <= 0) {
                stalker.state = STATE.DORMANT;
                stalker.mesh.visible = false;
                stalker.mesh.position.y = -5;
            }
            break;
    }

    // Visual updates when visible
    if (stalker.mesh.visible) {
        const t = Date.now() * 0.003;
        stalker.mesh.position.x = stalker.x;
        stalker.mesh.position.z = stalker.z;
        stalker.mesh.position.y = RADIUS + 0.05 + Math.sin(t) * 0.08;

        // Glitch distortion
        if (Math.random() > 0.95) {
            stalker.mesh.position.x += (Math.random() - 0.5) * 0.2;
            stalker.mesh.position.z += (Math.random() - 0.5) * 0.2;
        }

        // Face the player
        const angle = Math.atan2(-(player.x - stalker.x), -(player.z - stalker.z));
        stalker.mesh.rotation.y = angle;

        // Eye look-at
        const lDx = player.x - stalker.x;
        const lDz = player.z - stalker.z;
        const cosR = Math.cos(-angle);
        const sinR = Math.sin(-angle);
        const localX = lDx * cosR - lDz * sinR;
        const localZ = lDx * sinR + lDz * cosR;
        stalker.leftEye.lookAt(
            stalker.leftEye.position.x + localX,
            stalker.leftEye.position.y,
            stalker.leftEye.position.z + localZ
        );
        stalker.rightEye.lookAt(
            stalker.rightEye.position.x + localX,
            stalker.rightEye.position.y,
            stalker.rightEye.position.z + localZ
        );
    }

    return { killed: false };
}

function spawnNearPlayer(stalker, player) {
    // Pick a spot behind the player at a moderate distance
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_DIST_MIN + Math.random() * (SPAWN_DIST_MAX - SPAWN_DIST_MIN);
    let sx = player.x + Math.cos(angle) * dist;
    let sz = player.z + Math.sin(angle) * dist;

    // Clamp to maze bounds
    sx = Math.max(1.5, Math.min(COLS - 1.5, sx));
    sz = Math.max(1.5, Math.min(ROWS - 1.5, sz));

    stalker.x = sx;
    stalker.z = sz;
    stalker.path = [];
    stalker.pathTimer = 0;
}

function moveTowardPlayer(stalker, player, dt) {
    stalker.pathTimer -= dt;
    if (stalker.pathTimer <= 0 || stalker.path.length === 0) {
        stalker.path = findPath(
            Math.floor(stalker.x), Math.floor(stalker.z),
            Math.floor(player.x), Math.floor(player.z)
        );
        stalker.pathTimer = 0.5;
    }

    if (stalker.path.length > 0) {
        const target = stalker.path[0];
        const tx = target.x + 0.5;
        const tz = target.z + 0.5;
        const dx = tx - stalker.x;
        const dz = tz - stalker.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.15) {
            stalker.path.shift();
        } else {
            const step = STALKER_SPEED * dt;
            stalker.x += (dx / dist) * step;
            stalker.z += (dz / dist) * step;
        }
    }
}

function updateOpacity(stalker, progress) {
    const flickerMod = Math.random() > 0.9 ? 0.3 + Math.random() * 0.4 : 1.0;
    const opacity = progress * flickerMod;

    stalker.bodyMat.opacity = opacity * 0.7;
    stalker.skirtMat.opacity = opacity * 0.6;
    stalker.eyeMat.opacity = Math.min(1, opacity * 1.5); // eyes appear faster
    stalker.light.intensity = progress * 1.5;
}

export function resetStalkerGhost(stalker) {
    stalker.state = STATE.DORMANT;
    stalker.stillTimer = 0;
    stalker.materializeProgress = 0;
    stalker.path = [];
    stalker.mesh.visible = false;
    stalker.mesh.position.y = -5;
    stalker.bodyMat.opacity = 0;
    stalker.skirtMat.opacity = 0;
    stalker.eyeMat.opacity = 0;
    stalker.light.intensity = 0;
}
