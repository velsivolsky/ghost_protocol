import { MAP_H, MAP_W, TILE, TILE_TYPES } from '../core/constants.js';
import { G, byType } from '../core/state.js';

export function render() {
  if (!G.P) {
    return;
  }

  const ctx = G.ctx;
  const width = G.canvas.width;
  const height = G.canvas.height;
  const viewportW = Math.ceil(width / TILE) + 2;
  const viewportH = Math.ceil(height / TILE) + 2;

  G.cam.x = Math.max(0, Math.min(MAP_W - viewportW, Math.floor(G.P.x - viewportW / 2)));
  G.cam.y = Math.max(0, Math.min(MAP_H - viewportH, Math.floor(G.P.y - viewportH / 2)));

  ctx.fillStyle = '#0b1018';
  ctx.fillRect(0, 0, width, height);

  drawTiles(viewportW, viewportH);
  //drawFog();
  drawCameraFov();
  drawGuardVision();
  drawDevices(width, height);
  drawTerminalScanHighlights(width, height);
  drawDoorPreviewLinks();
  drawPlayer();
  drawOverlays(width, height);
  drawHoverLabel(width, height);
  applyDesaturationEffect(width, height);
  
}

function drawHoverLabel(width, height) {
  if (!G.hoverInfo) {
    return;
  }

  const x = Math.max(8, Math.min(width - 190, (G.hoverScreen?.x || 0) + 12));
  const y = Math.max(8, Math.min(height - 34, (G.hoverScreen?.y || 0) - 18));
  const label = (G.hoverInfo.label || '').toUpperCase();

  if (!label) {
    return;
  }

  const ctx = G.ctx;
  ctx.save();
  ctx.font = '10px monospace';

  const textWidth = Math.ceil(ctx.measureText(label).width);
  const boxW = textWidth + 16;
  const boxH = 16;

  ctx.fillStyle = 'rgba(8, 14, 26, 0.9)';
  ctx.fillRect(x, y, boxW, boxH);

  ctx.strokeStyle = 'rgba(122, 200, 255, 0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, boxH - 1);

  ctx.fillStyle = '#d5efff';
  ctx.fillText(label, x + 8, y + 11);
  ctx.restore();
}

