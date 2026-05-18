/**
 * Ghost Protocol — Raycaster 2.5D Renderer
 * Wolfenstein-style DDA raycasting, cyberpunk green palette.
 *
 * Exports: initRenderer(), renderFrame(G), drawMinimap()
 *
 * Coordinate system: ALL positions in tile space (float).
 * G.P.x / G.P.y = player tile position (NOT pixels).
 */

import { FOV, HALF_FOV, TILE, TILE_TYPES } from '../core/constants.js';

// ─── Z-buffer (allocated once, reallocated on resize) ────────────────────────
let zBuffer  = null;
let lastW    = 0;

// ─── Wall colour palette (per tile type, EW face) ────────────────────────────
function wallBaseColour(tileVal) {
  switch (tileVal) {
    case TILE_TYPES.WALL:          return [18,  52,  28];
    case TILE_TYPES.DOOR_CLOSED:   return [10,  50,  45];
    case TILE_TYPES.DOOR_LOCKED:   return [55,  20,  10];
    case TILE_TYPES.MAIN_TERMINAL: return [0,   80,  60];
    case TILE_TYPES.SIDE_TERMINAL: return [0,   60,  80];
    case TILE_TYPES.WALL_TERMINAL: return [0,   50,  70];
    case TILE_TYPES.CODE_TERMINAL: return [60,  40,   0];
    default:                       return [20,  45,  25];
  }
}

// ─── Solid check for raycaster ────────────────────────────────────────────────
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

// ─── Public: one-time init ────────────────────────────────────────────────────
export function initRenderer() {
  // Z-buffer allocated lazily on first renderFrame when canvas width is known.
}

