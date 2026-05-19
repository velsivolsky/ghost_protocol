import { MAP_H, MAP_W, TILE_TYPES } from '../core/constants.js';

export function canWalk(tiles, x, y) {
	const tx = x | 0;
	const ty = y | 0;

	if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) {
		return false;
	}

	const row = tiles[ty];
	if (!row) {
		return false;
	}

	const tile = row[tx];

	return (
		tile === TILE_TYPES.FLOOR ||
		tile === TILE_TYPES.HIDE_SPOT ||
		tile === TILE_TYPES.ENTRANCE ||
		tile === TILE_TYPES.EXIT_USED ||
		tile === TILE_TYPES.SIDE_TERMINAL ||
		tile === TILE_TYPES.DOOR_OPEN
	);
}
