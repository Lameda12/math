# The Proposition

A triage tool for researchers working through this collection: 372 claimed results, 722 unrefereed
manuscripts, 34,815 pages.

- **Map**: one row per field (with arXiv-style codes), one square per result, colored by evidence:
  Lean-formalized, computational checks, or paper only.
- **Triage**: one result at a time, in layers. The claim and a plain-words line come first; the Lean
  statement Comparator checks against, the formalization's scope note, and the papers (abstracts,
  PDFs, BibTeX) open on demand. Judge with 1 to 4 (Read it, Doubt it, Not new, Not my area).
- **Reading list**: everything marked Read it or Doubt it, exportable as BibTeX or Markdown.
- Search with `/` or Cmd/Ctrl+K. Judgments stay in the browser (localStorage).

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
