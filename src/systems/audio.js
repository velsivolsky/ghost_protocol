import { TILE_TYPES } from '../core/constants.js';
import { G, byType } from '../core/state.js';

const AUDIO_PREFS_KEY = 'gp_audio_enabled';
const AUDIO_MUSIC_VOLUME_KEY = 'gp_music_volume';
const AUDIO_FOOTSTEP_VOLUME_KEY = 'gp_footsteps_volume';

const TRACK_GROUPS = {
	intro: [
		'assets/music/terminal.mp3',
	],
	menu: [
		'assets/music/menu.mp3',
	],
	calm: [
		'assets/music/ambient_calm1.mp3',
		'assets/music/ambient_calm2.mp3',
	],
	terminal: [
		'assets/music/terminal_loop1.mp3',
		'assets/music/terminal_loop2.mp3',
		'assets/music/terminal_loop3.mp3',
	],
};

const TARGET_VOLUMES = {
	intro: 0.5,
	menu: 0.36,
	calm: 0.28,
	terminal: 0.32,
};

const FADE_DURATION_MS = 650;
const PLAYER_FOOTSTEP_PATH = 'assets/sfx/footsteps.wav';
const ENEMY_FOOTSTEP_PATH = 'assets/sfx/footsteps_enemy.wav';
const PLAYER_FOOTSTEP_VOLUME = 0.78;
const ENEMY_FOOTSTEP_VOLUME = 0.82;
const ENEMY_AUDIBLE_TILES = 15;
const ENEMY_MIN_MOVEMENT = 0.006;
const FOOTSTEP_MUSIC_DUCK = 0.52;
const USE_WEB_AUDIO_FOR_FOOTSTEPS = false;

let currentMode = null;
let currentTrack = null;
let musicVolumeLevel = 1;
let footstepsVolumeLevel = 1;
let desiredMode = null;
let isTransitioning = false;
let audioInitialized = false;
let audioUnlocked = false;
let fadeToken = 0;
let introAudioActive = false;
let introStopQueued = false;
let playerFootsteps = null;
let enemyFootstepChannels = new Map();
let sfxAudioContext = null;
let audioContextRequested = false;
let currentMusicDuck = 1;
let lastTrackPathByMode = {
	intro: null,
	calm: null,
	terminal: null,
};

export function primeAudioSettings() {
	const stored = readStoredAudioPreference();
	if (typeof stored === 'boolean') {
		G.audioEnabled = stored;
		G.musicEnabled = stored;
	} else {
		G.audioEnabled = true;
		G.musicEnabled = true;
	}

	musicVolumeLevel = readStoredVolumeLevel(AUDIO_MUSIC_VOLUME_KEY, 0.5);
	footstepsVolumeLevel = readStoredVolumeLevel(AUDIO_FOOTSTEP_VOLUME_KEY, 0.9);

	emitAudioState();
}

export function getAudioMixSettings() {
	return {
		musicVolume: musicVolumeLevel,
		footstepsVolume: footstepsVolumeLevel,
		muted: !G.audioEnabled,
	};
}

export function applyAudioMixSettings({ musicVolume, footstepsVolume, muted }, persist = true) {
	if (Number.isFinite(musicVolume)) {
		musicVolumeLevel = clamp01(musicVolume);
	}

	if (Number.isFinite(footstepsVolume)) {
		footstepsVolumeLevel = clamp01(footstepsVolume);
	}

	if (typeof muted === 'boolean') {
		setMusicEnabled(!muted);
	} else if (!isTransitioning && currentTrack && currentMode) {
		currentTrack.audio.volume = safeVolume((TARGET_VOLUMES[currentMode] || 0.35) * musicVolumeLevel * currentMusicDuck);
	}

	if (persist) {
		persistVolumeLevel(AUDIO_MUSIC_VOLUME_KEY, musicVolumeLevel);
		persistVolumeLevel(AUDIO_FOOTSTEP_VOLUME_KEY, footstepsVolumeLevel);
	}

	return getAudioMixSettings();
}

