import { MAP_H, MAP_W, TILE_TYPES, WALL_ATLAS_VARIANTS } from '../core/constants.js';

// Multi-floor map generator
export function generateMultiFloorMap(floorCount = 3) {
	// Each floor is a separate map object
	const floors = [];
	for (let i = 0; i < floorCount; ++i) {
		const isTop = i === floorCount - 1;
		const isBottom = i === 0;
		const map = generateMap({
			mainTerminal: isTop,
			codeTerminal: false, // set later
			stairsUp: !isTop,
			stairsDown: !isBottom,
			floorIdx: i,
			floorCount,
		});
		floors.push(map);
	}
	// Generate code for main door
	const code = ('' + Math.floor(1000 + Math.random() * 9000));
	// Place code terminal on a random lower floor (not top)
	const codeFloorIdx = Math.floor(Math.random() * (floorCount - 1));
	floors[codeFloorIdx].hasCodeTerminal = true;
	// Place code terminal in a random side terminal
	if (floors[codeFloorIdx].sideTerminals?.length) {
		const idx = Math.floor(Math.random() * floors[codeFloorIdx].sideTerminals.length);
		const term = floors[codeFloorIdx].sideTerminals[idx];
		term.isCodeTerminal = true;
		term.code = code;
		floors[codeFloorIdx].tiles[term.y][term.x] = TILE_TYPES.CODE_TERMINAL;
	}
	// Attach code to floors root for state
	floors.code = code;
	floors.codeFound = false;
	floors.codeUsed = false;
	// Place stairs
	for (let i = 0; i < floors.length; ++i) {
		const map = floors[i];
		const occupiedStairTiles = new Set();
		// Place stairs up (except top)
		if (i < floors.length - 1) {
			const stairUpPoint = placeStairTile(map, TILE_TYPES.STAIR_UP, 1, { x: 2, y: 2 }, occupiedStairTiles);

			if (stairUpPoint) {
				map.stairsUp = { x: stairUpPoint.x, y: stairUpPoint.y, to: i + 1 };
				occupiedStairTiles.add(`${stairUpPoint.x},${stairUpPoint.y}`);
			}
		}
		// Place stairs down (except bottom)
		if (i > 0) {
			const stairDownPoint = placeStairTile(map, TILE_TYPES.STAIR_DOWN, 2, { x: MAP_W - 3, y: MAP_H - 3 }, occupiedStairTiles);

			if (stairDownPoint) {
				map.stairsDown = { x: stairDownPoint.x, y: stairDownPoint.y, to: i - 1 };
				occupiedStairTiles.add(`${stairDownPoint.x},${stairDownPoint.y}`);
			}
		}
	}
	assignRunAccessPlan(floors);
	return floors;
}

const DEBUG_MAIN_TERMINAL_NEAR_SPAWN = true;

