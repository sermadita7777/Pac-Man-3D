import * as THREE from 'three';

const MAX_PARTICLES = 200;
const BASE_SIZE = 0.08;

let geometry, points;
const pool = [];

export function createParticleSystem(scene) {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: BASE_SIZE,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
}

export function spawnParticles(x, y, z, color, count, speed, lifetime) {
    const col = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
        if (pool.length >= MAX_PARTICLES) pool.shift();
        const angle = Math.random() * Math.PI * 2;
        const upAngle = Math.random() * Math.PI - Math.PI * 0.3;
        const spd = speed * (0.5 + Math.random() * 0.5);
        pool.push({
            x, y, z,
            vx: Math.cos(angle) * Math.cos(upAngle) * spd,
            vy: Math.sin(upAngle) * spd + 1.5,
            vz: Math.sin(angle) * Math.cos(upAngle) * spd,
            r: col.r, g: col.g, b: col.b,
            life: lifetime,
            maxLife: lifetime,
        });
    }
}

export function updateParticles(dt) {
    for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.life -= dt;
        if (p.life <= 0) { pool.splice(i, 1); continue; }
        p.vy -= 3 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
    }

    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    const siz = geometry.attributes.size.array;

    for (let i = 0; i < MAX_PARTICLES; i++) {
        if (i < pool.length) {
            const p = pool[i];
            const fade = p.life / p.maxLife;
            pos[i * 3] = p.x;
            pos[i * 3 + 1] = p.y;
            pos[i * 3 + 2] = p.z;
            col[i * 3] = p.r * fade;
            col[i * 3 + 1] = p.g * fade;
            col[i * 3 + 2] = p.b * fade;
            siz[i] = BASE_SIZE * (0.5 + fade * 0.5);
        } else {
            pos[i * 3 + 1] = -100;
            siz[i] = 0;
        }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
}