export function initAudio() {
	if (audioInitialized) {
		return;
	}

	audioInitialized = true;
	primeAudioSettings();
	G.audio = createAudioPools();
	registerAudioBridge();

	const startAudio = () => {
		audioUnlocked = true;
		ensureSfxAudioContext();
		if (sfxAudioContext && sfxAudioContext.state === 'suspended') {
			void sfxAudioContext.resume().catch(() => {});
		}

		if (G.audioEnabled) {
			updateAudio();
		}

		document.removeEventListener('click', startAudio);
		document.removeEventListener('keydown', startAudio);
	};

	document.addEventListener('click', startAudio);
	document.addEventListener('keydown', startAudio);
}

export function updateAudio() {
	if (!G.audio) {
		return;
	}

	const targetMode = resolveTargetMode();

	if (targetMode !== desiredMode) {
		desiredMode = targetMode;
		if (isTransitioning) {
			fadeToken += 1;
			isTransitioning = false;
		}
		void transitionToMode(targetMode);
	}
}

export function stopAudio() {
	fadeToken += 1;
	desiredMode = null;
	isTransitioning = false;
	introStopQueued = false;
	stopAllFootsteps();
	stopAllTracks(true);
	currentMode = null;
	currentTrack = null;
	currentMusicDuck = 1;
}

export function resetAudio() {
	stopAudio();
	lastTrackPathByMode = {
		intro: null,
		calm: null,
		terminal: null,
	};
}

export function toggleMusicEnabled() {
	setMusicEnabled(!G.audioEnabled);
}

export function setMusicEnabled(enabled) {
	G.audioEnabled = !!enabled;
	G.musicEnabled = !!enabled;
	if (!G.audioEnabled) {
		introStopQueued = false;
	}
	persistAudioPreference();
	emitAudioState();
	const targetMode = resolveTargetMode();

	if (targetMode !== desiredMode) {
		desiredMode = targetMode;
		if (isTransitioning) {
			fadeToken += 1;
			isTransitioning = false;
		}
		void transitionToMode(targetMode);
	}
}

export function setIntroAudioActive(active) {
	if (active) {
		introStopQueued = false;
		introAudioActive = true;
		resetIntroTrackLooping();
		updateAudio();
		return;
	}

	if (currentMode === 'intro' && currentTrack?.audio) {
		introStopQueued = true;
		currentTrack.audio.loop = false;
		ensureIntroTrackEndHandler(currentTrack.audio);
		return;
	}

	introStopQueued = false;
	introAudioActive = false;
	resetIntroTrackLooping();
	updateAudio();
}

function createAudioPools() {
	return Object.fromEntries(
		Object.entries(TRACK_GROUPS).map(([mode, paths]) => [
			mode,
			paths.map((path) => {
				const audio = new Audio(path);
				audio.loop = mode !== 'intro';
				audio.preload = 'auto';
				audio.volume = 0;
				return { path, audio };
			}),
		]),
	);
}

function resolveTargetMode() {
	if (!G.audio || !audioUnlocked || !G.audioEnabled || !G.musicEnabled) {
		return null;
	}

	if (introAudioActive) {
		return 'intro';
	}

	if (G.menuActive) {
		return 'menu';
	}

	if (G.breachActive) {
		return 'terminal';
	}

	if (G.alert < 85) {
		return 'calm';
	}

	return null;
}

