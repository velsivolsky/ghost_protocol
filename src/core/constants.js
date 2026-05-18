export const TILE = 35;
export const MAP_W = 38;
export const MAP_H = 28;
export const WALL_ATLAS_SRC = 'assets/tilesets/walls.png';
export const WALL_ATLAS_TILE_SIZE = 64;
export const WALL_ATLAS_COLS = 3;
export const WALL_ATLAS_ROWS = 3;
export const WALL_ATLAS_VARIANTS = WALL_ATLAS_COLS * WALL_ATLAS_ROWS;
export const FLOOR_ATLAS_SRC = 'assets/tilesets/floor.png';
export const FLOOR_ATLAS_COLS = 3;
export const FLOOR_ATLAS_ROWS = 3;
export const FLOOR_ATLAS_VARIANTS = FLOOR_ATLAS_COLS * FLOOR_ATLAS_ROWS;
export const GUARD_SPRITE_SRC = 'assets/tilesets/guard.png';
export const TERMINAL_SHEET_SRC = 'assets/tilesets/terminal.png';
export const CEILING_ATLAS_SRC = 'assets/tilesets/celling.png';
export const CEILING_ATLAS_COLS = 3;
export const CEILING_ATLAS_ROWS = 3;
export const CEILING_ATLAS_VARIANTS = CEILING_ATLAS_COLS * CEILING_ATLAS_ROWS;
export const CAM_SPRITE_SRC = 'assets/tilesets/cam.png';
export const CAM_SPRITE_ONLINE = 0;
export const CAM_SPRITE_OFFLINE = 1;
export const LIGHT_PANEL_SPRITE_SRC = 'assets/tilesets/light_panel.png';
export const LIGHT_PANEL_SPRITE_ONLINE = 0;
export const LIGHT_PANEL_SPRITE_HACKED = 1;
export const NEON_PANEL_SPRITE_SRC = 'assets/tilesets/neon_panel.png';
export const NEON_PANEL_SPRITE_COLS = 2;
export const NEON_PANEL_SPRITE_ROWS = 4;
export const NEON_PANEL_SPRITE_OFFLINE = 7; // col 2, row 4 (1-based) in a 2x4 atlas
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