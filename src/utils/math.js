export function dst(a, b) {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value, min = 0, max = 100) {
	return Math.min(max, Math.max(min, value));
}
