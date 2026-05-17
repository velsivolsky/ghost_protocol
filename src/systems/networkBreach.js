import { G } from '../core/state.js';
import { completeMainHack, handleMainHackFailure } from './mission.js';

const BREACH_ACTIONS = [
	{ id: 'crack', name: 'CRACK', cpu: 10, ram: 0, trace: 3, desc: 'Bezpośredni crack exploitu.', tip: 'Niski koszt i stabilny baseline.', isLight: false, price: 0 },
	{ id: 'suppress', name: 'SUPPRESS', cpu: 14, ram: 10, trace: -12, desc: 'Tłumi TRACE DAEMON.', tip: 'Defensywny reset presji.', isLight: true, price: 0 },
	{ id: 'worm', name: 'WORM', cpu: 12, ram: 12, trace: 3, desc: 'Virus DOT. Mocny na FIREWALL.', tip: 'Narzędzie pod burst.', isLight: false, price: 0 },
	{ id: 'overload', name: 'OVERLOAD', cpu: 24, ram: 6, trace: 10, desc: 'Power burst. Bardzo ryzykowny.', tip: 'Wysokie obrażenia i wysoki hałas.', isLight: false, price: 0 },
	{ id: 'core', name: 'PRZEJMIJ RDZEN', cpu: 18, ram: 12, trace: 7, desc: 'Konczy walke przez przejecie node.', tip: 'Stary finisher flow.', isLight: false, price: 0 },
	{ id: 'jammer', name: 'PACKET JAMMER', cpu: 9, ram: 10, trace: -8, desc: 'Blokuje TRACKED na 1 ture.', tip: 'Stabilizator ruchu.', isLight: true, price: 880 },
	{ id: 'shred', name: 'ARMOR SHRED', cpu: 15, ram: 8, trace: 4, desc: 'Rozrywa armor i otwiera cel.', tip: 'Przygotowanie pod burst.', isLight: false, price: 1060 },
	{ id: 'sandbox', name: 'SANDBOX', cpu: 16, ram: 14, trace: -4, desc: 'Wycisza BLACK ICE trigger.', tip: 'Ratuje przy wysokim TRACE.', isLight: true, price: 1220 },
	{ id: 'cacheburst', name: 'CACHE BURST', cpu: 6, ram: 0, trace: 6, desc: 'Natychmiastowy zastrzyk CPU/RAM.', tip: 'Tempo teraz, koszt potem.', isLight: true, price: 980 },
];

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
		firewallCracked: false,
		authProbed: false,
		authBypassed: false,
		credsUploaded: false,
		uploadSlots: { slot_A: false, slot_B: false, slot_C: false },
		activeUploads: {},
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

function normalizeSlotName(slot) {
	const value = String(slot || '').trim().toLowerCase();
	if (value === 'a' || value === 'slota' || value === 'slot_a') return 'slot_A';
	if (value === 'b' || value === 'slotb' || value === 'slot_b') return 'slot_B';
	if (value === 'c' || value === 'slotc' || value === 'slot_c') return 'slot_C';
	return '';
}

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
	const uploadsDone = Object.values(state.uploadSlots).filter(Boolean).length;
	if (state.phase === 0) {
		logBreachLine('MAIN NODE ONLINE. WARSTWA FIREWALL GOTOWA.');
	} else if (state.phase === 1) {
		logBreachLine('MAIN NODE ONLINE. AUTH LOCK JUZ ODSLONIETY.');
	} else if (state.phase === 2) {
		logBreachLine(`MAIN NODE ONLINE. UPLOADY W TOKU [${uploadsDone}/3].`);
	} else {
		logBreachLine('MAIN NODE JUZ PRZEJETY.');
	}
}

export function handleCrackIce(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (state.phase > 0) {
		log('FIREWALL JUZ ZLAMANY.');
		return false;
	}
	state.firewallCracked = true;
	state.phase = 1;
	setMainHackStep(1);
	if (!state.passiveTraceBonusApplied) {
		G.traceRuntime.passivePerSec += 0.6;
		state.passiveTraceBonusApplied = true;
	}
	if (G.terminalRuntime) {
		G.terminalRuntime.networkStatus = 'WATCHDOG_AWAKE';
	}
	log('FIREWALL.ICE ZLAMANY. TRACE ROSNIE SZYBCIEJ.');
	return true;
}

export function handleProbeLock(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (state.phase < 1) {
		log('NAJPIERW CRACK ICE.');
		return false;
	}
	state.authProbed = true;
	const credsReady = G.mainTerminalAuth?.unlocked || unlockedShardCount() > 0;
	log(`AUTH.LOCK ZESKANOWANY. ${credsReady ? 'CREDS GOTOWE.' : 'POTRZEBNY SHARD Z SIDE TERMINALI.'}`);
	return true;
}

