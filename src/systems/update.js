import {
	EXFIL_DISTANCE,
	MAIN_HACK_DISTANCE,
	PLAYER_SPEED,
	TILE_TYPES,
} from '../core/constants.js';
import { G, byType, initFloorState } from '../core/state.js';
import { createCamera } from '../entities/camera.js';
import { tickDrone, createDrone } from '../entities/drone.js';
import { createGuard, tickGuard } from '../entities/guard.js';
import { createTechnician, tickTechnician } from '../entities/technician.js';
import { updateMissionText, win } from './mission.js';
import { hideMainHackLoading, log, rebuildList, refreshHUD, syncMainHackLoading, syncZoneLabel } from './ui.js';
import { clamp, dst } from '../utils/math.js';
import { canWalk } from '../world/map.js';
import { updateVisibility } from './visibility.js';
import { lineOfSight } from '../utils/los.js';
import { closeCtx } from './hacking.js';
import { getTimeScale, startQuickHackWindow, tickQuickHackWindow } from './quickhacks.js';
import { launchNetworkBreach } from './networkBreach.js';
import { resolveRunFailure } from './recruitment.js';

const STAIR_TRANSITION_COOLDOWN_MS = 900;

export function spawnEntities(rooms, wave) {
	const devices = [];
	const spawnRooms = getSpawnRooms(rooms);

	for (let index = 0; index < spawnRooms.length; index += 1) {
		devices.push(createCamera(index, spawnRooms[index]));
	}

	const guardCount = 2 + Math.floor(wave * 1.5);

	for (let index = 0; index < guardCount; index += 1) {
		const room = spawnRooms[(Math.random() * spawnRooms.length) | 0];
		devices.push(createGuard(index, room, wave));
	}

	if (wave > 1) {
		for (let index = 0; index < wave - 1; index += 1) {
			const room = spawnRooms[(Math.random() * spawnRooms.length) | 0];
			devices.push(createDrone(index, room, wave));
		}
	}

	const shouldSpawnTechs = wave >= 1;

	if (shouldSpawnTechs) {
		const techRoom = spawnRooms[(Math.random() * spawnRooms.length) | 0] || rooms[0];
		const techCount = Math.max(1, Math.min(3, wave >= 4 ? 3 : wave >= 2 ? 2 : 1));

		for (let index = 0; index < techCount; index += 1) {
			devices.push(createTechnician(index, techRoom));
		}
	}

	return devices;
}

function getSpawnRooms(rooms) {
	const entranceRoom = rooms[0];
	const entranceX = entranceRoom.x + entranceRoom.w / 2;
	const entranceY = entranceRoom.y + entranceRoom.h / 2;
	const candidates = rooms
		.slice(1)
		.filter((room) => dst({ x: room.x + room.w / 2, y: room.y + room.h / 2 }, { x: entranceX, y: entranceY }) > 10);
	const fallback = rooms.slice(1);

	if (candidates.length) {
		return candidates;
	}

	if (fallback.length) {
		return fallback;
	}

	return [rooms[0]];
}

