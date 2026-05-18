export const TILE = 35;
export const MAP_W = 38;
export const MAP_H = 28;
export const HUD_HEIGHT = 36;
export const HACK_RANGE = 4.5;
export const PLAYER_SPEED = 3.2;

export const TILE_TYPES = {
	FLOOR: 0,
	WALL: 1,
	ENTRANCE: 2,
	EXIT_USED: 3,
	MAIN_TERMINAL: 4,
	SIDE_TERMINAL: 5,
	DOOR_CLOSED: 6,
	DOOR_OPEN: 7,
	WALL_TERMINAL: 8,
	HIDE_SPOT: 9,
  STAIR_UP: 10,
  STAIR_DOWN: 11,
  DOOR_LOCKED: 12,
  CODE_TERMINAL: 13,
};

export const MAIN_HACK_DISTANCE = 1.8;
export const EXFIL_DISTANCE = 1.2;

// Raycaster / FPS renderer
export const FOV = Math.PI / 2.5;          // ~72 degrees
export const HALF_FOV = FOV / 2;
export const ROTATION_SPEED = 2.2;         // rad/s for keyboard rotation
export const MOUSE_SENSITIVITY = 0.0022;   // rad per pixel of mouse movement