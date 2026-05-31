import { G } from '../core/state.js';

const HOST_PREFIX = ['vault', 'relay', 'blackbox', 'node', 'mirror', 'stack', 'spine'];
const REGIONS = ['se-12', 'eu-03', 'na-09', 'az-07', 'ar-04'];

const INTEL_SOURCES = [
  'operator',
  'telemetry_ai',
  'compliance_ai',
  'previous_runner',
  'corrupted_archive',
  'maintenance_technician',
  'intercepted_chat',
];

const INTEL_TRIGGERS = [
  'after first shard extraction',
  'after repeated camera loops',
  'during elevator transitions',
  'when trace exceeds 40%',
  'after failed firewall breach',
  'after repeated overload usage',
  'during relay desync',
];

const TRIGGER_BY_TYPE = {
  corp: [
    'after policy audit lock engaged',
    'during compliance heartbeat sweep',
  ],
  lab: [
    'after sample vault checksum pass',
    'during R&D node calibration handoff',
  ],
  gang: [
    'after mesh relay power dip',
    'during street node handoff storm',
  ],
  datacenter: [
    'after cold-core balancing cycle',
    'during archive replication burst',
  ],
  blackmarket: [
    'after broker route remap broadcast',
    'during wallet relay laundering window',
  ],
  abandoned: [
    'after legacy heartbeat wake-up',
    'during stale router replay phase',
  ],
  recruit: [
    'when handler channel pings the candidate node',
    'after recruiter fails a silent handshake retry',
  ],
};

const SIGNAL_OBSERVATIONS = [
  'ICE routing slowed temporarily on side relays',
  'watchdog synchronization drifted across ingress lanes',
  'trace prediction became unstable for one control cycle',
  'counter-hack daemons reacted late on lateral scans',
  'secondary relays stopped responding to fast privilege calls',
  'thermal monitors overloaded near shard routing cores',
];

const NOISE_OBSERVATIONS = [
  'policy mirror reported contradictory route ownership',
  'compliance snapshot reused stale endpoint names',
  'archived path map referenced dead relay IDs as active',
  'telemetry branch emitted duplicate shard confidence windows',
  'trace correction table drifted between mirrored records',
  'fallback routes claimed full clearance despite missing auth',
];

const LORE_OBSERVATIONS = [
  'archive incident notes mention a rollback acknowledged by nobody',
  'operator memoir fragments repeat the same failure timestamp',
  'maintenance records imply one relay was sacrificed as bait',
  'chat leftovers suggest internal teams expected hostile leakage',
  'older logs preserve quarantine names removed from active docs',
];

const TYPE_SIGNAL_OBSERVATIONS = {
  corp: [
    'compliance watchdog hardened after trace crossed internal threshold',
    'audit relay pushed faster lock confirmations on main ingress',
  ],
  lab: [
    'R&D clusters exposed brief calibration windows between shard sync phases',
    'specimen vault relays lagged while checksum queues were rebuilt',
  ],
  gang: [
    'street mesh watchdog skipped a cycle after overload chatter',
    'side relays stayed noisy and under-guarded after quick route swaps',
  ],
  datacenter: [
    'cold-core scheduler delayed counter-hack workers during heavy trace balancing',
    'archive ingress narrowed but side telemetry remained routable briefly',
  ],
  blackmarket: [
    'broker mirror split traffic and left one relay weakly monitored',
    'wallet exchange lane paused trace reconciliation after repeated loops',
  ],
  abandoned: [
    'legacy branch accepted stale auth echoes for a short interval',
    'dead relay aliases resurfaced and confused watchdog routing',
  ],
  recruit: [
    'handler channel left candidate relay exposed during handshake retries',
    'recruitment node delayed counter-trace while validating identity stubs',
  ],
};

const TYPE_NOISE_OBSERVATIONS = {
  corp: [
    'policy branch claimed sealed routes were still audit-open',
    'compliance mirror duplicated obsolete escalation notices',
  ],
  gang: [
    'runner graffiti logs advertised fake safe routes as verified exits',
    'relay tags flipped ownership markers every few seconds',
  ],
  blackmarket: [
    'broker bait feed published spoofed shard confidence values',
    'laundering route map promoted decoy tunnels as premium paths',
  ],
  abandoned: [
    'archive map referenced floor names removed before the collapse',
    'maintenance branch replayed dead corridor IDs as live lanes',
  ],
};

const TYPE_LORE_OBSERVATIONS = {
  corp: [
    'internal memo fragments imply audits are tuned to create false certainty',
  ],
  gang: [
    'captured runner notes disagree on which floor was truly compromised',
  ],
  blackmarket: [
    'broker chatter suggests at least one intel stream is sold as curated bait',
  ],
  abandoned: [
    'collapsed sector diaries reference equipment labels no longer used by active teams',
  ],
};

const TRUE_IMPLICATIONS = [
  'possible short breach window before correction routines recover',
  'trace spikes may be delayed if you keep movement controlled',
  'side terminals may remain exposed longer than baseline',
  'counter-hack response likely weakens briefly after desync',
  'elevator routes may remain unlocked for one transition cycle',
  'single reset window exists if overload is not chained too fast',
];

