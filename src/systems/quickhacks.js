import { G, byType } from '../core/state.js';
import { TILE_TYPES } from '../core/constants.js';
import { clamp } from '../utils/math.js';
import { log, floatMsg, rebuildList } from './ui.js';
import { addTerminalHeat, openDetectionTerminal, closeDetectionTerminal } from './terminalRuntime.js';

const QUICK_HACK_WINDOW_MS = 6000;
const QUICK_HACK_TIME_SCALE = 0.35;

const QUICK_HACKS = {
	optics: {
		id: 'optics',
		name: 'Reset optyki',
		desc: 'Oslepia cel na 10s',
		bw: 32,
		price: 0,
	},
	motorics: {
		id: 'motorics',
		name: 'Reset motoryki',
		desc: 'Spowalnia cel o 75% na 10s',
		bw: 38,
		price: 0,
	},
	neural: {
		id: 'neural',
		name: 'Przeladowanie neuralne',
		desc: '5s sabotazu systemu',
		bw: 58,
		price: 950,
	},
	ddos: {
		id: 'ddos',
		name: 'DDoS systemu',
		desc: 'Cel przestaje istniec',
		bw: 82,
		price: 1450,
	},
	ghostmesh: {
		id: 'ghostmesh',
		name: 'GhostMesh',
		desc: 'Dezintegruje pościg i obniża alert',
		bw: 42,
		price: 780,
	},
	silencer: {
		id: 'silencer',
		name: 'Silencer',
		desc: 'Ucicha alarmy i sygnały kamer',
		bw: 46,
		price: 880,
	},
	lagspike: {
		id: 'lagspike',
		name: 'LagSpike',
		desc: 'Przeciąża target i wydłuża jego recovery',
		bw: 52,
		price: 1080,
	},
	mirrorloop: {
		id: 'mirrorloop',
		name: 'MirrorLoop',
		desc: 'Wysyła fałszywe pingi i gubi przeciwnika',
		bw: 44,
		price: 820,
	},
};

let uiBound = false;

export function grantQuickHack(id, amount = 1) {
	if (!G.quickHacks || !QUICK_HACKS[id]) {
		return false;
	}

	G.quickHacks[id] = (G.quickHacks[id] || 0) + amount;
	const def = QUICK_HACKS[id];
	log(`Pobrano szybki hack: ${def.name} (+${amount})`, 'ok');
	floatMsg(`+${def.name.toUpperCase()}`, G.P, '#ffd700');
	rebuildList();
	return true;
}

export function getQuickHackDefinitions() {
	return Object.values(QUICK_HACKS);
}

export function getQuickHackDefinition(id) {
	return QUICK_HACKS[id] || null;
}

export function getEquippedQuickHackIds() {
	if (!Array.isArray(G.quickHackLoadout)) {
		return [];
	}

	return G.quickHackLoadout
		.filter((id) => QUICK_HACKS[id])
		.slice(0, 4);
}

export function buyQuickHackCatalogItem(id) {
	const def = QUICK_HACKS[id];
	if (!def || !G.P) {
		return { success: false, message: 'Nieznany hack.' };
	}

	if (G.quickHackCatalogOwned?.[id]) {
		return { success: false, message: 'Hack juz odblokowany.' };
	}

	if (G.P.cr < def.price) {
		return { success: false, message: 'Za malo kredytow.' };
	}

	G.P.cr -= def.price;
	G.quickHackCatalogOwned[id] = true;
	if (typeof G.quickHacks[id] !== 'number') {
		G.quickHacks[id] = 0;
	}
	log(`Odblokowano hack: ${def.name} (¥${def.price})`, 'ok');
	return { success: true };
}

export function equipQuickHackInSlot(slotIndex, id) {
	const def = QUICK_HACKS[id];
	if (!def) {
		return { success: false, message: 'Nieznany hack.' };
	}

	if (!G.quickHackCatalogOwned?.[id]) {
		return { success: false, message: 'Hack nieodblokowany.' };
	}

	if (!Array.isArray(G.quickHackLoadout)) {
		G.quickHackLoadout = ['optics', 'motorics', 'neural', 'ddos'];
	}

	if (slotIndex < 0 || slotIndex >= 4) {
		return { success: false, message: 'Nieprawidlowy slot.' };
	}

	const existingIndex = G.quickHackLoadout.findIndex((value) => value === id);
	if (existingIndex >= 0 && existingIndex !== slotIndex) {
		const current = G.quickHackLoadout[slotIndex];
		G.quickHackLoadout[slotIndex] = id;
		G.quickHackLoadout[existingIndex] = current;
		return { success: true, swapped: true };
	}

	G.quickHackLoadout[slotIndex] = id;
	return { success: true, swapped: false };
}

