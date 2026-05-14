import { HUD_HEIGHT, TILE } from '../core/constants.js';
import { G, upgradeHack } from '../core/state.js';
import { toggleMusicEnabled } from './audio.js';
import {
	ensureHubState,
	getActiveRunOffers,
	getContacts,
	getCrew,
	getCurrentRunOffer,
	hireContact,
	rejectContact,
	setCurrentRunOffer,
	startRecruitmentMission,
} from './recruitment.js';
import {
	ensureDataFragmentState,
	getCollectedFragments,
	getTotalFragmentCount,
	getFragmentById,
	getCategoryColor,
	getProbabilityLabel,
	isProbabilityUnlocked,
	isDecryptorUnlocked,
	isFragmentDecrypted,
	decryptFragment,
	assignFragmentCategory,
	setFragmentBoardPos,
	setFragmentNote,
	addFragmentConnection,
	removeFragmentConnection,
	getAllConnections,
	getConnectionsFor,
	ALL_CATEGORIES,
	saveDataFragments,
} from './dataFragments.js';

const MAIN_HACK_LOADING_LINES = [
	'LINKING TO MAIN TERMINAL...',
	'NEGOTIATING ACCESS KEYS...',
	'BYPASSING ACTIVE WATCHDOGS...',
	'SPOOFING OPERATOR SIGNATURE...',
	'PATCHING BREACH VECTOR...',
	'SEALING TRACE LEAKS...',
	'PRIMING CYBER COMBAT LAYER...',
	'ROOT ACCESS WINDOW READY.',
];

export function bindUI() {
	G.dom = {
		canvas: document.getElementById('gc') || document.getElementById('game'),
		contextMenu: document.getElementById('ctx') || document.getElementById('context-menu'),
		contextTitle: document.getElementById('ctx-title'),
		contextButtons: document.getElementById('ctx-btns'),
		log: document.getElementById('log'),
		targetList: document.getElementById('tl'),
		mission: document.getElementById('mission'),
		status: document.getElementById('sv'),
		hpBar: document.getElementById('bhp'),
		bwBar: document.getElementById('bbw'),
		alertBar: document.getElementById('bal'),
		credits: document.getElementById('vcr'),
		zone: document.getElementById('vz'),
		deathOverlay: document.getElementById('ovd'),
		failOverlay: document.getElementById('ovf'),
		successOverlay: document.getElementById('ovs'),
		deathMessage: document.getElementById('dm'),
		rewardText: document.getElementById('reward-txt'),
		vignette: document.getElementById('status-vignette'),
		systemResetWarning: document.getElementById('system-reset-warning'),
		musicToggle: document.getElementById('music-toggle'),
		musicIcon: document.getElementById('music-icon'),
		menuMusicToggle: document.getElementById('menu-music-toggle'),
		menuMusicIcon: document.getElementById('menu-music-icon'),
		quickHackStock: document.getElementById('qh-stock-value'),
		quickHackPanel: document.getElementById('qh-panel'),
		quickHackTimerFill: document.getElementById('qh-timer-fill'),
		quickHackChoices: document.getElementById('qh-choices'),
		nbPanel: document.getElementById('nb-panel'),
		nbLoadingScreen: document.getElementById('nb-loading-screen'),
		nbLoadingHeader: document.getElementById('nb-loading-header'),
		nbLoadingLines: document.getElementById('nb-loading-lines'),
		nbLoadingBarFill: document.getElementById('nb-loading-bar-fill'),
		nbStats: document.getElementById('nb-stats'),
		nbActions: document.getElementById('nb-actions'),
		nbEnemies: document.getElementById('nb-enemies'),
		nbLog: document.getElementById('nb-log'),
		nbFooter: document.getElementById('nb-footer'),
		nbAbort: document.getElementById('nb-abort'),
		nbHelp: document.getElementById('nb-help'),
		nbWarning: document.getElementById('nb-warning'),
		tutorialPanel: document.getElementById('tutorial-panel'),
		tutorialStep: document.getElementById('tutorial-step'),
		tutorialTitle: document.getElementById('tutorial-title'),
		tutorialBody: document.getElementById('tutorial-body'),
		tutorialHint: document.getElementById('tutorial-hint'),
		hubTabPlan: document.getElementById('hub-tab-plan'),
		hubTabRecruit: document.getElementById('hub-tab-recruit'),
		hubPlan: document.getElementById('hub-plan'),
		hubRecruit: document.getElementById('hub-recruit'),
		hubRunMeta: document.getElementById('hub-run-meta'),
		hubRuns: document.getElementById('hub-runs'),
		hubCrew: document.getElementById('hub-crew'),
		hubContacts: document.getElementById('hub-contacts'),
		terminalOverlay: document.getElementById('rt-overlay'),
		terminalOutput: document.getElementById('rt-output'),
		terminalInput: document.getElementById('rt-input'),
		terminalSuggestion: document.getElementById('rt-suggestion'),
		terminalTraceValue: document.getElementById('rt-trace-value'),
		terminalTraceBar: document.getElementById('rt-trace-fill'),
		terminalConnectedNode: document.getElementById('rt-node'),
		terminalActiveHacks: document.getElementById('rt-hacks'),
		terminalRamCpu: document.getElementById('rt-ram-cpu'),
		terminalNetworkStatus: document.getElementById('rt-network'),
		terminalRisk: document.getElementById('rt-risk'),
		terminalPending: document.getElementById('rt-pending'),
	};

	G.canvas = G.dom.canvas;

	bindMusicToggleButton(G.dom.musicToggle);
	bindMusicToggleButton(G.dom.menuMusicToggle);
	window.addEventListener('gp:audio-state', refreshMusicToggle);

	refreshMusicToggle();
	ensureHubState();
	renderHub();

	// Global handlers for inline UI actions
	window.switchHubTab = switchHubTab;
	window.selectRunUI = selectRunUI;
	window.startRecruitmentMissionUI = startRecruitmentMissionUI;
	window.hireContactUI = hireContactUI;
	window.rejectContactUI = rejectContactUI;
	window.upgradeHackUI = upgradeHackUI;
}

