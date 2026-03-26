import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const NEIGHBORS = [
    { dx: 0, dz: -1 },
    { dx: 0, dz: 1 },
    { dx: -1, dz: 0 },
    { dx: 1, dz: 0 },
];

export function findPath(sx, sz, ex, ez) {
    sx = clamp(sx, 0, COLS - 1);
    sz = clamp(sz, 0, ROWS - 1);
    ex = clamp(ex, 0, COLS - 1);
    ez = clamp(ez, 0, ROWS - 1);

    if (!isPassable(ex, ez)) {
        const nearest = findNearestPassable(ex, ez);
        if (!nearest) return [];
        ex = nearest.x;
        ez = nearest.z;
    }

    if (!isPassable(sx, sz)) {
        const nearest = findNearestPassable(sx, sz);
        if (!nearest) return [];
        sx = nearest.x;
        sz = nearest.z;
    }

    const open = new MinHeap();
    const closed = new Set();
    const gScore = new Map();
    const cameFrom = new Map();

    const startKey = key(sx, sz);
    gScore.set(startKey, 0);
    open.push({ x: sx, z: sz, f: heuristic(sx, sz, ex, ez) });

    while (open.size() > 0) {
        const current = open.pop();
        const ck = key(current.x, current.z);

        if (current.x === ex && current.z === ez) {
            return reconstructPath(cameFrom, current);
        }

        if (closed.has(ck)) continue;
        closed.add(ck);

        for (const n of NEIGHBORS) {
            const nx = current.x + n.dx;
            const nz = current.z + n.dz;

            if (nx < 0 || nx >= COLS || nz < 0 || nz >= ROWS) continue;
            if (!isPassable(nx, nz)) continue;

            const nk = key(nx, nz);
            if (closed.has(nk)) continue;

            const tentG = (gScore.get(ck) || 0) + 1;
            if (tentG < (gScore.get(nk) ?? Infinity)) {
                gScore.set(nk, tentG);
                cameFrom.set(nk, { x: current.x, z: current.z });
                open.push({ x: nx, z: nz, f: tentG + heuristic(nx, nz, ex, ez) });
            }
        }
    }

    return [];
}

function isPassable(x, z) {
    const cell = MAZE_LAYOUT[z]?.[x];
    return cell !== undefined && cell !== CELL.WALL;
}

function findNearestPassable(x, z) {
    for (let r = 1; r < 5; r++) {
        for (let dz = -r; dz <= r; dz++) {
            for (let dx = -r; dx <= r; dx++) {
                if (isPassable(x + dx, z + dz)) {
                    return { x: x + dx, z: z + dz };
                }
            }
        }
    }
    return null;
}

function reconstructPath(cameFrom, end) {
    const path = [{ x: end.x, z: end.z }];
    let ck = key(end.x, end.z);
    while (cameFrom.has(ck)) {
        const prev = cameFrom.get(ck);
        path.unshift({ x: prev.x, z: prev.z });
        ck = key(prev.x, prev.z);
    }
    return path;
}

function heuristic(ax, az, bx, bz) {
    return Math.abs(ax - bx) + Math.abs(az - bz);
}

function key(x, z) {
    return z * COLS + x;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

class MinHeap {
    constructor() { this.data = []; }
    size() { return this.data.length; }
    push(node) {
        this.data.push(node);
        this._up(this.data.length - 1);
    }
    pop() {
        const top = this.data[0];
        const last = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = last;
            this._down(0);
        }
        return top;
    }
    _up(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.data[p].f <= this.data[i].f) break;
            [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
            i = p;
        }
    }
    _down(i) {
        const n = this.data.length;
        while (true) {
            let s = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.data[l].f < this.data[s].f) s = l;
            if (r < n && this.data[r].f < this.data[s].f) s = r;
            if (s === i) break;
            [this.data[s], this.data[i]] = [this.data[i], this.data[s]];
            i = s;
        }
    }
}
