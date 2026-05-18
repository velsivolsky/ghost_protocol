import { G } from '../core/state.js';
import { PLAYER_SPEED, TILE_TYPES } from '../core/constants.js';
import { clamp, dst } from '../utils/math.js';
import { canWalk } from '../world/map.js';
import { killPlayer } from '../systems/mission.js';
import { log } from '../systems/ui.js';
import { lineOfSight } from '../utils/los.js';
import { findNextStep } from '../world/pathing.js';

function generatePatrolWaypoints() {
  if (!G.tiles || !G.tiles[0]) {
    return [];
  }

  const waypoints = [];
  const count = 4 + Math.floor(Math.random() * 3); // 4-6 waypoints

  for (let i = 0; i < count; i++) {
    let found = false;

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = Math.floor(Math.random() * G.tiles[0].length);
      const y = Math.floor(Math.random() * G.tiles.length);

      if (canWalk(G.tiles, x + 0.5, y + 0.5)) {
        waypoints.push({ x: x + 0.5, y: y + 0.5 });
        found = true;
        break;
      }
    }

    if (!found) {
      waypoints.push({ x: Math.random() * G.tiles[0].length, y: Math.random() * G.tiles.length });
    }
  }

  return waypoints;
}

export function createGuard(index, room, wave) {
  const guardX = room.x + 1 + ((Math.random() * Math.max(1, room.w - 2)) | 0);
  const guardY = room.y + 1 + ((Math.random() * Math.max(1, room.h - 2)) | 0);

  return {
    id: `guard${index}`,
    type: 'guard',
    x: guardX,
    y: guardY,
    hp: 2,
    patrolWaypoints: generatePatrolWaypoints(),
    pi: 0,
    patrolRegenerateTimer: 0,
    patrolRegenerateInterval: 30000 + Math.random() * 30000, // 30-60 seconds
    moveT: 0,
    alertT: 0,
    aware: false,
    facing: 0,
    offline: wave > 2 && Math.random() > 0.7,
    hacked: false,
    dead: false,
    desc: `Strażnik #${index + 1}`,
    hackable: true,
    state: 'idle',
    opticsOfflineT: 0,
    motoricsResetT: 0,
    bodyReported: false,
    investigateX: null,
    investigateY: null,
    investigateUntil: 0,
  };
}