export function startQuickHackWindow(guardId) {
	if (!G.P || G.quickHackWindow?.active) {
		return;
	}

	G.quickHackWindow = {
		active: true,
		targetGuardId: guardId,
		timerMs: QUICK_HACK_WINDOW_MS,
		durationMs: QUICK_HACK_WINDOW_MS,
		freezeGame: false,
	};

	openDetectionTerminal(guardId);
}

export function tickQuickHackWindow(dt) {
	if (!G.quickHackWindow?.active) {
		return;
	}

	G.quickHackWindow.timerMs = Math.max(0, G.quickHackWindow.timerMs - dt);

	// Aktualizuj pasek detekcji w terminalu
	if (G.dom.detectTimerFill) {
		const ratio = G.quickHackWindow.durationMs > 0
			? G.quickHackWindow.timerMs / G.quickHackWindow.durationMs
			: 0;
		G.dom.detectTimerFill.style.width = `${Math.max(0, ratio) * 100}%`;
	}

	if (G.quickHackWindow.timerMs <= 0) {
		G.quickHackWindow.active = false;
		closeDetectionTerminal();
		log('Okno awaryjne wygaslo', 'w');
		return;
	}
}

export function getTimeScale() {
	return G.quickHackWindow?.active ? QUICK_HACK_TIME_SCALE : 1;
}

export function resetQuickHackState() {
	if (G.quickHackWindow) {
		G.quickHackWindow.active = false;
		G.quickHackWindow.timerMs = 0;
		G.quickHackWindow.durationMs = 0;
		G.quickHackWindow.targetGuardId = null;
		G.quickHackWindow.freezeGame = false;
	}

	G.paused = false;
	closeDetectionTerminal();
	hideQuickHackUI();
}

export function useQuickHack(id) {
	if (!G.quickHackWindow?.active) {
		return false;
	}

	const def = QUICK_HACKS[id];

	if (!def) {
		return false;
	}

	if (!G.quickHacks[id]) {
		log(`Brak ladunkow: ${def.name}`, 'w');
		return false;
	}

	if (G.P.bw < def.bw) {
		log(`Za malo BW na ${def.name} (${def.bw})`, 'w');
		return false;
	}

	const target = resolveQuickHackTarget();

	if ((id === 'optics' || id === 'motorics' || id === 'ddos' || id === 'ghostmesh' || id === 'lagspike' || id === 'mirrorloop') && !target) {
		log('Brak aktywnego celu dla szybkiego hacka', 'w');
		return false;
	}

	G.P.bw -= def.bw;
	G.quickHacks[id] -= 1;
	addTerminalHeat(getQuickHackHeatCost(id), `quickhack:${id}`);

	if (id === 'optics') {
		target.opticsOfflineT = 10000;
		if (target.state === 'chase') {
			target.state = 'search';
			target.detect = 0;
			target.searchTimer = 0;
			target.lastSeen = null;
		}
		floatMsg('OPTICS RESET', target, '#00ff9f');
		log(`${def.name} aktywny na ${target.desc}`, 'ok');
	} else if (id === 'motorics') {
		target.motoricsResetT = 10000;
		floatMsg('MOTORICS RESET', target, '#ffd700');
		log(`${def.name} aktywny na ${target.desc}`, 'ok');
	} else if (id === 'neural') {
		triggerNeuralOverload(target);
		log('Przeladowanie neuralne aktywne', 'ok');
	} else if (id === 'ddos') {
		target.dead = true;
		target.offline = true;
		target.bodyReported = true;
		floatMsg('NULL', target, '#ff3a5c');
		log(`DDoS usunal ${target.desc}`, 'ok');
	} else if (id === 'ghostmesh') {
		target.opticsOfflineT = Math.max(target.opticsOfflineT || 0, 8000);
		target.motoricsResetT = Math.max(target.motoricsResetT || 0, 7000);
		if (target.state === 'chase') {
			target.state = 'search';
			target.detect = 0;
			target.lastSeen = null;
		}
		G.alert = clamp(G.alert - 10);
		floatMsg('GHOSTMESH', target, '#7cc8ff');
		log('GhostMesh aktywny - sygnatura rozmyta', 'ok');
	} else if (id === 'silencer') {
		G.cameraAlertTimer = 0;
		G.alert = clamp(G.alert - 14);
		for (const camera of byType('cam')) {
			camera.hacked = true;
		}
		floatMsg('SILENCER', G.P, '#b6ffe2');
		log('Silencer wycisza alarmy i kamery', 'ok');
	} else if (id === 'lagspike') {
		target.motoricsResetT = Math.max(target.motoricsResetT || 0, 13000);
		target.stunT = Math.max(target.stunT || 0, 1800);
		floatMsg('LAGSPIKE', target, '#ffd98a');
		log(`LagSpike destabilizuje ${target.desc}`, 'ok');
	} else if (id === 'mirrorloop') {
		target.state = 'search';
		target.detect = 0;
		target.searchTimer = 0;
		target.lastSeen = null;
		if (Array.isArray(target.patrol) && target.patrol.length) {
			target.pi = (target.pi + 1) % target.patrol.length;
		}
		floatMsg('MIRROR LOOP', target, '#e4a6ff');
		log(`${target.desc} gubi trop przez MirrorLoop`, 'ok');
	}

	G.quickHackWindow.active = false;
	G.paused = false;
	hideQuickHackUI();
	rebuildList();
	return true;
}

