import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const SCALE = 5;
let canvas, ctx, staticImage;

const GHOST_COLORS = {
    blinky: [170, 0, 0],
    pinky: [136, 68, 102],
    inky: [34, 102, 102],
    clyde: [136, 85, 34],
};

export function createMinimap() {
    const container = document.createElement('div');
    container.id = 'minimap-container';

    canvas = document.createElement('canvas');
    canvas.width = COLS * SCALE;
    canvas.height = ROWS * SCALE;
    container.appendChild(canvas);

    const label = document.createElement('div');
    label.id = 'minimap-label';
    label.textContent = 'MAP';
    container.appendChild(label);

    document.getElementById('game-container').appendChild(container);
    ctx = canvas.getContext('2d');
    cacheStaticLayer();
}

function cacheStaticLayer() {
    const off = document.createElement('canvas');
    off.width = COLS * SCALE;
    off.height = ROWS * SCALE;
    const oc = off.getContext('2d');

    oc.fillStyle = 'rgba(5,0,0,0.95)';
    oc.fillRect(0, 0, off.width, off.height);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = MAZE_LAYOUT[row][col];
            if (cell === CELL.WALL) {
                oc.fillStyle = '#1a0808';
                oc.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
                oc.fillStyle = 'rgba(80,20,20,0.2)';
                oc.fillRect(col * SCALE, row * SCALE, SCALE, 1);
                oc.fillRect(col * SCALE, row * SCALE, 1, SCALE);
            } else if (cell === CELL.GHOST_DOOR) {
                oc.fillStyle = '#660000';
                oc.fillRect(col * SCALE, row * SCALE, SCALE, 2);
            }
        }
    }

    staticImage = off;
}

export function updateMinimap(player, ghosts, pellets, cameraYaw) {
    ctx.drawImage(staticImage, 0, 0);

    // Pellets — tiny dots
    ctx.fillStyle = 'rgba(136,100,68,0.4)';
    for (const dot of pellets.dots) {
        if (!dot.active) continue;
        const cx = dot.col * SCALE + SCALE / 2;
        const cy = dot.row * SCALE + SCALE / 2;
        ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1);
    }

    // Power pellets — pulsing circles
    const pulse = 0.65 + Math.sin(Date.now() * 0.006) * 0.35;
    ctx.fillStyle = `rgba(136,0,0,${pulse})`;
    for (const pow of pellets.powers) {
        if (!pow.active) continue;
        ctx.beginPath();
        ctx.arc(pow.col * SCALE + SCALE / 2, pow.row * SCALE + SCALE / 2, SCALE * 0.42, 0, Math.PI * 2);
        ctx.fill();
    }

    // Ghosts — rounded ghost shape with glow
    for (const ghost of ghosts) {
        const gx = ghost.x * SCALE;
        const gz = ghost.z * SCALE;
        const r = SCALE * 0.48;

        let cr, cg, cb, alpha;
        if (ghost.state === 2) {
            const flash = Math.sin(Date.now() * 0.01) > 0;
            [cr, cg, cb] = flash ? [33, 33, 255] : [255, 255, 255];
            alpha = 1;
        } else if (ghost.state === 3 || ghost.state === 4) {
            [cr, cg, cb] = GHOST_COLORS[ghost.name] || [255, 0, 0];
            alpha = 0.25;
        } else {
            [cr, cg, cb] = GHOST_COLORS[ghost.name] || [255, 0, 0];
            alpha = 1;
        }

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx.beginPath();
        ctx.arc(gx, gz - r * 0.15, r, Math.PI, 0);
        ctx.lineTo(gx + r, gz + r * 0.65);
        ctx.lineTo(gx, gz + r * 0.25);
        ctx.lineTo(gx - r, gz + r * 0.65);
        ctx.closePath();
        ctx.fill();

        if (alpha === 1) {
            ctx.shadowColor = `rgb(${cr},${cg},${cb})`;
            ctx.shadowBlur = 5;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // Player — pac-man with directional mouth
    const px = player.x * SCALE;
    const pz = player.z * SCALE;
    const pr = SCALE * 0.58;
    const angle = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[player.direction] ?? 0;
    const mouth = 0.35;

    // Camera look direction cone
    if (cameraYaw !== undefined) {
        // In canvas space: look dir = (-sin(yaw), -cos(yaw)) → atan2(dy, dx)
        const lookAngle = Math.atan2(-Math.cos(cameraYaw), -Math.sin(cameraYaw));
        const halfFOV = Math.PI / 5; // ~36° half-angle (72° total)
        const coneLen = SCALE * 4.5;

        // Filled wedge
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.arc(px, pz, coneLen, lookAngle - halfFOV, lookAngle + halfFOV);
        ctx.closePath();
        ctx.fillStyle = 'rgba(220, 170, 80, 0.14)';
        ctx.fill();

        // Edge lines of the cone
        ctx.strokeStyle = 'rgba(220, 170, 80, 0.30)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(px + Math.cos(lookAngle - halfFOV) * coneLen,
                   pz + Math.sin(lookAngle - halfFOV) * coneLen);
        ctx.moveTo(px, pz);
        ctx.lineTo(px + Math.cos(lookAngle + halfFOV) * coneLen,
                   pz + Math.sin(lookAngle + halfFOV) * coneLen);
        ctx.stroke();

        // Center direction line
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.70)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(px + Math.cos(lookAngle) * coneLen * 0.85,
                   pz + Math.sin(lookAngle) * coneLen * 0.85);
        ctx.stroke();
    }

    ctx.fillStyle = '#aa6622';
    ctx.shadowColor = '#aa6622';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    ctx.arc(px, pz, pr, angle + mouth, angle + Math.PI * 2 - mouth);
    ctx.lineTo(px, pz);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
}
