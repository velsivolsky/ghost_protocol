/**
 * Ghost Protocol — Raycaster 2.5D Renderer  v2
 *
 * Exports: initRenderer(), renderFrame(G), drawMinimap()
 *
 * v2 adds:
 *   - Procedural wall textures: terminals, door frames, door panels (hacked/unhacked)
 *   - Camera FOV floor-projection cones (semi-transparent)
 *   - Synthetic sprites for stairs, entrance, hide spots
 */

import {
  FLOOR_ATLAS_COLS,
  FLOOR_ATLAS_ROWS,
  FLOOR_ATLAS_VARIANTS,
  FOV,
  HALF_FOV,
  TILE_TYPES,
  WALL_ATLAS_COLS,
  WALL_ATLAS_ROWS,
  WALL_ATLAS_VARIANTS,
} from '../core/constants.js';

// ─── Precomputed module-level constants ────────────────────────────────────────
// Plane magnitude is a constant derived from the fixed FOV — compute once
const PLANE_MAG = Math.tan(HALF_FOV);

// IS_PASSABLE[tileType] = 1 means the DDA ray can pass through (not a solid wall)
const IS_PASSABLE = new Uint8Array(256); // all 0 = solid by default
IS_PASSABLE[0]  = 1; // FLOOR
IS_PASSABLE[2]  = 1; // ENTRANCE
IS_PASSABLE[3]  = 1; // EXIT_USED
IS_PASSABLE[7]  = 1; // DOOR_OPEN
IS_PASSABLE[9]  = 1; // HIDE_SPOT
IS_PASSABLE[10] = 1; // STAIR_UP
IS_PASSABLE[11] = 1; // STAIR_DOWN

// Zero-alloc wall base colours — 3 Uint8Array(256) indexed by tile type value
const WALL_BASE_R = new Uint8Array(256).fill(22);
const WALL_BASE_G = new Uint8Array(256).fill(48);
const WALL_BASE_B = new Uint8Array(256).fill(28);
WALL_BASE_R[1]  = 18;  WALL_BASE_G[1]  = 52;  WALL_BASE_B[1]  = 28; // WALL
WALL_BASE_R[6]  = 12;  WALL_BASE_G[6]  = 55;  WALL_BASE_B[6]  = 50; // DOOR_CLOSED
WALL_BASE_R[12] = 60;  WALL_BASE_G[12] = 18;  WALL_BASE_B[12] = 8;  // DOOR_LOCKED
WALL_BASE_R[4]  = 0;   WALL_BASE_G[4]  = 85;  WALL_BASE_B[4]  = 60; // MAIN_TERMINAL
WALL_BASE_R[5]  = 0;   WALL_BASE_G[5]  = 55;  WALL_BASE_B[5]  = 85; // SIDE_TERMINAL
WALL_BASE_R[8]  = 0;   WALL_BASE_G[8]  = 45;  WALL_BASE_B[8]  = 65; // WALL_TERMINAL
WALL_BASE_R[13] = 70;  WALL_BASE_G[13] = 45;  WALL_BASE_B[13] = 0;  // CODE_TERMINAL

// Pre-built fillStyle strings for _drawWallAtlasColumns shade overlay
// shade range 0.00–0.72 in 0.01 steps → index = Math.min(72, (shade*100+0.5)|0)
const SHADE_STRINGS = new Array(73);
for (let _si = 0; _si <= 72; _si++) SHADE_STRINGS[_si] = `rgba(0,0,0,${(_si / 100).toFixed(2)})`;

// ─── Z-buffer ─────────────────────────────────────────────────────────────────
let zBuffer = null;
let lastW   = 0;
let floorFrameCounter = 0;
let floorCacheCanvas = null;
let floorCacheCtx = null;
let floorCacheW = 0;
let floorCacheH = 0;
let floorCacheImageData = null;
let floorCachePixels = null;
let floorPoseValid = false;
let floorPoseX = 0;
let floorPoseY = 0;
let floorPoseAngle = 0;
let floorAtlasSource = null;
let floorAtlasPixels = null;
let floorAtlasWidth = 0;
let floorAtlasHeight = 0;
let floorAtlasTileW = 0;
let floorAtlasTileH = 0;
let preparedWallAtlasSource = null;
let preparedWallAtlasSourceW = 0;
let preparedWallAtlasSourceH = 0;
let preparedWallAtlasCanvas = null;
let preparedWallAtlasTileW = 0;
let preparedWallAtlasTileH = 0;
let preparedWallAtlasSize = 0;
let wallImageData = null;
let wallPixels = null;
let lastH = 0;
let camXCache = null;
let colHitTile = null;
let colDrawStart = null;
let colDrawEnd = null;
let colPerpDist = null;
let colMapX = null;
let colMapY = null;
let colTexU = null;
let colSide = null;

// ─── Flat map cache (rebuilt lazily when G.tiles reference changes) ───────────
let tileFlat = null;         // Int8Array — row-major flat copy of G.tiles
let tileFlat_mapW = 0;
let tileFlat_mapH = 0;
let lastTilesRef = null;

// ─── Wall-variants flat cache ────────────────────────────────────────────────
let wallVariantsFlat = null; // Int8Array — flat copy of G.wallVariants
let wallVariantsFlat_W = 0;
let lastWallVariantsRef = null;

// ─── Ceiling gradient cache ──────────────────────────────────────────────────
let cachedCeilGrad = null;
let cachedCeilH = 0;
let cachedCeilCtx = null;

// ─── Panel map cache ─────────────────────────────────────────────────────────
let panelMapCache = new Map();
let lastDoorHash = -1;

// ─── FPS-adaptive rayStep EMA ────────────────────────────────────────────────
let _emaFrameMs = 16.7;
let _lastFrameTs = 0;

const WALL_QUALITY_PRESETS = {
  fast: 96,
  balanced: 128,
  high: 192,
};
const WALL_QUALITY_ORDER = ['fast', 'balanced', 'high'];

function _normalizeWallQuality(quality) {
  if (quality === 'fast' || quality === 'balanced' || quality === 'high') {
    return quality;
  }
  return 'balanced';
}

function _getWallAtlasTargetSize(G) {
  const quality = _normalizeWallQuality(G.wallRenderQuality);
  G.wallRenderQuality = quality;
  return WALL_QUALITY_PRESETS[quality] || WALL_QUALITY_PRESETS.balanced;
}

function _getWallPerfSettings(G) {
  const quality = _normalizeWallQuality(G.wallRenderQuality);
  let baseStep;
  if (quality === 'fast')       baseStep = 3;
  else if (quality === 'high')  baseStep = 1;
  else                          baseStep = 2;

  // FPS-adaptive: if average frame time is too high, increase rayStep automatically
  let adaptiveStep = baseStep;
  if      (_emaFrameMs > 40) adaptiveStep = Math.max(baseStep, 4);
  else if (_emaFrameMs > 28) adaptiveStep = Math.max(baseStep, 3);
  else if (_emaFrameMs > 20) adaptiveStep = Math.max(baseStep, 2);

  return { rayStep: adaptiveStep };
}

function _getFloorPerfSettings(G) {
  const quality = _normalizeWallQuality(G.wallRenderQuality);
  if (quality === 'fast') {
    return {
      enabled: false,
      scale: 0.34,
      refreshInterval: 4,
      idleInterval: 8,
      maxRowDist: 8,
    };
  }
  if (quality === 'high') {
    return {
      enabled: true,
      scale: 0.58,
      refreshInterval: 2,
      idleInterval: 4,
      maxRowDist: 12,
    };
  }
  return {
    enabled: true,
    scale: 0.45,
    refreshInterval: 3,
    idleInterval: 6,
    maxRowDist: 10,
  };
}