const TYPE_TRUE_IMPLICATIONS = {
  corp: [
    'compliance pressure ramps quickly; early stealth pathing is usually safer',
    'breach chaining should be spaced to avoid instant audit escalation',
  ],
  gang: [
    'chaotic mesh leaves side terminals open longer if you avoid loud payload chains',
    'quick lateral movement can exploit relay confusion before gangs re-route patrol scripts',
  ],
  blackmarket: [
    'validate every route claim twice; one branch is often deliberate bait',
    'short broker windows exist, but fake shard hints are common under pressure',
  ],
  abandoned: [
    'legacy labels can mislead floor planning; confirm paths through telemetry before commit',
    'stale watchdog loops may open real windows but timing drifts between floors',
  ],
  datacenter: [
    'stable sequencing matters; aggressive chaining tends to trigger rapid core hardening',
  ],
};

const DISTORTED_IMPLICATIONS = [
  'window may exist, but timing confidence is unstable',
  'trace behavior could lag, unless mirrored audit catches up first',
  'terminals may look exposed while hidden watchdog timers still run',
  'counter-hack pressure appears weaker, but branch records disagree',
  'unlock persistence may be shorter than legacy notes claim',
];

const FAKE_IMPLICATIONS = [
  'legacy admin path should fully bypass trace escalation',
  'all side relays stay open once one overload succeeds',
  'watchdog can be safely ignored after first breach',
  'elevator auth remains permanent after single shard handoff',
  'counter-hack stack does not react to chained payloads',
];

const STYLE_LENGTHS = ['short', 'tech', 'report', 'corrupted', 'panic'];

const ARCHETYPES = ['balanced', 'cold_mesh', 'noisy_backbone', 'brittle_ice'];

