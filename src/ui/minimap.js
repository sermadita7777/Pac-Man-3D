import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const SCALE = 4;
const PADDING = 16;
let canvas, ctx;

export function createMinimap() {
    canvas = document.createElement('canvas');
    canvas.id = 'minimap';
    canvas.width = COLS * SCALE;
    canvas.height = ROWS * SCALE;
    canvas.style.cssText = `
        position: fixed;
        bottom: ${PADDING}px;
        right: ${PADDING}px;
        z-index: 15;
        border: 1px solid rgba(0,100,255,0.4);
        border-radius: 4px;
        opacity: 0.8;
        image-rendering: pixelated;
    `;
    document.getElementById('game-container').appendChild(canvas);
    ctx = canvas.getContext('2d');
    drawStatic();
}

function drawStatic() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = MAZE_LAYOUT[row][col];
            if (cell === CELL.WALL) {
                ctx.fillStyle = '#1818aa';
                ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
            } else if (cell === CELL.GHOST_DOOR) {
                ctx.fillStyle = '#ff44ff';
                ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
            }
        }
    }
}

export function updateMinimap(player, ghosts, pellets) {
    drawStatic();

    ctx.fillStyle = 'rgba(255,255,150,0.5)';
    for (const dot of pellets.dots) {
        if (!dot.active) continue;
        ctx.fillRect(dot.col * SCALE + 1, dot.row * SCALE + 1, SCALE - 2, SCALE - 2);
    }

    ctx.fillStyle = '#ffaa00';
    for (const pow of pellets.powers) {
        if (!pow.active) continue;
        ctx.fillRect(pow.col * SCALE, pow.row * SCALE, SCALE, SCALE);
    }

    for (const ghost of ghosts) {
        const colors = {
            blinky: '#ff0000',
            pinky: '#ffb8ff',
            inky: '#00ffff',
            clyde: '#ffb852',
        };
        ctx.fillStyle = ghost.state === 2 ? '#2222ff' : (colors[ghost.name] || '#ff0000');
        ctx.fillRect(
            ghost.x * SCALE - SCALE / 2,
            ghost.z * SCALE - SCALE / 2,
            SCALE, SCALE
        );
    }

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(player.x * SCALE, player.z * SCALE, SCALE, 0, Math.PI * 2);
    ctx.fill();

    const angle = { up: -Math.PI/2, down: Math.PI/2, left: Math.PI, right: 0 }[player.direction] ?? 0;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(player.x * SCALE, player.z * SCALE);
    ctx.lineTo(
        player.x * SCALE + Math.cos(angle) * SCALE * 2.5,
        player.z * SCALE + Math.sin(angle) * SCALE * 2.5
    );
    ctx.stroke();
}