export function tickGuard(guard, dt) {
  guard.opticsOfflineT = Math.max(0, (guard.opticsOfflineT || 0) - dt);
  guard.motoricsResetT = Math.max(0, (guard.motoricsResetT || 0) - dt);

  if (guard.opticsOfflineT > 0 && guard.state === 'chase') {
    guard.state = 'search';
    guard.detect = 0;
    guard.searchTimer = 0;
    guard.lastSeen = null;
    log('Strażnik traci cię z oczu.', 'ok');
  }

  const player = G.P;
  const distance = dst(guard, player);

  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const angle = Math.atan2(dy, dx);

  let diff = angle - (guard.facing || 0);

  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const seesPlayer =
    distance < 7 &&
    Math.abs(diff) < 0.8 &&
    guard.opticsOfflineT <= 0 &&
    !guard.hacked &&
    !G.blackout &&
    !isPlayerHiddenFromGuard(guard) &&
    lineOfSight(
      guard.x + 0.5,
      guard.y + 0.5,
      player.x,
      player.y,
      (x, y) => {
        const tile = G.tiles[y]?.[x];
        return tile === TILE_TYPES.WALL || tile === TILE_TYPES.DOOR_CLOSED || tile === TILE_TYPES.WALL_TERMINAL;
      },
    );

  if (seesPlayer) {
    guard.lastSeen = { x: player.x, y: player.y };
    guard.investigateUntil = 0;

    if (guard.state === 'idle') {
      guard.state = 'suspicious';
      guard.detect = 0;
      log('Strażnik coś zauważył', 'w');
    }

    guard.detect = (guard.detect || 0) + dt * 0.001;
    G.alert = clamp(G.alert + dt * 0.015);

    if (guard.detect > 1.4 && distance < 5) {
      guard.state = 'chase';
      guard.searchTimer = 0;
      log('Strażnik namierza cel!', 'w');
    }
  } else {
    guard.detect = Math.max(0, (guard.detect || 0) - dt * 0.0016);

    if (guard.state === 'suspicious' && guard.detect <= 0) {
      guard.state = 'search';
      guard.searchTimer = 0;
    }

    if (guard.state === 'search') {
      guard.searchTimer = (guard.searchTimer || 0) + dt;

      if (guard.searchTimer > 6500) {
        guard.state = 'idle';
        guard.searchTimer = 0;
      }
    }

    if (guard.state === 'chase') {
      guard.searchTimer = (guard.searchTimer || 0) + dt;

      if (guard.searchTimer > 1800) {
        guard.state = 'search';
        guard.searchTimer = 0;
      }
    }
  }

  const playerMaxStep = (PLAYER_SPEED * dt) / 1000;
  const speedMultiplier = guard.motoricsResetT > 0 ? 0.25 : 1;
  const patrolSpeed = playerMaxStep * 0.14 * speedMultiplier;
  const searchSpeed = playerMaxStep * 0.7 * speedMultiplier;
  const chaseSpeed = playerMaxStep * speedMultiplier;

  if (guard.state === 'search' && guard.lastSeen) {
    const now = performance.now();
    if (
      guard.investigateUntil > now &&
      Number.isFinite(guard.investigateX) &&
      Number.isFinite(guard.investigateY)
    ) {
      const arrivedInvestigate = moveWithPath(guard, guard.investigateX, guard.investigateY, searchSpeed);
      if (arrivedInvestigate) {
        guard.searchTimer = (guard.searchTimer || 0) + dt;
      }
      return;
    }

    const arrived = moveWithPath(guard, guard.lastSeen.x, guard.lastSeen.y, searchSpeed);

    if (arrived) {
      guard.searchTimer = (guard.searchTimer || 0) + dt;
    }

    if (seesPlayer) {
      guard.state = 'chase';
      guard.searchTimer = 0;
    }

    return;
  }

  if (guard.state === 'suspicious' && guard.lastSeen) {
    moveWithPath(guard, guard.lastSeen.x, guard.lastSeen.y, searchSpeed * 0.85);

    if (seesPlayer && guard.detect > 1.4 && distance < 3.2) {
      guard.state = 'chase';
      guard.searchTimer = 0;
    }

    return;
  }

  if (guard.state === 'chase') {
    moveWithPath(guard, player.x, player.y, chaseSpeed);

    if (distance < 1.2) {
      player.hp -= dt * 0.03;

      if (player.hp <= 0) {
        killPlayer('Strażnik cię dopadł');
      }
    }

    return;
  }

  // Patrol with periodic waypoint regeneration
  if (guard.patrolWaypoints.length === 0) {
    guard.patrolWaypoints = generatePatrolWaypoints();
  }

  guard.patrolRegenerateTimer += dt;
  if (guard.patrolRegenerateTimer > guard.patrolRegenerateInterval) {
    guard.patrolWaypoints = generatePatrolWaypoints();
    guard.patrolRegenerateTimer = 0;
    guard.patrolRegenerateInterval = 30000 + Math.random() * 30000;
  }

  const patrolPoint = guard.patrolWaypoints[guard.pi % guard.patrolWaypoints.length];
  const patrolArrived = moveWithPath(guard, patrolPoint.x, patrolPoint.y, patrolSpeed);

  if (patrolArrived) {
    guard.pi += 1;
  }
}

function isPlayerHiddenFromGuard(guard) {
  const tileX = G.P.x | 0;
  const tileY = G.P.y | 0;
  const tile = G.tiles[tileY]?.[tileX];

  if (tile !== TILE_TYPES.HIDE_SPOT) {
    return false;
  }

  return dst(guard, G.P) > 1.3;
}

function moveWithPath(guard, targetX, targetY, speed) {
  let stepTargetX = targetX;
  let stepTargetY = targetY;

  const startX = guard.x | 0;
  const startY = guard.y | 0;
  const goalX = targetX | 0;
  const goalY = targetY | 0;

  if (startX !== goalX || startY !== goalY) {
    const next = findNextStep(G.tiles, startX, startY, goalX, goalY);

    if (next) {
      stepTargetX = next.x + 0.5;
      stepTargetY = next.y + 0.5;
    }
  }

  const dx = stepTargetX - guard.x;
  const dy = stepTargetY - guard.y;
  const len = Math.hypot(dx, dy);

  if (len < 0.15) {
    return true;
  }

  const vx = dx / len;
  const vy = dy / len;
  const step = Math.min(speed, 0.23);

  if (canOccupyNpc(G.tiles, guard.x + vx * step, guard.y)) {
    guard.x += vx * step;
  }

  if (canOccupyNpc(G.tiles, guard.x, guard.y + vy * step)) {
    guard.y += vy * step;
  }

  guard.facing = Math.atan2(vy, vx);
  return false;
}

function canOccupyNpc(tiles, x, y) {
  const left = x + 0.18;
  const right = x + 0.82;
  const top = y + 0.16;
  const bottom = y + 0.84;

  return (
    canWalk(tiles, left, top) &&
    canWalk(tiles, right, top) &&
    canWalk(tiles, left, bottom) &&
    canWalk(tiles, right, bottom)
  );
}