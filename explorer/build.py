#!/usr/bin/env python3
"""Build the explorer dataset (and the static page) from the repo itself.

Sources:
  CONTENTS.md        families, papers, abstracts
  overview.tex       discipline of each family
  lean/docs/NNN.md   which families have a Lean formalization
  preprints/**.pdf   page counts (via pdfinfo, cached)

Usage: python3 explorer/build.py [--no-pages]
Writes explorer/data.json, explorer/index.html (standalone) and
explorer/artifact.html (body-only variant for claude.ai artifacts).
"""
from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent
REPO_URL = "https://github.com/Lameda12/math/blob/main"

TRACES = {
    "007": "ordinary-two-point-correlations.pdf",
    "017": "irrationality-exponent-of-pi.pdf",
    "087": "symmetric-and-general-mahler-conjectures.pdf",
    "102": "basic-semidefinite-threshold-np-hardness.pdf",
    "159": "quasipolynomial-arithmetic-progressions.pdf",
    "197": "kaplansky-direct-finiteness-characteristic-two.pdf",
    "221": "mezard-parisi-formula.pdf",
    "271": "spontaneous-magnetization-quantum-heisenberg-ferromagnet.pdf",
    "287": "free-group-factor-isomorphism.pdf",
    "362": "relativistic-vlasov-maxwell.pdf",
}

# Plain-English hooks for results a non-specialist might recognize.
# Each one paraphrases the family summary in CONTENTS.md; keep them faithful.
HOOKS = {
    "002": "The Birch–Swinnerton-Dyer formula, a Millennium Prize problem, proven exactly for a density-one set of quadratic twists of every elliptic curve.",
    "003": "Not the Riemann Hypothesis, but a step toward it: no zeros of zeta, or of any Dirichlet L-function, to the right of 7/8.",
    "004": "No algorithm can decide whether a polynomial equation has a rational solution. Hilbert's tenth problem, over ℚ.",
    "005": "Catalan's constant, 1 − 1/9 + 1/25 − 1/49 + …, is irrational.",
    "013": "The primes can't be split as a sumset A + B, even after changing finitely many of them.",
    "017": "π is no easier to approximate by fractions than a typical number. Bonus: the Flint Hills series converges.",
    "025": "Every fraction a/b is a sum of about log log b distinct unit fractions, and that's the best possible order.",
    "030": "Every elliptic curve over every imaginary quadratic field is modular.",
    "071": "Every domain in the sphere can be conformally mapped to one whose holes are round disks or points. Koebe's circle-domain conjecture.",
    "074": "Kakeya: a set containing a unit needle in every direction in 4D has full dimension. Plus the maximal version in 3D.",
    "102": "Khot's Unique Games Conjecture, proven. Max-Cut can't beat Goemans–Williamson unless P = NP.",
    "103": "Randomness doesn't help log-space computation: L = RL = BPL.",
    "107": "Matrix multiplication in n^(9/4 + ε) operations. The exponent ω drops to at most 2.25.",
    "109": "Multiplying two n-bit integers faster than n log n on a multitape Turing machine.",
    "138": "Subset Sum in 2^(0.49n) time, under the 2^(n/2) meet-in-the-middle barrier.",
    "143": "Hilbert's sixteenth problem: a planar polynomial vector field has a bounded number of limit cycles, depending only on its degree.",
    "156": "Borsuk's conjecture fails in dimension 9: a bounded set that can't be cut into 10 pieces of smaller diameter.",
    "158": "You can't color the plane with 5 colors so that points at distance 1 always differ. The answer is 6 or 7.",
    "159": "If the reciprocals of a set of integers diverge, the set has arithmetic progressions of every length. Erdős's conjecture.",
    "165": "The crossing numbers of every complete graph and complete bipartite graph, settled. The classical drawings are optimal.",
    "180": "Barnette's conjecture: every cubic, bipartite, planar, 3-connected graph has a Hamiltonian cycle.",
    "196": "Kaplansky's zero-divisor conjecture is false: a torsion-free group whose group algebra over 𝔽₂ has zero divisors.",
    "246": "Cannon's conjecture: a hyperbolic group whose boundary is a 2-sphere comes from hyperbolic 3-space.",
    "248": "Thompson's group F is not amenable. A decades-old problem in group theory.",
    "266": "In dimension 6 there are exactly 3 mutually unbiased bases. Four is impossible.",
    "274": "Constant-depth quantum circuits can't compute parity. Parity is not in QAC⁰.",
    "287": "All free group factors are isomorphic: L(F₂) ≅ L(F₃). A central open problem in operator algebras.",
    "288": "Kadison's similarity problem: every bounded representation of a C*-algebra is similar to a *-representation.",
    "304": "Hilbert–Smith: any locally compact group acting faithfully on a manifold is a Lie group.",
    "362": "Relativistic Vlasov–Maxwell, the equations of a collisionless plasma, have global smooth solutions for arbitrary large data.",
    "369": "Hot spots: on any simply connected planar domain, the hottest and coldest points of the first heat mode sit on the boundary.",
    "375": "De Giorgi's conjecture in dimension 8, its sharp endpoint.",
    "376": "Viscous fluids can compute: forced Navier–Stokes flows that simulate any Turing machine.",
}

