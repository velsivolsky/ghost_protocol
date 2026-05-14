import { HACK_RANGE, TILE_TYPES } from '../core/constants.js';
import { G, byType } from '../core/state.js';
import { clamp, dst } from '../utils/math.js';
import { log, rebuildList, refreshHUD } from './ui.js';
import { autocompleteTerminalCommand, parseTerminalCommand } from './terminalParser.js';
import { getCommandDef, COMMAND_REGISTRY } from './terminalCommands.js';
import { addTrace, activateGhostWindow, activateTraceMask, softenTrace } from './traceSystem.js';
import { noteTutorialCommand, noteTutorialScan } from './tutorial.js';
import { grantQuickHack } from './quickhacks.js';

export function initTerminalRuntime() {
  if (!G.terminalRuntime || !G.dom.terminalOverlay) {
    return;
  }

  const input = G.dom.terminalInput;
  if (!input || input.dataset.boundRealtimeTerminal === '1') {
    return;
  }

  input.dataset.boundRealtimeTerminal = '1';
  input.addEventListener('keydown', handleTerminalInputKeyDown);
  input.addEventListener('input', () => {
    G.terminalRuntime.inputBuffer = input.value;
    syncTerminalHints();
  });

  pushTerminalLine('link stack primed. press TAB to open/close terminal.', 'sys');
  pushTerminalLine("type 'tutorial' for a quick walkthrough", 'sys');
  syncTerminalOverlay();
}

export function resetTerminalRuntime() {
  if (!G.terminalRuntime || !G.traceRuntime) {
    return;
  }

  G.terminalRuntime.open = false;
  G.terminalRuntime.connectedTargetId = null;
  G.terminalRuntime.connectedTargetType = null;
  G.terminalRuntime.connectedTargetLabel = 'NONE';
  G.terminalRuntime.pendingCommand = null;
  G.terminalRuntime.activeHacks = [];
  G.terminalRuntime.commandCooldownMs = 0;
  G.terminalRuntime.systemLogTickMs = 0;
  G.terminalRuntime.networkStatus = 'DORMANT';
  G.terminalRuntime.responseDelayMs = 0;
  G.terminalRuntime.scrambleUntil = 0;
  G.terminalRuntime.falseOutputUntil = 0;
  G.terminalRuntime.inputBuffer = '';
  G.terminalRuntime.history = [];
  G.terminalRuntime.historyCursor = -1;
  G.terminalRuntime.outputLines = [];
  G.terminalRuntime.renderedOutputCount = 0;
  G.terminalRuntime.renderedOutputRevision = 0;
  G.terminalRuntime.outputRevision = 0;
  G.terminalRuntime.tutorialShown = false;
  G.terminalRuntime.scanHighlights = [];
  G.traceRuntime.value = 0;
  G.traceRuntime.velocity = 0;
  G.traceRuntime.tier = 0;
  G.traceRuntime.risk = 0;
  G.traceRuntime.maskUntil = 0;
  G.traceRuntime.ghostUntil = 0;
  if (G.dom.terminalOutput) {
    G.dom.terminalOutput.innerHTML = '';
  }
  syncTerminalOverlay();
}

export function isTerminalOverlayOpen() {
  return !!G.terminalRuntime?.open;
}

export function toggleTerminalOverlay() {
  if (!G.terminalRuntime) {
    return;
  }

  if (G.terminalRuntime.open) {
    closeTerminalOverlay();
    return;
  }

  G.terminalRuntime.open = true;
  clearMovementKeys();
  if (G.dom.terminalOverlay) {
    G.dom.terminalOverlay.classList.add('show');
  }

  if (!G.terminalRuntime.tutorialShown) {
    emitTutorialIntro();
    G.terminalRuntime.tutorialShown = true;
  }

  if (G.dom.terminalInput) {
    G.dom.terminalInput.focus();
    G.dom.terminalInput.select();
  }
  syncTerminalOverlay();
}

export function closeTerminalOverlay() {
  if (!G.terminalRuntime) {
    return;
  }

  G.terminalRuntime.open = false;
  clearMovementKeys();
  if (G.dom.terminalOverlay) {
    G.dom.terminalOverlay.classList.remove('show');
  }

  if (G.dom.terminalInput) {
    G.dom.terminalInput.blur();
  }
}

export function autocompleteTerminalInput() {
  if (!G.terminalRuntime || !G.dom.terminalInput) {
    return;
  }

  const current = G.dom.terminalInput.value;
  const next = autocompleteInputValue(current);
  G.dom.terminalInput.value = next;
  G.terminalRuntime.inputBuffer = next;
  syncTerminalHints();
}

export function executeTerminalInput() {
  if (!G.terminalRuntime || !G.dom.terminalInput) {
    return;
  }

  const raw = G.dom.terminalInput.value.trim();
  if (!raw) {
    return;
  }

  G.terminalRuntime.history.unshift(raw);
  G.terminalRuntime.history = G.terminalRuntime.history.slice(0, 40);
  G.terminalRuntime.historyCursor = -1;

  queueTerminalCommand(raw);
  G.dom.terminalInput.value = '';
  G.terminalRuntime.inputBuffer = '';
  syncTerminalHints();
}

