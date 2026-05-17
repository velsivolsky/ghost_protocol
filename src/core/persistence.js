import { G } from './state.js';

const HUB_STORAGE_KEY = 'gp_hub_state';

function clone(value) {
	try {
		return JSON.parse(JSON.stringify(value));
	} catch {
		return value;
	}
}

export function saveHubState() {
	if (!G.hub) {
		return;
	}

	try {
		localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify({
			tab: G.hub.tab,
			notoriety: G.hub.notoriety,
			walletCredits: G.hub.walletCredits,
			debugBootstrapApplied: G.hub.debugBootstrapApplied,
			activeRuns: clone(G.hub.activeRuns || []),
			currentRunId: G.hub.currentRunId,
			activeRunMeta: clone(G.hub.activeRunMeta),
			runIntelCache: clone(G.hub.runIntelCache || {}),
			runSerial: G.hub.runSerial,
			contacts: clone(G.hub.contacts || []),
			crew: clone(G.hub.crew || []),
			contactSerial: G.hub.contactSerial,
			lastContactDropId: G.hub.lastContactDropId,
			selectedOperatorId: G.hub.selectedOperatorId,
			activeOperatorId: G.hub.activeOperatorId,
			runResolved: G.hub.runResolved,
		}));
	} catch {
		// Ignore storage failures.
	}
}

export function loadHubState() {
	try {
		const raw = localStorage.getItem(HUB_STORAGE_KEY);
		if (!raw) {
			return false;
		}

		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') {
			return false;
		}

		if (!G.hub) {
			G.hub = {};
		}

		if (typeof parsed.tab === 'string') G.hub.tab = parsed.tab;
		if (typeof parsed.notoriety === 'number') G.hub.notoriety = parsed.notoriety;
		if (typeof parsed.walletCredits === 'number') G.hub.walletCredits = parsed.walletCredits;
		if (typeof parsed.debugBootstrapApplied === 'boolean') G.hub.debugBootstrapApplied = parsed.debugBootstrapApplied;
		if (Array.isArray(parsed.activeRuns)) G.hub.activeRuns = parsed.activeRuns;
		if (Object.prototype.hasOwnProperty.call(parsed, 'currentRunId')) G.hub.currentRunId = parsed.currentRunId;
		if (Object.prototype.hasOwnProperty.call(parsed, 'activeRunMeta')) G.hub.activeRunMeta = parsed.activeRunMeta;
		if (parsed.runIntelCache && typeof parsed.runIntelCache === 'object') G.hub.runIntelCache = parsed.runIntelCache;
		if (typeof parsed.runSerial === 'number') G.hub.runSerial = parsed.runSerial;
		if (Array.isArray(parsed.contacts)) G.hub.contacts = parsed.contacts;
		if (Array.isArray(parsed.crew)) G.hub.crew = parsed.crew;
		if (typeof parsed.contactSerial === 'number') G.hub.contactSerial = parsed.contactSerial;
		if (Object.prototype.hasOwnProperty.call(parsed, 'lastContactDropId')) G.hub.lastContactDropId = parsed.lastContactDropId;
		if (Object.prototype.hasOwnProperty.call(parsed, 'selectedOperatorId')) G.hub.selectedOperatorId = parsed.selectedOperatorId;
		if (Object.prototype.hasOwnProperty.call(parsed, 'activeOperatorId')) G.hub.activeOperatorId = parsed.activeOperatorId;
		if (typeof parsed.runResolved === 'boolean') G.hub.runResolved = parsed.runResolved;

		if (G.P && typeof G.hub.walletCredits === 'number') {
			G.P.cr = G.hub.walletCredits;
		}

		return true;
	} catch {
		return false;
	}
}