export function generateMap(opts = {}) {
	const tiles = [];

	for (let y = 0; y < MAP_H; y += 1) {
		const row = [];

		for (let x = 0; x < MAP_W; x += 1) {
			row.push(TILE_TYPES.WALL);
		}

		tiles.push(row);
	}

	const rooms = [{ x: 1, y: 1, w: 7, h: 6 }];
	const baseRoomTarget = 13 + Math.min(4, opts.floorIdx || 0);
	const targetRooms = Math.min(18, baseRoomTarget + ((Math.random() * 3) | 0));

	for (let attempt = 0; attempt < 120 && rooms.length < targetRooms; attempt += 1) {
		const profile = pickRoomProfile();
		const room = {
			x: 1 + ((Math.random() * Math.max(1, MAP_W - profile.w - 2)) | 0),
			y: 1 + ((Math.random() * Math.max(1, MAP_H - profile.h - 2)) | 0),
			w: profile.w,
			h: profile.h,
		};

		if (!canPlaceRoom(room, rooms)) {
			continue;
		}

		rooms.push(room);
	}

	for (const room of rooms) {
		for (let y = room.y; y < room.y + room.h; y += 1) {
			for (let x = room.x; x < room.x + room.w; x += 1) {
				tiles[y][x] = TILE_TYPES.FLOOR;
			}
		}
	}

	for (let index = 0; index < rooms.length - 1; index += 1) {
		const roomA = rooms[index];
		const roomB = rooms[index + 1];

		const startX = roomA.x + ((roomA.w / 2) | 0);
		const startY = roomA.y + ((roomA.h / 2) | 0);
		const endX = roomB.x + ((roomB.w / 2) | 0);
		const endY = roomB.y + ((roomB.h / 2) | 0);

		let cursorX = startX;
		let cursorY = startY;

		while (cursorX !== endX) {
			tiles[cursorY][cursorX] = TILE_TYPES.FLOOR;
			if (Math.random() < 0.32 && tiles[cursorY + 1]?.[cursorX] === TILE_TYPES.WALL) {
				tiles[cursorY + 1][cursorX] = TILE_TYPES.FLOOR;
			}
			cursorX += cursorX < endX ? 1 : -1;
		}

		while (cursorY !== endY) {
			tiles[cursorY][cursorX] = TILE_TYPES.FLOOR;
			if (Math.random() < 0.32 && tiles[cursorY]?.[cursorX + 1] === TILE_TYPES.WALL) {
				tiles[cursorY][cursorX + 1] = TILE_TYPES.FLOOR;
			}
			cursorY += cursorY < endY ? 1 : -1;
		}
	}

	const spawn = rooms[0];
	const entrance = { x: spawn.x + 2, y: spawn.y + 2 };
	tiles[entrance.y][entrance.x] = TILE_TYPES.ENTRANCE;

	const lastRoom = rooms[rooms.length - 1];
	let mainTerminal = null;
	if (opts.mainTerminal) {
		mainTerminal = {
			x: lastRoom.x + ((lastRoom.w / 2) | 0),
			y: lastRoom.y + ((lastRoom.h / 2) | 0),
		};
		tiles[mainTerminal.y][mainTerminal.x] = TILE_TYPES.MAIN_TERMINAL;
	} else {
		mainTerminal = DEBUG_MAIN_TERMINAL_NEAR_SPAWN
			? placeDebugMainTerminal(tiles, spawn, entrance)
			: {
				x: lastRoom.x + ((lastRoom.w / 2) | 0),
				y: lastRoom.y + ((lastRoom.h / 2) | 0),
			};
	}
	mainTerminal.id = mainTerminal.id || 'node_main';
	mainTerminal.networkName = mainTerminal.networkName || makeNetworkName('MAIN', opts.floorIdx || 0, 0);

	addPillarsInLargeRooms(tiles, rooms, [entrance, mainTerminal]);
	addCorporatePartitions(tiles, rooms, [entrance, mainTerminal]);

	const sideTerminals = [];
	const doors = [];
	const wallTerminals = [];
	const hideSpots = [];
	const midRooms = rooms.slice(2, rooms.length - 1);
	const count = Math.min(3, midRooms.length);

	for (let index = 0; index < count; index += 1) {
		const room = midRooms[Math.floor(index * (midRooms.length / count))];
		const x = room.x + ((room.w / 2) | 0);
		const y = room.y + ((room.h / 2) | 0);

		if (tiles[y][x] === TILE_TYPES.FLOOR) {
			tiles[y][x] = TILE_TYPES.SIDE_TERMINAL;
			sideTerminals.push({
				id: `node_side_${index + 1}`,
				networkName: makeNetworkName('SIDE', opts.floorIdx || 0, index + 1),
				x,
				y,
				desc: `Terminal S-${index + 1}`,
				hacked: false,
				used: false,
				firewallBreached: false,
				requiresFirewall: false,
				authShard: null,
				authShardIndex: null,
				authShardExtracted: false,
				options: [],
			});
		}
	}

	const doorCandidates = [];

	for (let y = 1; y < MAP_H - 1; y += 1) {
		for (let x = 1; x < MAP_W - 1; x += 1) {
			if (tiles[y][x] !== TILE_TYPES.FLOOR) {
				continue;
			}

			const floorLeft = tiles[y][x - 1] === TILE_TYPES.FLOOR;
			const floorRight = tiles[y][x + 1] === TILE_TYPES.FLOOR;
			const floorUp = tiles[y - 1][x] === TILE_TYPES.FLOOR;
			const floorDown = tiles[y + 1][x] === TILE_TYPES.FLOOR;

			const wallLeft = tiles[y][x - 1] === TILE_TYPES.WALL;
			const wallRight = tiles[y][x + 1] === TILE_TYPES.WALL;
			const wallUp = tiles[y - 1][x] === TILE_TYPES.WALL;
			const wallDown = tiles[y + 1][x] === TILE_TYPES.WALL;

			const horizontalCorridor = floorLeft && floorRight && wallUp && wallDown;
			const verticalCorridor = floorUp && floorDown && wallLeft && wallRight;

			if (!horizontalCorridor && !verticalCorridor) {
				continue;
			}

			if (Math.abs(x - entrance.x) + Math.abs(y - entrance.y) < 8) {
				continue;
			}

			doorCandidates.push({ x, y });
		}
	}

	const shuffledDoors = doorCandidates.sort(() => Math.random() - 0.5);
	const doorCount = Math.min(6, shuffledDoors.length);

	for (let index = 0; index < doorCount; index += 1) {
		const candidate = shuffledDoors[index];
		const doorId = `door_${index + 1}`;

		tiles[candidate.y][candidate.x] = TILE_TYPES.DOOR_CLOSED;
		doors.push({ id: doorId, x: candidate.x, y: candidate.y, open: false });

		const panelOffsets = [
			{ x: 0, y: -1 },
			{ x: 1, y: 0 },
			{ x: 0, y: 1 },
			{ x: -1, y: 0 },
		];

		for (const offset of panelOffsets) {
			const px = candidate.x + offset.x;
			const py = candidate.y + offset.y;

			if (tiles[py]?.[px] !== TILE_TYPES.WALL) {
				continue;
			}

			tiles[py][px] = TILE_TYPES.WALL_TERMINAL;
			wallTerminals.push({
				id: `panel_${index + 1}`,
				networkName: makeNetworkName('PANEL', opts.floorIdx || 0, index + 1),
				x: px,
				y: py,
				doorId,
				desc: `Panel drzwi ${index + 1}`,
			});
			break;
		}
	}

	const hideRooms = rooms.slice(1);
	const hideCount = Math.min(6, hideRooms.length);
	const shuffledHideRooms = [...hideRooms].sort(() => Math.random() - 0.5);

	for (let index = 0; index < hideCount; index += 1) {
		const room = shuffledHideRooms[index];
		const hx = room.x + 1 + ((Math.random() * Math.max(1, room.w - 2)) | 0);
		const hy = room.y + 1 + ((Math.random() * Math.max(1, room.h - 2)) | 0);

		if (tiles[hy][hx] !== TILE_TYPES.FLOOR) {
			continue;
		}

		tiles[hy][hx] = TILE_TYPES.HIDE_SPOT;
		hideSpots.push({ x: hx, y: hy });
	}

	const distractionNodes = addDistractionNodes(tiles, rooms, [entrance, mainTerminal, ...sideTerminals], opts.floorIdx || 0);
	ensureCriticalPaths(tiles, entrance, mainTerminal, sideTerminals, distractionNodes);
	const wallVariants = buildWallVariants(tiles);

	return {
		tiles,
		wallVariants,
		rooms,
		entrance,
		mainTerminal,
		sideTerminals,
		doors,
		wallTerminals,
		hideSpots,
		distractionNodes,
		hasCodeTerminal: opts.codeTerminal || false,
		stairsUp: null,
		stairsDown: null,
		floorIdx: opts.floorIdx || 0,
		floorCount: opts.floorCount || 1,
	};
}