export function cycleWallRenderQuality(G) {
  const current = _normalizeWallQuality(G.wallRenderQuality);
  const idx = WALL_QUALITY_ORDER.indexOf(current);
  const next = WALL_QUALITY_ORDER[(idx + 1) % WALL_QUALITY_ORDER.length];
  G.wallRenderQuality = next;
  return next;
}

export function setWallRenderQuality(G, quality) {
  G.wallRenderQuality = _normalizeWallQuality(quality);
  return G.wallRenderQuality;
}

// ─── Wall base colours (EW face) ─────────────────────────────────────────────

// ─── Solid-wall check ─────────────────────────────────────────────────────────
function isSolid(tiles, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= tiles.length || tx >= (tiles[0] ? tiles[0].length : 0)) return true;
  const v = tiles[ty][tx];
  if (v === undefined) return true;
  return (
    v !== TILE_TYPES.FLOOR &&
    v !== TILE_TYPES.DOOR_OPEN &&
    v !== TILE_TYPES.ENTRANCE &&
    v !== TILE_TYPES.EXIT_USED &&
    v !== TILE_TYPES.HIDE_SPOT &&
    v !== TILE_TYPES.STAIR_UP &&
    v !== TILE_TYPES.STAIR_DOWN
  );
}

// ─── Project a world floor-level point to screen coords ──────────────────────
function worldToFloorScreen(wx, wy, px, py, invDet, dirX, dirY, planeX, planeY, W, halfH) {
  const dx = wx - px;
  const dy = wy - py;
  const tX = invDet * ( dirY * dx - dirX * dy);
  const tY = invDet * (-planeY * dx + planeX * dy);
  if (tY <= 0.05) return null;
  return { x: (W / 2) * (1 + tX / tY), y: halfH + halfH / tY };
}

// ─── Pre-build door-panel lookup ──────────────────────────────────────────────
function _getDoorHash(G) {
  if (!G.doors || !tileFlat || tileFlat_mapW === 0) return 0;
  let h = 0;
  for (const d of G.doors) {
    const state = (tileFlat[d.y * tileFlat_mapW + d.x] | 0) & 0xFF;
    h = ((h * 31) ^ (d.id * 7 + state)) | 0;
  }
  return h;
}

function buildPanelMap(G) {
  const m = new Map();
  if (!G.wallTerminals) return m;
  for (const panel of G.wallTerminals) {
    const door = G.doors ? G.doors.find((d) => d.id === panel.doorId) : null;
    let doorOpen = false;
    if (door && tileFlat && tileFlat_mapW > 0) {
      doorOpen = (tileFlat[door.y * tileFlat_mapW + door.x] & 0xFF) === TILE_TYPES.DOOR_OPEN;
    }
    m.set((panel.y << 16) | panel.x, doorOpen);
  }
  return m;
}

// ─── Public: one-time init ────────────────────────────────────────────────────
export function initRenderer() { /* z-buffer allocated lazily */ }

