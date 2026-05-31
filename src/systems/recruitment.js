import { G } from '../core/state.js';
import { saveHubState } from '../core/persistence.js';
import { pruneRunIntelCache } from './runIntel.js';

const MAX_ACTIVE_RUNS = 4;

const RUN_TYPES = [
  { id: 'corp', name: 'KORPORACJA', target: 'Serwer korpo', secMin: 40, secMax: 78, profitMin: 220, profitMax: 520, contactMin: 0.1, contactMax: 0.24 },
  { id: 'lab', name: 'LABORATORIUM', target: 'Dzial R&D', secMin: 45, secMax: 85, profitMin: 260, profitMax: 580, contactMin: 0.12, contactMax: 0.27 },
  { id: 'gang', name: 'GANG', target: 'Node uliczny', secMin: 30, secMax: 68, profitMin: 180, profitMax: 430, contactMin: 0.08, contactMax: 0.2 },
  { id: 'datacenter', name: 'DATA CENTER', target: 'Magazyn danych', secMin: 50, secMax: 90, profitMin: 300, profitMax: 640, contactMin: 0.14, contactMax: 0.3 },
  { id: 'blackmarket', name: 'CZARNY MARKET', target: 'Brokerzy exploitow', secMin: 35, secMax: 72, profitMin: 210, profitMax: 500, contactMin: 0.1, contactMax: 0.26 },
  { id: 'abandoned', name: 'OPUSZCZONA SIEC', target: 'Martwy segment', secMin: 25, secMax: 64, profitMin: 170, profitMax: 410, contactMin: 0.16, contactMax: 0.35 },
];

const SPECIALIZATIONS = {
  skid: ['Script Kiddie', 'Phishing', 'Cheap Malware', 'Spoof Packets'],
  operator: ['Stealth Ops', 'ICE Combat', 'Signal Scramble', 'Data Exfiltration'],
  ghost: ['Black ICE War', 'Quantum Intrusion', 'Ghost Routing', 'Deep Core Assault'],
};

const BACKSTORIES = {
  skid: [
    'Uciekł z osiedlowej siatki i szuka ochrony przed gangiem.',
    'Rozprowadzał skradzione exploity, teraz ktoś poluje na jego klucze.',
    'Były courier darknetu. Ma długi i mało czasu.',
  ],
  operator: [
    'Pracował dla małej korporacji, odciął się po wewnętrznej czystce.',
    'Netrunner kontraktowy, który stracił ekipę podczas raidu ICE.',
    'Były operator infrastruktury miejskiej, zna ukryte backdoory.',
  ],
  ghost: [
    'Oficjalnie martwy po incydencie Black ICE. Widziany tylko w logach.',
    'Legenda podziemia: wyłączył wojskowy klaster i zniknął.',
    'Specjalista od cyberwojny, ścigany przez kilka megakorporacji.',
  ],
};

const ALIASES = {
  skid: ['GLITCH KID', 'RATBYTE', 'NULLPUNK', 'SPARK JUNKIE', 'KERNEL BOY'],
  operator: ['VANTA', 'GRIDFANG', 'HEXA', 'NIGHT TUNER', 'PROXY-17'],
  ghost: ['WRAITH', 'OBSIDIAN', 'ZERO SHADE', 'BLACK LULLABY', 'PHANTOM ROOT'],
};

function randInt(min, max) {
  return min + ((Math.random() * (max - min + 1)) | 0);
}

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[(Math.random() * list.length) | 0];
}

function createStarterCrewMember(index) {
  const tiers = ['skid', 'operator', 'operator', 'skid', 'operator'];
  const tier = tiers[index % tiers.length];
  const alias = `${pick(ALIASES[tier])}-${index + 1}`;

  return {
    id: `starter-${index + 1}`,
    alias,
    tier,
    specialization: pick(SPECIALIZATIONS[tier]),
    upkeep: tier === 'ghost' ? 120 : tier === 'operator' ? 55 : 20,
    panicRisk: tier === 'skid' ? Number(randFloat(0.2, 0.45).toFixed(2)) : Number(randFloat(0.03, 0.15).toFixed(2)),
  };
}

function ensureStarterCrew() {
  if (G.hub.crew.length > 0) {
    return;
  }

  for (let i = 0; i < 5; i += 1) {
    G.hub.crew.push(createStarterCrewMember(i));
  }
}

function tierFromWave(wave, notoriety) {
  const score = wave + notoriety * 0.08;
  const roll = Math.random();

  if (score > 8 && roll < 0.15) return 'ghost';
  if (score > 4 && roll < 0.55) return 'operator';
  if (roll < 0.05) return 'ghost';
  if (roll < 0.45) return 'operator';
  return 'skid';
}