function drawFog() {
  const ctx = G.ctx;

  const width = G.canvas.width;
  const height = G.canvas.height;

  const playerX = (G.P.x - G.cam.x) * TILE;
  const playerY = (G.P.y - G.cam.y) * TILE;

  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, width, height);

  const light = ctx.createRadialGradient(
    playerX,
    playerY,
    TILE * 2,
    playerX,
    playerY,
    TILE * 8
  );

  light.addColorStop(0, 'rgba(0,0,0,0)');
  light.addColorStop(1, 'rgba(0,0,0,1)');

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = light;

  ctx.beginPath();
  ctx.arc(playerX, playerY, TILE * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTiles(viewportW, viewportH) {
  const ctx = G.ctx;

  for (let ty = G.cam.y; ty < G.cam.y + viewportH; ty += 1) {
    for (let tx = G.cam.x; tx < G.cam.x + viewportW; tx += 1) {

      if (ty < 0 || ty >= MAP_H || tx < 0 || tx >= MAP_W) {
        continue;
      }

      const key = `${tx},${ty}`;

      const visible = G.visible.has(key);
      const explored = G.explored.has(key);

      const px = (tx - G.cam.x) * TILE;
      const py = (ty - G.cam.y) * TILE;

      if (!explored) {
        ctx.fillStyle = '#000';
        ctx.fillRect(px, py, TILE, TILE);
        continue;
      }

      const tile = G.tiles[ty][tx];
      const isTerminal = tile === TILE_TYPES.MAIN_TERMINAL || tile === TILE_TYPES.SIDE_TERMINAL;
      const nearMainTerminal = !!G.mainTerminal && Math.abs(tx - G.mainTerminal.x) + Math.abs(ty - G.mainTerminal.y) < 9;
      const nearAnyDoor = !!G.doors?.some((door) => Math.abs(tx - door.x) + Math.abs(ty - door.y) < 4);
      const highSecurityZone = nearMainTerminal || nearAnyDoor;

      if (tile === TILE_TYPES.FLOOR || (isTerminal && !visible) || (tile === TILE_TYPES.ENTRANCE && G.floor !== 1)) {

        if (highSecurityZone) {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#17202e' : '#121b29';
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#141c2a' : '#101a28';
        }

        ctx.fillRect(px, py, TILE, TILE);

        ctx.fillStyle = highSecurityZone ? 'rgba(255, 86, 86, 0.03)' : 'rgba(90, 176, 255, 0.028)';
        ctx.fillRect(px, py, TILE, 1);
        ctx.fillRect(px, py, 1, TILE);

        if (!highSecurityZone && (tx + ty * 2) % 7 === 0) {
          ctx.fillStyle = 'rgba(112, 182, 220, 0.05)';
          ctx.fillRect(px + 4, py + 4, TILE - 8, 1);
        }

      } else if (tile === TILE_TYPES.WALL) {

        ctx.fillStyle = highSecurityZone ? '#293245' : '#253247';
        ctx.fillRect(px, py, TILE, 3);

        ctx.fillStyle = highSecurityZone ? '#1a202f' : '#162233';
        ctx.fillRect(px, py + 3, TILE, TILE - 3);

        if ((tx * 11 + ty * 7) % 19 === 0) {
          ctx.fillStyle = highSecurityZone ? 'rgba(255, 118, 118, 0.11)' : 'rgba(86, 179, 255, 0.12)';
          ctx.fillRect(px + TILE - 2, py, 2, TILE);
        }

      } else if (tile === TILE_TYPES.ENTRANCE) {

        ctx.fillStyle = '#001a00';
        ctx.fillRect(px, py, TILE, TILE);

        const alpha = 0.5 + 0.5 * Math.sin(G.tick * 0.05);

        ctx.strokeStyle = `rgba(0,255,100,${alpha})`;
        ctx.lineWidth = 1;

        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);

        ctx.fillStyle = '#00ff9f';
        ctx.font = '10px monospace';
        ctx.fillText('▲', px + 4, py + 12);

        if (G.missionPhase === 2) {
          ctx.fillStyle = 'rgba(0,255,100,0.12)';
          ctx.fillRect(px, py, TILE, TILE);
        }

      } else if (tile === TILE_TYPES.MAIN_TERMINAL) {

        if (!visible) {
          ctx.fillStyle = '#111625';
          ctx.fillRect(px, py, TILE, TILE);
        }

        const color = G.hackingMain
          ? '#00ff9f'
          : '#ffd700';

        ctx.fillStyle = G.hackingMain
          ? '#001a0a'
          : '#1a0a00';

        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);

        ctx.fillStyle = color;
        ctx.font = '11px monospace';

        ctx.fillText('⊕', px + 4, py + 13);

        if (G.hackingMain) {

          ctx.fillStyle = '#00ff9f44';

          ctx.fillRect(
            px,
            py - 3,
            TILE * (G.hackProgress / 100),
            3
          );

          ctx.strokeStyle = '#00ff9f';
          ctx.lineWidth = 0.5;

          ctx.strokeRect(px, py - 3, TILE, 3);
        }

      } else if (tile === TILE_TYPES.SIDE_TERMINAL) {

        if (!visible) {
          ctx.fillStyle = '#111625';
          ctx.fillRect(px, py, TILE, TILE);
        }

        const hacked = G.sideTerminals.some(
          (terminal, index) =>
            terminal.x === tx &&
            terminal.y === ty &&
            G.sideHacked.includes(terminal.id || `sterm${index}`)
        );

        ctx.fillStyle = hacked
          ? '#001510'
          : '#100a00';

        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = hacked
          ? '#0af'
          : '#ffd70066';

        ctx.lineWidth = 0.7;

        ctx.strokeRect(
          px + 2,
          py + 2,
          TILE - 4,
          TILE - 4
        );

        ctx.fillStyle = hacked
          ? '#0af'
          : '#ffd700';

        ctx.font = '10px monospace';

        ctx.fillText(
          hacked ? '▣' : '□',
          px + 4,
          py + 12
        );
      } else if (tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.DOOR_OPEN) {
        const isOpen = tile === TILE_TYPES.DOOR_OPEN;
        ctx.fillStyle = isOpen ? '#142430' : '#2a171d';
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = isOpen ? '#0af' : '#ff3a5c';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);

        ctx.fillStyle = isOpen ? '#8cd9ff' : '#ff788f';
        ctx.font = '10px monospace';
        ctx.fillText(isOpen ? '▢' : '▣', px + 4, py + 12);
      } else if (tile === TILE_TYPES.WALL_TERMINAL) {
        ctx.fillStyle = '#1d2030';
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = '#9ad1ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);

        ctx.fillStyle = '#9ad1ff';
        ctx.font = '10px monospace';
        ctx.fillText('⌗', px + 5, py + 13);
      } else if (tile === TILE_TYPES.HIDE_SPOT) {
        ctx.fillStyle = '#0f1a1f';
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = '#3bd6b0';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);

        ctx.fillStyle = '#3bd6b0';
        ctx.font = '10px monospace';
        ctx.fillText('◌', px + 6, py + 13);
      } else if (tile === TILE_TYPES.STAIR_UP || tile === TILE_TYPES.STAIR_DOWN) {
        const isUp = tile === TILE_TYPES.STAIR_UP;
        const pulse = 0.55 + 0.45 * Math.sin(G.tick * 0.05);

        ctx.fillStyle = isUp ? '#0d1c2a' : '#171a2c';
        ctx.fillRect(px, py, TILE, TILE);

        ctx.strokeStyle = isUp ? '#7ac8ff' : '#c9a8ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);

        ctx.fillStyle = isUp
          ? `rgba(122,200,255,${pulse})`
          : `rgba(201,168,255,${pulse})`;
        ctx.font = '11px monospace';
        ctx.fillText(isUp ? '⇧' : '⇩', px + 4, py + 13);
      }

      if (!visible) {
        ctx.fillStyle = 'rgba(30, 30, 30, 0.56)';
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }
}