export function generateTutorialMap() {
	const tiles = [];
	for (let y = 0; y < MAP_H; y += 1) {
		const row = [];
		for (let x = 0; x < MAP_W; x += 1) {
			row.push(TILE_TYPES.WALL);
		}
		tiles.push(row);
	}

	const rooms = [
		{ x: 1, y: 1, w: 11, h: 9 },
		{ x: 14, y: 1, w: 9, h: 8 },
		{ x: 25, y: 1, w: 11, h: 9 },
		{ x: 1, y: 14, w: 11, h: 10 },
		{ x: 14, y: 12, w: 9, h: 12 },
		{ x: 25, y: 14, w: 11, h: 10 },
	];

	for (const room of rooms) {
		for (let y = room.y; y < room.y + room.h; y += 1) {
			for (let x = room.x; x < room.x + room.w; x += 1) {
				tiles[y][x] = TILE_TYPES.FLOOR;
			}
		}
	}

	for (let x = 6; x <= 30; x += 1) {
		tiles[6][x] = TILE_TYPES.FLOOR;
		tiles[18][x] = TILE_TYPES.FLOOR;
	}

	for (let y = 5; y <= 20; y += 1) {
		tiles[y][18] = TILE_TYPES.FLOOR;
	}

	for (let x = 4; x <= 10; x += 1) {
		if (tiles[4]?.[x] === TILE_TYPES.WALL) {
			tiles[4][x] = TILE_TYPES.FLOOR;
		}
	}

	for (let y = 4; y <= 8; y += 1) {
		if (tiles[y]?.[4] === TILE_TYPES.WALL) {
			tiles[y][4] = TILE_TYPES.FLOOR;
		}
	}

	for (let y = 15; y <= 19; y += 1) {
		if (tiles[y]?.[16] === TILE_TYPES.WALL) {
			tiles[y][16] = TILE_TYPES.FLOOR;
		}
	}

	const tutorialPillars = [
		{ x: 6, y: 7 },
		{ x: 9, y: 7 },
		{ x: 27, y: 7 },
		{ x: 30, y: 7 },
		{ x: 6, y: 19 },
		{ x: 9, y: 19 },
		{ x: 27, y: 19 },
		{ x: 30, y: 19 },
		{ x: 16, y: 16 },
		{ x: 20, y: 16 },
	];

	for (const pillar of tutorialPillars) {
		if (tiles[pillar.y]?.[pillar.x] === TILE_TYPES.FLOOR) {
			tiles[pillar.y][pillar.x] = TILE_TYPES.WALL;
		}
	}

	for (let x = 3; x <= 10; x += 1) {
		if (x === 6 || x === 9) {
			continue;
		}
		if (tiles[8]?.[x] === TILE_TYPES.FLOOR) {
			tiles[8][x] = TILE_TYPES.WALL;
		}
	}

	for (let y = 15; y <= 22; y += 1) {
		if (y === 18 || y === 20) {
			continue;
		}
		if (tiles[y]?.[7] === TILE_TYPES.FLOOR) {
			tiles[y][7] = TILE_TYPES.WALL;
		}
	}

	const entrance = { x: 4, y: 4 };
	const mainTerminal = { x: 30, y: 4 };
	const sideTerminals = [
		{
			id: 'node_side_1',
			networkName: makeNetworkName('SIDE', 0, 1),
			x: 8,
			y: 16,
			desc: 'Terminal Treningowy A',
			hacked: false,
			used: false,
			firewallBreached: false,
			requiresFirewall: false,
			authShard: null,
			authShardIndex: null,
			authShardExtracted: false,
			options: [],
		},
		{
			id: 'node_side_2',
			networkName: makeNetworkName('SIDE', 0, 2),
			x: 29,
			y: 18,
			desc: 'Terminal Treningowy B',
			hacked: false,
			used: false,
			firewallBreached: false,
			requiresFirewall: false,
			authShard: null,
			authShardIndex: null,
			authShardExtracted: false,
			options: [],
		},
	];
	const doors = [
		{ id: 'door_1', x: 18, y: 10, open: false },
		{ id: 'door_2', x: 24, y: 18, open: false },
	];
	const wallTerminals = [
		{ id: 'panel_1', networkName: makeNetworkName('PANEL', 0, 1), x: 17, y: 10, doorId: 'door_1', desc: 'Panel drzwi A' },
		{ id: 'panel_2', networkName: makeNetworkName('PANEL', 0, 2), x: 24, y: 17, doorId: 'door_2', desc: 'Panel drzwi B' },
	];
		mainTerminal.id = 'node_main';
		mainTerminal.networkName = makeNetworkName('MAIN', 0, 0);
	const hideSpots = [{ x: 16, y: 18 }];
	const distractionNodes = [
		{
			id: 'vent_1',
			networkName: makeNetworkName('VENT', 0, 1),
			x: 21,
			y: 16,
			desc: 'Węzeł wentylacji',
			type: 'vent',
			cooldownMs: 6500,
			durationMs: 6500,
		},
		{
			id: 'lights_1',
			networkName: makeNetworkName('LIGHTS', 0, 1),
			x: 9,
			y: 6,
			desc: 'Sterownik oświetlenia',
			type: 'lights',
			cooldownMs: 6800,
			durationMs: 6200,
		},
		{
			id: 'junction_1',
			networkName: makeNetworkName('JUNCTION', 0, 1),
			x: 27,
			y: 6,
			desc: 'Panel energetyczny',
			type: 'junction',
			cooldownMs: 7000,
			durationMs: 5500,
		},
		{
			id: 'wallpanel_1',
			networkName: makeNetworkName('WALLPANEL', 0, 1),
			x: 17,
			y: 11,
			desc: 'Panel scienny',
			type: 'wallpanel',
			cooldownMs: 7200,
			durationMs: 5500,
		},
		{
			id: 'vent_2',
			networkName: makeNetworkName('VENT', 0, 2),
			x: 30,
			y: 16,
			desc: 'Węzeł wentylacji B',
			type: 'vent',
			cooldownMs: 7200,
			durationMs: 7000,
		},
	];

	tiles[entrance.y][entrance.x] = TILE_TYPES.ENTRANCE;
	tiles[mainTerminal.y][mainTerminal.x] = TILE_TYPES.MAIN_TERMINAL;
	tiles[sideTerminals[0].y][sideTerminals[0].x] = TILE_TYPES.SIDE_TERMINAL;
	tiles[sideTerminals[1].y][sideTerminals[1].x] = TILE_TYPES.SIDE_TERMINAL;
	tiles[doors[0].y][doors[0].x] = TILE_TYPES.DOOR_CLOSED;
	tiles[doors[1].y][doors[1].x] = TILE_TYPES.DOOR_CLOSED;
	tiles[wallTerminals[0].y][wallTerminals[0].x] = TILE_TYPES.WALL_TERMINAL;
	tiles[wallTerminals[1].y][wallTerminals[1].x] = TILE_TYPES.WALL_TERMINAL;
	tiles[10][16] = TILE_TYPES.WALL;
	tiles[hideSpots[0].y][hideSpots[0].x] = TILE_TYPES.HIDE_SPOT;
	tiles[4][33] = TILE_TYPES.STAIR_UP;
	tiles[20][4] = TILE_TYPES.STAIR_DOWN;
	const wallVariants = buildWallVariants(tiles);

	return {
		tiles,
		wallVariants,
		rooms,
		entrance,
		mainTerminal,
		sideTerminals,
		doors,
		wallTerminals,
		hideSpots,
		distractionNodes,
		hasCodeTerminal: false,
		stairsUp: { x: 33, y: 4, to: 0 },
		stairsDown: { x: 4, y: 20, to: 0 },
		floorIdx: 0,
		floorCount: 1,
		tutorial: true,
	};
}

