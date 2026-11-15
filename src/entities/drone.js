import { G, byType } from '../core/state.js';
import { TILE_TYPES } from '../core/constants.js';
import { DETECTION_BALANCE } from '../core/balance.js';
import { clamp, dst } from '../utils/math.js';
import { killPlayer } from '../systems/mission.js';
import { floatMsg, log, rebuildList } from '../systems/ui.js';

export function createDrone(index, room, wave) {
  const orbitCenterX = room.x + room.w / 2;
  const orbitCenterY = room.y + room.h / 2;

  return {
    id: `drone${index}`,
    type: 'drone',
    x: orbitCenterX,
    y: orbitCenterY,
    angle: Math.random() * Math.PI * 2,
    radius: 1.5 + Math.random(),
    speed: 0.01 + wave * 0.003,
    ocx: orbitCenterX,
    ocy: orbitCenterY,
    hacked: false,
    hijacked: false,
    dead: false,
    desc: `Dron #${index + 1}`,
    hackable: true,
  };
}

export function tickDrone(drone, dt) {
  const player = G.P;
  const playerTileX = player.x | 0;
  const playerTileY = player.y | 0;
  const playerHidden = G.tiles?.[playerTileY]?.[playerTileX] === TILE_TYPES.HIDE_SPOT;

  if (drone.hijacked) {
    const enemy = byType('guard')
      .filter((guard) => !guard.dead && !guard.hacked)
      .sort((left, right) => dst(left, drone) - dst(right, drone))[0];

    if (!enemy) {
      drone.hijacked = false;
      return;
    }

    const dx = enemy.x - drone.x;
    const dy = enemy.y - drone.y;
    const length = Math.hypot(dx, dy);

    if (length < 0.8) {
      enemy.dead = true;
      enemy.bodyReported = false;
      log('Dron zestrzelił strażnika', 'ok');
      floatMsg('IMPACT!', drone, '#ff3a5c');
      drone.hijacked = false;
      drone.hacked = false;
      rebuildList();
      return;
    }

    drone.x += (dx / length) * 0.025 * dt;
    drone.y += (dy / length) * 0.025 * dt;
    return;
  }

  drone.angle += drone.speed * dt;
  drone.x = drone.ocx + Math.cos(drone.angle) * drone.radius;
  drone.y = drone.ocy + Math.sin(drone.angle) * drone.radius;

  if (!playerHidden && dst(drone, player) < 2 && !G.blackout) {
    G.alert = clamp(G.alert + dt * DETECTION_BALANCE.droneAlertPerMs);

    if (dst(drone, player) < 1) {
      player.hp = Math.max(0, player.hp - dt * 0.025);

      if (player.hp <= 0) {
        killPlayer('Zestrzelony przez dron');
      }
    }
  }
}