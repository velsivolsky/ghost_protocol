import { HACK_RANGE, TILE_TYPES } from '../core/constants.js';
import { G, byType } from '../core/state.js';
import { clamp, dst } from '../utils/math.js';
import { log, rebuildList, refreshHUD } from './ui.js';
import { updateMissionText } from './mission.js';
import { autocompleteTerminalCommand, parseTerminalCommand } from './terminalParser.js';
import { getCommandDef, COMMAND_REGISTRY } from './terminalCommands.js';
import { addTrace, activateGhostWindow, activateTraceMask, softenTrace } from './traceSystem.js';
import { noteTutorialCommand, noteTutorialScan } from './tutorial.js';
import { grantQuickHack } from './quickhacks.js';

const TERMINAL_HEAT_DECAY_PER_SEC = 6.5;
const TERMINAL_HEAT_OVERHEAT_DECAY_PER_SEC = 3.25;
const TERMINAL_HEAT_RECOVER_THRESHOLD = 58;
const TERMINAL_HEAT_CRASH_DURATION_MS = 4200;

const COMMAND_HEAT_COSTS = {
  connect: 5,
  disconnect: 0,
  scan_local: 4,
  scan_network: 6,
  download_map: 8,
  download_hack: 12,
  dump_creds: 16,
  breach_firewall: 30,
  transfer_credits: 10,
  inject: 14,
  scp: 10,
  source: 16,
  feed_blind: 9,
  feed_loop: 5,
  breach: 16,
  deploy: 14,
  override: 16,
  set_friendly: 12,
  unlock: 8,
  elevator_unlock: 8,
  elevator_up: 0,
  elevator_down: 0,
  reroute: 10,
  disable: 14,
  spoof: 4,
  mask_trace: 5,
  ghost: 5,
  blackout: 9,
  ping: 0,
  mirror: 7,
  trigger_vent: 4,
  vent_off: 2,
  cut_lights: 6,
  trip_panel: 7,
  clear: 0,
  auto_connect_guard: 0,
  blind: 12,
  cripple: 12,
  ddos: 24,
  slow: 10,
  crash: 18,
};

const COMMAND_BW_COSTS = {
  scan_local: 2,
  scan_network: 4,
  breach_firewall: 10,
  dump_creds: 5,
  download_map: 6,
  download_hack: 7,
  transfer_credits: 6,
  scp: 5,
  source: 8,
  feed_blind: 7,
  feed_loop: 4,
  unlock: 3,
  elevator_unlock: 3,
  trigger_vent: 3,
  vent_off: 1,
  cut_lights: 4,
  trip_panel: 4,
  deploy: 6,
  override: 7,
  set_friendly: 6,
  disable: 7,
  blackout: 8,
  mirror: 4,
  blind: 6,
  cripple: 6,
  slow: 5,
  crash: 7,
  ddos: 10,
};

const TERMINAL_ARCHETYPES = [
  {
    id: 'balanced',
    name: 'BALANCED BACKBONE',
    economy: { heatMult: 1, traceMult: 1, latencyMs: 0, bwMult: 1, rewardMult: 1 },
  },
  {
    id: 'cold_mesh',
    name: 'COLD MESH',
    economy: { heatMult: 0.82, traceMult: 0.86, latencyMs: -40, bwMult: 0.9, rewardMult: 0.9 },
  },
  {
    id: 'noisy_backbone',
    name: 'NOISY BACKBONE',
    economy: { heatMult: 1.25, traceMult: 1.2, latencyMs: 85, bwMult: 1.1, rewardMult: 1.25 },
  },
  {
    id: 'brittle_ice',
    name: 'BRITTLE ICE FABRIC',
    economy: { heatMult: 1.1, traceMult: 1.36, latencyMs: 45, bwMult: 1, rewardMult: 1.35 },
  },
];

const META_OBJECTIVES = [
  {
    id: 'stealth_chain',
    title: 'META: STEALTH CHAIN',
    desc: 'Run stealth commands to stabilize ingress.',
    target: 3,
    rewardCredits: 140,
    rewardType: 'trace',
    matches: ['spoof', 'mask_trace', 'ghost'],
  },
  {
    id: 'shard_hunter',
    title: 'META: SHARD HUNTER',
    desc: 'Extract auth shards from side terminals.',
    target: 2,
    rewardCredits: 180,
    rewardType: 'bandwidth',
    matches: ['dump_creds'],
  },
  {
    id: 'quiet_locksmith',
    title: 'META: QUIET LOCKSMITH',
    desc: 'Open routes through terminal control.',
    target: 3,
    rewardCredits: 120,
    rewardType: 'credits',
    matches: ['unlock', 'elevator_unlock'],
  },
];

export function initTerminalRuntime() {
  if (!G.terminalRuntime || !G.dom.terminalOverlay) {
    return;
  }

  const input = G.dom.terminalInput;
  if (!input) {
    return;
  }

  if (input.dataset.boundRealtimeTerminal !== '1') {
    input.dataset.boundRealtimeTerminal = '1';
    input.addEventListener('keydown', handleTerminalInputKeyDown);
    input.addEventListener('input', () => {
      G.terminalRuntime.inputBuffer = input.value;
      syncTerminalHints();
    });
  }

  if (!G.terminalRuntime.bootLineShown) {
    pushTerminalLine('link stack primed. press TAB to open/close terminal.', 'sys');
    pushTerminalLine("type 'tutorial' for a quick walkthrough", 'sys');
    ensureTerminalDirectives();
    emitTerminalDirectiveBootLine();
    G.terminalRuntime.bootLineShown = true;
  }

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
  G.terminalRuntime.scriptQueue = [];
  G.terminalRuntime.activeHacks = [];
  G.terminalRuntime.commandCooldownMs = 0;
  G.terminalRuntime.systemLogTickMs = 0;
  G.terminalRuntime.networkStatus = 'DORMANT';
  G.terminalRuntime.responseDelayMs = 0;
  G.terminalRuntime.scrambleUntil = 0;
  G.terminalRuntime.falseOutputUntil = 0;
  G.terminalRuntime.heat = 0;
  G.terminalRuntime.overheatMode = false;
  G.terminalRuntime.crashUntil = 0;
  G.terminalRuntime.lastHeatSource = 'none';
  G.terminalRuntime.inputBuffer = '';
  G.terminalRuntime.history = [];
  G.terminalRuntime.historyCursor = -1;
  G.terminalRuntime.outputLines = [];
  G.terminalRuntime.renderedOutputCount = 0;
  G.terminalRuntime.renderedOutputRevision = 0;
  G.terminalRuntime.outputRevision = 0;
  G.terminalRuntime.tutorialShown = false;
  G.terminalRuntime.scanHighlights = [];
  G.terminalRuntime.bootLineShown = false;
  G.terminalRuntime.systemDirectiveShown = false;
  G.terminalRuntime.mainPayloadUploaded = false;
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

  const inlineChain = parseConnectInlineChain(raw);
  if (inlineChain) {
    queueTerminalScript(inlineChain);
    G.dom.terminalInput.value = '';
    G.terminalRuntime.inputBuffer = '';
    syncTerminalHints();
    return;
  }

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
  updateTerminalHeatState(dt);

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

  if (!G.terminalRuntime.pendingCommand && G.terminalRuntime.commandCooldownMs <= 0) {
    tickTerminalScriptQueue();
  }

  syncTerminalOverlay();
}

function tickTerminalScriptQueue() {
  const queue = G.terminalRuntime?.scriptQueue;
  if (!queue?.length) {
    return;
  }

  const next = queue.shift();
  if (!next) {
    return;
  }

  queueTerminalCommand(next);
}

function queueTerminalScript(commands) {
  if (!G.terminalRuntime) {
    return;
  }

  if (!commands.length) {
    return;
  }

  G.terminalRuntime.scriptQueue = [
    ...(G.terminalRuntime.scriptQueue || []),
    ...commands,
  ];

  pushTerminalLine(`script queued (${commands.length}): ${commands.join('  ->  ')}`, 'sys');
}