// ─── Public: full frame ───────────────────────────────────────────────────────
export function renderFrame(G) {
  if (!G.P || !G.ctx || !G.canvas) return;

  const ctx   = G.ctx;
  const W     = G.canvas.width;
  const H     = G.canvas.height;
  const halfH = H >> 1;

  // ── FPS-adaptive EMA (exponential moving average of frame delta) ─────────
  const _now = performance.now();
  if (_lastFrameTs > 0) {
    const _delta = Math.min(200, _now - _lastFrameTs);
    _emaFrameMs = _emaFrameMs * 0.9 + _delta * 0.1;
  }
  _lastFrameTs = _now;

  // ── Typed column buffers: reallocate only on canvas width change ─────────
  if (W !== lastW) {
    zBuffer = new Float32Array(W);
    camXCache = new Float32Array(W);
    colHitTile = new Int16Array(W);
    colDrawStart = new Int32Array(W);
    colDrawEnd = new Int32Array(W);
    colPerpDist = new Float32Array(W);
    colMapX = new Int16Array(W);
    colMapY = new Int16Array(W);
    colTexU = new Float32Array(W);
    colSide = new Uint8Array(W);
    for (let i = 0; i < W; i += 1) {
      camXCache[i] = (2 * i) / W - 1;
      colHitTile[i] = -1;
    }
    lastW = W;
  }

  // ── Flat map cache: rebuild only when G.tiles reference changes ──────────
  if (G.tiles !== lastTilesRef) {
    const _rows = G.tiles ? G.tiles.length : 0;
    const _cols = _rows > 0 && G.tiles[0] ? G.tiles[0].length : 0;
    tileFlat_mapH = _rows;
    tileFlat_mapW = _cols;
    tileFlat = new Int8Array(_rows * _cols);
    for (let _ty = 0; _ty < _rows; _ty++) {
      const _row = G.tiles[_ty];
      if (!_row) continue;
      const _base = _ty * _cols;
      for (let _tx = 0; _tx < _cols; _tx++) tileFlat[_base + _tx] = _row[_tx] ?? 1;
    }
    lastTilesRef = G.tiles;
    lastDoorHash = -1;       // force panelMap rebuild
    lastWallVariantsRef = null; // force wallVariants rebuild
  }

  // ── wallVariants flat cache ───────────────────────────────────────────────
  if (G.wallVariants !== lastWallVariantsRef) {
    const _wv = G.wallVariants;
    const _wrows = _wv ? _wv.length : 0;
    const _wcols = _wrows > 0 && _wv[0] ? _wv[0].length : 0;
    wallVariantsFlat_W = _wcols;
    wallVariantsFlat = new Int8Array(_wrows * _wcols);
    for (let _ty = 0; _ty < _wrows; _ty++) {
      const _row = _wv[_ty];
      if (!_row) continue;
      const _base = _ty * _wcols;
      for (let _tx = 0; _tx < _wcols; _tx++) wallVariantsFlat[_base + _tx] = _row[_tx] ?? 0;
    }
    lastWallVariantsRef = _wv;
  }

  const px    = G.P.x + 0.5;
  const py    = G.P.y + 0.5;
  const angle = G.P.angle || 0;

  const dirX    = Math.cos(angle);
  const dirY    = Math.sin(angle);
  const planeX   = -dirY * PLANE_MAG;
  const planeY   =  dirX * PLANE_MAG;
  const invDet   = 1.0 / (planeX * dirY - planeY * dirX);

  // ── Panel map cache: rebuild only when door state changes ────────────────
  const _dHash = _getDoorHash(G);
  if (_dHash !== lastDoorHash) {
    panelMapCache = buildPanelMap(G);
    lastDoorHash = _dHash;
  }
  const panelMap = panelMapCache;

  const atlasReady = !!(G.wallAtlasLoaded && G.wallAtlasImage && !G.wallAtlasError);
  const wallPerf = _getWallPerfSettings(G);

  // ── 1. Ceiling (cached gradient — only rebuilt when canvas height changes) ─
  if (!cachedCeilGrad || cachedCeilH !== halfH || cachedCeilCtx !== ctx) {
    cachedCeilGrad = ctx.createLinearGradient(0, 0, 0, halfH);
    cachedCeilGrad.addColorStop(0,   '#000000');
    cachedCeilGrad.addColorStop(0.6, '#050e08');
    cachedCeilGrad.addColorStop(1,   '#091408');
    cachedCeilH = halfH;
    cachedCeilCtx = ctx;
  }
  ctx.fillStyle = cachedCeilGrad;
  ctx.fillRect(0, 0, W, halfH);

  // ── 2. Floor ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#040b05';
  ctx.fillRect(0, halfH, W, H - halfH);

  // ── 3. DDA raycasting ────────────────────────────────────────────────────
  if (W !== lastW || H !== lastH || !wallImageData || !wallPixels) {
    wallImageData = ctx.createImageData(W, H);
    wallPixels = wallImageData.data;
    lastH = H;
  }
  wallPixels.fill(0);

  // wallHitMap: numeric key -> hit info for texture overlay
  const wallHitMap = new Map();

  for (let col = 0; col < W; col += wallPerf.rayStep) {
    const sampleCol = Math.min(W - 1, col + ((wallPerf.rayStep - 1) >> 1));
    const camX = camXCache[sampleCol];
    const rayDirX = dirX + planeX * camX;
    const rayDirY = dirY + planeY * camX;

    let mapX = px | 0;
    let mapY = py | 0;

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX, sideDistX;
    if (rayDirX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
    else             { stepX =  1; sideDistX = (mapX + 1 - px) * deltaDistX; }

    let stepY, sideDistY;
    if (rayDirY < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
    else             { stepY =  1; sideDistY = (mapY + 1 - py) * deltaDistY; }

    let side = 0, hitTile = 1, hit = false; // 1 = TILE_TYPES.WALL

    for (let iter = 0; iter < 64; iter++) {
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
      else                       { sideDistY += deltaDistY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapX >= tileFlat_mapW || mapY < 0 || mapY >= tileFlat_mapH) {
        hit = true; break; // hitTile stays 1 (WALL)
      }
      const _tv = tileFlat[mapY * tileFlat_mapW + mapX] & 0xFF;
      if (IS_PASSABLE[_tv] === 0) {
        hitTile = _tv; hit = true; break;
      }
    }

    if (!hit) {
      const colEnd = Math.min(W, col + wallPerf.rayStep);
      for (let outCol = col; outCol < colEnd; outCol += 1) {
        zBuffer[outCol] = 1e30;
        colHitTile[outCol] = -1;
      }
      continue;
    }

    const perpDist  = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    const renderDist = Math.max(0.08, perpDist);
    const colEnd = Math.min(W, col + wallPerf.rayStep);
    for (let outCol = col; outCol < colEnd; outCol += 1) {
      zBuffer[outCol] = perpDist;
    }

    const lineH     = Math.min(H * 2, (H / renderDist) | 0);
    const drawStart = Math.max(0, halfH - (lineH >> 1));
    const drawEnd   = Math.min(H - 1, halfH + (lineH >> 1));

    let wallX = side === 0 ? py + perpDist * rayDirY : px + perpDist * rayDirX;
    wallX -= Math.floor(wallX);
    if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) {
      wallX = 1 - wallX;
    }

    const br = WALL_BASE_R[hitTile]; const bg = WALL_BASE_G[hitTile]; const bb = WALL_BASE_B[hitTile];
    const sideDim = side === 1 ? 0.55 : 1.0;
    const fogF    = Math.max(0, 1 - renderDist / 14);
    const glow    = renderDist < 2.5 ? ((1 - renderDist / 2.5) * 30) | 0 : 0;

    const fr = Math.min(255, (br * sideDim * fogF) | 0) + glow;
    const fg = Math.min(255, (bg * sideDim * fogF) | 0) + glow * 2;
    const fb = Math.min(255, (bb * sideDim * fogF) | 0) + glow;

    const texturedWall = atlasReady && hitTile === TILE_TYPES.WALL;
    if (!texturedWall) {
      for (let outCol = col; outCol < colEnd; outCol += 1) {
        for (let y = drawStart; y <= drawEnd; y++) {
          const idx = (y * W + outCol) * 4;
          wallPixels[idx]     = fr;
          wallPixels[idx + 1] = fg;
          wallPixels[idx + 2] = fb;
          wallPixels[idx + 3] = 255;
        }
      }
    }

    for (let outCol = col; outCol < colEnd; outCol += 1) {
      colHitTile[outCol] = hitTile;
      colDrawStart[outCol] = drawStart;
      colDrawEnd[outCol] = drawEnd;
      colPerpDist[outCol] = renderDist;
      colMapX[outCol] = mapX;
      colMapY[outCol] = mapY;
      colTexU[outCol] = wallX;
      colSide[outCol] = side;

      // Collect tile hits for texture overlay
      if (hitTile !== TILE_TYPES.WALL) {
        const key = (mapY << 16) | mapX;
        const ex  = wallHitMap.get(key);
        if (!ex) {
          wallHitMap.set(key, { hitTile, minCol: outCol, maxCol: outCol, drawStart, drawEnd, perpDist, mapX, mapY });
        } else {
          ex.maxCol    = outCol;
          ex.drawStart = Math.min(ex.drawStart, drawStart);
          ex.drawEnd   = Math.max(ex.drawEnd,   drawEnd);
        }
      }
    }
  }

  ctx.putImageData(wallImageData, 0, 0);
  _drawTexturedFloor(G, ctx, W, H, halfH, px, py, dirX, dirY, planeX, planeY);

  // ── 4. Camera FOV floor cones ────────────────────────────────────────────
  _drawCameraFOVCones(G, ctx, W, H, halfH, px, py, invDet, dirX, dirY, planeX, planeY);

  // ── 5. Wall texture overlays ─────────────────────────────────────────────
  _drawWallAtlasColumns(G, ctx, W, atlasReady);
  _drawWallTextures(G, ctx, wallHitMap, panelMap, W, H, halfH);

  // ── 6. Sprite billboards ─────────────────────────────────────────────────
  _drawSprites(G, ctx, W, H, halfH, px, py, dirX, dirY, planeX, planeY, invDet);

  // ── 7. Minimap ───────────────────────────────────────────────────────────
  drawMinimap(G);

  // ── 8. HUD ───────────────────────────────────────────────────────────────
  _drawHUD(G, ctx, W, H);
}

function _ensurePreparedWallAtlas(G) {
  if (!(G.wallAtlasLoaded && G.wallAtlasImage && !G.wallAtlasError)) {
    return false;
  }

  const source = G.wallAtlasImage;
  const sourceW = source.naturalWidth || source.width || 0;
  const sourceH = source.naturalHeight || source.height || 0;
  if (sourceW <= 0 || sourceH <= 0) {
    return false;
  }

  const outTileW = _getWallAtlasTargetSize(G);
  const outTileH = outTileW;

  if (
    preparedWallAtlasSource === source
    && preparedWallAtlasCanvas
    && preparedWallAtlasSourceW === sourceW
    && preparedWallAtlasSourceH === sourceH
    && preparedWallAtlasSize === outTileW
  ) {
    return true;
  }

  const srcTileW = Math.max(1, (sourceW / WALL_ATLAS_COLS) | 0);
  const srcTileH = Math.max(1, (sourceH / WALL_ATLAS_ROWS) | 0);

  const canvas = document.createElement('canvas');
  canvas.width = WALL_ATLAS_COLS * outTileW;
  canvas.height = WALL_ATLAS_ROWS * outTileH;
  const atlasCtx = canvas.getContext('2d');
  if (!atlasCtx) {
    return false;
  }

  atlasCtx.imageSmoothingEnabled = true;
  atlasCtx.clearRect(0, 0, canvas.width, canvas.height);
  for (let ty = 0; ty < WALL_ATLAS_ROWS; ty += 1) {
    for (let tx = 0; tx < WALL_ATLAS_COLS; tx += 1) {
      atlasCtx.drawImage(
        source,
        tx * srcTileW,
        ty * srcTileH,
        srcTileW,
        srcTileH,
        tx * outTileW,
        ty * outTileH,
        outTileW,
        outTileH,
      );
    }
  }

  preparedWallAtlasSource = source;
  preparedWallAtlasSourceW = sourceW;
  preparedWallAtlasSourceH = sourceH;
  preparedWallAtlasCanvas = canvas;
  preparedWallAtlasTileW = outTileW;
  preparedWallAtlasTileH = outTileH;
  preparedWallAtlasSize = outTileW;
  return true;
}

function _drawWallAtlasColumns(G, ctx, W, atlasReady) {
  if (!atlasReady) return;
  if (!_ensurePreparedWallAtlas(G)) return;

  const atlas = preparedWallAtlasCanvas;
  const tileW = preparedWallAtlasTileW;
  const tileH = preparedWallAtlasTileH;
  if (!atlas || tileW <= 0 || tileH <= 0) return;

  for (let col = 0; col < W; col += 1) {
    if (colHitTile[col] !== TILE_TYPES.WALL) {
      continue;
    }

    const rowH = colDrawEnd[col] - colDrawStart[col];
    if (rowH < 1) {
      continue;
    }

    const fogF = Math.max(0, 1 - colPerpDist[col] / 14);
    if (fogF <= 0.03) {
      continue;
    }

    const mapY = colMapY[col];
    const mapX = colMapX[col];
    const rawVariant = (wallVariantsFlat && wallVariantsFlat_W > 0)
      ? (wallVariantsFlat[mapY * wallVariantsFlat_W + mapX] & 0xFF)
      : 0;
    const variant = Math.max(0, Math.min(WALL_ATLAS_VARIANTS - 1, rawVariant | 0));
    const tileX = variant % WALL_ATLAS_COLS;
    const tileY = (variant / WALL_ATLAS_COLS) | 0;
    const sampleX = Math.max(0, Math.min(tileW - 1, (colTexU[col] * tileW) | 0));

    ctx.drawImage(
      atlas,
      tileX * tileW + sampleX,
      tileY * tileH,
      1,
      tileH,
      col,
      colDrawStart[col],
      1,
      rowH + 1,
    );

    const sideShade = colSide[col] === 1 ? 0.2 : 0;
    const fogShade = Math.max(0, 1 - fogF) * 0.72;
    const shade = Math.min(0.72, sideShade + fogShade);
    if (shade > 0.01) {
      ctx.fillStyle = SHADE_STRINGS[Math.min(72, (shade * 100 + 0.5) | 0)];
      ctx.fillRect(col, colDrawStart[col], 1, rowH + 1);
    }
  }
}

function _isFloorRenderableTile(tile) {
  return (
    tile !== TILE_TYPES.WALL
    && tile !== TILE_TYPES.DOOR_CLOSED
    && tile !== TILE_TYPES.DOOR_LOCKED
    && tile !== TILE_TYPES.WALL_TERMINAL
    && tile !== TILE_TYPES.MAIN_TERMINAL
    && tile !== TILE_TYPES.SIDE_TERMINAL
    && tile !== TILE_TYPES.CODE_TERMINAL
  );
}

function _hashFloorVariant(tx, ty) {
  const hash = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
  return hash % FLOOR_ATLAS_VARIANTS;
}

function _ensureFloorAtlasPixels(G) {
  if (!(G.floorAtlasLoaded && G.floorAtlasImage && !G.floorAtlasError)) {
    return false;
  }

  const source = G.floorAtlasImage;
  const atlasW = source.naturalWidth || source.width || 0;
  const atlasH = source.naturalHeight || source.height || 0;
  if (atlasW <= 0 || atlasH <= 0) {
    return false;
  }

  if (floorAtlasSource === source && floorAtlasPixels && floorAtlasWidth === atlasW && floorAtlasHeight === atlasH) {
    return true;
  }

  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return false;
  }

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, atlasW, atlasH);

  floorAtlasSource = source;
  floorAtlasPixels = imageData.data;
  floorAtlasWidth = atlasW;
  floorAtlasHeight = atlasH;
  floorAtlasTileW = Math.max(1, (atlasW / FLOOR_ATLAS_COLS) | 0);
  floorAtlasTileH = Math.max(1, (atlasH / FLOOR_ATLAS_ROWS) | 0);
  return true;
}