function assignRunAccessPlan(floors) {
	const sideNodes = [];

	for (let floorIdx = 0; floorIdx < floors.length; floorIdx += 1) {
		const floor = floors[floorIdx];
		for (const terminal of floor.sideTerminals || []) {
			sideNodes.push({ floorIdx, terminal });
		}
	}

	if (!sideNodes.length) {
		floors.mainAccessPlan = { passphrase: null, shardCount: 0 };
		return;
	}

	const maxShards = Math.min(4, sideNodes.length);
	const minShards = Math.min(2, maxShards);
	const shardCount = minShards + ((Math.random() * (maxShards - minShards + 1)) | 0);
	const passphrase = generatePassphrase();
	const shards = splitPassphrase(passphrase, shardCount);
	const selected = [...sideNodes].sort(() => Math.random() - 0.5).slice(0, shardCount);

	for (let i = 0; i < selected.length; i += 1) {
		const terminal = selected[i].terminal;
		terminal.authShard = shards[i];
		terminal.authShardIndex = i + 1;
		terminal.requiresFirewall = Math.random() < 0.65;
		terminal.firewallBreached = false;
		terminal.authShardExtracted = false;
	}

	if (!selected.some((entry) => entry.terminal.requiresFirewall)) {
		selected[0].terminal.requiresFirewall = true;
	}

	for (const node of sideNodes) {
		if (node.terminal.authShard) {
			continue;
		}
		node.terminal.requiresFirewall = Math.random() < 0.3;
		node.terminal.firewallBreached = false;
		node.terminal.authShardExtracted = false;
	}

	floors.mainAccessPlan = {
		passphrase,
		shardCount,
	};
}