export function ensureHubState() {
  if (!G.hub) {
    G.hub = {
      tab: 'plan',
      notoriety: 0,
      walletCredits: 0,
      debugBootstrapApplied: false,
      activeRuns: [],
      currentRunId: null,
      activeRunMeta: null,
      runIntelCache: {},
      runSerial: 1,
      contacts: [],
      crew: [],
      contactSerial: 1,
      lastContactDropId: null,
    };
  }

  if (!Array.isArray(G.hub.activeRuns)) G.hub.activeRuns = [];
  if (!Array.isArray(G.hub.contacts)) G.hub.contacts = [];
  if (!Array.isArray(G.hub.crew)) G.hub.crew = [];
  if (!G.hub.tab) G.hub.tab = 'plan';
  if (!Object.prototype.hasOwnProperty.call(G.hub, 'walletCredits')) G.hub.walletCredits = Number(G.P?.cr || 0);
  if (!Object.prototype.hasOwnProperty.call(G.hub, 'debugBootstrapApplied')) G.hub.debugBootstrapApplied = false;
  if (!G.hub.runSerial) G.hub.runSerial = 1;
  if (!G.hub.contactSerial) G.hub.contactSerial = 1;
  if (!Object.prototype.hasOwnProperty.call(G.hub, 'selectedOperatorId')) G.hub.selectedOperatorId = null;
  if (!Object.prototype.hasOwnProperty.call(G.hub, 'activeOperatorId')) G.hub.activeOperatorId = null;
  if (!Object.prototype.hasOwnProperty.call(G.hub, 'runResolved')) G.hub.runResolved = false;
  if (!Object.prototype.hasOwnProperty.call(G.hub, 'activeRunMeta')) G.hub.activeRunMeta = null;
  if (!Array.isArray(G.hub.runHistory)) G.hub.runHistory = [];
  if (typeof G.hub.pendingDeadDrop !== 'boolean') G.hub.pendingDeadDrop = false;
  if (!G.hub.runIntelCache || typeof G.hub.runIntelCache !== 'object') G.hub.runIntelCache = {};

  const normalizeCrewSelection = () => {
    if (!G.hub.crew.length) {
      G.hub.selectedOperatorId = null;
      G.hub.activeOperatorId = null;
      return;
    }

    const selectedExists = G.hub.selectedOperatorId && G.hub.crew.some((member) => member.id === G.hub.selectedOperatorId);
    if (!selectedExists) {
      G.hub.selectedOperatorId = G.hub.crew[0].id;
    }

    const activeExists = G.hub.activeOperatorId && G.hub.crew.some((member) => member.id === G.hub.activeOperatorId);
    if (!activeExists) {
      G.hub.activeOperatorId = null;
    }
  };

  const normalizeRunSelection = () => {
    if (!G.hub.activeRuns.length) {
      G.hub.currentRunId = null;
      return;
    }

    const currentExists = G.hub.currentRunId && G.hub.activeRuns.some((run) => run.id === G.hub.currentRunId);
    if (!currentExists) {
      G.hub.currentRunId = G.hub.activeRuns[0].id;
    }
  };

  if (!G.quickHackCatalogOwned) {
    G.quickHackCatalogOwned = {
      optics: true,
      motorics: true,
      neural: false,
      ddos: false,
      ghostmesh: false,
      silencer: false,
      lagspike: false,
      mirrorloop: false,
    };
  }

  if (!Array.isArray(G.quickHackLoadout) || G.quickHackLoadout.length !== 4) {
    G.quickHackLoadout = ['optics', 'motorics', 'neural', 'ddos'];
  }

  if (!G.quickHacks) {
    G.quickHacks = {};
  }

  ['optics', 'motorics', 'neural', 'ddos', 'ghostmesh', 'silencer', 'lagspike', 'mirrorloop'].forEach((id) => {
    if (typeof G.quickHacks[id] !== 'number') {
      G.quickHacks[id] = 0;
    }
  });

  if (!G.breachActionCatalogOwned) {
    G.breachActionCatalogOwned = {
      crack: true,
      suppress: true,
      worm: true,
      overload: true,
      core: true,
      jammer: false,
      shred: false,
      sandbox: false,
      cacheburst: false,
    };
  }

  if (!Array.isArray(G.breachActionLoadout) || G.breachActionLoadout.length !== 4) {
    G.breachActionLoadout = ['crack', 'suppress', 'worm', 'overload'];
  }

  G.quickHackLoadout = G.quickHackLoadout.map((id, index) => {
    if (G.quickHackCatalogOwned[id]) {
      return id;
    }
    return ['optics', 'motorics', 'neural', 'ddos'][index];
  });

  G.breachActionLoadout = G.breachActionLoadout.map((id, index) => {
    if (G.breachActionCatalogOwned[id]) {
      return id;
    }
    return ['crack', 'suppress', 'worm', 'overload'][index];
  });

  ensureStarterCrew();

  normalizeCrewSelection();

  while (G.hub.activeRuns.length < MAX_ACTIVE_RUNS) {
    G.hub.activeRuns.push(createRunOffer());
  }

  normalizeRunSelection();
}