export function tickTerminalRuntime(dt) {
  if (!G.terminalRuntime || !G.traceRuntime) {
    return;
  }

  G.terminalRuntime.commandCooldownMs = Math.max(0, G.terminalRuntime.commandCooldownMs - dt);
  G.terminalRuntime.systemLogTickMs += dt;

  if (G.terminalRuntime.pendingCommand) {
    G.terminalRuntime.pendingCommand.remainingMs -= dt;
    if (G.terminalRuntime.pendingCommand.remainingMs <= 0) {
      const pending = G.terminalRuntime.pendingCommand;
      G.terminalRuntime.pendingCommand = null;
      resolveCommandExecution(pending);
    }
  }

  for (let i = G.terminalRuntime.activeHacks.length - 1; i >= 0; i -= 1) {
    const hack = G.terminalRuntime.activeHacks[i];
    hack.timeLeftMs -= dt;
    if (hack.timeLeftMs <= 0) {
      G.terminalRuntime.activeHacks.splice(i, 1);
      if (hack.onExpire) {
        hack.onExpire();
      }
      pushTerminalLine(`${hack.label} expired on ${hack.targetId}`, 'warn');
    }
  }

  syncTerminalOverlay();
}

export function syncTerminalOverlay() {
  if (!G.dom.terminalOverlay) {
    return;
  }

  const runtime = G.terminalRuntime;
  const trace = G.traceRuntime;

  if (G.dom.terminalTraceValue) {
    G.dom.terminalTraceValue.textContent = `${Math.round(trace.value)}%`;
  }
  if (G.dom.terminalTraceBar) {
    G.dom.terminalTraceBar.style.width = `${trace.value}%`;
  }
  if (G.dom.terminalConnectedNode) {
    G.dom.terminalConnectedNode.textContent = runtime.connectedTargetLabel || 'NONE';
  }
  if (G.dom.terminalActiveHacks) {
    const list = runtime.activeHacks.map((hack) => `${hack.label}:${Math.ceil(hack.timeLeftMs / 1000)}s`);
    G.dom.terminalActiveHacks.textContent = list.length ? list.join(' | ') : 'NONE';
  }
  if (G.dom.terminalRamCpu) {
    const ram = Math.round((G.P?.bw || 0));
    const cpu = Math.min(99, Math.round(trace.velocity * 12 + trace.tier * 11));
    G.dom.terminalRamCpu.textContent = `RAM ${ram}% | CPU ${cpu}%`;
  }
  if (G.dom.terminalNetworkStatus) {
    G.dom.terminalNetworkStatus.textContent = runtime.networkStatus || 'DORMANT';
  }
  if (G.dom.terminalRisk) {
    G.dom.terminalRisk.textContent = `${Math.round(trace.risk || 0)}%`;
  }
  if (G.dom.terminalPending) {
    G.dom.terminalPending.textContent = runtime.pendingCommand
      ? `${runtime.pendingCommand.commandId.toUpperCase()} ${Math.ceil(runtime.pendingCommand.remainingMs)}ms`
      : 'IDLE';
  }

  if (G.dom.terminalOutput) {
    syncTerminalOutputDom(runtime.outputLines.slice(-60));
  }

  if (G.dom.terminalSuggestion) {
    G.dom.terminalSuggestion.textContent = runtime.suggestion || '';
  }
}

function queueTerminalCommand(rawInput) {
  if (G.terminalRuntime.commandCooldownMs > 0) {
    pushTerminalLine('pipeline busy. wait for command cooldown.', 'warn');
    return;
  }

  pushTerminalLine(`> ${rawInput}`, 'user');
  const parsed = parseTerminalCommand(rawInput);

  if (!parsed.ok) {
    pushTerminalLine(`unknown command: ${rawInput}`, 'bad');
    pushTerminalLine("hint: type 'help'", 'dim');
    addTrace(1.2, 'unknown');
    return;
  }

  const def = getCommandDef(parsed.commandId);
  if (!def) {
    pushTerminalLine('command definition missing.', 'bad');
    return;
  }

  if (def.requiredContext === 'connected' && !G.terminalRuntime.connectedTargetId) {
    pushTerminalLine('no uplink. connect to a target first.', 'warn');
    return;
  }

  const target = resolveConnectedTarget();
  const latency = def.latencyMs + (G.terminalRuntime.responseDelayMs || 0);
  const scrambleActive = performance.now() < (G.terminalRuntime.scrambleUntil || 0);

  G.terminalRuntime.pendingCommand = {
    commandId: parsed.commandId,
    args: parsed.args,
    raw: rawInput,
    target,
    remainingMs: latency,
    scrambled: scrambleActive && def.id !== 'help',
  };

  G.terminalRuntime.commandCooldownMs = 120;
  if (def.noise > 0) {
    addTrace(def.noise * 0.45, parsed.commandId);
  }
}

