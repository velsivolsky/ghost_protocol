import {
  HACK_RANGE,
  MAP_H,
  MAP_W,
  MAIN_HACK_DISTANCE,
  TILE,
  TILE_TYPES,
} from '../core/constants.js';
import { G, byType } from '../core/state.js';
import { clamp, dst } from '../utils/math.js';
import { floatMsg, log, rebuildList, refreshHUD } from './ui.js';
import { updateMissionText } from './mission.js';
import { grantQuickHack } from './quickhacks.js';

export function closeCtx() {
  G.dom.contextMenu.style.display = 'none';
  G.ctxOpen = false;
  G.doorPreview = [];
  G.doorPreviewSource = null;
}

function addCtxBtn(label, enabled, onClick) {
  const button = document.createElement('button');
  button.textContent = label;
  button.disabled = !enabled;

  if (enabled && onClick) {
    button.onclick = onClick;
  }

  G.dom.contextButtons.appendChild(button);
}

function addCtxSep() {
  const separator = document.createElement('div');
  separator.className = 'sep';
  G.dom.contextButtons.appendChild(separator);
}

export function showCtx(screenX, screenY, target, targetType) {
  G.dom.contextButtons.innerHTML = '';
  G.dom.contextTitle.textContent = target.desc || targetType;

  const inRange = dst(target, G.P) <= HACK_RANGE;
  const camInRange = dst(target, G.P) <= 3.5;
  const bw = G.P.bw;

  if (targetType === 'cam') {
    addCtxBtn('◉ feed blind (BW:15)', bw >= 15 && camInRange && !target.hacked, () => {
      hackCam(target);
      showCtx(screenX, screenY, target, 'cam');
    });
    addCtxBtn('◎ feed loop -10s (BW:8)', bw >= 8 && camInRange && !target.hacked, () => {
      loopCam(target);
      showCtx(screenX, screenY, target, 'cam');
    });

    if (target.hacked) {
      addCtxBtn('✓ Już zhakowana', false);
    }
  } else if (targetType === 'guard') {
    if (target.offline) {
      addCtxBtn('✗ Offline — brak sygnału', false);
    } else {
      addCtxBtn('⚡ Przeciąż implant (BW:30)', bw >= 30 && inRange && !target.dead, () => {
        overloadGuard(target);
        closeCtx();
      });
      addCtxBtn(
        '👁 Zaślepij cyberoczy (BW:15)',
        bw >= 15 && inRange && !target.dead && !target.hacked,
        () => {
          blindGuard(target);
          closeCtx();
        },
      );
      addCtxBtn('↻ Przekieruj patrol (BW:10)', bw >= 10 && inRange && !target.dead, () => {
        redirectGuard(target);
        closeCtx();
      });
    }
  } else if (targetType === 'drone') {
    addCtxBtn(
      '⬡ Przejmi sterowanie (BW:25)',
      bw >= 25 && inRange && !target.hijacked && !target.dead,
      () => {
        hijackDrone(target);
        closeCtx();
      },
    );
    addCtxBtn('✗ Wyłącz dron (BW:20)', bw >= 20 && inRange && !target.dead, () => {
      killDrone(target);
      closeCtx();
    });
  } else if (targetType === 'tech') {
    if (target.dead) {
      addCtxBtn('✗ Technik nieaktywny', false);
    } else {
      addCtxBtn('⚡ Zneutralizuj technika (BW:8)', bw >= 8 && inRange, () => {
        eliminateTechnician(target);
        closeCtx();
      });
    }
  } else if (targetType === 'sterm') {
    const alreadyHacked = target.hacked || G.sideHacked.includes(target.id);

    if (alreadyHacked && !target.used) {
      if (inRange) {
        renderTerminalOptions(target, screenX, screenY);
      } else {
        addCtxBtn('⊛ Zbliz sie do terminala', false);
      }
      return;
    }

    if (alreadyHacked && target.used) {
      addCtxBtn('✓ Terminal wykorzystany', false);
    } else {
      addCtxBtn('⊡ Hackuj terminal (BW:20) — odblokuj opcje', bw >= 20 && inRange, () => {
        if (hackSideTerm(target)) {
          renderTerminalOptions(target, screenX, screenY);
        }
      });
    }
  } else if (targetType === 'wterm') {
    if (inRange) {
      renderDoorControlMenu(target, screenX, screenY, [target.doorId]);
    } else {
      addCtxBtn('⊛ Zbliz sie do panelu drzwi', false);
      addCtxSep();
      addCtxBtn('✗ Zamknij', true, closeCtx);
      G.dom.contextMenu.style.left = `${Math.min(screenX, window.innerWidth - 164)}px`;
      G.dom.contextMenu.style.top = `${Math.min(screenY, window.innerHeight - 220)}px`;
      G.dom.contextMenu.style.display = 'block';
      G.ctxOpen = true;
    }
    return;
  } else if (targetType === 'mainterm') {
    const distance = dst(target, G.P);
    const access = G.mainTerminalAuth || { requiredShards: 0, recoveredByNode: {}, unlocked: true };
    const recoveredCount = Object.keys(access.recoveredByNode || {}).length;

    if (G.mainHacked) {
      addCtxBtn('✓ Zhakowany — wróć do wejścia', false);
    } else if (!access.unlocked) {
      addCtxBtn(`✗ MAIN LOCKED [${recoveredCount}/${access.requiredShards} SHARD]`, false);
      addCtxBtn('↳ side terminal: breach firewall -> dump creds', false);
    } else if (distance > MAIN_HACK_DISTANCE) {
      addCtxBtn('⊛ Zbliż się do terminala', false);
    } else if (G.hackingMain) {
      addCtxBtn('⏳ Hakowanie w toku... pozostań!', false);
      addCtxBtn('✗ Przerwij kanał', true, () => {
        G.hackingMain = false;
        log('Kanał zerwany', 'w');
        updateMissionText();
        closeCtx();
      });
    } else {
      addCtxBtn('⊛ Inicjuj hack (pozostań nieruchomy)', true, () => {
        G.hackingMain = true;
        G.missionPhase = 1;
        log('Kanał otwarty — nie ruszaj się!', 'ok');
        updateMissionText();
        closeCtx();
      });
    }

    addCtxBtn('🚪 Sterowanie drzwiami', inRange, () => {
      renderDoorControlMenu(target, screenX, screenY, G.doors.map((door) => door.id));
    });
  }

  addCtxSep();
  addCtxBtn('✗ Zamknij', true, closeCtx);

  G.dom.contextMenu.style.left = `${Math.min(screenX, window.innerWidth - 164)}px`;
  G.dom.contextMenu.style.top = `${Math.min(screenY, window.innerHeight - 220)}px`;
  G.dom.contextMenu.style.display = 'block';
  G.ctxOpen = true;
}