function _ensureFloorCache(W, H, halfH, scale) {
  const lowW = Math.max(1, (W * scale) | 0);
  const lowH = Math.max(1, ((H - halfH) * scale) | 0);

  if (!floorCacheCanvas) {
    floorCacheCanvas = document.createElement('canvas');
    floorCacheCtx = floorCacheCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!floorCacheCtx) {
    return false;
  }

  if (floorCacheW === lowW && floorCacheH === lowH && floorCacheImageData && floorCachePixels) {
    return true;
  }

  floorCacheCanvas.width = lowW;
  floorCacheCanvas.height = lowH;
  floorCacheW = lowW;
  floorCacheH = lowH;
  floorCacheImageData = floorCacheCtx.createImageData(lowW, lowH);
  floorCachePixels = floorCacheImageData.data;
  floorPoseValid = false;
  return true;
}

function _drawTexturedFloor(G, ctx, W, H, halfH, px, py, dirX, dirY, planeX, planeY) {
  if (G.menuActive) {
    return;
  }
  const perf = _getFloorPerfSettings(G);
  if (!perf.enabled) {
    return;
  }
  if (!_ensureFloorAtlasPixels(G)) {
    return;
  }
  if (!_ensureFloorCache(W, H, halfH, perf.scale)) {
    return;
  }

  floorFrameCounter = (floorFrameCounter + 1) | 0;
  const angle = G.P?.angle || 0;
  let _adiff = angle - floorPoseAngle;
  if (_adiff > Math.PI)  _adiff -= Math.PI * 2;
  if (_adiff < -Math.PI) _adiff += Math.PI * 2;
  const deltaAngle = floorPoseValid ? Math.abs(_adiff) : 0;
  const poseChanged = !floorPoseValid
    || Math.abs(px - floorPoseX) > 0.004
    || Math.abs(py - floorPoseY) > 0.004
    || deltaAngle > 0.003;
  const shouldRefresh = !floorPoseValid
    || poseChanged
    || (!poseChanged && floorFrameCounter % perf.idleInterval === 0);

  if (shouldRefresh) {
    const mapW = tileFlat_mapW;
    const mapH = tileFlat_mapH;
    const visible = G.visible && typeof G.visible.has === 'function' ? G.visible : null;
    const out = floorCachePixels;
    const src = floorAtlasPixels;

    out.fill(0);

    for (let y = 0; y < floorCacheH; y += 1) {
      const sy = halfH + ((y + 0.5) * (H - halfH)) / floorCacheH;
      const denom = sy - halfH;
      if (denom <= 0.001) {
        continue;
      }

      const rowDist = halfH / denom;
      if (rowDist > perf.maxRowDist) {
        continue;
      }

      for (let x = 0; x < floorCacheW; x += 1) {
        const screenX = ((x + 0.5) * W) / floorCacheW;
        const zIndex = screenX | 0;
        if (zBuffer && zIndex >= 0 && zIndex < zBuffer.length && rowDist >= zBuffer[zIndex]) {
          continue;
        }

        const cameraX = (2 * screenX) / W - 1;
        const worldX = px + rowDist * (dirX + planeX * cameraX);
        const worldY = py + rowDist * (dirY + planeY * cameraX);
        const tx = worldX | 0;
        const ty = worldY | 0;

        if (tx < 0 || ty < 0 || tx >= mapW || ty >= mapH) {
          continue;
        }

        // Hard cull: do not render floor tiles behind player view direction.
        const vx = (tx + 0.5) - px;
        const vy = (ty + 0.5) - py;
        if (vx * dirX + vy * dirY <= 0.001) {
          continue;
        }

        if (visible && !visible.has(tx + ',' + ty)) {
          continue;
        }

        const tile = (tileFlat ? tileFlat[ty * mapW + tx] & 0xFF : 1);
        if (!_isFloorRenderableTile(tile)) {
          continue;
        }

        const variant = _hashFloorVariant(tx, ty);
        const tileX = variant % FLOOR_ATLAS_COLS;
        const tileY = (variant / FLOOR_ATLAS_COLS) | 0;
        const ux = Math.min(floorAtlasTileW - 1, Math.max(0, ((worldX - tx) * floorAtlasTileW) | 0));
        const uy = Math.min(floorAtlasTileH - 1, Math.max(0, ((worldY - ty) * floorAtlasTileH) | 0));
        const srcX = tileX * floorAtlasTileW + ux;
        const srcY = tileY * floorAtlasTileH + uy;
        const srcIdx = (srcY * floorAtlasWidth + srcX) * 4;
        const dstIdx = (y * floorCacheW + x) * 4;

        const fog = Math.max(0.18, 1 - rowDist / 16);
        out[dstIdx] = (src[srcIdx] * fog) | 0;
        out[dstIdx + 1] = (src[srcIdx + 1] * fog) | 0;
        out[dstIdx + 2] = (src[srcIdx + 2] * fog) | 0;
        out[dstIdx + 3] = Math.max(52, Math.min(220, (220 * fog) | 0));
      }
    }

    floorCacheCtx.putImageData(floorCacheImageData, 0, 0);
    floorPoseValid = true;
    floorPoseX = px;
    floorPoseY = py;
    floorPoseAngle = angle;
  }

  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(floorCacheCanvas, 0, halfH, W, H - halfH);
  ctx.imageSmoothingEnabled = prevSmooth;
}