function getQuickHackHeatCost(id) {
	if (id === 'ddos') {
		return 24;
	}
	if (id === 'neural') {
		return 20;
	}
	if (id === 'lagspike') {
		return 16;
	}
	if (id === 'mirrorloop') {
		return 12;
	}
	if (id === 'ghostmesh' || id === 'silencer') {
		return 8;
	}
	if (id === 'optics' || id === 'motorics') {
		return 10;
	}
	return 10;
}

function triggerNeuralOverload(target) {
	const origin = target || G.P;
	const blackoutMs = 9000;

	for (const camera of byType('cam')) {
		camera.hacked = true;
	}

	for (const guard of byType('guard')) {
		if (!guard.dead) {
			guard.dead = true;
			guard.bodyReported = true;
		}
	}

	for (const technician of byType('tech')) {
		if (!technician.dead) {
			technician.dead = true;
			technician.state = 'dead';
		}
	}

	for (const door of G.doors) {
		door.open = true;
		G.tiles[door.y][door.x] = TILE_TYPES.DOOR_OPEN;
	}

	G.neuralOverloadT = blackoutMs;
	G.blackout = true;
	G.boT = Math.max(Number.isFinite(G.boT) ? G.boT : 0, blackoutMs);
	G.cameraAlertTimer = 0;
	G.alert = clamp(G.alert - 12);
	floatMsg('NEURAL OVERLOAD', origin, '#ff3a5c');
}

function resolveQuickHackTarget() {
	const targetId = G.quickHackWindow?.targetGuardId;
	let target = byType('guard').find((guard) => guard.id === targetId && !guard.dead);

	if (target) {
		return target;
	}

	target = byType('guard').find((guard) => !guard.dead && guard.state === 'chase');

	if (target) {
		return target;
	}

	return byType('guard').find((guard) => !guard.dead) || null;
}

function bindQuickHackUIEvents() {
	if (uiBound || !G.dom.quickHackChoices) {
		return;
	}

	uiBound = true;
	G.dom.quickHackChoices.addEventListener('click', (event) => {
		const button = event.target.closest('button[data-qh-id]');

		if (!button) {
			return;
		}

		if (button.disabled) {
			return;
		}

		useQuickHack(button.dataset.qhId);
	});
}

function showQuickHackUI() {
	if (!G.dom.quickHackPanel || !G.dom.quickHackChoices || !G.dom.quickHackTimerFill) {
		return;
	}

	bindQuickHackUIEvents();

	if (!G.quickHackWindow?.active) {
		hideQuickHackUI();
		return;
	}

	G.dom.quickHackPanel.classList.add('show');
	G.dom.quickHackPanel.style.pointerEvents = 'auto';
}

function renderQuickHackTimer() {
	if (!G.dom.quickHackTimerFill) {
		return;
	}

	if (!G.quickHackWindow?.active) {
		G.dom.quickHackTimerFill.style.width = '0%';
		return;
	}

	const ratio = G.quickHackWindow.durationMs > 0 ? G.quickHackWindow.timerMs / G.quickHackWindow.durationMs : 0;
	G.dom.quickHackTimerFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}

function renderQuickHackChoices() {
	if (!G.dom.quickHackChoices || !G.P) {
		return;
	}

	bindQuickHackUIEvents();

	G.dom.quickHackChoices.innerHTML = '';

	const equipped = getEquippedQuickHackIds();

	for (const hackId of equipped) {
		const hack = QUICK_HACKS[hackId];
		if (!hack) {
			continue;
		}

		const count = G.quickHacks?.[hack.id] || 0;
		const canUse = count > 0 && G.P && G.P.bw >= hack.bw;
		const button = document.createElement('button');
		button.type = 'button';
		button.dataset.qhId = hack.id;
		button.disabled = !canUse;
		button.innerHTML = `<span>${hack.name}</span><span>x${count} | BW:${hack.bw}</span>`;
		G.dom.quickHackChoices.appendChild(button);
	}
}

function hideQuickHackUI() {
	if (!G.dom.quickHackPanel || !G.dom.quickHackTimerFill || !G.dom.quickHackChoices) {
		return;
	}

	G.dom.quickHackPanel.classList.remove('show');
	G.dom.quickHackPanel.style.pointerEvents = 'none';
	G.dom.quickHackChoices.innerHTML = '';
	G.dom.quickHackTimerFill.style.width = '0%';
}