export function handleCanvasClick(event) {
  if (!G.P || G.dead || G.cleared) {
    return;
  }
  event.stopPropagation();
  closeCtx();

  const rect = G.canvas.getBoundingClientRect();
  const worldX = (event.clientX - rect.left) / TILE + G.cam.x;
  const worldY = (event.clientY - rect.top) / TILE + G.cam.y;
  const tileX = worldX | 0;
  const tileY = worldY | 0;
  const tile = G.tiles[tileY]?.[tileX];
  const playerTileX = G.P.x | 0;
  const playerTileY = G.P.y | 0;
  const playerTile = G.tiles[playerTileY]?.[playerTileX];
  const playerOnStairs = playerTile === TILE_TYPES.STAIR_UP || playerTile === TILE_TYPES.STAIR_DOWN;

  if (playerOnStairs) {
    if (!G.elevatorUnlocked) {
      log('Winda zablokowana. Odblokuj: connect node_main -> unlock elevator', 'w');
      return;
    }
    G.stairTransitionRequested = true;
    return;
  }

  if (tile === TILE_TYPES.MAIN_TERMINAL) {
    showCtx(event.clientX, event.clientY, G.mainTerminal, 'mainterm');
    return;
  }

  for (let index = 0; index < G.sideTerminals.length; index += 1) {
    const terminal = G.sideTerminals[index];

    if (terminal.x === tileX && terminal.y === tileY) {
      showCtx(event.clientX, event.clientY, terminal, 'sterm');
      return;
    }
  }

  for (let index = 0; index < G.wallTerminals.length; index += 1) {
    const panel = G.wallTerminals[index];

    if (panel.x === tileX && panel.y === tileY) {
      showCtx(event.clientX, event.clientY, panel, 'wterm');
      return;
    }
  }

  for (const device of G.devices) {
    if (Math.abs(device.x - worldX) < 0.8 && Math.abs(device.y - worldY) < 0.8) {
      showCtx(event.clientX, event.clientY, device, device.type);
      return;
    }
  }
}