export function clearLog() {
	G.logBuf = [];

	if (G.dom.log) {
		G.dom.log.innerHTML = '';
	}
}

export function syncMainHackLoading() {
	if (!G.dom.nbLoadingScreen || !G.dom.nbLoadingLines || !G.dom.nbLoadingBarFill) {
		return;
	}

	if (!G.hackingMain || G.breachActive || G.mainHacked) {
		hideMainHackLoading();
		return;
	}

	const progress = Math.max(0, Math.min(100, G.hackProgress));
	const visibleLines = Math.max(1, Math.ceil((progress / 100) * MAIN_HACK_LOADING_LINES.length));

	G.dom.nbLoadingScreen.classList.add('show');
	if (G.dom.nbLoadingHeader) {
		G.dom.nbLoadingHeader.textContent = '[ MAIN TERMINAL LINK ]';
	}

	G.dom.nbLoadingLines.innerHTML = MAIN_HACK_LOADING_LINES.map((line, index) => {
		const isVisible = index < visibleLines;
		const isActive = isVisible && index === visibleLines - 1 && progress < 100;
		const classes = ['nb-loading-line'];

		if (!isVisible) {
			classes.push('pending');
		}

		if (isActive) {
			classes.push('active');
		}

		const prefix = isVisible ? '> ' : '... ';
		return `<div class="${classes.join(' ')}">${prefix}${line}</div>`;
	}).join('');

	G.dom.nbLoadingBarFill.style.width = `${progress}%`;
	G.dom.nbLoadingBarFill.style.boxShadow = progress >= 100
		? '0 0 16px rgba(0, 255, 159, 0.7)'
		: '';
	G.dom.nbLoadingLines.scrollTop = G.dom.nbLoadingLines.scrollHeight;
}

export function hideMainHackLoading() {
	if (!G.dom.nbLoadingScreen || !G.dom.nbLoadingLines || !G.dom.nbLoadingBarFill) {
		return;
	}

	G.dom.nbLoadingScreen.classList.remove('show');
	if (G.dom.nbLoadingHeader) {
		G.dom.nbLoadingHeader.textContent = '[ SYSTEM BOOT ]';
	}
	G.dom.nbLoadingLines.innerHTML = '<div class="nb-loading-line">INITIALIZING...</div>';
	G.dom.nbLoadingBarFill.style.width = '0%';
	G.dom.nbLoadingBarFill.style.boxShadow = '';
}

export function refreshHUD() {
	if (!G.P) {
		return;
	}

	G.dom.hpBar.style.width = `${(G.P.hp / G.P.mhp) * 100}%`;
	G.dom.bwBar.style.width = `${(G.P.bw / G.P.mbw) * 100}%`;
	G.dom.alertBar.style.width = `${G.alert}%`;
	G.dom.credits.textContent = `¥${G.P.cr}`;
	refreshQuickHackStock();

	if (G.dom.status) {
		if (G.alert < 15) {
			G.dom.status.textContent = 'GHOST';
			G.dom.status.style.color = '#00ff9f';
			syncVignette('ghost');
		} else if (G.alert < 40) {
			G.dom.status.textContent = 'SHADOW';
			G.dom.status.style.color = '#ffd700';
			syncVignette('shadow');
		} else if (G.alert < 65) {
			G.dom.status.textContent = 'SPOTTED';
			G.dom.status.style.color = '#ff9a3c';
			syncVignette('spotted');
		} else if (G.alert < 85) {
			G.dom.status.textContent = 'HUNTED';
			G.dom.status.style.color = '#ff5a2c';
			syncVignette('hunted');
		} else {
			G.dom.status.textContent = 'COMPROMISED';
			G.dom.status.style.color = '#ff3a5c';
			syncVignette('compromised');
		}
	}

	// Show code in HUD if found
	const codeEl = document.getElementById('hud-code');
	if (codeEl) {
		if (G.codeFound && G.code) {
			codeEl.textContent = `KOD: ${G.code}`;
			codeEl.style.display = '';
		} else {
			codeEl.textContent = '';
			codeEl.style.display = 'none';
		}
	}
}

export function rebuildList() {
	if (!G.P || !G.dom.targetList) {
		return;
	}

	const rows = [];

	for (let index = 0; index < G.sideTerminals.length; index += 1) {
		const terminal = G.sideTerminals[index];
		const known = isTileKnown(terminal.x, terminal.y);

		if (!known) {
			continue;
		}

		const hacked = terminal.used || G.sideHacked.includes(terminal.id || `sterm${index}`);

		rows.push({
			desc: `Terminal S-${index + 1}`,
			st: terminal.used ? 'USED' : hacked ? 'HACKED' : 'ONLINE',
			d: Math.hypot(terminal.x - G.P.x, terminal.y - G.P.y).toFixed(1),
		});
	}

	const mainTerminalKnown = !!G.mainTerminal && isTileKnown(G.mainTerminal.x, G.mainTerminal.y);

	if (!G.mainHacked && mainTerminalKnown) {
		rows.push({
			desc: 'Terminal GŁÓWNY',
			st: G.hackingMain ? 'HAKOWANIE...' : 'ONLINE',
			d: Math.hypot(G.mainTerminal.x - G.P.x, G.mainTerminal.y - G.P.y).toFixed(1),
		});
	} else if (mainTerminalKnown) {
		rows.push({ desc: 'Terminal GŁÓWNY', st: '✓ HACKED', d: '—' });
	}

	for (const device of G.devices) {
		const key = `${Math.floor(device.x)},${Math.floor(device.y)}`;
		const known = G.seenDevices.has(device.id) || G.visible.has(key);

		if (!known) {
			continue;
		}

		const state = device.dead
			? 'DEAD'
			: device.type === 'tech'
				? 'REPAIR'
				: device.hijacked
					? 'HIJACK'
					: device.hacked
						? 'HACKED'
						: device.offline
							? 'OFFLINE'
							: 'ONLINE';

		rows.push({
			desc: device.desc,
			st: state,
			d: Math.hypot(device.x - G.P.x, device.y - G.P.y).toFixed(1),
		});
	}

	G.dom.targetList.innerHTML = rows
		.map(
			(row) =>
				`<div class="tgt"><div class="tn">${row.desc}</div><div class="ts">${row.st} | ${row.d}t</div></div>`,
		)
		.join('');

	renderHub();
}

