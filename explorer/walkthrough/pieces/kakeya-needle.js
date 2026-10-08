// Built from src/pieces/kakeya-needle.ts by build.mjs. Edit that, not this.
/*
 * kakeya needle: a needle turning end for end inside a deltoid, Kakeya's own
 * example. The deltoid x = 2 cos s + cos 2s, y = 2 sin s - sin 2s meets each
 * of its tangent lines in a chord of length 4, so a needle of length 4 can
 * ride its tangents all the way round, and comes back reversed, in an area
 * of 2 pi: half the disk it would sweep turning about its middle. The trail
 * shows where it has just been.
 *
 * The chord ends are found once, by crossing each tangent with the curve.
 */
export const meta = {
  name: "kakeya needle",
  category: "shapes",
  note: "a needle of length four turning end for end inside a deltoid",
  cols: 64,
  rows: 30,
  fps: 24,
}               ;

const W = 64, H = 30;
const TURN = 12; // seconds for the tangent point to go once round, the needle half a turn
const STEPS = 720;
const SY = 5.2, SX = 10.4; // cells a unit: a cell is about twice as tall as it is wide
const CX = W / 2 - 0.75 * SX, CY = H / 2; // the deltoid's centre sits left of the frame's
const TRAIL = 0.14; // the fraction of a turn the trail remembers

const px = (s        ) => 2 * Math.cos(s) + Math.cos(2 * s);
const py = (s        ) => 2 * Math.sin(s) - Math.sin(2 * s);

export default function kakeyaNeedle()        {
  // the curve, sampled finely
  const M = 4000;
  const cx = Float64Array.from({ length: M }, (_, i) => px((i / M) * 2 * Math.PI));
  const cy = Float64Array.from({ length: M }, (_, i) => py((i / M) * 2 * Math.PI));
  // each tangent's chord: the outermost crossings of the line with the curve
  const ends = new Float64Array(STEPS * 4);
  for (let n = 0; n < STEPS; n++) {
    const s = (n / STEPS) * 2 * Math.PI + 1e-3;
    const x0 = px(s), y0 = py(s);
    let dx = -2 * Math.sin(s) - 2 * Math.sin(2 * s), dy = 2 * Math.cos(s) - 2 * Math.cos(2 * s);
    const l = Math.hypot(dx, dy);
    (dx /= l), (dy /= l);
    let lo = 0, hi = 0;
    const side = (i        ) => (cx[i] - x0) * dy - (cy[i] - y0) * dx;
    for (let i = 0; i < M; i++) {
      const a = side(i), b = side((i + 1) % M);
      if (a === 0 || a * b > 0) continue;
      const f = a / (a - b);
      const qx = cx[i] + (cx[(i + 1) % M] - cx[i]) * f, qy = cy[i] + (cy[(i + 1) % M] - cy[i]) * f;
      const lam = (qx - x0) * dx + (qy - y0) * dy;
      lo = Math.min(lo, lam), hi = Math.max(hi, lam);
    }
    ends.set([x0 + lo * dx, y0 + lo * dy, x0 + hi * dx, y0 + hi * dy], n * 4);
  }

  const grid             = Array.from({ length: H }, () => new Array(W).fill(" "));
  const age = new Float32Array(W * H);
  const cell = (x        , y        )                   => [Math.floor(CX + x * SX), Math.floor(CY - y * SY)];
  const line = (n        , f                                ) => {
    const [x0, y0, x1, y1] = ends.subarray(n * 4, n * 4 + 4);
    for (let u = 0; u <= 1; u += 0.01) {
      const [c, r] = cell(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u);
      if (c >= 0 && c < W && r >= 0 && r < H) f(c, r);
    }
  };

  return (t) => {
    for (const row of grid) row.fill(" ");
    const now = ((t / TURN) % 1) * STEPS;
    // the trail: how long ago the needle last covered each cell
    age.fill(1);
    const back = Math.floor(TRAIL * STEPS);
    for (let k = back; k >= 1; k--) {
      const n = ((Math.floor(now) - k) % STEPS + STEPS) % STEPS;
      line(n, (c, r) => (age[r * W + c] = Math.min(age[r * W + c], k / back)));
    }
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const a = age[r * W + c];
        if (a < 1) grid[r][c] = a < 0.2 ? "▓" : a < 0.55 ? "▒" : "░";
      }
    }
    // the deltoid's outline over the trail, so its shape always shows
    for (let i = 0; i < M; i += 4) {
      const [c, r] = cell(cx[i], cy[i]);
      if (c >= 0 && c < W && r >= 0 && r < H) grid[r][c] = "·";
    }
    line(Math.floor(now) % STEPS, (c, r) => (grid[r][c] = "█"));
    return grid.map((r) => r.join("")).join("\n");
  };
}
