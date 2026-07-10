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

Everything lives in `index.html` — CSS, HTML, and JS in one file (~2450 lines). No framework.

### App shell (premium SaaS layout)

- Desktop (≥1024px): fixed left **sidebar** (`.sidebar` > `.tabs` nav) + glass **topbar** (`.hdr`) + sticky 4px `.grad-bar` brand line on top
- Mobile (<1024px): sidebar collapses into a horizontal scrollable nav strip under the topbar
- Icons: inline **SVG sprite** (`<symbol id="i-*">`, Lucide-style outline, stroke 2) at the top of `<body>`. Never use emojis as structural icons. In JS templates use the helpers:
  - `ICO(name)` → `<svg class="ic"><use href="#i-name"/></svg>`
  - `TRI(tr)` → ship/plane icon for transport mode
  - `PH_LG` / `PH_SM` — image placeholder icons (large card / small table)

### Data layer (localStorage)

| Key | Content |
|-----|---------|
| `gf_s` | Global settings (exchange rate, all-inclusive forwarder rates, margin %, transfer fees `trf`, Trade Assurance `assu`, internal VAT `tvaInterne`) |
| `gf_p` | Products array |
| `gf_f` | Suppliers array |
| `gf_t` | Freight forwarders array |
| `gf_cols` | Universal column preferences per view: `{catalogue|simulation|devis|pdf: {visible: [key…], touched: bool, known: [key…]}}`. Legacy `gf_c` / `gf_dp.show` are auto-migrated on first load |
| `gf_win` | Winner overrides per group key `{grpKey: prodId}` |
| `gf_audit` | Calculation audit trail (last 100 entries: settings changes, generated devis PDFs, bulk imports, image exports), exportable as JSON from the settings panel |
| `gf_imp` | Bulk-import prefs — last column mapping per type: `{map: {produits\|fournisseurs\|transitaires: {normalizedHeader: fieldKey}}}` |
| `gf_exp` | Image-export prefs: `{tpl, bg, txt, logoPos, showMarge}` |

`DATA_VER` constant controls localStorage migrations — bump it to force a reset of `gf_p` and `gf_f` when the data schema changes.

### Default data

- `DF` — 2 real suppliers (Shaanxi Yateli Technology Limited / Oman Medical Beauty Manufacture) with contacts, logos (raw GitHub CDN URLs), Alibaba links, and PDF quote links (latest: Quotes7.6 Yateli / Quotes7.7 Oman)
- `DP` — 37 default products across 8 categories (`grp` key groups identical products from different suppliers, e.g. `pdt-grand`, `pdt-dome`). Products from the 7.6/7.7 quotes carry an `imgs` gallery array (up to 3 photos, shown as clickable thumbnails on the product card via `cardGallery`/`swapCardImg`)
- `DT` — 1 default freight forwarder (E & C Logistics, groupage.cn, China → West Africa) with all-inclusive rates (230 000 XOF/CBM maritime · 11 000 XOF/kg air), delays, and logo; seeded into `trans` at init if absent (matched by name)

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

### Pricing model (calcEngine — single source of truth)

All prices flow through `calcEngine(inputs)` in `index.html` (between the `===== MOTEUR DE CALCUL` / `===== FIN MOTEUR` markers — pure functions, extractable for Node tests). `calc(p, o)` adapts a product + settings, `calcDevis(item)` adapts a cart item + devis strategy. Amounts are rounded to 2 decimals (`r2`).

```
ÉTAPE 1 — Coût de revient HT (devise source)
  Coût d'achat HT     = Prix EXW × Qté + Fret local (p.prach, per order, same currency)
  Frais transfert     = S.trf   → % of coût d'achat OR fixed amount
  Trade Assurance     = S.assu  → optional (off by default), % OR fixed
  Coût de revient HT  = Coût d'achat + Transfert + Assurance   (unitaire = / Qté)

ÉTAPE 2 — Prix de Vente HT (XOF) — conversion BEFORE margin
  Coût revient U (XOF) = Coût revient unitaire × taux de change
  Marge U              = Coût revient U (XOF) × taux_marge %
  Prix de Vente U HT   = Coût revient U (XOF) + Marge U  (− remise éventuelle)

ÉTAPE 3 — Prix de Vente TTC (estimation)
  CBM                  = L×l×h / 1e6 (cm, default) or L×l×h (m) — p.dimU
  Frais logistiques    = Aérien: kg × Qté × tarifAerien | Maritime: CBM × Qté × tarifMaritime
                         (per-forwarder rates override globals; ALL-INCLUSIVE: fret + douane + taxes)
  Prix de Vente TTC    = Prix de Vente HT + Frais logistiques
```

**TVA rule**: no VAT is ever added on top of frais logistiques (already tax-inclusive). `S.tvaInterne` only appears as a separate line for VAT-registered clients (`devisClient.assujetti` checkbox / simulation select), computed on the merchandise HT amount. Internal columns (coût de revient, marge, EXW) never appear on the client PDF.

### Universal column manager (ColumnManager)

Column visibility for **Catalogue / Simulation / Devis / PDF export** flows through one store + one reusable component (between the `===== GESTION UNIVERSELLE DES COLONNES` / `===== FIN GESTION DES COLONNES` markers):