function generatePassphrase() {
	const prefix = pick(['ORBIT', 'PHANTOM', 'SABLE', 'VECTOR', 'ARGUS', 'CIPHER']);
	const suffix = pick(['DELTA', 'NEXUS', 'RAVEN', 'ECLIPSE', 'EMBER', 'HELIOS']);
	const serial = `${Math.floor(100 + Math.random() * 900)}`;
	return `${prefix}-${suffix}-${serial}`;
}

function splitPassphrase(passphrase, count) {
	const compact = String(passphrase || '').replace(/-/g, '');
	const size = Math.ceil(compact.length / count);
	const shards = [];

	for (let i = 0; i < count; i += 1) {
		const part = compact.slice(i * size, (i + 1) * size);
		shards.push(part || compact.slice(-2));
	}

	return shards;
}

function makeNetworkName(prefix, floorIdx, ordinal) {
	const salt = `${Math.floor(Math.random() * 256)}`.padStart(3, '0');
	const floor = `${(floorIdx || 0) + 1}`.padStart(2, '0');
	const ord = `${ordinal || 0}`.padStart(2, '0');
	return `${prefix}-F${floor}-${ord}-${salt}`;
}

function pick(values) {
	return values[(Math.random() * values.length) | 0];
}

function buildWallVariants(tiles) {
	return tiles.map((row) =>
		row.map((tile) => (tile === TILE_TYPES.WALL ? ((Math.random() * WALL_ATLAS_VARIANTS) | 0) : 0))
	);
}

function placeDebugMainTerminal(tiles, spawn, entrance) {
	const candidates = [
		{ x: spawn.x + Math.max(2, spawn.w - 2), y: spawn.y + 2 },
		{ x: spawn.x + Math.max(2, spawn.w - 2), y: spawn.y + Math.max(2, spawn.h - 2) },
		{ x: spawn.x + 2, y: spawn.y + Math.max(2, spawn.h - 2) },
		{ x: spawn.x + ((spawn.w / 2) | 0), y: spawn.y + Math.max(2, spawn.h - 2) },
	];

	for (const candidate of candidates) {
		if (candidate.x === entrance.x && candidate.y === entrance.y) {
			continue;
		}

		if (tiles[candidate.y]?.[candidate.x] === TILE_TYPES.FLOOR) {
			return candidate;
		}
	}

	return {
		x: spawn.x + ((spawn.w / 2) | 0),
		y: spawn.y + ((spawn.h / 2) | 0),
	};
}

