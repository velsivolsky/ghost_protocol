import { G } from '../core/state.js';
import { hideMainHackLoading, log } from './ui.js';
import { completeMainHack, handleMainHackFailure } from './mission.js';

// ============================================================================
// BALANCE & CONFIGURATION
// ============================================================================

const BALANCE = {
	// Base economy
	startTrace: 10,
	passiveTracePerTurn: 1,
	trackedTraceBonus: 3,
	cpuRegen: 18,
	ramRegen: 14,
	// Black ICE threshold
	blackIceTraceThreshold: 92,
	blackIceTurnThreshold: 11,
	maxEnemyArmor: 10,
	// TRACE thresholds - gameplay cascades
	traceGlitchThreshold: 25,
	traceEscalationThreshold: 50,
	traceWarningThreshold: 75,
	tracePanicThreshold: 90,
	// Stealth/decay mechanics
	stealthTurnsForDecay: 2,
	traceDecayPerTurn: 1,
	// Synergy cooldown
	lastActionCooldown: 2,
	// Spam penalty
	spamThresholdRepeats: 3,
	spamPenaltyAdaptArmorPerRepeat: 1,
	// Overclock
	overclock: { cpuSpike: 40, ramSpike: 20, traceCost: 45 },
};

// ============================================================================
// NODE MODIFIERS - Change gameplay per breach attempt
// ============================================================================

const NODE_MODIFIER_PRESETS = {
	corrupted: {
		name: 'CORRUPTED SECTOR',
		desc: 'WORM jest silniejszy',
		effects: {
			wormBaseDamageMult: 1.4,
			wormInfectedDuration: 1,
		},
	},
	military: {
		name: 'MILITARY NETWORK',
		desc: 'OVERLOAD generuje więcej TRACE',
		effects: {
			overloadTraceMult: 1.5,
			overloadStunChance: 0.6,
		},
	},
	silent: {
		name: 'SILENT NODE',
		desc: 'Pasywny TRACE rośnie wolniej',
		effects: {
			passiveTraceMult: 0.65,
			daemonTraceReduction: 3,
		},
	},
	broken: {
		name: 'BROKEN INFRASTRUCTURE',
		desc: 'Wysoka regen dla obu stron',
		effects: {
			cpuRegenMult: 1.3,
			ramRegenMult: 1.3,
			daemonTraceIncrease: 2,
		},
	},
};

// ============================================================================
// HACK LEVELS - Player skill progression with credits
// ============================================================================

function getHackLevels() {
	// Initialize if not exists
	if (!G.hackLevels) {
		G.hackLevels = {
			crack: 1,
			suppress: 1,
			worm: 1,
			overload: 1,
			core: 1,
		};
	}
	return G.hackLevels;
}

function getHackLevelBonus(hackId) {
	const levels = getHackLevels();
	const level = levels[hackId] || 1;
	return (level - 1) * 0.15; // 15% bonus per level (level 2 = +15%, level 3 = +30%, etc)
}

const BREACH_ACTIONS = [
	{
		id: 'crack',
		name: 'CRACK',
		cpu: 10,
		ram: 0,
		trace: 3,
		baseDamage: 24,
		armorPierce: 0.15,
		desc: 'Bezpośredni crack exploitu.',
		tip: 'Niski koszt i dobry baseline. Najlepszy na Sentinel. Bonus po SUPPRESS.',
		isLight: false,
		synergy: { after: 'suppress', traceMult: 0.5, critChance: 0.4 },
	},
	{
		id: 'suppress',
		name: 'SUPPRESS',
		cpu: 14,
		ram: 10,
		trace: -12,
		desc: 'Tłumi TRACE DAEMON.',
		tip: 'Obniża TRACE i osłabia DAEMON na 1 turę. Lekka akcja - nie kończy tury.',
		isLight: true,
		targetSpecific: 'daemon',
		suppressPower: 0.6,
	},
	{
		id: 'worm',
		name: 'WORM',
		cpu: 12,
		ram: 12,
		trace: 3,
		baseDamage: 12,
		armorPierce: 0.35,
		desc: 'DOT i presja na tanki.',
		tip: 'Naklada INFECTED. Synergizuje z OVERLOAD na infekowanym celu.',
		isLight: false,
		synergy: { after: 'overload', infectBonus: 0.4, stunChance: 0.55 },
	},
	{
		id: 'overload',
		name: 'OVERLOAD',
		cpu: 24,
		ram: 6,
		trace: 10,
		baseDamage: 52,
		armorPierce: 0.45,
		desc: 'Burst risk/reward.',
		tip: 'Wysokie obrazenia, szansa na STUN. Jeli przed tym byl WORM, bonus damage.',
		isLight: false,
	},
	{
		id: 'core',
		name: 'PRZEJMIJ RDZEN',
		cpu: 18,
		ram: 12,
		trace: 7,
		desc: 'Finisher objective.',
		tip: 'Atakuje rdzen. FIREWALL musi byc zaraz zabitym, rdzen musi byc destabilizowany.',
		isLight: false,
		phaseRequirement: true,
		price: 0,
	},
	{
		id: 'jammer',
		name: 'PACKET JAMMER',
		cpu: 9,
		ram: 10,
		trace: -8,
		desc: 'Blokuje TRACKED z DAEMON/BLACK ICE na 1 ture.',
		tip: 'Defensywny stabilizator. Najlepszy przy wysokim TRACE.',
		isLight: true,
		price: 880,
	},
	{
		id: 'shred',
		name: 'ARMOR SHRED',
		cpu: 15,
		ram: 8,
		trace: 4,
		baseDamage: 16,
		armorPierce: 0.8,
		desc: 'Rozrywa armor i naklada EXPOSED x2.',
		tip: 'Przygotowanie pod CRACK/OVERLOAD.',
		isLight: false,
		price: 1060,
	},
	{
		id: 'sandbox',
		name: 'SANDBOX',
		cpu: 16,
		ram: 14,
		trace: -4,
		desc: 'Wycisza BLACK ICE special trigger na 1 ture.',
		tip: 'Ratuje runy przy trace 80+.',
		isLight: true,
		price: 1220,
	},
	{
		id: 'cacheburst',
		name: 'CACHE BURST',
		cpu: 6,
		ram: 0,
		trace: 6,
		desc: 'Natychmiastowy zastrzyk CPU/RAM, ale dług TRACE.',
		tip: 'Tempo teraz, koszt potem.',
		isLight: true,
		price: 980,
	},
];