function hackCam(camera) {
  if (G.P.bw < 15) {
    return;
  }

  if (camera.hacked) {
    return;
  }

  camera.hacked = true;
  G.P.bw -= 15;
  raiseCameraInteractionAlert(5);
  log(`Kamera ${camera.id} zaślepiona`, 'ok');
  floatMsg('BLIND', camera, '#00ff9f');
  requestTechnician(camera);
  rebuildList();
}

function loopCam(camera) {
  if (G.P.bw < 8) {
    return;
  }

  if (camera.hacked) {
    return;
  }

  camera.hacked = true;
  G.P.bw -= 8;
  raiseCameraInteractionAlert(2);
  log('Feed zapętlony', 'ok');
  floatMsg('LOOP', camera, '#0af');
  requestTechnician(camera);
  rebuildList();

  setTimeout(() => {
    if (G.P && !G.dead) {
      camera.hacked = false;
      rebuildList();
      log('Feed wznowiony', 'w');
    }
  }, 10000);
}

export function overloadGuard(guard) {
  if (G.P.bw < 30) {
    return;
  }

  guard.dead = true;
  guard.bodyReported = false;
  G.P.bw -= 30;
  log('Implant przeciążony — strażnik down', 'ok');
  floatMsg('FLATLINED', guard, '#ff3a5c');
  rebuildList();
}

function blindGuard(guard) {
  if (G.P.bw < 15) {
    return;
  }

  guard.hacked = true;
  G.P.bw -= 15;
  G.alert = clamp(G.alert + 8);
  log('Cyberoczy zaślepione', 'ok');
  floatMsg('BLIND', guard, '#0af');
  rebuildList();

  setTimeout(() => {
    if (G.P && !G.dead) {
      guard.hacked = false;
      rebuildList();
    }
  }, 8000);
}

function redirectGuard(guard) {
  if (G.P.bw < 10) {
    return;
  }

  G.P.bw -= 10;
  guard.patrol = [
    { x: 1, y: 1 },
    { x: MAP_W - 3, y: MAP_H - 3 },
  ];
  guard.pi = 0;
  guard.aware = false;
  guard.alertT = 0;
  G.alert = clamp(G.alert + 5);
  log('Patrol przekierowany', 'ok');
  floatMsg('REROUTE', guard, '#ffd700');
}

export function hijackDrone(drone) {
  if (G.P.bw < 25) {
    return;
  }

  drone.hijacked = true;
  drone.hacked = true;
  G.P.bw -= 25;
  G.alert = clamp(G.alert + 10);
  log('Dron przejęty', 'ok');
  floatMsg('HIJACKED', drone, '#0af');
  rebuildList();
}

function killDrone(drone) {
  if (G.P.bw < 20) {
    return;
  }

  drone.dead = true;
  G.P.bw -= 20;
  G.alert = clamp(G.alert + 12);
  log('Dron wyłączony', 'ok');
  floatMsg('OFFLINE', drone, '#ffd700');
  rebuildList();
}

function hackSideTerm(terminal) {
  if (G.P.bw < 20) {
    return;
  }

  G.P.bw -= 20;
  terminal.hacked = true;
  terminal.used = false;

  if (!G.sideHacked.includes(terminal.id)) {
    G.sideHacked.push(terminal.id);
  }

  G.alert = clamp(G.alert + 8);
  G.hackSpeedBonus += 0.2;
  log('Terminal poboczny zhakowany — kanał +20% szybszy', 'ok');
  floatMsg('+20% SPEED', terminal, '#ffd700');
  rebuildList();

  return true;
}

