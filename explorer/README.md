# The Proposition

A one-page skimmer for this collection: 722 papers, 34,815 pages, one card per result family.
Each card shows a one-line statement, whether the result has a Lean formalization, and the papers
behind it (abstracts, page counts, PDF links).

## Build

```sh
python3 explorer/build.py          # needs pdfinfo (poppler) for page counts
python3 explorer/build.py --no-pages   # reuse .pages-cache.json
```

Outputs:

- `data.json`: families, disciplines, papers, abstracts, page counts, Lean and reasoning-trace links
- `index.html`: standalone page, no build step or server needed
- `artifact.html`: the same page without the document wrapper, for claude.ai artifacts

Edit `template.html` for the page and the `HOOKS` dict in `build.py` for the plain-English one-liners.
`SITE_URL` in `build.py` sets the canonical, Open Graph and Twitter card URLs.

## Social card

`og.png` (1200x630) is rendered from `og.html` with Playwright:

```sh
node explorer/render_og.js path/to/fonts.css
```

`fonts.css` is a Google Fonts stylesheet (Lexend, Atkinson Hyperlegible) saved locally with its
`.ttf` files beside it; they are inlined so the render needs no network. Rebuild after the data changes.

## Deploy

`index.html` is self-contained (data inlined, MathJax and fonts from CDNs). On Vercel, import the
repo with `explorer` as the root directory and no framework preset.