function resolveCommandExecution(pending) {
  const { commandId, args, target } = pending;

  if (pending.scrambled && Math.random() < 0.25) {
    pushTerminalLine(`command corruption: ${commandId} -> noop`, 'warn');
    addTrace(2.4, 'scramble');
    return;
  }

  if (commandId === 'help') {
    runHelp(args);
    noteTutorialCommand('help', args);
    return;
  }

  if (commandId === 'tutorial') {
    runTutorial();
    noteTutorialCommand('tutorial', args);
    return;
  }

  if (commandId === 'connect') {
    runConnect(args[0]);
    noteTutorialCommand('connect', args);
    return;
  }

  if (commandId === 'disconnect') {
    runDisconnect();
    noteTutorialCommand('disconnect', args);
    return;
  }

  if (commandId === 'scan_local') {
    runScanLocal();
    noteTutorialScan();
    noteTutorialCommand('scan_local', args);
    return;
  }

  if (commandId === 'scan_network') {
    runScanNetwork();
    noteTutorialCommand('scan_network', args);
    return;
  }

  if (commandId === 'download_map') {
    if (runDownloadMap(target)) {
      noteTutorialCommand('download_map', args);
    }
    return;
  }

  if (commandId === 'download_hack') {
    if (runDownloadHack(target)) {
      noteTutorialCommand('download_hack', args);
    }
    return;
  }

  if (commandId === 'transfer_credits') {
    if (runTransferCredits(target)) {
      noteTutorialCommand('transfer_credits', args);
    }
    return;
  }

  if (commandId === 'inject') {
    runInject(args, target);
    noteTutorialCommand('inject', args);
    return;
  }

  if (commandId === 'breach') {
    runBreach(args);
    noteTutorialCommand('breach', args);
    return;
  }

  if (commandId === 'deploy') {
    runDeploy(args, target);
    noteTutorialCommand('deploy', args);
    return;
  }

  if (commandId === 'override') {
    runOverride(args, target);
    noteTutorialCommand('override', args);
    return;
  }

  if (commandId === 'set_friendly') {
    runSetFriendly(target);
    noteTutorialCommand('set_friendly', args);
    return;
  }

  if (commandId === 'unlock') {
    runUnlock(args, target);
    noteTutorialCommand('unlock', args);
    return;
  }

  if (commandId === 'reroute') {
    runReroute(args, target);
    noteTutorialCommand('reroute', args);
    return;
  }

  if (commandId === 'disable') {
    runDisable(args, target);
    noteTutorialCommand('disable', args);
    return;
  }

  if (commandId === 'spoof') {
    softenTrace(7);
    G.alert = clamp((G.alert || 0) - 4, 0, 100);
    pushTerminalLine('signature spoofed. trace and alert damped.', 'ok');
    return;
  }

  if (commandId === 'mask_trace') {
    activateTraceMask(8000);
    pushTerminalLine('trace masking mesh active (8s).', 'ok');
    return;
  }

  if (commandId === 'ghost') {
    activateGhostWindow(7000);
    pushTerminalLine('ghost window online (7s).', 'ok');
    return;
  }

  if (commandId === 'blackout') {
    G.blackout = true;
    G.boT = Math.max(G.boT || 0, 5000);
    G.alert = clamp((G.alert || 0) + 2, 0, 100);
    pushTerminalLine('blackout pulse routed through local grid.', 'warn');
    return;
  }

  if (commandId === 'ping') {
    const latency = Math.max(40, 90 + (Math.random() * 60) | 0);
    pushTerminalLine(`pong ${latency}ms`, 'sys');
    return;
  }

  if (commandId === 'mirror') {
    addTrace(1.8, 'mirror');
    G.terminalRuntime.falseOutputUntil = performance.now() + 6000;
    pushTerminalLine('telemetry mirrors deployed.', 'ok');
    return;
  }

  pushTerminalLine('command not wired yet.', 'warn');
}

function runConnect(targetId) {
  if (!targetId) {
    pushTerminalLine('usage: connect <target_id>', 'warn');
    pushTerminalLine('tip: start with scan local to see nearby ids', 'dim');
    return;
  }

  const found = findTargetById(targetId);
  if (!found) {
    pushTerminalLine(`target not found: ${targetId}`, 'bad');
    return;
  }

  if (dst(found.anchor, G.P) > HACK_RANGE + 1.2) {
    pushTerminalLine(`out of range: ${targetId}`, 'warn');
    return;
  }

  G.terminalRuntime.connectedTargetId = found.id;
  G.terminalRuntime.connectedTargetType = found.type;
  G.terminalRuntime.connectedTargetLabel = found.label;
  pushTerminalLine(`uplink established -> ${found.id} [${found.type}]`, 'ok');

  if (found.type === 'wterm') {
    pushTerminalLine(`door control path detected. next command: unlock`, 'dim');
  } else if (found.type === 'door') {
    pushTerminalLine(`direct lock handle detected. next command: unlock`, 'dim');
  }

  addTrace(1.5, 'connect');
}

function runDisconnect() {
  if (!G.terminalRuntime.connectedTargetId) {
    pushTerminalLine('no uplink active.', 'dim');
    return;
  }

  pushTerminalLine(`uplink closed -> ${G.terminalRuntime.connectedTargetId}`, 'sys');
  G.terminalRuntime.connectedTargetId = null;
  G.terminalRuntime.connectedTargetType = null;
  G.terminalRuntime.connectedTargetLabel = 'NONE';
}

function runScanLocal() {
  const local = enumerateHackTargets(false);

  if (!local.length) {
    pushTerminalLine('scan local: no nodes in range.', 'dim');
    return;
  }

  pushTerminalLine(`scan local: ${local.length} node(s)`, 'sys');
  updateScanHighlights(local);
  for (const item of local.slice(0, 10)) {
    pushTerminalLine(formatScanLine(item, true), getScanLineClass(item));
  }

  const nearbyDoorPanel = local.find((item) => item.type === 'wterm' || item.type === 'door');
  if (nearbyDoorPanel) {
    pushTerminalLine(`door tip: connect ${nearbyDoorPanel.id} -> unlock`, 'ok');
  }
}