function addPillarsInLargeRooms(tiles, rooms, protectedPoints) {
	for (const room of rooms) {
		if (room.w < 7 || room.h < 6) {
			continue;
		}

		const pattern = pick(['dense', 'offset', 'sparse']);
		const yStart = pattern === 'offset' ? room.y + 3 : room.y + 2;
		const xStart = pattern === 'offset' ? room.x + 3 : room.x + 2;
		const spacing = pattern === 'sparse' ? 4 : 3;
		const keepChance = pattern === 'dense' ? 0.88 : pattern === 'offset' ? 0.72 : 0.56;

		for (let y = yStart; y <= room.y + room.h - 3; y += spacing) {
			for (let x = xStart; x <= room.x + room.w - 3; x += spacing) {
				if (tiles[y][x] !== TILE_TYPES.FLOOR) {
					continue;
				}

				if (Math.random() > keepChance) {
					continue;
				}

				const tooCloseToProtectedPoint = protectedPoints.some(
					(point) => Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1
				);

				if (tooCloseToProtectedPoint) {
					continue;
				}

				tiles[y][x] = TILE_TYPES.WALL;
			}
		}
	}
}

function addCorporatePartitions(tiles, rooms, protectedPoints) {
	for (const room of rooms) {
		if (room.w < 8 || room.h < 6) {
			continue;
		}

		if (Math.random() < 0.35) {
			continue;
		}

		const mode = pick(['single', 'single', 'parallel', 'lshape']);
		const horizontal = room.w >= room.h;

		if (mode === 'parallel' && room.w >= 10 && room.h >= 7) {
			if (horizontal) {
				paintPartitionLine(tiles, protectedPoints, room, room.y + ((room.h / 3) | 0), true);
				paintPartitionLine(tiles, protectedPoints, room, room.y + (((room.h * 2) / 3) | 0), true);
			} else {
				paintPartitionLine(tiles, protectedPoints, room, room.x + ((room.w / 3) | 0), false);
				paintPartitionLine(tiles, protectedPoints, room, room.x + (((room.w * 2) / 3) | 0), false);
			}
			continue;
		}

		if (mode === 'lshape' && room.w >= 9 && room.h >= 7) {
			const cornerX = room.x + ((room.w / 2) | 0);
			const cornerY = room.y + ((room.h / 2) | 0);

			for (let x = room.x + 1; x < room.x + room.w - 1; x += 1) {
				const gapSlot = (x - room.x) % 4 === 0;
				const protectedNear = protectedPoints.some((point) => Math.abs(point.x - x) <= 1 && Math.abs(point.y - cornerY) <= 1);
				if (!gapSlot && !protectedNear) {
					tiles[cornerY][x] = TILE_TYPES.WALL;
				}
			}

			for (let y = cornerY; y < room.y + room.h - 1; y += 1) {
				const gapSlot = (y - room.y) % 4 === 0;
				const protectedNear = protectedPoints.some((point) => Math.abs(point.x - cornerX) <= 1 && Math.abs(point.y - y) <= 1);
				if (!gapSlot && !protectedNear) {
					tiles[y][cornerX] = TILE_TYPES.WALL;
				}
			}
			continue;
		}

		if (horizontal) {
			paintPartitionLine(tiles, protectedPoints, room, room.y + ((room.h / 2) | 0), true);
		} else {
			paintPartitionLine(tiles, protectedPoints, room, room.x + ((room.w / 2) | 0), false);
		}
	}
}

function paintPartitionLine(tiles, protectedPoints, room, axisValue, horizontal) {
	let gapPlaced = 0;

	if (horizontal) {
		const y = axisValue;
		for (let x = room.x + 1; x < room.x + room.w - 1; x += 1) {
			const gapSlot = (x - room.x) % 4 === 0;
			const protectedNear = protectedPoints.some((point) => Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1);

			if (gapSlot || protectedNear) {
				gapPlaced += 1;
				continue;
			}

			tiles[y][x] = TILE_TYPES.WALL;
		}

		if (gapPlaced < 2) {
			tiles[y][room.x + 2] = TILE_TYPES.FLOOR;
			tiles[y][room.x + room.w - 3] = TILE_TYPES.FLOOR;
		}
		return;
	}

	const x = axisValue;
	for (let y = room.y + 1; y < room.y + room.h - 1; y += 1) {
		const gapSlot = (y - room.y) % 4 === 0;
		const protectedNear = protectedPoints.some((point) => Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1);

		if (gapSlot || protectedNear) {
			gapPlaced += 1;
			continue;
		}

		tiles[y][x] = TILE_TYPES.WALL;
	}

	if (gapPlaced < 2) {
		tiles[room.y + 2][x] = TILE_TYPES.FLOOR;
		tiles[room.y + room.h - 3][x] = TILE_TYPES.FLOOR;
	}
}