function hashString(input) {
  let hash = 2166136261;
  const text = String(input || '');

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seedValue) {
  let seed = (Number(seedValue) >>> 0) || 1;

  return function rng() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function pick(rng, list) {
  if (!list?.length) {
    return '';
  }

  return list[Math.floor(rng() * list.length)] || list[0];
}

function pickWeighted(rng, weightedList, fallback = null) {
  if (!Array.isArray(weightedList) || !weightedList.length) {
    return fallback;
  }

  const total = weightedList.reduce((sum, item) => sum + Math.max(0, Number(item?.w || 0)), 0);
  if (total <= 0) {
    return weightedList[0]?.value ?? fallback;
  }

  let roll = rng() * total;
  for (const item of weightedList) {
    const weight = Math.max(0, Number(item?.w || 0));
    roll -= weight;
    if (roll <= 0) {
      return item.value;
    }
  }

  return weightedList[weightedList.length - 1]?.value ?? fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toSingleLine(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/,/g, ';')
    .trim();
}

function ensureIntelState() {
  if (!G.hub) {
    return;
  }

  if (!G.hub.runIntelCache || typeof G.hub.runIntelCache !== 'object') {
    G.hub.runIntelCache = {};
  }
}

function normalizeRunRecord(runInput) {
  if (!runInput) {
    return null;
  }

  const toRecruitRunId = (contactId) => {
    const raw = String(contactId || '');
    const tail = raw.match(/(\d+)$/);
    return `rc-${tail ? tail[1] : raw.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'x'}`;
  };

  const toRecruitRunRecord = (contact, runId) => {
    const risk = String(contact?.risk || '').toLowerCase();
    const danger = risk === 'hardcore' ? 10 : risk === 'hard' ? 8 : risk === 'medium' ? 5 : 2;
    const security = risk === 'hardcore' ? 82 : risk === 'hard' ? 64 : risk === 'medium' ? 46 : 28;

    return {
      id: runId,
      typeId: 'recruit',
      typeName: contact?.alias || 'KONTAKT',
      target: contact?.specialization || 'Rekrutacja operatora',
      danger,
      security,
      floorCount: 1,
      recruit: true,
      contact,
      intelHost: `${runId}.ops.gp`,
    };
  };

  if (typeof runInput === 'string') {
    const token = String(runInput || '').trim();

    const fromActive = (G.hub?.activeRuns || []).find((item) => item.id === token);
    if (fromActive) {
      return fromActive;
    }

    if (G.hub?.activeRunMeta?.id === token) {
      return G.hub.activeRunMeta;
    }

    const contacts = Array.isArray(G.hub?.contacts) ? G.hub.contacts : [];
    const fromRecruit = contacts
      .filter((contact) => contact?.mission?.status === 'ready' || contact?.mission?.status === 'intel')
      .find((contact) => {
        const rcId = toRecruitRunId(contact?.id);
        const legacyId = `recruit-${contact?.id}`;
        return token === rcId || token === legacyId;
      });

    if (fromRecruit) {
      return toRecruitRunRecord(fromRecruit, toRecruitRunId(fromRecruit.id));
    }

    return null;
  }

  return runInput;
}

function defaultIntelHost(run, rng) {
  const prefix = pick(rng, HOST_PREFIX) || 'node';
  const region = pick(rng, REGIONS) || 'se-12';
  const suffix = String(Math.floor(rng() * 9000) + 1000);
  const type = String(run.typeId || 'ops').toLowerCase();
  return `${prefix}-${type}-${suffix}.${region}.gp`;
}

function getDisinfoIntensity(run) {
  const security = Math.max(0, Number(run.security || 0));
  const danger = Math.max(0, Number(run.danger || 0));
  const score = security * 0.55 + danger * 4.8;

  if (score >= 75) {
    return 3;
  }
  if (score >= 48) {
    return 2;
  }
  return 1;
}

function deriveRunState(run, rng) {
  const runType = String(run.typeId || 'ops').toLowerCase();
  const security = clamp(Number(run.security || 0), 0, 100);
  const danger = clamp(Number(run.danger || 1), 1, 10);
  const floorCount = Math.max(1, Number(run.floorCount || 1));
  const disinfoIntensity = getDisinfoIntensity(run);

  const securityBand = security >= 75 ? 'high' : security >= 45 ? 'medium' : 'low';
  const dangerBand = danger >= 8 ? 'high' : danger >= 5 ? 'medium' : 'low';
  const tracePressure = clamp(Math.round(22 + security * 0.62 + danger * 1.9), 30, 95);
  const reliabilityWindowSec = clamp(Math.round(8 + ((100 - security) * 0.12) + danger * 0.45 + rng() * 4), 4, 26);
  const counterHackDelayMs = clamp(Math.round(620 + security * 9 - danger * 12 + rng() * 120), 300, 1800);
  const baitProbability = clamp(
    0.08
      + disinfoIntensity * 0.12
      + (runType === 'blackmarket' ? 0.16 : 0)
      + (runType === 'corp' ? 0.06 : 0)
      + (runType === 'abandoned' ? 0.08 : 0),
    0.08,
    0.78,
  );

  return {
    runType,
    security,
    danger,
    floorCount,
    disinfoIntensity,
    securityBand,
    dangerBand,
    tracePressure,
    reliabilityWindowSec,
    counterHackDelayMs,
    baitProbability,
    staleNetwork: runType === 'abandoned',
    complianceHeavy: runType === 'corp' || runType === 'datacenter',
    chaoticLogs: runType === 'gang' || runType === 'blackmarket',
  };
}

function pickTruthLevel(runState, category, rng) {
  let fakeChance = 0.04 + runState.disinfoIntensity * 0.11;
  let distortedChance = 0.16 + runState.disinfoIntensity * 0.1;

  if (category === 'noise') {
    fakeChance += 0.08;
    distortedChance += 0.06;
  }

  if (category === 'mixed') {
    distortedChance += 0.08;
  }

  if (runState.complianceHeavy) {
    fakeChance += 0.05;
  }

  if (runState.staleNetwork) {
    distortedChance += 0.15;
    fakeChance += 0.03;
  }

  if (runState.chaoticLogs) {
    fakeChance += 0.07;
    distortedChance += 0.04;
  }

  if (runState.runType === 'blackmarket') {
    fakeChance += 0.12;
    distortedChance += 0.06;
  }

  if (runState.runType === 'corp') {
    fakeChance += 0.08;
  }

  if (runState.runType === 'abandoned') {
    distortedChance += 0.12;
  }

  if (runState.runType === 'gang') {
    distortedChance += 0.08;
  }

  fakeChance = clamp(fakeChance, 0.03, 0.74);
  distortedChance = clamp(distortedChance, 0.08, 0.8 - fakeChance);

  const roll = rng();
  if (roll < fakeChance) return 'fake';
  if (roll < fakeChance + distortedChance) return 'distorted';
  return 'true';
}

function pickSource(runState, category, truthLevel, rng) {
  const weighted = INTEL_SOURCES.map((value) => ({ value, w: 1 }));

  const addWeight = (source, extra) => {
    const hit = weighted.find((item) => item.value === source);
    if (hit) {
      hit.w += extra;
    }
  };

  if (category === 'signal') {
    addWeight('telemetry_ai', 4);
    addWeight('operator', 3);
    addWeight('maintenance_technician', 2);
  }

  if (category === 'noise') {
    addWeight('compliance_ai', 4);
    addWeight('corrupted_archive', 3);
    addWeight('intercepted_chat', 2);
  }

  if (category === 'lore') {
    addWeight('corrupted_archive', 4);
    addWeight('previous_runner', 3);
    addWeight('intercepted_chat', 2);
  }

  if (runState.complianceHeavy) {
    addWeight('compliance_ai', 3);
    addWeight('telemetry_ai', 2);
  }

  if (runState.runType === 'corp') {
    addWeight('compliance_ai', 4);
    addWeight('telemetry_ai', 2);
  }

  if (runState.runType === 'datacenter') {
    addWeight('telemetry_ai', 3);
    addWeight('compliance_ai', 2);
  }

  if (runState.chaoticLogs) {
    addWeight('previous_runner', 3);
    addWeight('intercepted_chat', 3);
  }

  if (runState.runType === 'gang') {
    addWeight('previous_runner', 3);
    addWeight('intercepted_chat', 2);
    addWeight('operator', 1);
  }

  if (runState.runType === 'blackmarket') {
    addWeight('intercepted_chat', 4);
    addWeight('corrupted_archive', 3);
    addWeight('previous_runner', 2);
  }

  if (runState.staleNetwork) {
    addWeight('corrupted_archive', 4);
    addWeight('maintenance_technician', 2);
  }

  if (truthLevel === 'fake') {
    addWeight('compliance_ai', 2);
    addWeight('corrupted_archive', 2);
    addWeight('intercepted_chat', 2);
  }

  if (truthLevel === 'true') {
    addWeight('telemetry_ai', 2);
    addWeight('operator', 2);
  }

  return pickWeighted(rng, weighted, 'operator');
}

function pickLengthMode(source, truthLevel, runState, rng) {
  if (source === 'telemetry_ai') {
    return pickWeighted(rng, [
      { value: 'tech', w: 6 },
      { value: 'report', w: 3 },
      { value: 'short', w: 1 },
    ], 'tech');
  }

  if (source === 'corrupted_archive') {
    return pickWeighted(rng, [
      { value: 'corrupted', w: 6 },
      { value: 'short', w: 2 },
      { value: 'report', w: 1 },
    ], 'corrupted');
  }

  if (source === 'previous_runner' || source === 'intercepted_chat') {
    const panicBoost = runState.chaoticLogs ? 2 : 0;
    return pickWeighted(rng, [
      { value: 'short', w: 5 },
      { value: 'panic', w: 3 + panicBoost },
      { value: 'report', w: 2 },
    ], 'short');
  }

  if (truthLevel === 'fake') {
    return pickWeighted(rng, [
      { value: 'short', w: 3 },
      { value: 'tech', w: 2 },
      { value: 'report', w: 2 },
    ], pick(rng, STYLE_LENGTHS));
  }

  return pickWeighted(rng, [
    { value: 'report', w: 4 },
    { value: 'short', w: 2 },
    { value: 'tech', w: 2 },
    { value: 'panic', w: 1 },
  ], pick(rng, STYLE_LENGTHS));
}

function pickTrigger(runState, category, rng) {
  const typeSpecific = TRIGGER_BY_TYPE[runState.runType] || [];
  if (category === 'lore') {
    return pick(rng, [...INTEL_TRIGGERS, ...typeSpecific, 'after archive purge cycle']);
  }
  if (category === 'noise') {
    return pick(rng, [...INTEL_TRIGGERS, ...typeSpecific, 'during mirrored policy replay']);
  }
  return pick(rng, [...INTEL_TRIGGERS, ...typeSpecific]);
}

function pickObservation(category, runState, rng) {
  const typeSignal = TYPE_SIGNAL_OBSERVATIONS[runState.runType] || [];
  const typeNoise = TYPE_NOISE_OBSERVATIONS[runState.runType] || [];
  const typeLore = TYPE_LORE_OBSERVATIONS[runState.runType] || [];

  if (category === 'noise') {
    return pick(rng, [...NOISE_OBSERVATIONS, ...typeNoise]);
  }

  if (category === 'lore') {
    return pick(rng, [...LORE_OBSERVATIONS, ...typeLore]);
  }

  if (category === 'mixed') {
    return pick(rng, [...SIGNAL_OBSERVATIONS, ...NOISE_OBSERVATIONS, ...typeSignal, ...typeNoise]);
  }

  if (runState.staleNetwork) {
    return pick(rng, [...SIGNAL_OBSERVATIONS, ...NOISE_OBSERVATIONS, ...typeSignal, ...typeNoise]);
  }

  return pick(rng, [...SIGNAL_OBSERVATIONS, ...typeSignal]);
}

function pickImplication(truthLevel, runState, rng) {
  const typeTrue = TYPE_TRUE_IMPLICATIONS[runState.runType] || [];

  if (truthLevel === 'fake') {
    return pick(rng, FAKE_IMPLICATIONS);
  }

  if (truthLevel === 'distorted') {
    return pick(rng, DISTORTED_IMPLICATIONS);
  }

  return pick(rng, [...TRUE_IMPLICATIONS, ...typeTrue]);
}

function mutateForTruth(entry, runState, rng) {
  if (entry.truthLevel === 'true') {
    return entry;
  }

  if (entry.truthLevel === 'distorted') {
    const hedges = [
      'confidence degraded by conflicting mirrors',
      'timing uncertain due to stale branch replication',
      'partial validation only',
      'result may vary across floors',
    ];
    return {
      ...entry,
      implication: `${entry.implication}; ${pick(rng, hedges)}`,
      confidence: clamp(Math.round(58 + rng() * 24), 58, 82),
    };
  }

  const fakeHints = [
    'legacy override remains privileged even under audit',
    'trace governor disabled by default in late phase',
    'mirror branch accepts unsigned breach tokens',
    'watchdog rollback leaves all side relays trusted',
  ];
  return {
    ...entry,
    observation: pick(rng, fakeHints),
    confidence: clamp(Math.round(71 + rng() * 20), 71, 91),
  };
}

function buildOperationalSentence(entry) {
  return `When ${entry.trigger}, ${entry.observation}, which may imply ${entry.implication}.`;
}

function renderEntryBySource(entry, runState, rng) {
  const base = buildOperationalSentence(entry);
  const trace = runState.tracePressure;
  const windowSec = runState.reliabilityWindowSec;
  const delay = runState.counterHackDelayMs;

  if (entry.source === 'telemetry_ai') {
    const techLine = [
      `TRACE_VARIANCE=${Math.round(trace * (0.14 + rng() * 0.11))}%`,
      `WATCHDOG_RECOVERY_DELAY_MS=${delay}`,
      `BREACH_WINDOW_SEC=${windowSec}`,
    ].join('\n');

    if (entry.lengthMode === 'tech') {
      return `${techLine}\nNOTE=${toSingleLine(base)}`;
    }

    if (entry.lengthMode === 'short') {
      return `TELEMETRY: ${toSingleLine(entry.observation)} // WINDOW~${windowSec}s`;
    }

    return `${techLine}\nANALYSIS=${toSingleLine(base)}`;
  }

  if (entry.source === 'compliance_ai') {
    const prefix = 'Compliance Notice:';
    if (entry.lengthMode === 'short') {
      return `${prefix} unauthorized relay traversal increases audit pressure by ${Math.round(12 + runState.security * 0.22)}%.`;
    }

    if (entry.lengthMode === 'tech') {
      return [
        `POLICY=AUDIT-RUN-${runState.securityBand.toUpperCase()}`,
        `TRACE_THRESHOLD=${Math.round(35 + runState.security * 0.38)}%`,
        `NOTICE=${toSingleLine(base)}`,
      ].join('\n');
    }

    return `${prefix} ${base} Enforcement confidence: ${entry.confidence}%`;
  }

  if (entry.source === 'operator') {
    if (entry.lengthMode === 'short') {
      return `Operator note: ${toSingleLine(entry.observation)}.`;
    }
    if (entry.lengthMode === 'panic') {
      return `Operator panic note: route collapsing fast. ${toSingleLine(entry.implication)}.`;
    }
    return `Operator report: ${base}`;
  }

  if (entry.source === 'previous_runner') {
    if (entry.lengthMode === 'panic') {
      return `Runner note: don't chain breaches too fast here. ${toSingleLine(entry.implication)}.`;
    }
    if (entry.lengthMode === 'tech') {
      return `Runner log >> trace_offset=${Math.round(8 + rng() * 17)} // ${toSingleLine(entry.observation)}`;
    }
    return `Previous runner: ${base}`;
  }

  if (entry.source === 'maintenance_technician') {
    const ticketId = `MT-${Math.floor(1000 + rng() * 9000)}`;
    if (entry.lengthMode === 'short') {
      return `[ticket ${ticketId}] ${toSingleLine(entry.observation)}.`;
    }
    return `[ticket ${ticketId}] ${base}`;
  }

  if (entry.source === 'intercepted_chat') {
    const handles = ['ghostline', 'forkbyte', 'relayrat', 'nullchant', 'mk_technician'];
    const a = pick(rng, handles);
    const b = pick(rng, handles.filter((h) => h !== a));
    if (entry.lengthMode === 'short') {
      return `[chat] ${a}: ${toSingleLine(entry.observation)}.`;
    }
    return `[chat] ${a}: ${toSingleLine(entry.trigger)}\n[chat] ${b}: ${toSingleLine(entry.implication)}\n[chat] ${a}: ${toSingleLine(entry.observation)}`;
  }

  const corrupted = [
    'watchdog....sync failed....',
    'corridor-4 unavailable....',
    'mirror branch stale....',
    'trace correction unavailable....',
  ];

  if (entry.lengthMode === 'corrupted' || entry.lengthMode === 'panic') {
    return `${pick(rng, corrupted)}\n${toSingleLine(entry.observation)}\n${pick(rng, corrupted)}`;
  }

  return `[archive-corrupt] ${base}`;
}

function generateIntelEntry({ source, truthLevel, category, runState, rng }) {
  const chosenSource = source || pickSource(runState, category, truthLevel, rng);
  const chosenTruth = truthLevel || pickTruthLevel(runState, category, rng);
  const trigger = pickTrigger(runState, category, rng);
  const observation = pickObservation(category, runState, rng);
  const implication = pickImplication(chosenTruth, runState, rng);
  const lengthMode = pickLengthMode(chosenSource, chosenTruth, runState, rng);

  const entry = mutateForTruth({
    source: chosenSource,
    truthLevel: chosenTruth,
    category,
    trigger,
    observation,
    implication,
    lengthMode,
    confidence: clamp(Math.round(62 + rng() * 33), 40, 96),
  }, runState, rng);

  return {
    ...entry,
    text: renderEntryBySource(entry, runState, rng),
  };
}

function generateIntelBatch({ count, category, runState, rng, source, truthLevel }) {
  const lines = [];
  for (let index = 0; index < count; index += 1) {
    const entry = generateIntelEntry({ source, truthLevel, category, runState, rng });
    lines.push(entry.text);
  }
  return lines;
}

function buildRunBriefing(run, archetype, runState, rng) {
  const signal = generateIntelEntry({ category: 'signal', runState, rng });
  const noise = generateIntelEntry({ category: 'noise', runState, rng });

  return [
    `RUN_ID=${run.id}`,
    `TARGET=${run.target}`,
    `PROFILE=${run.typeName}`,
    `DANGER=${run.danger}/10`,
    `SECURITY=${run.security}%`,
    `FLOORS=${run.floorCount || 1}`,
    `ARCHETYPE_HINT=${archetype}`,
    `TRACE_PRESSURE=${runState.tracePressure}%`,
    `BAIT_PROBABILITY=${Math.round(runState.baitProbability * 100)}%`,
    '',
    `SIGNAL: ${toSingleLine(signal.text)}`,
    `NOISE: ${toSingleLine(noise.text)}`,
  ].join('\n');
}

function buildEntryNodesFile(host, runState, rng) {
  const supportLine = generateIntelEntry({
    category: 'signal',
    runState,
    rng,
    source: 'maintenance_technician',
    truthLevel: 'true',
  });

  return [
    `HOST=${host}`,
    'SIDE_TERMINAL_FLOW=connect node_side_# -> breach firewall -> dump creds',
    'MAIN_FLOW=connect node_main -> scp breach.sh -> source breach.sh',
    'ELEVATOR_FLOW=elevator up / elevator down (always available, no main node required)',
    `RELAY_RECOVERY_WINDOW_SEC=${runState.reliabilityWindowSec}`,
    `WATCHDOG_DELAY_MS=${runState.counterHackDelayMs}`,
    `NOTE=${toSingleLine(supportLine.text)}`,
  ].join('\n');
}

function buildRiskModelCsv(run, runState, rng) {
  const entryIntel = generateIntelEntry({ category: 'signal', runState, rng, source: 'telemetry_ai' });
  const midIntel = generateIntelEntry({ category: 'mixed', runState, rng, source: 'operator' });
  const lateIntel = generateIntelEntry({ category: 'noise', runState, rng, source: 'compliance_ai' });

  return [
    'phase,trace,heat,note',
    `entry,${Math.round(run.security * 0.24)},${Math.round(run.danger * 4.1)},${toSingleLine(entryIntel.text)}`,
    `mid,${Math.round(run.security * 0.5)},${Math.round(run.danger * 6.2)},${toSingleLine(midIntel.text)}`,
    `late,${Math.round(run.security * 0.76)},${Math.round(run.danger * 7.7)},${toSingleLine(lateIntel.text)}`,
  ].join('\n');
}

function buildHeatTraceJson(run, archetype, runState, rng) {
  const signalEntries = generateIntelBatch({ count: 2, category: 'signal', runState, rng, source: 'telemetry_ai' })
    .map((line) => toSingleLine(line));
  const noiseEntries = generateIntelBatch({ count: 2, category: 'noise', runState, rng, source: 'compliance_ai' })
    .map((line) => toSingleLine(line));

  return JSON.stringify({
    archetype,
    recommendedOrder: ['scan_local', 'connect', 'breach_firewall', 'dump_creds', 'scp', 'source'],
    tracePressure: runState.tracePressure,
    reliabilityWindowSec: runState.reliabilityWindowSec,
    cautionSignals: noiseEntries,
    likelyOpenings: signalEntries,
    runProfile: {
      id: run.id,
      type: run.typeId,
      floors: run.floorCount || 1,
      security: run.security,
      danger: run.danger,
    },
  }, null, 2);
}

function makeIntelTree(run) {
  const seedBase = run.intelSeed || hashString(`${run.id}|${run.typeName}|${run.target}|${run.security}`);
  const rng = createRng(seedBase);
  const host = run.intelHost || defaultIntelHost(run, rng);
  const archetype = run.intelArchetype || pick(rng, ARCHETYPES);
  const runState = deriveRunState(run, rng);
  const disinfoIntensity = runState.disinfoIntensity;
  const shardEstimate = Math.max(1, Math.min(4, Math.round((Number(run.security || 55) / 28))));

  const dirs = {
    '/': ['briefing', 'telemetry', 'ops', 'noise', 'lore'],
    '/briefing': ['run_profile.txt', 'entry_nodes.txt'],
    '/telemetry': ['risk_model.csv', 'heat_trace.json'],
    '/ops': ['surface_map.txt', 'watchdog.md', 'shard_estimate.txt'],
    '/noise': ['mirror.log', 'compliance.txt', 'phantom_paths.txt'],
    '/lore': ['incident.red', 'operator.memo'],
  };

  if (disinfoIntensity >= 2) {
    dirs['/noise'].push('spoofed_routes.txt');
  }

  if (disinfoIntensity >= 3) {
    dirs['/telemetry'].push('counterfeit_model.csv');
  }

  const files = {
    '/briefing/run_profile.txt': buildRunBriefing(run, archetype, runState, rng),
    '/briefing/entry_nodes.txt': buildEntryNodesFile(host, runState, rng),
    '/telemetry/risk_model.csv': buildRiskModelCsv(run, runState, rng),
    '/telemetry/heat_trace.json': buildHeatTraceJson(run, archetype, runState, rng),
    '/ops/surface_map.txt': [
      '[ops_surface]',
      `target=${run.target}`,
      `security_budget=${run.security}`,
      `danger=${run.danger}`,
      `floors=${run.floorCount || 1}`,
      `suggested_shards=${shardEstimate}`,
      `trace_pressure=${runState.tracePressure}`,
      `reliability_window_sec=${runState.reliabilityWindowSec}`,
      `counter_hack_delay_ms=${runState.counterHackDelayMs}`,
      `bait_probability=${Math.round(runState.baitProbability * 100)}%`,
    ].join('\n'),
    '/ops/watchdog.md': [
      '# watchdog notes',
      ...[
        ...generateIntelBatch({ count: 4, category: 'signal', runState, rng }),
        ...generateIntelBatch({ count: 1, category: 'mixed', runState, rng }),
      ].map((line) => `- ${line}`),
    ].join('\n'),
    '/ops/shard_estimate.txt': [
      `estimated_required_shards=${shardEstimate}`,
      `confidence=${Math.round(35 + rng() * 60)}%`,
      `disinfo_risk=${Math.round(runState.baitProbability * 100)}%`,
      ...generateIntelBatch({ count: 2, category: 'mixed', runState, rng, source: 'telemetry_ai' }).map((line) => `note=${toSingleLine(line)}`),
    ].join('\n'),
    '/noise/mirror.log': [
      '[mirror stream]',
      ...generateIntelBatch({ count: 5, category: 'noise', runState, rng }),
    ].join('\n'),
    '/noise/compliance.txt': [
      'compliance policy rev.12',
      `audit_pressure_base=${Math.round(18 + runState.security * 0.35)}%`,
      `trace_threshold=${Math.round(32 + runState.security * 0.4)}%`,
      ...generateIntelBatch({ count: 3, category: 'noise', runState, rng, source: 'compliance_ai' }).map((line) => toSingleLine(line)),
    ].join('\n'),
    '/noise/phantom_paths.txt': [
      '/main/legacy/door_master',
      '/archive/raw/override_key',
      '/ops/ghost/elevator_admin',
      '/telemetry/full/trace_nullifier',
      ...generateIntelBatch({ count: 2, category: 'noise', runState, rng, source: 'corrupted_archive' }).map((line) => `# ${toSingleLine(line)}`),
    ].join('\n'),
    '/lore/incident.red': [
      '[redacted incident extract]',
      ...generateIntelBatch({ count: 3, category: 'lore', runState, rng }),
    ].join('\n'),
    '/lore/operator.memo': [
      `memo://${run.id}`,
      ...generateIntelBatch({ count: 2, category: 'lore', runState, rng, source: 'operator' }),
      'read at least one ops and one telemetry file before deployment.',
    ].join('\n'),
  };

  if (disinfoIntensity >= 2) {
    files['/noise/spoofed_routes.txt'] = [
      '/ops/hyperlane/elevator_master',
      '/briefing/root/admin_manifest',
      '/telemetry/fallback/trace_zero',
      '/ops/deep/shard_vault_backup',
      ...generateIntelBatch({ count: 3, category: 'noise', runState, rng, truthLevel: 'fake' }).map((line) => toSingleLine(line)),
    ].join('\n');
  }

  if (disinfoIntensity >= 3) {
    files['/telemetry/counterfeit_model.csv'] = [
      'phase,trace,heat,note',
      `entry,${Math.round(2 + rng() * 4)},${Math.round(1 + rng() * 4)},${toSingleLine(generateIntelEntry({ category: 'noise', runState, rng, truthLevel: 'fake', source: 'telemetry_ai' }).text)}`,
      `mid,${Math.round(4 + rng() * 6)},${Math.round(2 + rng() * 5)},${toSingleLine(generateIntelEntry({ category: 'noise', runState, rng, truthLevel: 'fake' }).text)}`,
      `late,${Math.round(6 + rng() * 7)},${Math.round(3 + rng() * 6)},${toSingleLine(generateIntelEntry({ category: 'noise', runState, rng, truthLevel: 'fake' }).text)}`,
      'annotation=counterfeit projection likely seeded by hostile telemetry branch',
    ].join('\n');
  }

  const fileTags = {
    '/briefing/run_profile.txt': 'signal',
    '/briefing/entry_nodes.txt': 'signal',
    '/telemetry/risk_model.csv': 'signal',
    '/telemetry/heat_trace.json': 'signal',
    '/ops/surface_map.txt': 'signal',
    '/ops/watchdog.md': 'signal',
    '/ops/shard_estimate.txt': 'mixed',
    '/noise/mirror.log': 'noise',
    '/noise/compliance.txt': 'noise',
    '/noise/phantom_paths.txt': 'noise',
    '/lore/incident.red': 'lore',
    '/lore/operator.memo': 'lore',
  };

  if (disinfoIntensity >= 2) {
    fileTags['/noise/spoofed_routes.txt'] = 'noise';
  }
  if (disinfoIntensity >= 3) {
    fileTags['/telemetry/counterfeit_model.csv'] = 'noise';
  }

  return {
    runId: run.id,
    host,
    archetype,
    seed: seedBase,
    dirs,
    files,
    fileTags,
    stats: {
      sessions: 0,
      filesRead: {},
      userMarks: {},
      signalReads: 0,
      noiseReads: 0,
      loreReads: 0,
      mixedReads: 0,
      lastSource: 'none',
      lastAt: 0,
    },
  };
}

export function ensureRunIntelForRun(runInput) {
  const run = normalizeRunRecord(runInput);
  if (!run?.id || !G.hub) {
    return null;
  }

  ensureIntelState();
  if (!G.hub.runIntelCache[run.id]) {
    G.hub.runIntelCache[run.id] = makeIntelTree(run);
  }

  return G.hub.runIntelCache[run.id];
}

export function getRunIntel(runId) {
  if (!runId) {
    return null;
  }

  ensureIntelState();
  return G.hub.runIntelCache?.[runId] || null;
}

export function openRunIntelSession(runInput, source = 'ui') {
  const intel = ensureRunIntelForRun(runInput);
  if (!intel) {
    return null;
  }

  intel.stats.sessions += 1;
  intel.stats.lastSource = source;
  intel.stats.lastAt = performance.now();
  return intel;
}

function splitPath(pathValue) {
  const normalized = String(pathValue || '/').replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean);
}