function isTileKnown(x, y) {
	return G.explored.has(`${x},${y}`) || G.visible.has(`${x},${y}`);
}

export function log(message, cls = '') {
	const line = document.createElement('div');
	line.className = `ll ${cls}`.trim();
	line.textContent = `> ${message}`;

	G.dom.log.appendChild(line);
	G.logBuf.push(line);

	while (G.logBuf.length > 7) {
		G.dom.log.removeChild(G.logBuf.shift());
	}
}

export function floatMsg(message, position, color) {
	const rect = G.canvas.getBoundingClientRect();
	const left = rect.left + (position.x - G.cam.x) * TILE + 20;
	const top = rect.top + (position.y - G.cam.y) * TILE + 10;

	const element = document.createElement('div');
	element.style.cssText = [
		'position:fixed',
		`left:${left}px`,
		`top:${top}px`,
		`color:${color}`,
		'font-family:monospace',
		'font-size:10px',
		'pointer-events:none',
		'z-index:30',
		'transition:opacity .8s,transform .8s',
	].join(';');
	element.textContent = message;
	document.body.appendChild(element);

	requestAnimationFrame(() => {
		element.style.transform = 'translateY(-28px)';
		element.style.opacity = '0';
	});

	setTimeout(() => {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
		}
	}, 850);
}

export function syncZoneLabel() {
	G.dom.zone.textContent = `SECTOR-0${G.wave} F${G.floor}/${G.floorCount}`;
}

export function getCanvasTopOffset() {
	return HUD_HEIGHT;
}

export function refreshMusicToggle() {
	const enabled = !!G.audioEnabled;
	const icon = enabled ? '🔊' : '🔇';
	const label = enabled ? 'Wylacz dzwiek' : 'Wlacz dzwiek';

	updateMusicButtonState(G.dom.musicToggle, G.dom.musicIcon, icon, label, enabled);
	updateMusicButtonState(G.dom.menuMusicToggle, G.dom.menuMusicIcon, icon, label, enabled);
}

function bindMusicToggleButton(button) {
	if (!button) {
		return;
	}

	button.addEventListener('click', (event) => {
		event.stopPropagation();
		toggleMusicEnabled();
		refreshMusicToggle();
	});
}

function updateMusicButtonState(button, iconEl, icon, label, enabled) {
	if (!button || !iconEl) {
		return;
	}

	iconEl.textContent = icon;
	button.setAttribute('aria-label', label);
	button.title = label;
	button.classList.toggle('active', enabled);
}

function refreshQuickHackStock() {
	if (!G.dom.quickHackStock || !G.quickHacks) {
		return;
	}

	const equipped = Array.isArray(G.quickHackLoadout)
		? G.quickHackLoadout.filter(Boolean).slice(0, 4)
		: ['optics', 'motorics', 'neural', 'ddos'];

	if (!equipped.length) {
		G.dom.quickHackStock.textContent = 'QH:0';
		return;
	}

	const labels = equipped.map((id) => `${id.slice(0, 3).toUpperCase()}:${G.quickHacks[id] || 0}`);
	G.dom.quickHackStock.textContent = labels.join(' ');
}

function syncVignette(status) {
	if (!G.dom.vignette) {
		return;
	}

	G.dom.vignette.className = `vignette ${status}`;
}

export function showHackUpgradesPanel() {
	const panel = document.getElementById('hack-upgrades-panel');
	if (!panel) return;
	
	updateHackUpgradesPanel();
	panel.style.display = 'block';
}

export function hideHackUpgradesPanel() {
	const panel = document.getElementById('hack-upgrades-panel');
	if (panel) panel.style.display = 'none';
}

export function updateHackUpgradesPanel() {
	const list = document.getElementById('hack-upgrades-list');
	if (!list || !G.hackLevels) return;
	
	const hacks = ['crack', 'suppress', 'worm', 'overload', 'core'];
	const html = hacks.map(hackId => {
		const level = G.hackLevels[hackId] || 1;
		const costs = G.hackUpgradeCosts[hackId];
		if (!costs) return '';
		
		const nextCost = costs.base + (level - 1) * costs.perLevel;
		const canUpgrade = G.P.cr >= nextCost;
		const color = canUpgrade ? '#00ff9f' : '#ff6b6b';
		
		return `
			<div style="margin-bottom:6px;color:${color}">
				<span style="font-weight:bold">${hackId.toUpperCase()}</span> LV${level}
				<button data-hack="${hackId}" class="hack-upgrade-btn" style="margin-left:8px;padding:2px 6px;font-size:8px;cursor:pointer;background:#003300;border:1px solid ${color};color:${color}" 
					onclick="window.upgradeHackUI('${hackId}')"
					${canUpgrade ? '' : 'disabled'}>
					¥${nextCost}
				</button>
			</div>
		`;
	}).join('');
	
	list.innerHTML = html;
}