async function transitionToMode(targetMode) {
	if (isTransitioning) {
		return;
	}

	isTransitioning = true;
	const token = ++fadeToken;

	if (currentTrack) {
		const fadedOut = await fadeTrack(currentTrack.audio, 0, token);
		if (!fadedOut || token !== fadeToken) {
			isTransitioning = false;
			return;
		}

		currentTrack.audio.pause();
		currentTrack.audio.currentTime = 0;
		currentTrack.audio.volume = 0;
		currentTrack = null;
		currentMode = null;
	}

	if (!targetMode) {
		isTransitioning = false;
		if (desiredMode !== targetMode) {
			void transitionToMode(desiredMode);
		}
		return;
	}

	const nextTrack = pickRandomTrack(targetMode);
	if (!nextTrack) {
		isTransitioning = false;
		return;
	}

	currentTrack = nextTrack;
	currentMode = targetMode;
	lastTrackPathByMode[targetMode] = nextTrack.path;
	nextTrack.audio.currentTime = 0;
	nextTrack.audio.volume = 0;

	const started = await playTrack(nextTrack.audio);
	if (!started || token !== fadeToken) {
		if (currentTrack?.audio === nextTrack.audio) {
			nextTrack.audio.pause();
			nextTrack.audio.currentTime = 0;
			currentTrack = null;
			currentMode = null;
		}
		isTransitioning = false;
		return;
	}

	const fadedIn = await fadeTrack(nextTrack.audio, (TARGET_VOLUMES[targetMode] || 0.4) * musicVolumeLevel, token);
	if (!fadedIn || token !== fadeToken) {
		isTransitioning = false;
		return;
	}

	isTransitioning = false;
	if (desiredMode !== currentMode) {
		void transitionToMode(desiredMode);
	}
}

function pickRandomTrack(mode) {
	const tracks = G.audio?.[mode] || [];
	if (!tracks.length) {
		return null;
	}

	const previousPath = lastTrackPathByMode[mode];
	const candidates = tracks.length > 1
		? tracks.filter((track) => track.path !== previousPath)
		: tracks;
	const pool = candidates.length ? candidates : tracks;
	return pool[(Math.random() * pool.length) | 0];
}

function playTrack(audio) {
	return audio.play().then(() => true).catch((err) => {
		console.log('Audio playback blocked:', err.message);
		return false;
	});
}

function fadeTrack(audio, targetVolume, token) {
	return new Promise((resolve) => {
		const initialVolume = safeVolume(audio.volume);
		const safeTargetVolume = safeVolume(targetVolume);
		if (Math.abs(initialVolume - safeTargetVolume) < 0.01) {
			audio.volume = safeTargetVolume;
			resolve(true);
			return;
		}

		const startTime = performance.now();

		const tick = (now) => {
			if (token !== fadeToken) {
				resolve(false);
				return;
			}

			const progress = Math.min(1, (now - startTime) / FADE_DURATION_MS);
			audio.volume = safeVolume(initialVolume + (safeTargetVolume - initialVolume) * progress);

			if (progress >= 1) {
				audio.volume = safeTargetVolume;
				resolve(true);
				return;
			}

			requestAnimationFrame(tick);
		};

		requestAnimationFrame(tick);
	});
}

function safeVolume(value) {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}

function clamp01(value) {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}

function stopAllTracks(resetTime) {
	if (!G.audio) {
		return;
	}

	for (const tracks of Object.values(G.audio)) {
		for (const track of tracks) {
			track.audio.pause();
			track.audio.volume = 0;
			if (resetTime) {
				track.audio.currentTime = 0;
			}
		}
	}

	resetIntroTrackLooping();
}

function ensureIntroTrackEndHandler(audio) {
	if (!audio || audio._gpIntroEndBound) {
		return;
	}

	audio._gpIntroEndBound = true;
	audio.addEventListener('ended', () => {
		if (!introStopQueued) {
			return;
		}

		introStopQueued = false;
		introAudioActive = false;
		resetIntroTrackLooping();
		updateAudio();
	});
}

function resetIntroTrackLooping() {
	if (!G.audio?.intro) {
		return;
	}

	for (const track of G.audio.intro) {
		track.audio.loop = true;
	}
}

function persistAudioPreference() {
	try {
		localStorage.setItem(AUDIO_PREFS_KEY, G.audioEnabled ? '1' : '0');
	} catch {
		// Ignore storage issues.
	}
}