function createRunOffer() {
  const profile = pick(RUN_TYPES);
  const id = `run-${G.hub.runSerial++}`;
  const danger = randInt(1, 10);
  const security = randInt(profile.secMin, profile.secMax);
  const profit = randInt(profile.profitMin, profile.profitMax);
  const contactChance = Number(randFloat(profile.contactMin, profile.contactMax).toFixed(2));
  const mapX = randInt(12, 88);
  const mapY = randInt(14, 86);
  const floorCount = 2 + ((Math.random() * 2) | 0); // 2-3 floors
  const intelSeed = randInt(100000, 999999);
  const intelHost = `${profile.id}-${intelSeed}.ops.gp`;
  const intelDisinfoLevel = danger >= 8 ? 'high' : danger >= 5 ? 'medium' : 'low';

  return {
    id,
    typeId: profile.id,
    typeName: profile.name,
    target: profile.target,
    mapX,
    mapY,
    danger,
    security,
    profit,
    contactChance,
    floorCount,
    intelSeed,
    intelHost,
    intelDisinfoLevel,
  };
}

export function getCurrentRunOffer() {
  ensureHubState();
  return G.hub.activeRuns.find((r) => r.id === G.hub.currentRunId) || null;
}

export function getActiveRunOffers() {
  ensureHubState();
  return G.hub.activeRuns;
}

export function setCurrentRunOffer(runId) {
  ensureHubState();
  const exists = G.hub.activeRuns.some((r) => r.id === runId);
  if (!exists) {
    return { success: false, message: 'Run nie istnieje.' };
  }

  G.hub.currentRunId = runId;
  saveHubState();
  return { success: true, message: 'Wybrano run do planu.' };
}

export function autoSelectRunForWave(wave) {
  ensureHubState();
  const sorted = [...G.hub.activeRuns].sort((a, b) => {
    const da = Math.abs(a.danger - Math.min(10, Math.max(1, Math.round(wave))));
    const db = Math.abs(b.danger - Math.min(10, Math.max(1, Math.round(wave))));
    return da - db;
  });

  if (sorted.length) {
    G.hub.currentRunId = sorted[0].id;
  }
}

export function rotateRunBoardAfterRun() {
  ensureHubState();
  if (!G.hub.currentRunId) {
    return;
  }

  G.hub.activeRuns = G.hub.activeRuns.filter((r) => r.id !== G.hub.currentRunId);
  while (G.hub.activeRuns.length < MAX_ACTIVE_RUNS) {
    G.hub.activeRuns.push(createRunOffer());
  }

  G.hub.currentRunId = G.hub.activeRuns.length ? G.hub.activeRuns[0].id : null;
  pruneRunIntelCache(G.hub.activeRuns.map((run) => run.id));
  saveHubState();
}

function createContact(wave) {
  ensureHubState();
  const tier = tierFromWave(wave, G.hub.notoriety || 0);
  const spec = pick(SPECIALIZATIONS[tier]);
  const alias = pick(ALIASES[tier]);
  const backstory = pick(BACKSTORIES[tier]);
  const id = `contact-${G.hub.contactSerial++}`;

  const risk = tier === 'ghost' ? 'HIGH' : tier === 'operator' ? 'MED' : 'LOW';
  const requirements = {
    notoriety: tier === 'ghost' ? 18 : tier === 'operator' ? 8 : 2,
    creditsUpfront: tier === 'ghost' ? 1200 : tier === 'operator' ? 550 : 180,
    minWave: tier === 'ghost' ? 6 : tier === 'operator' ? 3 : 1,
  };

  const missionGoal = tier === 'ghost' ? 4 : tier === 'operator' ? 3 : 2;
  const hireCost = tier === 'ghost' ? 2400 : tier === 'operator' ? 1100 : 300;

  const recruitmentHint = tier === 'ghost'
    ? 'Łańcuch misji: zdobycie rzadkich danych i wysoka reputacja.'
    : tier === 'operator'
      ? 'Kontrakt testowy i potwierdzenie reputacji.'
      : 'Prosta robota + spłata długu lub odzyskanie sprzętu.';

  return {
    id,
    alias,
    tier,
    specialization: spec,
    risk,
    backstory,
    recruitmentHint,
    requirements,
    mission: {
      status: 'intel', // intel -> active -> ready
      progress: 0,
      goal: missionGoal,
    },
    expiresInRuns: randInt(3, 6),
    hireCost,
    upkeep: tier === 'ghost' ? 120 : tier === 'operator' ? 55 : 20,
    panicRisk: tier === 'skid' ? Number(randFloat(0.2, 0.45).toFixed(2)) : Number(randFloat(0.03, 0.15).toFixed(2)),
  };
}