function canPlaceRoom(room, existingRooms) {
	for (const other of existingRooms) {
		const separated =
			room.x + room.w + 2 <= other.x ||
			other.x + other.w + 2 <= room.x ||
			room.y + room.h + 2 <= other.y ||
			other.y + other.h + 2 <= room.y;

		if (!separated) {
			return false;
		}
	}

	return true;
}

function pickRoomProfile() {
	const roll = Math.random();

	if (roll < 0.45) {
		return { w: 4 + ((Math.random() * 3) | 0), h: 4 + ((Math.random() * 2) | 0) };
	}

	if (roll < 0.8) {
		return { w: 6 + ((Math.random() * 3) | 0), h: 5 + ((Math.random() * 3) | 0) };
	}

	return { w: 8 + ((Math.random() * 3) | 0), h: 6 + ((Math.random() * 3) | 0) };
}

function addDistractionNodes(tiles, rooms, protectedPoints, floorIdx) {
	const nodes = [];
	const candidates = [];
	const nodeTarget = 2 + ((Math.random() * 4) | 0);

	for (const room of rooms.slice(1)) {
		for (let y = room.y + 1; y < room.y + room.h - 1; y += 1) {
			for (let x = room.x + 1; x < room.x + room.w - 1; x += 1) {
				if (tiles[y][x] !== TILE_TYPES.FLOOR) {
					continue;
				}

				const protectedNear = protectedPoints.some((point) => Math.abs(point.x - x) <= 1 && Math.abs(point.y - y) <= 1);
				if (protectedNear) {
					continue;
				}

				const nearWall =
					tiles[y - 1]?.[x] === TILE_TYPES.WALL ||
					tiles[y + 1]?.[x] === TILE_TYPES.WALL ||
					tiles[y]?.[x - 1] === TILE_TYPES.WALL ||
					tiles[y]?.[x + 1] === TILE_TYPES.WALL;

				if (nearWall) {
					candidates.push({ x, y });
				}
			}
		}
	}

	for (let i = 0; i < candidates.length && nodes.length < nodeTarget; i += 1) {
		const pickIdx = i + ((Math.random() * Math.max(1, candidates.length - i)) | 0);
		const selected = candidates[pickIdx];
		candidates[pickIdx] = candidates[i];

		if (nodes.some((node) => Math.abs(node.x - selected.x) + Math.abs(node.y - selected.y) < 4)) {
			continue;
		}

		const type = pick(['vent', 'lights', 'junction', 'wallpanel']);
		let nodeX = selected.x;
		let nodeY = selected.y;

		if (type === 'wallpanel') {
			const wallMount = findAdjacentWallTile(tiles, selected.x, selected.y, protectedPoints);
			if (!wallMount) {
				continue;
			}
			nodeX = wallMount.x;
			nodeY = wallMount.y;
		}

		if (nodes.some((node) => Math.abs(node.x - nodeX) + Math.abs(node.y - nodeY) < 3)) {
			continue;
		}

		const ordinal = nodes.length + 1;
		nodes.push({
			id: `${type}_${ordinal}`,
			networkName: makeNetworkName(type.toUpperCase(), floorIdx || 0, ordinal),
			x: nodeX,
			y: nodeY,
			desc:
				type === 'vent'
					? 'Węzeł wentylacji'
					: type === 'lights'
						? 'Sterownik oświetlenia'
						: type === 'junction'
							? 'Panel energetyczny'
							: 'Panel scienny',
			type,
			cooldownMs: type === 'junction' ? 8500 : type === 'wallpanel' ? 7800 : 7000,
			durationMs: type === 'vent' ? 7200 : type === 'lights' ? 6200 : 5200,
		});
	}

	return nodes;
}

function ensureCriticalPaths(tiles, entrance, mainTerminal, sideTerminals, distractionNodes) {
	const criticalPoints = [
		mainTerminal,
		...(sideTerminals || []),
		...((distractionNodes || []).filter((node) => node?.type !== 'wallpanel')),
	]
		.filter(Boolean)
		.map((point) => ({ x: point.x | 0, y: point.y | 0 }));

	for (const point of criticalPoints) {
		if (hasPath(tiles, entrance, point)) {
			continue;
		}
		carveRoute(tiles, entrance, point);
	}
}