FAMILY_RE = re.compile(r"^\*\*(\d{3})\. (.+?)\*\*\s*(.*)$")
PAPER_RE = re.compile(r"^&emsp;\[(.+)\]\((preprints/.+?\.pdf)\)\s*(?:—\s*(.+))?$")
LEAN_LINK_RE = re.compile(r"\s*\(\[Lean\]\([^)]*\)\)\s*$")
SECTION_RE = re.compile(r"\\cataloguesection\{([^}]*)\}")
ENTRY_RE = re.compile(r"\\resultentry\{(\d{3})\}")


ALLOWED_TAG_RE = re.compile(r"&lt;(/?)(i|b|sub|sup)&gt;")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^)\s]+)\)")


def to_mathjax(text: str) -> str:
    """Normalize CONTENTS.md prose into safe HTML for the page.

    Inline math $`...`$ becomes \\(...\\) for MathJax, everything is escaped
    except <i>, <b>, <sub>, <sup>, and markdown links become anchors.
    """
    text = re.sub(r"\$`(.+?)`\$", lambda m: r"\(" + m.group(1) + r"\)", text)
    text = ALLOWED_TAG_RE.sub(r"<\1\2>", html.escape(html.unescape(text), quote=False))
    return MD_LINK_RE.sub(
        lambda m: f'<a href="{html.escape(m.group(2))}" target="_blank" rel="noopener">{m.group(1)}</a>', text
    )


def parse_contents(path: Path) -> list[dict]:
    families: list[dict] = []
    lines = path.read_text(encoding="utf-8").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        if m := FAMILY_RE.match(line):
            num, title, summary = m.groups()
            families.append({
                "id": num,
                "title": to_mathjax(title.rstrip(".")),
                "summary": to_mathjax(LEAN_LINK_RE.sub("", summary)),
                "papers": [],
            })
        elif (m := PAPER_RE.match(line)) and families:
            title, link, note = m.groups()
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            abstract = []
            while j < len(lines) and lines[j].strip() and not lines[j].startswith("</td>"):
                abstract.append(lines[j].strip())
                j += 1
            families[-1]["papers"].append({
                "title": to_mathjax(title),
                "note": note,
                "path": link,
                "abstract": to_mathjax(" ".join(abstract)),
            })
            i = j
            continue
        i += 1
    return families


def parse_disciplines(path: Path) -> dict[str, str]:
    current, out = "Other", {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if m := SECTION_RE.search(line):
            current = m.group(1)
        for m in ENTRY_RE.finditer(line):
            out[m.group(1)] = current
    return out


def page_count(pdf: Path) -> int | None:
    try:
        res = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    m = re.search(r"^Pages:\s+(\d+)", res.stdout, re.M)
    return int(m.group(1)) if m else None


def build(count_pages: bool) -> dict:
    families = parse_contents(ROOT / "CONTENTS.md")
    disciplines = parse_disciplines(ROOT / "overview.tex")
    lean_docs = {p.stem for p in (ROOT / "lean" / "docs").glob("*.md")}

    cache_path = OUT / ".pages-cache.json"
    try:
        cache = json.loads(cache_path.read_text())
    except (OSError, json.JSONDecodeError):
        cache = {}

    for fam in families:
        fid = fam["id"]
        fam["discipline"] = disciplines.get(fid, "Other")
        fam["lean"] = f"{REPO_URL}/lean/docs/{fid}.md" if fid in lean_docs else None
        fam["trace"] = f"{REPO_URL}/reasoning_traces/{TRACES[fid]}" if fid in TRACES else None
        fam["hook"] = HOOKS.get(fid)
        for paper in fam["papers"]:
            pdf = ROOT / paper["path"]
            if count_pages and paper["path"] not in cache and pdf.is_file():
                cache[paper["path"]] = page_count(pdf)
            paper["pages"] = cache.get(paper["path"])
            paper["url"] = f"{REPO_URL}/{paper['path']}"
            del paper["path"]
        fam["pages"] = sum(p["pages"] or 0 for p in fam["papers"])

    if count_pages:
        cache_path.write_text(json.dumps(cache, indent=0, sort_keys=True))

    missing = [f["id"] for f in families if f["discipline"] == "Other"]
    if missing:
        print(f"warning: no discipline for {', '.join(missing)}", file=sys.stderr)

    return {
        "families": families,
        "totals": {
            "families": len(families),
            "papers": sum(len(f["papers"]) for f in families),
            "pages": sum(f["pages"] for f in families),
            "lean": sum(1 for f in families if f["lean"]),
        },
    }


def render(data: dict, template: Path) -> tuple[str, str]:
    """Return (artifact body, standalone document)."""
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # Keep the JSON inert inside <script>: no closing tags, no HTML comments.
    payload = payload.replace("</", "<\\/").replace("<!--", "<\\!--")
    body = template.read_text(encoding="utf-8").replace("/*__DATA__*/null", payload)
    standalone = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f"</head>\n<body>\n{body}\n</body>\n</html>\n"
    )
    return body, standalone


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--no-pages", action="store_true", help="skip pdfinfo page counting")
    args = ap.parse_args()

    data = build(count_pages=not args.no_pages)
    (OUT / "data.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    template = OUT / "template.html"
    if template.is_file():
        body, standalone = render(data, template)
        (OUT / "artifact.html").write_text(body, encoding="utf-8")
        (OUT / "index.html").write_text(standalone, encoding="utf-8")

    t = data["totals"]
    print(f"{t['families']} families, {t['papers']} papers, {t['pages']} pages, {t['lean']} with Lean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