export function maybeGrantContactFromMainTerminal(wave) {
  ensureHubState();
  const run = getCurrentRunOffer();
  const baseChance = run ? run.contactChance : 0.12;

  if (Math.random() > baseChance) {
    G.hub.lastContactDropId = null;
    return null;
  }

  const contact = createContact(wave);
  G.hub.contacts.push(contact);
  G.hub.lastContactDropId = contact.id;
  saveHubState();
  return contact;
}

export function getContacts() {
  ensureHubState();
  return G.hub.contacts;
}

export function ensureDebugContacts(count, wave = G.wave || 1) {
  ensureHubState();
  const target = Math.max(0, Number(count) || 0);
  const missing = Math.max(0, target - G.hub.contacts.length);

  for (let i = 0; i < missing; i += 1) {
    G.hub.contacts.push(createContact(wave));
  }

  saveHubState();
  return G.hub.contacts;
}

export function getCrew() {
  ensureHubState();
  return G.hub.crew;
}

export function getSelectedCrewMember() {
  ensureHubState();
  if (!G.hub.crew.length) {
    return null;
  }

  const selected = G.hub.crew.find((member) => member.id === G.hub.selectedOperatorId) || null;
  if (selected) {
    return selected;
  }

  G.hub.selectedOperatorId = G.hub.crew[0].id;
  saveHubState();
  return G.hub.crew[0] || null;
}

export function setSelectedCrewMember(crewId) {
  ensureHubState();
  const exists = G.hub.crew.some((member) => member.id === crewId);

  if (!exists) {
    return { success: false, message: 'Wybrany operator nie istnieje.' };
  }

  G.hub.selectedOperatorId = crewId;
  saveHubState();
  return { success: true, message: 'Operator przypisany do runu.' };
}

export function markRunStarted(crewId) {
  ensureHubState();
  const fallbackCrew = getSelectedCrewMember();
  const chosen = crewId || fallbackCrew?.id || G.hub.selectedOperatorId;
  const exists = G.hub.crew.some((member) => member.id === chosen);

  if (!exists) {
    return { success: false, message: 'Brak wybranego operatora.' };
  }

  G.hub.selectedOperatorId = chosen;
  G.hub.activeOperatorId = chosen;
  G.hub.runResolved = false;
  saveHubState();
  return { success: true, message: 'Run rozpoczęty.' };
}

export function resolveRunFailure() {
  ensureHubState();

  if (G.hub.runResolved) {
    return { removedAliases: [], lostOperator: null };
  }

  const tick = processRunOutcome(false);
  let lostOperator = null;

  if (G.hub.activeOperatorId) {
    const index = G.hub.crew.findIndex((member) => member.id === G.hub.activeOperatorId);
    if (index >= 0) {
      const [removed] = G.hub.crew.splice(index, 1);
      lostOperator = removed || null;
    }
  }

  G.hub.activeOperatorId = null;
  G.hub.runResolved = true;

  if (!G.hub.selectedOperatorId || !G.hub.crew.some((member) => member.id === G.hub.selectedOperatorId)) {
    G.hub.selectedOperatorId = G.hub.crew.length ? G.hub.crew[0].id : null;
  }

  saveHubState();

  return { ...tick, lostOperator };
}

export function resolveRunSuccess() {
  ensureHubState();

  if (G.hub.runResolved) {
    return { removedAliases: [] };
  }

  const tick = processRunOutcome(true);
  G.hub.activeOperatorId = null;
  G.hub.runResolved = true;
  saveHubState();
  return tick;
}