export function update(dt) {
	if (!G.P || G.dead || G.cleared) {
		return;
	}

	G.stairTransitionCooldownMs = Math.max(0, (G.stairTransitionCooldownMs || 0) - dt);

	tickQuickHackWindow(dt);

	if (G.paused) {
		refreshHUD();
		rebuildList();
		return;
	}

	const simDt = dt * getTimeScale();

	G.tick += 1;
	G.cameraAlertTimer = Math.max(0, G.cameraAlertTimer - simDt);
	G.P.bw = Math.min(G.P.mbw, G.P.bw + simDt * 0.035);
	G.neuralOverloadT = Math.max(0, (G.neuralOverloadT || 0) - dt);

	if (G.neuralOverloadT > 0) {
		G.blackout = true;
		G.boT = Math.max(G.boT || 0, G.neuralOverloadT);
	}

	if (G.blackout) {
		G.boT -= simDt;

		if (G.boT <= 0) {
			G.blackout = false;
		}
	}

	const tileX = G.P.x | 0;
	const tileY = G.P.y | 0;
	const tile = G.tiles[tileY]?.[tileX];
	G.isHiding = tile === TILE_TYPES.HIDE_SPOT;

	const targetDesaturation = G.isHiding ? 0.6 : 0;
	G.desaturation += (targetDesaturation - G.desaturation) * 0.1;

	const moved = updatePlayerMovement(simDt);
	updateVisibility();

	if (checkStairTransition()) {
		refreshHUD();
		rebuildList();
		return;
	}

	if (G.hackingMain) {
		const mainTerminalDistance = dst(G.P, G.mainTerminal);

		if (mainTerminalDistance > MAIN_HACK_DISTANCE || moved) {
			G.hackingMain = false;
			G.hackProgress = Math.max(0, G.hackProgress - 10);
			hideMainHackLoading();
			log('Kanał zerwany. Transfer pakietów przerwany.', 'w');
			updateMissionText();
		}
	}

	if (G.hackingMain) {
		G.hackProgress += simDt * 0.025 * (1 + G.hackSpeedBonus);
		G.alert = clamp(G.alert + simDt * 0.008);
		syncMainHackLoading();

		if (G.hackProgress >= 100) {
			launchNetworkBreach();
		}
	} else {
		hideMainHackLoading();
	}

	if (checkExfiltration()) {
		refreshHUD();
		rebuildList();
		return;
	}

	updateCameras(simDt);

	for (const guard of byType('guard')) {
		if (!guard.dead && !guard.offline) {
			const wasChasing = guard.state === 'chase';
			tickGuard(guard, simDt);

			if (!wasChasing && guard.state === 'chase') {
				startQuickHackWindow(guard.id);
			}
		}
	}

	for (const drone of byType('drone')) {
		if (!drone.dead) {
			tickDrone(drone, simDt);
		}
	}

	for (const technician of byType('tech')) {
		if (!technician.dead) {
			tickTechnician(technician, simDt);
		}
	}

	checkDeadGuardDiscovery();

	if (G.alert > 0 && G.tick % 90 === 0) {
		G.alert = Math.max(0, G.alert - 0.4);
	}

	refreshHUD();
	rebuildList();
}

function checkDeadGuardDiscovery() {
	for (const guard of byType('guard')) {
		if (!guard.dead || guard.bodyReported) {
			continue;
		}

		const spottedByGuard = byType('guard').some((watcher) => canWatcherSeeBody(watcher, guard));
		const spottedByCamera = byType('cam').some((camera) => canCameraSeeBody(camera, guard));

		if (!spottedByGuard && !spottedByCamera) {
			continue;
		}

		guard.bodyReported = true;
		G.alert = clamp(G.alert + 18);
		log(`Wykryto ciało: ${guard.desc}`, 'w');
		triggerGuardInvestigation();
	}
}

function canWatcherSeeBody(watcher, body) {
	if (watcher.dead || watcher.offline || watcher.id === body.id) {
		return false;
	}

	if (dst(watcher, body) > 6.5) {
		return false;
	}

	return lineOfSight(
		watcher.x + 0.5,
		watcher.y + 0.5,
		body.x,
		body.y,
		(x, y) => {
			const tile = G.tiles[y]?.[x];
			return tile === TILE_TYPES.WALL || tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.WALL_TERMINAL;
		},
	);
}

function canCameraSeeBody(camera, body) {
	if (camera.hacked || G.blackout) {
		return false;
	}

	if (dst(camera, body) > camera.range) {
		return false;
	}

	if (!lineOfSight(
		camera.x + 0.5,
		camera.y + 0.5,
		body.x,
		body.y,
		(x, y) => {
			const tile = G.tiles[y]?.[x];
			return tile === TILE_TYPES.WALL || tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.WALL_TERMINAL;
		},
	)) {
		return false;
	}

	const angle = Math.atan2(body.y - camera.y, body.x - camera.x);
	let diff = angle - camera.facing;

	while (diff > Math.PI) diff -= Math.PI * 2;
	while (diff < -Math.PI) diff += Math.PI * 2;

	return Math.abs(diff) < camera.fov / 2;
}

