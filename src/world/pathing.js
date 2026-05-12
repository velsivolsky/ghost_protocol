import { MAP_H, MAP_W } from '../core/constants.js';
import { canWalk } from './map.js';

export function findNextStep(tiles, startX, startY, goalX, goalY) {
	if (startX === goalX && startY === goalY) {
		return null;
	}

	const queue = [[startX, startY]];
	const visited = new Set([`${startX},${startY}`]);
	const parent = new Map();

	while (queue.length > 0) {
		const [x, y] = queue.shift();

		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		]) {
			const nx = x + dx;
			const ny = y + dy;
			const key = `${nx},${ny}`;

			if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) {
				continue;
			}

			if (visited.has(key)) {
				continue;
			}

			if (nx !== goalX || ny !== goalY) {
				if (!canWalk(tiles, nx + 0.5, ny + 0.5)) {
					continue;
				}
			}

			visited.add(key);
			parent.set(key, `${x},${y}`);

			if (nx === goalX && ny === goalY) {
				let current = key;
				let previous = parent.get(current);

				while (previous && previous !== `${startX},${startY}`) {
					current = previous;
					previous = parent.get(current);
				}

				const [stepX, stepY] = current.split(',').map(Number);
				return { x: stepX, y: stepY };
			}

			queue.push([nx, ny]);
		}
	}

	return null;
}