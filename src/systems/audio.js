import { G } from '../core/state.js';

const TRACK_GROUPS = {
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
	menu: 0.45,
	calm: 0.4,
	terminal: 0.46,
};

const FADE_DURATION_MS = 650;

let currentMode = null;
let currentTrack = null;
let desiredMode = null;
let isTransitioning = false;
let audioInitialized = false;
let audioUnlocked = false;
let fadeToken = 0;
let lastTrackPathByMode = {
	calm: null,
	terminal: null,
};

export function initAudio() {
	if (audioInitialized) {
		return;
	}

	audioInitialized = true;
	G.audio = createAudioPools();

	const startAudio = () => {
		audioUnlocked = true;

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
	stopAllTracks(true);
	currentMode = null;
	currentTrack = null;
}

export function resetAudio() {
	stopAudio();
	lastTrackPathByMode = {
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

function createAudioPools() {
	return Object.fromEntries(
		Object.entries(TRACK_GROUPS).map(([mode, paths]) => [
			mode,
			paths.map((path) => {
				const audio = new Audio(path);
				audio.loop = true;
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

	const fadedIn = await fadeTrack(nextTrack.audio, TARGET_VOLUMES[targetMode] || 0.4, token);
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
}
