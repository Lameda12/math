// Built from src/pieces/lemma-tree.ts by build.mjs. Edit that, not this.
/*
 * lemma tree: a proof drawn as a tree, its lemmas the leaves. One by one the
 * leaves check, and a branch lights only once everything above it has, the
 * light running down toward the trunk. When it reaches the root the whole
 * tree glows for a moment, then goes dark to be checked again.
 *
 * Halftone shading as in ascii.rest's aurora fjord: dot size is brightness,
 * ordered-dithered, in the palette colour nearest its hue.
 */
export const meta = {
  name: "lemma tree",
  category: "scenes",
  note: "a tree of lemmas checking leaf by leaf until the light reaches the root",
  cols: 240,
  rows: 110,
  cell: 1,
  fps: 15,
  ground: "#030806",
  palette: [
    "#050b09", "#0a1510", "#102018", "#172c22",
    "#1c1712", "#2c2219", "#3e3022", "#56432e", "#6f5a3e",
    "#1d1b38", "#2a2752", "#3b376e", "#524c8e", "#6c64ac",
    "#0b3a24", "#0f5532", "#147444", "#1c9658", "#2cba70", "#4fd88c", "#8cf0b0", "#c8ffd8",
    "#e8fff0", "#f4fff8",
    "#2a3a18", "#40561f", "#5e7a2a",
    "#16302a", "#1f4a40", "#2c6a5a",
  ],
}               ;

const W = 240, H = 110;
const DOTS = " ·•●";
const COVER = [0, 0.3, 0.6, 1];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
const SPEED = 14; // cells a second the light runs down a branch
const GLOW = 1.6, HOLD = 1.4, FADE = 1.6; // after the root: glow, hold, fade to dark