const DEFAULT_BREACH_LOADOUT = ['crack', 'suppress', 'worm', 'overload'];

function ensureBreachCatalogState() {
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

export function getBreachActionDefinitions() {
	return BREACH_ACTIONS;
}

export function getEquippedBreachActions() {
	ensureBreachCatalogState();
	const picked = G.breachActionLoadout
		.filter((id) => G.breachActionCatalogOwned[id])
		.map((id) => BREACH_ACTIONS.find((action) => action.id === id))
		.filter(Boolean)
		.slice(0, 4);

	if (picked.length) {
		return picked;
	}

	return DEFAULT_BREACH_LOADOUT
		.map((id) => BREACH_ACTIONS.find((action) => action.id === id))
		.filter(Boolean);
}

export function buyBreachAction(id) {
	ensureBreachCatalogState();
	const action = BREACH_ACTIONS.find((entry) => entry.id === id);
	if (!action) {
		return { success: false, message: 'Nieznana akcja.' };
	}

	if (G.breachActionCatalogOwned[id]) {
		return { success: false, message: 'Akcja juz odblokowana.' };
	}

	if ((action.price || 0) <= 0) {
		G.breachActionCatalogOwned[id] = true;
		return { success: true };
	}

	if (!G.P || G.P.cr < action.price) {
		return { success: false, message: 'Za malo kredytow.' };
	}

	G.P.cr -= action.price;
	G.breachActionCatalogOwned[id] = true;
	return { success: true };
}

export function equipBreachActionInSlot(slotIndex, id) {
	ensureBreachCatalogState();
	const action = BREACH_ACTIONS.find((entry) => entry.id === id);
	if (!action) {
		return { success: false, message: 'Nieznana akcja.' };
	}

	if (!G.breachActionCatalogOwned[id]) {
		return { success: false, message: 'Akcja nieodblokowana.' };
	}

	if (slotIndex < 0 || slotIndex >= 4) {
		return { success: false, message: 'Nieprawidlowy slot.' };
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

// ============================================================================
// ENEMIES - WITH DETAILED MECHANICS
// ============================================================================

const ENEMY_PRESETS = {
	firewall: {
		type: 'firewall',
		name: 'FIREWALL',
		role: 'Tank / Support',
		desc: 'Chroni siec i wspiera aliantow.',
		hp: 92,
		armor: 6,
		// Role-specific mechanics
		mechanics: {
			supportedAlly: null, // dynamically assigned
			shieldAmount: 0,
			armorPerTurn: 1,
		},
	},
	daemon: {
		type: 'daemon',
		name: 'TRACE DAEMON',
		role: 'Utility / Pressure',
		desc: 'Amplifikuje detekcje i karzy agresje.',
		hp: 64,
		armor: 2,
		mechanics: {
			traceGainMult: 1.2,
			trackedChance: 0.4,
			tracePerTurn: 5,
		},
	},
	sentinel: {
		type: 'sentinel',
		name: 'ICE SENTINEL',
		role: 'Skirmisher / Economy',
		desc: 'Niszczy zasoby gracza.',
		hp: 74,
		armor: 3,
		mechanics: {
			cpuDrainPerTurn: 9,
			ramDrainPerTurn: 5,
			cpuRegenBlockChance: 0.3,
			costInflationMult: 0, // Can increase action costs
		},
	},
	blackice: {
		type: 'blackice',
		name: 'BLACK ICE',
		role: 'Boss / Adaptive',
		desc: 'Adaptuje sie i egzekwuje multidebuff.',
		hp: 108,
		armor: 4,
		mechanics: {
			tracePerTurn: 8,
			encryptedChance: 0.35,
			trackedChance: 0.25,
			blockedHacks: [], // last hack used is blocked next turn
			canBlockNextHack: true,
		},
	},
};

// ============================================================================
// STATE & RENDERING
// ============================================================================

let bound = false;
let state = null;
let nodeModifier = null;

export function initNetworkBreachBridge() {
	if (bound) {
		return;
	}
	bound = true;

	if (G.dom.nbActions) {
		G.dom.nbActions.addEventListener('click', onActionClick);
	}

	if (G.dom.nbAbort) {
		G.dom.nbAbort.addEventListener('click', () => {
			if (G.breachActive) {
				finish(false, 'Polaczenie przerwane przez operatora.');
			}
		});
	}

	// Mouse hover highlighting for actions
	if (G.dom.nbActions) {
		G.dom.nbActions.addEventListener('mouseover', (e) => {
			const commandRow = e.target.closest('[data-nb-action]');
			if (commandRow && state) {
				highlightAction(commandRow.dataset.nbAction);
			}
		});
		G.dom.nbActions.addEventListener('mouseout', () => {
			clearActionHighlight();
		});
	}
}

function highlightAction(actionId) {
	const action = getEquippedBreachActions().find((entry) => entry.id === actionId);
	if (!action) return;

	const target = chooseTarget(action);
	if (target && G.dom.nbEnemies) {
		const enemyCard = G.dom.nbEnemies.querySelector(`[data-enemy-id="${target.id}"]`);
		if (enemyCard) {
			enemyCard.classList.add('hover-highlight');
		}
	}
}

function clearActionHighlight() {
	if (G.dom.nbEnemies) {
		G.dom.nbEnemies.querySelectorAll('.hover-highlight').forEach(e => {
			e.classList.remove('hover-highlight');
		});
	}
}

export function resetNetworkBreachState() {
	state = null;
	nodeModifier = null;
	hidePanel();
}

function onActionClick(event) {
	const commandRow = event.target.closest('[data-nb-action]');
	if (!commandRow || !G.breachActive || !state || state.finished || commandRow.classList.contains('disabled')) {
		return;
	}
	runPlayerTurn(commandRow.dataset.nbAction);
}

export function launchNetworkBreach() {
	if (G.breachActive || G.cleared || G.dead) {
		return;
	}

	G.hackingMain = false;
	G.breachActive = true;
	G.paused = true;
	hideMainHackLoading();
	log('SYSTEM: CYBER COMBAT - NETWORK BREACH', 'w');

	// Select random node modifier
	const modifierKeys = Object.keys(NODE_MODIFIER_PRESETS);
	const modifierKey = modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
	nodeModifier = NODE_MODIFIER_PRESETS[modifierKey];

	state = createBreachState();
		showPanel();
		addLine(`NODE TYPE: ${nodeModifier.name} - ${nodeModifier.desc}`);
		addLine('Polaczenie ustanowione. Rozpoczyna sie NETWORK BREACH.');
		renderHelp();
	renderAll();
}

function createBreachState() {
	const firewall = createEnemyInstance(ENEMY_PRESETS.firewall);
	const daemon = createEnemyInstance(ENEMY_PRESETS.daemon);
	const sentinel = createEnemyInstance(ENEMY_PRESETS.sentinel);
	
	// Firewall supports one ally
	firewall.mechanics.supportedAlly = daemon.id;

	const enemies = [firewall, daemon, sentinel];

	return {
		turn: 1,
		core: 100,
		corePhase: 'stable', // stable -> destabilized -> vulnerable
		player: {
			cpu: 100,
			maxCpu: 100,
			ram: 80,
			maxRam: 80,
			trace: BALANCE.startTrace,
			tracked: 0,
			encrypted: 0,
			cloak: 0,
			exposed: 0,
			lastAction: null,
			lastActionTurns: 0,
			spamCount: 0, // tracks repeated same action
			jammerT: 0,
			sandboxT: 0,
			cacheDebtT: 0,
		},
		enemies,
		selectedEnemyId: daemon.id,
		blackIceActive: false,
		finished: false,
		stealthTurns: 0, // turns without aggressive actions
	};
}

function createEnemyInstance(config) {
	return {
		id: `${config.type}-${Math.random().toString(16).slice(2, 8)}`,
		type: config.type,
		name: config.name,
		role: config.role,
		desc: config.desc,
		hp: config.hp,
		maxHp: config.hp,
		armor: config.armor,
		infected: 0,
		infectedPower: 0,
		stunned: 0,
		exposed: 0,
		dead: false,
		mechanics: JSON.parse(JSON.stringify(config.mechanics)), // deep copy
		nextActionIntent: null, // for preview
	};
}

function computeIntentForEnemy(enemy) {
	if (enemy.stunned > 0) return '(STUNNED)';
	if (enemy.type === 'firewall') return 'reinforce armor';
	if (enemy.type === 'daemon') return `+TRACE, ${Math.random() < 0.4 ? 'TRACKED' : 'detect'}`;
	if (enemy.type === 'sentinel') return 'drain CPU/RAM';
	if (enemy.type === 'blackice') return 'raise TRACE, encrypt';
	return '...';
}

// ============================================================================
// PLAYER TURN LOGIC
// ============================================================================

function runPlayerTurn(actionId) {
	const action = getEquippedBreachActions().find((item) => item.id === actionId);
	if (!action) return;

	// Check target requirement (some actions don't need targets)
	const noTargetActions = new Set(['suppress', 'core', 'jammer', 'sandbox', 'cacheburst']);
	const needsTarget = !noTargetActions.has(action.id);
	const target = chooseTarget(action);
	if (needsTarget && !target) {
		addLine('Brak aktywnego celu.', 'warn');
		return;
	}

	// Check core phase requirement
	if (action.id === 'core') {
		if (hasAliveType('firewall')) {
			addLine('FIREWALL chroni rdzen. Najpierw go zneutralizuj.', 'warn');
			return;
		}
		if (state.corePhase === 'stable') {
			addLine('Rdzen jest stabilny. Najpierw go destabilizuj.', 'warn');
			return;
		}
	}

	if (action.id === 'jammer') {
		state.player.trace = Math.max(0, state.player.trace - 6);
		state.player.jammerT = Math.max(state.player.jammerT || 0, 1);
		addTrace(action.trace);
		addLine('PACKET JAMMER aktywny - TRACKED zablokowany na 1 ture.', 'ok');
	}

	if (action.id === 'shred') {
		const damage = computeDamage((action.baseDamage || 14) * (1 + levelBonus), target, action.armorPierce || 0.8);
		target.exposed = Math.max(target.exposed, 2);
		target.armor = Math.max(0, target.armor - 2);
		hurt(target, damage);
		addTrace(action.trace);
		addLine(`ARMOR SHRED rozrywa ${target.name} (${damage} dmg, ARM -2).`, 'ok');
	}

	if (action.id === 'sandbox') {
		state.player.sandboxT = Math.max(state.player.sandboxT || 0, 1);
		state.player.trace = Math.max(0, state.player.trace - 4);
		addTrace(action.trace);
		addLine('SANDBOX aktywny - BLACK ICE trigger stlumiony.', 'ok');
	}

	if (action.id === 'cacheburst') {
		state.player.cpu = Math.min(state.player.maxCpu, state.player.cpu + 28);
		state.player.ram = Math.min(state.player.maxRam, state.player.ram + 18);
		state.player.cacheDebtT = Math.max(state.player.cacheDebtT || 0, 2);
		addTrace(action.trace);
		addLine('CACHE BURST: +CPU/+RAM, ale narasta opozniony TRACE debt.', 'warn');
	}

	// Check resources
	const costs = getCosts(action);
	if (!canPay(costs.cpu, costs.ram)) {
		addLine('Za malo zasobow.', 'warn');
		return;
	}

	// Deduct costs
	state.player.cpu -= costs.cpu;
	state.player.ram -= costs.ram;

	// Apply level bonus
	const levelBonus = getHackLevelBonus(action.id);

	// Execute action
	if (action.id === 'crack') {
		const isCrit = state.player.lastAction === 'suppress' && Math.random() < (action.synergy?.critChance || 0);
		let damage = computeDamage(action.baseDamage * (1 + levelBonus), target, action.armorPierce);
		if (isCrit) {
			damage = Math.floor(damage * 1.5);
			addLine(`CRACK CRIT! ${damage} obrazen na ${target.name}.`, 'ok');
		} else {
			addLine(`CRACK trafia ${target.name} za ${damage}.`);
		}
		hurt(target, damage);
		let traceGain = action.trace;
		addTrace(traceGain);
	}

	if (action.id === 'suppress') {
		// Light action - can be chained, doesn't end turn initially shown in logs
		state.player.trace = Math.max(0, state.player.trace + action.trace);
		
		// Find DAEMON and weaken it
		const daemon = state.enemies.find(e => e.type === 'daemon' && !e.dead);
		if (daemon) {
			daemon.suppressedNextTurn = true;
			addLine(`SUPPRESS osłabia DAEMON na 1 turę (zmniejszony wzrost TRACE).`);
		} else {
			addLine('SUPPRESS: DAEMON nie znaleziony.');
		}
	}

	if (action.id === 'worm') {
		const hasWormBonus = state.player.lastAction === 'overload';
		const duration = 5 + (hasWormBonus ? 1 : 0);
		const power = (10 + 3 * levelBonus) * (nodeModifier?.effects?.wormBaseDamageMult || 1);
		
		target.infected = Math.max(target.infected, duration);
		target.infectedPower = Math.floor(power);
		const upfront = computeDamage(action.baseDamage * (1 + levelBonus), target, action.armorPierce);
		hurt(target, upfront);
		addTrace(action.trace);
		addLine(`WORM infekuje ${target.name} (${Math.floor(power)} dmg/tur).`);
	}

	if (action.id === 'overload') {
		const bonus = target.type === 'firewall' ? 12 : 0;
		const baseDmg = (action.baseDamage + bonus) * (1 + levelBonus);
		const damage = computeDamage(baseDmg, target, action.armorPierce);
		hurt(target, damage);

		const stunChance = nodeModifier?.effects?.overloadStunChance || 0.45;
		if (Math.random() < stunChance) {
			target.stunned = Math.max(target.stunned, 1);
			addLine(`${target.name} zostal STUNNED.`, 'warn');
		}

		let traceGain = action.trace;
		if (nodeModifier?.effects?.overloadTraceMult) {
			traceGain = Math.floor(traceGain * nodeModifier.effects.overloadTraceMult);
		}
		addTrace(traceGain);
		addLine(`OVERLOAD zadaje ${damage}.`);
	}

	if (action.id === 'core') {
		const reduction = state.corePhase === 'vulnerable' ? 50 : state.corePhase === 'destabilized' ? 34 : 16;
		state.core = Math.max(0, state.core - reduction);
		if (state.corePhase === 'stable') state.corePhase = 'destabilized';
		addTrace(action.trace);
		addLine(`Atak na rdzen node (-${reduction}%). Phase: ${state.corePhase}.`, 'warn');
	}

	// Track spam - same action repeated penalizes
	if (state.player.lastAction === actionId) {
		state.player.spamCount += 1;
		if (state.player.spamCount >= BALANCE.spamThresholdRepeats) {
			state.enemies.forEach(e => {
				if (!e.dead) {
					e.armor += BALANCE.spamPenaltyAdaptArmorPerRepeat;
					addLine(`${e.name} adaptuje sie - armor wzrasta!`, 'bad');
				}
			});
			state.player.spamCount = 0;
		}
	} else {
		state.player.lastAction = actionId;
		state.player.spamCount = 0;
	}

	state.player.lastActionTurns = 0;
	state.stealthTurns = 0;
	
	// Light actions can be chained - only regular actions end turn
	if (!action.isLight) {
		resolveTurn();
	}
}

function resolveTurn() {
	applyDots();

	if (checkEndConditions()) {
		renderAll();
		return;
	}

	systemTurn();
	state.turn += 1;

	// Regen
	let cpuRegen = BALANCE.cpuRegen;
	let ramRegen = BALANCE.ramRegen;
	
	if (nodeModifier?.effects?.cpuRegenMult) cpuRegen = Math.floor(cpuRegen * nodeModifier.effects.cpuRegenMult);
	if (nodeModifier?.effects?.ramRegenMult) ramRegen = Math.floor(ramRegen * nodeModifier.effects.ramRegenMult);
	
	state.player.cpu = Math.min(state.player.maxCpu, state.player.cpu + cpuRegen);
	state.player.ram = Math.min(state.player.maxRam, state.player.ram + ramRegen);
	state.player.tracked = Math.max(0, state.player.tracked - 1);
	state.player.encrypted = Math.max(0, state.player.encrypted - 1);
	state.player.exposed = Math.max(0, state.player.exposed - 1);
	state.player.jammerT = Math.max(0, (state.player.jammerT || 0) - 1);
	state.player.sandboxT = Math.max(0, (state.player.sandboxT || 0) - 1);

	if ((state.player.cacheDebtT || 0) > 0) {
		state.player.cacheDebtT -= 1;
		state.player.trace += 5;
		addLine('CACHE DEBT: opozniony wzrost TRACE +5.', 'bad');
	}

	// Passive TRACE gain
	let passiveTrace = BALANCE.passiveTracePerTurn;
	
	if (nodeModifier?.effects?.passiveTraceMult) {
		passiveTrace = Math.floor(passiveTrace * nodeModifier.effects.passiveTraceMult);
	}

	if (state.player.tracked > 0) {
		passiveTrace += BALANCE.trackedTraceBonus;
	}

	if (state.player.cloak > 0) {
		passiveTrace = Math.ceil(passiveTrace * 0.4);
		state.player.cloak = Math.max(0, state.player.cloak - 1);
		addLine('CLOAK redukuje pasywny wzrost TRACE.', 'warn');
	}

	// Stealth decay - TRACE naturally decreases if player is passive
	state.stealthTurns += 1;
	if (state.stealthTurns >= BALANCE.stealthTurnsForDecay) {
		state.player.trace = Math.max(0, state.player.trace - BALANCE.traceDecayPerTurn);
		addLine('Brak aktywnosci - TRACE naturalnie spada (stealth).', 'ok');
	}

	state.player.trace += passiveTrace;

	maybeDeployBlackIce();
	checkTraceThresholds();
	checkEndConditions();
	renderAll();
}

function systemTurn() {
	for (const enemy of state.enemies) {
		if (enemy.dead) {
			continue;
		}

		if (enemy.stunned > 0) {
			enemy.stunned -= 1;
			addLine(`${enemy.name} pomija ture (STUNNED).`, 'warn');
			computeIntentForEnemy(enemy);
			continue;
		}

		if (enemy.type === 'firewall') {
			// Support ally with armor boost or shield
			if (enemy.mechanics.supportedAlly) {
				const ally = state.enemies.find(e => e.id === enemy.mechanics.supportedAlly && !e.dead);
				if (ally) {
					ally.armor = Math.min(BALANCE.maxEnemyArmor, ally.armor + enemy.mechanics.armorPerTurn);
					addLine(`FIREWALL wzmacnia ${ally.name} (armor +1).`, 'warn');
				}
			} else {
				// Fallback: strengthen all
				for (const ally of state.enemies) {
					if (!ally.dead && ally.id !== enemy.id) {
						ally.armor = Math.min(BALANCE.maxEnemyArmor, ally.armor + 1);
					}
				}
				addLine('FIREWALL wzmacnia siec.', 'warn');
			}
			continue;
		}

		if (enemy.type === 'daemon') {
			let traceGain = enemy.mechanics.tracePerTurn;
			
			// Apply SUPPRESS effect
			if (enemy.suppressedNextTurn) {
				traceGain = Math.floor(traceGain * 0.3); // Only 30% TRACE when suppressed
				addLine('SUPPRESS zmniejsza TRACE gain DAEMON!', 'ok');
				enemy.suppressedNextTurn = false;
			} else {
				if (nodeModifier?.effects?.daemonTraceReduction) {
					traceGain = Math.max(1, traceGain - nodeModifier.effects.daemonTraceReduction);
				}
				if (nodeModifier?.effects?.daemonTraceIncrease) {
					traceGain += nodeModifier.effects.daemonTraceIncrease;
				}
			}
			
			state.player.trace += traceGain;

			if ((state.player.jammerT || 0) > 0) {
				addLine('PACKET JAMMER neutralizuje probe TRACKED.', 'ok');
			} else if (Math.random() < enemy.mechanics.trackedChance) {
				state.player.tracked = Math.max(state.player.tracked, 2);
				addLine('TRACE DAEMON oznaczyl cie jako TRACKED.', 'bad');
			} else {
				addLine('TRACE DAEMON podbija TRACE.', 'warn');
			}
			continue;
		}

		if (enemy.type === 'sentinel') {
			state.player.cpu = Math.max(0, state.player.cpu - enemy.mechanics.cpuDrainPerTurn);
			state.player.ram = Math.max(0, state.player.ram - enemy.mechanics.ramDrainPerTurn);
			state.player.trace += 3;

			if (Math.random() < 0.28) {
				state.player.encrypted = Math.max(state.player.encrypted, 2);
				addLine('ICE SENTINEL naklada ENCRYPTED.', 'bad');
			} else {
				addLine('ICE SENTINEL destabilizuje zasoby.', 'warn');
			}
			continue;
		}

		if (enemy.type === 'blackice') {
			if ((state.player.sandboxT || 0) > 0) {
				addLine('SANDBOX tlumi BLACK ICE this turn.', 'ok');
				continue;
			}

			state.player.trace += enemy.mechanics.tracePerTurn;
			if (Math.random() < enemy.mechanics.encryptedChance) {
				state.player.encrypted = Math.max(state.player.encrypted, 2);
			}
			if ((state.player.jammerT || 0) <= 0 && Math.random() < enemy.mechanics.trackedChance) {
				state.player.tracked = Math.max(state.player.tracked, 2);
			}
			addLine('BLACK ICE intensywnie podbija TRACE!', 'bad');
		}
	}
}

function applyDots() {
	for (const enemy of state.enemies) {
		if (enemy.dead || enemy.infected <= 0 || enemy.infectedPower <= 0) {
			continue;
		}

		const damage = enemy.type === 'firewall' ? enemy.infectedPower + 2 : enemy.infectedPower;
		hurt(enemy, damage);
		enemy.infected -= 1;
		addLine(`INFECTED zadaje ${damage} obrazen: ${enemy.name}.`);
	}
}

function checkTraceThresholds() {
	const trace = state.player.trace;
	
	if (trace >= BALANCE.tracePanicThreshold) {
		// Panic mode - screen glitch
		if (G.dom.nbPanel) {
			G.dom.nbPanel.classList.add('panic-glitch');
			setTimeout(() => G.dom.nbPanel?.classList.remove('panic-glitch'), 200);
		}
		addLine('PANIC MODE: Connection unstable! TRACE very critical!', 'critical');
	} else if (trace >= BALANCE.traceWarningThreshold) {
		addLine('WARNING: BLACK ICE may deploy soon.', 'bad');
	} else if (trace >= BALANCE.traceEscalationThreshold) {
		// Security escalation - enemies get buffs
		state.enemies.forEach(e => {
			if (!e.dead && e.armor < BALANCE.maxEnemyArmor) {
				e.armor += 1;
			}
		});
		addLine('SECURITY ESCALATION: All ICE armor increased!', 'warn');
	} else if (trace >= BALANCE.traceGlitchThreshold) {
		addLine('Minor glitches detected in system.', 'warn');
	}
}

function maybeDeployBlackIce() {
	if (state.blackIceActive) {
		return;
	}

	if (state.player.trace < BALANCE.blackIceTraceThreshold && state.turn < BALANCE.blackIceTurnThreshold) {
		return;
	}

	state.blackIceActive = true;
	state.enemies.push(createEnemyInstance(ENEMY_PRESETS.blackice));
	addLine('WARNING: BLACK ICE DEPLOYED', 'bad');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function chooseTarget(action) {
	if (action.id === 'suppress' || action.id === 'core') {
		return null;
	}

	const alive = state.enemies.filter((enemy) => !enemy.dead);
	if (!alive.length) {
		return null;
	}

	if (action.id === 'worm') {
		return alive.find((enemy) => enemy.type === 'firewall') || alive[0];
	}

	if (action.id === 'crack') {
		return alive.find((enemy) => enemy.type === 'sentinel') || alive[0];
	}

	if (action.id === 'overload') {
		return [...alive].sort((a, b) => b.hp - a.hp)[0];
	}

	return alive[0];
}

function getCosts(action) {
	const cpuTax = state.player.encrypted > 0 ? 4 : 0;
	const ramTax = state.player.encrypted > 0 ? 4 : 0;

	return {
		cpu: action.cpu + cpuTax,
		ram: action.ram + ramTax,
	};
}

function computeDamage(baseDamage, enemy, armorPierce) {
	const effectiveArmor = Math.max(0, enemy.armor * (1 - armorPierce));
	let damage = Math.max(5, Math.round(baseDamage - effectiveArmor));
	
	// EXPOSED status increases damage taken
	if (enemy.exposed > 0) {
		damage = Math.floor(damage * 1.3);
	}
	
	return damage;
}

function canPay(cpu, ram) {
	return state.player.cpu >= cpu && state.player.ram >= ram;
}

function addTrace(value) {
	state.player.trace += value;
}

function hurt(enemy, amount) {
	enemy.hp -= amount;

	if (enemy.hp <= 0) {
		enemy.hp = 0;
		enemy.dead = true;

		if (state.selectedEnemyId === enemy.id) {
			state.selectedEnemyId = getFirstAliveEnemyId();
		}

		addLine(`${enemy.name} zneutralizowany.`);
	} else {
		// Apply EXPOSED on hit (setup for combo)
		enemy.exposed = Math.max(enemy.exposed, 1);
	}
}

function getFirstAliveEnemyId() {
	const enemy = state.enemies.find((item) => !item.dead);
	return enemy ? enemy.id : null;
}

function hasAliveType(type) {
	return state.enemies.some((enemy) => !enemy.dead && enemy.type === type);
}

function checkEndConditions() {
	state.player.trace = Math.max(0, state.player.trace);

	if (state.player.trace >= 100) {
		finish(false, 'TRACE 100% - siec wykryla intruza.');
		return true;
	}

	const activeEnemies = state.enemies.filter((enemy) => !enemy.dead).length;

	if (activeEnemies === 0 || state.core <= 0) {
		finish(true, 'Node przejety. Kontrola uzyskana.');
		return true;
	}

	return false;
}

function finish(success, message) {
	if (!state || state.finished) {
		return;
	}

	state.finished = true;
	setFooter(message, !success);
	addLine(message, success ? '' : 'bad');
	renderAll();

	G.breachActive = false;
	G.paused = false;

	if (success) {
		completeMainHack();
		log(`Breach zakonczony sukcesem (TRACE: ${Math.round(state.player.trace)}%)`, 'ok');
	} else {
		log('Breach nieudany - system resetuje zabezpieczenia', 'bad');
		handleMainHackFailure();
	}

	setTimeout(() => {
		hidePanel();
		state = null;
	}, 500);
}

// ============================================================================
// RENDERING
// ============================================================================

function renderAll() {
	if (!state) {
		return;
	}

	renderStats();
	renderActions();
	renderEnemies();
	renderWarning();
}

function asciiBar(value, max, width = 10) {
	const filled = Math.round((value / max) * width);
	const empty = width - filled;
	return '[' + '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty)) + ']';
}

function renderStats() {
	if (!G.dom.nbStats) {
		return;
	}

	const player = state.player;
	const flags = [];

	if (player.tracked > 0) flags.push(`<span class="nb-flag warn">TRACKED:${player.tracked}</span>`);
	if (player.encrypted > 0) flags.push(`<span class="nb-flag warn">ENCRYPTED:${player.encrypted}</span>`);
	if (player.cloak > 0) flags.push(`<span class="nb-flag ok">CLOAK:${player.cloak}</span>`);
	if (player.jammerT > 0) flags.push(`<span class="nb-flag ok">JAMMER:${player.jammerT}</span>`);
	if (player.sandboxT > 0) flags.push(`<span class="nb-flag ok">SANDBOX:${player.sandboxT}</span>`);
	if (player.cacheDebtT > 0) flags.push(`<span class="nb-flag warn">DEBT:${player.cacheDebtT}</span>`);
	if (player.exposed > 0) flags.push(`<span class="nb-flag crit">EXPOSED:${player.exposed}</span>`);

	const traceClass = player.trace >= 85 ? 'crit' : player.trace >= 65 ? 'warn' : 'ok';
	const coreLabel = state.corePhase === 'vulnerable' ? 'VULNERABLE' : state.corePhase === 'destabilized' ? 'DESTABILIZED' : 'STABLE';
	const coreClass = state.corePhase === 'vulnerable' ? 'crit' : state.corePhase === 'destabilized' ? 'warn' : 'ok';

	const cpuBar = asciiBar(Math.round(player.cpu), player.maxCpu);
	const ramBar = asciiBar(Math.round(player.ram), player.maxRam);
	const traceBar = asciiBar(Math.round(player.trace), 100);

	G.dom.nbStats.innerHTML = `
		<div class="nb-sysline">
			<span class="nb-sl-label">T</span><span class="nb-sl-val">${String(state.turn).padStart(2, '0')}</span>
			<span class="nb-sl-sep">│</span>
			<span class="nb-sl-label">cpu</span><span class="nb-sl-bar">${cpuBar}</span><span class="nb-sl-val">${Math.round(player.cpu)}/${player.maxCpu}</span>
			<span class="nb-sl-sep">│</span>
			<span class="nb-sl-label">ram</span><span class="nb-sl-bar">${ramBar}</span><span class="nb-sl-val">${Math.round(player.ram)}/${player.maxRam}</span>
			<span class="nb-sl-sep">│</span>
			<span class="nb-sl-label">trace</span><span class="nb-sl-bar ${traceClass}">${traceBar}</span><span class="nb-sl-val ${traceClass}">${Math.round(player.trace)}%</span>
			<span class="nb-sl-sep">│</span>
			<span class="nb-sl-label">node</span><span class="nb-sl-val ${coreClass}">${Math.round(state.core)}% [${coreLabel}]</span>
			${flags.length ? `<span class="nb-sl-sep">│</span><span class="nb-sl-flags">${flags.join('')}</span>` : ''}
		</div>`;
}

function renderActions() {
	if (!G.dom.nbActions) {
		return;
	}

	G.dom.nbActions.innerHTML = getEquippedBreachActions()
		.map((action) => {
			const costs = getCosts(action);
			const disabled = state.finished || !canPay(costs.cpu, costs.ram);
			const traceLabel = `${action.trace >= 0 ? '+' : ''}${action.trace}`;
			const cliName = action.name.toLowerCase().replace(/\s+/g, '_');
			const stateLabel = disabled ? 'blocked' : 'ready';
			return `<div class="nb-cmd-row ${disabled ? 'disabled' : ''}" data-nb-action="${action.id}" title="${action.tip}"><span class="n">cmd&gt; ${cliName}</span><span class="c">cpu=${costs.cpu} ram=${costs.ram} trace=${traceLabel} state=${stateLabel}</span><span class="d">${action.desc}</span></div>`;
		})
		.join('');
}

const PROCESS_NAMES = {
	firewall: 'firewall.sys',
	daemon: 'trace_daemon.exe',
	sentinel: 'ice_sentinel.ko',
	blackice: 'blackice_x.bin',
};

const PROCESS_PIDS = {
	firewall: 'fw01',
	daemon: 'dm02',
	sentinel: 'sn03',
	blackice: 'bi04',
};

function renderEnemies() {
	if (!G.dom.nbEnemies) {
		return;
	}

	const header = `<div class="nb-proc-header"><span class="nb-ph pid">PID</span><span class="nb-ph proc">PROCESS</span><span class="nb-ph integ">INTEGRITY</span><span class="nb-ph next">NEXT_OP</span><span class="nb-ph flags">FLAGS</span></div>`;

	const rows = state.enemies.map((enemy) => {
		const deadCls = enemy.dead ? 'dead' : '';
		const pid = PROCESS_PIDS[enemy.type] || '??00';
		const procName = PROCESS_NAMES[enemy.type] || `${enemy.type}.bin`;
		const integrityPct = Math.round((enemy.hp / enemy.maxHp) * 100);
		const intBar = asciiBar(Math.max(0, enemy.hp), enemy.maxHp, 8);
		const intClass = integrityPct <= 25 ? 'crit' : integrityPct <= 55 ? 'warn' : 'ok';
		const intent = computeIntentForEnemy(enemy);
		const flags = [];
		if (enemy.armor > 0) flags.push(`arm:${enemy.armor}`);
		if (enemy.infected > 0) flags.push(`inf:${enemy.infected}`);
		if (enemy.stunned > 0) flags.push(`stun:${enemy.stunned}`);
		if (enemy.suppressedNextTurn) flags.push(`supr`);
		const flagStr = flags.length ? flags.join(' ') : '—';

		return `<div class="nb-proc-row ${deadCls}" title="${enemy.role}. ${enemy.desc}">
			<span class="nb-ph pid">${pid}</span>
			<span class="nb-ph proc">${deadCls ? '<s>' : ''}${procName}${deadCls ? '</s>' : ''}</span>
			<span class="nb-ph integ"><span class="${intClass}">${intBar}</span> <span class="${intClass}">${Math.max(0, Math.round(enemy.hp))}/${enemy.maxHp}</span></span>
			<span class="nb-ph next">${enemy.dead ? '[terminated]' : intent}</span>
			<span class="nb-ph flags">${flagStr}</span>
		</div>`;
	}).join('');

	G.dom.nbEnemies.innerHTML = header + rows;
}

function renderWarning() {
	if (!G.dom.nbWarning || !state) {
		return;
	}

	const trace = state.player.trace;

	if (trace >= 90) {
		G.dom.nbWarning.className = 'nb-warning show danger pulse';
		G.dom.nbWarning.textContent = '!! DETECTION IMMINENT — trace spike critical. execute $ przejmij_rdzen or abort.';
		return;
	}

	if (trace >= 70) {
		G.dom.nbWarning.className = 'nb-warning show warn';
		G.dom.nbWarning.textContent = '>> trace escalating. suppress trace_daemon.exe or reduce aggression.';
		return;
	}

	G.dom.nbWarning.className = 'nb-warning show ok';
	G.dom.nbWarning.textContent = '>> trace nominal. maintain stealth or increase exploit pressure.';
}

function renderHelp() {
	if (!G.dom.nbHelp) {
		return;
	}

	const levels = getHackLevels();
	const levelInfo = `crack:${levels.crack} | suppress:${levels.suppress} | worm:${levels.worm} | overload:${levels.overload} | core:${levels.core}`;

	G.dom.nbHelp.innerHTML = [
		'<div class="h-title">> exploit_env --info</div>',
		`<div class="h-row"><span>exploit_lvl</span><span style="font-size:10px">${levelInfo}</span></div>`,
		'<div class="h-row"><span>trace</span><span>session killed at 100%. grows with aggression. passive decay each idle turn.</span></div>',
		'<div class="h-row"><span>cpu/ram</span><span>+18 cpu, +14 ram per cycle. encrypted flag inflates all exploit costs.</span></div>',
		'<div class="h-row"><span>$ suppress</span><span>light action — chains with next command. silences trace_daemon.exe trace gain -70%.</span></div>',
		'<div class="h-row"><span>chain ops</span><span>suppress → crack (crit shot),  worm → overload (inf bonus).</span></div>',
		'<div class="h-row"><span>node state</span><span>stable → destabilized → vulnerable → $ przejmij_rdzen to exfil.</span></div>',
	].join('');
}

function addLine(message, cls = '') {
	if (!G.dom.nbLog) {
		return;
	}

	const line = document.createElement('div');
	line.className = `nb-line ${cls}`.trim();
	line.textContent = `> ${message}`;
	G.dom.nbLog.prepend(line);

	while (G.dom.nbLog.childNodes.length > 18) {
		G.dom.nbLog.removeChild(G.dom.nbLog.lastChild);
	}
}

function setFooter(message, danger) {
	if (!G.dom.nbFooter) {
		return;
	}

	G.dom.nbFooter.textContent = message;
	G.dom.nbFooter.classList.add('show');
	G.dom.nbFooter.classList.toggle('danger', !!danger);
}

function showPanel() {
	if (!G.dom.nbPanel) {
		return;
	}

	G.dom.nbPanel.classList.add('show');

	if (G.dom.nbLog) {
		G.dom.nbLog.innerHTML = '';
	}

	if (G.dom.nbFooter) {
		G.dom.nbFooter.classList.remove('show', 'danger');
		G.dom.nbFooter.textContent = '';
	}
}

function hidePanel() {
	if (!G.dom.nbPanel) {
		return;
	}

	G.dom.nbPanel.classList.remove('show');
}

