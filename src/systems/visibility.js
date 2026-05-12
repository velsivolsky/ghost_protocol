import { TILE_TYPES } from '../core/constants.js';
import { G } from '../core/state.js';

export function updateVisibility() {
  if (!G.P) return;

  G.visible.clear();

  const p = G.P;
  const radius = 10;
  const rays = Math.max(128, radius * 24);

  markVisibleTile(p.x | 0, p.y | 0);

  for (let index = 0; index < rays; index += 1) {
    const angle = (index / rays) * Math.PI * 2;
    castRay(
      p.x + 0.5,
      p.y + 0.5,
      p.x + 0.5 + Math.cos(angle) * radius,
      p.y + 0.5 + Math.sin(angle) * radius,
    );
  }

  for (const device of G.devices) {
    if (G.visible.has(`${device.x | 0},${device.y | 0}`)) {
      G.seenDevices.add(device.id);
    }
  }
}

function castRay(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 4));
  const stepX = dx / steps;
  const stepY = dy / steps;

  let x = x0;
  let y = y0;

  for (let index = 0; index <= steps; index += 1) {
    const tileX = x | 0;
    const tileY = y | 0;

    if (!markVisibleTile(tileX, tileY)) {
      return;
    }

    const tile = G.tiles[tileY]?.[tileX];

    if (tile === TILE_TYPES.WALL || tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.WALL_TERMINAL) {
      return;
    }

    x += stepX;
    y += stepY;
  }
}

function markVisibleTile(tileX, tileY) {
  if (tileX < 0 || tileY < 0 || tileX >= G.tiles[0]?.length || tileY >= G.tiles.length) {
    return false;
  }

  const key = `${tileX},${tileY}`;

  G.visible.add(key);
  G.explored.add(key);

  return true;
}