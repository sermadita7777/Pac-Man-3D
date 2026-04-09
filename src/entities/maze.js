import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const WALL_HEIGHT = 1.4;

function createWallTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark concrete/plaster base
    const baseGrad = ctx.createLinearGradient(0, 0, 0, size);
    baseGrad.addColorStop(0, '#1a1510');
    baseGrad.addColorStop(0.5, '#0e0c08');
    baseGrad.addColorStop(1, '#161210');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Brick pattern - dark, grimy
    const brickH = 20;
    const brickW = 40;
    for (let row = 0; row < size / brickH; row++) {
        const y = row * brickH;
        const offset = (row % 2) * brickW / 2;
        for (let bx = offset - brickW; bx < size + brickW; bx += brickW) {
            const shade = 12 + Math.random() * 18;
            ctx.fillStyle = `rgb(${shade + 5}, ${shade - 1}, ${shade - 4})`;
            ctx.fillRect(bx + 2, y + 2, brickW - 3, brickH - 3);

            const innerGrad = ctx.createLinearGradient(bx + 2, y + 2, bx + 2, y + brickH - 1);
            innerGrad.addColorStop(0, 'rgba(30,20,10,0.15)');
            innerGrad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
            innerGrad.addColorStop(1, 'rgba(10,5,0,0.2)');
            ctx.fillStyle = innerGrad;
            ctx.fillRect(bx + 2, y + 2, brickW - 3, brickH - 3);
        }

        ctx.strokeStyle = 'rgba(6,4,2,0.9)';
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

    // Blood stains
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 8 + Math.random() * 25;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(80,0,0,${0.12 + Math.random() * 0.2})`);
        grad.addColorStop(0.5, `rgba(50,0,0,${0.06 + Math.random() * 0.1})`);
        grad.addColorStop(1, 'rgba(30,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Blood drips
    for (let i = 0; i < 4; i++) {
        const x = Math.random() * size;
        let cy = Math.random() * size * 0.2;
        ctx.strokeStyle = `rgba(70,0,0,${0.15 + Math.random() * 0.3})`;
        ctx.lineWidth = 0.8 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(x, cy);
        while (cy < size && Math.random() > 0.04) {
            cy += 2 + Math.random() * 5;
            ctx.lineTo(x + (Math.random() - 0.5) * 3, cy);
        }
        ctx.stroke();
    }

    // Rust stains
    for (let i = 0; i < 3; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 15 + Math.random() * 30;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(60,30,10,${0.08 + Math.random() * 0.12})`);
        grad.addColorStop(1, 'rgba(40,20,5,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Cracks
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(4,3,2,${0.4 + Math.random() * 0.4})`;
        ctx.lineWidth = 0.4 + Math.random() * 0.8;
        ctx.beginPath();
        let cx = Math.random() * size;
        let cy2 = Math.random() * size;
        ctx.moveTo(cx, cy2);
        for (let j = 0; j < 10; j++) {
            cx += (Math.random() - 0.5) * 25;
            cy2 += Math.random() * 18;
            ctx.lineTo(cx, cy2);
        }
        ctx.stroke();
    }

    // Grime specks
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const b = Math.random() * 12;
        ctx.fillStyle = `rgba(${b}, ${b - 2}, ${b - 3}, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(x, y, 1 + Math.random(), 1 + Math.random());
    }

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

    // Dirty dark concrete
    ctx.fillStyle = '#050403';
    ctx.fillRect(0, 0, size, size);

    const tileSize = 64;
    for (let y = 0; y < size; y += tileSize) {
        for (let x = 0; x < size; x += tileSize) {
            const checker = ((x / tileSize) + (y / tileSize)) % 2;
            const base = checker ? 8 : 5;
            const shade = base + Math.random() * 4;
            ctx.fillStyle = `rgb(${shade + 2}, ${shade}, ${shade - 1})`;
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
    }

    // Cracks in floor
    ctx.strokeStyle = 'rgba(20,15,10,0.3)';
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

    // Blood pools on floor
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 5 + Math.random() * 20;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(40,0,0,${0.08 + Math.random() * 0.12})`);
        grad.addColorStop(1, 'rgba(20,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dirt specks
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(30,20,10,${Math.random() * 0.1})`;
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

    // Near-black ceiling
    ctx.fillStyle = '#020201';
    ctx.fillRect(0, 0, size, size);

    // Subtle panel lines
    const panelSize = 64;
    ctx.strokeStyle = 'rgba(10,8,5,0.3)';
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

    // Water stains / mold
    for (let i = 0; i < 6; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 10 + Math.random() * 30;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(15,12,5,${0.05 + Math.random() * 0.1})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
        roughness: 0.9,
        metalness: 0.05,
        emissive: 0x050201,
        emissiveIntensity: 0.02,
    });

    // Dim reddish accent strip instead of neon
    const accentMat = new THREE.MeshStandardMaterial({
        color: 0x3a0808,
        emissive: 0x2a0505,
        emissiveIntensity: 0.6,
        roughness: 0.5,
        metalness: 0.3,
    });

    const doorGeo = new THREE.BoxGeometry(1, 0.3, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0x440000,
        emissive: 0x330000,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.6,
    });

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vi = 0;

    const accentPositions = [];
    const accentNormals = [];
    const accentUvs = [];
    const accentIndices = [];
    let avi = 0;

    const ACCENT_HEIGHT = 0.03;

    const faceConfig = [
        { dr: 0, dc: 1,  nx: 1, nz: 0,  corners: (cx,cz,hw,hd) => [[cx+hw,0,cz+hd],[cx+hw,0,cz-hd],[cx+hw,WALL_HEIGHT,cz-hd],[cx+hw,WALL_HEIGHT,cz+hd]] },
        { dr: 0, dc: -1, nx:-1, nz: 0,  corners: (cx,cz,hw,hd) => [[cx-hw,0,cz-hd],[cx-hw,0,cz+hd],[cx-hw,WALL_HEIGHT,cz+hd],[cx-hw,WALL_HEIGHT,cz-hd]] },
        { dr: 1, dc: 0,  nx: 0, nz: 1,  corners: (cx,cz,hw,hd) => [[cx-hw,0,cz+hd],[cx+hw,0,cz+hd],[cx+hw,WALL_HEIGHT,cz+hd],[cx-hw,WALL_HEIGHT,cz+hd]] },
        { dr:-1, dc: 0,  nx: 0, nz:-1,  corners: (cx,cz,hw,hd) => [[cx+hw,0,cz-hd],[cx-hw,0,cz-hd],[cx-hw,WALL_HEIGHT,cz-hd],[cx+hw,WALL_HEIGHT,cz-hd]] },
    ];

    const accentStripFace = [
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

                // Dim accent strip at base only
                const aFace = accentStripFace[fi];
                const bottomStrip = aFace.strip(cx, cz, hw, hd, 0, ACCENT_HEIGHT);
                for (const c of bottomStrip) {
                    accentPositions.push(c[0], c[1], c[2]);
                    accentNormals.push(aFace.nx, 0, aFace.nz);
                }
                accentUvs.push(0,0, 1,0, 1,1, 0,1);
                accentIndices.push(avi, avi+1, avi+2, avi, avi+2, avi+3);
                avi += 4;
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

    // Ghost house door - dark red
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (MAZE_LAYOUT[row][col] === CELL.GHOST_DOOR) {
                const door = new THREE.Mesh(doorGeo, doorMat);
                door.position.set(col + 0.5, WALL_HEIGHT - 0.15, row + 0.5);
                const doorLight = new THREE.PointLight(0x660000, 0.4, 3);
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

    if (accentPositions.length > 0) {
        const accentGeo = new THREE.BufferGeometry();
        accentGeo.setAttribute('position', new THREE.Float32BufferAttribute(accentPositions, 3));
        accentGeo.setAttribute('normal', new THREE.Float32BufferAttribute(accentNormals, 3));
        accentGeo.setAttribute('uv', new THREE.Float32BufferAttribute(accentUvs, 2));
        accentGeo.setIndex(accentIndices);
        accentGeo.computeBoundingSphere();
        scene.add(new THREE.Mesh(accentGeo, accentMat));
    }

    addCorridorLighting(scene);

    const floorGeo = new THREE.PlaneGeometry(COLS, ROWS);
    const floorMat = new THREE.MeshStandardMaterial({
        map: createFloorTexture(),
        roughness: 0.95,
        metalness: 0.05,
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
        emissive: 0x010100,
        emissiveIntensity: 0.02,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.set(COLS / 2, WALL_HEIGHT, ROWS / 2);
    scene.add(ceiling);

    return wallMesh;
}

function addCorridorLighting(scene) {
    let lightCount = 0;
    const maxLights = 15;

    for (let row = 1; row < ROWS - 1 && lightCount < maxLights; row++) {
        for (let col = 1; col < COLS - 1 && lightCount < maxLights; col++) {
            if (isIntersection(row, col)) {
                // Dim, warm flickering light - like dying bulbs
                const light = new THREE.PointLight(0x331108, 0.3, 4);
                light.position.set(col + 0.5, WALL_HEIGHT - 0.1, row + 0.5);
                scene.add(light);
                lightCount++;
            }
        }
    }

    // Tunnel lights - eerie red
    const tunnelLight1 = new THREE.PointLight(0x330000, 0.3, 5);
    tunnelLight1.position.set(1, 0.7, 13.5);
    scene.add(tunnelLight1);

    const tunnelLight2 = new THREE.PointLight(0x330000, 0.3, 5);
    tunnelLight2.position.set(COLS - 1, 0.7, 13.5);
    scene.add(tunnelLight2);

    // Ghost house - sinister glow
    const houseLight = new THREE.PointLight(0x440000, 0.4, 5);
    houseLight.position.set(14, 0.8, 14);
    scene.add(houseLight);
}