// ─── Camera FOV floor-projection cones ───────────────────────────────────────
function _drawCameraFOVCones(G, ctx, W, H, halfH, px, py, invDet, dirX, dirY, planeX, planeY) {
  if (!G.devices) return;

  for (const cam of G.devices) {
    if (cam.type !== 'cam') continue;

    const cx      = (cam.x || 0) + 0.5;
    const cy      = (cam.y || 0) + 0.5;
    const facing  = cam.facing || Math.PI / 2;
    const fovHalf = (cam.fov || FOV) / 2;
    const range   = cam.range || 4.5;
    const camDist = Math.hypot(cx - px, cy - py);

    if (camDist > 18) continue;

    const key   = (cam.x | 0) + ',' + (cam.y | 0);
    const known = (G.visible && G.visible.has(key)) || (G.seenDevices && G.seenDevices.has(cam.id));
    if (!known && camDist > 6) continue;

    // Build cone polygon: origin + arc points
    const steps  = 10;
    const points = [{ x: cx, y: cy }];
    for (let i = 0; i <= steps; i++) {
      const a = facing - fovHalf + (i / steps) * fovHalf * 2;
      points.push({ x: cx + Math.cos(a) * range, y: cy + Math.sin(a) * range });
    }

    const screenPts = points.map((p) =>
      worldToFloorScreen(p.x, p.y, px, py, invDet, dirX, dirY, planeX, planeY, W, halfH)
    );

    if (!screenPts[0]) continue;

    let coneColour;
    if (cam.hacked || cam.offline)          coneColour = 'rgba(40,40,80,0.12)';
    else if (cam.triggered || cam.alerting) coneColour = 'rgba(220,30,20,0.22)';
    else                                    coneColour = 'rgba(0,80,220,0.18)';

    ctx.save();
    ctx.beginPath();
    const origin = screenPts[0];
    ctx.moveTo(origin.x, origin.y);
    for (let i = 1; i < screenPts.length; i++) {
      const sp = screenPts[i];
      if (!sp) continue;
      ctx.lineTo(sp.x, Math.max(halfH, Math.min(H, sp.y)));
    }
    ctx.closePath();
    ctx.fillStyle = coneColour;
    ctx.fill();

    // Cone edge dashed lines
    const edgeCol = coneColour.replace('0.18','0.45').replace('0.22','0.55').replace('0.12','0.28');
    ctx.strokeStyle = edgeCol;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 4]);
    [screenPts[1], screenPts[screenPts.length - 1]].forEach((sp) => {
      if (!sp) return;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(sp.x, Math.max(halfH, Math.min(H, sp.y)));
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ─── Wall texture overlays ────────────────────────────────────────────────────
function _drawWallTextures(G, ctx, wallHitMap, panelMap, W, H, halfH) {
  for (const [key, g] of wallHitMap) {
    const { hitTile, minCol, maxCol, drawStart, drawEnd, perpDist, mapX, mapY } = g;
    const colW = maxCol - minCol + 1;
    const rowH = drawEnd - drawStart;
    if (colW < 1 || rowH < 1) continue;

    const fogF = Math.max(0, 1 - perpDist / 14);
    if (fogF <= 0.03) continue;

    ctx.save();
    ctx.beginPath();
    ctx.rect(minCol, drawStart, colW, rowH + 1);
    ctx.clip();

    switch (hitTile) {
      case TILE_TYPES.DOOR_CLOSED:
        _texDoor(ctx, minCol, drawStart, colW, rowH, fogF, false);
        break;
      case TILE_TYPES.DOOR_LOCKED:
        _texDoor(ctx, minCol, drawStart, colW, rowH, fogF, true);
        break;
      case TILE_TYPES.MAIN_TERMINAL:
        _texMainTerminal(ctx, minCol, drawStart, colW, rowH, fogF);
        break;
      case TILE_TYPES.SIDE_TERMINAL:
        _texSideTerminal(ctx, minCol, drawStart, colW, rowH, fogF, false);
        break;
      case TILE_TYPES.CODE_TERMINAL:
        _texSideTerminal(ctx, minCol, drawStart, colW, rowH, fogF, true);
        break;
      case TILE_TYPES.WALL_TERMINAL: {
        const doorOpen = panelMap.get((mapY << 16) | mapX) || false;
        _texWallPanel(ctx, minCol, drawStart, colW, rowH, fogF, doorOpen);
        break;
      }
    }
    ctx.restore();
  }
}

// ── Door frame texture ────────────────────────────────────────────────────────
function _texDoor(ctx, x, y, w, h, fogF, locked) {
  const a = fogF * 0.7;
  const col = locked ? 'rgba(180,50,20,' : 'rgba(20,200,160,';
  // Horizontal bars
  ctx.strokeStyle = col + a + ')';
  ctx.lineWidth   = Math.max(1, (h / 18) | 0);
  for (let i = 1; i < 4; i++) {
    const by = y + (h * i) / 4;
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
  }
  // Side frame lines
  const fw = Math.max(1, (w / 10) | 0);
  ctx.strokeStyle = (locked ? 'rgba(220,60,20,' : 'rgba(0,240,180,') + (a * 1.3) + ')';
  ctx.lineWidth   = fw;
  ctx.beginPath();
  ctx.moveTo(x + fw / 2, y); ctx.lineTo(x + fw / 2, y + h);
  ctx.moveTo(x + w - fw / 2, y); ctx.lineTo(x + w - fw / 2, y + h);
  ctx.stroke();
  // Centre indicator square
  if (w >= 6) {
    const sq = Math.max(3, Math.min(w * 0.35, h * 0.12) | 0);
    ctx.fillStyle = (locked ? 'rgba(255,60,0,' : 'rgba(0,255,180,') + (fogF * 0.9) + ')';
    ctx.fillRect(x + ((w - sq) >> 1), y + ((h - sq) >> 1), sq, sq);
  }
}

// ── Main terminal screen ──────────────────────────────────────────────────────
function _texMainTerminal(ctx, x, y, w, h, fogF) {
  if (w < 4 || h < 6) return;
  const a   = fogF;
  const px  = Math.max(1, (w * 0.12) | 0);
  const pyT = Math.max(1, (h * 0.10) | 0);
  const pyB = Math.max(1, (h * 0.25) | 0);
  const sx  = x + px, sy = y + pyT, sw = w - px * 2, sh = h - pyT - pyB;
  // Screen bg
  ctx.fillStyle = 'rgba(0,40,25,' + (a * 0.85) + ')';
  ctx.fillRect(sx, sy, sw, sh);
  // Screen border
  ctx.strokeStyle = 'rgba(0,255,120,' + (a * 0.9) + ')';
  ctx.lineWidth   = Math.max(1, (sw / 20) | 0);
  ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
  // Scanlines
  ctx.strokeStyle = 'rgba(0,255,100,' + (a * 0.15) + ')';
  ctx.lineWidth   = 1;
  const ls = Math.max(2, (sh / 10) | 0);
  for (let ly = sy + ls; ly < sy + sh; ly += ls) {
    ctx.beginPath(); ctx.moveTo(sx, ly); ctx.lineTo(sx + sw, ly); ctx.stroke();
  }
  // Data bar indicators
  if (sw >= 8 && sh >= 8) {
    ctx.fillStyle = 'rgba(0,255,120,' + (a * 0.75) + ')';
    const ds = Math.max(1, (sw / 14) | 0);
    const ly = sy + (sh * 0.35) | 0;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect((sx + sw * 0.25 + i * sw * 0.2) | 0, ly, ds, ds * 2);
    }
    // Blinking cursor
    if (((Date.now() / 600) | 0) % 2 === 0) {
      ctx.fillRect((sx + sw * 0.15) | 0, sy + sh - (sh * 0.25) | 0, (sw * 0.7) | 0, ds);
    }
  }
  // Status LED
  const lr = Math.max(2, Math.min(w * 0.1, 5) | 0);
  ctx.beginPath();
  ctx.arc(x + (w >> 1), y + h - pyB / 2, lr, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,255,100,' + (a * 0.95) + ')';
  ctx.fill();
}

// ── Side/code terminal screen ─────────────────────────────────────────────────
function _texSideTerminal(ctx, x, y, w, h, fogF, isCode) {
  if (w < 3 || h < 5) return;
  const a   = fogF;
  const px  = Math.max(1, (w * 0.10) | 0);
  const py  = Math.max(1, (h * 0.15) | 0);
  const sx  = x + px, sy = y + py, sw = w - px * 2, sh = h - py * 2;
  const sc  = isCode ? '160,90,0'   : '0,80,200';
  const gc  = isCode ? '255,160,0'  : '0,180,255';
  ctx.fillStyle   = 'rgba(' + sc + ',' + (a * 0.8) + ')';
  ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = 'rgba(' + gc + ',' + (a * 0.85) + ')';
  ctx.lineWidth   = Math.max(1, (sw / 18) | 0);
  ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
  if (sw >= 6 && sh >= 6) {
    ctx.fillStyle = 'rgba(' + gc + ',' + (a * 0.38) + ')';
    const rows  = isCode ? 4 : 3;
    const rowH2 = (sh / (rows + 1)) | 0;
    const bh    = Math.max(1, (rowH2 * 0.5) | 0);
    for (let r = 1; r <= rows; r++) {
      const bw = (sw * (0.4 + Math.sin(r * 1.7) * 0.25)) | 0;
      ctx.fillRect(sx + ((sw - bw) >> 1), sy + r * rowH2, bw, bh);
    }
  }
  const lr = Math.max(1, Math.min(w * 0.08, 4) | 0);
  ctx.beginPath();
  ctx.arc(x + (w >> 1), y + h - py / 2, lr, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(' + gc + ',' + a + ')';
  ctx.fill();
}

// ── Door control panel (WALL_TERMINAL) ────────────────────────────────────────
function _texWallPanel(ctx, x, y, w, h, fogF, doorOpen) {
  if (w < 3 || h < 4) return;
  const a   = fogF;
  const px  = Math.max(1, (w * 0.08) | 0);
  const pyT = Math.max(1, (h * 0.12) | 0);
  const pyB = Math.max(1, (h * 0.12) | 0);
  const sx  = x + px, sy = y + pyT, sw = w - px * 2, sh = h - pyT - pyB;
  const sc  = doorOpen ? '0,230,180'  : '220,140,0';
  const bg  = doorOpen ? '0,40,30'    : '40,25,0';
  // Panel bg
  ctx.fillStyle = 'rgba(10,18,22,' + (a * 0.9) + ')';
  ctx.fillRect(sx, sy, sw, sh);
  // Panel border glow
  ctx.strokeStyle = 'rgba(' + sc + ',' + (a * 0.8) + ')';
  ctx.lineWidth   = Math.max(1, (sw / 14) | 0);
  ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
  // Screen sub-panel
  const scrH = (sh * 0.55) | 0;
  const scrW = (sw * 0.75) | 0;
  const scrX = sx + ((sw - scrW) >> 1);
  const scrY = sy + (sh * 0.08) | 0;
  ctx.fillStyle = 'rgba(' + bg + ',' + a + ')';
  ctx.fillRect(scrX, scrY, scrW, scrH);
  ctx.fillStyle = 'rgba(' + sc + ',' + (a * (doorOpen ? 0.28 : 0.18)) + ')';
  ctx.fillRect(scrX + 1, scrY + 1, scrW - 2, scrH - 2);
  // Status LED
  const ls   = Math.max(2, Math.min(sw * 0.22, sh * 0.18) | 0);
  const ledX = sx + ((sw - ls) >> 1);
  const ledY = sy + sh - pyB - ls - 2;
  ctx.fillStyle = 'rgba(' + sc + ',' + (a * (doorOpen ? 1.0 : 0.85)) + ')';
  ctx.fillRect(ledX, ledY, ls, ls);
  // Blinking when locked
  if (!doorOpen && ((Date.now() / 700) | 0) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,80,0,' + (a * 0.5) + ')';
    ctx.fillRect(ledX, ledY, ls, ls);
  }
}

// ─── Sprite billboards ────────────────────────────────────────────────────────
function _drawSprites(G, ctx, W, H, halfH, px, py, dirX, dirY, planeX, planeY, invDet) {
  const sprites = [];

  // Entity devices
  for (const dev of G.devices) {
    if (dev.dead) continue;
    const sx = (dev.x || 0) + 0.5;
    const sy = (dev.y || 0) + 0.5;
    const dx = sx - px, dy = sy - py;
    sprites.push({ kind: 'dev', dev, dx, dy, dist: dx * dx + dy * dy });
  }

  // Synthetic sprites for interactive floor tiles (stairs, entrance, hide spots)
  if (G.tiles) {
    const rows = G.tiles.length;
    const cols = G.tiles[0] ? G.tiles[0].length : 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const v   = G.tiles[ty][tx];
        if (v !== TILE_TYPES.STAIR_UP && v !== TILE_TYPES.STAIR_DOWN &&
            v !== TILE_TYPES.ENTRANCE && v !== TILE_TYPES.EXIT_USED  &&
            v !== TILE_TYPES.HIDE_SPOT) continue;
        const key = tx + ',' + ty;
        if (!G.visible || (!G.visible.has(key) && !(G.explored && G.explored.has(key)))) continue;
        const sx = tx + 0.5, sy = ty + 0.5;
        const dx = sx - px, dy = sy - py;
        sprites.push({ kind: 'tile', tileVal: v, dx, dy, dist: dx * dx + dy * dy });
      }
    }
  }

  sprites.sort((a, b) => b.dist - a.dist);

  for (const sp of sprites) {
    const { dx, dy } = sp;
    const transformX = invDet * ( dirY * dx - dirX * dy);
    const transformY = invDet * (-planeY * dx + planeX * dy);
    if (transformY <= 0.15) continue;

    const screenX = ((W / 2) * (1 + transformX / transformY)) | 0;
    const spriteH = Math.min(H * 2, (Math.abs(H / transformY)) | 0);
    const drawSY  = Math.max(0, halfH - (spriteH >> 1));
    const drawEY  = Math.min(H - 1, halfH + (spriteH >> 1));
    const drawSX  = Math.max(0, screenX - (spriteH >> 1));
    const drawEX  = Math.min(W - 1, screenX + (spriteH >> 1));
    const sw      = drawEX - drawSX;
    const sh      = drawEY - drawSY;
    if (sw <= 0 || sh <= 0) continue;

    if (sp.dist >= 144) continue; // fogF would be <= 0; avoids sqrt for far sprites
    const fogF = 1 - Math.sqrt(sp.dist) / 12;
    if (fogF <= 0) continue;

    if (sp.kind === 'dev') {
      _drawDevSprite(ctx, sp.dev, screenX, drawSX, drawEX, drawSY, drawEY, sw, sh, fogF, transformY, W);
    } else {
      _drawTileSprite(ctx, sp.tileVal, screenX, drawSX, drawEX, drawSY, drawEY, sw, sh, fogF, transformY, W);
    }
  }
}

