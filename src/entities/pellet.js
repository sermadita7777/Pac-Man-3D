import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const DOT_RADIUS = 0.08;
const POWER_RADIUS = 0.18;
const DOT_COLOR = 0x886644;
const POWER_COLOR = 0x880000;

const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 8, 8);
const dotMat = new THREE.MeshStandardMaterial({
    color: DOT_COLOR,
    emissive: DOT_COLOR,
    emissiveIntensity: 0.8,
});

const powerGeo = new THREE.SphereGeometry(POWER_RADIUS, 12, 12);
const powerMat = new THREE.MeshStandardMaterial({
    color: POWER_COLOR,
    emissive: POWER_COLOR,
    emissiveIntensity: 1.8,
});

export function createPellets(scene) {
    const dots = [];
    const powers = [];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = MAZE_LAYOUT[row][col];

            if (cell === CELL.DOT) {
                const mesh = new THREE.Mesh(dotGeo, dotMat);
                mesh.position.set(col + 0.5, 0.25, row + 0.5);
                scene.add(mesh);
                dots.push({ mesh, col, row, active: true });
            } else if (cell === CELL.POWER) {
                const mesh = new THREE.Mesh(powerGeo, powerMat);
                mesh.position.set(col + 0.5, 0.35, row + 0.5);
                scene.add(mesh);
                const light = new THREE.PointLight(POWER_COLOR, 1.0, 3);
                light.position.set(col + 0.5, 0.5, row + 0.5);
                scene.add(light);
                powers.push({ mesh, light, col, row, active: true });
            }
        }
    }

    return { dots, powers };
}

export function updatePellets(pellets, dt) {
    const t = Date.now() * 0.003;
    for (const p of pellets.powers) {
        if (!p.active) continue;
        p.mesh.scale.setScalar(0.85 + Math.sin(t) * 0.25);
        p.mesh.position.y = 0.35 + Math.sin(t * 1.5) * 0.08;
        p.light.intensity = 1.0 + Math.sin(t * 2) * 0.5;
    }
}

export function resetPellets(pellets, scene) {
    for (const d of pellets.dots) {
        d.active = true;
        d.mesh.visible = true;
    }
    for (const p of pellets.powers) {
        p.active = true;
        p.mesh.visible = true;
        p.light.intensity = 1.2;
    }
}

export function countRemaining(pellets) {
    let count = 0;
    for (const d of pellets.dots) if (d.active) count++;
    for (const p of pellets.powers) if (p.active) count++;
    return count;
}
