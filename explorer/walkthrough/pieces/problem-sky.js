// Built from src/pieces/problem-sky.ts by build.mjs. Edit that, not this.
/*
 * problem sky: four thousand stars over a ridge, one for each problem the
 * model was posed, and 372 of them burn gold, one for each result family that
 * made it into the collection. An observatory on the ridge keeps its slit
 * open; now and then a meteor crosses.
 *
 * Shaded in colour per cell on a square grid, then drawn as a halftone in the
 * manner of ascii.rest's aurora fjord: dot size is brightness, ordered-dithered,
 * in the palette colour nearest its hue.
 */
export const meta = {
  name: "problem sky",
  category: "scenes",
  note: "four thousand stars over an observatory ridge, 372 of them gold",
  cols: 240,
  rows: 100,
  cell: 1,
  fps: 15,
  ground: "#04060d",
  palette: [
    "#070b18", "#0b1124", "#111933", "#182344", "#213058", "#2c3f70",
    "#1d2a5e", "#2b2f73", "#3f3a8a", "#5a4aa3", "#7a63bd",
    "#0f3340", "#16505a", "#21737a", "#3a9a9a", "#6cc4bc",
    "#8fa3c9", "#b4c4e2", "#d9e2f5", "#f4f7ff",
    "#7a5a1e", "#a87a24", "#d6a032", "#f2c14e", "#ffd97a", "#fff0bf",
    "#ff9a3c", "#ffbf6b", "#ffe2a8",
    "#06080e", "#0c1018", "#141a26", "#1d2533", "#283244", "#3a465c",
    "#5c3a2a", "#8a5634",
  ],
}               ;

const W = 240, H = 100;
const STARS = 4000, GOLD = 372;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

function hash(x        , y        )         {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x        , y        )         {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x        , y        , octaves        )         {
  let s = 0, n = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    s += amp * noise(x * f, y * f);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}

function mulberry32(seed        )               {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v        ) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a        , b        , v        ) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const hex = (s        ) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