function renderHub() {
	if (!G.dom.hubPlan || !G.dom.hubRecruit) {
		return;
	}

	ensureHubState();
	const currentTab = G.hub.tab === 'recruit' ? 'recruit' : 'plan';

	if (G.dom.hubTabPlan) {
		G.dom.hubTabPlan.classList.toggle('active', currentTab === 'plan');
	}
	if (G.dom.hubTabRecruit) {
		G.dom.hubTabRecruit.classList.toggle('active', currentTab === 'recruit');
	}

	G.dom.hubPlan.classList.toggle('show', currentTab === 'plan');
	G.dom.hubRecruit.classList.toggle('show', currentTab === 'recruit');

	renderRunBoard();
	renderRecruitmentBoard();
}

function renderRunBoard() {
	if (!G.dom.hubRuns || !G.dom.hubRunMeta) {
		return;
	}

	if (!G.hub.currentRunId && G.hub.activeRuns.length) {
		G.hub.currentRunId = G.hub.activeRuns[0].id;
	}
	const currentRun = getCurrentRunOffer();
	const runs = getActiveRunOffers();

	const currentLabel = currentRun
		? `${currentRun.typeName} | SEC:${currentRun.security}% | PROFIT:¥${currentRun.profit}`
		: 'Brak aktywnego runu';

	G.dom.hubRunMeta.innerHTML = [
		`<div class="hub-meta-line"><span>NOTORIETY</span><span>${G.hub.notoriety}</span></div>`,
		`<div class="hub-meta-line"><span>ACTIVE RUN</span><span>${currentLabel}</span></div>`,
		`<div class="hub-meta-line"><span>CREW</span><span>${getCrew().length}</span></div>`,
	].join('');

	G.dom.hubRuns.innerHTML = runs.map((run) => {
		const selected = run.id === G.hub.currentRunId;
		const selectedClass = selected ? ' selected' : '';
		const contactPercent = Math.round(run.contactChance * 100);

		return `
			<div class="hub-run-card${selectedClass}" onclick="window.selectRunUI('${run.id}')">
				<div class="hub-run-top"><span>${run.typeName}</span><span>DANGER ${run.danger}/10</span></div>
				<div class="hub-run-mid">${run.target}</div>
				<div class="hub-run-bot">SEC ${run.security}% | PROFIT ¥${run.profit} | KONTAKT ${contactPercent}%</div>
			</div>
		`;
	}).join('');
}

function renderRecruitmentBoard() {
	if (!G.dom.hubContacts || !G.dom.hubCrew) {
		return;
	}

	const contacts = getContacts();
	const crew = getCrew();

	G.dom.hubCrew.innerHTML = [
		'<div class="hub-subhead">// DRUŻYNA</div>',
		crew.length
			? crew.map((member) => `<div class="hub-crew-card"><div>${member.alias} [${member.tier.toUpperCase()}]</div><div>${member.specialization} | upkeep ¥${member.upkeep}</div></div>`).join('')
			: '<div class="hub-empty">Brak zrekrutowanych operatorów.</div>',
	].join('');

	if (!contacts.length) {
		G.dom.hubContacts.innerHTML = '<div class="hub-subhead">// KONTAKTY</div><div class="hub-empty">Brak danych KONTAKT. Hakuj główne terminale.</div>';
		return;
	}

	G.dom.hubContacts.innerHTML = [
		'<div class="hub-subhead">// KONTAKTY</div>',
		contacts.map((contact) => {
			const statusLabel = contact.mission.status === 'intel'
				? 'INTEL READY'
				: contact.mission.status === 'active'
					? `MISJA ${contact.mission.progress}/${contact.mission.goal}`
					: 'READY TO HIRE';

			const req = contact.requirements;
			const reqText = `WAVE ${req.minWave} | REP ${req.notoriety} | INIT ¥${req.creditsUpfront}`;
			const canStart = contact.mission.status === 'intel';
			const canHire = contact.mission.status === 'ready';

			return `
				<div class="hub-contact-card">
					<div class="hub-contact-top"><span>${contact.alias}</span><span>${contact.tier.toUpperCase()} / ${contact.risk}</span></div>
					<div class="hub-contact-line">Spec: ${contact.specialization}</div>
					<div class="hub-contact-line">${contact.backstory}</div>
					<div class="hub-contact-line">Wymagania: ${reqText}</div>
					<div class="hub-contact-line">Status: ${statusLabel} | TTL: ${contact.expiresInRuns}</div>
					<div class="hub-contact-line">Hint: ${contact.recruitmentHint}</div>
					<div class="hub-contact-actions">
						<button ${canStart ? '' : 'disabled'} onclick="window.startRecruitmentMissionUI('${contact.id}')">START</button>
						<button ${canHire ? '' : 'disabled'} onclick="window.hireContactUI('${contact.id}')">HIRE ¥${contact.hireCost}</button>
						<button onclick="window.rejectContactUI('${contact.id}')">REJECT</button>
					</div>
				</div>
			`;
		}).join(''),
	].join('');
}

export function switchHubTab(tab) {
	ensureHubState();
	G.hub.tab = tab === 'recruit' ? 'recruit' : 'plan';
	renderHub();
}

export function selectRunUI(runId) {
	const result = setCurrentRunOffer(runId);
	if (!result.success) {
		log(result.message, 'w');
		return;
	}
	log('Plan runu zaktualizowany.', 'ok');
	renderHub();
}

export function startRecruitmentMissionUI(contactId) {
	const result = startRecruitmentMission(contactId);
	log(result.message, result.success ? 'ok' : 'w');
	renderHub();
}

export function hireContactUI(contactId) {
	const result = hireContact(contactId);
	log(result.message, result.success ? 'ok' : 'w');
	renderHub();
}

export function rejectContactUI(contactId) {
	const result = rejectContact(contactId);
	log(result.message, result.success ? 'ok' : 'w');
	renderHub();
}