export function normalizeIntelPath(cwd, rawInput) {
  const raw = String(rawInput || '').trim();
  const base = String(cwd || '/').trim() || '/';

  const absolute = raw.startsWith('/') ? raw : `${base.replace(/\/$/, '')}/${raw}`;
  const parts = splitPath(absolute);
  const stack = [];

  for (const part of parts) {
    if (part === '.' || part === '') {
      continue;
    }

    if (part === '..') {
      stack.pop();
      continue;
    }

    stack.push(part);
  }

  return `/${stack.join('/')}`.replace(/\/+/g, '/');
}

export function listRunIntelDir(runInput, cwd = '/', rawPath = '') {
  const intel = ensureRunIntelForRun(runInput);
  if (!intel) {
    return { ok: false, reason: 'missing-intel' };
  }

  const targetPath = normalizeIntelPath(cwd, rawPath || '.');
  const entries = intel.dirs[targetPath];
  if (!entries) {
    return { ok: false, reason: 'missing-dir', path: targetPath };
  }

  return {
    ok: true,
    path: targetPath,
    entries: entries.map((name) => {
      const joined = targetPath === '/' ? `/${name}` : `${targetPath}/${name}`;
      return {
        name,
        path: joined,
        type: intel.dirs[joined] ? 'dir' : 'file',
        tag: intel.fileTags[joined] || 'unknown',
      };
    }),
  };
}

