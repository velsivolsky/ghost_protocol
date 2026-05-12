import { G } from '../core/state.js';
import { TILE, TILE_TYPES } from '../core/constants.js';
import { closeCtx, handleCanvasClick } from './hacking.js';

let bound = false;

export function bindInput() {
  if (bound) {
    return;
  }

  bound = true;

  document.addEventListener('keydown', (event) => {
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

  G.canvas.addEventListener('click', handleCanvasClick);
  G.canvas.addEventListener('mousemove', handleCanvasHover);
  G.canvas.addEventListener('mouseleave', clearCanvasHover);
}

function clearCanvasHover() {
  G.hoverInfo = null;
}

function handleCanvasHover(event) {
  if (!G.P || G.dead || G.cleared) {
    G.hoverInfo = null;
    return;
  }

  const rect = G.canvas.getBoundingClientRect();
  const worldX = (event.clientX - rect.left) / TILE + G.cam.x;
  const worldY = (event.clientY - rect.top) / TILE + G.cam.y;
  const tileX = worldX | 0;
  const tileY = worldY | 0;
  const tile = G.tiles[tileY]?.[tileX];
  const tileKey = `${tileX},${tileY}`;
  const knownTile = G.visible.has(tileKey) || G.explored.has(tileKey);

  G.hoverScreen = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };

  for (const device of G.devices) {
    const deviceKey = `${device.x | 0},${device.y | 0}`;
    const knownDevice = G.visible.has(deviceKey) || G.seenDevices.has(device.id);

    if (!knownDevice) {
      continue;
    }

    if (Math.abs(device.x - worldX) < 0.8 && Math.abs(device.y - worldY) < 0.8) {
      G.hoverInfo = { label: device.desc || getDeviceLabel(device.type), type: device.type };
      return;
    }
  }

  if (!knownTile) {
    G.hoverInfo = null;
    return;
  }

  for (const terminal of G.sideTerminals) {
    if (terminal.x === tileX && terminal.y === tileY) {
      G.hoverInfo = { label: terminal.desc || 'Terminal poboczny', type: 'sterm' };
      return;
    }
  }

  for (const panel of G.wallTerminals) {
    if (panel.x === tileX && panel.y === tileY) {
      G.hoverInfo = { label: panel.desc || 'Panel drzwi', type: 'wterm' };
      return;
    }
  }

  if (tile === TILE_TYPES.MAIN_TERMINAL) {
    G.hoverInfo = { label: 'Terminal glowny', type: 'mainterm' };
    return;
  }

  if (tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.DOOR_OPEN) {
    G.hoverInfo = { label: 'Drzwi', type: 'door' };
    return;
  }

  if (tile === TILE_TYPES.HIDE_SPOT) {
    G.hoverInfo = { label: 'Safe spot', type: 'hide' };
    return;
  }

  if (tile === TILE_TYPES.STAIR_UP) {
    G.hoverInfo = { label: 'Schody w gore', type: 'stair-up' };
    return;
  }

  if (tile === TILE_TYPES.STAIR_DOWN) {
    G.hoverInfo = { label: 'Schody w dol', type: 'stair-down' };
    return;
  }

  G.hoverInfo = null;
}

function getDeviceLabel(type) {
  if (type === 'cam') return 'Kamera';
  if (type === 'guard') return 'Straznik';
  if (type === 'drone') return 'Dron';
  if (type === 'tech') return 'Technik';
  return 'Obiekt';
}