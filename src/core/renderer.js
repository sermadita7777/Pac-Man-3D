import * as THREE from 'three';

const SHADOW_MAP_SIZE = 1024;
const EYE_HEIGHT = 0.55;
const PITCH_LIMIT = Math.PI * 0.45;
const CAM_LERP = 18;

let yaw = -Math.PI / 2;
let pitch = 0;

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return renderer;
}

export function createScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020208);
    scene.fog = new THREE.FogExp2(0x020210, 0.10);

    const ambient = new THREE.AmbientLight(0x0a0a2a, 0.35);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x0808aa, 0x020206, 0.15);
    scene.add(hemi);

    return scene;
}

export function createCamera() {
    const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.05, 50);
    camera.position.set(14, EYE_HEIGHT, 22);
    camera.rotation.order = 'YXZ';

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    return camera;
}

export function updateFPSCamera(camera, player, dt, mouseDelta) {
    yaw -= mouseDelta.dx;
    pitch -= mouseDelta.dy;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

    const targetX = player.x;
    const targetZ = player.z;
    const lerpFactor = Math.min(1, dt * CAM_LERP);

    camera.position.x += (targetX - camera.position.x) * lerpFactor;
    camera.position.y += (EYE_HEIGHT - camera.position.y) * lerpFactor;
    camera.position.z += (targetZ - camera.position.z) * lerpFactor;

    _euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(_euler);
}

export function getYaw() {
    return yaw;
}

export function resetFPSCamera(player) {
    yaw = -Math.PI / 2;
    pitch = 0;
}