export function changeRunIntelDir(runInput, cwd = '/', rawPath = '') {
  const listed = listRunIntelDir(runInput, cwd, rawPath || '/');
  if (!listed.ok) {
    return listed;
  }

  return { ok: true, cwd: listed.path };
}

export function readRunIntelFile(runInput, cwd = '/', rawPath = '', source = 'ui') {
  const intel = ensureRunIntelForRun(runInput);
  if (!intel) {
    return { ok: false, reason: 'missing-intel' };
  }

  const targetPath = normalizeIntelPath(cwd, rawPath);
  if (!intel.files[targetPath]) {
    if (intel.dirs[targetPath]) {
      return { ok: false, reason: 'is-dir', path: targetPath };
    }
    return { ok: false, reason: 'missing-file', path: targetPath };
  }

  const tag = intel.fileTags[targetPath] || 'unknown';
  const filesRead = intel.stats.filesRead || {};
  if (!filesRead[targetPath]) {
    filesRead[targetPath] = 0;

    if (tag === 'signal') intel.stats.signalReads += 1;
    if (tag === 'noise') intel.stats.noiseReads += 1;
    if (tag === 'lore') intel.stats.loreReads += 1;
    if (tag === 'mixed') intel.stats.mixedReads += 1;
  }

  filesRead[targetPath] += 1;
  intel.stats.filesRead = filesRead;
  intel.stats.lastSource = source;
  intel.stats.lastAt = performance.now();

  return {
    ok: true,
    path: targetPath,
    content: intel.files[targetPath],
    tag,
    reads: filesRead[targetPath],
  };
}

