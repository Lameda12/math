// Built from src/pieces/the-stacks.ts by build.mjs. Edit that, not this.
/*
 * the stacks: every manuscript in preprints/ as a book on one bookcase. A
 * spine is as thick as the paper is long (its page count, from pdfinfo) and
 * bound in the colour of its field, shelved by field like a library would.
 * A reading lamp drifts along the shelves and dust turns in its light.
 *
 * SHELF and FIELDS are written by build.mjs from explorer/data.json: three
 * base-36 digits a paper, two of pages and one of field.
 */
const SHELF = "10a2ma2aa4ka5ja1da09a1qa2ja18a3ma15a2fa15a10a0ba0qa0ta0ca20a1wa22a19a2ca28a1xa17a1sa0ja13a1aa14a0sa0ga1ya1ha18a0fa1aa1ta0na29a26a07a0oa1ja2ba2fa1ga13a0xa0ja0ra0ta2ka0la0ua0na1t11x11h11r12m11b12910p11j12311f11411214411613u12d10l11211410b10w11810n10f11g12k10g11a11g11112710e11l10k10p10o10j10k10h11912q10w11k11311511510q10t11110e10610i10v10x10g11p11q10m11d11a10m11812c10z11e10j10e11t10n10v10w11311410j11111511c12l12y10r10r10i10k11712411911513b10pe1se0ve0fe1se2pe4ve24e0ge0se0qe2ve0pe36e4le2be2oe1ke11e0be0re2fe0de0ge19e2le0q32030j30u30731930u30v31y31d31d30k30n30u31t30j30t30e30a30q30t30d30f30x30n30k30c30n30s31631mf12f0pf12f0tf30f0kf0ef0rf15f1hf0lf0df2bf0zf0zf21f1zf0gf0rf0kf19f19f16f0qf0vf1bf0ef0df0pf1cf0mf0qf0tf1ef2ef1af0tf0ff16f0mf1hf1af0of0df0jf0if0kf0vf1df0mf0bf0gf0pf0rf13f18f0yf12f0mf43f0hf0xf10f1jf16f1of2lf0tf1gf0pf0zf1cf4g51450u51451950r54250m50d50g50d50c50f51651050p51051751p50q20i22w23n21621q25i20p21f21421321y20d20g22v20r21h20v21f21521h24s20q20f21g21220b20c20a20c20e22d20f20b20w21b21621c20v20t20l20k20820a22c20p21520c20o20n20v01500h00q00v00s00900p00o00u01300m01701901n02m00m01a01100h05002f00x00x00q00p00a01000700gd2id1nd3fd61d6gd0pd13d2nd0kd16d1hd3ed0qd31d2ud0kd2cd1pd17d1id1ed4pd3id28d11d1ld1rd1hd24d17d1od18d0zd0yd1md10d19d3pd14d0ud32d5rd1dd1ed1nd3jd1pd17d23d2ld0xd34d1yd1ud4ed13d1rd0md5ad0vd0xd0md0bd1od11d1dd0jd21d1qd2dd2sd1nd0ld0ad11d1cd1ed2sd18d2md1ud3kd2od1pd29d1xd2qd0td31d2kd0ed20d1ud29d0wd2ed12d0fd3kd31d0nd0jd1vd0yd0v83d80a80r80y81981882080v70p71c70d70p70z70u70i70j70j70l71m71q70t71j72170g70d71771h74170r72j92t97a92g90h94992g91492s91z94g94e90q92l92690s90o90l92c90x90h91n91w94792i91k92490z91k92791d91691h90u90s91x90m91c90991291191b91i91h90w90l90r91b90m90k90m91990o91b91y90r93490l90j92db24b0nb4lb0pb0nb0vb1yb0ab09b0jb0gb0gb1tb15b1mb0eb1bb0gb0gb0sb0ib0nb0fb0lb1cb1ib1qb0pb0ob1gb1ag1cg1hg0wg40g0og0gg1ig18g2ig1rg0yg0qg2vg0ug19g11g0zg32g34g1dg20g0tg27g1og0ag0c61360n60p60c60m60l60e60j60f60l60c62261360d61h60b60n60961540j42c41140r40l42r41641a42541u40s42040i41741541e40z42540j40g40j40l40c41c40d41n40w40q41o40y40k41m41441i40740n40u42s41h40b41740m41041m40o41540z41341dc26c1tc1xc1ic1ec17c0xc0kc1ec1qc3mc0lc0kc1kc0oc0ec0ic2pc0ec0dc0ec0tc1hc0jc0ic0mc24c1ac";
const FIELDS           = ["Algebra","Algebraic and complex geometry","Combinatorics","Convex and metric geometry","Differential geometry","Dynamical systems and ergodic theory","Functional analysis","Group theory","Mathematical logic","Mathematical physics","Number theory","Operator algebras","Partial differential equations","Probability and statistical mechanics","Real and complex analysis","Theoretical computer science","Topology"];

