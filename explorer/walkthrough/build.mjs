#!/usr/bin/env node
// Builds the walkthrough: node explorer/walkthrough/build.mjs (Node 22.13 or later).
//
//   1. Writes the shelf of the-stacks.ts from ../data.json: every paper's page
//      count and field, so the bookcase is the real collection.
//   2. Strips the types from src/pieces/*.ts into pieces/*.js, plain ES modules
//      that <ascii-art src="..."> can load with no bundler.
//   3. Renders template.html into index.html, putting each text piece's first
//      frame inside its tag, so the page reads before any script runs, and the
//      field key under <!--FIELDS--> in the stacks' own binding colours.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SRC = `${HERE}src/pieces/`;
const OUT = `${HERE}pieces/`;

// --- 1. the shelf ------------------------------------------------------------
const data = JSON.parse(readFileSync(`${HERE}../data.json`, "utf8"));
const fields = [...new Set(data.families.map((f) => f.discipline))].sort();
// One book a paper, in catalogue order: two base-36 digits of pages, one of field.
const shelf = data.families
  .flatMap((f) => f.papers.map((p) => p.pages.toString(36).padStart(2, "0") + fields.indexOf(f.discipline).toString(36)))
  .join("");
const stacks = `${SRC}the-stacks.ts`;
const before = existsSync(stacks) ? readFileSync(stacks, "utf8") : "";
const after = before
  .replace(/const SHELF = "[^"]*";/, `const SHELF = "${shelf}";`)
  .replace(/const FIELDS: string\[\] = \[[^\]]*\];/, `const FIELDS: string[] = ${JSON.stringify(fields)};`);
if (after !== before) writeFileSync(stacks, after);

// --- 2. the pieces -----------------------------------------------------------
mkdirSync(OUT, { recursive: true });
const slugs = readdirSync(SRC).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3)).sort();
for (const slug of slugs) {
  const ts = readFileSync(`${SRC}${slug}.ts`, "utf8");
  const js = stripTypeScriptTypes(ts, { mode: "strip" })
    // the erased `import type` leaves a blank line behind
    .replace(/^\s*\n/m, "");
  writeFileSync(`${OUT}${slug}.js`, `// Built from src/pieces/${slug}.ts by build.mjs. Edit that, not this.\n${js}`);
}

// --- 3. the page ---------------------------------------------------------------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let page = existsSync(`${HERE}template.html`) ? readFileSync(`${HERE}template.html`, "utf8") : "";
const tags = [...page.matchAll(/<ascii-art src="pieces\/([a-z0-9-]+)\.js"([^>]*)><\/ascii-art>/g)];
for (const [tag, slug, rest] of tags) {
  const mod = await import(pathToFileURL(`${OUT}${slug}.js`).href);
  const { meta } = mod;
  let inner;
  if (meta.palette && !/\bmono\b/.test(rest)) {
    // a scene: an empty frame the shape of the canvas, so nothing shifts when it draws
    inner = `<div class="hold" style="aspect-ratio:${meta.cols}/${meta.rows * (meta.cell ?? 2)};background:${meta.ground}"></div>`;
  } else {
    const opts = JSON.parse((rest.match(/options='([^']*)'/) || [])[1] || "{}");
    const first = mod.default({ ...meta.options, ...opts })(0, {});
    inner = `<pre class="hold" aria-hidden="true">${esc(first)}</pre>`;
  }
  page = page.replace(tag, `<ascii-art src="pieces/${slug}.js"${rest}>${inner}</ascii-art>`);
}
// the field key: families and papers a field, in the binding colour of its spines
const stacksMod = await import(pathToFileURL(`${OUT}the-stacks.js`).href);
const most = Math.max(...fields.map((f) => data.families.filter((x) => x.discipline === f).length));
const key = fields
  .map((f, i) => {
    const fams = data.families.filter((x) => x.discipline === f);
    const papers = fams.reduce((n, x) => n + x.papers.length, 0);
    const pct = ((fams.length / most) * 100).toFixed(1);
    const lit = stacksMod.meta.palette[3 * i + 2];
    return `<li><span class="sw" style="background:${lit}"></span><span class="fn">${esc(f)}</span><span class="bar"><i style="width:${pct}%;background:${lit}"></i></span><span class="fc">${fams.length}<small> · ${papers}</small></span></li>`;
  })
  .join("\n");
page = page.replace("<!--FIELDS-->", `<ol class="fields">\n${key}\n</ol>`);
if (page) writeFileSync(`${HERE}index.html`, page);
console.log(`${slugs.length} pieces, ${tags.length} on the page, ${data.totals.papers} books on the shelf`);
