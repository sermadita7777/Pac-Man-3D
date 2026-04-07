import * as THREE from 'three';

const FRUIT_TYPES = [
    { name: 'cherry', color: 0xff0000, emissive: 0xaa0000, score: 100 },
    { name: 'strawberry', color: 0xff3366, emissive: 0xaa2244, score: 300 },
    { name: 'orange', color: 0xff8800, emissive: 0xaa5500, score: 500 },
    { name: 'apple', color: 0x00ff00, emissive: 0x00aa00, score: 700 },
    { name: 'melon', color: 0x44ff88, emissive: 0x22aa44, score: 1000 },
    { name: 'galaxian', color: 0x4488ff, emissive: 0x2244aa, score: 2000 },
    { name: 'bell', color: 0xffff00, emissive: 0xaaaa00, score: 3000 },
    { name: 'key', color: 0x8888ff, emissive: 0x4444aa, score: 5000 },
];

const SPAWN_X = 13.5;
const SPAWN_Z = 17.5;
const RADIUS = 0.25;
const DESPAWN_TIME = 10;
const PELLETS_TO_SPAWN = [70, 170];

export function createFruit(scene) {
    const group = new THREE.Group();
    group.visible = false;

    const geo = new THREE.DodecahedronGeometry(RADIUS, 1);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xaa0000,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);

    const light = new THREE.PointLight(0xff0000, 1.0, 5);
    light.position.y = 0.3;
    group.add(light);

    group.position.set(SPAWN_X, RADIUS + 0.05, SPAWN_Z);
    scene.add(group);

    return {
        group,
        mesh,
        mat,
        light,
        active: false,
        timer: 0,
        x: SPAWN_X,
        z: SPAWN_Z,
        score: 0,
        spawnCount: 0,
        pelletsEaten: 0,
        nextSpawnAt: PELLETS_TO_SPAWN[0],
    };
}

export function updateFruit(fruit, dt) {
    if (!fruit.active) return;

    fruit.timer -= dt;
    if (fruit.timer <= 0) {
        fruit.active = false;
        fruit.group.visible = false;
        return;
    }

    const t = Date.now() * 0.003;
    fruit.group.position.y = RADIUS + 0.05 + Math.sin(t) * 0.08;
    fruit.mesh.rotation.y += dt * 2;
    fruit.mesh.rotation.x = Math.sin(t * 0.7) * 0.2;

    if (fruit.timer < 3) {
        fruit.group.visible = Math.sin(Date.now() * 0.01) > 0;
    }

    fruit.light.intensity = 0.8 + Math.sin(t * 2) * 0.4;
}

export function notifyPelletEaten(fruit, level) {
    fruit.pelletsEaten++;
    if (fruit.active || fruit.nextSpawnAt === null) return;

    if (fruit.pelletsEaten >= fruit.nextSpawnAt) {
        const typeIndex = Math.min(level - 1, FRUIT_TYPES.length - 1);
        const type = FRUIT_TYPES[typeIndex];
        fruit.mat.color.setHex(type.color);
        fruit.mat.emissive.setHex(type.emissive);
        fruit.light.color.setHex(type.color);
        fruit.score = type.score;
        fruit.active = true;
        fruit.timer = DESPAWN_TIME;
        fruit.group.visible = true;

        fruit.spawnCount++;
        fruit.nextSpawnAt = fruit.spawnCount < PELLETS_TO_SPAWN.length
            ? PELLETS_TO_SPAWN[fruit.spawnCount]
            : null;
    }
}

export function checkFruitCollision(player, fruit) {
    if (!fruit.active) return 0;
    const dx = player.x - fruit.x;
    const dz = player.z - fruit.z;
    if (Math.sqrt(dx * dx + dz * dz) < 0.6) {
        fruit.active = false;
        fruit.group.visible = false;
        return fruit.score;
    }
    return 0;
}

export function resetFruit(fruit) {
    fruit.active = false;
    fruit.timer = 0;
    fruit.group.visible = false;
    fruit.spawnCount = 0;
    fruit.pelletsEaten = 0;
    fruit.nextSpawnAt = PELLETS_TO_SPAWN[0];
}
