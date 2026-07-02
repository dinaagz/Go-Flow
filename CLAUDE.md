# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Go.Flow is a single-file static web app (`index.html`) for **Go Group** (Lomé, Togo) — an import management console for professional aesthetic equipment sourced from China. No build step, no dependencies, no backend. Deploy by serving `index.html` directly.

**Live**: https://go-flow-phi.vercel.app  
**Repo**: https://github.com/dinaagz/Go-Flow

## Development

No build, no package manager. To work on the app:

```bash
# Open directly in browser
open index.html

# Or serve locally to avoid CORS on raw GitHub image URLs
python3 -m http.server 8080
```

To validate JS syntax (extract script block first):

```bash
sed -n '/<script>/,/<\/script>/p' index.html | grep -v '<script>' | grep -v '</script>' > /tmp/test.js && node --check /tmp/test.js
```

**Always run the syntax check before committing** — a stray comma in a template literal will blank the page.

## Architecture

Everything lives in `index.html` — CSS, HTML, and JS in one file (~1400 lines). No framework.

### Data layer (localStorage)

| Key | Content |
|-----|---------|
| `gf_s` | Global settings (exchange rate, freight rates, margin %, TVA) |
| `gf_p` | Products array |
| `gf_f` | Suppliers array |
| `gf_t` | Freight forwarders array |
| `gf_c` | Column picker state (object of `{colKey: boolean}`) |
| `gf_win` | Winner overrides per group key `{grpKey: prodId}` |

`DATA_VER` constant controls localStorage migrations — bump it to force a reset of `gf_p` and `gf_f` when the data schema changes.

### Default data

- `DF` — 2 real suppliers (Shaanxi Yateli Technology Limited / Oman Medical Beauty Manufacture) with contacts, logos (raw GitHub CDN URLs), Alibaba links, and PDF quote links
- `DP` — 19 default products across 5 categories, each with a `grp` key grouping identical products from different suppliers into 11 groups

### Key JS globals

```js
let S         // settings object (mirrors DS defaults)
let prods     // products array
let fours     // suppliers array
let trans     // freight forwarders array
let view      // 'grid' | 'list'
let grouped   // boolean — grouped mode toggle
let stratPrix // 'prix_bas' | 'meilleure_qualite' | 'meilleur_rapport'
let winOverrides // {grpKey: prodId} — manually promoted winners
let cols      // {colKey: boolean} — column picker state
```

### Pricing formula

Margin is applied **only on EXW price**, never on freight:

```
Marge XOF     = Prix EXW × taux_marge %
Vente HT      = Prix EXW + Marge
Prix net HT   = Vente HT − Remise
Prix total HT = Prix net HT + Préacheminement + Fret/Douane
TTC           = Prix total HT × (1 + TVA %)
```

Two distinct freight types:
- **Préacheminement** (`p.prach`) — inland freight from supplier to forwarder, given per-product by the supplier, stored in the same currency as EXW
- **Fret/Douane** — international freight + customs, calculated automatically: `CBM × tarifMaritime` or `poids × tarifAerien`

### Grouped view

When `grouped=true`, `groupList(filteredProducts)` returns one entry per `grp` key. `selectWinner(key, prods)` picks the winner per `stratPrix`, overridden by `winOverrides[key]`. `setWinner(key, prodId)` persists a manual override to `gf_win`.

### Image URLs

Product images are served from raw GitHub CDN:
```js
const RAWBASE = 'https://raw.githubusercontent.com/dinaagz/Go-Flow/main/';
const IMG = n => RAWBASE + 'assets/Products%20images/1%20(' + n + ').jpeg';
```
Images 1–11 map to specific product types (img1=RF chariot, img2=RF stylo, img3=Skin compact, img4=Pico compact, img5=Hydrafacial dôme LED, img6=Hydrafacial 17-en-1, img7=Skin grand, img8=Pico grand, img9=HIFU, img10=Hydrafacial dôme+lit, img11=Pico compact SANO).

## Brand / visual identity

- **Gradient** (`--grad`): Rouge `#FF2244` → Orange `#FF6600` → Jaune `#FFD700` → Vert `#00CC77` → Bleu `#0099FF` → Violet `#7733FF` — order never reverses
- **Fonts**: Montserrat (headings/numbers, weight 700–900) + Poppins (body, weight 300–600)
- **Supplier badge colors**: Yateli = `rgba(0,153,255,.85)` (blue), Oman = `rgba(119,51,255,.85)` (violet)
- Print: `.no-print { display: none !important }` hides Actions column from PDF

## Assets structure

```
assets/
├── Products images/   # 1 (1).jpeg … 1 (11).jpeg
├── Quotes/            # Supplier PDF quotes
└── supplier/          # Supplier logos (Logo Yateli.avif, logo Oman Beauty.png)
```

## Git workflow

Push to a feature branch, open a PR, then merge — do not push directly to `main` (the auto-classifier will block it).

```bash
git checkout -b feat/my-feature
git push -u origin feat/my-feature
# open PR via GitHub MCP tools, then merge
```
