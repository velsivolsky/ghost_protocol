import { G, byType } from '../core/state.js';
import { TILE_TYPES } from '../core/constants.js';
import { clamp, dst } from '../utils/math.js';
import { floatMsg, log, rebuildList } from '../systems/ui.js';
import { lineOfSight } from '../utils/los.js';
import { findNextStep } from '../world/pathing.js';
import { canWalk } from '../world/map.js';

const TECHNICIAN_SPEED = 1.2;
const TECH_ANIM_FPS = {
	idle: 4,
	walk: 8,
	alert: 6,
	death: 4,
};
const TECH_ANIM_FRAMES = {
	idle: 4,
	walk: 6,
	alert: 4,
	death: 6,
};

export function createTechnician(index, room) {
	return {
		id: `tech${index}`,
		type: 'tech',
		x: room.x + 1.5,
		y: room.y + 1.5,
		homeX: room.x + room.w / 2,
		homeY: room.y + room.h / 2,
		patrolA: { x: room.x + 1.5, y: room.y + 1.5 },
		patrolB: { x: room.x + room.w - 1.5, y: room.y + room.h - 1.5 },
		patrolIndex: 0,
		targetId: null,
		state: 'patrol',
		repairTimer: 0,
		repairDuration: 0,
		inspectTimer: 0,
		inspectDuration: 0,
		spotCooldown: 0,
		investigateTargetId: null,
		dead: false,
		desc: `Technik #${index + 1}`,
		hackable: false,
		angle: 0,
		animFrame: 0,
		animTimer: 0,
	};
}

export function updateTechAnim(technician, dt) {
	if (!technician) {
		return;
	}

	const prevX = Number.isFinite(technician._animPrevX) ? technician._animPrevX : technician.x;
	const prevY = Number.isFinite(technician._animPrevY) ? technician._animPrevY : technician.y;
	const movedDist = Math.hypot((technician.x || 0) - prevX, (technician.y || 0) - prevY);

	technician._animPrevX = technician.x;
	technician._animPrevY = technician.y;

	const animState = getTechAnimState(technician, movedDist);
	const fps = TECH_ANIM_FPS[animState] ?? 4;
	const frames = TECH_ANIM_FRAMES[animState] ?? 4;

	technician.animTimer = Math.max(0, Number(technician.animTimer || 0));
	technician.animTimer += (fps * Math.max(0, dt || 0)) / 1000;

	if (animState === 'death') {
		technician.animTimer = Math.min(technician.animTimer, frames - 1);
	} else {
		technician.animTimer %= frames;
	}

	technician.animFrame = Math.max(0, Math.min(frames - 1, Math.floor(technician.animTimer)));
}

function getTechAnimState(technician, movedDist) {
	if (technician.dead || technician.state === 'dead') {
		return 'death';
	}

	if (
		technician.state === 'repair' ||
		technician.state === 'repairing' ||
		technician.state === 'inspect' ||
		technician.state === 'investigate'
	) {
		return 'alert';
	}

	if (movedDist > 0.0015 || technician.state === 'patrol' || technician.state === 'return') {
		return 'walk';
	}

	return 'idle';
}