function runScanNetwork() {
  const all = enumerateHackTargets(true);
  updateScanHighlights(all);
  pushTerminalLine(`scan network: ${all.length} known node(s)`, 'sys');
  for (const item of all.slice(0, 12)) {
    pushTerminalLine(formatScanLine(item, false), getScanLineClass(item));
  }
}

function runDownloadMap(target) {
  const side = requireSideTerminalTarget(target, 'download map');
  if (!side) {
    return false;
  }

  for (let y = 0; y < G.tiles.length; y += 1) {
    const row = G.tiles[y] || [];
    for (let x = 0; x < row.length; x += 1) {
      G.explored.add(`${x},${y}`);
    }
  }

  markSideTerminalConsumed(side, 'map data exfiltrated from terminal cache.');
  return true;
}

function runDownloadHack(target) {
  const side = requireSideTerminalTarget(target, 'download hack');
  if (!side) {
    return false;
  }

  const ids = ['optics', 'motorics', 'neural', 'ddos'];
  const pick = ids[(Math.random() * ids.length) | 0];
  grantQuickHack(pick);
  pushTerminalLine(`quickhack package downloaded: ${pick}`, 'ok');
  markSideTerminalConsumed(side, 'side terminal payload burned after hack extraction.');
  return true;
}

function runTransferCredits(target) {
  const side = requireSideTerminalTarget(target, 'transfer credits');
  if (!side) {
    return false;
  }

  const floorBoost = Math.max(1, G.floor || 1) * 14;
  const waveBoost = Math.max(1, G.wave || 1) * 22;
  const amount = 60 + floorBoost + waveBoost;
  G.P.cr += amount;
  refreshHUD();
  pushTerminalLine(`wallet transfer complete: +¥${amount}`, 'ok');
  markSideTerminalConsumed(side, 'crypto wallet drained. terminal relay now empty.');
  return true;
}

function requireSideTerminalTarget(target, commandLabel) {
  if (!target || target.type !== 'sterm') {
    pushTerminalLine(`${commandLabel} requires connected side terminal node`, 'warn');
    pushTerminalLine('flow: scan local -> connect node_side_# -> command', 'dim');
    return null;
  }

  if (target.ref?.used) {
    pushTerminalLine(`terminal already consumed: ${target.id}`, 'warn');
    return null;
  }

  return target;
}

function markSideTerminalConsumed(target, message) {
  if (target.ref) {
    target.ref.hacked = true;
    target.ref.used = true;
  }
  if (!G.sideHacked.includes(target.id)) {
    G.sideHacked.push(target.id);
  }
  pushTerminalLine(message, 'ok');
}

function runInject(args, target) {
  if (!target) {
    pushTerminalLine('inject failed: no target uplink.', 'warn');
    return;
  }

  const payload = args.join(' ') || 'loop';

  if (target.type === 'cam') {
    target.ref.hacked = true;
    registerTimedHack('inject-loop', target.id, 9000, () => {
      target.ref.hacked = false;
      rebuildList();
    });
    pushTerminalLine(`payload ${payload} injected into ${target.id}`, 'ok');
    rebuildList();
    return;
  }

  if (target.type === 'mainterm' || target.type === 'sterm') {
    G.hackSpeedBonus = clamp((G.hackSpeedBonus || 0) + 0.25, 0, 1.8);
    registerTimedHack('inject-buffer', target.id, 8000, () => {
      G.hackSpeedBonus = Math.max(0, (G.hackSpeedBonus || 0) - 0.25);
    });
    pushTerminalLine(`payload ${payload} seeded on ${target.id}`, 'ok');
    return;
  }

  pushTerminalLine(`inject not supported on ${target.type}`, 'warn');
}

function runBreach(args) {
  const targetId = args[0];

  if (!targetId) {
    pushTerminalLine('usage: breach <node_id>', 'warn');
    return;
  }

  const found = findTargetById(targetId);
  if (!found) {
    pushTerminalLine(`breach failed: unknown node ${targetId}`, 'bad');
    return;
  }

  G.terminalRuntime.connectedTargetId = found.id;
  G.terminalRuntime.connectedTargetType = found.type;
  G.terminalRuntime.connectedTargetLabel = found.label;
  addTrace(3.1, 'breach');
  pushTerminalLine(`breach success -> uplink now on ${found.id}`, 'ok');
}

function runDeploy(args, target) {
  if (!target) {
    pushTerminalLine('deploy failed: no target uplink.', 'warn');
    return;
  }

  const tool = args.join(' ') || 'worm';
  addTrace(2.2, 'deploy');

  if (target.type === 'drone' || target.type === 'guard') {
    target.ref.hacked = true;
    target.ref.hijacked = true;
    registerTimedHack(`deploy-${tool}`, target.id, 10000, () => {
      target.ref.hacked = false;
      target.ref.hijacked = false;
      rebuildList();
    });
    pushTerminalLine(`${tool} deployed on ${target.id}`, 'ok');
    rebuildList();
    return;
  }

  if (target.type === 'sterm' || target.type === 'mainterm') {
    G.alert = clamp((G.alert || 0) - 3, 0, 100);
    pushTerminalLine(`${tool} deployed across relay path`, 'ok');
    return;
  }

  pushTerminalLine(`deploy not supported on ${target.type}`, 'warn');
}

