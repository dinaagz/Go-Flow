# Go.Flow — État Actuel de l'Architecture

> Mis à jour le 2026-07-24 | Version schéma données : `DATA_VER = 4`

---

## 1. Vue d'ensemble

Go.Flow est une **SPA (Single Page Application) statique mono-fichier** développée pour Go Group (Lomé, Togo), société d'import/distribution de matériel esthétique depuis la Chine.

| Caractéristique | Valeur |
|-----------------|--------|
| Pattern | SPA single-file statique |
| Stack | HTML5 / CSS3 / Vanilla JS ES6+ async/await |
| Fichier principal | `index.html` — **5 782 lignes** |
| Build tooling | Aucun (zéro dépendance JS) |
| Déploiement | Vercel — `go-flow-phi.vercel.app` |
| Hébergement images | GitHub raw CDN (`RAWBASE`) |
| Dépendances externes | Google Fonts (Montserrat + Poppins) |
| Persistence principale | **IndexedDB** (`gf_store` / `kv`) |
| Persistence légère | `localStorage` (paramètres + version) |
| Version schéma données | `DATA_VER = 4` |
| Fonctions JS | **277+** |
| Sections CSS | **43** |

---

## 2. Arborescence du Projet

```
Go-Flow/
├── index.html                          ← Toute l'application (5 782 lignes)
├── README.md
├── CONTEXTE_PROJET_GOGROUP_DEVIS.md
├── ARCHITECTURE.md                     ← Ce document
└── assets/
    ├── Products images/                ← JPEG produits (séries 1 et 2)
    ├── Quotes/                         ← PDF devis fournisseurs
    ├── Freight Forwarders/             ← Assets transitaires
    └── supplier/
        ├── Oman Medical Beauty Manufacture/
        ├── Paine Agent/
        └── Shaanxi Yateli Technology/
```

---

## 3. Couche de Données — Architecture Hybride

### 3.1 localStorage (données légères)

| Clé | Constante JS | Contenu |
|-----|-------------|---------|
| `gf_s` | `SK` | Paramètres globaux (taux change, marges, frais transfert, assurance, TVA) |
| `gf_v` | `VK` | Version schéma (`4`) — guard de migration |
| `gf_warn` | `BKP_WARN_K` | Timestamp du dernier rappel de sauvegarde hebdomadaire |

### 3.2 IndexedDB — base `gf_store`, magasin `kv` (données volumineuses)

