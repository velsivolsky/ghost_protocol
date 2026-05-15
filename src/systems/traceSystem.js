import { G } from '../core/state.js';
import { clamp } from '../utils/math.js';

const TRACE_TIERS = [25, 50, 75, 100];

export function addTrace(amount, source = 'unknown') {
  if (!G.traceRuntime) {
    return;
  }

  const now = performance.now();
  const multiplier = now < (G.traceRuntime.ghostUntil || 0) ? 0.65 : 1;
  const scaled = Math.max(0, amount * multiplier);

  G.traceRuntime.value = clamp((G.traceRuntime.value || 0) + scaled, 0, 100);
  G.traceRuntime.lastSource = source;
  G.traceRuntime.lastSpike = scaled;
  G.traceRuntime.velocity = Math.max(G.traceRuntime.velocity || 0, scaled);
}

export function softenTrace(amount) {
  if (!G.traceRuntime) {
    return;
  }

  G.traceRuntime.value = clamp((G.traceRuntime.value || 0) - Math.max(0, amount), 0, 100);
}

export function activateTraceMask(durationMs = 7000) {
  if (!G.traceRuntime) {
    return;
  }

  G.traceRuntime.maskUntil = performance.now() + durationMs;
}

export function activateGhostWindow(durationMs = 6000) {
  if (!G.traceRuntime) {
    return;
  }

  G.traceRuntime.ghostUntil = performance.now() + durationMs;
}

export function tickTraceSystem(dt) {
  if (!G.traceRuntime || !G.terminalRuntime) {
    return;
  }

  const now = performance.now();
  const connected = !!G.terminalRuntime.connectedTargetId;
  const maskActive = now < (G.traceRuntime.maskUntil || 0);
  const ghostActive = now < (G.traceRuntime.ghostUntil || 0);
  const heat = Math.max(0, G.terminalRuntime.heat || 0);
  const heatPressure = heat > 0 ? Math.min(2.2, 1 + heat / 65) : 1;

  if (connected) {
    const passivePerSec = ghostActive ? 0.6 : G.traceRuntime.passivePerSec;
    addTrace((dt / 1000) * passivePerSec * heatPressure, 'link');
  }

  if (heat >= 60) {
    addTrace((dt / 1000) * ((heat - 58) * 0.08) * heatPressure, 'heat');
  }

  const decayBase = (dt / 1000) * G.traceRuntime.decayPerSec;
  const decayHeatPenalty = heat >= 70 ? Math.min(0.65, (heat - 65) * 0.01) : 0;
  const decay = maskActive ? decayBase * 2.3 : decayBase * (1 - decayHeatPenalty);
  softenTrace(decay);

  G.traceRuntime.velocity *= heat >= 70 ? 0.965 : 0.92;
  G.traceRuntime.velocity = Math.max(G.traceRuntime.velocity || 0, heat * 0.03);
  const value = G.traceRuntime.value || 0;
  let tier = 0;

  for (let i = 0; i < TRACE_TIERS.length; i += 1) {
    if (value >= TRACE_TIERS[i]) {
      tier = i + 1;
    }
  }

  if (tier > (G.traceRuntime.tier || 0)) {
    applyCountermeasureTier(tier);
  }

  G.traceRuntime.tier = tier;
  G.traceRuntime.risk = clamp(value + tier * 6, 0, 100);
}

function applyCountermeasureTier(tier) {
  G.traceRuntime.lastEscalationAt = performance.now();

  if (tier === 1) {
    G.terminalRuntime.networkStatus = 'WATCHDOG_AWAKE';
    G.terminalRuntime.responseDelayMs = 120;
  } else if (tier === 2) {
    G.terminalRuntime.networkStatus = 'COUNTER_INTRUSION';
    G.terminalRuntime.responseDelayMs = 190;
    G.terminalRuntime.scrambleUntil = performance.now() + 10000;
  } else if (tier === 3) {
    G.terminalRuntime.networkStatus = 'ICE_ACTIVE';
    G.terminalRuntime.responseDelayMs = 260;
    G.terminalRuntime.scrambleUntil = performance.now() + 12000;
    G.terminalRuntime.falseOutputUntil = performance.now() + 12000;
    G.alert = clamp((G.alert || 0) + 8, 0, 100);
  } else if (tier >= 4) {
    G.terminalRuntime.networkStatus = 'HUNTER_RESPONSE';
    G.terminalRuntime.responseDelayMs = 340;
    G.terminalRuntime.scrambleUntil = performance.now() + 16000;
    G.terminalRuntime.falseOutputUntil = performance.now() + 18000;
    G.alert = clamp((G.alert || 0) + 16, 0, 100);
  }
}