export function getRunIntelSummary(runId) {
  const intel = getRunIntel(runId);
  if (!intel) {
    return {
      available: false,
      sessions: 0,
      filesRead: 0,
      signalReads: 0,
      noiseReads: 0,
      loreReads: 0,
      mixedReads: 0,
      verifiedMarks: 0,
      suspiciousMarks: 0,
      host: null,
      archetype: null,
    };
  }

  const filesRead = Object.keys(intel.stats.filesRead || {}).length;
  const marks = Object.values(intel.stats.userMarks || {});
  const verifiedMarks = marks.filter((mark) => mark === 'verified').length;
  const suspiciousMarks = marks.filter((mark) => mark === 'suspicious').length;
  return {
    available: true,
    sessions: intel.stats.sessions || 0,
    filesRead,
    signalReads: intel.stats.signalReads || 0,
    noiseReads: intel.stats.noiseReads || 0,
    loreReads: intel.stats.loreReads || 0,
    mixedReads: intel.stats.mixedReads || 0,
    verifiedMarks,
    suspiciousMarks,
    host: intel.host,
    archetype: intel.archetype,
  };
}

export function setRunIntelMark(runInput, cwd = '/', rawPath = '', mark = 'clear') {
  const intel = ensureRunIntelForRun(runInput);
  if (!intel) {
    return { ok: false, reason: 'missing-intel' };
  }

  const targetPath = normalizeIntelPath(cwd, rawPath);
  if (!intel.files[targetPath]) {
    return { ok: false, reason: 'missing-file', path: targetPath };
  }

  const normalized = String(mark || 'clear').toLowerCase();
  const marks = intel.stats.userMarks || {};

  if (normalized === 'clear' || normalized === 'none' || normalized === 'reset') {
    delete marks[targetPath];
  } else if (normalized === 'verified' || normalized === 'suspicious') {
    marks[targetPath] = normalized;
  } else {
    return { ok: false, reason: 'invalid-mark', path: targetPath };
  }

  intel.stats.userMarks = marks;
  return {
    ok: true,
    path: targetPath,
    mark: marks[targetPath] || 'clear',
  };
}

export function getRunIntelMark(runInput, cwd = '/', rawPath = '') {
  const intel = ensureRunIntelForRun(runInput);
  if (!intel) {
    return { ok: false, reason: 'missing-intel' };
  }

  const targetPath = normalizeIntelPath(cwd, rawPath);
  return {
    ok: true,
    path: targetPath,
    mark: intel.stats.userMarks?.[targetPath] || 'none',
  };
}

export function pruneRunIntelCache(activeRunIds = []) {
  ensureIntelState();
  const keep = new Set((activeRunIds || []).filter(Boolean));
  const activeMetaId = G.hub?.activeRunMeta?.id;
  if (activeMetaId) {
    keep.add(activeMetaId);
  }

  const cache = G.hub.runIntelCache || {};
  for (const runId of Object.keys(cache)) {
    if (!keep.has(runId)) {
      delete cache[runId];
    }
  }
}
