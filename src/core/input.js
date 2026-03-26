const keys = {};
let lastDirection = null;
let queuedDirection = null;

const KEY_MAP = {
    'ArrowUp': 'up', 'KeyW': 'up',
    'ArrowDown': 'down', 'KeyS': 'down',
    'ArrowLeft': 'left', 'KeyA': 'left',
    'ArrowRight': 'right', 'KeyD': 'right',
};

export function initInput() {
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        const dir = KEY_MAP[e.code];
        if (dir) {
            queuedDirection = dir;
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
}

export function getQueuedDirection() {
    return queuedDirection;
}

export function consumeDirection() {
    const dir = queuedDirection;
    queuedDirection = null;
    return dir;
}

export function setQueuedDirection(dir) {
    queuedDirection = dir;
}

export function isKeyDown(code) {
    return !!keys[code];
}

export function isEnterPressed() {
    return !!keys['Enter'];
}

export function clearKey(code) {
    keys[code] = false;
}