export function startRecruitmentMission(contactId) {
  ensureHubState();
  const contact = G.hub.contacts.find((item) => item.id === contactId);
  if (!contact) {
    return { success: false, message: 'Kontakt nie istnieje.' };
  }

  if (contact.mission.status !== 'intel') {
    return { success: false, message: 'Misja rekrutacyjna już aktywna albo ukończona.' };
  }

  if (G.wave < contact.requirements.minWave) {
    return { success: false, message: `Za niski poziom runu. Wymagane: WAVE ${contact.requirements.minWave}.` };
  }

  if ((G.hub.notoriety || 0) < contact.requirements.notoriety) {
    return { success: false, message: `Za mała reputacja. Wymagane: ${contact.requirements.notoriety}.` };
  }

  if (G.P.cr < contact.requirements.creditsUpfront) {
    return { success: false, message: `Brakuje kredytów na inicjację kontaktu (¥${contact.requirements.creditsUpfront}).` };
  }

  G.P.cr -= contact.requirements.creditsUpfront;
  contact.mission.status = 'active';
  contact.mission.progress = 0;
  saveHubState();
  return { success: true, message: `Rozpoczęto łańcuch rekrutacyjny: ${contact.alias}.` };
}

export function rejectContact(contactId) {
  ensureHubState();
  const before = G.hub.contacts.length;
  G.hub.contacts = G.hub.contacts.filter((item) => item.id !== contactId);
  if (G.hub.contacts.length === before) {
    return { success: false, message: 'Kontakt nie istnieje.' };
  }

  saveHubState();
  return { success: true, message: 'Kontakt odrzucony.' };
}

export function hireContact(contactId) {
  ensureHubState();
  const contact = G.hub.contacts.find((item) => item.id === contactId);
  if (!contact) {
    return { success: false, message: 'Kontakt nie istnieje.' };
  }

  if (contact.mission.status !== 'ready') {
    return { success: false, message: 'Rekrutacja nie jest jeszcze gotowa.' };
  }

  if (G.P.cr < contact.hireCost) {
    return { success: false, message: `Brakuje kredytów na zatrudnienie (¥${contact.hireCost}).` };
  }

  G.P.cr -= contact.hireCost;
  G.hub.crew.push({
    id: `crew-${contact.id}`,
    alias: contact.alias,
    tier: contact.tier,
    specialization: contact.specialization,
    upkeep: contact.upkeep,
    panicRisk: contact.panicRisk,
  });
  G.hub.contacts = G.hub.contacts.filter((item) => item.id !== contactId);

  saveHubState();

  return { success: true, message: `${contact.alias} dołącza do ekipy.` };
}

export function processRunOutcome(success) {
  ensureHubState();

  if (success) {
    G.hub.notoriety = Math.min(999, (G.hub.notoriety || 0) + 2 + Math.floor(G.wave / 2));
  } else {
    G.hub.notoriety = Math.max(0, (G.hub.notoriety || 0) - 1);
  }

  for (const contact of G.hub.contacts) {
    if (contact.mission.status === 'active' && success) {
      contact.mission.progress += 1;
      if (contact.mission.progress >= contact.mission.goal) {
        contact.mission.status = 'ready';
      }
    }

    if (contact.mission.status !== 'ready') {
      contact.expiresInRuns -= 1;
    }
  }

  const removed = [];
  G.hub.contacts = G.hub.contacts.filter((contact) => {
    const expired = contact.expiresInRuns <= 0 && contact.mission.status !== 'ready';
    if (expired) removed.push(contact.alias);
    return !expired;
  });

  rotateRunBoardAfterRun();
  saveHubState();
  return { removedAliases: removed };
}

/**
 * Returns passive buffs for the currently active (on-mission) operator.
 * traceDecayMult: multiplier on trace decay rate (>1 = faster decay)
 * bwCostMult:     multiplier on BW costs in network breach (<1 = cheaper)
 * panicRisk:      chance per 60s tick when alert>70 that operator panics and abandons run
 */
export function getActiveOperatorBuffs() {
  ensureHubState();
  const op = G.hub.crew?.find((m) => m.id === G.hub.activeOperatorId);
  if (!op) {
    return { traceDecayMult: 1, bwCostMult: 1, panicRisk: 0 };
  }
  if (op.tier === 'ghost') {
    return { traceDecayMult: 1.25, bwCostMult: 0.75, panicRisk: op.panicRisk || 0.02 };
  }
  if (op.tier === 'operator') {
    return { traceDecayMult: 1.10, bwCostMult: 0.90, panicRisk: op.panicRisk || 0.08 };
  }
  // skid
  return { traceDecayMult: 1.0, bwCostMult: 1.0, panicRisk: op.panicRisk || 0.25 };
}