function updatePlayerMovement(dt) {
	let dx = 0;
	let dy = 0;

	if (G.keys.ArrowUp || G.keys.w || G.keys.W) dy = -1;
	if (G.keys.ArrowDown || G.keys.s || G.keys.S) dy = 1;
	if (G.keys.ArrowLeft || G.keys.a || G.keys.A) dx = -1;
	if (G.keys.ArrowRight || G.keys.d || G.keys.D) dx = 1;

	if (dx && dy) {
		dx *= 0.707;
		dy *= 0.707;
	}

	const speed = (PLAYER_SPEED * dt) / 1000;

	if (dx || dy) {
		const moveX = dx * speed;
		const moveY = dy * speed;
		const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / 0.08));
		const stepX = moveX / steps;
		const stepY = moveY / steps;

		for (let index = 0; index < steps; index += 1) {
			if (canOccupy(G.tiles, G.P.x + stepX, G.P.y)) {
				G.P.x += stepX;
			}

			if (canOccupy(G.tiles, G.P.x, G.P.y + stepY)) {
				G.P.y += stepY;
			}
		}

		return true;
	}

	return false;
}

function canOccupy(tiles, x, y) {
	const left = x + 0.14;
	const right = x + 0.86;
	const top = y + 0.12;
	const bottom = y + 0.86;

	return (
		canWalk(tiles, left, top) &&
		canWalk(tiles, right, top) &&
		canWalk(tiles, left, bottom) &&
		canWalk(tiles, right, bottom)
	);
}

function checkExfiltration() {
	if (G.missionPhase !== 2 || dst(G.P, G.entrance) >= EXFIL_DISTANCE) {
		return false;
	}

	if (G.floor !== 1) {
		return false;
	}

	const compromised = G.alert >= 85;

	if (!compromised) {
		win();
	} else {
		G.cleared = true;
		const recruitmentTick = resolveRunFailure();
		if (recruitmentTick.lostOperator) {
			log(`Operator utracony: ${recruitmentTick.lostOperator.alias}`, 'bad');
		}
		if (recruitmentTick.removedAliases.length) {
			log(`Kontakty przepadły: ${recruitmentTick.removedAliases.join(', ')}`, 'w');
		}
		log('Exfil nieudany: status COMPROMISED.', 'bad');
		G.dom.failOverlay.classList.add('show');
	}

	return true;
}

function checkStairTransition() {
	if (!G.floors?.length) return false;

	const tileX = G.P.x | 0;
	const tileY = G.P.y | 0;
	const tile = G.tiles[tileY]?.[tileX];
	const onStairs = tile === TILE_TYPES.STAIR_UP || tile === TILE_TYPES.STAIR_DOWN;
	const prevStairHint = !!G.stairHintActive;
	G.stairHintActive = onStairs;

	if (prevStairHint !== G.stairHintActive) {
		updateMissionText();
	}

	// Reset armed flag when player leaves stair tile
	if (!onStairs) {
		G.stairTransitionArmed = true;
		G.stairTransitionRequested = false;
		return false;
	}

	if (!G.stairTransitionRequested) return false;

	if (G.stairTransitionCooldownMs > 0) {
		G.stairTransitionRequested = false;
		return false;
	}

	if (!G.stairTransitionArmed) {
		G.stairTransitionRequested = false;
		return false;
	}

	const direction = tile === TILE_TYPES.STAIR_UP ? 1 : -1;
	const nextFloor = G.floor + direction;

	if (nextFloor < 1 || nextFloor > G.floorCount) {
		G.stairTransitionRequested = false;
		return false;
	}

	const map = G.floors[nextFloor - 1];
	if (!map) {
		G.stairTransitionRequested = false;
		return false;
	}

	const devices = spawnEntities(map.rooms, G.wave);
	const prevMissionPhase = G.missionPhase;
	const prevMainHacked = G.mainHacked;
	const entryTile = direction > 0 ? TILE_TYPES.STAIR_DOWN : TILE_TYPES.STAIR_UP;
	const entryPoint = findEntryTile(map, entryTile) || map.entrance;
	const spawnPoint = resolveSafeSpawnPoint(map, entryPoint);

	initFloorState({ map, devices });
	G.floor = nextFloor;
	G.missionPhase = prevMissionPhase;
	G.mainHacked = prevMainHacked;
	G.P.x = spawnPoint.x + 0.5;
	G.P.y = spawnPoint.y + 0.5;
	G.stairTransitionCooldownMs = STAIR_TRANSITION_COOLDOWN_MS;
	G.stairTransitionArmed = false;
	G.stairTransitionRequested = false;

	closeCtx();
	updateVisibility();
	syncZoneLabel();
	updateMissionText();
	log(`Przejście na piętro ${G.floor}/${G.floorCount}`, 'ok');
	return true;
}

