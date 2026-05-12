export function createPlayer(spawn, credits) {
  return {
    x: spawn.x + 2.5,
    y: spawn.y + 3.5,
    hp: 100,
    mhp: 100,
    bw: 100,
    mbw: 100,
    cr: credits,
  };
}