export function noteMainHackChannelProgress(progressValue) {
  if (!G.terminalRuntime) {
    return;
  }

  const steps = [
    'breach.sh: init socket',
    'breach.sh: key exchange',
    'breach.sh: watchdog bypass',
    'breach.sh: memory patch',
    'breach.sh: trace dampening',
    'breach.sh: privilege escalation',
    'breach.sh: breach layer arm',
    'breach.sh: handoff -> breach sequence',
  ];

  const normalized = Math.max(0, Math.min(100, Number(progressValue || 0)));
  const step = Math.min(steps.length - 1, Math.floor((normalized / 100) * steps.length));
  if (step <= (G.terminalRuntime.mainHackLogStep || -1)) {
    return;
  }

  for (let i = (G.terminalRuntime.mainHackLogStep || -1) + 1; i <= step; i += 1) {
    pushTerminalLine(`[mainlink] ${steps[i]}`, i === steps.length - 1 ? 'ok' : 'sys', true);
  }
  G.terminalRuntime.mainHackLogStep = step;
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
  if (G.dom.terminalPrompt) {
    G.dom.terminalPrompt.textContent = getTerminalPrompt();
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
  if (G.dom.terminalAuthShards) {
    const required = Math.max(0, Number(G.mainTerminalAuth?.requiredShards || 0));
    const recovered = Object.keys(G.mainTerminalAuth?.recoveredByNode || {}).length;
    G.dom.terminalAuthShards.textContent = `${recovered}/${required}`;
  }
  if (G.dom.terminalRisk) {
    G.dom.terminalRisk.textContent = `${Math.round(trace.risk || 0)}%`;
  }
  if (G.dom.terminalHeatState) {
    G.dom.terminalHeatState.textContent = getTerminalHeatStateLabel();
  }
  if (G.dom.terminalHeatFill) {
    G.dom.terminalHeatFill.style.width = `${Math.max(0, Math.min(100, G.terminalRuntime.heat || 0))}%`;
  }
  if (G.dom.terminalOverlay) {
    G.dom.terminalOverlay.classList.toggle('rt-overheat', !!G.terminalRuntime.overheatMode && performance.now() >= (G.terminalRuntime.crashUntil || 0));
    G.dom.terminalOverlay.classList.toggle('rt-crash', performance.now() < (G.terminalRuntime.crashUntil || 0));
    const panel = G.dom.terminalOverlay.querySelector('.rt-panel');
    if (panel) {
      panel.classList.toggle('rt-overheat', !!G.terminalRuntime.overheatMode && performance.now() >= (G.terminalRuntime.crashUntil || 0));
      panel.classList.toggle('rt-crash', performance.now() < (G.terminalRuntime.crashUntil || 0));
    }
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

  if (performance.now() < (G.terminalRuntime.crashUntil || 0)) {
    pushTerminalLine('terminal crash recovery in progress.', 'bad');
    addTrace(1.8, 'crash');
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
  ensureTerminalDirectives();

  const economy = G.terminalRuntime.economy || { heatMult: 1, traceMult: 1, latencyMs: 0, bwMult: 1 };
  const heatCost = Math.max(0, Math.round(getCommandHeatCost(parsed.commandId) * (economy.heatMult || 1)));
  const traceCost = Math.max(0, (def.noise || 0) * 0.45 * (economy.traceMult || 1));
  const bwCost = Math.max(0, Math.round(getCommandBwCost(parsed.commandId) * (economy.bwMult || 1)));

  if ((G.P?.bw || 0) < bwCost) {
    pushTerminalLine(`insufficient BW for ${parsed.commandId} (need ${bwCost})`, 'warn');
    return;
  }

  if (bwCost > 0 && G.P) {
    G.P.bw = Math.max(0, G.P.bw - bwCost);
    refreshHUD();
  }

  const latency =
    def.latencyMs +
    (G.terminalRuntime.responseDelayMs || 0) +
    getTerminalHeatPenaltyMs() +
    Math.round(economy.latencyMs || 0);
  const scrambleActive = performance.now() < (G.terminalRuntime.scrambleUntil || 0);

  pushCommandTelemetryLine(parsed.commandId, {
    heat: heatCost,
    trace: traceCost,
    bw: bwCost,
    latency,
  });

  G.terminalRuntime.pendingCommand = {
    commandId: parsed.commandId,
    args: parsed.args,
    raw: rawInput,
    target,
    remainingMs: latency,
    scrambled: scrambleActive && def.id !== 'help',
    telemetry: { heat: heatCost, trace: traceCost, bw: bwCost, latency },
  };

  addTerminalHeat(heatCost, parsed.commandId);

  G.terminalRuntime.commandCooldownMs = 120;
  if (traceCost > 0) {
    addTrace(traceCost, parsed.commandId);
  }

  trackMetaObjectiveProgress(parsed.commandId);
  applyAICounterreaction(parsed.commandId, target);
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

  if (commandId === 'clear') {
    runClear();
    noteTutorialCommand('clear', args);
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

  if (commandId === 'dump_creds') {
    if (runDumpCreds(target)) {
      noteTutorialCommand('dump_creds', args);
    }
    return;
  }

  if (commandId === 'breach_firewall') {
    if (runBreachFirewall(target)) {
      noteTutorialCommand('breach_firewall', args);
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

  if (commandId === 'scp') {
    runScp(args, target);
    return;
  }

  if (commandId === 'source') {
    runSource(args, target);
    return;
  }

  if (commandId === 'feed_blind') {
    runFeedBlind(target);
    return;
  }

  if (commandId === 'feed_loop') {
    runFeedLoop(target);
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

  if (commandId === 'elevator_unlock') {
    runElevatorUnlock(target);
    noteTutorialCommand('unlock', ['elevator']);
    return;
  }

  if (commandId === 'elevator_up') {
    runElevatorMove('up');
    return;
  }

  if (commandId === 'elevator_down') {
    runElevatorMove('down');
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

  if (commandId === 'trigger_vent') {
    if (runDistractionCommand('trigger_vent', 'vent', target)) {
      noteTutorialCommand('trigger_vent', args);
    }
    return;
  }

  if (commandId === 'vent_off') {
    if (runDistractionCommand('vent_off', 'vent', target)) {
      noteTutorialCommand('vent_off', args);
    }
    return;
  }

  if (commandId === 'cut_lights') {
    if (runDistractionCommand('cut_lights', 'lights', target)) {
      noteTutorialCommand('cut_lights', args);
    }
    return;
  }

  if (commandId === 'trip_panel') {
    if (runDistractionCommand('trip_panel', 'junction', target)) {
      noteTutorialCommand('trip_panel', args);
    }
    return;
  }

  if (commandId === 'auto_connect_guard') {
    runAutoConnectGuard(args[0]);
    return;
  }

  const QH_COMMANDS = ['blind', 'cripple', 'ddos', 'slow', 'crash'];
  if (QH_COMMANDS.includes(commandId)) {
    runQuickHackOnTarget(commandId, target);
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

  if (found.type === 'cam' && found.dist > 3.5) {
    pushTerminalLine(`camera uplink out of range (${found.dist.toFixed(1)}t > 3.5t)`, 'warn');
    return;
  }

  if (dst(found.anchor, G.P) > HACK_RANGE + 1.2) {
    pushTerminalLine(`out of range: ${targetId}`, 'warn');
    return;
  }

  runClear();
  G.terminalRuntime.connectedTargetId = found.id;
  G.terminalRuntime.connectedTargetType = found.type;
  G.terminalRuntime.connectedTargetLabel = found.label;
  pushTerminalLine(`uplink established -> ${found.id} [${found.type}]`, 'ok');
  pushConnectedCommandHint(found);

  if (found.type === 'mainterm' && !isMainTerminalAccessUnlocked()) {
    const progress = getMainAuthProgress();
    pushTerminalLine(`main terminal locked [${progress.recovered}/${progress.required} shards]`, 'warn');
    pushTerminalLine('flow: connect node_side_# -> breach firewall -> dump creds', 'dim');
  }

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
  G.terminalRuntime.mainPayloadUploaded = false;
}

function runScanLocal() {
  const local = enumerateHackTargets(false);

  if (!local.length) {
    pushTerminalLine('scan local: no nodes in range.', 'dim');
    return;
  }

  pushTerminalLine(`scan local: ${local.length} node(s)`, 'sys');
  updateScanHighlights(local);
  const primary = local.slice(0, 10);
  for (const item of primary) {
    pushTerminalLine(formatScanLine(item, true), getScanLineClass(item));
  }

  const seenIds = new Set(primary.map((item) => item.id));
  const elevators = local.filter((item) => item.type === 'elevator' && !seenIds.has(item.id));
  for (const item of elevators) {
    pushTerminalLine(formatScanLine(item, true), getScanLineClass(item));
  }

  const nearbyDoorPanel = local.find((item) => item.type === 'wterm' || item.type === 'door');
  if (nearbyDoorPanel) {
    pushTerminalLine(`door tip: connect ${nearbyDoorPanel.id} -> unlock`, 'ok');
  }
}

function runScanNetwork() {
  const all = enumerateHackTargets(true);
  pushTerminalLine(`scan network: ${all.length} known node(s)`, 'sys');
  const primary = all.slice(0, 12);
  for (const item of primary) {
    pushTerminalLine(formatScanLine(item, false), getScanLineClass(item));
  }

  const seenIds = new Set(primary.map((item) => item.id));
  const elevators = all.filter((item) => item.type === 'elevator' && !seenIds.has(item.id));
  for (const item of elevators) {
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

function runDumpCreds(target) {
  const side = requireSideTerminalTarget(target, 'dump creds', { requireAuthExtracted: false, allowConsumed: true });
  if (!side) {
    return false;
  }

  if (!side.ref?.authShard) {
    pushTerminalLine('credential cache empty on this node.', 'warn');
    return false;
  }

  if (side.ref.authShardExtracted) {
    pushTerminalLine(`auth shard already extracted from ${side.id}`, 'dim');
    return false;
  }

  if (!G.mainTerminalAuth) {
    G.mainTerminalAuth = {
      requiredShards: 0,
      recoveredByNode: {},
      unlocked: true,
      passphrasePreview: null,
    };
  }

  const shard = String(side.ref.authShard || '').toUpperCase();
  const shardIndex = side.ref.authShardIndex || 1;

  side.ref.authShardExtracted = true;
  G.mainTerminalAuth.recoveredByNode = G.mainTerminalAuth.recoveredByNode || {};
  G.mainTerminalAuth.recoveredByNode[side.id] = shard;

  const progress = getMainAuthProgress();
  const recovered = getRecoveredShardsOrdered();
  G.mainTerminalAuth.passphrasePreview = recovered.join('-');

  pushTerminalLine(`auth shard ${shardIndex}/${progress.required}: ${shard}`, 'ok');
  pushTerminalLine(`main auth progress: ${progress.recovered}/${progress.required}`, 'dim');

  if (progress.required > 0 && progress.recovered >= progress.required) {
    G.mainTerminalAuth.unlocked = true;
    pushTerminalLine('MAIN AUTH KEY reconstructed. main terminal unlocked.', 'ok');
    pushTerminalLine('next: connect node_main -> unlock elevator', 'dim');
  }

  return true;
}

function runBreachFirewall(target) {
  const side = requireSideTerminalTarget(target, 'breach firewall', { requireOpenFirewall: false, requireAuthExtracted: false });
  if (!side) {
    return false;
  }

  if (!side.ref?.requiresFirewall) {
    side.ref.firewallBreached = true;
    pushTerminalLine('no active ICE on this node. firewall already open.', 'dim');
    return true;
  }

  if (side.ref.firewallBreached) {
    pushTerminalLine('firewall already breached on this node.', 'dim');
    return true;
  }

  side.ref.firewallBreached = true;
  addTrace(4.6, 'firewall-breach');
  pushTerminalLine(`ICE broken on ${side.id}. data extraction channel opened.`, 'warn');
  return true;
}

function requireSideTerminalTarget(target, commandLabel, options = {}) {
  const { requireOpenFirewall = true, requireAuthExtracted = true, allowConsumed = false } = options;

  if (!target || target.type !== 'sterm') {
    pushTerminalLine(`${commandLabel} requires connected side terminal node`, 'warn');
    pushTerminalLine('flow: scan local -> connect node_side_# -> command', 'dim');
    return null;
  }

  if (target.ref?.used && !allowConsumed) {
    pushTerminalLine(`terminal already consumed: ${target.id}`, 'warn');
    return null;
  }

  if (target.ref?.used && allowConsumed) {
    pushTerminalLine('payload spent, credential cache still readable.', 'dim');
  }

  if (requireOpenFirewall && target.ref?.requiresFirewall && !target.ref?.firewallBreached) {
    pushTerminalLine(`access denied by ICE on ${target.id}`, 'bad');
    pushTerminalLine('run: breach firewall (high heat, slow)', 'dim');
    return null;
  }

  if (requireAuthExtracted && target.ref?.authShard && !target.ref?.authShardExtracted) {
    pushTerminalLine(`terminal holds required auth shard (${target.id})`, 'warn');
    pushTerminalLine('extract first: dump creds', 'dim');
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
    if (target.type === 'mainterm' && !isMainTerminalAccessUnlocked()) {
      const progress = getMainAuthProgress();
      pushTerminalLine(`main terminal locked [${progress.recovered}/${progress.required} shards]`, 'warn');
      return;
    }
    G.hackSpeedBonus = clamp((G.hackSpeedBonus || 0) + 0.25, 0, 1.8);
    registerTimedHack('inject-buffer', target.id, 8000, () => {
      G.hackSpeedBonus = Math.max(0, (G.hackSpeedBonus || 0) - 0.25);
    });
    pushTerminalLine(`payload ${payload} seeded on ${target.id}`, 'ok');
    return;
  }

  pushTerminalLine(`inject not supported on ${target.type}`, 'warn');
}

function runScp(args, target) {
  if (!target) {
    pushTerminalLine('scp failed: no target uplink.', 'warn');
    return;
  }

  if (target.type !== 'mainterm' || target.id !== 'node_main') {
    pushTerminalLine(`scp denied on ${target.type}. connect node_main first.`, 'warn');
    return;
  }

  const artifact = String(args[0] || '').toLowerCase();
  if (!artifact) {
    pushTerminalLine('usage: scp breach.sh', 'warn');
    return;
  }

  if (artifact !== 'breach.sh' && artifact !== 'breah.sh') {
    pushTerminalLine(`upload rejected: ${artifact} not in payload catalog`, 'bad');
    pushTerminalLine('expected artifact: breach.sh', 'dim');
    return;
  }

  G.terminalRuntime.mainPayloadUploaded = true;
  addTrace(1.8, 'scp');
  pushTerminalLine('breach.sh uploaded to node_main:/tmp/.cache', 'ok');
  pushTerminalLine('next: source breach.sh', 'dim');
}

function runSource(args, target) {
  if (!target) {
    pushTerminalLine('source failed: no target uplink.', 'warn');
    return;
  }

  if (target.type !== 'mainterm' || target.id !== 'node_main') {
    pushTerminalLine(`source blocked on ${target.type}. connect node_main first.`, 'warn');
    return;
  }

  const artifact = String(args[0] || '').toLowerCase();
  if (!artifact) {
    pushTerminalLine('usage: source breach.sh', 'warn');
    return;
  }

  if (artifact !== 'breach.sh' && artifact !== 'breah.sh') {
    pushTerminalLine(`source: ${artifact}: not found`, 'bad');
    return;
  }

  if (!G.terminalRuntime.mainPayloadUploaded) {
    pushTerminalLine('source failed: breach.sh not uploaded. run scp breach.sh first.', 'warn');
    return;
  }

  const progress = getMainAuthProgress();
  const missing = Math.max(0, progress.required - progress.recovered);
  if (missing > 0) {
    const bruteHeat = 18 + missing * 14;
    const bruteTrace = 2.8 + missing * 1.4;
    addTerminalHeat(bruteHeat, 'source_bruteforce');
    addTrace(bruteTrace, 'source_bruteforce');
    pushTerminalLine(`auth bypass active: missing shard(s) ${missing}. heat +${bruteHeat}.`, 'warn');
  }

  if (G.mainHacked) {
    pushTerminalLine('main terminal already compromised.', 'dim');
    return;
  }

  if (G.hackingMain) {
    pushTerminalLine('payload already running on node_main.', 'dim');
    return;
  }

  G.terminalRuntime.mainPayloadUploaded = false;
  G.terminalRuntime.mainHackLogStep = -1;
  G.hackProgress = Math.max(0, G.hackProgress || 0);
  G.hackingMain = true;
  G.missionPhase = 1;
  updateMissionText();
  pushTerminalLine('breach.sh sourced. live channel established -> keep position stable.', 'ok');
  pushTerminalLine('handoff armed: channel 100% will enter breach sequence.', 'dim');
}

function runFeedBlind(target) {
  if (!target || target.type !== 'cam') {
    pushTerminalLine('feed blind requires connected camera uplink', 'warn');
    return;
  }

  target.ref.hacked = true;
  dispatchTechnicianToCamera(target.ref);
  pushTerminalLine(`camera ${target.id} blinded until technician repair`, 'ok');
  rebuildList();
}

function runFeedLoop(target) {
  if (!target || target.type !== 'cam') {
    pushTerminalLine('feed loop requires connected camera uplink', 'warn');
    return;
  }

  target.ref.hacked = true;
  dispatchTechnicianToCamera(target.ref);
  registerTimedHack('feed-loop', target.id, 10000, () => {
    target.ref.hacked = false;
    rebuildList();
  });
  pushTerminalLine(`camera ${target.id} feed loop active (10s)`, 'ok');
  rebuildList();
}

function runElevatorUnlock(target) {
  runUnlock(['elevator'], target);
}

function runElevatorMove(direction) {
  if (!G.elevatorUnlocked) {
    pushTerminalLine('elevator locked. run elevator unlock on node_main first.', 'warn');
    return;
  }

  const desired = direction === 'up' ? TILE_TYPES.STAIR_UP : TILE_TYPES.STAIR_DOWN;
  const nearby = findNearbyStair(desired, 1.5);
  if (!nearby) {
    pushTerminalLine(`no elevator ${direction} within 1.5t`, 'warn');
    return;
  }

  G.P.x = nearby.x + 0.5;
  G.P.y = nearby.y + 0.5;
  G.stairTransitionArmed = true;
  G.stairTransitionCooldownMs = 0;
  G.stairTransitionRequested = true;
  pushTerminalLine(`elevator ${direction} engaged`, 'ok');
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
    if (target.type === 'mainterm' && !isMainTerminalAccessUnlocked()) {
      const progress = getMainAuthProgress();
      pushTerminalLine(`main terminal locked [${progress.recovered}/${progress.required} shards]`, 'warn');
      return;
    }
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

function runUnlock(args, target) {
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

  if (target.type === 'mainterm' && String(args[0] || '').toLowerCase() === 'elevator') {
    if (!isMainTerminalAccessUnlocked()) {
      const progress = getMainAuthProgress();
      pushTerminalLine(`main auth incomplete [${progress.recovered}/${progress.required}]`, 'warn');
      pushTerminalLine('collect shards: breach firewall + dump creds on side terminals', 'dim');
      return;
    }

    if (G.elevatorUnlocked) {
      pushTerminalLine('elevator uplink already unlocked.', 'dim');
      return;
    }

    G.elevatorUnlocked = true;
    pushTerminalLine('elevator uplink unlocked for floor transitions.', 'ok');
    return;
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

function runDistractionCommand(action, expectedType, target) {
  if (!target || target.type !== 'distract') {
    pushTerminalLine('distraction command requires a connected distraction node', 'warn');
    pushTerminalLine('flow: scan local -> connect vent_1/lights_1/junction_1/wallpanel_1 -> command', 'dim');
    return false;
  }

  const ref = target.ref;
  if (!ref) {
    pushTerminalLine('node failure: distraction reference missing.', 'bad');
    return false;
  }

  if (expectedType && ref.nodeType && ref.nodeType !== expectedType) {
    pushTerminalLine(`command rejected: ${target.id} is ${ref.nodeType}, not ${expectedType}`, 'bad');
    return false;
  }

  const now = performance.now();
  if (action === 'vent_off') {
    if (!ref.active) {
      pushTerminalLine(`vent already idle on ${target.id}`, 'dim');
      return false;
    }

    ref.active = false;
    ref.activeUntil = now;
    pushTerminalLine(`vent lure stopped on ${target.id}`, 'ok');

    if (G.tutorial?.active) {
      pushTerminalLine(`tutorial ✓ vent off accepted on ${target.id}`, 'ok');
    }
    return true;
  }

  if (now < (ref.cooldownUntil || 0)) {
    pushTerminalLine(`node cooling down: ${target.id}`, 'warn');
    return false;
  }

  ref.active = true;
  ref.activeUntil = now + (ref.durationMs || 6000);
  ref.cooldownUntil = now + (ref.cooldownMs || 7000);

  const lureX = ref.x;
  const lureY = ref.y;

  let guardRedirects = 0;
  for (const guard of byType('guard')) {
    if (guard.dead || guard.offline || guard.state === 'chase') {
      continue;
    }

    guard.state = 'search';
    guard.lastSeen = { x: lureX, y: lureY };
    guard.investigateX = lureX;
    guard.investigateY = lureY;
    guard.investigateUntil = now + Math.max(4500, (ref.durationMs || 6000) + 1200);
    guard.searchTimer = 0;
    guardRedirects += 1;
  }

  let techRedirects = 0;
  for (const tech of byType('tech')) {
    if (tech.dead || tech.state === 'repair' || tech.state === 'repairing') {
      continue;
    }

    tech.state = 'investigate';
    tech.investigateTargetId = ref.id;
    tech.inspectTimer = 0;
    techRedirects += 1;
  }

  pushTerminalLine(`distraction active on ${target.id}`, 'ok');
  pushTerminalLine(`redirected patrols: guards ${guardRedirects}, techs ${techRedirects}`, 'dim');

  if (G.tutorial?.active) {
    const actionLabel = action === 'trigger_vent'
      ? 'vent on'
      : action === 'cut_lights'
        ? 'lights cut'
        : 'junction overload';

    pushTerminalLine(`tutorial ✓ ${actionLabel} accepted on ${target.id}`, 'ok');
    pushTerminalLine('tutorial hint: chain another distraction or finish with help distraction', 'dim');
  }

  return true;
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

  for (const distract of byType('distract')) {
    pushTarget(out, {
      id: distract.id || `distract_${out.length}`,
      type: 'distract',
      label: distract.desc || 'Distraction Node',
      anchor: distract,
      ref: distract,
      dist: dst(distract, G.P),
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
      id: G.mainTerminal.id || 'node_main',
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

  const elevators = getElevatorTargets();
  for (const elevator of elevators) {
    pushTarget(out, elevator, Infinity);
  }

  out.sort((a, b) => a.dist - b.dist);
  return out;
}

function getElevatorTargets() {
  const out = [];
  for (let y = 0; y < G.tiles.length; y += 1) {
    const row = G.tiles[y] || [];
    for (let x = 0; x < row.length; x += 1) {
      const tile = row[x];
      if (tile !== TILE_TYPES.STAIR_UP && tile !== TILE_TYPES.STAIR_DOWN) {
        continue;
      }

      out.push({
        id: tile === TILE_TYPES.STAIR_UP ? 'elevator_up_node' : 'elevator_down_node',
        type: 'elevator',
        label: tile === TILE_TYPES.STAIR_UP ? 'Elevator Up' : 'Elevator Down',
        anchor: { x: x + 0.5, y: y + 0.5 },
        ref: { x, y, tile },
        dist: dst({ x: x + 0.5, y: y + 0.5 }, G.P),
      });
    }
  }

  const unique = new Map();
  for (const item of out) {
    if (!unique.has(item.id) || item.dist < unique.get(item.id).dist) {
      unique.set(item.id, item);
    }
  }
  return [...unique.values()];
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
  const target = resolveConnectedTarget();

  if (!topic) {
    if (target) {
      pushTerminalLine(`CONNECTED HELP -> ${target.id} [${target.type}]`, 'ok');
      pushConnectedHelp(target);
      pushTerminalLine("for global topics use help basics|doors|cameras|stealth|guards|technicians|terminals|mainterm|distraction", 'dim');
      return;
    }

    pushTerminalLine('HELP TOPICS', 'ok');
    pushTerminalLine('help basics  | help doors  | help cameras  | help stealth', 'dim');
    pushTerminalLine('help guards  | help technicians  | help terminals  | help mainterm', 'dim');
    pushTerminalLine('help distraction', 'dim');
    pushTerminalLine('tutorial     | clear       | scan local  | scan network', 'dim');
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
    pushTerminalLine('extra: clear (wipe screen output)', 'dim');
    pushTerminalLine('map tooltips show object and network name in brackets', 'dim');
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
    pushTerminalLine('camera uplink range: 3.5 tiles max', 'dim');
    pushTerminalLine('example: scan local -> connect cam_0 -> feed blind -> disconnect', 'dim');
    pushTerminalLine('or: connect cam_0 -> feed loop -> disconnect', 'dim');
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
    pushTerminalLine('breach firewall    : slow ICE break, high heat', 'dim');
    pushTerminalLine('dump creds         : extract auth shard for main terminal', 'dim');
    pushTerminalLine('download map       : reveal map layout', 'dim');
    pushTerminalLine('download hack      : gain one quickhack', 'dim');
    pushTerminalLine('transfer credits   : gain mission credits', 'dim');
    pushTerminalLine('note: each side terminal can be consumed once', 'dim');
    return;
  }

  if (topic === 'mainterm') {
    pushTerminalLine('MAIN TERMINAL METHODS', 'ok');
    pushTerminalLine('scan local -> connect node_main', 'dim');
    pushTerminalLine('requires side-terminal auth shards before full access', 'dim');
    pushTerminalLine('scp breach.sh    : upload breach payload', 'dim');
    pushTerminalLine('source breach.sh : start breach channel', 'dim');
    pushTerminalLine('elevator unlock  : enables floor transition auth', 'dim');
    pushTerminalLine('elevator up/down : use nearby elevator (<=1.5t)', 'dim');
    pushTerminalLine('disconnect       : close uplink cleanly', 'dim');
    return;
  }

  if (topic === 'distraction') {
    pushTerminalLine('DISTRACTION METHODS', 'ok');
    pushTerminalLine('scan local -> connect vent_1/lights_1/junction_1/wallpanel_1', 'dim');
    pushTerminalLine('vent on        : air burst lure, low trace (vent only)', 'dim');
    pushTerminalLine('vent off       : stop ventilation lure (vent only)', 'dim');
    pushTerminalLine('lights cut     : local flicker, medium trace (lights only)', 'dim');
    pushTerminalLine('junction overload : spark + alarm chirp (junction only)', 'dim');
    pushTerminalLine('wall panel is wall-mounted utility hardware', 'dim');
    pushTerminalLine('active chase has priority over distraction', 'dim');
    return;
  }

  pushTerminalLine(`unknown help topic: ${topic}`, 'warn');
  pushTerminalLine('available: basics, doors, cameras, stealth, guards, technicians, terminals, mainterm, distraction', 'dim');
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
  pushTerminalLine('feed blind or feed loop', 'dim');
  pushTerminalLine('disconnect', 'dim');
  pushTerminalLine('guard flow: connect guard_0 -> set friendly / override / disable', 'dim');
  pushTerminalLine('technician flow: connect tech_0 -> set friendly / override / disable', 'dim');
  pushTerminalLine('side terminal flow: connect node_side_1 -> breach firewall -> dump creds', 'dim');
  pushTerminalLine('distraction flow: connect vent_1 -> vent on (or lights cut / junction overload)', 'dim');
  pushTerminalLine('loot after ICE break: download map / download hack / transfer credits', 'dim');
  pushTerminalLine('main terminal flow: connect node_main -> scp breach.sh -> source breach.sh -> elevator unlock', 'dim');
  pushTerminalLine("need examples later? use help guards / help technicians / help terminals / help mainterm", 'dim');
}

function runClear() {
  if (!G.terminalRuntime) {
    return;
  }

  G.terminalRuntime.outputLines = [];
  G.terminalRuntime.renderedOutputCount = 0;
  G.terminalRuntime.renderedOutputRevision = 0;
  G.terminalRuntime.outputRevision += 1;

  if (G.dom.terminalOutput) {
    G.dom.terminalOutput.innerHTML = '';
  }

  pushTerminalLine('screen cleared.', 'sys', true);
}

function emitTutorialIntro() {
  pushTerminalLine('REALTIME TERMINAL ONLINE', 'ok');
  pushTerminalLine("new here? type 'tutorial'", 'dim');
  pushTerminalLine("need doors? type 'help doors'", 'dim');
}

function pushConnectedHelp(target) {
  if (target.type === 'cam') {
    pushTerminalLine('feed blind  : permanent blind until technician repair', 'dim');
    pushTerminalLine('feed loop   : temporary loop for 10s', 'dim');
    pushTerminalLine('disable     : force short offline window', 'dim');
    return;
  }

  if (target.type === 'mainterm') {
    pushTerminalLine('scp breach.sh     : upload main payload', 'dim');
    pushTerminalLine('source breach.sh  : start breach channel', 'dim');
    pushTerminalLine('elevator unlock   : authorize floor transitions', 'dim');
    return;
  }

  if (target.type === 'elevator') {
    pushTerminalLine('elevator up   : move up (must be within 1.5t of elevator up)', 'dim');
    pushTerminalLine('elevator down : move down (must be within 1.5t of elevator down)', 'dim');
    return;
  }

  if (target.type === 'distract') {
    const nodeType = String(target.ref?.nodeType || 'generic').toLowerCase();
    if (nodeType === 'vent') {
      pushTerminalLine('vent on   : start ventilation lure', 'dim');
      pushTerminalLine('vent off  : stop ventilation lure', 'dim');
      return;
    }
    if (nodeType === 'lights' || nodeType === 'wallpanel') {
      pushTerminalLine('lights cut : trigger light flicker investigation spike', 'dim');
      return;
    }
    if (nodeType === 'junction') {
      pushTerminalLine('junction overload : spark + alarm chirp distraction pulse', 'dim');
      return;
    }
  }

  pushTerminalLine('commands depend on connected object type.', 'dim');
  pushTerminalLine('try: help basics', 'dim');
}

function pushConnectedCommandHint(target) {
  if (target.type === 'cam') {
    pushTerminalLine('camera uplink ready. commands: feed blind | feed loop | disable', 'dim');
    return;
  }

  if (target.type === 'mainterm') {
    pushTerminalLine('main uplink ready. commands: scp breach.sh -> source breach.sh -> elevator unlock', 'dim');
    return;
  }

  if (target.type === 'elevator') {
    pushTerminalLine('elevator uplink ready. commands: elevator up | elevator down', 'dim');
    return;
  }

  if (target.type === 'distract') {
    const nodeType = String(target.ref?.nodeType || 'generic').toLowerCase();
    if (nodeType === 'vent') {
      pushTerminalLine('distraction node ready. commands: vent on | vent off', 'dim');
      return;
    }
    if (nodeType === 'lights' || nodeType === 'wallpanel') {
      pushTerminalLine('distraction node ready. command: lights cut', 'dim');
      return;
    }
    if (nodeType === 'junction') {
      pushTerminalLine('distraction node ready. command: junction overload', 'dim');
      return;
    }
    pushTerminalLine('distraction node ready. use help distraction for commands', 'dim');
    return;
  }
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

    const tokenCompletion = autocompleteCommandByToken(tokens, hasTrailingSpace);
    if (tokenCompletion) {
      return tokenCompletion;
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

  const tokenCompletion = autocompleteCommandByToken(tokens, hasTrailingSpace);
  if (tokenCompletion) {
    return tokenCompletion;
  }

  return autocompleteTerminalCommand(normalized);
}

function autocompleteCommandByToken(tokens, hasTrailingSpace) {
  const phrases = getAutocompletePhraseTokens();
  if (!phrases.length || !tokens.length) {
    return '';
  }

  if (tokens.length === 1) {
    const prefix = tokens[0] || '';
    const matches = phrases.filter((phrase) => (phrase[0] || '').startsWith(prefix));
    if (!matches.length) {
      return '';
    }

    const firstTokens = [...new Set(matches.map((phrase) => phrase[0]))];
    if (firstTokens.length === 1) {
      return `${firstTokens[0]} `;
    }

    const common = longestCommonPrefix(firstTokens);
    if (common.length > prefix.length) {
      return common;
    }

    return '';
  }

  const segmentIndex = hasTrailingSpace ? tokens.length : tokens.length - 1;
  const prefix = hasTrailingSpace ? '' : (tokens[segmentIndex] || '');
  const baseTokens = hasTrailingSpace ? tokens : tokens.slice(0, -1);

  const matches = phrases.filter((phrase) => {
    if (phrase.length <= segmentIndex) {
      return false;
    }

    for (let i = 0; i < baseTokens.length; i += 1) {
      if (phrase[i] !== baseTokens[i]) {
        return false;
      }
    }

    return (phrase[segmentIndex] || '').startsWith(prefix);
  });

  if (!matches.length) {
    return '';
  }

  const nextTokens = [...new Set(matches.map((phrase) => phrase[segmentIndex]))];
  if (nextTokens.length === 1) {
    return [...baseTokens, nextTokens[0]].join(' ');
  }

  const common = longestCommonPrefix(nextTokens);
  if (common.length > prefix.length) {
    return [...baseTokens, common].join(' ');
  }

  return '';
}

function getAutocompletePhraseTokens() {
  const out = [];

  for (const cmd of COMMAND_REGISTRY) {
    const phrases = [cmd.phrase, ...(cmd.aliases || [])];
    for (const phrase of phrases) {
      const tokens = String(phrase || '').trim().toLowerCase().split(' ').filter(Boolean);
      if (tokens.length) {
        out.push(tokens);
      }
    }
  }

  return out;
}

function getAutocompleteTargetIds() {
  const ids = enumerateHackTargets(false).map((item) => (item.id || '').toLowerCase()).filter(Boolean);
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function parseConnectInlineChain(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) {
    return null;
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 3 || String(parts[0]).toLowerCase() !== 'connect') {
    return null;
  }

  const targetId = String(parts[1] || '').toLowerCase();
  if (!targetId) {
    return null;
  }

  const tail = parts.slice(2);
  const segments = [];
  let current = [];

  for (const token of tail) {
    if (token.startsWith('--')) {
      if (current.length) {
        segments.push(current.join(' '));
      }
      const next = token.slice(2);
      current = next ? [next] : [];
      continue;
    }

    current.push(token);
  }

  if (current.length) {
    segments.push(current.join(' '));
  }

  if (!segments.length) {
    return null;
  }

  const normalizedSegments = segments
    .map((segment) => normalizeInlineSegment(targetId, segment))
    .filter(Boolean);

  if (!normalizedSegments.length) {
    return null;
  }

  return [`connect ${targetId}`, ...normalizedSegments];
}

function normalizeInlineSegment(targetId, segment) {
  const normalized = String(segment || '').trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  if (targetId.startsWith('cam') || targetId.startsWith('camera')) {
    const cameraAction = resolveCameraInlineAction(normalized);
    if (cameraAction) {
      return cameraAction;
    }
  }

  const resolvedFromTail = resolveInlineActionFromTail(normalized);
  if (resolvedFromTail) {
    return resolvedFromTail;
  }

  return normalized;
}

function resolveCameraInlineAction(segment) {
  const tokens = String(segment || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return '';
  }

  // Preserve the final actionable token so chains like "--loop blind"
  // resolve to the intended command (feed blind).
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i] === 'blind') {
      return 'feed blind';
    }
    if (tokens[i] === 'loop') {
      return 'feed loop';
    }
  }

  return '';
}

function resolveInlineActionFromTail(segment) {
  const tokens = String(segment || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return '';
  }

  for (let start = tokens.length - 1; start >= 0; start -= 1) {
    const candidate = tokens.slice(start).join(' ');
    const parsed = parseTerminalCommand(candidate);
    if (parsed.ok) {
      return candidate;
    }
  }

  return '';
}

function getTerminalPrompt() {
  const runtime = G.terminalRuntime;
  if (!runtime?.connectedTargetId) {
    return 'op@gp://$';
  }

  const scope = String(runtime.connectedTargetId || 'node').toLowerCase();
  return `op@gp://${scope}$`;
}

function findNearbyStair(tileType, maxDist) {
  let best = null;

  for (let y = 0; y < G.tiles.length; y += 1) {
    const row = G.tiles[y] || [];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== tileType) {
        continue;
      }

      const d = dst({ x: x + 0.5, y: y + 0.5 }, G.P);
      if (d > maxDist) {
        continue;
      }

      if (!best || d < best.dist) {
        best = { x, y, dist: d };
      }
    }
  }

  return best;
}

function dispatchTechnicianToCamera(camera) {
  if (G.techDisabled || !camera) {
    return;
  }

  if (byType('tech').some((tech) => !tech.dead && tech.targetId === camera.id)) {
    return;
  }

  const technician = byType('tech').find((tech) => !tech.dead && tech.state === 'patrol');
  if (!technician) {
    return;
  }

  technician.state = 'repair';
  technician.targetId = camera.id;
  technician.repairTimer = 0;
  technician.repairDuration = 0;
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
      : item.type === 'elevator'
        ? 'elevator'
      : item.type === 'distract'
        ? 'distract'
      : item.type;
  return `${item.id} [${label}]${dist}`;
}

function getScanLineClass(item) {
	if (item.type === 'cam') return 'scan-cam';
	if (item.type === 'guard') return 'scan-guard';
	if (item.type === 'drone') return 'scan-drone';
	if (item.type === 'tech') return 'scan-tech';
	if (item.type === 'wterm' || item.type === 'door') return 'scan-door';
  if (item.type === 'elevator') return 'scan-door';
  if (item.type === 'distract') return 'scan-terminal';
	if (item.type === 'mainterm' || item.type === 'sterm') return 'scan-terminal';
	return 'scan-generic';
}

function isMainTerminalAccessUnlocked() {
  return !!G.mainTerminalAuth?.unlocked;
}

function getMainAuthProgress() {
  const required = Math.max(0, Number(G.mainTerminalAuth?.requiredShards || 0));
  const recovered = Object.keys(G.mainTerminalAuth?.recoveredByNode || {}).length;
  return { required, recovered };
}

function getRecoveredShardsOrdered() {
  const values = Object.values(G.mainTerminalAuth?.recoveredByNode || {});
  return values
    .map((item) => String(item || '').toUpperCase())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
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

export function addTerminalHeat(amount, source = 'unknown') {
  if (!G.terminalRuntime) {
    return 0;
  }

  const runtime = G.terminalRuntime;
  const nextHeat = clamp((runtime.heat || 0) + Math.max(0, amount || 0), 0, runtime.heatMax || 100);
  runtime.heat = nextHeat;
  runtime.lastHeatSource = source;

  if (nextHeat >= (runtime.heatCrashThreshold || 96) && performance.now() >= (runtime.crashUntil || 0)) {
    runtime.crashUntil = performance.now() + TERMINAL_HEAT_CRASH_DURATION_MS;
    runtime.overheatMode = true;
    runtime.networkStatus = 'CRASH';
    runtime.responseDelayMs = Math.max(runtime.responseDelayMs || 0, 320);
    pushTerminalLine('terminal overload. crash cycle engaged.', 'bad');
    addTrace(4.5, 'heat-crash');
  } else if (nextHeat >= (runtime.heatOverheatThreshold || 72)) {
    runtime.overheatMode = true;
    if (runtime.networkStatus === 'DORMANT') {
      runtime.networkStatus = 'OVERHEAT';
    }
  }

  syncTerminalOverlay();
  return nextHeat;
}

export function getTerminalHeatPenaltyMs() {
  if (!G.terminalRuntime) {
    return 0;
  }

  const runtime = G.terminalRuntime;
  const heat = runtime.heat || 0;
  const overheatBoost = runtime.overheatMode ? 120 : 0;
  const crashBoost = performance.now() < (runtime.crashUntil || 0) ? 240 : 0;
  const heatPenalty = heat > 55 ? Math.round((heat - 55) * 3.2) : 0;

  return heatPenalty + overheatBoost + crashBoost;
}

function getCommandHeatCost(commandId) {
  return COMMAND_HEAT_COSTS[commandId] ?? 8;
}

function getCommandBwCost(commandId) {
  return COMMAND_BW_COSTS[commandId] ?? 0;
}

function getTerminalHeatStateLabel() {
  if (!G.terminalRuntime) {
    return 'NORMAL';
  }

  const runtime = G.terminalRuntime;
  if (performance.now() < (runtime.crashUntil || 0)) {
    return 'CRASH';
  }
  if (runtime.overheatMode) {
    return 'OVERHEAT';
  }
  return 'NORMAL';
}

function updateTerminalHeatState(dt) {
  if (!G.terminalRuntime) {
    return;
  }

  const runtime = G.terminalRuntime;
  const now = performance.now();
  const crashing = now < (runtime.crashUntil || 0);
  const heatDecayPerSec = runtime.overheatMode ? TERMINAL_HEAT_OVERHEAT_DECAY_PER_SEC : TERMINAL_HEAT_DECAY_PER_SEC;
  const linkedPenalty = runtime.connectedTargetId ? 1.35 : 1;
  const decayAmount = (dt / 1000) * heatDecayPerSec * linkedPenalty;

  if (!crashing) {
    runtime.heat = Math.max(0, (runtime.heat || 0) - decayAmount);
  }

  if (!crashing && runtime.overheatMode && (runtime.heat || 0) <= TERMINAL_HEAT_RECOVER_THRESHOLD) {
    runtime.overheatMode = false;
    runtime.networkStatus = 'DORMANT';
    runtime.responseDelayMs = Math.max(0, (runtime.responseDelayMs || 0) - 40);
    pushTerminalLine('thermal load normalized.', 'sys');
  }

  if (!crashing && runtime.networkStatus === 'CRASH') {
    runtime.networkStatus = runtime.overheatMode ? 'OVERHEAT' : 'DORMANT';
  }

  if (crashing) {
    runtime.networkStatus = 'CRASH';
    runtime.responseDelayMs = Math.max(runtime.responseDelayMs || 0, 320);
  } else if (runtime.overheatMode && runtime.networkStatus === 'DORMANT') {
    runtime.networkStatus = 'OVERHEAT';
  }

  if (!crashing && (runtime.heat || 0) <= 5 && runtime.overheatMode) {
    runtime.overheatMode = false;
  }

  if (runtime.heat <= 0 && runtime.networkStatus === 'OVERHEAT') {
    runtime.networkStatus = 'DORMANT';
  }
}

function runAutoConnectGuard(guardId) {
  const guard = byType('guard').find((g) => g.id === guardId && !g.dead);

  if (!guard) {
    pushTerminalLine('cel nie odpowiada — sygnal utracony', 'bad');
    return;
  }

  G.terminalRuntime.connectedTargetId = guard.id;
  G.terminalRuntime.connectedTargetType = 'guard';
  G.terminalRuntime.connectedTargetLabel = guard.desc || guardId;

  pushTerminalLine(`uplink nawiazany -> ${guardId} [GUARD]`, 'ok');
  pushTerminalLine(`podlaczono: ${guard.desc || guardId}`, 'sys');
  pushTerminalLine('dostepne hacki: blind | cripple | ddos | slow | crash', 'dim');
}

function ensureTerminalDirectives() {
  if (!G.terminalRuntime) {
    return;
  }

  if (!G.terminalRuntime.archetypeId) {
    G.terminalRuntime.archetypeId = 'balanced';
  }

  const shouldPickArchetype =
    !G.terminalRuntime.archetypeName ||
    !G.terminalRuntime.economy ||
    G.terminalRuntime.archetypeId === 'balanced';

  if (shouldPickArchetype) {
    const weights = [
      { id: 'balanced', w: 36 },
      { id: 'cold_mesh', w: 24 },
      { id: 'noisy_backbone', w: 24 },
      { id: 'brittle_ice', w: 16 },
    ];

    const roll = Math.random() * weights.reduce((sum, item) => sum + item.w, 0);
    let acc = 0;
    let pickedId = 'balanced';
    for (const item of weights) {
      acc += item.w;
      if (roll <= acc) {
        pickedId = item.id;
        break;
      }
    }

    const picked = TERMINAL_ARCHETYPES.find((item) => item.id === pickedId) || TERMINAL_ARCHETYPES[0];
    G.terminalRuntime.archetypeId = picked.id;
    G.terminalRuntime.archetypeName = picked.name;
    G.terminalRuntime.economy = { ...picked.economy };
  }

  const meta = G.terminalRuntime.metaObjective;
  if (!meta || !meta.id || meta.id === 'none') {
    const picked = META_OBJECTIVES[(Math.random() * META_OBJECTIVES.length) | 0] || META_OBJECTIVES[0];
    G.terminalRuntime.metaObjective = {
      id: picked.id,
      title: picked.title,
      desc: picked.desc,
      target: picked.target,
      progress: 0,
      rewardCredits: picked.rewardCredits,
      rewardType: picked.rewardType,
      completed: false,
      matches: [...picked.matches],
    };
  }
}

function emitTerminalDirectiveBootLine() {
  const runtime = G.terminalRuntime;
  if (!runtime || runtime.systemDirectiveShown) {
    return;
  }

  const eco = runtime.economy || {};
  const heatPct = Math.round(((eco.heatMult || 1) - 1) * 100);
  const tracePct = Math.round(((eco.traceMult || 1) - 1) * 100);
  const latency = Math.round(eco.latencyMs || 0);
  pushTerminalLine(`node archetype: ${runtime.archetypeName}`, 'sys');
  pushTerminalLine(
    `economy profile -> heat ${heatPct >= 0 ? '+' : ''}${heatPct}% | trace ${tracePct >= 0 ? '+' : ''}${tracePct}% | latency ${latency >= 0 ? '+' : ''}${latency}ms`,
    'dim',
  );

  const meta = runtime.metaObjective;
  if (meta && !meta.completed) {
    pushTerminalLine(`${meta.title} (${meta.progress}/${meta.target})`, 'ok');
    pushTerminalLine(`${meta.desc} reward: ¥${meta.rewardCredits}`, 'dim');
  }

  runtime.systemDirectiveShown = true;
}

function pushCommandTelemetryLine(commandId, telemetry) {
  if (!G.terminalRuntime) {
    return;
  }

  const snapshot = {
    commandId,
    heat: telemetry.heat,
    trace: telemetry.trace,
    bw: telemetry.bw,
    latency: telemetry.latency,
    at: performance.now(),
  };
  G.terminalRuntime.telemetryLast = snapshot;
  pushTerminalLine(
    `telemetry >> ${commandId} | heat +${snapshot.heat} | trace +${snapshot.trace.toFixed(1)} | bw -${snapshot.bw} | eta ${Math.ceil(snapshot.latency)}ms`,
    'dim',
  );
}

function trackMetaObjectiveProgress(commandId) {
  if (!G.terminalRuntime) {
    return;
  }

  const meta = G.terminalRuntime.metaObjective;
  if (!meta || meta.completed || !Array.isArray(meta.matches)) {
    return;
  }

  if (!meta.matches.includes(commandId)) {
    return;
  }

  meta.progress = Math.min(meta.target, (meta.progress || 0) + 1);
  pushTerminalLine(`${meta.title} progress ${meta.progress}/${meta.target}`, 'sys');

  if (meta.progress < meta.target) {
    return;
  }

  meta.completed = true;
  const rewardMult = G.terminalRuntime?.economy?.rewardMult || 1;
  const creditsReward = Math.round((meta.rewardCredits || 0) * rewardMult);
  if (G.P) {
    G.P.cr += creditsReward;
  }

  if (meta.rewardType === 'trace') {
    softenTrace(12);
  } else if (meta.rewardType === 'bandwidth' && G.P) {
    G.P.bw = Math.min(G.P.mbw, G.P.bw + 16);
  }

  refreshHUD();
  pushTerminalLine(`${meta.title} complete. reward issued: ¥${creditsReward}`, 'ok');
}

function applyAICounterreaction(commandId, target) {
  if (!G.terminalRuntime) {
    return;
  }

  const director = G.terminalRuntime.aiDirector || {
    streakId: '',
    streakCount: 0,
    lastCommandAt: 0,
    cameraOps: 0,
    breachOps: 0,
    counterLevel: 0,
    lastCounterAt: 0,
  };

  const now = performance.now();
  if (director.streakId === commandId && now - (director.lastCommandAt || 0) < 12000) {
    director.streakCount += 1;
  } else {
    director.streakId = commandId;
    director.streakCount = 1;
  }
  director.lastCommandAt = now;

  if (commandId === 'feed_blind' || commandId === 'feed_loop') {
    director.cameraOps += 1;
  }

  if (commandId === 'breach_firewall' || commandId === 'dump_creds' || commandId === 'source') {
    director.breachOps += 1;
  }

  const cooldown = now - (director.lastCounterAt || 0);
  if (director.streakCount >= 3 && cooldown > 7000) {
    director.counterLevel += 1;
    director.lastCounterAt = now;
    G.terminalRuntime.responseDelayMs = Math.min(460, (G.terminalRuntime.responseDelayMs || 0) + 45);
    addTerminalHeat(5, 'ai-adapt-repeat');
    addTrace(2.1, 'ai-adapt-repeat');
    pushTerminalLine('AI countermeasure: adaptive parser hardening engaged.', 'warn');
  }

  if (director.cameraOps >= 2 && cooldown > 9000) {
    director.counterLevel += 1;
    director.cameraOps = 0;
    director.lastCounterAt = now;
    addTrace(3.2, 'ai-cam-response');
    G.alert = clamp((G.alert || 0) + 6, 0, 100);

    const hackedCamera = byType('cam').find((cam) => cam.hacked);
    const tech = byType('tech').find((item) => !item.dead && item.state === 'patrol');
    if (hackedCamera && tech) {
      tech.state = 'repair';
      tech.targetId = hackedCamera.id;
      tech.repairTimer = 0;
      tech.repairDuration = 0;
    }

    pushTerminalLine('AI countermeasure: camera anomaly escalation -> technician dispatch.', 'warn');
  }

  if (director.breachOps >= 2 && cooldown > 9000) {
    director.counterLevel += 1;
    director.breachOps = 0;
    director.lastCounterAt = now;
    addTrace(2.7, 'ai-breach-response');
    G.terminalRuntime.scrambleUntil = Math.max(G.terminalRuntime.scrambleUntil || 0, now + 7000);
    G.terminalRuntime.falseOutputUntil = Math.max(G.terminalRuntime.falseOutputUntil || 0, now + 5000);
    G.terminalRuntime.responseDelayMs = Math.min(500, (G.terminalRuntime.responseDelayMs || 0) + 60);
    pushTerminalLine('AI countermeasure: ICE reinforcement pushed to active link.', 'warn');
  }

  G.terminalRuntime.aiDirector = director;

  if (target?.type === 'sterm' && director.counterLevel >= 4) {
    G.alert = clamp((G.alert || 0) + 2, 0, 100);
  }
}

function runQuickHackOnTarget(hackId, target) {
  if (!target || (target.type !== 'guard' && target.type !== 'drone' && target.type !== 'tech')) {
    pushTerminalLine('quickhack wymaga polaczenia z celem (guard/drone/tech)', 'warn');
    return;
  }

  const ref = target.ref;
  if (!ref || ref.dead || ref.offline) {
    pushTerminalLine('cel offline — brak sygnalu', 'warn');
    return;
  }

  if (hackId === 'blind') {
    ref.opticsOfflineT = 10000;
    if (ref.state === 'chase') {
      ref.state = 'search';
      ref.detect = 0;
      ref.searchTimer = 0;
      ref.lastSeen = null;
    }
    pushTerminalLine(`BLIND >> ${target.id} | optyka wylaczona (10s)`, 'ok');
  } else if (hackId === 'cripple') {
    ref.motoricsResetT = 10000;
    pushTerminalLine(`CRIPPLE >> ${target.id} | motoryka zablokowana (10s)`, 'ok');
  } else if (hackId === 'slow') {
    ref.motoricsResetT = Math.max(ref.motoricsResetT || 0, 8000);
    ref.state = 'search';
    ref.detect = 0;
    ref.searchTimer = 0;
    ref.lastSeen = null;
    pushTerminalLine(`SLOW >> ${target.id} | cel gubi trop`, 'ok');
  } else if (hackId === 'crash') {
    ref.motoricsResetT = Math.max(ref.motoricsResetT || 0, 13000);
    ref.stunT = Math.max(ref.stunT || 0, 1800);
    pushTerminalLine(`CRASH >> ${target.id} | system przeciazony (13s)`, 'ok');
  } else if (hackId === 'ddos') {
    ref.dead = true;
    ref.offline = true;
    ref.bodyReported = true;
    pushTerminalLine(`DDOS >> ${target.id} | pakiety wyslane...`, 'warn');
    pushTerminalLine('', 'sys');
    pushTerminalLine('CONNECTION LOST — cel wyeliminowany z sieci', 'bad');
    G.terminalRuntime.connectedTargetId = null;
    G.terminalRuntime.connectedTargetType = null;
    G.terminalRuntime.connectedTargetLabel = 'NONE';
    if (G.quickHackWindow?.active) {
      G.quickHackWindow.active = false;
      if (G.dom.detectPanel) G.dom.detectPanel.style.display = 'none';
    }
    rebuildList();
    return;
  }

  // Nie-lethal: zamknij okno detekcji ale zostaw terminal
  if (G.quickHackWindow?.active) {
    G.quickHackWindow.active = false;
    if (G.dom.detectPanel) G.dom.detectPanel.style.display = 'none';
    pushTerminalLine('--- okno awaryjne zamkniete ---', 'dim');
  }

  rebuildList();
}

export function openDetectionTerminal(guardId) {
  if (!G.terminalRuntime) {
    return;
  }

  // Otwórz overlay jeśli nie jest otwarty
  if (!G.terminalRuntime.open) {
    G.terminalRuntime.open = true;
    clearMovementKeys();
    if (G.dom.terminalOverlay) {
      G.dom.terminalOverlay.classList.add('show');
    }
  }

  // Pokaż pasek detekcji
  if (G.dom.detectPanel) {
    G.dom.detectPanel.style.display = 'flex';
  }
  if (G.dom.detectTimerFill) {
    G.dom.detectTimerFill.style.width = '100%';
  }

  if (G.dom.terminalInput) {
    G.dom.terminalInput.focus();
  }

  pushTerminalLine('', 'sys');
  pushTerminalLine('!! ALERT !! WYKRYTO OBECNOSC OPERATORA !!', 'bad');
  pushTerminalLine(`namierzono zrodlo: ${guardId}`, 'warn');
  pushTerminalLine('inicjalizacja polaczenia awaryjnego...', 'dim');

  // Auto-connect z opóźnieniem — animacja wgrywania
  G.terminalRuntime.pendingCommand = {
    commandId: 'auto_connect_guard',
    args: [guardId],
    raw: `>> auto-connect ${guardId}`,
    target: null,
    remainingMs: 900,
    scrambled: false,
  };

  // Blokuj input przez czas auto-connect
  G.terminalRuntime.commandCooldownMs = 900;

  syncTerminalOverlay();
}

export function closeDetectionTerminal() {
  if (G.dom.detectPanel) {
    G.dom.detectPanel.style.display = 'none';
  }
  if (G.dom.detectTimerFill) {
    G.dom.detectTimerFill.style.width = '100%';
  }

  // Rozłącz od strażnika, zostaw terminal otwarty
  if (G.terminalRuntime?.connectedTargetType === 'guard') {
    pushTerminalLine('--- polaczenie awaryjne zamkniete ---', 'sys');
    G.terminalRuntime.connectedTargetId = null;
    G.terminalRuntime.connectedTargetType = null;
    G.terminalRuntime.connectedTargetLabel = 'NONE';
  }
}
