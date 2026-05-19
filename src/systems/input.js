import { G } from '../core/state.js';
import { TILE_TYPES } from '../core/constants.js';
import { closeCtx, handleCanvasClick } from './hacking.js';
import { cycleWallRenderQuality, patchTileFlat, setWallRenderQuality } from './render.js';
import { log } from './ui.js';
import {
  autocompleteTerminalInput,
  closeTerminalOverlay,
  isTerminalOverlayOpen,
  toggleTerminalOverlay,
} from './terminalRuntime.js';

let bound = false;

export function bindInput() {
  if (bound) {
    return;
  }

  bound = true;

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === 'Tab') {
      const inputFocused = event.target === G.dom.terminalInput;
      event.preventDefault();

      if (isTerminalOverlayOpen() && inputFocused) {
        autocompleteTerminalInput();
      } else {
        toggleTerminalOverlay();
      }
      return;
    }

    if (event.key === 'Escape' && isTerminalOverlayOpen()) {
      event.preventDefault();
      closeTerminalOverlay();
      closeCtx();
      return;
    }

    if (event.key === 'F6') {
      event.preventDefault();
      cycleWallRenderQuality(G);
      return;
    }

    if (event.key === 'F7') {
      event.preventDefault();
      setWallRenderQuality(G, 'fast');
      return;
    }

    if (event.key === 'F8') {
      event.preventDefault();
      setWallRenderQuality(G, 'balanced');
      return;
    }

    if ((event.key === 'e' || event.key === 'E') && !event.repeat) {
      if (!isTerminalOverlayOpen()) {
        event.preventDefault();
        interactWithNearestDoor();
        return;
      }
    }

    G.keys[event.key] = true;

    if (event.key === 'Escape') {
      closeCtx();
    }
  });

  document.addEventListener('keyup', (event) => {
    delete G.keys[event.key];
  });

  document.addEventListener('click', (event) => {
    if (G.ctxOpen && !G.dom.contextMenu.contains(event.target)) {
      closeCtx();
    }
  });

  G.canvas.addEventListener('click', (event) => {
    handleCanvasClick(event);
  });
}

function interactWithNearestDoor() {
  if (!G.P || G.dead || G.cleared || G.menuActive || isTerminalOverlayOpen()) {
    return;
  }

  // Check for nearby elevator (STAIR) tiles first
  const px = G.P.x;
  const py = G.P.y;
  const tileX = px | 0;
  const tileY = py | 0;
  let nearestStair = null;
  let nearestStairDist = Infinity;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = tileX + dx;
      const ty = tileY + dy;
      const t = G.tiles?.[ty]?.[tx];
      if (t === TILE_TYPES.STAIR_UP || t === TILE_TYPES.STAIR_DOWN) {
        const dist = Math.hypot((tx + 0.5) - px, (ty + 0.5) - py);
        if (dist < 1.35 && dist < nearestStairDist) {
          nearestStairDist = dist;
          nearestStair = { x: tx, y: ty, tile: t };
        }
      }
    }
  }
  if (nearestStair) {
    G.stairTransitionTargetTile = nearestStair.tile;
    G.stairTransitionRequested = true;
    return;
  }

  const nearestDoor = (G.doors || [])
    .slice()
    .sort((a, b) => {
      const adx = (a.x + 0.5) - G.P.x;
      const ady = (a.y + 0.5) - G.P.y;
      const bdx = (b.x + 0.5) - G.P.x;
      const bdy = (b.y + 0.5) - G.P.y;
      return (adx * adx + ady * ady) - (bdx * bdx + bdy * bdy);
    })[0];

  if (!nearestDoor) {
    return;
  }

  const dx = (nearestDoor.x + 0.5) - G.P.x;
  const dy = (nearestDoor.y + 0.5) - G.P.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 1.35) {
    return;
  }

  if (!nearestDoor.unlocked) {
    log(`Drzwi ${nearestDoor.id}: panel zablokowany. Odblokuj: connect panel_# -> unlock`, 'w');
    return;
  }

  nearestDoor.open = !nearestDoor.open;
  const newTile = nearestDoor.open ? TILE_TYPES.DOOR_OPEN : TILE_TYPES.DOOR_CLOSED;
  G.tiles[nearestDoor.y][nearestDoor.x] = newTile;
  patchTileFlat(nearestDoor.x, nearestDoor.y, newTile);
  log(`Drzwi ${nearestDoor.id} ${nearestDoor.open ? 'otwarte' : 'zamkniete'} [E]`, 'ok');
}