function runOverride(args, target) {
  if (!target) {
    pushTerminalLine('override failed: no uplink.', 'warn');
    return;
  }

  const moduleName = args.join(' ') || 'targeting';

  if (target.type === 'drone' || target.type === 'guard' || target.type === 'tech') {
    target.ref.hacked = true;
    target.ref.state = 'search';
    target.ref.detect = 0;
    registerTimedHack(`override-${moduleName}`, target.id, 9000, () => {
      target.ref.hacked = false;
      rebuildList();
    });
    pushTerminalLine(`${target.id} module overridden: ${moduleName}`, 'ok');
    rebuildList();
    return;
  }

  pushTerminalLine(`override unavailable for ${target.type}`, 'warn');
}

function runSetFriendly(target) {
  if (!target) {
    pushTerminalLine('set friendly failed: no uplink.', 'warn');
    return;
  }

  if (target.type === 'drone' || target.type === 'guard' || target.type === 'tech') {
    target.ref.hacked = true;
    target.ref.hijacked = true;
    target.ref.state = 'idle';
    registerTimedHack('friendly-override', target.id, 12000, () => {
      target.ref.hacked = false;
      target.ref.hijacked = false;
      rebuildList();
    });
    pushTerminalLine(`${target.id} switched to friendly profile`, 'ok');
    rebuildList();
    return;
  }

  pushTerminalLine(`set friendly unsupported for ${target.type}`, 'warn');
}

function runUnlock(_args, target) {
  if (!target) {
    pushTerminalLine('unlock failed: no uplink.', 'warn');
    pushTerminalLine('door flow: scan local -> connect panel_# -> unlock', 'dim');
    return;
  }

  if (target.type === 'door') {
    target.ref.open = true;
    G.tiles[target.ref.y][target.ref.x] = TILE_TYPES.DOOR_OPEN;
    pushTerminalLine(`door unlocked: ${target.id}`, 'ok');
    return;
  }

  if (target.type === 'wterm' && target.ref?.doorId) {
    const door = G.doors.find((item) => item.id === target.ref.doorId);
    if (door) {
      door.open = true;
      G.tiles[door.y][door.x] = TILE_TYPES.DOOR_OPEN;
      pushTerminalLine(`door route unlocked via ${target.id}`, 'ok');
      pushTerminalLine(`if needed: disconnect`, 'dim');
      return;
    }
  }

  pushTerminalLine(`unlock unsupported for ${target.type}`, 'warn');
  pushTerminalLine('try connecting to a wall terminal / panel near the door', 'dim');
}

function runReroute(_args, target) {
  if (!target) {
    pushTerminalLine('reroute failed: no uplink.', 'warn');
    return;
  }

  G.alert = clamp((G.alert || 0) - 5, 0, 100);
  addTrace(1.1, 'reroute');
  pushTerminalLine(`power rerouted through ${target.id}`, 'ok');
}

function runDisable(_args, target) {
  if (!target) {
    pushTerminalLine('disable failed: no uplink.', 'warn');
    return;
  }

  if (target.type === 'cam' || target.type === 'drone' || target.type === 'guard' || target.type === 'tech') {
    target.ref.offline = true;
    registerTimedHack('disable', target.id, 9000, () => {
      target.ref.offline = false;
      rebuildList();
    });
    pushTerminalLine(`${target.id} disabled for 9s`, 'ok');
    rebuildList();
    return;
  }

  pushTerminalLine(`disable unsupported for ${target.type}`, 'warn');
}

function registerTimedHack(label, targetId, timeLeftMs, onExpire) {
  G.terminalRuntime.activeHacks.push({
    label,
    targetId,
    timeLeftMs,
    onExpire,
  });
}

function resolveConnectedTarget() {
  if (!G.terminalRuntime.connectedTargetId) {
    return null;
  }

  return findTargetById(G.terminalRuntime.connectedTargetId);
}

function findTargetById(id) {
  const normalized = (id || '').toLowerCase();
  const all = enumerateHackTargets(true);
  return all.find((item) => item.id.toLowerCase() === normalized) || null;
}