export default function problemSky()        {
  const P = meta.palette.map(hex);
  const N = W * H;
  const out           = new Array(N);
  const lut = new Uint8Array(32768).fill(255);
  const nearest = (r        , g        , b        )         => {
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

  // --- the land: far hills, the near ridge, the observatory ------------------
  const far = new Float32Array(W), near = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    far[x] = 82 - 9 * fbm(x * 0.016, 3.3, 4) - 3 * Math.sin(x * 0.019 + 1);
    // the ridge climbs to the right, where the observatory stands
    near[x] = 97 - 21 * smooth(110, 192, x) * smooth(262, 222, x) - 5 * fbm(x * 0.04, 8.1, 3) - 4 * smooth(70, 0, x) * fbm(x * 0.08, 2, 2);
  }
  const OX = 194, DOME = 13, BODY = 10; // dome radius, drum height
  const BASE = Math.min(near[OX - DOME], near[OX + DOME]) + 1.5;
  const top = BASE - BODY;
  const AIR = 0, FAR = 1, NEAR = 2, WALL = 3, DOMEM = 4, SLIT = 5, DOOR = 6, SCOPE = 7;
  const mat = new Uint8Array(N);
  const br = new Float32Array(N), bg = new Float32Array(N), bb = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    const y = r + 0.5;
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const cx = x + 0.5 - OX;
      if (y >= near[x]) {
        mat[k] = NEAR;
        // a black silhouette; only the grass along the ridge line catches the sky
        const lip = smooth(1.2, 0, y - near[x]) * (0.6 + 0.4 * hash(x, 9));
        br[k] = 0.06 * lip, bg[k] = 0.13 * lip, bb[k] = 0.17 * lip;
      } else if (y >= far[x]) {
        mat[k] = FAR;
        const d = y - far[x];
        const f = Math.max(0, 1 - d / 10) * (0.7 + 0.3 * fbm(x * 0.2, y * 0.3, 2));
        br[k] = 0.07 * f, bg[k] = 0.1 * f, bb[k] = 0.19 * f;
      }
      // the observatory: a drum and a dome on square cells, so circles are circles
      if (Math.abs(cx) <= DOME - 1 && y >= top && y < BASE + 0.5) {
        mat[k] = WALL;
        // the drum is lit from the band, up and to the left
        const lit = 0.3 + 0.7 * (1 - (cx + DOME) / (2 * DOME));
        br[k] = 0.05 * lit, bg[k] = 0.06 * lit, bb[k] = 0.09 * lit;
        if ((r % 3) === 0) br[k] *= 0.6, bg[k] *= 0.6, bb[k] *= 0.6;
        if (cx > -4 && cx < 0 && y > BASE - 6) mat[k] = DOOR;
      }
      const dy = top - y;
      if (dy >= 0 && cx * cx + dy * dy <= DOME * DOME) {
        mat[k] = DOMEM;
        // the dome is lit by the sky from above and a little from the left
        const nz = Math.sqrt(Math.max(0, DOME * DOME - cx * cx - dy * dy)) / DOME;
        // a dark dome against the glow, its upper-left rim catching the band
        const d = Math.sqrt(cx * cx + dy * dy);
        const rim = smooth(DOME - 2.2, DOME - 0.3, d) * clamp(0.3 + 0.7 * (dy - cx) / (1.2 * DOME));
        const l = 0.04 + 0.08 * nz * clamp(-cx / DOME + 0.5);
        br[k] = l + 0.5 * rim, bg[k] = l + 0.62 * rim, bb[k] = l * 1.4 + 0.8 * rim;
        // the slit, open from the crown toward the upper left
        const ux = -0.5, uy = 0.866;
        const along = cx * ux + dy * uy, across = cx * uy - dy * ux;
        if (along > 1 && Math.abs(across) < 1.6) mat[k] = SLIT;
      }
    }
  }
  // the telescope tube, sticking out of the slit at the sky
  for (let s = 0; s < 12; s += 0.25) {
    const x = Math.floor(OX - 0.5 * (DOME - 3 + s)), r = Math.floor(top - 0.866 * (DOME - 3 + s));
    for (let w = -1; w <= 0; w++) {
      const k = r * W + x + w;
      if (r >= 0 && mat[k] !== AIR) continue;
      mat[k] = SCOPE;
      br[k] = 0.32, bg[k] = 0.34, bb[k] = 0.4;
    }
  }

  // --- the sky: a gradient, the Milky Way, its dust -------------------------
  const sr = new Float32Array(N), sg = new Float32Array(N), sb = new Float32Array(N);
  const band = (x        , y        ) => {
    // the band runs from the lower left up to the upper right
    const u = (x - 20) * 0.38 + (y - 95) * 0.92;
    const v = (x - 20) * 0.92 - (y - 95) * 0.38;
    const wid = 15 + 6 * fbm(v * 0.02, 1.7, 2);
    return { core: Math.exp(-((u - 4 * Math.sin(v * 0.02)) ** 2) / (2 * wid * wid)), v };
  };
  const bandAt = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      if (mat[k] !== AIR) continue;
      const y = r + 0.5, v = y / H;
      let cr = 0.004 + 0.03 * v * v, cg = 0.006 + 0.05 * v * v, cb = 0.02 + 0.1 * v * v;
      const { core, v: along } = band(x, y);
      // dust lanes along the band, and a grain of unresolved stars in it
      const dust = smooth(0.5, 0.66, fbm(x * 0.045 + along * 0.01, y * 0.08, 4)) * smooth(0.2, 0.7, core);
      const grain = 0.55 + 0.45 * fbm(x * 0.35, y * 0.35, 2);
      const glow = core * (0.45 + 0.55 * fbm(x * 0.03 + 7, y * 0.05, 4)) * (1 - 0.85 * dust) * grain;
      bandAt[k] = core;
      const warm = smooth(-40, 160, along);
      cr += glow * (0.26 + 0.3 * warm), cg += glow * (0.26 + 0.14 * warm), cb += glow * (0.55 - 0.1 * warm);
      // airglow on the horizon, green low and violet above it
      const h = far[x] - y;
      const ag = Math.exp(-h / 7), av = Math.exp(-h / 22);
      cr += ag * 0.02 + av * 0.04, cg += ag * 0.13 + av * 0.02, cb += ag * 0.11 + av * 0.08;
      sr[k] = cr, sg[k] = cg, sb[k] = cb;
    }
  }

  // --- the stars: four thousand, thicker in the band, 372 of them gold -------
  const rnd = mulberry32(4000);
  const sx = new Uint16Array(STARS), sy = new Uint16Array(STARS);
  const mag = new Float32Array(STARS), phase = new Float32Array(STARS), rate = new Float32Array(STARS);
  const taken = new Uint8Array(N);
  for (let i = 0; i < STARS; ) {
    const x = Math.floor(rnd() * W), r = Math.floor(rnd() * H);
    const k = r * W + x;
    if (mat[k] !== AIR || taken[k] || r > far[x] - 2) continue;
    // more of them where the band is bright
    if (rnd() > 0.3 + 0.7 * bandAt[k]) continue;
    taken[k] = 1;
    sx[i] = x, sy[i] = r;
    mag[i] = 0.22 + 0.7 * Math.pow(rnd(), 3.5);
    phase[i] = rnd() * 6.283;
    rate[i] = 0.8 + rnd() * 3;
    i++;
  }
  // a fixed shuffle picks the gold ones, spread over the whole sky
  const order = Array.from({ length: STARS }, (_, i) => i);
  for (let i = STARS - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const gold = new Uint8Array(STARS);
  for (let i = 0; i < GOLD; i++) gold[order[i]] = 1;

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);

  return (t, { color } = {}) => {
    R.set(sr), G.set(sg), B.set(sb);
    for (let i = 0; i < STARS; i++) {
      const k = sy[i] * W + sx[i];
      const tw = 0.75 + 0.25 * Math.sin(t * rate[i] + phase[i]);
      if (gold[i]) {
        const b = (0.68 + 0.32 * mag[i] / 0.92) * (0.88 + 0.12 * Math.sin(t * 0.9 + phase[i]));
        R[k] = Math.max(R[k], b), G[k] = Math.max(G[k], b * 0.74), B[k] = Math.max(B[k], b * 0.32);
        // a soft halo on the four sides
        for (const d of [-1, 1, -W, W]) {
          const q = k + d;
          if (q < 0 || q >= N || mat[q] !== AIR) continue;
          R[q] += 0.1 * b, G[q] += 0.07 * b, B[q] += 0.02 * b;
        }
      } else {
        const b = mag[i] * tw;
        const blue = 0.85 + 0.15 * Math.sin(phase[i] * 3);
        R[k] = Math.max(R[k], b * 0.82 * blue), G[k] = Math.max(G[k], b * 0.88), B[k] = Math.max(B[k], b);
      }
    }

    // a meteor every nine seconds, from the upper right down toward the left
    const P9 = 9, mt = (t + 6) % P9;
    if (mt < 1.1) {
      const n = Math.floor((t + 6) / P9);
      const x0 = 70 + hash(n, 1) * 110, y0 = 4 + hash(n, 2) * 18;
      const len = 26 + hash(n, 3) * 14;
      const head = mt / 1.1;
      for (let s = 0; s < 1; s += 0.01) {
        const p = head - s * 0.45;
        if (p < 0) break;
        const x = Math.floor(x0 - p * len * 2.2), r = Math.floor(y0 + p * len);
        if (x < 0 || r < 0 || r >= H) continue;
        const k = r * W + x;
        if (mat[k] !== AIR) continue;
        const b = (1 - s / 0.45) * Math.sin(Math.PI * Math.min(1, head * 1.2));
        R[k] = Math.max(R[k], b * 0.95), G[k] = Math.max(G[k], b * 0.97), B[k] = Math.max(B[k], b);
      }
    }

    const flick = 0.9 + 0.06 * Math.sin(t * 2.1) + 0.04 * Math.sin(t * 5.7);
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const m = mat[k];
        let cr = R[k], cg = G[k], cb = B[k], floor = 0;
        if (m !== AIR) {
          cr = br[k], cg = bg[k], cb = bb[k];
          floor = 0;
          if (m === SLIT) {
            // warm light inside the slit, brighter toward the crown
            cr = 0.75 * flick, cg = 0.48 * flick, cb = 0.2 * flick;
          } else if (m === DOOR) {
            cr = 0.95 * flick, cg = 0.7 * flick, cb = 0.36 * flick;
          }
        }
        // the light of the open door laid on the ground in front of it
        if (m === NEAR || m === FAR) {
          const dx = x + 0.5 - (OX - 1), dy = r + 0.5 - BASE;
          const g = Math.exp(-Math.sqrt(dx * dx * 0.25 + dy * dy * 1.6) / 4) * 0.5 * flick;
          cr += g, cg += g * 0.62, cb += g * 0.28;
        }
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(floor + (1 - floor) * Math.pow(peak, 0.8) * 0.98);
        const step = Math.max(0, Math.min(3, Math.round(level * 3 + BAYER[(r & 3) * 4 + (x & 3)])));
        out[k] = DOTS[step];
        if (color) {
          const want = step ? Math.min(1, (level + 0.06) / COVER[step]) : 0;
          const s = (0.3 + 0.7 * want) / peak;
          color[k] = nearest(clamp(cr * s), clamp(cg * s), clamp(cb * s));
        }
      }
    }
    const lines           = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
