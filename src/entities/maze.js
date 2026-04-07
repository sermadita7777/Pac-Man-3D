import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const WALL_HEIGHT = 1.4;
const NEON_STRIP_HEIGHT = 0.04;
const NEON_COLOR = 0x2244ff;
const NEON_COLOR_ALT = 0x6622cc;

function createWallTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const baseGrad = ctx.createLinearGradient(0, 0, 0, size);
    baseGrad.addColorStop(0, '#0a0a60');
    baseGrad.addColorStop(0.5, '#060640');
    baseGrad.addColorStop(1, '#080850');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    const brickH = 20;
    const brickW = 40;
    for (let row = 0; row < size / brickH; row++) {
        const y = row * brickH;
        const offset = (row % 2) * brickW / 2;
        for (let bx = offset - brickW; bx < size + brickW; bx += brickW) {
            const shade = 30 + Math.random() * 25;
            const bShade = 100 + Math.random() * 80;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${bShade})`;
            ctx.fillRect(bx + 2, y + 2, brickW - 3, brickH - 3);

            const innerGrad = ctx.createLinearGradient(bx + 2, y + 2, bx + 2, y + brickH - 1);
            innerGrad.addColorStop(0, 'rgba(120,120,255,0.12)');
            innerGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
            innerGrad.addColorStop(1, 'rgba(0,0,30,0.15)');
            ctx.fillStyle = innerGrad;
            ctx.fillRect(bx + 2, y + 2, brickW - 3, brickH - 3);
        }

        ctx.strokeStyle = 'rgba(20,20,50,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
        for (let bx = offset; bx < size; bx += brickW) {
            ctx.beginPath();
            ctx.moveTo(bx, y);
            ctx.lineTo(bx, y + brickH);
            ctx.stroke();
        }
    }

    for (let i = 0; i < 300; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const brightness = Math.random() * 30;
        ctx.fillStyle = `rgba(${40 + brightness}, ${40 + brightness}, ${160 + brightness}, ${0.15 + Math.random() * 0.15})`;
        ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }

    const topGlow = ctx.createLinearGradient(0, 0, 0, 30);
    topGlow.addColorStop(0, 'rgba(80,80,255,0.2)');
    topGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, size, 30);

    const bottomGlow = ctx.createLinearGradient(0, size - 30, 0, size);
    bottomGlow.addColorStop(0, 'rgba(0,0,0,0)');
    bottomGlow.addColorStop(1, 'rgba(80,40,200,0.15)');
    ctx.fillStyle = bottomGlow;
    ctx.fillRect(0, size - 30, size, 30);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
}

function createFloorTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#06060e';
    ctx.fillRect(0, 0, size, size);

    const tileSize = 64;
    for (let y = 0; y < size; y += tileSize) {
        for (let x = 0; x < size; x += tileSize) {
            const checker = ((x / tileSize) + (y / tileSize)) % 2;
            const base = checker ? 10 : 7;
            const shade = base + Math.random() * 4;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 6})`;
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

            const tileGrad = ctx.createRadialGradient(
                x + tileSize / 2, y + tileSize / 2, 0,
                x + tileSize / 2, y + tileSize / 2, tileSize * 0.6
            );
            tileGrad.addColorStop(0, 'rgba(40,40,100,0.06)');
            tileGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
            ctx.fillStyle = tileGrad;
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
    }

    ctx.strokeStyle = 'rgba(30,30,80,0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= size; i += tileSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
    }

    for (let i = 0; i < 100; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(60,60,140,${Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(COLS / 4, ROWS / 4);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
}

function createCeilingTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#020206';
    ctx.fillRect(0, 0, size, size);

    const panelSize = 64;
    ctx.strokeStyle = 'rgba(20,20,50,0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += panelSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
    }

    for (let i = 0; i < 80; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 0.5 + Math.random() * 1.5;
        const bright = Math.random();
        ctx.fillStyle = `rgba(${80 + bright * 40},${80 + bright * 40},${180 + bright * 60},${0.05 + bright * 0.1})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    for (let y = 0; y < size; y += panelSize) {
        for (let x = 0; x < size; x += panelSize) {
            if (Math.random() < 0.15) {
                const glow = ctx.createRadialGradient(
                    x + panelSize / 2, y + panelSize / 2, 0,
                    x + panelSize / 2, y + panelSize / 2, panelSize * 0.4
                );
                glow.addColorStop(0, 'rgba(40,40,120,0.08)');
                glow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(x, y, panelSize, panelSize);
            }
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(COLS / 4, ROWS / 4);
    return tex;
}

function shouldRenderFace(row, col, dr, dc) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return true;
    return MAZE_LAYOUT[nr][nc] !== CELL.WALL;
}

function isIntersection(row, col) {
    if (MAZE_LAYOUT[row][col] === CELL.WALL) return false;
    let openDirs = 0;
    if (row > 0 && MAZE_LAYOUT[row - 1][col] !== CELL.WALL) openDirs++;
    if (row < ROWS - 1 && MAZE_LAYOUT[row + 1][col] !== CELL.WALL) openDirs++;
    if (col > 0 && MAZE_LAYOUT[row][col - 1] !== CELL.WALL) openDirs++;
    if (col < COLS - 1 && MAZE_LAYOUT[row][col + 1] !== CELL.WALL) openDirs++;
    return openDirs >= 3;
}

export function buildMaze(scene) {
    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.65,
        metalness: 0.35,
        emissive: 0x0808aa,
        emissiveIntensity: 0.06,
    });

    const neonMat = new THREE.MeshStandardMaterial({
        color: NEON_COLOR,
        emissive: NEON_COLOR,
        emissiveIntensity: 2.0,
        roughness: 0.2,
        metalness: 0.8,
    });

    const neonAltMat = new THREE.MeshStandardMaterial({
        color: NEON_COLOR_ALT,
        emissive: NEON_COLOR_ALT,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.8,
    });

    const doorGeo = new THREE.BoxGeometry(1, 0.3, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0xff88ff,
        emissive: 0xff44ff,
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.7,
    });

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vi = 0;

    const neonPositions = [];
    const neonNormals = [];
    const neonUvs = [];
    const neonIndices = [];
    let nvi = 0;

    const faceConfig = [
        { dr: 0, dc: 1,  nx: 1, nz: 0,  corners: (cx,cz,hw,hd) => [[cx+hw,0,cz+hd],[cx+hw,0,cz-hd],[cx+hw,WALL_HEIGHT,cz-hd],[cx+hw,WALL_HEIGHT,cz+hd]] },
        { dr: 0, dc: -1, nx:-1, nz: 0,  corners: (cx,cz,hw,hd) => [[cx-hw,0,cz-hd],[cx-hw,0,cz+hd],[cx-hw,WALL_HEIGHT,cz+hd],[cx-hw,WALL_HEIGHT,cz-hd]] },
        { dr: 1, dc: 0,  nx: 0, nz: 1,  corners: (cx,cz,hw,hd) => [[cx-hw,0,cz+hd],[cx+hw,0,cz+hd],[cx+hw,WALL_HEIGHT,cz+hd],[cx-hw,WALL_HEIGHT,cz+hd]] },
        { dr:-1, dc: 0,  nx: 0, nz:-1,  corners: (cx,cz,hw,hd) => [[cx+hw,0,cz-hd],[cx-hw,0,cz-hd],[cx-hw,WALL_HEIGHT,cz-hd],[cx+hw,WALL_HEIGHT,cz-hd]] },
    ];

    const neonStripFace = [
        { dr: 0, dc: 1,  nx: 1, nz: 0,  strip: (cx,cz,hw,hd,yb,yt) => [[cx+hw+0.005,yb,cz+hd],[cx+hw+0.005,yb,cz-hd],[cx+hw+0.005,yt,cz-hd],[cx+hw+0.005,yt,cz+hd]] },
        { dr: 0, dc: -1, nx:-1, nz: 0,  strip: (cx,cz,hw,hd,yb,yt) => [[cx-hw-0.005,yb,cz-hd],[cx-hw-0.005,yb,cz+hd],[cx-hw-0.005,yt,cz+hd],[cx-hw-0.005,yt,cz-hd]] },
        { dr: 1, dc: 0,  nx: 0, nz: 1,  strip: (cx,cz,hw,hd,yb,yt) => [[cx-hw,yb,cz+hd+0.005],[cx+hw,yb,cz+hd+0.005],[cx+hw,yt,cz+hd+0.005],[cx-hw,yt,cz+hd+0.005]] },
        { dr:-1, dc: 0,  nx: 0, nz:-1,  strip: (cx,cz,hw,hd,yb,yt) => [[cx+hw,yb,cz-hd-0.005],[cx-hw,yb,cz-hd-0.005],[cx-hw,yt,cz-hd-0.005],[cx+hw,yt,cz-hd-0.005]] },
    ];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (MAZE_LAYOUT[row][col] !== CELL.WALL) continue;

            const cx = col + 0.5;
            const cz = row + 0.5;
            const hw = 0.5, hd = 0.5;

            for (let fi = 0; fi < faceConfig.length; fi++) {
                const face = faceConfig[fi];
                if (!shouldRenderFace(row, col, face.dr, face.dc)) continue;

                const corners = face.corners(cx, cz, hw, hd);
                for (const c of corners) {
                    positions.push(c[0], c[1], c[2]);
                    normals.push(face.nx, 0, face.nz);
                }
                uvs.push(0,0, 1,0, 1,1, 0,1);
                indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
                vi += 4;

                const nFace = neonStripFace[fi];
                const bottomStrip = nFace.strip(cx, cz, hw, hd, 0, NEON_STRIP_HEIGHT);
                for (const c of bottomStrip) {
                    neonPositions.push(c[0], c[1], c[2]);
                    neonNormals.push(nFace.nx, 0, nFace.nz);
                }
                neonUvs.push(0,0, 1,0, 1,1, 0,1);
                neonIndices.push(nvi, nvi+1, nvi+2, nvi, nvi+2, nvi+3);
                nvi += 4;

                const topStrip = nFace.strip(cx, cz, hw, hd, WALL_HEIGHT - NEON_STRIP_HEIGHT, WALL_HEIGHT);
                for (const c of topStrip) {
                    neonPositions.push(c[0], c[1], c[2]);
                    neonNormals.push(nFace.nx, 0, nFace.nz);
                }
                neonUvs.push(0,0, 1,0, 1,1, 0,1);
                neonIndices.push(nvi, nvi+1, nvi+2, nvi, nvi+2, nvi+3);
                nvi += 4;
            }

            const topCorners = [
                [cx-hw, WALL_HEIGHT, cz+hd],
                [cx+hw, WALL_HEIGHT, cz+hd],
                [cx+hw, WALL_HEIGHT, cz-hd],
                [cx-hw, WALL_HEIGHT, cz-hd],
            ];
            for (const c of topCorners) {
                positions.push(c[0], c[1], c[2]);
                normals.push(0, 1, 0);
            }
            uvs.push(0,0, 1,0, 1,1, 0,1);
            indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
            vi += 4;
        }
    }

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (MAZE_LAYOUT[row][col] === CELL.GHOST_DOOR) {
                const door = new THREE.Mesh(doorGeo, doorMat);
                door.position.set(col + 0.5, WALL_HEIGHT - 0.15, row + 0.5);
                const doorLight = new THREE.PointLight(0xff44ff, 0.6, 4);
                doorLight.position.set(col + 0.5, WALL_HEIGHT, row + 0.5);
                scene.add(door);
                scene.add(doorLight);
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const wallMesh = new THREE.Mesh(geometry, wallMat);
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    if (neonPositions.length > 0) {
        const neonGeo = new THREE.BufferGeometry();
        neonGeo.setAttribute('position', new THREE.Float32BufferAttribute(neonPositions, 3));
        neonGeo.setAttribute('normal', new THREE.Float32BufferAttribute(neonNormals, 3));
        neonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(neonUvs, 2));
        neonGeo.setIndex(neonIndices);
        neonGeo.computeBoundingSphere();

        const neonMesh = new THREE.Mesh(neonGeo, neonMat);
        scene.add(neonMesh);
    }

    addCorridorLighting(scene);

    const floorGeo = new THREE.PlaneGeometry(COLS, ROWS);
    const floorMat = new THREE.MeshStandardMaterial({
        map: createFloorTexture(),
        roughness: 0.85,
        metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(COLS / 2, 0, ROWS / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(COLS, ROWS);
    const ceilMat = new THREE.MeshStandardMaterial({
        map: createCeilingTexture(),
        roughness: 1,
        side: THREE.BackSide,
        emissive: 0x020210,
        emissiveIntensity: 0.1,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.set(COLS / 2, WALL_HEIGHT, ROWS / 2);
    scene.add(ceiling);

    return wallMesh;
}

function addCorridorLighting(scene) {
    let lightCount = 0;
    const maxLights = 20;

    for (let row = 1; row < ROWS - 1 && lightCount < maxLights; row++) {
        for (let col = 1; col < COLS - 1 && lightCount < maxLights; col++) {
            if (isIntersection(row, col)) {
                const light = new THREE.PointLight(0x1a1a66, 0.25, 5);
                light.position.set(col + 0.5, WALL_HEIGHT - 0.1, row + 0.5);
                scene.add(light);
                lightCount++;
            }
        }
    }

    const tunnelLight1 = new THREE.PointLight(0x4444aa, 0.4, 6);
    tunnelLight1.position.set(1, 0.7, 13.5);
    scene.add(tunnelLight1);

    const tunnelLight2 = new THREE.PointLight(0x4444aa, 0.4, 6);
    tunnelLight2.position.set(COLS - 1, 0.7, 13.5);
    scene.add(tunnelLight2);

    const houseLight = new THREE.PointLight(0x6622aa, 0.5, 6);
    houseLight.position.set(14, 0.8, 14);
    scene.add(houseLight);
}