function drawDoorPreviewLinks() {
  if (!G.doorPreview?.length || !G.doorPreviewSource) {
    return;
  }

  const ctx = G.ctx;
  const sourceX = (G.doorPreviewSource.x - G.cam.x) * TILE;
  const sourceY = (G.doorPreviewSource.y - G.cam.y) * TILE;

  ctx.save();
  ctx.strokeStyle = 'rgba(120, 210, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);

  for (const doorId of G.doorPreview) {
    const door = G.doors.find((item) => item.id === doorId);

    if (!door) {
      continue;
    }

    const doorX = (door.x + 0.5 - G.cam.x) * TILE;
    const doorY = (door.y + 0.5 - G.cam.y) * TILE;

    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(doorX, doorY);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}


function drawCameraFov() {
  const ctx = G.ctx;

  for (const camera of byType('cam')) {
    const key = `${Math.floor(camera.x)},${Math.floor(camera.y)}`;

    if (camera.hacked || G.blackout || !G.visible.has(key)) {
      continue;
    }

    const px = (camera.x - G.cam.x) * TILE + TILE / 2;
    const py = (camera.y - G.cam.y) * TILE + TILE / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(255,58,92,0.07)';
    ctx.strokeStyle = 'rgba(255,58,92,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    drawClippedCone(ctx, camera.x + 0.5, camera.y + 0.5, camera.facing, camera.fov, camera.range);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawGuardVision() {
  for (const guard of byType('guard')) {
    if (guard.dead || guard.offline) {
      continue;
    }

    const key = `${Math.floor(guard.x)},${Math.floor(guard.y)}`;
    if (!G.visible.has(key)) {
      continue;
    }

    let color = 'rgba(255,255,0,0.05)';

    if (guard.state === 'suspicious') {
      color = 'rgba(255,140,0,0.08)';
    }

    if (guard.state === 'chase') {
      color = 'rgba(255,0,80,0.12)';
    }

    drawVisionCone(guard.x + 0.5, guard.y + 0.5, guard.facing || 0, 1.6, 5, color);
  }
}

function drawDevices(width, height) {
  for (const device of G.devices) {
    const px = (device.x - G.cam.x) * TILE;
    const py = (device.y - G.cam.y) * TILE;

    if (px < -TILE || py < -TILE || px > width + TILE || py > height + TILE) {
      continue;
    }

    const key = `${Math.floor(device.x)},${Math.floor(device.y)}`;
    const isVisible = G.visible.has(key);

    if (device.type === 'cam') {
      if (!G.seenDevices.has(device.id) && !isVisible) continue;
    } else if (device.type === 'mainterm' || device.type === 'sterm') {
      if (!isVisible) continue;
    } else if (!isVisible) {
      continue;
    }

    G.ctx.save();
    drawDevice(device, px, py);
    G.ctx.restore();
  }
}

function drawPlayer() {
  const ctx = G.ctx;
  const px = (G.P.x - G.cam.x) * TILE;
  const py = (G.P.y - G.cam.y) * TILE;

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#0af';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(px + TILE / 2, py + TILE / 2, 4.5 * TILE, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#00ff9f';
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 6);
  ctx.fillStyle = '#0af';
  ctx.fillRect(px + 5, py + 3, TILE - 10, 4);

  if (G.hackingMain) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(G.tick * 0.15);
    ctx.strokeStyle = '#00ff9f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
  }

  ctx.restore();
}