// ── Entity billboard ──────────────────────────────────────────────────────────
function _drawDevSprite(ctx, dev, screenX, drawSX, drawEX, drawSY, drawEY, sw, sh, fogF, transformY, W) {
  const col = _spriteColour(dev);
  if (!col) return;
  const [cr, cg, cb, ca] = col;
  const fr = (cr * fogF) | 0, fg = (cg * fogF) | 0, fb = (cb * fogF) | 0;

  ctx.save();
  ctx.globalAlpha = ca * fogF;
  ctx.fillStyle   = 'rgb(' + fr + ',' + fg + ',' + fb + ')';
  for (let c = drawSX; c <= drawEX; c++) {
    if (zBuffer[c] <= transformY) continue;
    ctx.fillRect(c, drawSY, 1, sh);
  }
  const midC = screenX;
  if (midC >= 0 && midC < W && zBuffer[midC] > transformY) {
    const headH = (sh * 0.28) | 0;
    const hw    = Math.max(2, sw >> 1);
    ctx.globalAlpha = Math.min(0.98, ca * fogF * 1.35);
    ctx.fillStyle   = 'rgb(' + Math.min(255,fr+55) + ',' + Math.min(255,fg+70) + ',' + Math.min(255,fb+55) + ')';
    ctx.fillRect(midC - (hw >> 1), drawSY, hw, headH);
  }
  ctx.restore();
}

