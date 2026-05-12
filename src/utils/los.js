export function lineOfSight(x0, y0, x1, y1, isWall) {

  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);

  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;

  let err = dx - dy;

  for (let i = 0; i < 64; i++) { // 💣 HARD LIMIT

    const tx = Math.floor(x0);
    const ty = Math.floor(y0);

    if (isWall(tx, ty)) {
      return false;
    }

    if (tx === Math.floor(x1) && ty === Math.floor(y1)) {
      return true;
    }

    if (tx === Math.floor(x1) && ty === Math.floor(y1)) {
      return true;
    }

    const e2 = 2 * err;

    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }

    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }

  return false; // 💣 fallback = brak LOS
}