// Seventeen bindings, each in three shades: shadow, cloth, and where the lamp falls.
const BINDINGS = [
  ["#3a1414", "#6e2620", "#a8463a"], ["#14301f", "#255a38", "#3f8c58"], ["#141f3a", "#22386a", "#3e5ea6"],
  ["#2c2a26", "#5e5a50", "#9c9682"], ["#0e2e30", "#1c5a5c", "#2f9090"], ["#2a1430", "#52285c", "#84489a"],
  ["#3a1c0c", "#7c3a16", "#c0642c"], ["#262a10", "#4e561e", "#7e8a34"], ["#1a2434", "#34486a", "#5878a6"],
  ["#3a3008", "#766214", "#c6a42a"], ["#2e0e1a", "#5e1c34", "#984060"], ["#1e2a20", "#3e5644", "#6a8c72"],
  ["#1a1636", "#30286a", "#5446a8"], ["#341a10", "#6c3420", "#a85c3a"], ["#0e2228", "#1c4652", "#2e7486"],
  ["#2c1c28", "#5a3a52", "#8e6484"], ["#241a10", "#4a3420", "#7a5a3a"],
];
const WOOD = ["#120a06", "#24140a", "#3a2412", "#56361c", "#7a4e2a"];
const LIGHT = ["#ffd896", "#ffeccc"];

export const meta = {
  name: "the stacks",
  category: "scenes",
  note: "722 manuscripts on one bookcase, spines as thick as the papers",
  cols: 300,
  rows: 112,
  cell: 1,
  fps: 12,
  ground: "#07050a",
  palette: [...BINDINGS.flat(), ...WOOD, ...LIGHT, "#07050a"],
}               ;

/** The fields in palette order, for a legend: field i is bound in palette[3 * i + 1]. */
export const fields           = FIELDS;

const W = 300, H = 112;
const SHELVES = 8, BAY = 13, SIDE = 3, TOP = 3; // shelf count, rows a shelf, frame widths
const WOOD0 = BINDINGS.length * 3, LIGHT0 = WOOD0 + WOOD.length, DARK = LIGHT0 + LIGHT.length;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);

