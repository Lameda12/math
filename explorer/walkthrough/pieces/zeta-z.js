// Built from src/pieces/zeta-z.ts by build.mjs. Edit that, not this.
/*
 * zeta z: Hardy's Z function scrolling past, computed live with the
 * Riemann-Siegel formula, above the critical strip it lives in. Z(t) is real
 * and has the size of zeta(1/2 + it), so every sign change is a zero on the
 * line Re s = 1/2, dropped into the strip below as it passes. The band at the
 * top of the strip, Re s > 7/8, is the part result 003 proves has no zeros
 * at all, and the part its Lean formalization checks.
 *
 * The plot is drawn with quadrant blocks, two by two to a cell.
 */
export const meta = {
  name: "zeta z",
  category: "data",
  note: "hardy's z function scrolling over the critical strip, zeros on the line",
  cols: 80,
  rows: 32,
  fps: 20,
}               ;

const W = 80, H = 32;
const LEFT = 8, PW = W - LEFT; // plot columns
const SPAN = 36; // t units across the plot
const SPEED = 2.4; // t units a second
const T0 = 10, T1 = 300; // the scroll's range: the left edge runs from T0 until the right edge reaches T1
const ZMAX = 4.5; // Z clipped to +/- this
const PLOT = 1, PROWS = 12; // first row of the plot, rows in it
const STRIP = 15, SROWS = 15; // first row inside the strip, rows in it (Re s from 1 at the top to 0)
// quadrant blocks by bits: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right
const QUAD = " ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█";

const theta = (t        ) => (t / 2) * Math.log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8 + 1 / (48 * t) + 7 / (5760 * t ** 3);

// Riemann-Siegel: the main sum and the first correction term
function hardyZ(t        )         {
  const a = Math.sqrt(t / (2 * Math.PI)), n = Math.floor(a), p = a - n, th = theta(t);
  let s = 0;
  for (let k = 1; k <= n; k++) s += Math.cos(th - t * Math.log(k)) / Math.sqrt(k);
  const c0 = Math.cos(2 * Math.PI * (p * p - p - 1 / 16)) / Math.cos(2 * Math.PI * p);
  return 2 * s + ((n - 1) % 2 ? -1 : 1) * Math.pow(t / (2 * Math.PI), -0.25) * c0;
}

export default function zetaZ()        {
  // the zeros up to T1, by sign changes and bisection, once
  const zeros           = [];
  let prev = hardyZ(T0);
  for (let t = T0 + 0.01; t < T1 + 1; t += 0.01) {
    const v = hardyZ(t);
    if (v * prev < 0) {
      let lo = t - 0.01, hi = t;
      for (let i = 0; i < 30; i++) {
        const m = (lo + hi) / 2;
        if (hardyZ(m) * hardyZ(lo) < 0) hi = m;
        else lo = m;
      }
      zeros.push((lo + hi) / 2);
    }
    prev = v;
  }
  const PERIOD = (T1 - SPAN - T0) / SPEED;

  const grid             = Array.from({ length: H }, () => new Array(W).fill(" "));
  const bits = new Uint8Array(PW * PROWS);
  const put = (r        , c        , s        ) => {
    for (let i = 0; i < s.length; i++) if (c + i >= 0 && c + i < W) grid[r][c + i] = s[i];
  };

  return (t) => {
    const left = T0 + (t % PERIOD) * SPEED;
    const col = (u        ) => LEFT + Math.floor(((u - left) / SPAN) * PW);
    for (const row of grid) row.fill(" ");

    put(0, 1, "Z(t), with |Z(t)| = |zeta(1/2 + it)|: each sign change is a zero on the line");

    // the curve, on a 2x2 grid of dots a cell
    bits.fill(0);
    const sub = 2 * PW, subRows = 2 * PROWS;
    let last = -1;
    for (let x = 0; x < sub; x++) {
      const u = left + ((x + 0.5) / sub) * SPAN;
      const z = Math.max(-ZMAX, Math.min(ZMAX, hardyZ(u)));
      const y = Math.round((subRows - 1) * (0.5 - z / (2 * ZMAX)));
      // join to the last dot so steep stretches stay unbroken
      const from = last < 0 ? y : last;
      for (let yy = Math.min(from, y); yy <= Math.max(from, y); yy++) {
        bits[(yy >> 1) * PW + (x >> 1)] |= 1 << ((yy & 1) * 2 + (x & 1));
      }
      last = y;
    }
    const axis = PLOT + PROWS / 2;
    for (let r = 0; r < PROWS; r++) {
      for (let c = 0; c < PW; c++) {
        const b = bits[r * PW + c];
        if (b) grid[PLOT + r][LEFT + c] = QUAD[b];
        else if (PLOT + r === axis && c % 2 === 0) grid[PLOT + r][LEFT + c] = "·";
      }
    }
    put(PLOT, 1, `+${ZMAX}`);
    put(axis, 4, "0 ┤");
    put(PLOT + PROWS - 1, 1, `-${ZMAX}`);

    // t along the bottom of the plot
    const tick = Math.ceil(left / 10) * 10;
    for (let u = tick; u < left + SPAN; u += 10) {
      const c = col(u);
      put(PLOT + PROWS, c, `┴ ${u}`);
    }

    // the critical strip, Re s from 1 at the top to 0 at the bottom
    const re = (r        ) => 1 - (r + 0.5) / SROWS;
    for (let c = LEFT; c < W; c++) (grid[STRIP - 1][c] = "─"), (grid[STRIP + SROWS][c] = "─");
    put(STRIP - 1, 0, "Re=1  ┼");
    put(STRIP + SROWS, 0, "Re=0  ┼");
    for (let r = 0; r < SROWS; r++) {
      const v = re(r);
      if (v > 7 / 8) for (let c = LEFT; c < W; c++) grid[STRIP + r][c] = "░";
      if (Math.abs(v - 0.5) < 1e-9) for (let c = LEFT; c < W; c += 2) grid[STRIP + r][c] = "┄";
    }
    put(STRIP, 1, ">7/8 │");
    put(STRIP + 7, 1, " 1/2 ┤");
    for (let r = 0; r < SROWS; r++) if (grid[STRIP + r][6] === " ") grid[STRIP + r][6] = "│";

    // the zeros: on the line under each sign change, with a drop line from the curve above
    let seen = 0;
    for (const z of zeros) {
      if (z <= left + SPAN) seen++;
      if (z < left || z >= left + SPAN) continue;
      const c = col(z);
      grid[STRIP + 7][c] = "o";
      for (let r = STRIP + 2; r < STRIP + 7; r++) if (grid[r][c] === " ") grid[r][c] = "·";
    }
    put(H - 1, 1, `zeros with 0 < t < ${Math.floor(left + SPAN)}: ${seen}, all on Re s = 1/2   none above 7/8 (result 003)`);
    return grid.map((r) => r.join("")).join("\n");
  };
}
