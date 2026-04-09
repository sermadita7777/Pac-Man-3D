import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const TRAP_SLOW_FACTOR = 0.35;      // speed multiplier while on trap
const TRAP_SLOW_DURATION = 1.5;     // seconds of slowdown after leaving trap
const TRAP_NOISE_RADIUS = 8;        // how far the noise "travels" to attract ghosts
const TRAP_COOLDOWN = 12;           // seconds before a trap can re-trigger

// Predefined trap positions — intersections and key corridors
const TRAP_POSITIONS = [
    { col: 6, row: 5 },
    { col: 21, row: 5 },
    { col: 9, row: 8 },
    { col: 18, row: 8 },
    { col: 6, row: 18 },
    { col: 21, row: 18 },
    { col: 3, row: 21 },
    { col: 24, row: 21 },
    { col: 9, row: 24 },
    { col: 18, row: 24 },
];

export function createTraps(scene) {
    const traps = [];

    // Grate/vent texture for trap
    const trapGeo = new THREE.PlaneGeometry(0.7, 0.7);

    for (const pos of TRAP_POSITIONS) {
        const cell = MAZE_LAYOUT[pos.row][pos.col];
        if (cell === CELL.WALL || cell === CELL.GHOST_HOUSE || cell === CELL.GHOST_DOOR) continue;

        const trapMat = new THREE.MeshStandardMaterial({
            color: 0x1a0808,
            emissive: 0x330000,
            emissiveIntensity: 0.0,
            roughness: 0.95,
            metalness: 0.4,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(trapGeo, trapMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(pos.col + 0.5, 0.005, pos.row + 0.5);
        scene.add(mesh);

        // Warning glow light (very dim, pulsing)
        const light = new THREE.PointLight(0x440000, 0, 2);
        light.position.set(pos.col + 0.5, 0.1, pos.row + 0.5);
        scene.add(light);

        traps.push({
            mesh,
            mat: trapMat,
            light,
            x: pos.col + 0.5,
            z: pos.row + 0.5,
            active: true,
            cooldown: 0,
            triggered: false,
            triggerTimer: 0,
        });
    }

    return traps;
}

export function updateTraps(traps, player, dt) {
    const result = { triggered: false, trapX: 0, trapZ: 0 };

    for (const trap of traps) {
        const t = Date.now() * 0.003;

        // Cooldown
        if (trap.cooldown > 0) {
            trap.cooldown -= dt;
            if (trap.cooldown <= 0) {
                trap.active = true;
                trap.triggered = false;
            }
        }

        // Visual pulse when active
        if (trap.active) {
            const pulse = Math.sin(t + trap.x * 3) * 0.5 + 0.5;
            trap.mat.emissiveIntensity = 0.15 + pulse * 0.2;
            trap.light.intensity = 0.1 + pulse * 0.15;
        } else {
            trap.mat.emissiveIntensity = 0.02;
            trap.light.intensity = 0;
        }

        // Check player proximity
        const dx = player.x - trap.x;
        const dz = player.z - trap.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (trap.active && dist < 0.5) {
            // TRIGGERED!
            trap.active = false;
            trap.triggered = true;
            trap.cooldown = TRAP_COOLDOWN;
            trap.triggerTimer = TRAP_SLOW_DURATION;

            // Flash the trap red
            trap.mat.emissive.setHex(0xff0000);
            trap.mat.emissiveIntensity = 2.0;
            trap.light.intensity = 1.5;
            trap.light.color.setHex(0xff0000);
            setTimeout(() => {
                trap.mat.emissive.setHex(0x330000);
                trap.light.color.setHex(0x440000);
            }, 300);

            result.triggered = true;
            result.trapX = trap.x;
            result.trapZ = trap.z;
        }

        // Slow effect decay
        if (trap.triggerTimer > 0) {
            trap.triggerTimer -= dt;
        }
    }

    // Apply slow effect if any trap recently triggered near player
    let isSlowed = false;
    for (const trap of traps) {
        if (trap.triggerTimer > 0) {
            const dx = player.x - trap.x;
            const dz = player.z - trap.z;
            if (Math.sqrt(dx * dx + dz * dz) < 2.0) {
                isSlowed = true;
                break;
            }
        }
    }

    player.speed = isSlowed ? 4.5 * TRAP_SLOW_FACTOR : 4.5;
    result.isSlowed = isSlowed;

    return result;
}

export function resetTraps(traps) {
    for (const trap of traps) {
        trap.active = true;
        trap.cooldown = 0;
        trap.triggered = false;
        trap.triggerTimer = 0;
        trap.mat.emissive.setHex(0x330000);
        trap.light.color.setHex(0x440000);
    }
}

export { TRAP_NOISE_RADIUS };