function enumerateHackTargets(includeFar) {
  if (!G.P) {
    return [];
  }

  const out = [];
  const maxDist = includeFar ? Infinity : HACK_RANGE + 2;

  for (const cam of byType('cam')) {
    pushTarget(out, {
      id: cam.id || `cam_${out.length}`,
      type: 'cam',
      label: cam.desc || 'Camera',
      anchor: cam,
      ref: cam,
      dist: dst(cam, G.P),
    }, maxDist);
  }

  for (const guard of byType('guard')) {
    pushTarget(out, {
      id: guard.id || `guard_${out.length}`,
      type: 'guard',
      label: guard.desc || 'Guard',
      anchor: guard,
      ref: guard,
      dist: dst(guard, G.P),
    }, maxDist);
  }

  for (const drone of byType('drone')) {
    pushTarget(out, {
      id: drone.id || `drone_${out.length}`,
      type: 'drone',
      label: drone.desc || 'Drone',
      anchor: drone,
      ref: drone,
      dist: dst(drone, G.P),
    }, maxDist);
  }

  for (const tech of byType('tech')) {
    pushTarget(out, {
      id: tech.id || `tech_${out.length}`,
      type: 'tech',
      label: tech.desc || 'Technician',
      anchor: tech,
      ref: tech,
      dist: dst(tech, G.P),
    }, maxDist);
  }

  if (G.mainTerminal) {
    pushTarget(out, {
      id: 'node_main',
      type: 'mainterm',
      label: 'Main Terminal',
      anchor: G.mainTerminal,
      ref: G.mainTerminal,
      dist: dst(G.mainTerminal, G.P),
    }, maxDist);
  }

  for (let i = 0; i < G.sideTerminals.length; i += 1) {
    const sterm = G.sideTerminals[i];
    pushTarget(out, {
      id: sterm.id || `node_side_${i + 1}`,
      type: 'sterm',
      label: sterm.desc || 'Side Terminal',
      anchor: sterm,
      ref: sterm,
      dist: dst(sterm, G.P),
    }, maxDist);
  }

  for (let i = 0; i < G.wallTerminals.length; i += 1) {
    const panel = G.wallTerminals[i];
    pushTarget(out, {
      id: panel.id || `panel_${i + 1}`,
      type: 'wterm',
      label: panel.desc || 'Wall Terminal',
      anchor: panel,
      ref: panel,
      dist: dst(panel, G.P),
    }, maxDist);
  }

  for (let i = 0; i < G.doors.length; i += 1) {
    const door = G.doors[i];
    pushTarget(out, {
      id: door.id || `door_${i + 1}`,
      type: 'door',
      label: 'Door',
      anchor: door,
      ref: door,
      dist: dst(door, G.P),
    }, maxDist);
  }

  out.sort((a, b) => a.dist - b.dist);
  return out;
}

function pushTarget(out, target, maxDist) {
  if (target.dist > maxDist) {
    return;
  }
  out.push(target);
}

function handleTerminalInputKeyDown(event) {
  if (!G.terminalRuntime?.open) {
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    executeTerminalInput();
    return;
  }

  if (event.key === 'Tab') {
    event.preventDefault();
    autocompleteTerminalInput();
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    const history = G.terminalRuntime.history || [];
    if (!history.length) return;

    G.terminalRuntime.historyCursor = Math.min(history.length - 1, G.terminalRuntime.historyCursor + 1);
    const value = history[G.terminalRuntime.historyCursor] || '';
    G.dom.terminalInput.value = value;
    G.terminalRuntime.inputBuffer = value;
    syncTerminalHints();
    return;
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    const history = G.terminalRuntime.history || [];
    G.terminalRuntime.historyCursor -= 1;

    if (G.terminalRuntime.historyCursor < 0) {
      G.terminalRuntime.historyCursor = -1;
      G.dom.terminalInput.value = '';
      G.terminalRuntime.inputBuffer = '';
      syncTerminalHints();
      return;
    }

    const value = history[G.terminalRuntime.historyCursor] || '';
    G.dom.terminalInput.value = value;
    G.terminalRuntime.inputBuffer = value;
    syncTerminalHints();
  }
}

function runHelp(args) {
  const topic = (args[0] || '').toLowerCase();

  if (!topic) {
    pushTerminalLine('HELP TOPICS', 'ok');
    pushTerminalLine('help basics  | help doors  | help cameras  | help stealth', 'dim');
    pushTerminalLine('help guards  | help technicians  | help terminals  | help mainterm', 'dim');
    pushTerminalLine('tutorial     | scan local  | scan network', 'dim');
    pushTerminalLine('core commands:', 'dim');
    for (const item of COMMAND_REGISTRY) {
      pushTerminalLine(item.help, 'dim');
    }
    return;
  }

  if (topic === 'basics') {
    pushTerminalLine('BASICS', 'ok');
    pushTerminalLine('1. scan local', 'dim');
    pushTerminalLine('2. connect <target_id>', 'dim');
    pushTerminalLine('3. run a command on the connected target', 'dim');
    pushTerminalLine('4. disconnect', 'dim');
    pushTerminalLine('example: scan local -> connect cam_0 -> inject loop -> disconnect', 'dim');
    return;
  }

  if (topic === 'doors') {
    pushTerminalLine('DOOR FLOW', 'ok');
    pushTerminalLine('most doors are opened through a nearby wall terminal/panel.', 'dim');
    pushTerminalLine('step 1: scan local', 'dim');
    pushTerminalLine('step 2: find panel_# or door_# in the scan results', 'dim');
    pushTerminalLine('step 3: connect panel_1', 'dim');
    pushTerminalLine('step 4: unlock', 'dim');
    pushTerminalLine('example: scan local -> connect panel_1 -> unlock -> disconnect', 'dim');
    pushTerminalLine('if direct door id exists: connect door_1 -> unlock', 'dim');
    return;
  }

  if (topic === 'cameras') {
    pushTerminalLine('CAMERA FLOW', 'ok');
    pushTerminalLine('example: scan local -> connect cam_0 -> inject loop -> disconnect', 'dim');
    pushTerminalLine('or: connect cam_0 -> disable', 'dim');
    return;
  }

  if (topic === 'stealth') {
    pushTerminalLine('STEALTH FLOW', 'ok');
    pushTerminalLine('use mask trace when you need breathing room.', 'dim');
    pushTerminalLine('use ghost before a noisy command.', 'dim');
    pushTerminalLine('example: connect panel_1 -> ghost -> unlock -> disconnect', 'dim');
    return;
  }

  if (topic === 'guards') {
    pushTerminalLine('GUARD METHODS', 'ok');
    pushTerminalLine('scan local -> connect guard_0', 'dim');
    pushTerminalLine('set friendly   : temporary ally behavior', 'dim');
    pushTerminalLine('override hunt  : disrupts behavior module', 'dim');
    pushTerminalLine('disable        : hard shutdown for short time', 'dim');
    pushTerminalLine('deploy worm    : noisy control burst', 'dim');
    return;
  }

  if (topic === 'technicians') {
    pushTerminalLine('TECHNICIAN METHODS', 'ok');
    pushTerminalLine('scan local -> connect tech_0', 'dim');
    pushTerminalLine('set friendly   : reduce active threat', 'dim');
    pushTerminalLine('override       : force search state', 'dim');
    pushTerminalLine('disable        : short offline window', 'dim');
    return;
  }

  if (topic === 'terminals') {
    pushTerminalLine('SIDE TERMINAL METHODS', 'ok');
    pushTerminalLine('scan local -> connect node_side_1', 'dim');
    pushTerminalLine('download map       : reveal map layout', 'dim');
    pushTerminalLine('download hack      : gain one quickhack', 'dim');
    pushTerminalLine('transfer credits   : gain mission credits', 'dim');
    pushTerminalLine('note: each side terminal can be consumed once', 'dim');
    return;
  }

  if (topic === 'mainterm') {
    pushTerminalLine('MAIN TERMINAL METHODS', 'ok');
    pushTerminalLine('scan local -> connect node_main', 'dim');
    pushTerminalLine('inject relay     : temporary hack-speed boost', 'dim');
    pushTerminalLine('deploy worm      : pressure/alert manipulation', 'dim');
    pushTerminalLine('reroute          : alert shaping utility', 'dim');
    pushTerminalLine('disconnect       : close uplink cleanly', 'dim');
    return;
  }

  pushTerminalLine(`unknown help topic: ${topic}`, 'warn');
  pushTerminalLine('available: basics, doors, cameras, stealth, guards, technicians, terminals, mainterm', 'dim');
}