function drawOverlays(width, height) {
  const ctx = G.ctx;

  if (G.blackout) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, width, height);
  }

  if (G.hackingMain) {
    ctx.fillStyle = 'rgba(0,255,159,0.07)';
    ctx.fillRect(0, height - 22, width * (G.hackProgress / 100), 22);
    ctx.fillStyle = '#00ff9f';
    ctx.font = '9px monospace';
    ctx.fillText(`HAKOWANIE TERMINALA: ${Math.ceil(G.hackProgress)}% — NIE RUSZAJ SIĘ`, 8, height - 8);
  }
}

function drawTerminalScanHighlights(width, height) {
  const highlights = G.terminalRuntime?.scanHighlights;

  if (!highlights?.length) {
    return;
  }

  const ctx = G.ctx;
  ctx.save();

  for (const item of highlights) {
    const px = (item.x - G.cam.x) * TILE;
    const py = (item.y - G.cam.y) * TILE;

    if (px < -TILE || py < -TILE || px > width + TILE || py > height + TILE) {
      continue;
    }

    const color = getHighlightColor(item.type);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function getHighlightColor(type) {
  if (type === 'wterm' || type === 'door') return '#ffd166';
  if (type === 'cam') return '#ff6b8a';
  if (type === 'guard') return '#ffd700';
  if (type === 'drone') return '#54c6ff';
  if (type === 'tech') return '#c7d2ff';
  if (type === 'distract') return '#00ff9f';
  if (type === 'mainterm' || type === 'sterm') return '#00ff9f';
  return '#7ac8ff';
}

function drawVisionCone(x, y, angle, fov, range, color) {
  const ctx = G.ctx;
  ctx.save();
  ctx.beginPath();
  drawClippedCone(ctx, x, y, angle, fov, range);

  const gradient = ctx.createRadialGradient(x * TILE, y * TILE, 0, x * TILE, y * TILE, range * TILE);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawClippedCone(ctx, x, y, angle, fov, range) {
  const rays = 20;

  ctx.moveTo(x * TILE, y * TILE);

  for (let index = 0; index <= rays; index += 1) {
    const rayAngle = angle - fov / 2 + (fov * index) / rays;
    const hit = traceVisionRay(x, y, rayAngle, range);
    ctx.lineTo(hit.x * TILE, hit.y * TILE);
  }

  ctx.closePath();
}

function traceVisionRay(startX, startY, angle, range) {
  const step = 0.1;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;

  let x = startX;
  let y = startY;

  for (let distance = 0; distance < range; distance += step) {
    const nextX = x + dx;
    const nextY = y + dy;
    const tileX = nextX | 0;
    const tileY = nextY | 0;

    if (G.tiles[tileY]?.[tileX] === TILE_TYPES.WALL) {
      return { x, y };
    }

    x = nextX;
    y = nextY;
  }

  return { x, y };
}

function drawDevice(device, px, py) {
  const ctx = G.ctx;

  if (device.type === 'cam') {
    ctx.fillStyle = device.hacked ? '#00ff9f18' : '#ff3a5c18';
    ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = device.hacked ? '#00ff9f' : '#ff3a5c';
    ctx.font = '11px monospace';
    ctx.fillText(device.hacked ? '◉' : '◎', px + 3, py + 12);
    return;
  }

  if (device.type === 'guard') {
    if (device.dead) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ff3a5c';
      ctx.fillRect(px + 4, py + 7, TILE - 8, 4);
      ctx.globalAlpha = 1;
      return;
    }

    let color = '#ffd700';

    if (device.state === 'suspicious') {
      color = '#ff9a00';
    } else if (device.state === 'chase') {
      color = '#ff3a5c';
    } else if (device.hacked) {
      color = '#00ff9f';
    }

    ctx.fillStyle = color;
    ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(px + TILE / 2 + Math.cos(device.facing || 0) * 4 - 1, py + TILE / 2 + Math.sin(device.facing || 0) * 4 - 1, 2, 2);

    if (device.state === 'suspicious') {
      ctx.fillStyle = '#ff9a00';
      ctx.font = '8px monospace';
      ctx.fillText('?', px + 5, py - 2);
    } else if (device.state === 'chase') {
      ctx.fillStyle = '#ff3a5c';
      ctx.font = '8px monospace';
      ctx.fillText('!', px + 5, py - 2);
    }

    return;
  }

  if (device.type === 'drone' && !device.dead) {
    ctx.strokeStyle = device.hijacked ? '#00ff9f' : '#0af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 4, 0, Math.PI * 2);
    ctx.stroke();

    for (let rotor = 0; rotor < 4; rotor += 1) {
      const angle = rotor * (Math.PI / 2) + G.tick * 0.05;
      ctx.fillStyle = device.hijacked ? '#00ff9f44' : '#0af4';
      ctx.fillRect(px + TILE / 2 + Math.cos(angle) * 5 - 1, py + TILE / 2 + Math.sin(angle) * 5 - 1, 2, 2);
    }
    return;
  }

  if (device.type === 'mainterm' || device.type === 'sterm') {
    return;
  }

  if (device.type === 'distract') {
    const now = performance.now();
    const cooling = now < (device.cooldownUntil || 0) && !device.active;
    const color = device.active ? '#00ff9f' : cooling ? '#ffd166' : '#7ac8ff';
    const bg = device.active ? '#002118' : cooling ? '#211707' : '#0b1320';

    ctx.fillStyle = bg;
    ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = color;
    ctx.font = '10px monospace';
    ctx.fillText(device.active ? '✶' : '◈', px + 6, py + 13);
    return;
  }

  if (device.type === 'tech' && !device.dead) {
    ctx.fillStyle = device.hardening ? '#ffd700' : '#c7d2ff';
    ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
    ctx.fillStyle = '#07090f';
    ctx.font = '10px monospace';
    ctx.fillText('⌁', px + 4, py + 13);
  }
}

function applyDesaturationEffect(width, height) {
  const ctx = G.ctx;

  if (G.desaturation <= 0.01) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = G.desaturation;
  
  const grayLevel = Math.floor(128 + (127 * (1 - G.desaturation)));
  ctx.fillStyle = `rgb(${grayLevel}, ${grayLevel}, ${grayLevel})`;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}