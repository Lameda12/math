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

## Deploy

`index.html` is self-contained (data inlined, MathJax and fonts from CDNs). On Vercel, import the
repo with `explorer` as the root directory and no framework preset.

## Walkthrough

`walkthrough/` is a scroll-through tour of the repository, one directory a chapter, each drawn in
animated ascii with [ascii.rest](https://github.com/bas3line/ascii). Its nine pieces are written to
the library's piece contract in `walkthrough/src/pieces/*.ts` and draw on the repo's own data: the
bookcase is every paper's real page count and field, the terminal reads out a real Comparator
challenge, the zeta plot computes Hardy's Z function live.

```sh
node explorer/walkthrough/build.mjs        # Node 22.13+: shelf data, pieces/*.js, index.html
npx -p typescript tsc -p explorer/walkthrough   # optional strict type check
```

The page loads `<ascii-art>` from ascii.rest and falls back to the copy in
`walkthrough/vendor/ascii.rest/` (MIT) when that site can't be reached.