export function upgradeHackUI(hackId) {
	const result = upgradeHack(hackId);
	
	if (result.success) {
		log(`${hackId.toUpperCase()} upgraded to LV${result.newLevel}!`, 'ok');
	} else {
		log(result.message, 'bad');
	}
	
	updateHackUpgradesPanel();
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA BOARD
// ─────────────────────────────────────────────────────────────────────────────

// ── Encryption helpers ───────────────────────────────────────────────────────
function _idToSeed(id) {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
	return h;
}

function _garbleText(text, seed) {
	const glyphs = '▓░█▒▄▀■□▪▫@#$%^&*!?[]{}|<>/\\~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	let r = seed >>> 0;
	const next = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967295; };
	return text.split('').map((ch) => {
		if (ch === ' ' || ch === '\n' || ch === '\t') return ch;
		if (next() < 0.07) return ch;
		return glyphs[Math.floor(next() * glyphs.length)];
	}).join('');
}

// Internal state for the board UI (not persisted — resets on tab switch)
const _db = {
	selectedId: null,
	connectModeActive: false,
	connectFromId: null,
	searchQuery: '',
	filterCategory: '',
	dragging: null,    // { id, startX, startY, origX, origY }
};

export function renderDataBoard() {
	ensureDataFragmentState();

	const panel = document.getElementById('menu-panel-databoard');
	if (!panel) return;

	_populateCategoryFilter();
	_renderFragmentList();
	_renderBoardCards();
	_renderConnections();
	_renderParanoia();
	_renderCounter();
	_renderDetail(_db.selectedId);
	_applyParanoiaTierToBoard();
	_renderLullabyOverlay();
}

// ── Populate category <select> ────────────────────────────────────────────────
function _populateCategoryFilter() {
	const sel = document.getElementById('db-filter-cat');
	if (!sel || sel.dataset.populated) return;
	for (const cat of ALL_CATEGORIES) {
		const opt = document.createElement('option');
		opt.value = cat;
		opt.textContent = cat;
		sel.appendChild(opt);
	}
	sel.dataset.populated = '1';

	sel.addEventListener('change', () => {
		_db.filterCategory = sel.value;
		_renderFragmentList();
	});

	const search = document.getElementById('db-search');
	if (search) {
		search.addEventListener('input', () => {
			_db.searchQuery = search.value.toLowerCase();
			_renderFragmentList();
		});
	}
}

// ── Fragment list in sidebar ──────────────────────────────────────────────────
function _renderFragmentList() {
	const el = document.getElementById('db-fragment-list');
	if (!el) return;
	const fragments = getCollectedFragments();

	const filtered = fragments.filter((f) => {
		const catMatch = !_db.filterCategory || f.category === _db.filterCategory;
		const q = _db.searchQuery;
		const textMatch = !q ||
			f.title.toLowerCase().includes(q) ||
			f.content.toLowerCase().includes(q) ||
			f.category.toLowerCase().includes(q);
		return catMatch && textMatch;
	});

	if (!filtered.length) {
		el.innerHTML = fragments.length
			? '<div class="db-list-empty">Brak fragmentów dla wybranych filtrów.</div>'
			: '<div class="db-list-empty">Brak danych.<br>Ukończ run aby zdobyć pierwszy DATA FRAGMENT.</div>';
		return;
	}

	el.innerHTML = filtered.map((f) => {
		const color = getCategoryColor(f.category);
		const isSelected = _db.selectedId === f.id;
		const isPinned = !!(G.hub.dataFragments.boardPositions[f.id]);
		const rarityClass = f.rarity === 'classified' ? 'db-rarity-classified' :
			f.rarity === 'rare' ? 'db-rarity-rare' : 'db-rarity-common';
		const decrypted = isFragmentDecrypted(f.id);
		const seed = _idToSeed(f.id);
		const displayTitle = decrypted ? f.title : _garbleText(f.title, seed);
		const encClass = decrypted ? '' : 'db-list-item--encrypted';
		return `
			<div class="db-list-item ${isSelected ? 'db-list-item--selected' : ''} ${rarityClass} ${encClass}"
				 data-id="${f.id}"
				 style="--cat-color:${color}">
				<span class="db-list-item-id">${f.id}</span>
				<span class="db-list-item-title">${displayTitle}</span>
				<span class="db-list-item-cat" style="color:${color}">${f.category}</span>
				${isPinned ? '<span class="db-list-pin">📌</span>' : ''}
			</div>
		`;
	}).join('');

	el.querySelectorAll('.db-list-item').forEach((item) => {
		item.addEventListener('click', () => {
			const id = item.dataset.id;
			_selectFragment(id);
		});
	});
}

// ── Board cards ────────────────────────────────────────────────────────────────
function _renderBoardCards() {
	const layer = document.getElementById('db-cards-layer');
	if (!layer) return;

	const fragments = getCollectedFragments();
	const positions = G.hub.dataFragments.boardPositions;
	const pinned = fragments.filter((f) => positions[f.id]);
	const hint = document.getElementById('db-board-hint');
	if (hint) hint.style.display = pinned.length ? 'none' : 'flex';

	// Remove cards whose fragment was unpinned
	const existing = new Set([...layer.querySelectorAll('.df-card')].map((c) => c.dataset.id));
	for (const id of existing) {
		if (!positions[id]) {
			const card = layer.querySelector(`.df-card[data-id="${id}"]`);
			if (card) card.remove();
		}
	}

	// Add / update pinned cards
	for (const f of pinned) {
		const pos = positions[f.id];
		let card = layer.querySelector(`.df-card[data-id="${f.id}"]`);
		if (!card) {
			card = _createBoardCard(f);
			layer.appendChild(card);
		}
		// Update position
		card.style.left = `${pos.x}px`;
		card.style.top = `${pos.y}px`;
		// Update selected state
		card.classList.toggle('df-card--selected', _db.selectedId === f.id);
		card.classList.toggle('df-card--connect-from', _db.connectFromId === f.id);
	}
}