function renderTerminalOptions(terminal, screenX, screenY) {
  const options = buildTerminalOptions(terminal);

  G.dom.contextButtons.innerHTML = '';
  G.dom.contextTitle.textContent = `${terminal.desc || terminal.id} — wybierz 1 opcję`;

  options.forEach((option) => {
    addCtxBtn(option.label, !terminal.used, () => {
      if (terminal.used) {
        return;
      }

      terminal.used = true;
      terminal.selectedOption = option.id;
      const outcome = option.apply(screenX, screenY);

      if (outcome !== 'keep-open') {
        closeCtx();
      }
    });
  });

  if (terminal.used) {
    addCtxBtn('✓ Terminal wykorzystany', false);
  }

  addCtxSep();
  addCtxBtn('✗ Zamknij', true, closeCtx);

  G.dom.contextMenu.style.left = `${Math.min(screenX, window.innerWidth - 164)}px`;
  G.dom.contextMenu.style.top = `${Math.min(screenY, window.innerHeight - 220)}px`;
  G.dom.contextMenu.style.display = 'block';
  G.ctxOpen = true;
}

function buildTerminalOptions(terminal) {
  if (terminal.options && terminal.options.length) {
    return terminal.options;
  }

  const utilityCandidates = [
    {
      id: 'camera-off',
      label: '◉ Wyłącz kamerę w zasięgu',
      apply: () => disableNearestCamera(terminal),
    },
    {
      id: 'guard-reroute',
      label: '↻ Przekieruj strażnika',
      apply: () => redirectNearestGuard(terminal),
    },
    {
      id: 'alert-down',
      label: '⬇ Zmniejsz poziom wykrycia',
      apply: () => suppressAlert(),
    },
    {
      id: 'map',
      label: '▣ Pobierz mapę budynku',
      apply: () => revealLocalMap(terminal),
    },
    {
      id: 'bw',
      label: '⚡ Odzyskaj BW +15',
      apply: () => restoreBandwidth(15),
    },
    {
      id: 'wallet-drain',
      label: '₿ Zasil portfel krypto',
      apply: () => extractCryptoCredits(terminal),
    },
    {
      id: 'drone-off',
      label: '⬡ Wyłącz drona w pobliżu',
      apply: () => disableNearestDrone(terminal),
    },
    {
      id: 'doors',
      label: '🚪 Sterowanie drzwiami',
      apply: (screenX, screenY) => renderDoorControlMenu(terminal, screenX, screenY, G.doors.map((door) => door.id)),
    },
  ];

  const quickHackCandidates = [
    {
      id: 'qh-optics',
      label: '⬢ Pobierz hack - Reset optyki',
      apply: () => grantQuickHack('optics'),
    },
    {
      id: 'qh-motorics',
      label: '⬢ Pobierz hack - Reset motoryki',
      apply: () => grantQuickHack('motorics'),
    },
    {
      id: 'qh-neural',
      label: '⬢ Pobierz hack - Przeladowanie neuralne',
      apply: () => grantQuickHack('neural'),
    },
    {
      id: 'qh-ddos',
      label: '⬢ Pobierz hack - DDoS systemu',
      apply: () => grantQuickHack('ddos'),
    },
  ];

  if (!G.techDisabled && Math.random() < 0.14) {
    utilityCandidates.push({
      id: 'tech-off',
      label: '⛔ Wyłącz techników',
      apply: () => disableTechnicians(),
    });
  }

  const guaranteedQuickHack = quickHackCandidates[(Math.random() * quickHackCandidates.length) | 0];
  const guaranteedWallet = utilityCandidates.find((option) => option.id === 'wallet-drain');
  const guaranteedDoors = utilityCandidates.find((option) => option.id === 'doors');
  const shuffled = [...utilityCandidates, ...quickHackCandidates]
    .filter(
      (option) =>
        option.id !== guaranteedQuickHack.id &&
        option.id !== guaranteedWallet?.id &&
        option.id !== guaranteedDoors?.id,
    )
    .sort(() => Math.random() - 0.5);

  terminal.options = [guaranteedQuickHack, guaranteedWallet, guaranteedDoors, ...shuffled].filter(Boolean).slice(0, 4);
  return terminal.options;
}

