function createTerminalRuntimeState() {
  return {
    open: false,
    inputBuffer: '',
    suggestion: '',
    history: [],
    historyCursor: -1,
    outputLines: [],
    renderedOutputCount: 0,
    renderedOutputRevision: 0,
    outputRevision: 0,
    tutorialShown: false,
    scanHighlights: [],
    connectedTargetId: null,
    connectedTargetType: null,
    connectedTargetLabel: 'NONE',
    pendingCommand: null,
    activeHacks: [],
    commandCooldownMs: 0,
    systemLogTickMs: 0,
    networkStatus: 'DORMANT',
    responseDelayMs: 0,
    scrambleUntil: 0,
    falseOutputUntil: 0,
    heat: 0,
    heatMax: 100,
    heatOverheatThreshold: 72,
    heatCrashThreshold: 96,
    overheatMode: false,
    crashUntil: 0,
    lastHeatSource: 'none',
  };
}

function createTraceRuntimeState() {
  return {
    value: 0,
    velocity: 0,
    tier: 0,
    risk: 0,
    passivePerSec: 1.8,
    decayPerSec: 3.1,
    maskUntil: 0,
    ghostUntil: 0,
    lastSource: 'none',
    lastSpike: 0,
    lastEscalationAt: 0,
  };
}

function createTutorialState() {
  return {
    active: false,
    step: 0,
    completed: false,
    spawn: null,
    lastCommandId: null,
    lastCommandTopic: null,
    lastCommandArgs: [],
    lastStepAt: 0,
  };
}

export const G = {
  canvas: null,
  ctx: null,
  dom: {},
  keys: {},
  logBuf: [],
  ctxOpen: false,
  audio: null,
  audioEnabled: true,
  musicEnabled: true,
  menuActive: true,
  paused: false,
  breachActive: false,
  breachFailed: false,

  wave: 1,
  tick: 0,
  alert: 0,
  blackout: false,
  boT: 0,
  hackingMain: false,
  hackProgress: 0,
  hackSpeedBonus: 0,
  missionPhase: 0,
  terminalRuntime: createTerminalRuntimeState(),
  traceRuntime: createTraceRuntimeState(),
  tutorial: createTutorialState(),
  floor: 1,
  floorCount: 1,
  cleared: false,
  dead: false,
  succeeded: false,
  mainHacked: false,

  tiles: [],
  rooms: [],
  devices: [],

  entrance: null,
  mainTerminal: null,
  sideTerminals: [],
  wallTerminals: [],
  doors: [],
  sideHacked: [],
  doorPreview: [],
  doorPreviewSource: null,
  techDisabled: false,
  cameraAlertTimer: 0,
  quickHacks: {
    optics: 1,
    motorics: 1,
    neural: 0,
    ddos: 0,
    ghostmesh: 0,
    silencer: 0,
    lagspike: 0,
    mirrorloop: 0,
  },
  quickHackCatalogOwned: {
    optics: true,
    motorics: true,
    neural: false,
    ddos: false,
    ghostmesh: false,
    silencer: false,
    lagspike: false,
    mirrorloop: false,
  },
  quickHackLoadout: ['optics', 'motorics', 'neural', 'ddos'],
  breachActionCatalogOwned: {
    crack: true,
    suppress: true,
    worm: true,
    overload: true,
    core: true,
    jammer: false,
    shred: false,
    sandbox: false,
    cacheburst: false,
  },
  breachActionLoadout: ['crack', 'suppress', 'worm', 'overload'],
  quickHackWindow: {
    active: false,
    targetGuardId: null,
    timerMs: 0,
    durationMs: 0,
  },
  neuralOverloadT: 0,

  hackLevels: {
    crack: 1,
    suppress: 1,
    worm: 1,
    overload: 1,
    core: 1,
  },
  hackUpgradeCosts: {
    crack: { base: 400, perLevel: 200 },
    suppress: { base: 500, perLevel: 250 },
    worm: { base: 450, perLevel: 225 },
    overload: { base: 550, perLevel: 275 },
    core: { base: 600, perLevel: 300 },
  },

  hub: {
    tab: 'plan',
    notoriety: 0,
    activeRuns: [],
    currentRunId: null,
    runSerial: 1,
    contacts: [],
    crew: [],
    contactSerial: 1,
    lastContactDropId: null,
    selectedOperatorId: null,
    activeOperatorId: null,
    runResolved: false,
    dataFragments: {
      collected: [],            // array of fragment IDs that have been acquired
      userCategories: {},       // id → { category, subcategory }
      userConnections: {},      // id → [connected IDs]
      boardPositions: {},       // id → { x, y }
      userNotes: {},            // id → string
      paranoiaLevel: 0,         // 0–100
      probabilityUnlocked: false,
    },
  },

  cam: { x: 0, y: 0 },
  P: null,
  isHiding: false,
  desaturation: 0,

  visible: new Set(),
  explored: new Set(),
  seenDevices: new Set(),

  floors: [],
  code: null,
  codeFound: false,
  mainTerminalAuth: {
    requiredShards: 0,
    recoveredByNode: {},
    unlocked: true,
    passphrasePreview: null,
  },
  elevatorUnlocked: true,
  mainHackContactReward: null,
  mainHackFragmentReward: null,
  stairTransitionCooldownMs: 0,
  stairTransitionArmed: true,
  stairTransitionRequested: false,
  stairHintActive: false,
  hoverInfo: null,
  hoverScreen: { x: 0, y: 0 },
};

