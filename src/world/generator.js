import { MAP_H, MAP_W, TILE_TYPES } from '../core/constants.js';

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

	for (let attempt = 0; attempt < 80 && rooms.length < 12; attempt += 1) {
		const room = {
			x: 1 + ((Math.random() * (MAP_W - 6 - 2)) | 0),
			y: 1 + ((Math.random() * (MAP_H - 5 - 2)) | 0),
			w: 4 + ((Math.random() * 5) | 0),
			h: 3 + ((Math.random() * 4) | 0),
		};

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
			cursorX += cursorX < endX ? 1 : -1;
		}

		while (cursorY !== endY) {
			tiles[cursorY][cursorX] = TILE_TYPES.FLOOR;
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
				id: `sterm${index}`,
				x,
				y,
				desc: `Terminal S-${index + 1}`,
				hacked: false,
				used: false,
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
		const doorId = `door${index}`;

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
				id: `wterm${index}`,
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

	return {
		tiles,
		rooms,
		entrance,
		mainTerminal,
		sideTerminals,
		doors,
		wallTerminals,
		hideSpots,
		hasCodeTerminal: opts.codeTerminal || false,
		stairsUp: null,
		stairsDown: null,
		floorIdx: opts.floorIdx || 0,
		floorCount: opts.floorCount || 1,
	};
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

		for (let y = room.y + 2; y <= room.y + room.h - 3; y += 3) {
			for (let x = room.x + 2; x <= room.x + room.w - 3; x += 3) {
				if (tiles[y][x] !== TILE_TYPES.FLOOR) {
					continue;
				}

				if (Math.random() < 0.25) {
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

		const horizontal = room.w >= room.h;

		if (horizontal) {
			const y = room.y + ((room.h / 2) | 0);
			let gapPlaced = 0;

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
		} else {
			const x = room.x + ((room.w / 2) | 0);
			let gapPlaced = 0;

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
	}
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