function findEntryTile(map, tileType) {
	if (tileType === TILE_TYPES.STAIR_DOWN && map.stairsDown) {
		return { x: map.stairsDown.x, y: map.stairsDown.y };
	}

	if (tileType === TILE_TYPES.STAIR_UP && map.stairsUp) {
		return { x: map.stairsUp.x, y: map.stairsUp.y };
	}

	for (let y = 0; y < map.tiles.length; y += 1) {
		for (let x = 0; x < map.tiles[y].length; x += 1) {
			if (map.tiles[y][x] === tileType) {
				return { x, y };
			}
		}
	}

	return null;
}

function resolveSafeSpawnPoint(map, preferredPoint) {
	const fallbackPoint = preferredPoint || map.entrance || { x: 1, y: 1 };

	if (isSpawnPointSafe(map.tiles, fallbackPoint)) {
		return fallbackPoint;
	}

	const nearest = findNearestSafeSpawnTile(map.tiles, fallbackPoint);

	if (nearest) {
		return nearest;
	}

	return fallbackPoint;
}

function isSpawnPointSafe(tiles, point) {
	if (!point) {
		return false;
	}

	return canOccupy(tiles, point.x + 0.5, point.y + 0.5);
}

function findNearestSafeSpawnTile(tiles, origin) {
	const originX = Math.max(1, Math.min((origin?.x | 0) || 1, tiles[0].length - 2));
	const originY = Math.max(1, Math.min((origin?.y | 0) || 1, tiles.length - 2));
	const maxRadius = Math.max(tiles.length, tiles[0].length);

	for (let radius = 1; radius <= maxRadius; radius += 1) {
		for (let y = originY - radius; y <= originY + radius; y += 1) {
			for (let x = originX - radius; x <= originX + radius; x += 1) {
				if (Math.abs(x - originX) + Math.abs(y - originY) !== radius) {
					continue;
				}

				if (x < 1 || y < 1 || y >= tiles.length - 1 || x >= tiles[0].length - 1) {
					continue;
				}

				if (canOccupy(tiles, x + 0.5, y + 0.5)) {
					return { x, y };
				}
			}
		}
	}

	return null;
}

function updateCameras(dt) {
	for (const camera of byType('cam')) {
		if (camera.hacked || G.blackout) {
			continue;
		}

		camera.facing += camera.rotDir;

		if (dst(camera, G.P) > camera.range) {
			continue;
		}

		if (isPlayerHiddenFrom(camera)) {
			continue;
		}

		if (!lineOfSight(
			camera.x + 0.5,
			camera.y + 0.5,
			G.P.x,
			G.P.y,
			(x, y) => {
				const tile = G.tiles[y]?.[x];
				return tile === TILE_TYPES.WALL || tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.WALL_TERMINAL;
			},
		)) {
			continue;
		}

		const angle = Math.atan2(G.P.y - camera.y, G.P.x - camera.x);
		let diff = angle - camera.facing;

		while (diff > Math.PI) diff -= Math.PI * 2;
		while (diff < -Math.PI) diff += Math.PI * 2;

		if (Math.abs(diff) < camera.fov / 2) {
			G.alert = clamp(G.alert + dt * 0.016);
			triggerGuardInvestigation();
		}
	}
}

function triggerGuardInvestigation() {
	if (G.cameraAlertTimer > 0) {
		return;
	}

	G.cameraAlertTimer = 2200;

	for (const guard of byType('guard')) {
		if (guard.dead || guard.offline) {
			continue;
		}

		if (guard.state !== 'chase') {
			guard.state = 'search';
		}

		guard.lastSeen = { x: G.P.x, y: G.P.y };
		guard.searchTimer = 0;
	}

	log('Kamery oznaczyły intruza — strażnicy sprawdzają sektor', 'w');
}

function isPlayerHiddenFrom(observer) {
	const tileX = G.P.x | 0;
	const tileY = G.P.y | 0;
	const tile = G.tiles[tileY]?.[tileX];

	if (tile !== TILE_TYPES.HIDE_SPOT) {
		return false;
	}

	return dst(observer, G.P) > 1.3;
}