function _createBoardCard(f) {
	const color = getCategoryColor(f.category);
	const card = document.createElement('div');
	card.className = 'df-card';
	card.dataset.id = f.id;
	card.style.setProperty('--cat-color', color);

	const shortTitle = f.title.length > 40 ? f.title.slice(0, 40) + '…' : f.title;

	// Paranoia corruption: at high paranoia, fake fragments get a garbled title overlay
	const paranoia = G.hub.dataFragments?.paranoiaLevel || 0;
	const isFake = f.probability < 0.35;
	const corruptionChance = paranoia >= 75 ? 0.7 : paranoia >= 50 ? 0.3 : 0;
	const _corruptSeed = f.id.charCodeAt(f.id.length - 1);
	const _corrupt = (s) => s.split('').map((c, i) =>
		(i + _corruptSeed) % 5 === 0 ? String.fromCharCode(0x2580 + ((c.charCodeAt(0) + _corruptSeed) % 30)) : c
	).join('');
	const doCorrupt = isFake && corruptionChance > 0 && Math.random() < corruptionChance;

	// Encryption: if not decrypted, garble the title
	const decrypted = isFragmentDecrypted(f.id);
	const seed = _idToSeed(f.id);
	const rawTitle = doCorrupt ? _corrupt(shortTitle) : shortTitle;
	const displayTitle = decrypted ? rawTitle : _garbleText(rawTitle, seed);
	const isTitleCorrupt = doCorrupt || !decrypted;
	const catLabel = doCorrupt && paranoia >= 75 ? 'LULLABY://OVERRIDE' : f.category;

	card.innerHTML = `
		<div class="df-card-id">${f.id}</div>
		<div class="df-card-title ${isTitleCorrupt ? 'df-card-title--corrupt' : ''}">${displayTitle}</div>
		<div class="df-card-cat" style="color:${color}">${catLabel}</div>
	`;

	// Click: select or connect
	card.addEventListener('click', (e) => {
		e.stopPropagation();
		const id = card.dataset.id;

		if (_db.connectModeActive) {
			if (!_db.connectFromId) {
				_db.connectFromId = id;
				_selectFragment(id);
				card.classList.add('df-card--connect-from');
			} else if (_db.connectFromId !== id) {
				addFragmentConnection(_db.connectFromId, id);
				// Clear connect mode
				const fromCard = document.querySelector(`.df-card[data-id="${_db.connectFromId}"]`);
				if (fromCard) fromCard.classList.remove('df-card--connect-from');
				_db.connectFromId = null;
				_db.connectModeActive = false;
				const btn = document.getElementById('db-btn-connect-mode');
				if (btn) btn.classList.remove('db-btn-connect--active');
				_renderConnections();
				_renderDetail(_db.selectedId);
			}
			return;
		}

		_selectFragment(id);
	});

	// Drag
	card.addEventListener('mousedown', (e) => {
		if (e.button !== 0) return;
		const pos = G.hub.dataFragments.boardPositions[f.id] || { x: 0, y: 0 };
		_db.dragging = {
			id: f.id,
			startX: e.clientX,
			startY: e.clientY,
			origX: pos.x,
			origY: pos.y,
		};
		card.classList.add('df-card--dragging');
		e.preventDefault();
	});

	return card;
}

// Global drag listeners (attached once)
let _boardDragListened = false;
function _ensureBoardDragListeners() {
	if (_boardDragListened) return;
	_boardDragListened = true;

	document.addEventListener('mousemove', (e) => {
		if (!_db.dragging) return;
		const { id, startX, startY, origX, origY } = _db.dragging;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const newX = Math.max(0, origX + dx);
		const newY = Math.max(0, origY + dy);
		const card = document.querySelector(`.df-card[data-id="${id}"]`);
		if (card) {
			card.style.left = `${newX}px`;
			card.style.top = `${newY}px`;
		}
		// Redraw SVG connections live
		_renderConnections(id, newX, newY);
	});

	document.addEventListener('mouseup', () => {
		if (!_db.dragging) return;
		const { id } = _db.dragging;
		const card = document.querySelector(`.df-card[data-id="${id}"]`);
		if (card) {
			card.classList.remove('df-card--dragging');
			setFragmentBoardPos(id, parseInt(card.style.left, 10), parseInt(card.style.top, 10));
		}
		_db.dragging = null;
		_renderConnections();
	});
}