export function initWaveState({ wave, credits, map, devices }) {
  const spawn = map.rooms[0];
  const loadout = G.quickHackLoadout || ['optics', 'motorics', 'neural', 'ddos'];
  const allHackIds = ['optics', 'motorics', 'neural', 'ddos', 'ghostmesh', 'silencer', 'lagspike', 'mirrorloop'];

  Object.assign(G, {
    wave,
    tick: 0,
    alert: 0,
    blackout: false,
    boT: 0,
    hackingMain: false,
    hackProgress: 0,
    hackSpeedBonus: 0,
    missionPhase: 0,
    terminalRuntime: createTerminalRuntimeState(),
    traceRuntime: createTraceRuntimeState(),
    tutorial: createTutorialState(),
    floor: 1,
    floorCount: map.floorCount || 1,
    cleared: false,
    dead: false,
    succeeded: false,
    paused: false,
    breachActive: false,
    breachFailed: false,
    mainHacked: false,
    tiles: map.tiles,
    rooms: map.rooms,
    devices,
    visible: new Set(),
    explored: new Set(),
    seenDevices: new Set(),
    entrance: map.entrance,
    mainTerminal: map.mainTerminal,
    mainTerminalAuth: {
      requiredShards: 0,
      recoveredByNode: {},
      unlocked: true,
      passphrasePreview: null,
    },
    elevatorUnlocked: true,
    mainHackContactReward: null,
    mainHackFragmentReward: null,
    sideTerminals: map.sideTerminals,
    wallTerminals: map.wallTerminals || [],
    doors: map.doors || [],
    sideHacked: [],
    doorPreview: [],
    doorPreviewSource: null,
    techDisabled: false,
    cameraAlertTimer: 0,
    quickHacks: Object.fromEntries(allHackIds.map((id) => [id, loadout.includes(id) ? 2 : 0])),
    quickHackWindow: {
      active: false,
      targetGuardId: null,
      timerMs: 0,
      durationMs: 0,
    },
    neuralOverloadT: 0,
    stairTransitionCooldownMs: 0,
    stairTransitionArmed: true,
    stairTransitionRequested: false,
    stairHintActive: false,
    hoverInfo: null,
    hoverScreen: { x: 0, y: 0 },
    cam: { x: 0, y: 0 },
    P: {
      x: spawn.x + 2.5,
      y: spawn.y + 3.5,
      hp: 100,
      mhp: 100,
      bw: 100,
      mbw: 100,
      cr: credits,
    },
  });
}

export function initFloorState({ map, devices }) {
  const prev = G.P;

  Object.assign(G, {
    tick: 0,
    blackout: false,
    boT: 0,
    hackingMain: false,
    hackProgress: 0,
    missionPhase: 0,
    terminalRuntime: createTerminalRuntimeState(),
    traceRuntime: createTraceRuntimeState(),
    tutorial: createTutorialState(),
    paused: false,
    breachActive: false,
    breachFailed: false,
    mainHacked: false,
    tiles: map.tiles,
    rooms: map.rooms,
    devices,
    visible: new Set(),
    explored: new Set(),
    seenDevices: new Set(),
    entrance: map.entrance,
    mainTerminal: map.mainTerminal,
    mainTerminalAuth: G.mainTerminalAuth || {
      requiredShards: 0,
      recoveredByNode: {},
      unlocked: true,
      passphrasePreview: null,
    },
    elevatorUnlocked: typeof G.elevatorUnlocked === 'boolean' ? G.elevatorUnlocked : true,
    sideTerminals: map.sideTerminals,
    wallTerminals: map.wallTerminals || [],
    doors: map.doors || [],
    sideHacked: [],
    doorPreview: [],
    doorPreviewSource: null,
    techDisabled: false,
    cameraAlertTimer: 0,
    quickHackWindow: {
      active: false,
      targetGuardId: null,
      timerMs: 0,
      durationMs: 0,
    },
    neuralOverloadT: 0,
    stairTransitionCooldownMs: 0,
    stairTransitionArmed: true,
    stairTransitionRequested: false,
    stairHintActive: false,
    hoverInfo: null,
    hoverScreen: { x: 0, y: 0 },
    cam: { x: 0, y: 0 },
    P: {
      x: map.rooms[0].x + 2.5,
      y: map.rooms[0].y + 3.5,
      hp: prev.hp,
      mhp: prev.mhp,
      bw: Math.min(prev.mbw, prev.bw + 15),
      mbw: prev.mbw,
      cr: prev.cr,
    },
  });
}

export function byType(type) {
  return G.devices.filter((device) => device.type === type);
}

export function upgradeHack(hackId) {
  if (!G.hackLevels || !G.hackLevels[hackId]) {
    return { success: false, message: 'Invalid hack' };
  }

  const costs = G.hackUpgradeCosts[hackId];
  if (!costs) {
    return { success: false, message: 'No upgrade cost defined' };
  }

  const currentLevel = G.hackLevels[hackId];
  const upgradeCost = costs.base + (currentLevel - 1) * costs.perLevel;

  if (G.P.cr < upgradeCost) {
    return {
      success: false,
      message: `Need ¥${upgradeCost} credits. Have ¥${G.P.cr}`,
    };
  }

  G.P.cr -= upgradeCost;
  G.hackLevels[hackId] += 1;

  return {
    success: true,
    message: `${hackId.toUpperCase()} upgraded to level ${G.hackLevels[hackId]}!`,
    newLevel: G.hackLevels[hackId],
    newCost: costs.base + currentLevel * costs.perLevel,
  };
}