// ── Floor-tile synthetic sprite (stairs, entrance, hide) ─────────────────────
function _drawTileSprite(ctx, tileVal, screenX, drawSX, drawEX, drawSY, drawEY, sw, sh, fogF, transformY, W) {
  const pillarH  = (sh * 0.5) | 0;
  const pillarSY = drawEY - pillarH;

  let fr, fg, fb, sr, sg, sb, ca;
  switch (tileVal) {
    case TILE_TYPES.STAIR_UP:
      [fr,fg,fb]=[0,200,220]; [sr,sg,sb]=[0,255,240]; ca=0.85; break;
    case TILE_TYPES.STAIR_DOWN:
      [fr,fg,fb]=[220,140,0]; [sr,sg,sb]=[255,180,0]; ca=0.85; break;
    case TILE_TYPES.ENTRANCE: case TILE_TYPES.EXIT_USED:
      [fr,fg,fb]=[0,200,80];  [sr,sg,sb]=[0,255,100]; ca=0.8;  break;
    case TILE_TYPES.HIDE_SPOT:
      [fr,fg,fb]=[60,60,200]; [sr,sg,sb]=[80,80,255]; ca=0.65; break;
    default: return;
  }

  fr = (fr * fogF) | 0; fg = (fg * fogF) | 0; fb = (fb * fogF) | 0;
  const pillarW = Math.max(2, (sw * 0.5) | 0);
  const pillarX = screenX - (pillarW >> 1);

  ctx.save();
  ctx.globalAlpha = ca * fogF;
  ctx.fillStyle   = 'rgb(' + fr + ',' + fg + ',' + fb + ')';
  for (let c = Math.max(drawSX, pillarX); c <= Math.min(drawEX, pillarX + pillarW); c++) {
    if (zBuffer[c] <= transformY) continue;
    ctx.fillRect(c, pillarSY, 1, pillarH);
  }

  const midC = screenX;
  if (midC >= 0 && midC < W && zBuffer[midC] > transformY && pillarW >= 4) {
    const ico  = Math.max(2, (pillarW * 0.6) | 0);
    const icoX = midC - (ico >> 1);
    const icoY = pillarSY + ((pillarH - ico) >> 1);
    ctx.globalAlpha = Math.min(0.99, ca * fogF * 1.4);
    ctx.fillStyle   = 'rgb(' + ((sr * fogF) | 0) + ',' + ((sg * fogF) | 0) + ',' + ((sb * fogF) | 0) + ')';
    if (tileVal === TILE_TYPES.STAIR_UP) {
      ctx.beginPath();
      ctx.moveTo(icoX + (ico >> 1), icoY);
      ctx.lineTo(icoX, icoY + ico);
      ctx.lineTo(icoX + ico, icoY + ico);
      ctx.closePath(); ctx.fill();
    } else if (tileVal === TILE_TYPES.STAIR_DOWN) {
      ctx.beginPath();
      ctx.moveTo(icoX, icoY);
      ctx.lineTo(icoX + ico, icoY);
      ctx.lineTo(icoX + (ico >> 1), icoY + ico);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(icoX, icoY, ico, ico);
    }
  }
  ctx.restore();
}

function _spriteColour(dev) {
  const { type, state } = dev;
  if (type === 'guard') {
    if (dev.hacked)             return [0,   160, 255, 0.9];
    if (state === 'chase')      return [220,  30,  20, 0.95];
    if (state === 'suspicious') return [210, 160,   0, 0.9];
    if (state === 'search')     return [180, 100,   0, 0.85];
    return                             [20,  140,  60, 0.8];
  }
  if (type === 'cam') {
    if (dev.offline || dev.hacked)           return [30,  30, 120, 0.6];
    if (dev.triggered || dev.alerting)       return [220, 30,  20, 0.9];
    return                                          [0,   80, 220, 0.75];
  }
  if (type === 'drone') {
    if (state === 'chase' || state === 'alert') return [220, 60, 0, 0.9];
    return                                            [0, 100, 180, 0.8];
  }
  if (type === 'tech')     return [180, 140, 20, 0.75];
  if (type === 'distract') return [0,  200, 100, 0.6];
  return null;
}