function runTutorial() {
  pushTerminalLine('TERMINAL TUTORIAL', 'ok');
  pushTerminalLine('the world does not pause. hack fast and leave.', 'dim');
  pushTerminalLine('door tutorial:', 'dim');
  pushTerminalLine('scan local', 'dim');
  pushTerminalLine('connect panel_1', 'dim');
  pushTerminalLine('unlock', 'dim');
  pushTerminalLine('disconnect', 'dim');
  pushTerminalLine('camera tutorial:', 'dim');
  pushTerminalLine('scan local', 'dim');
  pushTerminalLine('connect cam_0', 'dim');
  pushTerminalLine('inject loop', 'dim');
  pushTerminalLine('disconnect', 'dim');
  pushTerminalLine('guard flow: connect guard_0 -> set friendly / override / disable', 'dim');
  pushTerminalLine('technician flow: connect tech_0 -> set friendly / override / disable', 'dim');
  pushTerminalLine('side terminal flow: connect node_side_1 -> download map / download hack / transfer credits', 'dim');
  pushTerminalLine('main terminal flow: connect node_main -> inject relay / deploy worm', 'dim');
  pushTerminalLine("need examples later? use help guards / help technicians / help terminals / help mainterm", 'dim');
}

function emitTutorialIntro() {
  pushTerminalLine('REALTIME TERMINAL ONLINE', 'ok');
  pushTerminalLine("new here? type 'tutorial'", 'dim');
  pushTerminalLine("need doors? type 'help doors'", 'dim');
}

function updateScanHighlights(targets) {
  if (!G.terminalRuntime) {
    return;
  }

  G.terminalRuntime.scanHighlights = targets.map((item) => ({
    id: item.id,
    type: item.type,
    x: item.anchor.x,
    y: item.anchor.y,
  }));
}

function syncTerminalHints() {
  const input = G.terminalRuntime?.inputBuffer || '';
  const suggestion = autocompleteInputValue(input);

  if (suggestion && suggestion !== input) {
    G.terminalRuntime.suggestion = suggestion;
  } else {
    G.terminalRuntime.suggestion = '';
  }

  syncTerminalOverlay();
}

function autocompleteInputValue(rawInput) {
  const raw = String(rawInput || '');
  const hasTrailingSpace = /\s$/.test(raw);
  const normalized = raw.trim().replace(/\s+/g, ' ').toLowerCase();

  if (!normalized) {
    return autocompleteTerminalCommand('');
  }

  const tokens = normalized.split(' ');
  const first = tokens[0] || '';
  const firstCompleted = autocompleteTerminalCommand(first);

  if (tokens.length === 1 && !hasTrailingSpace) {
    if ((firstCompleted === 'connect' || firstCompleted === 'link') && normalized !== firstCompleted) {
      return `${firstCompleted} `;
    }
    return firstCompleted;
  }

  if (tokens.length === 1 && hasTrailingSpace && (firstCompleted === 'connect' || firstCompleted === 'link')) {
    return `${firstCompleted} `;
  }

  const connectCommand = firstCompleted === 'connect' || firstCompleted === 'link';
  if (connectCommand) {
    const argPrefix = hasTrailingSpace ? '' : (tokens[1] || '');
    const targetIds = getAutocompleteTargetIds();
    const matches = targetIds.filter((id) => id.startsWith(argPrefix));

    if (matches.length === 1) {
      return `connect ${matches[0]}`;
    }

    if (matches.length > 1) {
      const commonPrefix = longestCommonPrefix(matches);
      if (commonPrefix.length > argPrefix.length) {
        return `connect ${commonPrefix}`;
      }
      return `connect ${argPrefix}`;
    }

    return `connect ${argPrefix}`;
  }

  return autocompleteTerminalCommand(normalized);
}