function findAdjacentWallTile(tiles, x, y, protectedPoints) {
	const offsets = [
		{ x: 0, y: -1 },
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
		{ x: -1, y: 0 },
	];

	for (const offset of offsets) {
		const wx = x + offset.x;
		const wy = y + offset.y;

		if (tiles[wy]?.[wx] !== TILE_TYPES.WALL) {
			continue;
		}

		const protectedNear = protectedPoints.some((point) => Math.abs(point.x - wx) <= 1 && Math.abs(point.y - wy) <= 1);
		if (protectedNear) {
			continue;
		}

		return { x: wx, y: wy };
	}

	return null;
}

function hasPath(tiles, start, goal) {
	const w = tiles[0]?.length || 0;
	const h = tiles.length;
	if (!w || !h) {
		return false;
	}

	const sx = start.x | 0;
	const sy = start.y | 0;
	const gx = goal.x | 0;
	const gy = goal.y | 0;

	const queue = [{ x: sx, y: sy }];
	const seen = new Set([`${sx},${sy}`]);
	const dirs = [
		{ x: 1, y: 0 },
		{ x: -1, y: 0 },
		{ x: 0, y: 1 },
		{ x: 0, y: -1 },
	];

	for (let i = 0; i < queue.length; i += 1) {
		const current = queue[i];
		if (current.x === gx && current.y === gy) {
			return true;
		}

		for (const dir of dirs) {
			const nx = current.x + dir.x;
			const ny = current.y + dir.y;

			if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
				continue;
			}

			if (tiles[ny][nx] === TILE_TYPES.WALL) {
				continue;
			}

			const key = `${nx},${ny}`;
			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			queue.push({ x: nx, y: ny });
		}
	}

	return false;
}

function carveRoute(tiles, start, goal) {
	let x = start.x | 0;
	let y = start.y | 0;
	const gx = goal.x | 0;
	const gy = goal.y | 0;

	while (x !== gx) {
		tiles[y][x] = TILE_TYPES.FLOOR;
		x += x < gx ? 1 : -1;
	}

	while (y !== gy) {
		tiles[y][x] = TILE_TYPES.FLOOR;
		y += y < gy ? 1 : -1;
	}

	tiles[gy][gx] = TILE_TYPES.FLOOR;
}

function placeStairTile(map, stairType, preferredRoomIndex, fallbackPoint, occupiedTiles = new Set()) {
	const candidates = [];
	const room = map.rooms[preferredRoomIndex];

	if (room) {
		const up = stairType === TILE_TYPES.STAIR_UP;
		candidates.push({ x: up ? room.x + 1 : room.x + room.w - 2, y: up ? room.y + 1 : room.y + room.h - 2 });
		candidates.push({ x: up ? room.x + 2 : room.x + room.w - 3, y: up ? room.y + 1 : room.y + room.h - 2 });
		candidates.push({ x: up ? room.x + 1 : room.x + room.w - 2, y: up ? room.y + 2 : room.y + room.h - 3 });
		candidates.push({ x: room.x + ((room.w / 2) | 0), y: room.y + ((room.h / 2) | 0) });
	}

	candidates.push({ x: fallbackPoint.x, y: fallbackPoint.y });

	for (const candidate of candidates) {
		if (!isValidStairPlacement(map, candidate.x, candidate.y, occupiedTiles)) {
			continue;
		}

		map.tiles[candidate.y][candidate.x] = stairType;
		return { x: candidate.x, y: candidate.y };
	}

	for (let y = 1; y < MAP_H - 2; y += 1) {
		for (let x = 1; x < MAP_W - 2; x += 1) {
			if (isValidStairPlacement(map, x, y, occupiedTiles)) {
				map.tiles[y][x] = stairType;
				return { x, y };
			}
		}
	}

	return null;
}

function isValidStairPlacement(map, x, y, occupiedTiles) {
	if (map.tiles[y]?.[x] === undefined || map.tiles[y + 1]?.[x + 1] === undefined) {
		return false;
	}

	if (occupiedTiles.has(`${x},${y}`)) {
		return false;
	}

	if (map.tiles[y][x] !== TILE_TYPES.FLOOR) {
		return false;
	}

	// Player spawn uses +0.5 offset and collision checks a 2x2 footprint.
	return (
		map.tiles[y][x + 1] === TILE_TYPES.FLOOR &&
		map.tiles[y + 1][x] === TILE_TYPES.FLOOR &&
		map.tiles[y + 1][x + 1] === TILE_TYPES.FLOOR
	);
}
