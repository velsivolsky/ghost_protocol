import { G } from '../core/state.js';
import { MOUSE_SENSITIVITY } from '../core/constants.js';
import { closeCtx, handleCanvasClick } from './hacking.js';
import { cycleWallRenderQuality, setWallRenderQuality } from './render.js';
import {
  autocompleteTerminalInput,
  closeTerminalOverlay,
  isTerminalOverlayOpen,
  toggleTerminalOverlay,
} from './terminalRuntime.js';

let bound = false;
let pointerLocked = false;

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

    G.keys[event.key] = true;

    if (event.key === 'Escape') {
      closeCtx();
      if (pointerLocked) {
        document.exitPointerLock();
      }
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

  // Canvas click: request pointer lock (FPS mode) when game is active
  G.canvas.addEventListener('click', (event) => {
    if (!G.P || G.dead || G.cleared || G.menuActive) {
      handleCanvasClick(event);
      return;
    }
    if (!pointerLocked) {
      G.canvas.requestPointerLock();
    } else {
      handleCanvasClick(event);
    }
  });

  // Pointer lock change
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === G.canvas;
    // Show/hide lock hint
    const hint = document.getElementById('pointer-lock-hint');
    if (hint) {
      hint.style.display = pointerLocked ? 'none' : 'flex';
    }
  });

  // Mouse look — only active when pointer is locked and terminal closed
  document.addEventListener('mousemove', (event) => {
    if (!pointerLocked || !G.P || isTerminalOverlayOpen()) {
      return;
    }
    G.P.angle += event.movementX * MOUSE_SENSITIVITY;
  });
}

export function isPointerLocked() {
  return pointerLocked;
}