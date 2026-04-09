const keys = {};
const justPressed = new Set();
let mouseX = 0;
let mouseY = 0;
let mouseDX = 0;
let mouseDY = 0;
let pointerLocked = false;
const SENSITIVITY = 0.002;

export function initInput(canvas) {
    window.addEventListener('keydown', (e) => {
        if (!keys[e.code]) justPressed.add(e.code);
        keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    canvas.addEventListener('click', () => {
        if (!pointerLocked) {
            canvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        pointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
        if (!pointerLocked) return;
        mouseDX += e.movementX * SENSITIVITY;
        mouseDY += e.movementY * SENSITIVITY;
    });
}

export function consumeMouse() {
    const dx = mouseDX;
    const dy = mouseDY;
    mouseDX = 0;
    mouseDY = 0;
    return { dx, dy };
}

export function isKeyDown(code) {
    return !!keys[code];
}

export function isEnterPressed() {
    return justPressed.has('Enter');
}

export function clearKey(code) {
    keys[code] = false;
    justPressed.delete(code);
}

export function isPointerLocked() {
    return pointerLocked;
}
