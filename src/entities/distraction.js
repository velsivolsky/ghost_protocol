export function createDistraction(index, node = {}) {
	const x = Number(node.x || 0) + 0.5;
	const y = Number(node.y || 0) + 0.5;

	return {
		id: node.id || `distract_${index + 1}`,
		type: 'distract',
		x,
		y,
		desc: node.desc || 'Węzeł dystrakcji',
		networkName: node.networkName || `DISTRACT-${index + 1}`,
		nodeType: node.type || 'generic',
		active: false,
		activeUntil: 0,
		cooldownUntil: 0,
		durationMs: Math.max(2500, Number(node.durationMs || 6000)),
		cooldownMs: Math.max(3000, Number(node.cooldownMs || 7000)),
		hackable: true,
	};
}

export function tickDistraction(distraction, _dt) {
	if (!distraction) {
		return;
	}

	const now = performance.now();
	if (distraction.active && now >= (distraction.activeUntil || 0)) {
		distraction.active = false;
	}
}
