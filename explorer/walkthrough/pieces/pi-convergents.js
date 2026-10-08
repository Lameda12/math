// Built from src/pieces/pi-convergents.ts by build.mjs. Edit that, not this.
/*
 * pi convergents: a number line zooming in on pi, ten times closer every two
 * seconds. The continued-fraction convergents 22/7, 333/106, 355/113, ...
 * split off from pi as the zoom reaches their distance, and each drops into
 * the plot below at its exponent mu, where |pi - p/q| = q^-mu. Mu leaps when
 * a big partial quotient follows (355/113, before the 292) and otherwise
 * hugs 2. Result 017 is that it can't stay above anything bigger than 2.
 *
 * The errors were computed to 120 digits once; the piece only reads them.
 */
export const meta = {
  name: "pi convergents",
  category: "data",
  note: "zooming in on pi as its convergents split off and plot their exponents",
  cols: 80,
  rows: 26,
  fps: 15,
}               ;

// p/q, p/q - pi, and mu = -log|p/q - pi| / log q
const CONV                             = [
  ["22/7", 1.264489e-3, 3.4293],
  ["333/106", -8.321963e-5, 2.0144],
  ["355/113", 2.667642e-7, 3.202],
  ["103993/33102", -5.778906e-10, 2.0439],
  ["104348/33215", 3.316278e-10, 2.0966],
  ["208341/66317", -1.223565e-10, 2.0558],
  ["312689/99532", 2.914338e-11, 2.108],
  ["833719/265381", -8.715467e-12, 2.0391],
  ["1146408/364913", 1.61074e-12, 2.1202],
  ["4272943/1360120", -4.040669e-13, 2.0206],
  ["5419351/1725033", 2.214478e-14, 2.1894],
  ["80143857/25510582", -5.79087e-16, 2.0572],
  ["165707065/52746197", 1.640835e-16, 2.0441],
  ["245850922/78256779", -7.817937e-17, 2.0405],
];

const W = 80, H = 26;
const MID = 40, HALF = 37; // the line's centre column and half-width in columns
const ZOOM = 24, HOLD = 4, PERIOD = ZOOM + HOLD; // seconds zooming, holding the finished plot
const W0 = 4e-3, DECADES = 13.6; // the view's half-width at the start, and how far it zooms
const PLOT_TOP = 11, PLOT_BASE = 23, MU_TOP = 3.5; // rows of the plot, mu at its top row

export default function piConvergents()        {
  const grid             = Array.from({ length: H }, () => new Array(W).fill(" "));
  const put = (r        , c        , s        ) => {
    for (let i = 0; i < s.length; i++) if (c + i >= 0 && c + i < W && r >= 0 && r < H) grid[r][c + i] = s[i];
  };
  // a square-root scale, so the crowd just above 2 spreads out; the axis is labelled to match
  const muRow = (mu        ) => Math.round(PLOT_BASE - Math.sqrt((mu - 2) / (MU_TOP - 2)) * (PLOT_BASE - PLOT_TOP));
  const exp = (v        ) => {
    const e = Math.floor(Math.log10(Math.abs(v)));
    return `${(Math.abs(v) / 10 ** e).toFixed(2)}e${e}`;
  };

  return (t) => {
    // the first frame is the finished picture; then it starts over and builds
    const tt = (t + ZOOM) % PERIOD;
    const z = Math.min(DECADES, (tt / ZOOM) * DECADES);
    const w = W0 * 10 ** -z;
    for (const row of grid) row.fill(" ");

    put(0, 1, "pi = 3.14159265358979323846...");
    const zoom = `view pi +/- ${exp(w)}`;
    put(0, W - 1 - zoom.length, zoom);

    // the line, its scale, and pi at the centre
    for (let c = MID - HALF; c <= MID + HALF; c++) put(4, c, "─");
    for (let i = -4; i <= 4; i++) put(4, MID + Math.round((i * HALF) / 4), i ? "┴" : "╂");
    put(2, MID - 1, "pi");
    put(3, MID, "┃");
    put(5, MID, "┃");

    // the convergents that have split off and are still in the view
    let newest = -1;
    let above = true;
    CONV.forEach(([name, err], i) => {
      const off = (err / w) * HALF;
      if (Math.abs(off) < 1) return; // still on top of pi at this zoom
      newest = i;
      if (Math.abs(off) > HALF) return; // passed out of the view
      const c = MID + Math.round(off);
      put(4, c, "┼");
      // labels alternate above and below, kept on the line's side of pi
      const lc = Math.max(0, Math.min(W - name.length, off < 0 ? c - name.length + 1 : c));
      if (above) (put(3, c, "│"), put(2, lc, name));
      else (put(5, c, "│"), put(6, lc, name));
      above = !above;
    });

    if (newest >= 0) {
      const [name, err, mu] = CONV[newest];
      put(8, 1, `${name}   |pi - p/q| = ${exp(err)} = q^-${mu.toFixed(2)}`);
    }

    // the plot: one stem a convergent, mu against the dashed line at 2
    put(10, 1, "mu for each convergent, where |pi - p/q| = q^-mu");
    for (let r = PLOT_TOP; r <= PLOT_BASE; r++) put(r, 6, "│");
    for (const m of [2, 2.1, 2.5, 3, 3.5]) put(muRow(m), 1, m.toFixed(1).padStart(4) + " ┤");
    for (let c = 7; c < W - 1; c++) put(PLOT_BASE, c, c % 2 ? "┄" : " ");
    CONV.forEach(([, , mu], i) => {
      if (i > newest) return;
      const c = 10 + i * 5;
      const top = muRow(Math.min(mu, MU_TOP));
      for (let r = top + 1; r < PLOT_BASE; r++) put(r, c, "│");
      put(PLOT_BASE, c, "┴");
      // the newest one blinks as it lands
      put(top, c, i === newest && tt < ZOOM && Math.floor(t * 4) % 2 ? "O" : "o");
    });
    put(H - 1, 1, "limsup of mu over all fractions p/q is exactly 2  (result 017)");
    return grid.map((r) => r.join("")).join("\n");
  };
}