| Clé | Constante JS | Contenu |
|-----|-------------|---------|
| `gf_p` | `PK` | Catalogue produits (avec photos base64) |
| `gf_f` | `FK` | Fournisseurs |
| `gf_t` | `TK` | Transitaires |
| `gf_cols` | `CMK` | Visibilité colonnes (Catalogue / Simulation / Devis) |
| `gf_win` | `WK` | Surcharges gagnant en vue groupée |
| `gf_audit` | `AK` | Historique d'audit (max 100 entrées) |
| `gf_d` | `DK` | Panier devis (lignes) |
| `gf_dc` | `DCK` | Infos client devis (nom, société, pays…) |
| `gf_dp` | `DPK` | Préférences devis (colonnes visibles, stratégie prix…) |
| `gf_dvfilt` | `DFK` | Filtres actifs du devis |
| `gf_devref` | `DVREFK` | Compteur de référence devis (ex. GG-2026-0042) |
| `gf_imp` | `IMPK` | Préférences import + dernier HTML mémorisé (jusqu'à ~5 MB) |
| `gf_exp` | `EXK` | Préférences export images (ordre champs, template…) |

### 3.3 API de stockage

```js
// localStorage — petits objets
LS_GET(k, fallback)  / LS_SET(k, v)

// IndexedDB — données volumineuses (async)
await IDB_GET(k, fallback)
IDB_SET(k, v)         // fire-and-forget (Promise non attendue)
await IDB_DELETE(k)
```

**Fallback automatique** : si IndexedDB est indisponible (navigation privée stricte), `IDB_GET`/`IDB_SET` basculent silencieusement sur `localStorage`.

**Migration one-shot** (`migrateToIdb()`) : au premier démarrage après la mise à jour, les 12 clés listées dans `IDB_MIGRATE_KEYS` sont copiées de `localStorage` vers IndexedDB, puis supprimées de `localStorage`. Idempotent via le flag `__migrated_v1`.

**Chargement en mémoire** : toutes les données IndexedDB sont chargées une seule fois dans `init()` vers des globals (`prods`, `fours`, `trans`, `auditHist`, etc.). Les lectures ne touchent plus le stockage après le démarrage ; seules les mutations persistent via `IDB_SET`.

---

## 4. Modèles de Données

### 4.1 Paramètres Globaux (`DS`)

```js
{
  tauxChange:    95,       // 1 RMB = 95 XOF
  tarifAerien:   11000,    // XOF par kg (fret aérien)
  tarifMaritime: 230000,   // XOF par CBM (fret maritime)
  tauxMarge:     35,       // % marge par défaut
  tvaInterne:    18,       // % TVA (clients assujettis uniquement)
  trf: {                   // Frais de transfert de fonds
    mode: 'pct',           // 'pct' | 'fixe'
    val: 0
  },
  assu: {                  // Assurance marchandises
    on:   false,
    mode: 'pct',
    val:  1.5
  }
}
```

### 4.2 Produit

```js
{
  id,        // 'P0001'–'P00NN' (défauts) | timestamp-based (nouveaux)
  ref,       // ex. 'HYD-001-001'
  nom, cat, grp,
  fid, fn,   // ID + nom fournisseur (fn dénormalisé)
  prix,      // Prix EXW (dans devise `dev`)
  prach,     // Frais pré-embarquement (fret local)
  dev,       // 'RMB' | 'USD' | 'EUR' | 'XOF'
  dimU,      // Unité dimensions : 'cm' | 'm'
  l, la, h,  // Dimensions
  kg,        // Poids
  tr,        // 'Maritime' | 'Aérien'
  marge,     // % individuel ('' = global)
  rem,       // % remise
  conc,      // Prix concurrent marché XOF
  moq,       // Quantité minimale
  desc, specs, glink,
  photos     // [] URLs ou base64, max 3
}
```

### 4.3 Ligne de Devis

```js
{
  cid,        // ID unique ligne
  pid,        // ID produit source
  nom,        // Désignation (éditable)
  cat, grp, fid,
  exw,        // Prix EXW négocié (éditable)
  prach,      // Fret local négocié
  dev,
  l, la, h, dimU, kg,  // Dimensions (éditables)
  moq,        // MOQ négocié
  tr,         // Transport
  marge,
  rem,
  qty,        // Quantité commandée
  photos,
  comment,    // Commentaire ligne devis
  _nego: {    // Valeurs négociées (substitution au produit catalogue)
    prix, prach, kg, moq, l, la, h
  }
}
```

### 4.4 Fournisseur & Transitaire

Schémas inchangés depuis v3 (voir commits précédents) avec ajout du 3e fournisseur `F003` — Paine Agent Sourcing.

---

## 5. Moteur de Calcul

Le calcul est désormais séparé en deux couches :

### 5.1 `calcEngine(i)` — moteur pur (sans état global)

Prend un objet `i` avec toutes les valeurs explicites, retourne un objet de résultats complet.

```js
// Étape 1 — Coût de revient (devise source)
coutAchat   = exw × qty + fretLocal
fTrf        = fraisCfg(transfert, coutAchat)    // % ou fixe
fAss        = assurance.on ? fraisCfg(assu, coutAchat) : 0
coutRevient = coutAchat + fTrf + fAss            // ✅ base marge correcte

// Étape 2 — Conversion et marge (en XOF)
coutRevientUX = coutRevientU × tauxChange
margeU        = coutRevientUX × margePct / 100   // ✅ marge sur coût de revient
pvuBrut       = coutRevientUX + margeU
remU          = pvuBrut × remisePct / 100
pvuHT         = pvuBrut − remU

// Étape 3 — Frais logistiques tout-compris (transitaire forfait)
fraisLog      = mode='Aérien' ? kg × qty × tarifAerien
                               : cbm × qty × tarifMaritime
pvuTTC        = pvuHT + fraisLogU                // Frais logistiques inclus dans prix client
tvaM          = assujetti ? pvtHT × tvaInterne / 100 : 0  // TVA séparée uniquement si assujetti
```

**Valeurs retournées** : `{qty, dev, coutAchat, coutRevient, coutRevientUX, margeU, margeTot, pvuHT, pvtHT, fraisLog, fraisLogU, pvuTTC, pvtTTC, tvaM, totalAvecTVA, cbm, cbmTot, …}`

### 5.2 `calc(p, o={})` — adaptateur produit → moteur

Adapte un objet produit du catalogue (avec les valeurs globales de `S`) vers `calcEngine()`.

---

## 6. Architecture CSS

### 6.1 Variables CSS (`:root`)

```css
/* Palette Go Group */
--rouge: #FF2244;  --orange: #FF6600;  --jaune: #FFB300;
--vert:  #00CC77;  --bleu:   #0099FF;  --violet: #7C3AED;
--blanc: #FFFFFF;  --nuit:   #1A1A2E;  --nuit2:  #16213E;
--nuit3: #0F3460;  --gris:   #8892A4;  --border: #2A2D3E;
--text:  #E8EAF6;  --muted:  #6B7280;
--grad: linear-gradient(135deg, #0099FF, #00CC77);

/* Système */
--sidebar-w: 220px;  --top-h: 56px;
--card-r: 12px;      --modal-r: 16px;
--trans: .18s ease;
```

### 6.2 43 Sections CSS (commentaires `/* ===== … =====*/`)

| Groupe | Sections |
|--------|---------|
| Layout SaaS | ICON SYSTEM, SHELL, TOPBAR, SIDEBAR, LAYOUT, BUTTONS |
| Composants UI | TOOLBAR, KPI STATS, GRID & CARDS, TABLES, SETTINGS PANEL, MODALS, FORMS |
| Sections | SECTION HEADERS, SIMULATION, TOAST, EMPTY STATES, CALC PREVIEW |
| Entités | SUPPLIER CARD, GROUPED VIEW, COLUMN PICKER |
| Devis | ÉDITION INLINE DEVIS, DEVIS |
| Import/Export | IMPORT EN MASSE, EXPORT IMAGES DESIGN |
| Utilitaires | SCROLLBAR, PRINT HEADER, PRINT, PRINT — DEVIS PDF |
| Responsive / A11y | RESPONSIVE, ACCESSIBILITÉ |

---

## 7. Architecture JS — Modules Fonctionnels

### 7.1 Couche stockage (lignes 1265–1366)

`LS_GET`, `LS_SET`, `idbDb`, `idbGetRaw`, `idbSetRaw`, `idbDeleteRaw`, `idbAllEntries`, `idbAvailable`, `IDB_GET`, `IDB_SET`, `IDB_DELETE`, `migrateToIdb`

### 7.2 Gestion universelle des colonnes (lignes 1502–1705)

`cmLoad`, `cmMigrateLegacy`, `cmSerialize`, `cmSave`, `cmVisible`, `cmToggle`, `cmShowAll`, `cmReset`, `cmMount`, `cmRefresh`, `cmRefreshCount`, `cmOpen`
- Gère 3 vues : `catalogue`, `simulation`, `devis`
- Persiste dans IndexedDB (`gf_cols`)

### 7.3 Initialisation & paramètres (lignes 1708–1830)

`init` (async), `buildProds`, `save`, `loadS`, `saveSettings`, `toggleSettings`, `userMenuToggle`, `userMenuClose`

### 7.4 Moteur de calcul (lignes 1834–1901)

`xofRate`, `toXOF`, `cbmOf`, `fraisCfg`, `calcEngine`, `calc`

### 7.5 Historique audit (lignes 1902–1940)

`auditLoad`, `auditLog`, `auditToCSV`, `exportAudit`

### 7.6 Catalogue & groupement (lignes 1943–2440)

`tab`, `setView`, `renderCat`, `toggleGrouped`, `setStratPrix`, `groupList`, `selectWinner`, `setWinner`, `toggleAccordion`, `cardPriceRows`, `toggleCostDetail`, `cardGallery`, `swapCardImg`, `prodGroupCard`, `prodGroupTable`, `toggleGroupTblRow`, `escH`, `truncTxt`, `catInfoRows`, `cardTopStrip`, `prodDelai`, `openDetails`, `showProdDetails`

### 7.7 Édition inline devis (lignes 2281–2440)

`dvFlash`, `dvPreserveScroll`, `refreshDevisAfterEdit`, `dvEditSimple`, `dvEditNego`, `dvToggleSource`, `dvModalQty`, `dvEditRow`, `dvNegoRow`, `showDevisDetails`

### 7.8 Catalogue — rendu & CRUD produit (lignes 2441–2800)

`fourLabel`, `fourBadgeClass`, `prodCard`, `prodTable`, `openProdModal`, `genRef`, `updateSLink`, `calcPrev`, `saveProd`, `delProd`, `addPics`, `renderThumbs`, `addLogo`, `previewLogoUrl`, `parseAlibabaUrl`

### 7.9 Fournisseurs (lignes ~2800–3000)

`renderFour`, `openFourModal`, `saveFour`, `delFour`

### 7.10 Transitaires (lignes ~3000–3070)

`renderTrans`, `openTransModal`, `saveTrans`, `delTrans`

### 7.11 Module Devis (lignes 3071–3900)

**Panier & client**
`loadDevis`, `saveDevisItems`, `addToDevis`, `removeFromDevis`, `updateDevisQty`, `renderDevisCart`, `saveDevisClient`, `renderDevisClient`, `onDevisAssuToggle`, `devisFilterChips`, `devisApplyFilters`, `devisTotalBar`

**Stratégies de prix**
`devisStratUI`, `devisStratApply`, `devisStratCalc`, `devisPersoInputs`, `devisApplyStrat`

**Signature & référence**
`devisSignature`, `devisRef`, `devRefLoad`

**PDF multilingue** (FR/EN/ZH)
`generateDevisPDF`, `pdfT`, `trF`, `trCat` — génération canvas/print inline

### 7.12 Simulation (lignes ~3900–4100)

`popSim`, `setSimTrans`, `simSelProd`, `simCalc`, `qsim`

### 7.13 Import en masse (lignes 4109–4980)

`impLoadPrefs`, `impPrefs`, `impPrefsSave`, `impResolveImg`, `ensureLib`, `ensurePDF`, `openImportModal`, `impBack`, `impTypeChange`, `impUpdTools`, `impLoading`, `impFileInput`, `impHandleFile`, `parseCSVText`, `pdfToLines`, `impExtractRows`, `impAbsUrl`, `impRichParse`, `impAutoImgs`, `impFromHTML`, `impSaveLastHtml`, `impRenderLastHtml`, `impReparseLast`, `impSetTabular`, `impSetExtracted`, `impShowStep2`, `impRenderMap`, `impMapping`, `impRenderPrev`, `impDelRow`, `impExistingKeys`, `impCat`, `impBuild`, `impRun`, `impFinish`, `impExtractFiche`, `impSetFiche`, `impRenderFiche`, `impFicheSetLogo`, `impFicheLogoPrev`, `impFichePrev`, `impRunFiche`, `impRichRef`, `impRichSet`, `impRichDel`, `impRichAdd`, `impRenderRich`, `impRichUseImg`, `impImgsZip`, `impFileToDataURL`, `impEnsureImgCol`, `impBulkImgs`

**Formats supportés** : CSV, Excel (.xlsx via SheetJS chargé à la demande), PDF (via pdf.js), HTML Alibaba/fiche produit

### 7.14 Export images design (lignes 4987–5440)

`expLoadPrefs`, `expInfoState`, `expInfoSave`, `expInfoToggle`, `expInfoMove`, `expInfoMoveTo`, `expSyncCat`, `expRenderInfos`, `expBox`, `expToggle`, `expToggleMode`, `expBarUpdate`, `expSelectAll`, `openExportModal`, `expRenderTpls`, `expSetTpl`, `expPrefChange`, `expNav`, `expPreview`, `expLoadImg`, `expRRect`, `expCover`, `expGrad`, `expWrap`, `expFitFont`, `expLogo`, `expInfoRows`, `expFitText`, `expRowsH`, `expRowsBlock`, `expDraw`, `expSlug`, `expSaveBlob`, `expDownload`, `zipCRC`, `zipStore`

**Templates** : 3 templates visuels (grille 2×3, portrait, carré), export ZIP de toutes les images, drag-and-drop des champs info

### 7.15 Sauvegarde & stockage (lignes 5440–5782)

`openMod`, `closeMod`, `bkpCounts`, `bkpSnapshot`, `storBytes`, `storFmt`, `storBreakdown`, `renderStoragePanel`, `storClearAudit`, `storClearLastHtml`, `bkpIdb`, `bkpDirGet`, `bkpDirSet`, `bkpDirPerm`, `bkpChooseDir`, `bkpRemoveDir`, `bkpDirUI`, `bkpTrySaveToDir`, `exportBackup`, `importBackup`, `handleBackupFile`, `bkpWeeklyWarn`, `toast`

**File System Access API** — sauvegarde automatique dans un dossier local choisi par l'utilisateur

---

## 8. Structure HTML — Onglets & Modules

### Onglets (navigation latérale — `sidebar`)

| ID | Onglet | Fonctionnalités clés |
|----|--------|---------------------|
| `t-catalogue` | Catalogue | Vue grille/liste/groupée, filtres, KPI stats, sélecteur colonnes, export CSV, import |
| `t-fournisseurs` | Fournisseurs | 3 fournisseurs (Yateli, Oman, Paine Agent), CRUD, import Alibaba |
| `t-transitaires` | Transitaires | CRUD, tarifs tout-compris, logos |
| `t-simulation` | Simulateur | Calcul commande unitaire avec breakdown complet |
| `t-devis` | Devis | Panier multi-produits, stratégies prix, PDF FR/EN/ZH, filtres/tri |

### Modales

| ID | Modale |
|----|--------|
| `prod-modal` | Ajout/édition produit (CRUD complet + calcul temps réel) |
| `four-modal` | Ajout/édition fournisseur |
| `trans-modal` | Ajout/édition transitaire |
| `imp-modal` | Import en masse (CSV/Excel/PDF/HTML — wizard 2 étapes) |
| `exp-modal` | Export images design produits |
| `det-modal` | Détails produit (lecture seule) |
| `dv-det-modal` | Détails ligne devis |
| `dv-qty-modal` | Saisie quantité devis |
| `settings` (overlay) | Paramètres globaux + sauvegarde auto + panneau stockage |

---

## 9. Catégories Produits

```js
const CATS = {
  'Hydrafacial':           'HYD',
  'Picolaser/Tatouage':    'PCL',
  'Analyse de peau':       'ADP',
  'RF Microneedling':      'RFM',
  'HIFU':                  'HIF',
  'Dentaire':              'DEN',     // Ajouté v4
  'Photothérapie LED':     'PDT',     // Ajouté v4
  'Équipement & Accessoires': 'EQP', // Ajouté v4
}
```

---

## 10. Couverture Fonctionnelle Actuelle

| Module | Fonctionnalité | Statut |
|--------|---------------|--------|
| **Catalogue** | Vue grille / liste / groupée | ✅ |
| | Filtres, recherche, sélecteur colonnes | ✅ |
| | KPI stats (nb, valeur, CBM) | ✅ |
| | Export CSV | ✅ |
| | Import CSV / Excel / PDF / HTML Alibaba | ✅ |
| | Import HTML fiche produit/fournisseur | ✅ |
| | Import images en masse + ZIP | ✅ |
| **Produit** | CRUD complet + calcul temps réel | ✅ |
| | Photos base64 (max 3) | ✅ |
| | Galerie avec swipe | ✅ |
| | Quick simulate (→ onglet Simulation) | ✅ |
| | Add to devis (→ panier) | ✅ |
| | Détail produit (lecture seule) | ✅ |
| **Fournisseurs** | CRUD + import Alibaba URL | ✅ |
| | 3 fournisseurs (Yateli, Oman, Paine Agent) | ✅ |
| **Transitaires** | CRUD + tarifs tout-compris | ✅ |
| **Simulation** | Calcul commande unitaire complet | ✅ |
| | Frais de transfert + assurance | ✅ |
| | TVA interne conditionnelle (assujettis) | ✅ |
| **Devis** | Panier multi-produits | ✅ |
| | Édition inline prix/qtés/dims négociés | ✅ |
| | Stratégies de prix (Prix bas, Meilleure qualité, Rapport qualité-prix, Personnalisé) | ✅ |
| | Filtres et tri du panier | ✅ |
| | Assurance sur le devis | ✅ |
| | Export PDF FR / EN / ZH | ✅ |
| | Référence devis auto (GG-YYYY-NNN) | ✅ |
| | Infos client sur devis | ✅ |
| **Export images** | Cartes produits design (3 templates) | ✅ |
| | Export ZIP multi-produits | ✅ |
| | Champs info drag-and-drop | ✅ |
| **Sauvegarde** | Export/import JSON complet | ✅ |
| | Sauvegarde auto dans dossier local (FSA API) | ✅ |
| | Rappel hebdomadaire | ✅ |
| **Stockage** | Panel monitoring IndexedDB / localStorage | ✅ |
| | Nettoyage historique / HTML mémorisé | ✅ |
| **Moteur calcul** | Marge sur coût de revient complet | ✅ (corrigé v4) |
| | Frais de transfert (% ou fixe) | ✅ |
| | Assurance marchandises (% du coût) | ✅ |
| | Transitaire forfait tout-compris | ✅ |
| | TVA séparée (assujettis uniquement) | ✅ |
| | Taux de change multi-devises (RMB/USD/EUR/XOF) | ✅ |
| **Accessibilité** | ARIA labels, focus management, keyboard nav | ✅ (PR #17) |
| **Responsive** | Media queries mobile | ⚠️ Partiel (PR #17, amélioration continue) |
| **Clients** | Fiche client (3 types) | ❌ Non implémenté |
| **Dashboard** | Tableau de bord global | ❌ Non implémenté |
| **Commandes** | Suivi commandes / statuts | ❌ Non implémenté |

---

*Synchroniser ce document lors de chaque PR majeure modifiant `index.html`.*