function persistVolumeLevel(key, value) {
	try {
		localStorage.setItem(key, String(clamp01(value)));
	} catch {
		// Ignore storage issues.
	}
}

function readStoredAudioPreference() {
	try {
		const raw = localStorage.getItem(AUDIO_PREFS_KEY);
		if (raw === '1') {
			return true;
		}
		if (raw === '0') {
			return false;
		}
	} catch {
		// Ignore storage issues.
	}

	return null;
}

function readStoredVolumeLevel(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (raw == null) {
			return fallback;
		}
		const parsed = Number(raw);
		if (Number.isFinite(parsed)) {
			return clamp01(parsed);
		}
	} catch {
		// Ignore storage issues.
	}

	return clamp01(fallback);
}

function emitAudioState() {
	window.dispatchEvent(new CustomEvent('gp:audio-state', {
		detail: {
			enabled: !!G.audioEnabled,
		},
	}));
}

function registerAudioBridge() {
	window.addEventListener('gp:intro-audio-start', () => {
		setIntroAudioActive(true);
	});

	window.addEventListener('gp:intro-audio-stop', () => {
		setIntroAudioActive(false);
	});

	window.addEventListener('gp:audio-set-enabled', (event) => {
		const enabled = event.detail?.enabled;
		if (typeof enabled !== 'boolean') {
			return;
		}

		setMusicEnabled(enabled);
	});

	window.addEventListener('gp:audio-request-state', () => {
		emitAudioState();
	});
}

export function tickFootsteps(dt, playerMoved) {
	if (!audioUnlocked || !G.audioEnabled || !G.P || !G.tiles) {
		stopAllFootsteps();
		return;
	}

	if (G.menuActive || G.paused || G.dead || G.cleared) {
		stopAllFootsteps();
		return;
	}

	ensurePlayerFootsteps();
	const playerStepGain = playerMoved ? PLAYER_FOOTSTEP_VOLUME * footstepsVolumeLevel : 0;
	applyChannelMix(playerFootsteps, playerStepGain, 0);
	setLoopPlayback(playerFootsteps, playerStepGain > 0.01);

	const activeEnemyIds = new Set();
	const enemies = [
		...byType('guard').filter((entity) => !entity.dead),
		...byType('tech').filter((entity) => !entity.dead && !G.techDisabled),
	];

	for (const enemy of enemies) {
		const channel = ensureEnemyFootstepChannel(enemy.id);
		activeEnemyIds.add(enemy.id);

		const moveDist = Number.isFinite(channel.lastX)
			? Math.hypot(enemy.x - channel.lastX, enemy.y - channel.lastY)
			: 0;

		channel.lastX = enemy.x;
		channel.lastY = enemy.y;

		if (moveDist > ENEMY_MIN_MOVEMENT) {
			channel.stillMs = 0;
		} else {
			channel.stillMs = Math.min(2000, (channel.stillMs || 0) + Math.max(0, dt || 0));
		}

		const movementActive = moveDist > ENEMY_MIN_MOVEMENT || (channel.stillMs || 0) < 140;
		if (!movementActive) {
			applyChannelMix(channel, 0, 0);
			setLoopPlayback(channel, false);
			continue;
		}

		const pathTiles = shortestAudiblePathTiles(
			G.P.x | 0,
			G.P.y | 0,
			enemy.x | 0,
			enemy.y | 0,
			ENEMY_AUDIBLE_TILES,
		);

		if (!Number.isFinite(pathTiles) || pathTiles > ENEMY_AUDIBLE_TILES) {
			applyChannelMix(channel, 0, 0);
			setLoopPlayback(channel, false);
			continue;
		}

		const distNorm = Math.max(0, 1 - pathTiles / ENEMY_AUDIBLE_TILES);
		let gain = ENEMY_FOOTSTEP_VOLUME * footstepsVolumeLevel * distNorm * distNorm;

		const dx = enemy.x - G.P.x;
		const dy = enemy.y - G.P.y;
		const angleToEnemy = Math.atan2(dy, dx);
		let rel = angleToEnemy - (G.P.angle || 0);
		while (rel > Math.PI) rel -= Math.PI * 2;
		while (rel < -Math.PI) rel += Math.PI * 2;

		const pan = Math.max(-1, Math.min(1, Math.sin(rel)));
		const frontBoost = 0.65 + 0.35 * Math.max(0, Math.cos(rel));
		gain *= frontBoost;

		applyChannelMix(channel, gain, pan);
		setLoopPlayback(channel, gain > 0.008);
	}

	for (const [enemyId, channel] of enemyFootstepChannels.entries()) {
		if (activeEnemyIds.has(enemyId)) {
			continue;
		}
		applyChannelMix(channel, 0, 0);
		setLoopPlayback(channel, false);
		enemyFootstepChannels.delete(enemyId);
	}

	applyMusicDuck(false);
}

