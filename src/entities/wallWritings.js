import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const MESSAGES = [
    'RUN', 'BEHIND YOU', 'IT SEES YOU', 'DON\'T STOP',
    'HELP ME', 'GET OUT', 'NO EXIT', 'TURN BACK',
    'THEY KNOW', 'TOO LATE', 'YOU\'RE NEXT', 'NOT ALONE',
    'LISTEN', 'CLOSER', 'FEED THEM', 'FORGIVE ME',
];

const APPEAR_DIST = 5;   // start fading in
const FULL_DIST = 2.5;   // fully visible
const WRITING_HEIGHT = 0.6;

// Find wall faces that have a corridor in front of them
function findWallWritingSpots() {
    const spots = [];
    const dirs = [
        { dr: -1, dc: 0, nx: 0, nz: -1, facing: 'south' }, // wall above corridor, text faces south
        { dr: 1,  dc: 0, nx: 0, nz: 1,  facing: 'north' },
        { dr: 0,  dc: -1, nx: -1, nz: 0, facing: 'east' },
        { dr: 0,  dc: 1,  nx: 1,  nz: 0, facing: 'west' },
    ];

    for (let row = 1; row < ROWS - 1; row++) {
        for (let col = 1; col < COLS - 1; col++) {
            if (MAZE_LAYOUT[row][col] !== CELL.WALL) continue;
            for (const d of dirs) {
                const nr = row + d.dr;
                const nc = col + d.dc;
                if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
                const adj = MAZE_LAYOUT[nr][nc];
                if (adj === CELL.DOT || adj === CELL.POWER || adj === CELL.EMPTY) {
                    spots.push({
                        wallRow: row, wallCol: col,
                        corrRow: nr, corrCol: nc,
                        nx: d.nx, nz: d.nz,
                        facing: d.facing,
                    });
                }
            }
        }
    }
    return spots;
}

function createTextTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, 256, 64);

    // Blood drip text
    ctx.font = 'bold 32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main text with blood color
    ctx.fillStyle = '#8b0000';
    ctx.fillText(text, 128, 28);

    // Glow layer
    ctx.globalAlpha = 0.4;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 12;
    ctx.fillText(text, 128, 28);
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // Drip effect from random letters
    ctx.fillStyle = '#660000';
    const metrics = ctx.measureText(text);
    const startX = 128 - metrics.width / 2;
    for (let i = 0; i < text.length; i++) {
        if (Math.random() > 0.4) continue;
        const charW = ctx.measureText(text[i]).width;
        const cx = startX + ctx.measureText(text.substring(0, i)).width + charW / 2;
        const dripLen = 8 + Math.random() * 20;
        ctx.beginPath();
        ctx.moveTo(cx, 40);
        ctx.lineTo(cx + (Math.random() - 0.5) * 3, 40 + dripLen);
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.strokeStyle = `rgba(100,0,0,${0.3 + Math.random() * 0.4})`;
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
}

export function createWallWritings(scene) {
    const spots = findWallWritingSpots();

    // Shuffle and pick ~12 spots
    for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [spots[i], spots[j]] = [spots[j], spots[i]];
    }

    const count = Math.min(14, spots.length);
    const writings = [];
    const usedMessages = new Set();

    for (let i = 0; i < count; i++) {
        const spot = spots[i];
        let msg;
        do {
            msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        } while (usedMessages.has(msg) && usedMessages.size < MESSAGES.length);
        usedMessages.add(msg);

        const tex = createTextTexture(msg);
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            opacity: 0,
            side: THREE.FrontSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const geo = new THREE.PlaneGeometry(0.9, 0.22);
        const mesh = new THREE.Mesh(geo, mat);

        // Position on wall face
        const wx = spot.wallCol + 0.5 + spot.nx * 0.51;
        const wz = spot.wallRow + 0.5 + spot.nz * 0.51;
        mesh.position.set(wx, WRITING_HEIGHT, wz);

        // Rotate to face the corridor
        if (spot.facing === 'south') mesh.rotation.y = 0;
        else if (spot.facing === 'north') mesh.rotation.y = Math.PI;
        else if (spot.facing === 'east') mesh.rotation.y = -Math.PI / 2;
        else if (spot.facing === 'west') mesh.rotation.y = Math.PI / 2;

        scene.add(mesh);

        writings.push({
            mesh,
            mat,
            x: wx,
            z: wz,
            corrX: spot.corrCol + 0.5,
            corrZ: spot.corrRow + 0.5,
            currentOpacity: 0,
            // Random delay so they don't all appear at once
            phaseOffset: Math.random() * Math.PI * 2,
        });
    }

    return writings;
}

export function updateWallWritings(writings, player, dt) {
    const t = Date.now() * 0.001;

    for (const w of writings) {
        const dx = player.x - w.corrX;
        const dz = player.z - w.corrZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Target opacity based on distance
        let targetOpacity = 0;
        if (dist < APPEAR_DIST) {
            const ratio = 1 - (dist - FULL_DIST) / (APPEAR_DIST - FULL_DIST);
            targetOpacity = Math.max(0, Math.min(1, ratio));
        }

        // Eerie breathing pulse when visible
        if (targetOpacity > 0) {
            const pulse = Math.sin(t * 1.5 + w.phaseOffset) * 0.15;
            targetOpacity = Math.max(0, targetOpacity * (0.7 + pulse));
        }

        // Smooth fade
        w.currentOpacity += (targetOpacity - w.currentOpacity) * dt * 3;
        w.mat.opacity = w.currentOpacity;
        w.mesh.visible = w.currentOpacity > 0.01;
    }
}

export function resetWallWritings(writings) {
    for (const w of writings) {
        w.currentOpacity = 0;
        w.mat.opacity = 0;
        w.mesh.visible = false;
    }
}
