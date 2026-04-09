import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

// Mirror zones — specific corridor spots where reflections appear
const MIRROR_ZONES = [
    { col: 1, row: 5 },
    { col: 26, row: 5 },
    { col: 6, row: 13 },
    { col: 21, row: 13 },
    { col: 1, row: 21 },
    { col: 26, row: 21 },
    { col: 12, row: 27 },
    { col: 15, row: 27 },
];

const TRIGGER_DIST = 0.8;
const COOLDOWN = 25; // seconds before same mirror can trigger again

export function createMirrorZones() {
    const zones = MIRROR_ZONES
        .filter(z => {
            if (z.row < 0 || z.row >= ROWS || z.col < 0 || z.col >= COLS) return false;
            return MAZE_LAYOUT[z.row][z.col] !== CELL.WALL;
        })
        .map(z => ({
            x: z.col + 0.5,
            z: z.row + 0.5,
            cooldown: 0,
            triggered: false,
        }));

    return zones;
}

export function updateMirrorZones(zones, player, dt) {
    let scareTriggered = false;

    for (const zone of zones) {
        if (zone.cooldown > 0) {
            zone.cooldown -= dt;
            continue;
        }

        const dx = player.x - zone.x;
        const dz = player.z - zone.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Only trigger when player is moving through the zone
        if (dist < TRIGGER_DIST && player.moving) {
            zone.cooldown = COOLDOWN;
            zone.triggered = true;
            scareTriggered = true;
        }
    }

    return scareTriggered;
}

export function resetMirrorZones(zones) {
    for (const zone of zones) {
        zone.cooldown = 0;
        zone.triggered = false;
    }
}