function disableNearestCamera(terminal) {
  const camera = byType('cam')
    .filter((device) => !device.hacked)
    .sort((left, right) => dst(left, terminal) - dst(right, terminal))[0];

  if (!camera || dst(camera, terminal) > 10) {
    log('Brak kamery w zasięgu terminala', 'w');
    return;
  }

  camera.hacked = true;
  requestTechnician(camera);
  log(`Kamera ${camera.id} wyłączona z terminala`, 'ok');
  floatMsg('CAM OFF', camera, '#00ff9f');
  rebuildList();
}

function redirectNearestGuard(terminal) {
  const guard = byType('guard')
    .filter((device) => !device.dead && !device.offline)
    .sort((left, right) => dst(left, terminal) - dst(right, terminal))[0];

  if (!guard || dst(guard, terminal) > 10) {
    log('Brak strażnika w zasięgu terminala', 'w');
    return;
  }

  guard.patrol = [
    { x: terminal.x, y: terminal.y },
    { x: MAP_W - 3, y: MAP_H - 3 },
  ];
  guard.pi = 0;
  guard.aware = false;
  guard.alertT = 0;
  G.alert = clamp(G.alert + 5);
  log('Strażnik przekierowany', 'ok');
  floatMsg('REROUTE', guard, '#ffd700');
}

function revealLocalMap(terminal) {
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      G.explored.add(`${x},${y}`);
    }
  }

  log('Mapa budynku pobrana', 'ok');
  floatMsg('MAP DATA', terminal, '#0af');
}

function restoreBandwidth(amount) {
  if (!G.P) {
    return;
  }

  G.P.bw = Math.min(G.P.mbw, G.P.bw + amount);
  log(`BW +${amount}`, 'ok');
}

function extractCryptoCredits(terminal) {
  if (!G.P) {
    return;
  }

  const floorBoost = Math.max(1, G.floor || 1) * 14;
  const waveBoost = Math.max(1, G.wave || 1) * 22;
  const amount = 60 + floorBoost + waveBoost;

  G.P.cr += amount;
  log(`Portfel krypto zasilony: +¥${amount}`, 'ok');
  floatMsg(`+¥${amount} WALLET`, terminal, '#00ff9f');
  refreshHUD();
}

function disableTechnicians() {
  if (G.P.bw < 12 || G.techDisabled) {
    return;
  }

  G.P.bw -= 12;
  G.techDisabled = true;
  log('Technicy wyłączeni z sieci', 'ok');
  floatMsg('TECH OFF', G.P, '#ffd700');
  rebuildList();
}

function eliminateTechnician(technician) {
  if (G.P.bw < 8 || technician.dead) {
    return;
  }

  technician.dead = true;
  technician.state = 'dead';
  G.P.bw -= 8;
  G.alert = clamp(G.alert + 6);
  log('Technik wyeliminowany', 'ok');
  floatMsg('OFFLINE', technician, '#c7d2ff');
  rebuildList();
}

function disableNearestDrone(terminal) {
  const drone = byType('drone')
    .filter((device) => !device.dead)
    .sort((left, right) => dst(left, terminal) - dst(right, terminal))[0];

  if (!drone || dst(drone, terminal) > 10) {
    log('Brak drona w zasięgu terminala', 'w');
    return;
  }

  drone.dead = true;
  G.alert = clamp(G.alert + 12);
  log('Dron wyłączony z terminala', 'ok');
  floatMsg('DRONE OFF', drone, '#ffd700');
  rebuildList();
}