// ─── Public: full frame ───────────────────────────────────────────────────────
export function renderFrame(G) {
  if (!G.P || !G.ctx || !G.canvas) return;

  const ctx    = G.ctx;
  const W      = G.canvas.width;
  const H      = G.canvas.height;
  const halfH  = H >> 1;

  // Reallocate z-buffer if canvas width changed
  if (W !== lastW) {
    zBuffer = new Float32Array(W);
    lastW   = W;
  }

  const px    = G.P.x + 0.5;
  const py    = G.P.y + 0.5;
  const angle = G.P.angle || 0;

  const dirX    = Math.cos(angle);
  const dirY    = Math.sin(angle);
  const planeMag = Math.tan(HALF_FOV);
  const planeX   = -dirY * planeMag;
  const planeY   =  dirX * planeMag;

  // ── 1. Ceiling gradient ──────────────────────────────────────────────────
  const ceilGrad = ctx.createLinearGradient(0, 0, 0, halfH);
  ceilGrad.addColorStop(0,   '#000000');
  ceilGrad.addColorStop(0.6, '#050e08');
  ceilGrad.addColorStop(1,   '#091408');
  ctx.fillStyle = ceilGrad;
  ctx.fillRect(0, 0, W, halfH);

  // ── 2. Floor ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#040b05';
  ctx.fillRect(0, halfH, W, H - halfH);

  // ── 3. DDA raycasting ────────────────────────────────────────────────────
  const tiles    = G.tiles;
  const imgData  = ctx.createImageData(W, H);
  const pixels   = imgData.data;

  for (let col = 0; col < W; col++) {
    const camX = (2 * col) / W - 1;

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

    let side    = 0;
    let hitTile = TILE_TYPES.WALL;
    let hit     = false;

    for (let iter = 0; iter < 64; iter++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (isSolid(tiles, mapX, mapY)) {
        hitTile = (tiles[mapY] && tiles[mapY][mapX] !== undefined) ? tiles[mapY][mapX] : TILE_TYPES.WALL;
        hit = true;
        break;
      }
    }

    if (!hit) {
      zBuffer[col] = 1e30;
      continue;
    }

    const perpDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    zBuffer[col] = perpDist;

    const lineH     = Math.min(H * 2, (H / perpDist) | 0);
    const drawStart = Math.max(0, halfH - (lineH >> 1));
    const drawEnd   = Math.min(H - 1, halfH + (lineH >> 1));

    const [br, bg, bb] = wallBaseColour(hitTile);
    const sideDim = side === 1 ? 0.55 : 1.0;
    const fogF    = Math.max(0, 1 - perpDist / 14);
    const glow    = perpDist < 2.5 ? ((1 - perpDist / 2.5) * 30) | 0 : 0;

    const fr = Math.min(255, (br * sideDim * fogF) | 0) + glow;
    const fg = Math.min(255, (bg * sideDim * fogF) | 0) + glow * 2;
    const fb = Math.min(255, (bb * sideDim * fogF) | 0) + glow;

    for (let y = drawStart; y <= drawEnd; y++) {
      const idx = (y * W + col) * 4;
      pixels[idx]     = fr;
      pixels[idx + 1] = fg;
      pixels[idx + 2] = fb;
      pixels[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // ── 4. Sprite billboards ─────────────────────────────────────────────────
  _drawSprites(G, ctx, W, H, px, py, dirX, dirY, planeX, planeY);

  // ── 5. Minimap ───────────────────────────────────────────────────────────
  drawMinimap(G);

  // ── 6. HUD ───────────────────────────────────────────────────────────────
  _drawHUD(G, ctx, W, H);
}

// ─── Billboard sprites ────────────────────────────────────────────────────────
function _drawSprites(G, ctx, W, H, px, py, dirX, dirY, planeX, planeY) {
  const halfH  = H >> 1;
  const sprites = [];

  for (const dev of G.devices) {
    if (dev.dead) continue;
    const sx = (dev.x || 0) + 0.5;
    const sy = (dev.y || 0) + 0.5;
    const dx = sx - px;
    const dy = sy - py;
    sprites.push({ dev, dx, dy, dist: dx * dx + dy * dy });
  }

  sprites.sort((a, b) => b.dist - a.dist);

  const invDet = 1.0 / (planeX * dirY - planeY * dirX);

  for (const { dev, dx, dy, dist } of sprites) {
    const transformX = invDet * ( dirY * dx - dirX * dy);
    const transformY = invDet * (-planeY * dx + planeX * dy);

    if (transformY <= 0.15) continue;

    const screenX = ((W / 2) * (1 + transformX / transformY)) | 0;
    const spriteH = Math.min(H * 2, (Math.abs(H / transformY)) | 0);
    const drawSY  = Math.max(0, halfH - (spriteH >> 1));
    const drawEY  = Math.min(H - 1, halfH + (spriteH >> 1));
    const spriteW = spriteH;
    const drawSX  = Math.max(0, screenX - (spriteW >> 1));
    const drawEX  = Math.min(W - 1, screenX + (spriteW >> 1));
    const sw      = drawEX - drawSX;
    const sh      = drawEY - drawSY;

    if (sw <= 0 || sh <= 0) continue;

    const col = _spriteColour(dev);
    if (!col) continue;

    const rawDist = Math.sqrt(dist);
    const fogF    = Math.max(0, 1 - rawDist / 12);
    if (fogF <= 0) continue;

    const [cr, cg, cb, ca] = col;
    const fr = (cr * fogF) | 0;
    const fg = (cg * fogF) | 0;
    const fb = (cb * fogF) | 0;

    ctx.save();
    ctx.globalAlpha = ca * fogF;
    ctx.fillStyle   = `rgb(${fr},${fg},${fb})`;

    // Column-by-column z-buffer check
    for (let c = drawSX; c <= drawEX; c++) {
      if (zBuffer[c] <= transformY) continue;
      ctx.fillRect(c, drawSY, 1, sh);
    }

    // Head highlight
    const midC = screenX;
    if (midC >= 0 && midC < W && zBuffer[midC] > transformY) {
      const headH = (sh * 0.28) | 0;
      const hw    = Math.max(2, (sw >> 1));
      ctx.globalAlpha = Math.min(0.95, ca * fogF * 1.3);
      ctx.fillStyle   = `rgb(${Math.min(255, fr + 55)},${Math.min(255, fg + 70)},${Math.min(255, fb + 55)})`;
      ctx.fillRect(midC - (hw >> 1), drawSY, hw, headH);
    }

    ctx.restore();
  }
}

function _spriteColour(dev) {
  const { type, state } = dev;
  if (type === 'guard') {
    if (dev.hacked)                                         return [0,   160, 255, 0.9];
    if (state === 'chase')                                  return [220,  30,  20, 0.95];
    if (state === 'suspicious')                             return [210, 160,   0, 0.9];
    if (state === 'search')                                 return [180, 100,   0, 0.85];
    return                                                        [20,  140,  60, 0.8];
  }
  if (type === 'cam') {
    if (dev.offline || dev.hacked)                          return [30,   30, 120, 0.6];
    if (dev.triggered || dev.alerting)                      return [220,  30,  20, 0.9];
    return                                                        [0,    80, 220, 0.75];
  }
  if (type === 'drone') {
    if (state === 'chase' || state === 'alert')             return [220,  60,   0, 0.9];
    return                                                        [0,   100, 180, 0.8];
  }
  if (type === 'tech')    return [180, 140,  20, 0.75];
  if (type === 'distract')return [0,   200, 100, 0.6];
  return null;
}

// ─── Minimap (in corner of main canvas) ──────────────────────────────────────
export function drawMinimap(G) {
  if (!G || !G.P || !G.tiles || !G.ctx) return;

  const ctx   = G.ctx;
  const tiles = G.tiles;
  const ROWS  = tiles.length;
  const COLS  = tiles[0] ? tiles[0].length : 0;
  if (!ROWS || !COLS) return;

  const MSCALE = 3;
  const MPAD   = 8;
  const MW     = COLS * MSCALE;
  const MH     = ROWS * MSCALE;
  const MX     = MPAD;
  const MY     = MPAD;

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(MX - 2, MY - 2, MW + 4, MH + 4);

  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const key   = `${tx},${ty}`;
      const known = G.explored?.has(key) || G.visible?.has(key);
      if (!known) continue;

      const v = tiles[ty][tx];
      let colour;
      if (v === TILE_TYPES.FLOOR || v === TILE_TYPES.ENTRANCE || v === TILE_TYPES.EXIT_USED ||
          v === TILE_TYPES.HIDE_SPOT || v === TILE_TYPES.STAIR_UP || v === TILE_TYPES.STAIR_DOWN ||
          v === TILE_TYPES.DOOR_OPEN) {
        colour = '#0e2415';
      } else if (v === TILE_TYPES.DOOR_CLOSED || v === TILE_TYPES.DOOR_LOCKED) {
        colour = '#10403a';
      } else if (v === TILE_TYPES.MAIN_TERMINAL) {
        colour = '#005c46';
      } else if (v === TILE_TYPES.SIDE_TERMINAL || v === TILE_TYPES.CODE_TERMINAL) {
        colour = '#00405a';
      } else if (v === TILE_TYPES.WALL_TERMINAL) {
        colour = '#003a50';
      } else {
        colour = '#0a1f10';
      }

      ctx.fillStyle = colour;
      ctx.fillRect(MX + tx * MSCALE, MY + ty * MSCALE, MSCALE, MSCALE);
    }
  }

  // Entities
  for (const dev of G.devices) {
    const key   = `${dev.x | 0},${dev.y | 0}`;
    const known = G.visible?.has(key) || G.seenDevices?.has(dev.id);
    if (!known) continue;

    let dotCol;
    if (dev.type === 'guard') {
      if (dev.dead || dev.hacked)                                      dotCol = '#2255ff';
      else if (dev.state === 'chase')                                  dotCol = '#ff2020';
      else if (dev.state === 'suspicious' || dev.state === 'search')   dotCol = '#ffcc00';
      else                                                             dotCol = '#00cc55';

      if (!dev.dead && !dev.hacked) {
        const gx      = MX + dev.x * MSCALE + MSCALE / 2;
        const gy      = MY + dev.y * MSCALE + MSCALE / 2;
        const coneLen = 7 * MSCALE;
        const facing  = dev.facing || 0;
        ctx.strokeStyle = dotCol + '55';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + Math.cos(facing - 0.8) * coneLen, gy + Math.sin(facing - 0.8) * coneLen);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + Math.cos(facing + 0.8) * coneLen, gy + Math.sin(facing + 0.8) * coneLen);
        ctx.stroke();
      }
    } else if (dev.type === 'cam')     { dotCol = '#2277ff'; }
    else if (dev.type === 'drone')     { dotCol = '#00aacc'; }
    else if (dev.type === 'tech')      { dotCol = '#cc9900'; }
    else                               { dotCol = '#448844'; }

    ctx.fillStyle = dotCol;
    ctx.fillRect(MX + dev.x * MSCALE, MY + dev.y * MSCALE, MSCALE, MSCALE);
  }

  // Player FOV lines
  const pxM = MX + G.P.x * MSCALE;
  const pyM = MY + G.P.y * MSCALE;
  const ang = G.P.angle || 0;
  const fovLen = 6 * MSCALE;

  ctx.strokeStyle = 'rgba(0,255,157,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(pxM, pyM);
  ctx.lineTo(pxM + Math.cos(ang - HALF_FOV) * fovLen, pyM + Math.sin(ang - HALF_FOV) * fovLen);
  ctx.moveTo(pxM, pyM);
  ctx.lineTo(pxM + Math.cos(ang + HALF_FOV) * fovLen, pyM + Math.sin(ang + HALF_FOV) * fovLen);
  ctx.stroke();

  // Player triangle
  ctx.save();
  ctx.translate(pxM, pyM);
  ctx.rotate(ang);
  ctx.fillStyle = '#00ff9d';
  ctx.beginPath();
  ctx.moveTo(MSCALE * 2 + 1, 0);
  ctx.lineTo(-(MSCALE + 1), -(MSCALE + 1));
  ctx.lineTo(-(MSCALE + 1),  (MSCALE + 1));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(0,255,157,0.25)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(MX - 2, MY - 2, MW + 4, MH + 4);

  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function _drawHUD(G, ctx, W, H) {
  // Crosshair
  const cx = W >> 1;
  const cy = H >> 1;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,255,157,0.7)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4,  cy);
  ctx.moveTo(cx + 4,  cy); ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4);
  ctx.moveTo(cx, cy + 4);  ctx.lineTo(cx, cy + 10);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,255,157,0.9)';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
  ctx.restore();

  // TRACE bar
  const traceVal = (G.traceRuntime?.value || 0) / 100;
  const barW     = Math.min(W * 0.35, 260);
  const barH     = 6;
  const barX     = (W - barW) / 2;
  const barY     = H - 24;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

  let tR, tG;
  if (traceVal < 0.5) { tR = (traceVal * 2 * 255) | 0; tG = 200; }
  else                { tR = 255; tG = ((1 - (traceVal - 0.5) * 2) * 200) | 0; }

  ctx.fillStyle = `rgb(${tR},${tG},0)`;
  ctx.fillRect(barX, barY, barW * traceVal, barH);
  ctx.strokeStyle = 'rgba(0,255,157,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  ctx.fillStyle = 'rgba(0,255,157,0.7)';
  ctx.font      = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`TRACE ${((traceVal * 100) | 0)}%`, W / 2, barY - 4);
  ctx.restore();

  // Alert banner
  const chasing  = G.devices?.some((d) => d.type === 'guard' && !d.dead && !d.hacked && d.state === 'chase');
  const highAlert = (G.alert || 0) > 60;
  if (chasing || highAlert) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006);
    ctx.save();
    ctx.fillStyle = `rgba(220,30,20,${(0.55 + pulse * 0.35).toFixed(2)})`;
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(chasing ? '\u26A0 DETECTED \u26A0' : '\u26A0 ALERT', W / 2, 36);
    ctx.restore();
  }

  // Floor indicator
  if ((G.floorCount || 1) > 1) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,255,157,0.55)';
    ctx.font      = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FLOOR ${G.floor || 1} / ${G.floorCount}`, W - 12, H - 12);
    ctx.restore();
  }

  // Mouse-lock hint
  if (G.P && !G.dead && !G.cleared && !G.menuActive) {
    const locked = document.pointerLockElement === G.canvas;
    if (!locked) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(W / 2 - 125, H / 2 + 28, 250, 22);
      ctx.fillStyle = 'rgba(0,255,157,0.75)';
      ctx.font      = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK TO ENABLE MOUSE LOOK', W / 2, H / 2 + 44);
      ctx.restore();
    }
  }

  // Desaturation overlay (hide-spot)
  if ((G.desaturation || 0) > 0.05) {
    ctx.save();
    ctx.globalAlpha = G.desaturation * 0.4;
    ctx.fillStyle   = '#001a09';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Blackout
  if (G.blackout) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,255,80,0.5)';
    ctx.font      = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEURAL BLACKOUT', W / 2, H / 2);
    ctx.restore();
  }
}
