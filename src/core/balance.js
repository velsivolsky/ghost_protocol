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