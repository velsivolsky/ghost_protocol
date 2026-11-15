export const TRACE_TIERS = [25, 50, 75, 100];

export const TRACE_BALANCE = {
	startValue: 0,
	passivePerSec: 1.8,
	decayPerSec: 3.1,
	ghostMultiplier: 0.65,
	maskDecayMult: 2.3,
	heatPressureCap: 2.2,
	tierResponseDelayMs: [120, 190, 260, 340],
	tierScrambleMs: [0, 10000, 12000, 16000],
	tierFalseOutputMs: [0, 0, 12000, 18000],
	tierAlertGain: [0, 0, 8, 16],
	alertDecayPenaltyStart: 60,
	alertDecayPenaltyPerPoint: 0.004,
	peakTierDecayMult: 0.80,
};

export const BREACH_BALANCE = {
	startTrace: 10,
	passiveTracePerTurn: 1,
	trackedTraceBonus: 3,
	cpuRegen: 18,
	ramRegen: 14,
	blackIceTraceThreshold: 92,
	blackIceTurnThreshold: 11,
	maxEnemyArmor: 10,
	traceGlitchThreshold: 25,
	traceEscalationThreshold: 50,
	traceWarningThreshold: 75,
	tracePanicThreshold: 90,
	stealthTurnsForDecay: 2,
	traceDecayPerTurn: 1,
	lastActionCooldown: 2,
	spamThresholdRepeats: 3,
	spamPenaltyAdaptArmorPerRepeat: 1,
	overclock: { cpuSpike: 40, ramSpike: 20, traceCost: 45 },
};

// Wykrywanie w świecie (strażnicy, kamery, technicy, drony). Wartości czasowe w ms.
export const DETECTION_BALANCE = {
	// Strażnik (entities/guard.js)
	guardConeHalfAngle: 0.7,      // był 0.8 rad (~46°) -> ~40° półkąta stożka
	guardDetectPerMs: 0.0007,     // był 0.001 -> pełne wykrycie po ~2,0 s zamiast ~1,4 s
	guardChaseDetect: 1.4,        // bez zmian: próg przejścia w pościg z bliska
	guardReacquireDetect: 0.6,    // NOWE: strażnik w 'search' musi najpierw widzieć gracza ~0,9 s
	guardAlertPerMs: 0.010,       // był 0.015 -> alarm rośnie wolniej
	guardChaseLoseMs: 1200,       // był 1800 -> pościg kończy się szybciej po zgubieniu z oczu
	// Kamery (systems/update.js, entities/camera.js)
	cameraFov: Math.PI / 3,       // był PI/2.5 (72°) -> 60° pełnego kąta
	cameraDwellMs: 400,           // NOWE: kamera musi widzieć gracza 400 ms zanim zareaguje
	cameraAlertPerMs: 0.012,      // był 0.016
	// Technik (entities/technician.js)
	techRange: 5.5,               // był 6.2 kafla
	techAlertPerMs: 0.007,        // był 0.01
	// Dron (entities/drone.js)
	droneAlertPerMs: 0.008,       // był 0.012
};