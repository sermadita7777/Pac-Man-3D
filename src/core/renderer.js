import * as THREE from 'three';

const SHADOW_MAP_SIZE = 1024;
const EYE_HEIGHT = 0.55;

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return renderer;
}

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x020208, 0.12);

    const ambient = new THREE.AmbientLight(0x111133, 0.3);
    scene.add(ambient);

    return scene;
}

export function createCamera() {
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.05, 50);
    camera.position.set(14, EYE_HEIGHT, 22);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    return camera;
}

const _lookTarget = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const DIR_ANGLES = {
    up: Math.PI,
    down: 0,
    left: -Math.PI / 2,
    right: Math.PI / 2,
};

let currentAngle = 0;

export function updateFPSCamera(camera, player, dt) {
    const targetAngle = DIR_ANGLES[player.direction] ?? 0;

    let diff = targetAngle - currentAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    currentAngle += diff * Math.min(1, dt * 12);

    _camPos.set(player.x, EYE_HEIGHT, player.z);
    camera.position.lerp(_camPos, Math.min(1, dt * 15));

    _lookTarget.set(
        camera.position.x + Math.sin(currentAngle) * 2,
        EYE_HEIGHT - 0.05,
        camera.position.z + Math.cos(currentAngle) * 2
    );
    camera.lookAt(_lookTarget);
}

export function resetFPSCamera(player) {
    currentAngle = DIR_ANGLES[player.direction] ?? 0;
}