function getAutocompleteTargetIds() {
  const ids = enumerateHackTargets(false).map((item) => (item.id || '').toLowerCase()).filter(Boolean);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function longestCommonPrefix(values) {
  if (!values.length) {
    return '';
  }

  let prefix = values[0];
  for (let i = 1; i < values.length; i += 1) {
    const value = values[i];
    let j = 0;
    const max = Math.min(prefix.length, value.length);
    while (j < max && prefix[j] === value[j]) {
      j += 1;
    }
    prefix = prefix.slice(0, j);
    if (!prefix) {
      break;
    }
  }

  return prefix;
}

function pushTerminalLine(text, cls = 'sys', maybeFake = false) {
  if (!G.terminalRuntime) {
    return;
  }

  let lineText = text;
  if (maybeFake && performance.now() < (G.terminalRuntime.falseOutputUntil || 0) && Math.random() < 0.1) {
    lineText = `${text} ::checksum_mismatch`;
  }

  G.terminalRuntime.outputLines.push({ text: lineText, cls });
  G.terminalRuntime.outputLines = G.terminalRuntime.outputLines.slice(-60);
  G.terminalRuntime.outputRevision += 1;

  if (!maybeFake) {
    log(`[TERM] ${lineText}`, cls === 'bad' ? 'bad' : cls === 'warn' ? 'w' : 'ok');
  }
}

function syncTerminalOutputDom(lines) {
  const container = G.dom.terminalOutput;
  if (!container) {
    return;
  }

  const runtime = G.terminalRuntime;
  if (!runtime) {
    return;
  }

  if (runtime.renderedOutputRevision === runtime.outputRevision) {
    return;
  }

  if (runtime.renderedOutputCount > lines.length) {
    runtime.renderedOutputCount = 0;
    runtime.renderedOutputRevision = 0;
    container.innerHTML = '';
  }

  if (runtime.renderedOutputCount === 0 && !container.innerHTML && lines.length) {
    container.innerHTML = lines
      .map((line) => `<div class="rt-line ${line.cls || ''}">${escapeHtml(line.text)}</div>`)
      .join('');
    runtime.renderedOutputCount = lines.length;
    runtime.renderedOutputRevision = runtime.outputRevision;
    container.scrollTop = container.scrollHeight;
    return;
  }

  if (runtime.renderedOutputCount === lines.length && lines.length > 0) {
    const delta = Math.max(1, runtime.outputRevision - runtime.renderedOutputRevision);
    for (let i = 0; i < delta && container.firstChild; i += 1) {
      container.removeChild(container.firstChild);
    }

    const fresh = lines.slice(lines.length - delta);
    const html = fresh
      .map((line) => `<div class="rt-line ${line.cls || ''}">${escapeHtml(line.text)}</div>`)
      .join('');
    container.insertAdjacentHTML('beforeend', html);
    runtime.renderedOutputRevision = runtime.outputRevision;
    container.scrollTop = container.scrollHeight;
    return;
  }

  if (runtime.renderedOutputCount < lines.length) {
    const fresh = lines.slice(runtime.renderedOutputCount);
    const html = fresh
      .map((line) => `<div class="rt-line ${line.cls || ''}">${escapeHtml(line.text)}</div>`)
      .join('');
    container.insertAdjacentHTML('beforeend', html);
    runtime.renderedOutputCount = lines.length;
    runtime.renderedOutputRevision = runtime.outputRevision;
    container.scrollTop = container.scrollHeight;
  }
}

function formatScanLine(item, includeDistance) {
  const dist = includeDistance ? ` ${item.dist.toFixed(1)}t` : '';
  const label = item.type === 'wterm'
    ? 'door-panel'
    : item.type === 'door'
      ? 'door'
      : item.type;
  return `${item.id} [${label}]${dist}`;
}

function getScanLineClass(item) {
	if (item.type === 'cam') return 'scan-cam';
	if (item.type === 'guard') return 'scan-guard';
	if (item.type === 'drone') return 'scan-drone';
	if (item.type === 'tech') return 'scan-tech';
	if (item.type === 'wterm' || item.type === 'door') return 'scan-door';
	if (item.type === 'mainterm' || item.type === 'sterm') return 'scan-terminal';
	return 'scan-generic';
}

function clearMovementKeys() {
  delete G.keys.w;
  delete G.keys.W;
  delete G.keys.a;
  delete G.keys.A;
  delete G.keys.s;
  delete G.keys.S;
  delete G.keys.d;
  delete G.keys.D;
  delete G.keys.ArrowUp;
  delete G.keys.ArrowDown;
  delete G.keys.ArrowLeft;
  delete G.keys.ArrowRight;
}

function escapeHtml(input) {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
