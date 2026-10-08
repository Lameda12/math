/*
 * spin glass: a diluted spin glass cooling. Two hundred spins, each bonded to
 * a few neighbours by couplings of random sign, flip under Glauber dynamics
 * while the temperature falls. Up spins are amber, down spins teal; a bond
 * whose two spins disagree with its sign is frustrated and burns magenta, and
 * however cold it gets, some always do. Then it heats up and starts over.
 *
 * The dynamics are replayed from the start of each cycle with a hashed coin
 * for every flip, so the picture at t never depends on the frame rate.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "spin glass",
  category: "scenes",
  note: "a diluted spin glass cooling, frustrated bonds burning magenta",
  cols: 240,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#05060c",
  palette: [
    "#070912", "#0d1120", "#141a30", "#1d2642", "#283456", "#36456c",
    "#5a2a08", "#8a4a10", "#c07418", "#f0a030", "#ffc860", "#ffe6a8",
    "#06333a", "#0b5560", "#12808a", "#22aab0", "#5cd4d0", "#a8f0ea",
    "#3a0a2e", "#62104a", "#981a6e", "#d02c92", "#ff5cb8", "#ffa8dc",
    "#f4f6ff",
  ],
} satisfies Meta;

const W = 240, H = 100;
const SPINS = 200, DEGREE = 3;
const RATE = 18; // sweeps a second
const CYCLE = 22; // seconds: cool, hold, heat
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

// the temperature over one cycle: hot, a long cooling, a cold hold, a quick heat
const temperature = (c: number) => {
  if (c < 2) return 3.2;
  if (c < 14) return 3.2 * Math.pow(0.04, (c - 2) / 12);
  if (c < 19) return 0.13;
  return 0.13 + 3.07 * smooth(19, 22, c);
};

export default function spinGlass(): Frame {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out: string[] = new Array(N);
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r: number, g: number, b: number): number => {
    const k = (Math.min(31, (r * 31.99) | 0) << 10) | (Math.min(31, (g * 31.99) | 0) << 5) | Math.min(31, (b * 31.99) | 0);
    if (lut[k] !== 255) return lut[k];
    let best = 0, bd = 1e9;
    for (let i = 0; i < P.length; i++) {
      const dr = P[i][0] - r, dg = P[i][1] - g, db = P[i][2] - b;
      const d = 0.3 * dr * dr + 0.5 * dg * dg + 0.2 * db * db;
      if (d < bd) (bd = d), (best = i);
    }
    return (lut[k] = best);
  };

  // --- the graph: spins scattered in a wide ellipse, relaxed apart, bonded to near neighbours
  const rnd = mulberry32(221);
  const px = new Float32Array(SPINS), py = new Float32Array(SPINS);
  for (let i = 0; i < SPINS; i++) {
    const a = rnd() * 6.283, r = Math.sqrt(rnd());
    px[i] = W / 2 + Math.cos(a) * r * (W / 2 - 12);
    py[i] = H / 2 + Math.sin(a) * r * (H / 2 - 7);
  }
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < SPINS; i++) {
      for (let j = i + 1; j < SPINS; j++) {
        const dx = px[j] - px[i], dy = py[j] - py[i];
        const d2 = dx * dx + dy * dy;
        if (d2 > 100 || d2 < 1e-6) continue;
        const f = (10 - Math.sqrt(d2)) * 0.05;
        const d = Math.sqrt(d2);
        px[i] -= (dx / d) * f, py[i] -= (dy / d) * f, px[j] += (dx / d) * f, py[j] += (dy / d) * f;
      }
    }
    for (let i = 0; i < SPINS; i++) {
      // keep them inside the ellipse
      const ex = (px[i] - W / 2) / (W / 2 - 10), ey = (py[i] - H / 2) / (H / 2 - 6);
      const e = Math.hypot(ex, ey);
      if (e > 1) (px[i] = W / 2 + (ex / e) * (W / 2 - 10)), (py[i] = H / 2 + (ey / e) * (H / 2 - 6));
    }
  }
  const bonds: [number, number, number][] = []; // i, j, coupling sign
  const has = new Set<number>();
  for (let i = 0; i < SPINS; i++) {
    const near = Array.from({ length: SPINS }, (_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => Math.hypot(px[a] - px[i], py[a] - py[i]) - Math.hypot(px[b] - px[i], py[b] - py[i]));
    // a Poisson-ish number of bonds, mostly to the nearest few
    const want = rnd() < 0.3 ? DEGREE - 1 : rnd() < 0.7 ? DEGREE : DEGREE - 2 + Math.floor(rnd() * 3);
    for (let n = 0, made = 0; made < Math.max(1, want) && n < 6; n++) {
      const j = near[n];
      const key = Math.min(i, j) * SPINS + Math.max(i, j);
      if (has.has(key)) continue;
      has.add(key);
      bonds.push([i, j, rnd() < 0.5 ? 1 : -1]);
      made++;
    }
  }
  const adj: [number, number][][] = Array.from({ length: SPINS }, () => []);
  for (const [i, j, J] of bonds) adj[i].push([j, J]), adj[j].push([i, J]);

  // the cells of every bond, rasterised once
  const bondCells: Int32Array[] = bonds.map(([i, j]) => {
    const cells: number[] = [];
    const len = Math.hypot(px[j] - px[i], py[j] - py[i]);
    for (let s = 0; s <= len; s += 0.5) {
      const x = Math.floor(px[i] + ((px[j] - px[i]) * s) / len), r = Math.floor(py[i] + ((py[j] - py[i]) * s) / len);
      const k = r * W + x;
      if (cells[cells.length - 1] !== k) cells.push(k);
    }
    return Int32Array.from(cells);
  });

  // --- the dynamics, a pure function of time ---------------------------------
  const spin = new Int8Array(SPINS);
  const flipped = new Float32Array(SPINS); // when each spin last flipped, in sweeps
  let cycle = -1, done = 0;
  const reset = (c: number) => {
    cycle = c;
    done = 0;
    for (let i = 0; i < SPINS; i++) (spin[i] = hash(i, c * 7 + 1) < 0.5 ? 1 : -1), (flipped[i] = -99);
  };
  const sweep = (n: number) => {
    const T = temperature(n / RATE);
    for (let q = 0; q < SPINS; q++) {
      const i = Math.floor(hash(n * SPINS + q, cycle * 13 + 2) * SPINS);
      let h = 0;
      for (const [j, J] of adj[i]) h += J * spin[j];
      // Glauber: flip with probability 1 / (1 + exp(dE / T)), dE = 2 s h
      const dE = 2 * spin[i] * h;
      if (hash(n * SPINS + q, cycle * 13 + 3) < 1 / (1 + Math.exp(dE / T))) (spin[i] = -spin[i]), (flipped[i] = n);
    }
  };

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  return (t, { color } = {}) => {
    const c = Math.floor(t / CYCLE), into = t - c * CYCLE;
    const target = Math.floor(into * RATE);
    if (c !== cycle || target < done) reset(c);
    for (; done < target; done++) sweep(done);
    const now = into * RATE;

    // a faint ground, a little lighter in the middle
    for (let k = 0; k < N; k++) {
      const r = (k / W) | 0, x = k - r * W;
      const v = Math.exp(-(((x - W / 2) / 130) ** 2) - (((r - H / 2) / 60) ** 2));
      R[k] = 0.003 * v, G[k] = 0.004 * v, B[k] = 0.008 * v;
    }
    // the bonds: dim when satisfied, magenta and flickering when frustrated
    bonds.forEach(([i, j, J], b) => {
      const frustrated = J * spin[i] * spin[j] < 0;
      const cells = bondCells[b];
      const fl = 0.75 + 0.25 * Math.sin(t * 9 + b * 2.3);
      for (const k of cells) {
        if (frustrated) R[k] = Math.max(R[k], 0.62 * fl), G[k] = Math.max(G[k], 0.1 * fl), B[k] = Math.max(B[k], 0.45 * fl);
        else R[k] = Math.max(R[k], 0.1), G[k] = Math.max(G[k], 0.13), B[k] = Math.max(B[k], 0.24);
      }
    });
    // the spins, as discs, with a flash when one has just flipped
    for (let i = 0; i < SPINS; i++) {
      const up = spin[i] > 0;
      const flash = Math.exp(-(now - flipped[i]) * 0.35);
      const [cr, cg, cb] = up ? [1, 0.7, 0.25] : [0.25, 0.8, 0.82];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = Math.floor(px[i]) + dx, r = Math.floor(py[i]) + dy;
          if (x < 0 || x >= W || r < 0 || r >= H) continue;
          const d = Math.hypot(dx, dy);
          if (d > 2.2) continue;
          const k = r * W + x;
          const a = (d < 1.2 ? 0.95 : 0.45) + 0.4 * flash;
          R[k] = Math.max(R[k], cr * a + flash * 0.3), G[k] = Math.max(G[k], cg * a + flash * 0.3), B[k] = Math.max(B[k], cb * a + flash * 0.3);
        }
      }
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = R[k], cg = G[k], cb = B[k];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(Math.pow(peak, 0.8));
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
