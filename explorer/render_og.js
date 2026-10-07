#!/usr/bin/env node
// Render og.html to og.png (1200x630) from data.json.
//
// Usage: node explorer/render_og.js [fonts.css]
//   fonts.css: optional Google Fonts stylesheet saved locally, with the .ttf files it
//   references downloaded next to it; they are inlined so the render needs no network.
//   Without it the card falls back to system fonts.
// Needs Playwright (PLAYWRIGHT_MODULE overrides the module path).
const fs = require("fs");
const path = require("path");

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const dir = __dirname;
const SITE = "math-explorer-fawn.vercel.app";

function inlineFonts(cssPath) {
  if (!cssPath) return "";
  const base = path.dirname(cssPath);
  return fs.readFileSync(cssPath, "utf8").replace(/url\((https:\/\/[^)]+)\)/g, (m, url) => {
    const file = path.join(base, path.basename(new URL(url).pathname));
    if (!fs.existsSync(file)) throw new Error(`missing font file ${file}`);
    return `url(data:font/ttf;base64,${fs.readFileSync(file).toString("base64")})`;
  });
}

(async () => {
  const data = JSON.parse(fs.readFileSync(path.join(dir, "data.json"), "utf8"));
  const papers = data.families.flatMap((f) => f.papers.map((p) => ({ pages: p.pages || 0, lean: !!f.lean })));
  const fonts = inlineFonts(process.argv[2]);
  const html = fs.readFileSync(path.join(dir, "og.html"), "utf8").replace("</head>", `<style>${fonts}</style></head>`);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate((args) => window.draw(args), { papers, totals: data.totals, site: SITE });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, "og.png") });
  } finally {
    await browser.close();
  }
  console.log("wrote explorer/og.png");
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
