import { G } from '../core/state.js';
import { completeMainHack, handleMainHackFailure } from './mission.js';
import { addTrace } from './traceSystem.js';
import { maybeGrantContactFromMainTerminal, getActiveOperatorBuffs } from './recruitment.js';
import { maybeGrantDataFragment, saveDataFragments } from './dataFragments.js';

// ─────────────────────────────────────────────────────────────────────────────
// BREACH ACTION CATALOG
// ─────────────────────────────────────────────────────────────────────────────

const BREACH_ACTIONS = [
	{ id: 'crack',      name: 'CRACK',         cpu: 10, ram: 0,  trace: 3,   desc: 'Bezpośredni crack exploitu.',    tip: 'Niski koszt i stabilny baseline.',     isLight: false, price: 0,    damage: 8,  cooldownMs: 2500, bwCost: 10 },
	{ id: 'suppress',   name: 'SUPPRESS',      cpu: 14, ram: 10, trace: -12, desc: 'Tłumi TRACE DAEMON.',            tip: 'Defensywny reset presji.',             isLight: true,  price: 0,    damage: 0,  cooldownMs: 4000, bwCost: 14 },
	{ id: 'worm',       name: 'WORM',          cpu: 12, ram: 12, trace: 3,   desc: 'Virus DOT. Mocny na FIREWALL.',  tip: 'Narzędzie pod burst.',                 isLight: false, price: 0,    damage: 12, cooldownMs: 3000, bwCost: 12, dotDmg: 4, dotCount: 2, dotIntervalMs: 3000 },
	{ id: 'overload',   name: 'OVERLOAD',      cpu: 24, ram: 6,  trace: 10,  desc: 'Power burst. Bardzo ryzykowny.', tip: 'Wysokie obrażenia i wysoki hałas.',    isLight: false, price: 0,    damage: 22, cooldownMs: 8000, bwCost: 24 },
	{ id: 'core',       name: 'CORE OVERRIDE', cpu: 18, ram: 12, trace: 7,   desc: 'ICE Finisher. Wymaga HP ≤ 20.',  tip: 'Kończy walkę z ICE Guardianem.',       isLight: false, price: 0,    damage: 0,  cooldownMs: 0,    bwCost: 18 },
	{ id: 'jammer',     name: 'PKT JAMMER',    cpu: 9,  ram: 10, trace: -8,  desc: 'Blokuje atak ICE.',             tip: 'Stabilizator ruchu.',                  isLight: true,  price: 880,  damage: 0,  cooldownMs: 10000, bwCost: 9 },
	{ id: 'shred',      name: 'ARMOR SHRED',   cpu: 15, ram: 8,  trace: 4,   desc: 'Usuwa tarcze ICE.',             tip: 'Przygotowanie pod burst.',             isLight: false, price: 1060, damage: 0,  cooldownMs: 6000, bwCost: 15 },
	{ id: 'sandbox',    name: 'SANDBOX',       cpu: 16, ram: 14, trace: -4,  desc: 'Blokuje BERSERKER lockout.',    tip: 'Ratuje przy wysokim TRACE.',           isLight: true,  price: 1220, damage: 0,  cooldownMs: 7000, bwCost: 16 },
	{ id: 'cacheburst', name: 'CACHE BURST',   cpu: 6,  ram: 0,  trace: 6,   desc: 'Natychmiastowy zastrzyk BW.',   tip: 'Tempo teraz, koszt potem.',            isLight: true,  price: 980,  damage: 0,  cooldownMs: 12000, bwCost: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL FILESYSTEM DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const FS_TREE = {
	'/':             { type: 'dir', children: ['sys', 'vault', 'ops', 'node.id'] },
	'/sys':          { type: 'dir', children: ['logs', 'config', 'daemon'] },
	'/sys/logs':     { type: 'dir', children: ['access.log', 'intrusion.log', 'watchdog.log'] },
	'/sys/config':   { type: 'dir', children: ['network.conf', 'firewall.rules'] },
	'/sys/daemon':   { type: 'dir', children: ['ice_guardian.bin'] },
	'/vault':        { type: 'dir', children: ['wallet.enc', 'intel'] },
	'/vault/intel':  { type: 'dir', children: [] },
	'/ops':          { type: 'dir', children: ['personnel', 'comms'] },
	'/ops/personnel':{ type: 'dir', children: ['roster.enc'] },
	'/ops/comms':    { type: 'dir', children: ['intercept.tar'] },
};

const FS_FLAVOR = {
	'node.id':                   'NODE: CORP-MAINFRAME-ALPHA-7\nOWNER: Apex Dynamics Ltd.\nCLEAR: SIGMA-4\nSTATUS: COMPROMISED',
	'/sys/logs/access.log':      '...last 10 sessions...\n2026-05-20 03:12 ADM login OK\n2026-05-19 22:47 INTRUSION BLOCKED\n2026-05-18 11:00 ADM login OK',
	'/sys/logs/intrusion.log':   'PREVIOUS BREACH ATTEMPTS: 14\nLAST ATTEMPT: 2026-05-19 22:47\nRESULT: BLOCKED\nNOTE: attacker used similar vector',
	'/sys/logs/watchdog.log':    'ICE GUARDIAN STATUS: PROCESS TERMINATED\nCORE DUMP: /tmp/ice_core.bin\nFATAL: unexpected signal SIGKILL from operator session',
	'/sys/config/network.conf':  'SUBNET: 10.0.0.0/8\nGATEWAY: 10.0.0.1\nDNS: NEXUS-RESOLVE\nROUTE: sigma.net via sigma-gw',
	'/sys/config/firewall.rules':'RULE 1: DENY ALL INBOUND\nRULE 2: ALLOW SIGMA PROTOCOL\nRULE 3: ICE GUARDIAN ACTIVE\nSTATUS: ICE GUARDIAN OFFLINE — RULES VOID',
	'/sys/daemon/ice_guardian.bin':'ELF BINARY — ICE GUARDIAN v4.2.1\nPROCESS: TERMINATED\nEXIT CODE: SIGKILL\nCORE DUMPED',
	'/vault/wallet.enc':         'ENCRYPTED WALLET\nBALANCE: [REDACTED]\nKEY: REQUIRED\nUSE: transfer funds',
	'/ops/personnel/roster.enc': 'ENCRYPTED — AES-256-SIGMA\nDECRYPTOR: NOT AVAILABLE\n[CANNOT DISPLAY]',
	'/ops/comms/intercept.tar':  'ENCRYPTED COMMS ARCHIVE\nKEY: NOT AVAILABLE\n[CANNOT DISPLAY]',
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BREACH_LOADOUT = ['crack', 'suppress', 'worm', 'overload'];

function ensureCatalogState() {
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
		G.breachActionLoadout = [...DEFAULT_BREACH_LOADOUT];
	}
}

function createDefaultMainBreachState() {
	return {
		phase: 0,
		// Auth
		authBypassed: false,
		authMethod: 'none',       // 'none' | 'brute' | 'clean'
		credsUploaded: false,
		// ICE battle
		iceHp: 100,
		iceMaxHp: 100,
		icePhase: 0,              // 0=STANDARD, 1=SHIELDED, 2=BERSERKER
		iceShieldLayers: [],      // ['reflect','drain','armor'] — active shield layers
		iceAttackWindowUntil: 0,  // timestamp — +50% damage window after ICE attack
		iceIncomingLockout: null, // { at: timestamp, targets: string[] } — telegraphed lockout
		iceNextAttack: 0,
		iceAttackInterval: 7000,
		iceAttackCount: 0,
		iceDoTTicks: [],          // [{damage, at}]
		iceSuppressCharges: 0,
		iceJammed: false,
		iceSandboxed: false,
		iceDefeated: false,
		actionCooldowns: {},      // { [actionId]: timestamp }
		actionLockedUntil: {},    // { [actionId]: timestamp }
		lastActionAt: 0,          // timestamp of last player action (BW overflow drain tracking)
		overflowDrainNextLog: 0,  // throttle overflow drain log
		originalMbw: 0,           // BW max before wave degradation
		// Filesystem
		filesystemUnlocked: false,
		filesystemCwd: '/',
		filesystemFiles: null,    // { [filename]: { type, reward } }
		filesystemIntelFiles: [],
		filesystemCreditsAmount: 0,
		filesystemPendingContactId: null,
		filesystemPendingFragmentId: null,
		pendingGrants: { credits: false, fragment: false, contact: false },
		vaultTimerStart: 0,       // timestamp when vault was unlocked
		vaultTimerDuration: 45000, // ms until vault lockdown
		vaultTimerExpired: false,
		vaultWarned20: false,
		vaultWarned10: false,
		// Legacy
		completed: false,
		breachActive: false,
		breachFailed: false,
		passiveTraceBonusApplied: false,
	};
}

function ensureMainBreachState() {
	if (!G.mainBreachState) {
		G.mainBreachState = createDefaultMainBreachState();
	}
	return G.mainBreachState;
}

function terminalState() {
	return G.terminalRuntime || null;
}

function logBreachLine(message) {
	const terminal = terminalState();
	if (terminal?.outputLines) {
		terminal.outputLines.push(`[BREACH] ${message}`);
	}
}

function setTerminalContext(context) {
	const terminal = terminalState();
	if (terminal) {
		terminal.commandContext = context;
	}
}

function setMainHackStep(step) {
	G.mainHackLogStep = step;
	if (G.terminalRuntime) {
		G.terminalRuntime.mainHackLogStep = step;
	}
}

function unlockedShardCount() {
	return Object.keys(G.mainTerminalAuth?.recoveredByNode || {}).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC CATALOG API (menu/shop)
// ─────────────────────────────────────────────────────────────────────────────

export function getBreachActionDefinitions() {
	ensureCatalogState();
	return BREACH_ACTIONS;
}

export function buyBreachAction(id) {
	ensureCatalogState();
	const action = BREACH_ACTIONS.find((entry) => entry.id === id);
	if (!action) {
		return { success: false, message: 'Nieznana akcja.' };
	}
	if (G.breachActionCatalogOwned[id]) {
		return { success: false, message: 'Akcja juz odblokowana.' };
	}
	if ((action.price || 0) > 0 && (!G.P || G.P.cr < action.price)) {
		return { success: false, message: 'Za malo kredytow.' };
	}
	if ((action.price || 0) > 0) {
		G.P.cr -= action.price;
	}
	G.breachActionCatalogOwned[id] = true;
	return { success: true };
}

export function equipBreachActionInSlot(slotIndex, id) {
	ensureCatalogState();
	if (slotIndex < 0 || slotIndex >= 4) {
		return { success: false, message: 'Nieprawidlowy slot.' };
	}
	if (!G.breachActionCatalogOwned[id]) {
		return { success: false, message: 'Akcja nieodblokowana.' };
	}
	const existingIndex = G.breachActionLoadout.findIndex((value) => value === id);
	if (existingIndex >= 0 && existingIndex !== slotIndex) {
		const current = G.breachActionLoadout[slotIndex];
		G.breachActionLoadout[slotIndex] = id;
		G.breachActionLoadout[existingIndex] = current;
		return { success: true, swapped: true };
	}
	G.breachActionLoadout[slotIndex] = id;
	return { success: true, swapped: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

export function initNetworkBreachBridge() {
	// Legacy bridge removed. Main breach is handled through terminal overlay.
}

export function resetNetworkBreachState() {
	G.mainBreachState = createDefaultMainBreachState();
	G.breachActive = false;
	G.breachFailed = false;
	G.hackingMain = false;
	G.mainHacked = false;
	G.hackProgress = 0;
	setMainHackStep(-1);
	setTerminalContext('normal');
	if (G.terminalRuntime) {
		G.terminalRuntime.mainPayloadUploaded = false;
		G.terminalRuntime.networkStatus = 'DORMANT';
	}
}

export function launchNetworkBreach() {
	const state = ensureMainBreachState();
	state.breachActive = true;
	state.breachFailed = false;
	G.breachActive = true;
	G.breachFailed = false;
	G.hackingMain = true;
	setTerminalContext('main_breach');
	setMainHackStep(state.phase);
	if (G.terminalRuntime) {
		G.terminalRuntime.networkStatus = 'ICE_ACTIVE';
	}
	logBreachLine('MAIN NODE ONLINE. AUTH LOCK AKTYWNY.');
	logBreachLine("Opcje: 'upload creds' (shard) | 'brute auth' (ryzykowne)");
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH PHASE
// ─────────────────────────────────────────────────────────────────────────────

export function handleUploadCreds(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (state.authBypassed) {
		log('AUTH JUZ OMINIETO.');
		return false;
	}
	if (unlockedShardCount() <= 0) {
		log('BRAK SHARDA Z SIDE TERMINALI.');
		return false;
	}
	state.authBypassed = true;
	state.authMethod = 'clean';
	state.credsUploaded = true;
	state.phase = 1;
	setMainHackStep(1);
	log('CREDS WGRANE. AUTH OK. ICE GUARDIAN WYKRYTY.');
	activateICEBattle(log);
	return true;
}

export function handleBruteAuth(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (state.authBypassed) {
		log('AUTH JUZ OMINIETO.');
		return false;
	}
	state.authBypassed = true;
	state.authMethod = 'brute';
	state.phase = 1;
	setMainHackStep(1);
	addTrace(30, 'brute_auth');
	G.alert = Math.min(100, (G.alert || 0) + 25);
	activateICEBattle(log);
	state.iceHp = 120;
	state.iceMaxHp = 120;
	log('BRUTE AUTH. +30 TRACE. ALERT PODNIESIONY. ICE GUARDIAN WCHODZI (HP: 120 — penalty za brute).');
	return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICE BATTLE
// ─────────────────────────────────────────────────────────────────────────────

function activateICEBattle(log = logBreachLine) {
	const state = ensureMainBreachState();
	state.iceHp = 100;
	state.iceMaxHp = 100;
	state.icePhase = 0;
	state.iceShieldLayers = [];
	state.iceAttackWindowUntil = 0;
	state.iceIncomingLockout = null;
	state.iceNextAttack = Date.now() + 7000;
	state.iceAttackInterval = 7000;
	state.iceAttackCount = 0;
	state.iceDoTTicks = [];
	state.iceSuppressCharges = 0;
	state.iceJammed = false;
	state.iceSandboxed = false;
	state.iceDefeated = false;
	state.actionCooldowns = {};
	state.actionLockedUntil = {};
	state.lastActionAt = Date.now();
	state.overflowDrainNextLog = 0;
	// BW max degradation per wave (min 50)
	state.originalMbw = G.P.mbw || 100;
	const degradedMbw = Math.max(50, state.originalMbw - ((G.wave || 1) - 1) * 5);
	G.P.mbw = degradedMbw;
	if (G.P.bw > degradedMbw) G.P.bw = degradedMbw;
	state.breachActive = true;
	if (G.terminalRuntime) {
		G.terminalRuntime.networkStatus = 'ICE_ACTIVE';
	}
	if (!state.passiveTraceBonusApplied) {
		G.traceRuntime.passivePerSec += 0.6;
		state.passiveTraceBonusApplied = true;
	}
	const bwInfo = degradedMbw < state.originalMbw ? ` BW MAX: ${degradedMbw} (wave ${G.wave || 1} penalty).` : '';
	log(`ICE GUARDIAN v4.2.1 ONLINE. HP: 100. Uzyj breach actions lub core (HP≤20).${bwInfo}`);
	log("Wpisz 'use <action>' lub 'ba <1-4>' by uzyc akcji z loadoutu.");
}

export function handleUseBreachAction(actionId, log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.authBypassed || state.iceDefeated) {
		log('ICE GUARDIAN NIEDOSTEPNY.');
		return false;
	}
	if (!actionId) {
		log("Podaj akcje: use <action> lub ba <1-4>.");
		return false;
	}
	const def = BREACH_ACTIONS.find((a) => a.id === actionId);
	if (!def) {
		log(`Nieznana akcja: ${actionId}`);
		return false;
	}
	ensureCatalogState();
	if (!G.breachActionCatalogOwned[actionId]) {
		log(`Akcja ${def.name} nieodblokowana.`);
		return false;
	}
	if (actionId === 'core') {
		return handleCoreFinisher(log);
	}

	const now = Date.now();
	const cooldownEnd = state.actionCooldowns[actionId] || 0;
	if (now < cooldownEnd) {
		const remaining = ((cooldownEnd - now) / 1000).toFixed(1);
		log(`${def.name} COOLDOWN: ${remaining}s`);
		return false;
	}
	const lockEnd = state.actionLockedUntil[actionId] || 0;
	if (now < lockEnd) {
		const remaining = ((lockEnd - now) / 1000).toFixed(1);
		log(`${def.name} ZABLOKOWANY przez ICE: ${remaining}s`);
		return false;
	}
	const drainExtra = (!state.iceDefeated && state.iceShieldLayers.includes('drain')) ? 4 : 0;
	const { bwCostMult } = getActiveOperatorBuffs();
	const totalBwCost = Math.round(((def.bwCost || 0) * bwCostMult) + drainExtra);
	if (totalBwCost > 0 && G.P.bw < totalBwCost) {
		log(`Za malo BW. Potrzeba: ${totalBwCost}${drainExtra > 0 ? ` (+${drainExtra} DRAIN)` : ''}, masz: ${Math.floor(G.P.bw)}`);
		return false;
	}

	if (totalBwCost > 0) {
		G.P.bw -= totalBwCost;
		if (drainExtra > 0) log(`[DRAIN] -${drainExtra} BW extra (shield).`);
	}
	state.actionCooldowns[actionId] = now + (def.cooldownMs || 0);
	state.lastActionAt = now;

	// Apply trace change
	if ((def.trace || 0) !== 0) {
		if (def.trace > 0) {
			addTrace(def.trace, actionId);
		} else {
			// negative trace = soften (add negative value)
			addTrace(def.trace, actionId);
		}
	}

	// Action-specific effects
	switch (actionId) {
		case 'crack': {
			const inWindow = now < (state.iceAttackWindowUntil || 0);
			let dmg = inWindow ? Math.round(def.damage * 1.5) : def.damage;
			const tag = inWindow ? ' [CRIT WINDOW x1.5]' : '';
			if (state.iceShieldLayers.includes('armor')) dmg = Math.round(dmg * 0.30);
			state.iceHp = Math.max(0, state.iceHp - dmg);
			log(`CRACK: ICE HP ${state.iceHp}/${state.iceMaxHp} (-${dmg})${tag}`);
			if (state.iceShieldLayers.includes('reflect')) {
				const reflectTrace = Math.round(dmg * 0.30);
				addTrace(reflectTrace, 'ice_reflect');
				log(`[REFLECT] +${reflectTrace} TRACE`);
			}
			break;
		}
		case 'worm': {
			const inWindow = now < (state.iceAttackWindowUntil || 0);
			let dmg = inWindow ? Math.round(def.damage * 1.5) : def.damage;
			const tag = inWindow ? ' [CRIT WINDOW x1.5]' : '';
			if (state.iceShieldLayers.includes('armor')) dmg = Math.round(dmg * 0.30);
			state.iceHp = Math.max(0, state.iceHp - dmg);
			const dotCount = def.dotCount || 2;
			const dotInterval = def.dotIntervalMs || 3000;
			for (let i = 1; i <= dotCount; i++) {
				state.iceDoTTicks.push({ damage: def.dotDmg || 4, at: now + dotInterval * i });
			}
			log(`WORM: ICE HP ${state.iceHp}/${state.iceMaxHp} (-${dmg}) + DOT x${dotCount}${tag}`);
			if (state.iceShieldLayers.includes('reflect')) {
				const reflectTrace = Math.round(dmg * 0.30);
				addTrace(reflectTrace, 'ice_reflect');
				log(`[REFLECT] +${reflectTrace} TRACE`);
			}
			break;
		}
		case 'overload': {
			const inWindow = now < (state.iceAttackWindowUntil || 0);
			let dmg = inWindow ? Math.round(def.damage * 1.5) : def.damage;
			const tag = inWindow ? ' [CRIT WINDOW x1.5]' : '';
			if (state.iceShieldLayers.includes('armor')) dmg = Math.round(dmg * 0.30);
			state.iceHp = Math.max(0, state.iceHp - dmg);
			log(`OVERLOAD: ICE HP ${state.iceHp}/${state.iceMaxHp} (-${dmg})${tag}`);
			if (state.iceShieldLayers.includes('reflect')) {
				const reflectTrace = Math.round(dmg * 0.30);
				addTrace(reflectTrace, 'ice_reflect');
				log(`[REFLECT] +${reflectTrace} TRACE`);
			}
			break;
		}
		case 'suppress':
			state.iceSuppressCharges = (state.iceSuppressCharges || 0) + 2;
			log(`SUPPRESS: +2 suppress charges. ICE ataki osłabione.`);
			break;
		case 'jammer':
			state.iceJammed = true;
			log('JAMMER: Następny atak ICE zablokowany.');
			break;
		case 'shred':
			if (state.iceShieldLayers.length === 0) {
				log('SHRED: Brak aktywnych warstw tarczy.');
			} else {
				const idx = Math.floor(Math.random() * state.iceShieldLayers.length);
				const removed = state.iceShieldLayers.splice(idx, 1)[0];
				const remaining = state.iceShieldLayers.length;
				log(`SHRED: Warstwa [${removed.toUpperCase()}] usunięta. Pozostało: ${remaining}.`);
				if (remaining === 0) log('SHRED: Wszystkie tarcze zniszczone.');
			}
			break;
		case 'sandbox':
			state.iceSandboxed = true;
			log('SANDBOX: Gotowy — anuluje nadchodzący lockout w oknie 2s.');
			break;
		case 'cacheburst':
			G.P.bw = Math.min(G.P.mbw || 100, (G.P.bw || 0) + 15);
			log(`CACHEBURST: +15 BW. Teraz: ${Math.floor(G.P.bw)}/${G.P.mbw || 100}`);
			break;
	}

	checkICEPhaseTransition(state, log);

	if (state.iceHp <= 0) {
		state.iceHp = 0;
		log('ICE GUARDIAN KRYTYCZNIE USZKODZONY. Uzyj CORE by zakonczyc.');
	}

	return true;
}

export function handleCoreFinisher(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.authBypassed || state.iceDefeated) {
		log('ICE GUARDIAN NIEDOSTEPNY.');
		return false;
	}
	if (state.iceHp > 20) {
		log(`CORE NIEUDANY. ICE HP zbyt wysokie: ${state.iceHp}/20 wymagane.`);
		return false;
	}
	state.iceDefeated = true;
	state.breachActive = false;
	G.hackingMain = false;
	G.mainHacked = true;
	G.hackProgress = 1;
	if (G.terminalRuntime) {
		G.terminalRuntime.mainPayloadUploaded = true;
		G.terminalRuntime.networkStatus = 'VAULT_OPEN';
	}
	setMainHackStep(2);
	log('CORE OVERRIDE: ICE GUARDIAN TERMINATED. VAULT UNLOCKED.');
	prepareMainNodeFilesystem(log);
	return true;
}

function checkICEPhaseTransition(state, log = logBreachLine) {
	if (state.icePhase === 0 && state.iceHp <= 50) {
		state.icePhase = 1;
		state.iceShieldLayers = ['reflect', 'drain', 'armor'];
		log('ICE PHASE 2: SHIELDED. 3 warstwy: ARMOR(dmg×0.30) DRAIN(+4BW/akcja) REFLECT(dmg↞trace). Uzyj SHRED 3x.');
	} else if (state.icePhase === 1 && state.iceHp <= 25) {
		state.icePhase = 2;
		state.iceAttackInterval = 4000;
		log('ICE PHASE 3: BERSERKER. Ataki co 4s. TRACE x2. Lockout telegrafowany 2s wcześniej.');
	}
}

function triggerICECounterattack(state, log = logBreachLine) {
	const now = Date.now();
	state.iceAttackCount = (state.iceAttackCount || 0) + 1;

	if (state.iceJammed) {
		state.iceJammed = false;
		log('ICE ATAK ZABLOKOWANY przez JAMMER.');
		state.iceNextAttack = now + state.iceAttackInterval;
		return;
	}

	const traceMultiplier = state.icePhase >= 2 ? 2 : 1;

	if (state.icePhase === 2) {
		// BERSERKER: trace spike or telegraphed lockout
		const roll = Math.random();
		if (roll < 0.5) {
			const traceDmg = 20 * traceMultiplier;
			const suppressReduction = Math.min(state.iceSuppressCharges, 1);
			const actualTrace = traceDmg - suppressReduction * 8;
			if (suppressReduction > 0) state.iceSuppressCharges--;
			addTrace(actualTrace, 'ice_attack');
			log(`ICE BERSERKER BLAST: +${actualTrace} TRACE`);
		} else {
			// telegraphed lockout — player has 2s to use sandbox
			ensureCatalogState();
			const loadout = (G.breachActionLoadout || []).filter(Boolean);
			const shuffled = [...loadout].sort(() => Math.random() - 0.5).slice(0, 2);
			state.iceIncomingLockout = { at: now + 2000, targets: shuffled };
			log(`[ICE] INITIATING LOCKOUT SEQUENCE — 2s. Cel: ${shuffled.join(', ')}. Uzyj SANDBOX by zablokowac!`);
		}
	} else if (state.icePhase === 1) {
		// SHIELDED: trace spike
		const traceDmg = Math.floor(12 + Math.random() * 6);
		const suppressReduction = Math.min(state.iceSuppressCharges, 1);
		const actualTrace = Math.max(0, traceDmg - suppressReduction * 8);
		if (suppressReduction > 0) state.iceSuppressCharges--;
		addTrace(actualTrace, 'ice_attack');
		log(`ICE SHIELDED PULSE: +${actualTrace} TRACE`);
	} else {
		// STANDARD: random trace or BW damage
		const traceDmg = Math.floor(8 + Math.random() * 4);
		const bwDmg = Math.floor(8 + Math.random() * 4);
		if (Math.random() < 0.5) {
			const suppressReduction = Math.min(state.iceSuppressCharges, 1);
			const actualTrace = Math.max(0, traceDmg - suppressReduction * 8);
			if (suppressReduction > 0) state.iceSuppressCharges--;
			addTrace(actualTrace, 'ice_attack');
			log(`ICE ATAK: +${actualTrace} TRACE`);
		} else {
			G.P.bw = Math.max(0, (G.P.bw || 0) - bwDmg);
			log(`ICE ATAK: -${bwDmg} BW. Teraz: ${Math.floor(G.P.bw)}`);
		}
	}

	state.iceNextAttack = now + state.iceAttackInterval;
	// Open 2s attack window — bonus damage for the player
	state.iceAttackWindowUntil = now + 2000;
	log('[ICE] WINDOW OPEN — 2s (+50% damage).');
}

// ─────────────────────────────────────────────────────────────────────────────
// FILESYSTEM PHASE
// ─────────────────────────────────────────────────────────────────────────────

function prepareMainNodeFilesystem(log = logBreachLine) {
	const state = ensureMainBreachState();

	// Generate pending rewards (side effects: pushes to G.hub.contacts and G.hub.dataFragments.collected)
	const contact = maybeGrantContactFromMainTerminal(G.wave);
	const fragment = maybeGrantDataFragment(G.wave);
	G.mainHackContactReward = contact;
	G.mainHackFragmentReward = fragment;
	state.filesystemPendingContactId = contact ? contact.id : null;
	state.filesystemPendingFragmentId = fragment ? fragment.id : null;

	// Build dynamic intel directory
	const intelFiles = [];
	state.filesystemFiles = {};

	if (fragment) {
		const fragName = `fragment_${fragment.id.toLowerCase().replace(/_/g, '')}.dat`;
		state.filesystemFiles[fragName] = { type: 'fragment', reward: fragment };
		intelFiles.push(fragName);
	}
	if (contact) {
		const contractName = `contract_${contact.alias.toLowerCase().replace(/[\s\-]/g, '_')}.key`;
		state.filesystemFiles[contractName] = { type: 'contact', reward: contact };
		intelFiles.push(contractName);
	}
	state.filesystemIntelFiles = intelFiles;
	state.filesystemUnlocked = true;
	state.filesystemCwd = '/';

	const creditsAmount = 150 + (G.wave || 1) * 60;
	state.filesystemCreditsAmount = creditsAmount;

	state.vaultTimerStart = Date.now();
	log("ICE GUARDIAN TERMINATED. VAULT UNLOCKED.");
	log(`VAULT INTEGRITY: 45s do lockdownu — pospiesz sie!`);
	log(`Pliki do exfilu: 'ls vault/intel' | transfer: 'transfer funds'`);
	log("Po zabraniu co chcesz: 'disconnect' lub 'dc' by uciec.");
}

function resolveAbsPath(state, rawPath) {
	if (!rawPath || rawPath === '~') return '/';
	if (rawPath.startsWith('/')) return rawPath.replace(/\/$/, '') || '/';
	// relative
	const base = state.filesystemCwd === '/' ? '' : state.filesystemCwd;
	const joined = `${base}/${rawPath}`.replace(/\/+/g, '/');
	return joined.replace(/\/$/, '') || '/';
}

function getFSNode(state, absPath) {
	// Check static tree first
	if (FS_TREE[absPath]) return FS_TREE[absPath];
	// Check root-level files
	if (absPath.startsWith('/')) {
		const name = absPath.replace(/^\//, '');
		if (!name.includes('/')) {
			if (FS_FLAVOR[name] !== undefined) return { type: 'file' };
		}
	}
	// Check flavored files
	if (FS_FLAVOR[absPath] !== undefined) return { type: 'file' };
	// Check dynamic intel files
	if (state.filesystemFiles && state.filesystemIntelFiles) {
		const intelName = absPath.replace('/vault/intel/', '');
		if (state.filesystemFiles[intelName]) return { type: 'file', dynamic: true };
	}
	return null;
}

export function handleFilesystemLs(args, log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.filesystemUnlocked) { log('FILESYSTEM NIEDOSTEPNY.'); return false; }

	const rawPath = args && args[0] ? args[0] : state.filesystemCwd;
	const absPath = resolveAbsPath(state, rawPath);
	const node = getFSNode(state, absPath);

	if (!node) { log(`ls: ${absPath}: No such file or directory`); return false; }
	if (node.type !== 'dir') { log(`ls: ${absPath}: Not a directory`); return false; }

	// Build children list
	let children = [...(node.children || [])];
	if (absPath === '/vault/intel') {
		children = [...(state.filesystemIntelFiles || [])];
	}

	if (!children.length) { log(`${absPath}: (empty)`); return true; }
	log(`${absPath}:`);
	log(children.join('  '));
	return true;
}

export function handleFilesystemCd(args, log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.filesystemUnlocked) { log('FILESYSTEM NIEDOSTEPNY.'); return false; }

	const rawPath = args && args[0] ? args[0] : '/';
	const absPath = resolveAbsPath(state, rawPath);
	const node = getFSNode(state, absPath);

	if (!node) { log(`cd: ${absPath}: No such file or directory`); return false; }
	if (node.type !== 'dir') { log(`cd: ${absPath}: Not a directory`); return false; }

	state.filesystemCwd = absPath;
	log(`cwd: ${absPath}`);
	return true;
}

export function handleFilesystemCat(args, log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.filesystemUnlocked) { log('FILESYSTEM NIEDOSTEPNY.'); return false; }

	const rawPath = args && args[0] ? args[0] : '';
	if (!rawPath) { log('cat: podaj nazwe pliku'); return false; }
	const absPath = resolveAbsPath(state, rawPath);

	// Check flavor (static)
	const rootName = rawPath.replace(/^\//, '');
	if (FS_FLAVOR[rootName] !== undefined) {
		FS_FLAVOR[rootName].split('\n').forEach((l) => log(l));
		return true;
	}
	if (FS_FLAVOR[absPath] !== undefined) {
		FS_FLAVOR[absPath].split('\n').forEach((l) => log(l));
		return true;
	}

	// Check dynamic intel files
	if (state.filesystemFiles && !state.vaultTimerExpired) {
		const intelName = absPath.replace('/vault/intel/', '');
		const fileEntry = state.filesystemFiles[intelName];
		if (fileEntry) {
			if (fileEntry.type === 'fragment') {
				const f = fileEntry.reward;
				log(`[DATA FRAGMENT] ${f.title}`);
				log(`ID: ${f.id} | CATEGORY: ${f.category}`);
				log(f.content);
			} else if (fileEntry.type === 'contact') {
				const c = fileEntry.reward;
				log(`[CONTACT RECORD] ${c.alias} [${c.tier.toUpperCase()}]`);
				log(`SPEC: ${c.specialization}`);
				log(`RISK: ${c.risk} | HIRE: ¥${c.hireCost}`);
				log(c.backstory);
			}
			return true;
		}
	}

	log(`cat: ${absPath}: No such file`);
	return false;
}

export function handleFilesystemScp(args, log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.filesystemUnlocked) { log('SCP: FILESYSTEM NIEDOSTEPNY.'); return false; }

	const filename = args && args[0] ? String(args[0]).toLowerCase() : '';
	if (!filename) { log('scp: podaj nazwe pliku'); return false; }

	if (!state.filesystemFiles) { log('SCP: brak plikow do exfilu.'); return false; }
	if (state.vaultTimerExpired) { log('SCP: VAULT LOCKED — pliki niedostepne po lockdownie.'); return false; }

	// Match by filename (case-insensitive)
	const matchKey = Object.keys(state.filesystemFiles).find(
		(k) => k.toLowerCase() === filename,
	);
	if (!matchKey) {
		log(`scp: ${filename}: File not found in vault/intel`);
		return false;
	}

	const entry = state.filesystemFiles[matchKey];
	if (entry.type === 'fragment') {
		if (state.pendingGrants.fragment) {
			log(`SCP: ${matchKey} — juz exfiltrowany.`);
			return false;
		}
		state.pendingGrants.fragment = true;
		log(`EXFIL OK: ${matchKey} — DATA FRAGMENT zabezpieczony.`);
	} else if (entry.type === 'contact') {
		if (state.pendingGrants.contact) {
			log(`SCP: ${matchKey} — juz exfiltrowany.`);
			return false;
		}
		state.pendingGrants.contact = true;
		log(`EXFIL OK: ${matchKey} — KONTAKT zabezpieczony.`);
	}
	return true;
}

export function handleFilesystemTransferFunds(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (!state.filesystemUnlocked) { log('TRANSFER: FILESYSTEM NIEDOSTEPNY.'); return false; }
	if (state.pendingGrants.credits) {
		log('TRANSFER: srodki juz przelane.');
		return false;
	}
	state.pendingGrants.credits = true;
	addTrace(3, 'transfer_funds');
	log(`TRANSFER OK: ¥${state.filesystemCreditsAmount} — przelewam na konto operatora.`);
	return true;
}

export function handleDisconnectExfil(log = logBreachLine) {
	const state = ensureMainBreachState();

	// If vault timer expired, forfeit file-based rewards
	if (state.vaultTimerExpired) {
		state.pendingGrants.fragment = false;
		state.pendingGrants.contact = false;
	}

	// Undo unreceived rewards
	if (!state.pendingGrants.contact && state.filesystemPendingContactId) {
		if (G.hub?.contacts) {
			G.hub.contacts = G.hub.contacts.filter((c) => c.id !== state.filesystemPendingContactId);
		}
		G.mainHackContactReward = null;
	}
	if (!state.pendingGrants.fragment && state.filesystemPendingFragmentId) {
		if (G.hub?.dataFragments?.collected) {
			G.hub.dataFragments.collected = G.hub.dataFragments.collected.filter(
				(id) => id !== state.filesystemPendingFragmentId,
			);
		}
		G.mainHackFragmentReward = null;
	}
	if (state.pendingGrants.fragment) {
		saveDataFragments();
	}
	if (state.pendingGrants.credits) {
		// Apply Ghost Rating bonus to credits
		const traceValue = G.traceRuntime?.value ?? 100;
		let creditsAmount = state.filesystemCreditsAmount || 0;
		let rating = 'CLEAN';
		if (traceValue <= 25) {
			rating = 'GHOST';
			creditsAmount = Math.floor(creditsAmount * 1.4);
		} else if (traceValue >= 61) {
			rating = 'HOT';
		}
		G.P.cr = (G.P.cr || 0) + creditsAmount;
		G.lastBreachRating = rating;
		if (rating === 'GHOST') {
			log(`GHOST RATING \u2014 trace=${Math.floor(traceValue)}. +40% BONUS: \u00a5${creditsAmount}`);
			if (G.hub) G.hub.pendingDeadDrop = true;
		} else if (rating === 'HOT') log(`HOT RATING \u2014 trace=${Math.floor(traceValue)}. Standard: \u00a5${creditsAmount}`);
		else log(`CLEAN RATING \u2014 \u00a5${creditsAmount} zasililo konto.`);
	}

	// Restore BW max after breach
	if (state.originalMbw > 0) {
		G.P.mbw = state.originalMbw;
	}

	state.breachActive = false;
	G.breachActive = false;
	G.hackingMain = false;
	setTerminalContext('normal');
	if (G.terminalRuntime) {
		G.terminalRuntime.connectedTargetId = null;
		G.terminalRuntime.connectedTargetType = null;
		G.terminalRuntime.connectedTargetLabel = 'NONE';
		G.terminalRuntime.networkStatus = 'DORMANT';
	}
	log('DISCONNECT. Biegiem do wyjscia.');
	completeMainHack();
}

// ─────────────────────────────────────────────────────────────────────────────
// ABORT / FAIL
// ─────────────────────────────────────────────────────────────────────────────

export function handleAbortBreach(log = logBreachLine) {
	const state = ensureMainBreachState();
	// If vault is open, abort means disconnect with no loot (same as disconnect but without completeMainHack)
	if (state.filesystemUnlocked) {
		log('Vault otwarty — uzyj disconnect/dc zamiast abort.');
		return false;
	}
	// Restore BW max after breach
	if (state.originalMbw > 0) {
		G.P.mbw = state.originalMbw;
	}

	state.breachActive = false;
	G.breachActive = false;
	G.hackingMain = false;
	setTerminalContext('normal');
	if (G.terminalRuntime) {
		G.terminalRuntime.networkStatus = 'DORMANT';
	}
	log('BREACH PRZERWANY. POSTEP ZAPISANY.');
	return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// TICK
// ─────────────────────────────────────────────────────────────────────────────

export function tickNetworkBreach(now = Date.now(), dtSeconds = 1 / 60) {
	const state = ensureMainBreachState();

	// ICE battle tick (ICE active, not yet defeated)
	if (state.breachActive && !state.breachFailed && state.authBypassed && !state.iceDefeated) {
		// Fire ICE counterattack timer
		if (now >= state.iceNextAttack && state.iceAttackInterval > 0) {
			triggerICECounterattack(state, logBreachLine);
		}

		// Apply DoT ticks
		state.iceDoTTicks = state.iceDoTTicks.filter((tick) => {
			if (now >= tick.at) {
				let dmg = tick.damage;
				if (state.iceShieldLayers.includes('armor')) dmg = Math.round(dmg * 0.30);
				state.iceHp = Math.max(0, state.iceHp - dmg);
				logBreachLine(`WORM DOT: ICE HP ${state.iceHp}/${state.iceMaxHp} (-${dmg})`);
				if (state.iceShieldLayers.includes('reflect')) {
					const reflectTrace = Math.round(dmg * 0.30);
					addTrace(reflectTrace, 'ice_reflect');
					logBreachLine(`[REFLECT] +${reflectTrace} TRACE`);
				}
				checkICEPhaseTransition(state, logBreachLine);
				if (state.iceHp <= 0) {
					logBreachLine('ICE GUARDIAN KRYTYCZNIE USZKODZONY. Uzyj CORE by zakonczyc.');
				}
				return false;
			}
			return true;
		});

		// Process telegraphed lockout
		if (state.iceIncomingLockout && now >= state.iceIncomingLockout.at) {
			if (state.iceSandboxed) {
				state.iceSandboxed = false;
				logBreachLine('ICE LOCKOUT ZABLOKOWANY przez SANDBOX.');
			} else {
				for (const id of state.iceIncomingLockout.targets) {
					state.actionLockedUntil[id] = now + 5000;
				}
				logBreachLine(`ICE LOCKOUT AKTYWNY: ${state.iceIncomingLockout.targets.join(', ')} zablokowane na 5s.`);
			}
			state.iceIncomingLockout = null;
		}

		// BW overflow drain — idle penalty after 8s inactivity
		if (state.lastActionAt > 0 && (now - state.lastActionAt) > 8000) {
			G.P.bw = Math.max(0, (G.P.bw || 0) - 5 * dtSeconds);
			if (now >= (state.overflowDrainNextLog || 0)) {
				logBreachLine(`[OVERFLOW] ICE drenuje BW: ${Math.floor(G.P.bw)} pozostalo. Dzialaj!`);
				state.overflowDrainNextLog = now + 1000;
			}
		}

		// Trace over 100 = fail
		if (G.traceRuntime && G.traceRuntime.value >= 100) {
			failNetworkBreach();
		}
	}

	// Vault timer tick (after ICE defeated, vault open)
	if (state.filesystemUnlocked && !state.vaultTimerExpired && state.vaultTimerStart > 0) {
		const remaining = (state.vaultTimerStart + state.vaultTimerDuration) - now;
		if (remaining <= 0) {
			state.vaultTimerExpired = true;
			state.filesystemFiles = null;
			state.filesystemIntelFiles = [];
			logBreachLine('VAULT LOCKDOWN — systemy alarmowe przywrocone. PLIKI NIEDOSTEPNE.');
			logBreachLine('Kredyty sa wciaz dostepne via transfer funds. Uzyj disconnect.');
		} else if (!state.vaultWarned10 && remaining <= 10000) {
			state.vaultWarned10 = true;
			logBreachLine(`[VAULT] UWAGA: ${Math.ceil(remaining / 1000)}s do lockdownu!`);
		} else if (!state.vaultWarned20 && remaining <= 20000) {
			state.vaultWarned20 = true;
			logBreachLine(`[VAULT] ${Math.ceil(remaining / 1000)}s do lockdownu — spieszcie sie!`);
		}
	}
}

export function failNetworkBreach() {
	const state = ensureMainBreachState();

	// Undo any pending grants on fail (same logic as disconnect without exfil)
	if (state.filesystemPendingContactId) {
		if (G.hub?.contacts) {
			G.hub.contacts = G.hub.contacts.filter((c) => c.id !== state.filesystemPendingContactId);
		}
		G.mainHackContactReward = null;
	}
	if (state.filesystemPendingFragmentId) {
		if (G.hub?.dataFragments?.collected) {
			G.hub.dataFragments.collected = G.hub.dataFragments.collected.filter(
				(id) => id !== state.filesystemPendingFragmentId,
			);
		}
		G.mainHackFragmentReward = null;
	}

	// Restore BW max after breach
	if (state.originalMbw > 0) {
		G.P.mbw = state.originalMbw;
	}

	state.breachFailed = true;
	state.breachActive = false;
	G.breachActive = false;
	G.breachFailed = true;
	G.hackingMain = false;
	setTerminalContext('normal');
	handleMainHackFailure();
}

export function noteMainBreachShardAvailable() {
	if (G.mainTerminalAuth) {
		G.mainTerminalAuth.unlocked = true;
	}
}