function hash(x        , y        )         {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
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

               
                                                 
                                            
                                
                                             
                                            
 

export default function lemmaTree()        {
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

  // --- grow the tree -----------------------------------------------------------
  const rnd = mulberry32(235);
  const segs        = [];
  const GROUND = H - 7;
  const grow = (x        , y        , ang        , len        , depth        , width        )         => {
    const x1 = x + Math.cos(ang) * len, y1 = y - Math.sin(ang) * len * 0.92;
    const id = segs.length;
    segs.push({ x0: x, y0: y, x1, y1, depth, width, len, kids: [], leaf: false, start: 0, end: 0 });
    if (depth >= 8 || len < 3) {
      segs[id].leaf = true;
      return id;
    }
    // two or three children, spread around the parent's heading, reaching up and out
    const n = depth < 2 ? 2 : rnd() < 0.3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = (n === 2 ? (i ? 1 : -1) * (0.3 + 0.2 * rnd()) : (i - 1) * (0.42 + 0.12 * rnd())) * (depth === 0 ? 1.3 : 1);
      // pull toward upright, so the crown rounds instead of sprawling
      const a = ang + spread + (Math.PI / 2 - ang) * 0.3;
      const kid = grow(x1, y1, a, len * (0.74 + 0.12 * rnd()), depth + 1, width * 0.68);
      segs[id].kids.push(kid);
    }
    return id;
  };
  grow(W / 2, GROUND, Math.PI / 2, 24, 0, 5.2);

  // when each lemma checks: leaves at scattered times, every branch after all its children
  const time = (id        )         => {
    const s = segs[id];
    s.start = s.leaf ? 0.4 + 7 * Math.pow(rnd(), 0.8) : Math.max(...s.kids.map(time));
    s.end = s.start + s.len / SPEED;
    return s.end;
  };
  const ROOT = time(0);
  const PERIOD = ROOT + GLOW + HOLD + FADE;

  // --- rasterise: which segment owns each cell, and how far along it the cell is
  const owner = new Int32Array(N).fill(-1);
  const along = new Float32Array(N); // 0 at the base of the segment, 1 at its tip
  const foliage = new Uint8Array(N);
  const leafOf = new Int32Array(N).fill(-1);
  for (let id = 0; id < segs.length; id++) {
    const s = segs[id];
    const w = Math.max(0.55, s.width);
    const xa = Math.max(0, Math.floor(Math.min(s.x0, s.x1) - w - 1)), xb = Math.min(W - 1, Math.ceil(Math.max(s.x0, s.x1) + w + 1));
    const ya = Math.max(0, Math.floor(Math.min(s.y0, s.y1) - w - 1)), yb = Math.min(H - 1, Math.ceil(Math.max(s.y0, s.y1) + w + 1));
    const dx = s.x1 - s.x0, dy = s.y1 - s.y0, l2 = dx * dx + dy * dy || 1;
    for (let r = ya; r <= yb; r++) {
      for (let x = xa; x <= xb; x++) {
        const px = x + 0.5 - s.x0, py = r + 0.5 - s.y0;
        const u = clamp((px * dx + py * dy) / l2);
        const ex = px - u * dx, ey = py - u * dy;
        // tapering from the base width to the child's at the tip
        if (ex * ex + ey * ey > (w * (1 - 0.3 * u)) ** 2) continue;
        const k = r * W + x;
        if (owner[k] >= 0 && segs[owner[k]].width > s.width) continue;
        owner[k] = id, along[k] = u;
      }
    }
    // a tuft of leaves round every tip
    if (s.leaf) {
      const rad = 2.2 + rnd() * 1.4;
      for (let r = Math.floor(s.y1 - rad); r <= s.y1 + rad; r++) {
        for (let x = Math.floor(s.x1 - rad * 1.2); x <= s.x1 + rad * 1.2; x++) {
          if (x < 0 || x >= W || r < 0 || r >= H) continue;
          const ex = (x + 0.5 - s.x1) / 1.2, ey = r + 0.5 - s.y1;
          const k = r * W + x;
          if (ex * ex + ey * ey > rad * rad * (0.6 + 0.5 * hash(x, r)) || owner[k] >= 0) continue;
          foliage[k] = 1 + Math.floor(hash(x * 3, r * 7) * 3);
          leafOf[k] = id;
        }
      }
    }
  }
  // the ground: dark grass with a low mound where the trunk goes in
  const groundAt = (x        ) => GROUND + 1.5 - 3 * Math.exp(-(((x - W / 2) / 22) ** 2)) + 0.8 * Math.sin(x * 0.3) * hash(x, 4);

  const R = new Float32Array(N), G = new Float32Array(N), B = new Float32Array(N);
  const lit = new Float32Array(N);

  return (t, { color } = {}) => {
    const tt = t % PERIOD;
    // after the root lights: a glow, a hold, and a fade back to dark
    const after = tt - ROOT;
    const pulse = after > 0 ? Math.exp(-((after - 0.4) ** 2) * 3) : 0;
    const fade = after > GLOW + HOLD ? 1 - smooth(0, FADE, after - GLOW - HOLD) : 1;
    lit.fill(0);
    for (let k = 0; k < N; k++) {
      const r = (k / W) | 0, x = k - r * W;
      let cr = 0.0, cg = 0.004 * (r / H), cb = 0.003 * (r / H);
      const id = owner[k];
      const leaf = leafOf[k];
      if (id >= 0) {
        const s = segs[id];
        // the light enters at the tip and runs down to the base
        const when = s.start + (1 - along[k]) * (s.end - s.start);
        const on = tt >= when ? fade : 0;
        const front = tt >= when ? Math.exp(-(tt - when) * 5) : 0;
        // bark, lit a little from the upper left
        const bark = 0.5 + 0.5 * hash(x, r * 3);
        const v = 0.26 + 0.1 * bark;
        cr = v * 0.62, cg = v * 0.48, cb = v * 0.34;
        const g = on * (0.55 + 0.2 * pulse) + front * 0.6 * fade;
        cr = cr * (1 - on) + g * 0.3, cg = cg * (1 - on) + g * 0.95, cb = cb * (1 - on) + g * 0.55;
        if (front > 0.3) cr += front * 0.35 * fade, cb += front * 0.25 * fade;
        lit[k] = g;
      } else if (leaf >= 0) {
        const s = segs[leaf];
        const on = tt >= s.start ? fade : 0;
        const pop = tt >= s.start ? Math.exp(-(tt - s.start) * 3) : 0;
        const tw = 0.85 + 0.15 * Math.sin(t * 2 + leaf * 1.7 + x);
        // unproven lemmas are a dim violet; checked ones turn green
        const f = foliage[k];
        const dv = (0.26 + 0.07 * f) * tw;
        const gv = (0.45 + 0.12 * f + 0.25 * pulse) * tw;
        cr = dv * 0.42 * (1 - on) + gv * 0.25 * on + pop * 0.5 * fade;
        cg = dv * 0.38 * (1 - on) + gv * 0.92 * on + pop * 0.6 * fade;
        cb = dv * 0.8 * (1 - on) + gv * 0.55 * on + pop * 0.55 * fade;
        lit[k] = on * gv * 0.6;
      } else if (r + 0.5 >= groundAt(x)) {
        const d = r + 0.5 - groundAt(x);
        const gr = (0.5 + 0.5 * hash(x, r)) * (1 - d / 10);
        cr = 0.05 * gr, cg = 0.12 * gr, cb = 0.08 * gr;
        if (d < 1.2) cg += 0.06 * hash(x, 2), cr += 0.02;
      }
      R[k] = cr, G[k] = cg, B[k] = cb;
    }
    // the light spills onto the air and ground round lit wood and leaves
    for (let r = 1; r < H - 1; r++) {
      for (let x = 1; x < W - 1; x++) {
        const k = r * W + x;
        if (owner[k] >= 0 || leafOf[k] >= 0) continue;
        const s = lit[k - 1] + lit[k + 1] + lit[k - W] + lit[k + W];
        if (s <= 0) continue;
        G[k] += s * 0.06, B[k] += s * 0.035, R[k] += s * 0.012;
      }
    }
    // the root's glow on the ground when the proof closes
    if (pulse > 0.01) {
      for (let r = GROUND - 8; r < H; r++) {
        for (let x = 0; x < W; x++) {
          const k = r * W + x;
          const dx = (x - W / 2) / 40, dy = (r - GROUND) / 8;
          const g = pulse * Math.exp(-(dx * dx + dy * dy)) * 0.35 * fade;
          R[k] += g * 0.3, G[k] += g, B[k] += g * 0.6;
        }
      }
    }

    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const cr = R[k], cg = G[k], cb = B[k];
        const peak = Math.max(cr, cg, cb, 1e-4);
        const level = clamp(Math.pow(peak, 0.8) * 1.05);
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