- `CM_DEFS` — column definitions per view: `{k, lbl, def (visible by default), mob:false (auto-hidden on mobile), g (dropdown group)}`. `CM_FIXED` lists always-on columns shown as disabled items.
- `cmMount(view, hostId, {inline})` — renders the component into a host div (button + dropdown with count badge `visible/total`, "Tout afficher", "Réinitialiser"; `inline:true` renders a flat list, used in the PDF config modal).
- `cmVisible(view)` — returns the effective `{key: bool}` set. On viewports <768px, non-essential columns (`mob:false`) are auto-hidden **until** the user customizes the view (`touched`).
- `cmToggle/cmShowAll/cmReset` mutate + `cmSave()` to `gf_cols` + re-render via `CM_RENDER[view]`; changes are announced to screen readers through the `#cm-live` live region.
- Stale-key safety: saved keys no longer in `CM_DEFS` are dropped; columns added to the code after a save (tracked via `known`) pick up their `def` value.
- PDF columns are a **separate** preference (`pdf` view), configured in the `pdf-modal` opened by `openPdfConfig()` before `generateDevisPDF()`. The PDF price block (Prix unitaire HT, Qté, Prix total HT, Frais logistiques, Prix total TTC) is always included; internal columns (coût de revient, marge, EXW) are never exportable to the client PDF.
- Table rows get a "Voir détails" (eye) button → `showProdDetails` / `showDevisDetails` open `detail-modal` with every field, including hidden columns (mobile fallback).

### Bulk import (module between `MODULE IMPORT EN MASSE` / `FIN MODULE IMPORT` markers)

"Importer" buttons in Catalogue / Fournisseurs / Transitaires open `import-modal` (`openImportModal(type)`):

- **CSV**: native parser `parseCSVText` (auto delimiter `;`/`,`/tab, quoted fields, BOM strip). **Excel**: SheetJS lazy-loaded from CDN (`ensureLib`). **PDF**: pdf.js lazy-loaded, text grouped into visual lines (`pdfToLines`) then name+price heuristic (`impExtractRows`, currency-first pattern wins). **HTML**: DOMParser — biggest `<table>`, else block-aware text extraction.
- Tabular sources → column-mapping UI (`IMP_FIELDS` per type with accent-insensitive synonym auto-guess via `impNorm`; last mapping remembered in `gf_imp`) + read-only 6-row preview. Extracted sources (PDF/HTML) → fully editable preview (inputs bound to `impState.rows`, row delete).
- `impRun` processes rows in chunks of 25 (progress bar), validates (required nom, readable prix, email format, duplicate detection vs existing data), builds entities via `impBuild` (fuzzy supplier match, category match, ref generation consistent with `genRef`), then `impFinish` saves + re-renders + logs to `gf_audit` + shows ok/warn summary.

### Image export (module between `MODULE EXPORT IMAGES DESIGN` / `FIN MODULE EXPORT IMAGES` markers)

"Export image" button in Catalogue toggles selection mode (`expToggleMode` → checkboxes `expBox()` on cards/table rows + fixed bottom `#exp-bar`). `openExportModal()` opens the customization modal:

- 6 canvas templates (`EXP_TPLS`: classique, gradient, nuit, minimal, badge, catalogue) rendered by `expDraw` at 1080×1080; bg/text color pickers, Go.Group wordmark position (`expLogo`), optional margin line; live preview with per-product navigation; prefs persisted in `gf_exp`.
- Images loaded with `crossOrigin='anonymous'` (raw GitHub sends CORS headers) with placeholder fallback — the canvas is never tainted. Prices come from `calc(p)` (PV HT / PV TTC / marge).
- Download: individual PNGs (`canvas.toBlob`) or a single ZIP built by the dependency-free store-only writer `zipStore` (CRC32, no compression — PNGs are already compressed). Progress bar during batch generation.

### Grouped view

When `grouped=true`, `groupList(filteredProducts)` returns one entry per `grp` key. `selectWinner(key, prods)` picks the winner per `stratPrix`, overridden by `winOverrides[key]`. `setWinner(key, prodId)` persists a manual override to `gf_win`.

### Image URLs

Product images are served from raw GitHub CDN:
```js
const RAWBASE = 'https://raw.githubusercontent.com/dinaagz/Go-Flow/main/';
const IMG  = n => RAWBASE + 'assets/Products%20images/1%20(' + n + ').jpeg'; // série 1 (1)–1 (11)
const IMG2 = n => RAWBASE + 'assets/Products%20images/2%20(' + n + ').jpeg'; // série 2 (1)–2 (42), gaps: 25, 32, 40
```
Série 1 (originals): img1=RF chariot, img2=RF stylo, img3=Skin compact, img4=Pico compact, img5=Hydrafacial dôme LED, img6=Hydrafacial 17-en-1, img7=Skin grand, img8=Pico grand, img9=HIFU, img10=Hydrafacial dôme+lit, img11=Pico compact SANO.

Série 2 (quotes 7.6/7.7): 1-3+41=détartreur compact, 42+1=détartreur tactile, 4/29/30=blanchiment GlorySmile, 6/27=V34, 10/28=poudre 5 Days, 7=dôme LED Oman, 8=dôme PDT Yateli, 9/23/24=gel conducteur, 11/33=support inox, 12/17/34=scalpel, 13/26=lampe PDT sur pied, 14=écran LED, 15/16/37=refroidisseur d'air, 18/21=protège-dents, 19/35=Hydra.Pen, 20/36=parasol, 31=ouvre-bouche, 38/39=galerie Hydrafacial 14-en-1. Unused: 5, 22.

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
