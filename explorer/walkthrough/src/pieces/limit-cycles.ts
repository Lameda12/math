/*
 * limit cycles: tracers in a polynomial vector field of degree seven,
 *
 *   x' = -y w(r²) + x g(r²),   y' = x w(r²) + y g(r²),
 *   g(p) = (1 - p)(4 - p)(9 - p) / 36,   w(p) = 1.25 - 0.12 p,
 *
 * seen through a shear, so its three limit cycles are tilted ovals. The
 * cycles at r = 1 and r = 3 attract and gather the tracers into bright rings;
 * the one at r = 2 repels and is drawn dashed, the way it is drawn on paper.
 * Hilbert's sixteenth problem asks how many such cycles a field of a given
 * degree can have.
 *
 * Tracers are integrated on a fixed grid of steps from a hashed birth, so the
 * picture at t never depends on the frame rate.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "limit cycles",
  category: "scenes",
  note: "tracers in a degree-seven polynomial field gathering on two limit cycles",
  cols: 240,
  rows: 100,
  cell: 1,
  fps: 20,
  ground: "#06050b",
  palette: [
    "#08070f", "#100e1c", "#18152c", "#221e3e", "#2e2852",
    "#3c1a14", "#6a2a1c", "#a03e24", "#d65a30", "#ff8a4c", "#ffbe8a", "#ffe4cc",
    "#10223c", "#163a66", "#1e5896", "#2c7ec4", "#58a8e8", "#a0d0ff",
    "#2e1a52", "#4a2a80", "#6c44b0", "#9a72dc",
    "#f6f2ff",
  ],
} satisfies Meta;

const W = 240, H = 100;
const TRACERS = 520, TRAIL = 22;
const STEP = 1 / 20; // seconds a grid step
const LIFE = 180; // steps a tracer lives
const SPEED = 0.55; // field time a second
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

const g = (p: number) => (1 / 36) * (1 - p) * (4 - p) * (9 - p);
const w = (p: number) => 1.25 - 0.12 * p;

// one Runge-Kutta step of the field, in place
function rk4(s: Float64Array, h: number) {
  const f = (x: number, y: number, o: number[]) => {
    const p = x * x + y * y;
    o[0] = -y * w(p) + x * g(p);
    o[1] = x * w(p) + y * g(p);
  };
  const a = [0, 0], b = [0, 0], c = [0, 0], d = [0, 0];
  const [x, y] = s;
  f(x, y, a);
  f(x + (h / 2) * a[0], y + (h / 2) * a[1], b);
  f(x + (h / 2) * b[0], y + (h / 2) * b[1], c);
  f(x + h * c[0], y + h * c[1], d);
  s[0] = x + (h / 6) * (a[0] + 2 * b[0] + 2 * c[0] + d[0]);
  s[1] = y + (h / 6) * (a[1] + 2 * b[1] + 2 * c[1] + d[1]);
}

// the shear onto the screen: field units to cells, centred
const sx = (x: number, y: number) => W / 2 + 29 * x + 10 * y;
const sy = (x: number, y: number) => H / 2 - 8 * x + 13 * y;

export default function limitCycles(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, gg: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (gg * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - gg, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // the repelling cycle, dashed, and the field's texture: a faint sense of the flow
  const base = new Float32Array(N * 3);
  for (let i = 0; i < 1200; i++) {
    const a = (i / 1200) * 6.283;
    if (Math.floor(i / 25) % 2) continue;
    const x = 2 * Math.cos(a), y = 2 * Math.sin(a);
    const k = Math.floor(sy(x, y)) * W + Math.floor(sx(x, y));
    base[k * 3] = 0.22, base[k * 3 + 1] = 0.18, base[k * 3 + 2] = 0.42;
  }

  // every tracer: its life number, its state, and its last TRAIL positions on screen
  const life = new Int32Array(TRACERS).fill(-1);
  const at = new Int32Array(TRACERS); // the step its state is at
  const st = Array.from({ length: TRACERS }, () => new Float64Array(2));
  const trail = new Float32Array(TRACERS * TRAIL * 2);
  const basin = new Uint8Array(TRACERS);
  const offset = Int32Array.from({ length: TRACERS }, (_, i) => Math.floor(hash(i, 1) * LIFE));
  const h = STEP * SPEED;

  const born = (i: number, n: number) => {
    // spread over the plane out past the outer cycle, a little thicker inside
    const a = hash(i, n * 3 + 7) * 6.283, r = 0.05 + 3.65 * Math.pow(hash(i, n * 3 + 8), 0.8);
    st[i][0] = r * Math.cos(a), st[i][1] = r * Math.sin(a);
    basin[i] = r < 2 ? 0 : 1;
    for (let j = 0; j < TRAIL; j++) (trail[(i * TRAIL + j) * 2] = NaN);
  };

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  return (t, { color } = {}) => {
    const now = Math.floor(t / STEP);
    for (let k = 0; k < N; k++) (R[k] = base[k * 3]), (G[k] = base[k * 3 + 1]), (B[k] = base[k * 3 + 2]);
    for (let i = 0; i < TRACERS; i++) {
      const n = Math.floor((now + offset[i]) / LIFE);
      const start = n * LIFE - offset[i];
      // a new life, or time went backwards: start this tracer over from its birth
      if (life[i] !== n || at[i] > now) (life[i] = n), (at[i] = start), born(i, n);
      for (; at[i] < now; at[i]++) {
        for (let q = 0; q < 4; q++) rk4(st[i], h / 4);
        const j = ((at[i] % TRAIL) + TRAIL) % TRAIL;
        trail[(i * TRAIL + j) * 2] = sx(st[i][0], st[i][1]);
        trail[(i * TRAIL + j) * 2 + 1] = sy(st[i][0], st[i][1]);
      }
      const age = (now - start) / LIFE;
      const fade = Math.min(1, age * 8, (1 - age) * 6);
      // warm in the inner basin, cool in the outer
      const [cr, cg, cb] = basin[i] ? [0.35, 0.62, 1] : [1, 0.55, 0.3];
      for (let q = 0; q < TRAIL; q++) {
        const j = (((now - 1 - q) % TRAIL) + TRAIL) % TRAIL;
        const x = trail[(i * TRAIL + j) * 2], y = trail[(i * TRAIL + j) * 2 + 1];
        if (!(x >= 0 && x < W && y >= 0 && y < H)) continue;
        const k = Math.floor(y) * W + Math.floor(x);
        const v = (1 - q / TRAIL) ** 1.5 * fade * (q === 0 ? 1 : 0.75);
        R[k] = Math.max(R[k], cr * v), G[k] = Math.max(G[k], cg * v), B[k] = Math.max(B[k], cb * v);
      }
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = R[k], cg = G[k], cb = B[k];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(Math.pow(peak, 0.75));
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    const lines: string[] = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