export function tickTechnician(technician, dt) {
	if (technician.dead || G.techDisabled) {
		return;
	}

	updateSpotting(technician, dt);

	if (technician.state === 'repair') {
		const camera = byType('cam').find((device) => device.id === technician.targetId);

		if (!camera || !camera.hacked) {
			technician.state = 'return';
			technician.targetId = null;
			return;
		}

		moveToward(technician, camera.x + 0.5, camera.y + 0.5, dt, 1);

		if (dst(technician, { x: camera.x + 0.5, y: camera.y + 0.5 }) < 0.45) {
			technician.state = 'repairing';
			technician.repairTimer = 0;
			technician.repairDuration = 1200 + Math.random() * 4200;
			floatMsg('REPAIR...', camera, '#c7d2ff');
		}

		return;
	}

	if (technician.state === 'repairing') {
		const camera = byType('cam').find((device) => device.id === technician.targetId);

		if (!camera || !camera.hacked) {
			technician.state = 'return';
			technician.targetId = null;
			technician.repairTimer = 0;
			technician.repairDuration = 0;
			return;
		}

		moveToward(technician, camera.x + 0.5, camera.y + 0.5, dt, 0.2);
		technician.repairTimer += dt;

		if (technician.repairTimer >= technician.repairDuration) {
			camera.hacked = false;
			technician.state = 'return';
			technician.targetId = null;
			technician.repairTimer = 0;
			technician.repairDuration = 0;
			G.alert = clamp(G.alert + 2);
			log(`Technik naprawił ${camera.desc}`, 'w');
			floatMsg('REPAIRED', camera, '#c7d2ff');
			rebuildList();
		}

		return;
	}

	if (technician.state === 'return') {
		moveToward(technician, technician.homeX, technician.homeY, dt, 1);

		if (dst(technician, { x: technician.homeX, y: technician.homeY }) < 0.4) {
			technician.state = 'patrol';
			technician.patrolIndex = 0;
		}

		return;
	}

	if (technician.state === 'investigate') {
		const distraction = byType('distract').find((device) => device.id === technician.investigateTargetId);

		if (!distraction || !distraction.active) {
			technician.state = 'return';
			technician.investigateTargetId = null;
			return;
		}

		moveToward(technician, distraction.x, distraction.y, dt, 1);
		if (dst(technician, distraction) < 0.45) {
			technician.state = 'inspect';
			technician.inspectTimer = 0;
			technician.inspectDuration = 1500 + Math.random() * 2300;
			floatMsg('ANALYZE...', distraction, '#9de9dc');
		}
		return;
	}

	if (technician.state === 'inspect') {
		const distraction = byType('distract').find((device) => device.id === technician.investigateTargetId);

		if (!distraction) {
			technician.state = 'return';
			technician.investigateTargetId = null;
			technician.inspectTimer = 0;
			technician.inspectDuration = 0;
			return;
		}

		moveToward(technician, distraction.x, distraction.y, dt, 0.18);
		technician.inspectTimer += dt;

		if (technician.inspectTimer >= technician.inspectDuration) {
			technician.state = 'return';
			technician.investigateTargetId = null;
			technician.inspectTimer = 0;
			technician.inspectDuration = 0;
			distraction.active = false;
			distraction.cooldownUntil = Math.max(distraction.cooldownUntil || 0, performance.now() + Math.max(2500, distraction.cooldownMs * 0.6));
			floatMsg('CLEAR', distraction, '#c7d2ff');
		}
		return;
	}

	if (technician.state === 'patrol') {
		const activeDistractors = byType('distract').filter((device) => {
			if (!device.active) {
				return false;
			}
			if (dst(technician, device) > 13.5) {
				return false;
			}
			const cooldown = Number(device.cooldownUntil || 0);
			return performance.now() >= cooldown;
		});

		if (activeDistractors.length) {
			activeDistractors.sort((a, b) => dst(technician, a) - dst(technician, b));
			technician.state = 'investigate';
			technician.investigateTargetId = activeDistractors[0].id;
			return;
		}
	}

	const patrolTarget = technician.patrolIndex % 2 === 0 ? technician.patrolA : technician.patrolB;
	moveToward(technician, patrolTarget.x, patrolTarget.y, dt, 0.4);

	if (dst(technician, patrolTarget) < 0.35) {
		technician.patrolIndex += 1;
	}
}

function moveToward(technician, targetX, targetY, dt, speedFactor) {
	let stepTargetX = targetX;
	let stepTargetY = targetY;

	const startX = technician.x | 0;
	const startY = technician.y | 0;
	const goalX = targetX | 0;
	const goalY = targetY | 0;

	if (startX !== goalX || startY !== goalY) {
		const next = findNextStep(G.tiles, startX, startY, goalX, goalY);

		if (next) {
			stepTargetX = next.x + 0.5;
			stepTargetY = next.y + 0.5;
		}
	}

	const dx = stepTargetX - technician.x;
	const dy = stepTargetY - technician.y;
	const length = Math.hypot(dx, dy) || 1;
	if (length > 1e-4) {
		technician.angle = Math.atan2(dy, dx);
	}
	const step = (TECHNICIAN_SPEED * speedFactor * dt) / 1000;
	const moveStep = Math.min(step, length);
	const moveX = (dx / length) * moveStep;
	const moveY = (dy / length) * moveStep;

	if (canOccupyNpc(G.tiles, technician.x + moveX, technician.y)) {
		technician.x += moveX;
	}

	if (canOccupyNpc(G.tiles, technician.x, technician.y + moveY)) {
		technician.y += moveY;
	}
}

function canOccupyNpc(tiles, x, y) {
	const left = x + 0.18;
	const right = x + 0.82;
	const top = y + 0.16;
	const bottom = y + 0.84;

	return (
		canWalk(tiles, left, top) &&
		canWalk(tiles, right, top) &&
		canWalk(tiles, left, bottom) &&
		canWalk(tiles, right, bottom)
	);
}

function updateSpotting(technician, dt) {
	technician.spotCooldown = Math.max(0, (technician.spotCooldown || 0) - dt);

	if (!G.P || G.dead || G.blackout) {
		return;
	}

	if (dst(technician, G.P) > 6.2) {
		return;
	}

	if (isPlayerHiddenFromTech(technician)) {
		return;
	}

	const seesPlayer = lineOfSight(
		technician.x,
		technician.y,
		G.P.x,
		G.P.y,
		(x, y) => {
			const tile = G.tiles[y]?.[x];
			return tile === TILE_TYPES.WALL || tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.WALL_TERMINAL;
		},
	);

	if (!seesPlayer) {
		return;
	}

	G.alert = clamp(G.alert + dt * 0.01);

	if (technician.spotCooldown <= 0) {
		technician.spotCooldown = 1500;
		log('Technik alarmuje o intruzie!', 'w');
		floatMsg('ALERT', technician, '#ff9a3c');
	}
}

function isPlayerHiddenFromTech(technician) {
	const tileX = G.P.x | 0;
	const tileY = G.P.y | 0;
	const tile = G.tiles[tileY]?.[tileX];

	return tile === TILE_TYPES.HIDE_SPOT;
}