function hash(x        , y        )         {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const clamp = (v        ) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function theStacks()        {
  const N = W * H;
  // each paper: pages and field, shelved by field and then catalogue order
  const books                                                    = [];
  for (let i = 0; i + 2 < SHELF.length; i += 3)
    books.push({ pages: parseInt(SHELF.slice(i, i + 2), 36), field: parseInt(SHELF[i + 2], 36), order: i });
  books.sort((a, b) => a.field - b.field || a.order - b.order);

  // the widest pages-a-cell that still gets every book onto the shelves
  const inner = W - 2 * SIDE;
  const width = (pages        , per        ) => Math.max(1, Math.round(pages / per));
  const fits = (per        ) => {
    let shelf = 0, x = 0;
    for (const b of books) {
      const w = width(b.pages, per);
      if (x + w > inner) (shelf++, (x = 0));
      x += w;
    }
    return shelf < SHELVES;
  };
  let lo = 4, hi = 80;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  const per = hi;

  // what each cell is: -1 air, -2 wood, or a book's field; and how it is shaded
  const what = new Int16Array(N).fill(-1);
  const base = new Float32Array(N); // the cloth's tone, 0 shadow .. 1 lit, before the lamp
  const edge = new Uint8Array(N); // a spine's own edges, a shade darker so neighbours part
  const woodShade = new Float32Array(N);
  for (let r = 0; r < H; r++) {
    for (let x = 0; x < W; x++) {
      const k = r * W + x;
      const inBay = r >= TOP && (r - TOP) % BAY !== BAY - 1 && x >= SIDE && x < W - SIDE && r < TOP + SHELVES * BAY - 1;
      if (!inBay) {
        what[k] = -2;
        // the grain runs along boards: across on shelves, down the uprights
        const across = x >= SIDE && x < W - SIDE;
        const g = across ? hash(Math.floor(x / 9), r) : hash(x, Math.floor(r / 7));
        woodShade[k] = 0.45 + 0.3 * g + (across ? 0.15 : 0);
      }
    }
  }
  let shelf = 0, x = 0;
  for (const b of books) {
    const w = width(b.pages, per);
    if (x + w > inner) (shelf++, (x = 0));
    const floor = TOP + shelf * BAY + BAY - 2; // the row just above the board
    const h = 8 + Math.floor(hash(b.order, 7) * 4); // 8 to 11 rows tall
    // each book its own tone; thin ones alternate so a run of pamphlets still parts
    const tone = w <= 2 ? (x & 1 ? 0.28 : 0.55) + 0.1 * hash(b.order, 3) : 0.3 + 0.35 * hash(b.order, 3);
    for (let c = 0; c < w; c++) {
      for (let r = floor - h + 1; r <= floor; r++) {
        const k = r * W + SIDE + x + c;
        what[k] = b.field;
        // gilt bands near the head and foot of the thicker spines
        const band = w > 3 && (r === floor - h + 3 || r === floor - 2) ? 0.3 : 0;
        base[k] = clamp(tone + band);
        edge[k] = w > 2 && (c === 0 || c === w - 1) ? 1 : 0;
      }
    }
    x += w;
  }

  // dust motes: fixed orbits, drawn where the lamp shines and nothing stands
  const MOTES = 70;
  const mx = new Float32Array(MOTES), my = new Float32Array(MOTES), mp = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) (mx[i] = hash(i, 1)), (my[i] = hash(i, 2)), (mp[i] = hash(i, 3) * 6.283);

  const out           = new Array(N);
  return (t, { color } = {}) => {
    // the lamp wanders the length of the bookcase and back, slowly
    const lx = W / 2 + (W / 2 - 30) * Math.sin(t * 0.11), ly = H * 0.45 + H * 0.22 * Math.sin(t * 0.07 + 1);
    const lamp = (x        , r        ) => {
      const dx = (x - lx) / 70, dy = (r - ly) / 42;
      return Math.exp(-(dx * dx + dy * dy));
    };
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const k = r * W + x;
        const f = what[k];
        const L = lamp(x, r);
        const d = BAYER[(r & 3) * 4 + (x & 3)];
        if (f >= 0) {
          // three shades, flat across a book, lifted where the lamp falls
          const v = base[k] * (0.55 + 0.6 * L) + 0.38 * L;
          const s = Math.max(0, (v < 0.36 ? 0 : v < 0.7 ? 1 : 2) - edge[k]);
          out[k] = "█";
          if (color) color[k] = f * 3 + s;
        } else if (f === -2) {
          const v = clamp(woodShade[k] * (0.3 + 0.8 * L));
          const s = Math.max(0, Math.min(4, Math.round(v * 4 + d)));
          out[k] = "█";
          if (color) color[k] = WOOD0 + s;
        } else {
          // the dark at the back of a shelf, warmed a little near the lamp
          const v = 0.35 * L;
          const s = Math.round(v * 3 + d);
          out[k] = s >= 1 ? "·" : " ";
          if (color) color[k] = s >= 1 ? WOOD0 + 2 : DARK;
        }
      }
    }
    for (let i = 0; i < MOTES; i++) {
      const x = Math.floor(lx + (mx[i] - 0.5) * 120 + 9 * Math.sin(t * 0.3 + mp[i]));
      const r = Math.floor(ly + (my[i] - 0.5) * 70 + 5 * Math.sin(t * 0.23 + mp[i] * 2) - ((t * 1.5 + my[i] * 70) % 70) + 35);
      if (x < 0 || x >= W || r < 0 || r >= H) continue;
      const k = r * W + x;
      if (what[k] !== -1 || lamp(x, r) < 0.3) continue;
      out[k] = "•";
      if (color) color[k] = LIGHT0 + (hash(i, 9) > 0.5 ? 1 : 0);
    }
    const lines           = [];
    for (let r = 0; r < H; r++) lines.push(out.slice(r * W, (r + 1) * W).join(""));
    return lines.join("\n");
  };
}