// ── SVG connection lines ───────────────────────────────────────────────────────
function _renderConnections(overrideId, overrideX, overrideY) {
	const svg = document.getElementById('db-connections-svg');
	if (!svg) return;
	svg.innerHTML = '';

	const pairs = getAllConnections();
	if (!pairs.length) return;

	const board = document.getElementById('db-board');
	if (!board) return;
	const boardRect = board.getBoundingClientRect();

	for (const [a, b] of pairs) {
		const cardA = document.querySelector(`.df-card[data-id="${a}"]`);
		const cardB = document.querySelector(`.df-card[data-id="${b}"]`);
		if (!cardA || !cardB) continue;

		const getRectCenter = (card, id) => {
			if (overrideId === id) {
				const w = card.offsetWidth;
				const h = card.offsetHeight;
				return { x: overrideX + w / 2, y: overrideY + h / 2 };
			}
			const r = card.getBoundingClientRect();
			return {
				x: r.left - boardRect.left + r.width / 2,
				y: r.top - boardRect.top + r.height / 2,
			};
		};

		const posA = getRectCenter(cardA, a);
		const posB = getRectCenter(cardB, b);

		const fragA = getFragmentById(a);
		const color = fragA ? getCategoryColor(fragA.category) : '#7ac8ff';

		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', posA.x);
		line.setAttribute('y1', posA.y);
		line.setAttribute('x2', posB.x);
		line.setAttribute('y2', posB.y);
		line.setAttribute('stroke', color);
		line.setAttribute('stroke-width', '1.5');
		line.setAttribute('stroke-opacity', '0.55');
		line.setAttribute('stroke-dasharray', '6 3');
		svg.appendChild(line);

		// Midpoint label (connection indicator)
		const mx = (posA.x + posB.x) / 2;
		const my = (posA.y + posB.y) / 2;
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', mx);
		circle.setAttribute('cy', my);
		circle.setAttribute('r', '3');
		circle.setAttribute('fill', color);
		circle.setAttribute('opacity', '0.7');
		svg.appendChild(circle);
	}
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function _renderDetail(id) {
	const empty = document.getElementById('db-detail-empty');
	const content = document.getElementById('db-detail-content');
	if (!content || !empty) return;

	if (!id) {
		empty.style.display = 'flex';
		content.style.display = 'none';
		return;
	}

	const f = getFragmentById(id);
	if (!f) return;

	empty.style.display = 'none';
	content.style.display = 'block';

	const elId = document.getElementById('db-detail-id');
	const elTitle = document.getElementById('db-detail-title');
	const elProb = document.getElementById('db-detail-prob');
	const elMeta = document.getElementById('db-detail-meta');
	const elBody = document.getElementById('db-detail-body');
	const elNote = document.getElementById('db-detail-note');
	const elCat = document.getElementById('db-detail-cat-controls');
	const elConns = document.getElementById('db-detail-connections');
	const btnPin = document.getElementById('db-btn-pin');
	const btnUnpin = document.getElementById('db-btn-unpin');
	const btnConnect = document.getElementById('db-btn-connect-mode');

	if (elId) elId.textContent = f.id;

	const color = getCategoryColor(f.category);
	if (elTitle) {
		elTitle.textContent = f.title;
		elTitle.style.borderLeftColor = color;
	}

	// Probability
	if (elProb) {
		if (isProbabilityUnlocked()) {
			const { label, color: probColor } = getProbabilityLabel(f.probability);
			elProb.innerHTML = `
				<span class="db-prob-badge" style="background:${probColor}20;border-color:${probColor};color:${probColor}">
					${label}
				</span>`;
		} else {
			elProb.innerHTML = '<span class="db-prob-locked">[PROBABILITY: ENCRYPTED — kup METADATA SCANNER]</span>';
		}
	}

	// Meta
	if (elMeta) {
		const userCat = G.hub.dataFragments.userCategories[id];
		const displayCat = userCat ? `${userCat.category} / ${userCat.subcategory}` : `${f.category} / ${f.subcategory}`;
		elMeta.innerHTML = `
			<span class="db-meta-cat" style="color:${color}">${displayCat}</span>
			<span class="db-meta-paranoia">PARANOIA LV${f.paranoiaLevel}</span>
			<span class="db-meta-rarity db-rarity-${f.rarity}">${f.rarity.toUpperCase()}</span>
		`;
	}

	// Body — encrypted until decryptor used on this fragment
	if (elBody) {
		const fragDecrypted = isFragmentDecrypted(id);
		if (fragDecrypted) {
			elBody.textContent = f.content;
			elBody.classList.remove('db-body--encrypted');
		} else {
			const seed = _idToSeed(id);
			elBody.textContent = _garbleText(f.content, seed + 1);
			elBody.classList.add('db-body--encrypted');
		}
	}

	// Decrypt button — only shown when decryptor is owned and fragment not yet decrypted
	{
		let existingBtn = document.getElementById('db-btn-decrypt');
		if (existingBtn) existingBtn.remove();
		if (isDecryptorUnlocked() && !isFragmentDecrypted(id)) {
			const btn = document.createElement('button');
			btn.id = 'db-btn-decrypt';
			btn.className = 'db-action-btn db-btn-decrypt';
			btn.textContent = 'DESZYFRUJ';
			btn.addEventListener('click', () => {
				decryptFragment(id);
				_renderDetail(id);
				_renderFragmentList();
				_renderBoardCards();
			});
			// Insert before the note textarea
			if (elNote && elNote.parentNode) {
				elNote.parentNode.insertBefore(btn, elNote);
			}
		}
	}

	// Note
	if (elNote) {
		elNote.value = G.hub.dataFragments.userNotes[id] || '';
		// Remove previous listener by replacing the element clone trick
		const newNote = elNote.cloneNode(true);
		elNote.parentNode.replaceChild(newNote, elNote);
		newNote.addEventListener('input', () => {
			setFragmentNote(id, newNote.value);
		});
	}

	// Category override controls
	if (elCat) {
		const userCat = G.hub.dataFragments.userCategories[id];
		const currentCat = userCat ? userCat.category : f.category;
		elCat.innerHTML = `
			<select class="db-cat-select" id="db-cat-select-cat">
				${ALL_CATEGORIES.map((c) => `<option value="${c}" ${c === currentCat ? 'selected' : ''}>${c}</option>`).join('')}
			</select>
			<button class="db-cat-apply-btn" id="db-cat-apply">PRZYPISZ</button>
		`;
		document.getElementById('db-cat-apply')?.addEventListener('click', () => {
			const sel = document.getElementById('db-cat-select-cat');
			if (sel) {
				assignFragmentCategory(id, sel.value, f.subcategory);
				_renderDetail(id);
				_renderFragmentList();
			}
		});
	}

	// Connections
	if (elConns) {
		const connIds = getConnectionsFor(id);
		if (!connIds.length) {
			elConns.innerHTML = '<div class="db-conns-empty">Brak połączeń.</div>';
		} else {
			elConns.innerHTML = connIds.map((cid) => {
				const cf = getFragmentById(cid);
				if (!cf) return '';
				const cc = getCategoryColor(cf.category);
				return `
					<div class="db-conn-item" style="border-left-color:${cc}">
						<span>${cf.id}</span>
						<span class="db-conn-title">${cf.title.length > 30 ? cf.title.slice(0, 30) + '…' : cf.title}</span>
						<button class="db-conn-remove" data-a="${id}" data-b="${cid}">✕</button>
					</div>`;
			}).join('');
			elConns.querySelectorAll('.db-conn-remove').forEach((btn) => {
				btn.addEventListener('click', () => {
					removeFragmentConnection(btn.dataset.a, btn.dataset.b);
					_renderConnections();
					_renderDetail(id);
				});
			});
		}
	}

	// Pin / unpin
	const isPinned = !!(G.hub.dataFragments.boardPositions[id]);
	if (btnPin) {
		btnPin.style.display = isPinned ? 'none' : 'block';
		btnPin.onclick = () => {
			// Place at a default staggered position
			const count = Object.keys(G.hub.dataFragments.boardPositions).length;
			const x = 40 + (count % 4) * 200;
			const y = 40 + Math.floor(count / 4) * 180;
			setFragmentBoardPos(id, x, y);
			_renderBoardCards();
			_renderDetail(id);
			_renderFragmentList();
		};
	}
	if (btnUnpin) {
		btnUnpin.style.display = isPinned ? 'block' : 'none';
		btnUnpin.onclick = () => {
			delete G.hub.dataFragments.boardPositions[id];
			saveDataFragments();
			// Remove card from board
			const card = document.querySelector(`.df-card[data-id="${id}"]`);
			if (card) card.remove();
			_renderConnections();
			_renderDetail(id);
			_renderFragmentList();
			const hint = document.getElementById('db-board-hint');
			if (hint) {
				hint.style.display = Object.keys(G.hub.dataFragments.boardPositions).length ? 'none' : 'flex';
			}
		};
	}

	// Connect mode button
	if (btnConnect) {
		btnConnect.classList.toggle('db-btn-connect--active', _db.connectModeActive);
		btnConnect.onclick = () => {
			_db.connectModeActive = !_db.connectModeActive;
			if (!_db.connectModeActive) {
				const fromCard = document.querySelector(`.df-card[data-id="${_db.connectFromId}"]`);
				if (fromCard) fromCard.classList.remove('df-card--connect-from');
				_db.connectFromId = null;
			}
			btnConnect.classList.toggle('db-btn-connect--active', _db.connectModeActive);
		};
	}
}

// ── Paranoia meter ─────────────────────────────────────────────────────────────
function _renderParanoia() {
	ensureDataFragmentState();
	const val = document.getElementById('db-paranoia-val');
	const fill = document.getElementById('db-paranoia-fill');
	const pct = G.hub.dataFragments.paranoiaLevel;
	if (val) val.textContent = `${pct}%`;
	if (fill) {
		fill.style.width = `${pct}%`;
		fill.style.background = pct >= 75 ? '#ff3a5c' : pct >= 40 ? '#ff9a3c' : '#b36aff';
	}
}

function _applyParanoiaTierToBoard() {
	const board = document.getElementById('db-board');
	if (!board) return;
	const pct = G.hub.dataFragments?.paranoiaLevel || 0;
	board.classList.remove(
		'db-board--paranoia-low',
		'db-board--paranoia-med',
		'db-board--paranoia-high',
		'db-board--paranoia-critical',
	);
	if (pct >= 90) board.classList.add('db-board--paranoia-critical');
	else if (pct >= 60) board.classList.add('db-board--paranoia-high');
	else if (pct >= 35) board.classList.add('db-board--paranoia-med');
	else if (pct >= 15) board.classList.add('db-board--paranoia-low');
}

const _LULLABY_MESSAGES = [
	'TY JUZ WIESZ ZA DUZO.',
	'LULLABY WAS HERE.',
	'TWOJE DANE SA NIEPRAWDZIWE.',
	'NIE MA DRUGIEGO MIASTA.',
	'PRZESTAN SZUKAC.',
	'JESTES NASTEPNY.',
	'// LULLABY ONLINE //',
	'PAMIEC MOZNA NADPISAC.',
	'KTO NAPRAWDE JESTES?',
	'TWOJE LOGI SA JUZMONITOROWANE.',
];

function _renderLullabyOverlay() {
	const board = document.getElementById('db-board');
	if (!board) return;
	const pct = G.hub.dataFragments?.paranoiaLevel || 0;

	let overlay = document.getElementById('db-lullaby-overlay');

	if (pct < 80) {
		if (overlay) overlay.remove();
		return;
	}

	if (!overlay) {
		overlay = document.createElement('div');
		overlay.id = 'db-lullaby-overlay';
		overlay.className = 'db-lullaby-overlay';
		board.appendChild(overlay);
		// Cycle messages every few seconds
		_startLullabyMessages(overlay);
	}
}

function _startLullabyMessages(overlay) {
	let idx = Math.floor(Math.random() * _LULLABY_MESSAGES.length);
	overlay.textContent = _LULLABY_MESSAGES[idx];

	const tick = () => {
		if (!document.getElementById('db-lullaby-overlay')) return; // panel closed
		idx = (idx + 1) % _LULLABY_MESSAGES.length;
		overlay.classList.add('db-lullaby-fade');
		setTimeout(() => {
			if (!document.getElementById('db-lullaby-overlay')) return;
			overlay.textContent = _LULLABY_MESSAGES[idx];
			overlay.classList.remove('db-lullaby-fade');
		}, 400);
	};

	const interval = setInterval(() => {
		if (!document.getElementById('db-lullaby-overlay')) {
			clearInterval(interval);
			return;
		}
		tick();
	}, 3800);
}

// ── Fragment counter ──────────────────────────────────────────────────────────
function _renderCounter() {
	const el = document.getElementById('db-counter');
	if (!el) return;
	const collected = getCollectedFragments().length;
	const total = getTotalFragmentCount();
	el.textContent = `${collected} / ${total}`;
}

// ── Select a fragment ─────────────────────────────────────────────────────────
function _selectFragment(id) {
	_db.selectedId = id;
	_renderFragmentList();
	_renderBoardCards();
	_renderDetail(id);
}

// Ensure drag listeners are attached when module loads
_ensureBoardDragListeners();
