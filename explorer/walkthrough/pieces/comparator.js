// Built from src/pieces/comparator.ts by build.mjs. Edit that, not this.
/*
 * comparator: a terminal in lean/, reading out one of the repository's
 * Comparator challenges, the statement that the Riemann zeta function has no
 * zeros to the right of 7/8, then the file that tells Comparator which proof
 * to hold it to, then the command that runs the check. It stops at the
 * prompt: what the check prints is for the reader to run, not for a picture.
 *
 * The Lean is the challenge file, in Lean's ASCII spellings: Complex for ℂ,
 * Real for ℝ, and Ne for ≠, which is what the notation stands for.
 */
export const meta = {
  name: "comparator",
  category: "ui",
  note: "a terminal reading out the comparator challenge for the 7/8 bound",
  cols: 80,
  rows: 28,
  fps: 20,
}               ;

const W = 80, H = 28;
const PROMPT = "lean $ ";
// [command, output lines]
const SCRIPT                       = [
  [
    "cat ComparatorChallenges/QuasiRiemannHypothesis.lean",
    [
      "import Mathlib",
      "",
      "namespace OAI",
      "",
      "theorem riemannZeta_ne_zero_of_seven_eighths_lt_re",
      "    {s : Complex} (hs : (7 / 8 : Real) < s.re) : Ne (riemannZeta s) 0 := by",
      "  sorry",
      "",
      "end OAI",
    ],
  ],
  [
    "cat ComparatorChallenges/QuasiRiemannHypothesis.json",
    [
      "{",
      "  \"challenge_module\": \"ComparatorChallenges.QuasiRiemannHypothesis\",",
      "  \"solution_module\": \"OAI.NumberTheory.DirichletL.Nonvanishing\",",
      "  \"theorem_names\": [",
      "    \"OAI.riemannZeta_ne_zero_of_seven_eighths_lt_re\"",
      "  ],",
      "  \"definition_names\": [],",
      "  \"permitted_axioms\": [",
      "    \"propext\",",
      "    \"Quot.sound\",",
      "    \"Classical.choice\"",
      "  ],",
      "  \"enable_nanoda\": false",
      "}",
    ],
  ],
  ["lake env comparator ComparatorChallenges/QuasiRiemannHypothesis.json", []],
];
const TYPE = 28; // characters a second
const LINES = 22; // output lines a second
const PAUSE = 0.7; // seconds after a command is typed, and after its output
const HOLD = 4; // seconds on the finished screen before it clears

export default function comparator()        {
  // the whole session as timed events: each line is shown from its time on
  const lines                                                 = [];
  let clock = 0.6;
  for (const [cmd, outLines] of SCRIPT) {
    lines.push({ text: PROMPT + cmd, at: clock, typed: true });
    clock += cmd.length / TYPE + PAUSE;
    for (const l of outLines) (lines.push({ text: l, at: clock, typed: false }), (clock += 1 / LINES));
    if (outLines.length) clock += PAUSE;
  }
  const done = clock;
  const PERIOD = done + HOLD;

  return (t) => {
    // the first frame is the finished screen; after the hold it clears and types again
    const tt = (t + done) % PERIOD;
    const shown           = [];
    let cursor                          = null;
    for (const l of lines) {
      if (tt < l.at) {
        // the next command waits at a bare prompt
        if (l.typed && !cursor) (shown.push(PROMPT), (cursor = [shown.length - 1, PROMPT.length]));
        break;
      }
      if (l.typed) {
        const n = Math.min(l.text.length, PROMPT.length + Math.floor((tt - l.at) * TYPE));
        shown.push(l.text.slice(0, n));
        cursor = n < l.text.length ? [shown.length - 1, n] : null;
      } else shown.push(l.text);
    }
    // once the last command is typed, the cursor sits after it
    if (!cursor && shown.length) cursor = [shown.length - 1, shown[shown.length - 1].length];
    const view = shown.slice(Math.max(0, shown.length - H));
    const off = shown.length - view.length;
    const blink = Math.floor(t * 2) % 2 === 0;
    const rows           = [];
    for (let r = 0; r < H; r++) {
      let line = (view[r] ?? "").slice(0, W).padEnd(W);
      if (cursor && cursor[0] - off === r && cursor[1] < W && blink) line = line.slice(0, cursor[1]) + "█" + line.slice(cursor[1] + 1);
      rows.push(line);
    }
    return rows.join("\n");
  };
}
