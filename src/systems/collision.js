import { STATE } from '../entities/ghost.js';

const PELLET_RANGE = 0.5;
const GHOST_RANGE = 0.7;

export function checkPelletCollisions(player, pellets) {
    const eaten = { dots: 0, powers: 0 };

    for (const dot of pellets.dots) {
        if (!dot.active) continue;
        if (dist(player.x, player.z, dot.col + 0.5, dot.row + 0.5) < PELLET_RANGE) {
            dot.active = false;
            dot.mesh.visible = false;
            eaten.dots++;
        }
    }

    for (const pow of pellets.powers) {
        if (!pow.active) continue;
        if (dist(player.x, player.z, pow.col + 0.5, pow.row + 0.5) < PELLET_RANGE) {
            pow.active = false;
            pow.mesh.visible = false;
            pow.light.intensity = 0;
            eaten.powers++;
        }
    }

    return eaten;
}

export function checkGhostCollisions(player, ghosts) {
    const result = { died: false, ghostsEaten: 0, eatenPositions: [] };

    for (const ghost of ghosts) {
        if (ghost.state === STATE.EATEN || ghost.state === STATE.HOUSE) continue;

        if (dist(player.x, player.z, ghost.x, ghost.z) < GHOST_RANGE) {
            if (ghost.state === STATE.FRIGHTENED) {
                ghost.state = STATE.EATEN;
                result.ghostsEaten++;
                result.eatenPositions.push({ x: ghost.x, z: ghost.z });
            } else {
                result.died = true;
                break;
            }
        }
    }

    return result;
}

function dist(x1, z1, x2, z2) {
    const dx = x1 - x2;
    const dz = z1 - z2;
    return Math.sqrt(dx * dx + dz * dz);
}