function ensurePlayerFootsteps() {
	if (playerFootsteps) {
		return playerFootsteps;
	}

	const audio = new Audio(PLAYER_FOOTSTEP_PATH);
	audio.preload = 'auto';
	audio.loop = true;
	audio.volume = 0;
	playerFootsteps = createSpatialChannel(audio, false);
	return playerFootsteps;
}

function ensureEnemyFootstepChannel(enemyId) {
	const existing = enemyFootstepChannels.get(enemyId);
	if (existing) {
		return existing;
	}

	const audio = new Audio(ENEMY_FOOTSTEP_PATH);
	audio.preload = 'auto';
	audio.loop = true;
	audio.volume = 0;
	const channel = createSpatialChannel(audio, true);
	channel.lastX = Number.NaN;
	channel.lastY = Number.NaN;
	channel.stillMs = 1000;
	enemyFootstepChannels.set(enemyId, channel);
	return channel;
}

function createSpatialChannel(audio, withPan) {
	if (!USE_WEB_AUDIO_FOR_FOOTSTEPS) {
		return {
			audio,
			gainNode: null,
			panNode: null,
			mediaNode: null,
			fallbackVolume: 0,
			fallbackPan: 0,
		};
	}

	const context = ensureSfxAudioContext();
	if (!context) {
		return {
			audio,
			gainNode: null,
			panNode: null,
			mediaNode: null,
			fallbackVolume: 0,
			fallbackPan: 0,
		};
	}

	const mediaNode = context.createMediaElementSource(audio);
	const gainNode = context.createGain();
	gainNode.gain.value = 0;

	let panNode = null;
	if (withPan && typeof context.createStereoPanner === 'function') {
		panNode = context.createStereoPanner();
		panNode.pan.value = 0;
		mediaNode.connect(gainNode);
		gainNode.connect(panNode);
		panNode.connect(context.destination);
	} else {
		mediaNode.connect(gainNode);
		gainNode.connect(context.destination);
	}

	return {
		audio,
		gainNode,
		panNode,
		mediaNode,
		fallbackVolume: 0,
		fallbackPan: 0,
	};
}

function ensureSfxAudioContext() {
	if (!audioContextRequested) {
		audioContextRequested = true;
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		if (AudioCtx) {
			try {
				sfxAudioContext = new AudioCtx();
			} catch {
				sfxAudioContext = null;
			}
		}
	}

	return sfxAudioContext;
}

function applyChannelMix(channel, volume, pan) {
	const safeVol = safeVolume(volume);
	const safePan = Math.max(-1, Math.min(1, Number.isFinite(pan) ? pan : 0));

	if (channel.gainNode) {
		channel.gainNode.gain.value = safeVol;
		if (channel.panNode) {
			channel.panNode.pan.value = safePan;
		}
		return;
	}

	const panAttenuation = 0.84 + 0.16 * (1 - Math.abs(safePan));
	channel.fallbackVolume = safeVol * panAttenuation;
	channel.audio.volume = channel.fallbackVolume;
}