// ─── Minimap ──────────────────────────────────────────────────────────────────
export function drawMinimap(G) {
  if (!G || !G.P || !G.tiles || !G.ctx) return;

  const ctx   = G.ctx;
  const tiles = G.tiles;
  const ROWS  = tiles.length;
  const COLS  = tiles[0] ? tiles[0].length : 0;
  if (!ROWS || !COLS) return;

  const MSCALE = 3, MPAD = 8;
  const MW = COLS * MSCALE, MH = ROWS * MSCALE;
  const MX = MPAD, MY = MPAD;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(MX - 2, MY - 2, MW + 4, MH + 4);

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key   = tx + ',' + ty;
      const known = (G.explored && G.explored.has(key)) || (G.visible && G.visible.has(key));
      if (!known) continue;
      const v = tiles[ty][tx];
      let c;
      if (v === TILE_TYPES.FLOOR  || v === TILE_TYPES.ENTRANCE || v === TILE_TYPES.EXIT_USED || v === TILE_TYPES.DOOR_OPEN) c = '#0e2415';
      else if (v === TILE_TYPES.HIDE_SPOT)   c = '#101840';
      else if (v === TILE_TYPES.STAIR_UP)    c = '#006a75';
      else if (v === TILE_TYPES.STAIR_DOWN)  c = '#755000';
      else if (v === TILE_TYPES.DOOR_CLOSED || v === TILE_TYPES.DOOR_LOCKED) c = '#10403a';
      else if (v === TILE_TYPES.MAIN_TERMINAL) c = '#005c46';
      else if (v === TILE_TYPES.SIDE_TERMINAL || v === TILE_TYPES.CODE_TERMINAL) c = '#00405a';
      else if (v === TILE_TYPES.WALL_TERMINAL) c = '#003a50';
      else c = '#0a1f10';
      ctx.fillStyle = c;
      ctx.fillRect(MX + tx * MSCALE, MY + ty * MSCALE, MSCALE, MSCALE);
    }
  }

  // Entities + camera FOV arcs
  for (const dev of G.devices) {
    const key   = (dev.x | 0) + ',' + (dev.y | 0);
    const known = (G.visible && G.visible.has(key)) || (G.seenDevices && G.seenDevices.has(dev.id));
    if (!known) continue;

    const gx = MX + dev.x * MSCALE + MSCALE / 2;
    const gy = MY + dev.y * MSCALE + MSCALE / 2;

    if (dev.type === 'guard') {
      let dotCol;
      if (dev.dead || dev.hacked)                                    dotCol = '#2255ff';
      else if (dev.state === 'chase')                                dotCol = '#ff2020';
      else if (dev.state === 'suspicious' || dev.state === 'search') dotCol = '#ffcc00';
      else                                                           dotCol = '#00cc55';

      if (!dev.dead && !dev.hacked) {
        ctx.strokeStyle = dotCol + '55';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        const cl = 7 * MSCALE, fa = dev.facing || 0;
        ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(fa-0.8)*cl, gy + Math.sin(fa-0.8)*cl);
        ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(fa+0.8)*cl, gy + Math.sin(fa+0.8)*cl);
        ctx.stroke();
      }
      ctx.fillStyle = dotCol;
      ctx.fillRect(MX + dev.x * MSCALE, MY + dev.y * MSCALE, MSCALE, MSCALE);

    } else if (dev.type === 'cam') {
      const dotCol = dev.hacked ? '#223388' : (dev.triggered ? '#ff2020' : '#2277ff');
      // Camera FOV arc
      const cl = (dev.range || 4.5) * MSCALE;
      const fa = dev.facing || Math.PI / 2;
      const fh = (dev.fov || FOV) / 2;
      ctx.strokeStyle = dev.hacked ? '#22338844' : (dev.triggered ? '#ff202055' : '#2277ff55');
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + Math.cos(fa - fh) * cl, gy + Math.sin(fa - fh) * cl);
      ctx.arc(gx, gy, cl, fa - fh, fa + fh);
      ctx.lineTo(gx, gy);
      ctx.stroke();
      ctx.fillStyle = dotCol;
      ctx.fillRect(MX + dev.x * MSCALE, MY + dev.y * MSCALE, MSCALE, MSCALE);

    } else {
      const dotCol = dev.type === 'drone' ? '#00aacc' : dev.type === 'tech' ? '#cc9900' : '#448844';
      ctx.fillStyle = dotCol;
      ctx.fillRect(MX + dev.x * MSCALE, MY + dev.y * MSCALE, MSCALE, MSCALE);
    }
  }

  // Player FOV + triangle
  const pxM = MX + G.P.x * MSCALE;
  const pyM = MY + G.P.y * MSCALE;
  const ang = G.P.angle || 0;

  ctx.strokeStyle = 'rgba(0,255,157,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  const fl = 6 * MSCALE;
  ctx.moveTo(pxM, pyM); ctx.lineTo(pxM + Math.cos(ang-HALF_FOV)*fl, pyM + Math.sin(ang-HALF_FOV)*fl);
  ctx.moveTo(pxM, pyM); ctx.lineTo(pxM + Math.cos(ang+HALF_FOV)*fl, pyM + Math.sin(ang+HALF_FOV)*fl);
  ctx.stroke();

  ctx.save();
  ctx.translate(pxM, pyM);
  ctx.rotate(ang);
  ctx.fillStyle = '#00ff9d';
  ctx.beginPath();
  ctx.moveTo(MSCALE * 2 + 1, 0);
  ctx.lineTo(-(MSCALE+1), -(MSCALE+1));
  ctx.lineTo(-(MSCALE+1),  (MSCALE+1));
  ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,255,157,0.25)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(MX - 2, MY - 2, MW + 4, MH + 4);
  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function _drawHUD(G, ctx, W, H) {
  const cx = W >> 1, cy = H >> 1;

  ctx.save();
  ctx.strokeStyle = 'rgba(0,255,157,0.7)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(cx-10,cy); ctx.lineTo(cx-4,cy);
  ctx.moveTo(cx+4,cy);  ctx.lineTo(cx+10,cy);
  ctx.moveTo(cx,cy-10); ctx.lineTo(cx,cy-4);
  ctx.moveTo(cx,cy+4);  ctx.lineTo(cx,cy+10);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,255,157,0.9)';
  ctx.fillRect(cx-1, cy-1, 2, 2);
  ctx.restore();

  const tv  = (G.traceRuntime ? G.traceRuntime.value || 0 : 0) / 100;
  const bW  = Math.min(W * 0.35, 260);
  const bH  = 6;
  const bX  = (W - bW) / 2;
  const bY  = H - 24;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bX-2, bY-2, bW+4, bH+4);
  let tR, tG;
  if (tv < 0.5) { tR = (tv * 2 * 255) | 0; tG = 200; }
  else          { tR = 255; tG = ((1-(tv-0.5)*2)*200) | 0; }
  ctx.fillStyle = 'rgb(' + tR + ',' + tG + ',0)';
  ctx.fillRect(bX, bY, bW * tv, bH);
  ctx.strokeStyle = 'rgba(0,255,157,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bX, bY, bW, bH);
  ctx.fillStyle  = 'rgba(0,255,157,0.7)';
  ctx.font       = '9px monospace';
  ctx.textAlign  = 'center';
  ctx.fillText('TRACE ' + ((tv * 100) | 0) + '%', W / 2, bY - 4);
  ctx.restore();

  const chasing   = G.devices && G.devices.some((d) => d.type === 'guard' && !d.dead && !d.hacked && d.state === 'chase');
  const highAlert = (G.alert || 0) > 60;
  if (chasing || highAlert) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    ctx.save();
    ctx.fillStyle = 'rgba(220,30,20,' + (0.55 + pulse * 0.35).toFixed(2) + ')';
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(chasing ? '\u26A0 DETECTED \u26A0' : '\u26A0 ALERT', W / 2, 36);
    ctx.restore();
  }

  if ((G.floorCount || 1) > 1) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,255,157,0.55)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('FLOOR ' + (G.floor || 1) + ' / ' + G.floorCount, W - 12, H - 12);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0,255,157,0.55)';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('WALL Q: ' + _normalizeWallQuality(G.wallRenderQuality).toUpperCase() + ' [F6]', 12, H - 12);
  ctx.restore();

  if (G.P && !G.dead && !G.cleared && !G.menuActive) {
    const locked = document.pointerLockElement === G.canvas;
    if (!locked) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(W/2-125, H/2+28, 250, 22);
      ctx.fillStyle = 'rgba(0,255,157,0.75)';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK TO ENABLE MOUSE LOOK', W/2, H/2+44);
      ctx.restore();
    }
  }

  if ((G.desaturation || 0) > 0.05) {
    ctx.save();
    ctx.globalAlpha = G.desaturation * 0.4;
    ctx.fillStyle   = '#001a09';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (G.blackout) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,255,80,0.5)';
    ctx.font      = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEURAL BLACKOUT', W/2, H/2);
    ctx.restore();
  }
}