function openAuthLock() {
	const terminal = terminalState();
	if (terminal) {
		terminal.scrambleUntil = Date.now() + 12000;
		terminal.networkStatus = 'COUNTER_INTRUSION';
	}
}

export function handleInjectBypass(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (state.phase < 1 || !state.authProbed) {
		log('NAJPIERW PROBE LOCK.');
		return false;
	}
	state.authBypassed = true;
	state.credsUploaded = false;
	state.phase = 2;
	setMainHackStep(2);
	openAuthLock();
	log('BYPASS WPUSZCZONY. SZUM NA 12S.');
	return true;
}

export function handleUploadCreds(log = logBreachLine) {
	const state = ensureMainBreachState();
	if (state.phase < 1 || !state.authProbed) {
		log('NAJPIERW PROBE LOCK.');
		return false;
	}
	if (unlockedShardCount() <= 0) {
		log('BRAK SHARDA Z SIDE TERMINALI.');
		return false;
	}
	state.authBypassed = true;
	state.credsUploaded = true;
	state.phase = 2;
	setMainHackStep(2);
	openAuthLock();
	log('CREDS WGRANE. SZUM NA 12S.');
	return true;
}

export function handleUploadPayload(slot, log = logBreachLine) {
	const state = ensureMainBreachState();
	const normalizedSlot = normalizeSlotName(slot);
	if (state.phase < 2 || !(state.authBypassed || state.credsUploaded)) {
		log('NAJPIERW OMIJ AUTH.LOCK.');
		return false;
	}
	if (!normalizedSlot) {
		log('PODAJ SLOT: slot_A, slot_B, slot_C.');
		return false;
	}
	if (state.uploadSlots[normalizedSlot]) {
		log(`SLOT ${normalizedSlot} JUZ ZAJETY.`);
		return false;
	}
	if (state.activeUploads[normalizedSlot]) {
		log(`UPLOAD DO ${normalizedSlot} JUZ TRWA.`);
		return false;
	}
	state.activeUploads[normalizedSlot] = { startedAt: Date.now(), endsAt: Date.now() + 10000 };
	setMainHackStep(2);
	if (G.terminalRuntime) {
		G.terminalRuntime.networkStatus = 'HUNTER_RESPONSE';
	}
	log(`UPLOAD PAYLOAD DO ${normalizedSlot} START. 10S.`);
	return true;
}

export function handleAbortBreach(log = logBreachLine) {
	const state = ensureMainBreachState();
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

export function tickNetworkBreach(now = Date.now(), dtSeconds = 1 / 60) {
	const state = ensureMainBreachState();
	if (!state.breachActive || state.breachFailed || state.completed || state.phase < 2) {
		return;
	}
	const activeSlots = Object.keys(state.activeUploads);
	if (activeSlots.length > 0 && G.terminalRuntime) {
		G.terminalRuntime.networkStatus = 'HUNTER_RESPONSE';
		G.traceRuntime.value = Math.min(100, G.traceRuntime.value + 3 * activeSlots.length * dtSeconds);
	}
	if (G.traceRuntime.value >= 100) {
		failNetworkBreach();
		return;
	}
	for (const slot of activeSlots) {
		const upload = state.activeUploads[slot];
		if (!upload) continue;
		if (G.traceRuntime.value > 85) {
			delete state.activeUploads[slot];
			logBreachLine(`UPLOAD ${slot} PRZERWANY. TRACE ZBYT WYSOKI.`);
			continue;
		}
		if (now >= upload.endsAt) {
			delete state.activeUploads[slot];
			state.uploadSlots[slot] = true;
			const doneCount = Object.values(state.uploadSlots).filter(Boolean).length;
			G.hackProgress = doneCount / 3;
			logBreachLine(`UPLOAD ${slot} ZAKONCZONY [${doneCount}/3].`);
			if (doneCount === 3) {
				state.completed = true;
				state.breachActive = false;
				G.breachActive = false;
				G.hackingMain = false;
				G.mainHacked = true;
				if (G.terminalRuntime) {
					G.terminalRuntime.mainPayloadUploaded = true;
				}
				setTerminalContext('normal');
				setMainHackStep(3);
				completeMainHack();
				logBreachLine('MAIN NODE PRZEJETY. RDZEN OTWARTY.');
			}
		}
	}
}

export function failNetworkBreach() {
	const state = ensureMainBreachState();
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