function renderDoorControlMenu(source, screenX, screenY, doorIds) {
  const doors = G.doors.filter((door) => doorIds.includes(door.id));

  if (!doors.length) {
    log('Brak drzwi do sterowania', 'w');
    return;
  }

  G.doorPreview = doors.map((door) => door.id);
  G.doorPreviewSource = { x: source.x + 0.5, y: source.y + 0.5 };

  G.dom.contextButtons.innerHTML = '';
  G.dom.contextTitle.textContent = `${source.desc || 'Terminal'} — kontrola drzwi`;
  const sourceInRange = dst(source, G.P) <= HACK_RANGE;

  if (!sourceInRange) {
    addCtxBtn('⊛ Zbliz sie do terminala sterowania', false);
    addCtxSep();
    addCtxBtn('✗ Zamknij', true, closeCtx);
    G.dom.contextMenu.style.left = `${Math.min(screenX, window.innerWidth - 184)}px`;
    G.dom.contextMenu.style.top = `${Math.min(screenY, window.innerHeight - 240)}px`;
    G.dom.contextMenu.style.display = 'block';
    G.ctxOpen = true;
    return 'keep-open';
  }

  doors.forEach((door, index) => {
    const label = `${door.open ? '🔒 Zamknij' : '🔓 Otwórz'} drzwi D-${index + 1} (BW:4)`;
    addCtxBtn(label, G.P.bw >= 4, () => {
      toggleDoor(door);
      renderDoorControlMenu(source, screenX, screenY, doorIds);
    });
  });

  addCtxSep();
  addCtxBtn('✗ Zamknij', true, closeCtx);

  G.dom.contextMenu.style.left = `${Math.min(screenX, window.innerWidth - 184)}px`;
  G.dom.contextMenu.style.top = `${Math.min(screenY, window.innerHeight - 240)}px`;
  G.dom.contextMenu.style.display = 'block';
  G.ctxOpen = true;

  return 'keep-open';
}

function toggleDoor(door) {
  if (G.P.bw < 4) {
    return;
  }

  door.open = !door.open;
  G.P.bw -= 4;
  G.tiles[door.y][door.x] = door.open ? TILE_TYPES.DOOR_OPEN : TILE_TYPES.DOOR_CLOSED;
  log(`Drzwi ${door.id} ${door.open ? 'otwarte' : 'zamknięte'}`, 'ok');
}

function requestTechnician(camera) {
  if (G.techDisabled) {
    return;
  }

  if (byType('tech').some((device) => !device.dead && device.targetId === camera.id)) {
    return;
  }

  const technician = byType('tech').find((device) => !device.dead && device.state === 'patrol');

  if (!technician) {
    log(`Brak wolnego technika dla ${camera.desc}`, 'w');
    return;
  }

  technician.state = 'repair';
  technician.targetId = camera.id;
  technician.repairTimer = 0;
  technician.repairDuration = 0;
  log(`Technik ruszył do ${camera.desc}`, 'w');
}

function blindSector(terminal) {
  if (G.P.bw < 5) {
    return;
  }

  G.P.bw -= 5;
  byType('cam')
    .filter((camera) => dst(camera, terminal) < 8)
    .forEach((camera) => {
      camera.hacked = true;
    });

  log('Kamery w sektorze zaślepione', 'ok');
  floatMsg('SECTOR BLIND', terminal, '#00ff9f');
  rebuildList();
}

function falseAlarm(terminal) {
  if (G.P.bw < 10) {
    return;
  }

  G.P.bw -= 10;

  byType('guard')
    .filter((guard) => !guard.dead && dst(guard, terminal) < 10)
    .forEach((guard) => {
      guard.patrol = [
        { x: MAP_W - 3, y: 1 },
        { x: MAP_W - 3, y: MAP_H - 3 },
      ];
      guard.pi = 0;
      guard.aware = false;
      guard.alertT = 0;
    });

  log('Fałszywy alarm — strażnicy przekierowani', 'ok');
  floatMsg('FALSE ALARM', terminal, '#ffd700');
}

function suppressAlert() {
  if (G.P.bw < 15) {
    return;
  }

  G.P.bw -= 15;
  G.alert = clamp(G.alert - 15);
  log('Alert stłumiony -15', 'ok');
}

function raiseCameraInteractionAlert(amount) {
  if (byType('tech').some((technician) => !technician.dead && !G.techDisabled)) {
    G.alert = clamp(G.alert + amount);
  }
}