function setLoopPlayback(channel, shouldPlay) {
	if (!channel || !channel.audio) {
		return;
	}

	if (!shouldPlay) {
		if (!channel.audio.paused) {
			channel.audio.pause();
		}
		return;
	}

	if (!channel.audio.paused) {
		return;
	}

	channel.audio.currentTime = 0;
	void channel.audio.play().catch(() => {});
}

function stopAllFootsteps() {
	if (playerFootsteps) {
		applyChannelMix(playerFootsteps, 0, 0);
		setLoopPlayback(playerFootsteps, false);
	}

	for (const channel of enemyFootstepChannels.values()) {
		applyChannelMix(channel, 0, 0);
		setLoopPlayback(channel, false);
	}

	applyMusicDuck(false);
}

function applyMusicDuck(active) {
	if (!currentTrack || !currentMode) {
		currentMusicDuck = 1;
		return;
	}

	const targetDuck = active ? FOOTSTEP_MUSIC_DUCK : 1;
	currentMusicDuck += (targetDuck - currentMusicDuck) * 0.2;
	const base = (TARGET_VOLUMES[currentMode] || 0.35) * musicVolumeLevel;
	if (!isTransitioning) {
		currentTrack.audio.volume = safeVolume(base * currentMusicDuck);
	}
}

function shortestAudiblePathTiles(startX, startY, goalX, goalY, maxDepth) {
	if (startX === goalX && startY === goalY) {
		return 0;
	}

	const mapH = G.tiles.length;
	const mapW = mapH > 0 ? G.tiles[0].length : 0;
	if (mapW <= 0 || mapH <= 0) {
		return Infinity;
	}

	if (
		startX < 0 || startY < 0 || goalX < 0 || goalY < 0 ||
		startX >= mapW || startY >= mapH || goalX >= mapW || goalY >= mapH
	) {
		return Infinity;
	}

	const visited = new Uint8Array(mapW * mapH);
	const queueX = new Int16Array(mapW * mapH);
	const queueY = new Int16Array(mapW * mapH);
	const queueD = new Int16Array(mapW * mapH);
	let head = 0;
	let tail = 0;

	queueX[tail] = startX;
	queueY[tail] = startY;
	queueD[tail] = 0;
	visited[startY * mapW + startX] = 1;
	tail += 1;

	while (head < tail) {
		const cx = queueX[head];
		const cy = queueY[head];
		const cd = queueD[head];
		head += 1;

		if (cd >= maxDepth) {
			continue;
		}

		for (let i = 0; i < 4; i += 1) {
			const nx = cx + (i === 0 ? 1 : i === 1 ? -1 : 0);
			const ny = cy + (i === 2 ? 1 : i === 3 ? -1 : 0);

			if (nx < 0 || ny < 0 || nx >= mapW || ny >= mapH) {
				continue;
			}

			const key = ny * mapW + nx;
			if (visited[key]) {
				continue;
			}

			if (!isSoundPassableTile(nx, ny, goalX, goalY)) {
				continue;
			}

			const nd = cd + 1;
			if (nx === goalX && ny === goalY) {
				return nd;
			}

			visited[key] = 1;
			queueX[tail] = nx;
			queueY[tail] = ny;
			queueD[tail] = nd;
			tail += 1;
		}
	}

	return Infinity;
}

function isSoundPassableTile(x, y, goalX, goalY) {
	if (x === goalX && y === goalY) {
		return true;
	}

	const tile = G.tiles[y]?.[x];
	return (
		tile === TILE_TYPES.FLOOR ||
		tile === TILE_TYPES.HIDE_SPOT ||
		tile === TILE_TYPES.ENTRANCE ||
		tile === TILE_TYPES.EXIT_USED ||
		tile === TILE_TYPES.SIDE_TERMINAL ||
		tile === TILE_TYPES.DOOR_OPEN
	);
}
