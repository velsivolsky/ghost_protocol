export function createCamera(index, room) {
  return {
    id: `cam${index}`,
    type: 'cam',
    x: room.x + ((room.w / 2) | 0),
    y: room.y,
    hacked: false,
    facing: Math.PI / 2,
    rotDir: (Math.random() > 0.5 ? 1 : -1) * 0.0012,
    fov: Math.PI / 2.5,
    range: 4.5,
    desc: `Kamera #${index}`,
    hackable: true,
  };
}