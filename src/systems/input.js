import { G } from '../core/state.js';
import { TILE, TILE_TYPES } from '../core/constants.js';
import { closeCtx, handleCanvasClick } from './hacking.js';
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
      const base = device.desc || getDeviceLabel(device.type);
      G.hoverInfo = { label: withNetworkName(base, device.networkName || device.id || device.type), type: device.type };
      return;
    }
  }

  if (!knownTile) {
    G.hoverInfo = null;
    return;
  }

  for (const terminal of G.sideTerminals) {
    if (terminal.x === tileX && terminal.y === tileY) {
      G.hoverInfo = {
        label: withNetworkName(terminal.desc || 'Terminal poboczny', terminal.networkName || terminal.id || 'node_side'),
        type: 'sterm',
      };
      return;
    }
  }

  for (const panel of G.wallTerminals) {
    if (panel.x === tileX && panel.y === tileY) {
      G.hoverInfo = {
        label: withNetworkName(panel.desc || 'Panel drzwi', panel.networkName || panel.id || 'panel'),
        type: 'wterm',
      };
      return;
    }
  }

  if (tile === TILE_TYPES.MAIN_TERMINAL) {
    G.hoverInfo = {
      label: withNetworkName('Terminal glowny', G.mainTerminal?.networkName || G.mainTerminal?.id || 'node_main'),
      type: 'mainterm',
    };
    return;
  }

  if (tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.DOOR_OPEN) {
    const door = G.doors.find((item) => item.x === tileX && item.y === tileY);
    G.hoverInfo = { label: withNetworkName('Drzwi', door?.id || 'door'), type: 'door' };
    return;
  }

  if (tile === TILE_TYPES.HIDE_SPOT) {
    G.hoverInfo = { label: 'Safe spot', type: 'hide' };
    return;
  }

  if (tile === TILE_TYPES.STAIR_UP) {
    G.hoverInfo = { label: 'Winda (up-link)', type: 'stair-up' };
    return;
  }

  if (tile === TILE_TYPES.STAIR_DOWN) {
    G.hoverInfo = { label: 'Winda (down-link)', type: 'stair-down' };
    return;
  }

  G.hoverInfo = null;
}

function getDeviceLabel(type) {
  if (type === 'cam') return 'Kamera';
  if (type === 'guard') return 'Straznik';
  if (type === 'drone') return 'Dron';
  if (type === 'tech') return 'Technik';
  if (type === 'distract') return 'Wezel dystrakcji';
  return 'Obiekt';
}

function withNetworkName(label, networkName) {
  const base = String(label || '').trim();
  const net = String(networkName || '').trim();
  if (!base) return net;
  if (!net) return base;
  return `${base} (${net})`;
}