import * as THREE from 'three';
import { MAZE_LAYOUT, CELL, ROWS, COLS } from '../data/mazeData.js';

const WALL_HEIGHT = 1.4;

function createWallTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0808a0';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const brightness = Math.random() * 40;
        ctx.fillStyle = `rgba(${50 + brightness}, ${50 + brightness}, ${200 + brightness * 1.5}, 0.3)`;
        ctx.fillRect(x, y, 2, 2);
    }

    ctx.strokeStyle = '#1414cc';
    ctx.lineWidth = 2;
    const brickH = 16;
    const brickW = 32;
    for (let row = 0; row < size / brickH; row++) {
        const y = row * brickH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
        const offset = (row % 2) * brickW / 2;
        for (let x = offset; x < size; x += brickW) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + brickH);
            ctx.stroke();
        }
    }

    const edgeGrad = ctx.createLinearGradient(0, 0, 0, size);
    edgeGrad.addColorStop(0, 'rgba(100,100,255,0.15)');
    edgeGrad.addColorStop(0.5, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,50,0.2)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function createFloorTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#080812';
    ctx.fillRect(0, 0, size, size);

    const tileSize = 32;
    for (let y = 0; y < size; y += tileSize) {
        for (let x = 0; x < size; x += tileSize) {
            const shade = 8 + Math.random() * 6;
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 8})`;
            ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
    }

    ctx.strokeStyle = 'rgba(30,30,80,0.3)';
    ctx.lineWidth = 1;
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

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(COLS / 4, ROWS / 4);
    return tex;
}

function createCeilingTexture() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#030308';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 50; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 2;
        ctx.fillStyle = `rgba(100,100,200,${Math.random() * 0.15})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
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

export function buildMaze(scene) {
    const wallTex = createWallTexture();
    const wallMat = new THREE.MeshStandardMaterial({
        map: wallTex,
        roughness: 0.7,
        metalness: 0.3,
        emissive: 0x0000aa,
        emissiveIntensity: 0.08,
    });

    const doorGeo = new THREE.BoxGeometry(1, 0.3, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({
        color: 0xff88ff,
        emissive: 0xff44ff,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.7,
    });

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    let vi = 0;

    const faceConfig = [
        { dr: 0, dc: 1,  nx: 1, nz: 0,  corners: (cx,cz,hw,hd) => [[cx+hw,0,cz+hd],[cx+hw,0,cz-hd],[cx+hw,WALL_HEIGHT,cz-hd],[cx+hw,WALL_HEIGHT,cz+hd]] },
        { dr: 0, dc: -1, nx:-1, nz: 0,  corners: (cx,cz,hw,hd) => [[cx-hw,0,cz-hd],[cx-hw,0,cz+hd],[cx-hw,WALL_HEIGHT,cz+hd],[cx-hw,WALL_HEIGHT,cz-hd]] },
        { dr: 1, dc: 0,  nx: 0, nz: 1,  corners: (cx,cz,hw,hd) => [[cx-hw,0,cz+hd],[cx+hw,0,cz+hd],[cx+hw,WALL_HEIGHT,cz+hd],[cx-hw,WALL_HEIGHT,cz+hd]] },
        { dr:-1, dc: 0,  nx: 0, nz:-1,  corners: (cx,cz,hw,hd) => [[cx+hw,0,cz-hd],[cx-hw,0,cz-hd],[cx-hw,WALL_HEIGHT,cz-hd],[cx+hw,WALL_HEIGHT,cz-hd]] },
    ];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (MAZE_LAYOUT[row][col] !== CELL.WALL) continue;

            const cx = col + 0.5;
            const cz = row + 0.5;
            const hw = 0.5, hd = 0.5;

            for (const face of faceConfig) {
                if (!shouldRenderFace(row, col, face.dr, face.dc)) continue;

                const corners = face.corners(cx, cz, hw, hd);
                for (const c of corners) {
                    positions.push(c[0], c[1], c[2]);
                    normals.push(face.nx, 0, face.nz);
                }
                uvs.push(0,0, 1,0, 1,1, 0,1);
                indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
                vi += 4;
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
                const doorLight = new THREE.PointLight(0xff44ff, 0.4, 3);
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
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = -Math.PI / 2;
    ceiling.position.set(COLS / 2, WALL_HEIGHT, ROWS / 2);
    scene.add(ceiling);

    return wallMesh;
}
