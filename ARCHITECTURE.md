# Go.Flow — État Actuel de l'Architecture

> Généré le 2026-07-24 | Version plateforme : data schema v3

---

## 1. Vue d'ensemble

Go.Flow est une **SPA (Single Page Application) statique mono-fichier** développée pour Go Group (Lomé, Togo), société d'import/distribution de matériel esthétique chinois.

| Caractéristique | Valeur |
|-----------------|--------|
| Pattern | SPA single-file statique |
| Stack | HTML5 / CSS3 / Vanilla JS ES6+ |
| Fichier principal | `index.html` — 1 501 lignes |
| Build tooling | Aucun (zéro dépendance JS) |
| Déploiement | Vercel — `go-flow-phi.vercel.app` |
| Hébergement images | GitHub raw CDN |
| Dépendances externes | Google Fonts uniquement (Montserrat + Poppins) |
| Persistence des données | `localStorage` navigateur (7 clés) |
| Version schéma données | `DATA_VER = 3` |

---

## 2. Arborescence du Projet

```
Go-Flow/
├── index.html                          ← Toute l'application (1 501 lignes)
├── README.md
├── CONTEXTE_PROJET_GOGROUP_DEVIS.md    ← Contexte métier & historique
├── ARCHITECTURE.md                     ← Ce document
└── assets/
    ├── Products images/                ← 11 JPEG produits (1.jpeg … 11.jpeg)
    ├── Quotes/                         ← 2 PDF devis fournisseurs
    │   ├── Quotes_Oman Medical Beauty Manufacture.pdf
    │   └── Quotes_Shaanxi Yateli Technology Limited.pdf
    ├── supplier/                       ← Logos + contacts fournisseurs
    │   ├── Logo Yateli.avif
    │   ├── logo Oman Beauty.png
    │   ├── Contact Oman Medical Beauty Manufac.txt
    │   ├── Contact Shaanxi Yateli Technology L.txt
    │   └── Oman Medical Beauty Manufacture.html  (page Alibaba sauvegardée)
    └── supplier.zip                    ← Archive fournisseurs (23 MB)
```

---

## 3. Structure du Fichier `index.html`

Le fichier unique est découpé en trois blocs distincts :

| Bloc | Lignes | Contenu |
|------|--------|---------|
| `<head>` | 1–6 | Meta charset/viewport + lien Google Fonts |
| `<style>` | 7–179 | CSS complet (variables, layout, composants) |
| `<body>` HTML | 180–509 | Structure HTML (header, onglets, modales) |
| `<script>` | 510–1499 | Logique JS complète (47 fonctions) |
| Fin | 1499–1501 | Fermetures `</script>`, `</body>`, `</html>` |

---

## 4. Couche de Données — localStorage

Toutes les données de l'application sont persistées dans le `localStorage` du navigateur via 7 clés :

| Clé | Constante JS | Contenu | Type |
|-----|-------------|---------|------|
| `gf_s` | `SK` | Paramètres globaux (taux de change, marges, TVA, frais fret) | Object |
| `gf_p` | `PK` | Catalogue produits | Array |
| `gf_f` | `FK` | Fournisseurs | Array |
| `gf_t` | `TK` | Transitaires | Array |
| `gf_v` | `VK` | Version schéma (`3`) — guard de migration | Number |
| `gf_win` | `WK` | Surcharges gagnant en vue groupée `{grpKey: prodId}` | Object |
| `gf_c` | *(inline)* | Visibilité des colonnes optionnelles `{k: boolean}` | Object |

**Guard de migration** : au démarrage, si `gf_v !== DATA_VER`, toutes les clés sont effacées et les données par défaut sont rechargées.

---

## 5. Modèles de Données

### 5.1 Paramètres Globaux (`DS`)

```js
{
  tauxChange:    95,      // 1 RMB = 95 XOF
  tarifAerien:   11000,   // XOF par kg (fret aérien)
  tarifMaritime: 230000,  // XOF par CBM (fret maritime)
  tauxMarge:     35,      // % marge par défaut
  tva:           18       // % TVA par défaut
}
```

### 5.2 Produit

```js
{
  id,       // 'P0001'–'P0019' (défauts) | timestamp-based (nouveaux)
  ref,      // e.g. 'HYD-001-001' (Catégorie-Seq-Seq)
  nom,      // Désignation commerciale
  cat,      // 'Hydrafacial' | 'Picolaser/Tatouage' | 'Analyse de peau' | 'RF Microneedling' | 'HIFU'
  grp,      // Clé de groupement e.g. 'hydrafacial-14en1'
  fid,      // ID fournisseur lié (FK)
  fn,       // Nom fournisseur (dénormalisé)
  prix,     // Prix EXW (dans la devise `dev`)
  prach,    // Frais pré-embarquement XOF
  dev,      // Devise : 'RMB' | 'USD' | 'EUR' | 'XOF'
  l, la, h, // Dimensions colis en cm (longueur, largeur, hauteur)
  kg,       // Poids en kg
  tr,       // Transport par défaut : 'Maritime' | 'Aérien'
  marge,    // % marge individuelle ('' = utiliser global)
  rem,      // % remise commerciale
  conc,     // Prix concurrent marché XOF
  moq,      // Quantité minimale commande
  desc,     // Description libre
  specs,    // Spécifications techniques (chaîne formatée)
  photos,   // [] URLs ou base64, max 3
  glink     // Lien recherche Google produit
}
```

### 5.3 Fournisseur

```js
{
  id,       // 'F001' | 'F002' | 'F' + timestamp
  nom,      // Raison sociale
  contact,  // Nom du contact principal
  email,
  pays,     // Pays d'origine
  wa,       // WhatsApp
  wc,       // WeChat
  dom,      // Domaine d'activité
  an,       // Année de création
  eval,     // Évaluation /5
  ali,      // Statut Alibaba : 'Vérifié' | 'Non vérifié' | 'Non disponible'
  ali_url,  // URL boutique Alibaba
  lang,     // Langues parlées
  mkt,      // Marchés principaux
  desc,     // Description
  com,      // Commentaires internes
  logo,     // URL ou base64
  devis     // URL PDF devis
}
```

**Fournisseurs par défaut** : `F001` = Shaanxi Yateli Technology Limited (Bailey), `F002` = Oman Medical Beauty Manufacture (Clara Xiang)

### 5.4 Transitaire

```js
{
  id,       // 'T' + timestamp
  nom,      // Nom société transitaire
  dep,      // Pays de départ
  arr,      // Pays d'arrivée
  contact,
  wa,       // WhatsApp
  tel,      // Téléphone
  type,     // 'Maritime' | 'Aérien' | 'Routier' | 'Multimodale'
  ent,      // Durée de stockage en jours
  mar,      // Tarif maritime XOF/CBM
  mard,     // Délai maritime en jours
  aer,      // Tarif aérien XOF/kg
  aerd,     // Délai aérien en jours
  ass,      // Taux assurance % : '0' | '1' | '1.5' | '2'
  logo      // URL ou base64
}
```

---

## 6. Moteur de Calcul (`calc()`)

Fonction centrale retournant toutes les métriques de prix d'un produit.

```js
function calc(p, o = {}) {
  const S   = o.S   || state.S;           // Paramètres globaux
  const dev = o.dev || p.dev || 'RMB';
  const tr  = o.tr  || p.tr  || 'Maritime';
  const mg  = (parseFloat(o.marge ?? p.marge) || S.tauxMarge) / 100;
  const rem = parseFloat(o.rem  ?? p.rem)  || 0;
  const tva = parseFloat(o.tva  ?? S.tva)  || 0;
  const fm  = parseFloat(o.fm   || (state.T[0]?.mar  ?? S.tarifMaritime));
  const fa  = parseFloat(o.fa   || (state.T[0]?.aer  ?? S.tarifAerien));

  const pa      = toXOF(p.prix, dev);                   // EXW → XOF
  const prach   = toXOF(parseFloat(p.prach) || 0, dev); // Frais pré-embarquement
  const cbm     = (p.l * p.la * p.h) / 1e6;             // Volume en m³
  const fret    = tr === 'Aérien' ? p.kg * fa : cbm * fm; // Coût fret
  const marge_xof = pa * mg;                            // ⚠️ Marge sur EXW seul
  const pvh     = pa + marge_xof;                       // Prix de vente HT (avant remise)
  const remM    = pvh * (rem / 100);                    // Montant remise
  const pnh     = pvh - remM;                           // Prix net HT
  const prix_ht = pnh + prach + fret;                   // Prix total HT
  const cout    = pa + prach + fret;                    // Coût de revient total
  const mn      = prix_ht - cout;                       // Marge nette XOF
  const ttc     = prix_ht * (1 + tva / 100);            // Prix TTC

  return { pa, prach, cbm, fret, marge_xof, pvh, remM, pnh, prix_ht, cout, mn, ttc };
}
```

**Objet retourné** :
| Clé | Signification |
|-----|---------------|
| `pa` | Prix EXW en XOF |
| `prach` | Frais pré-embarquement en XOF |
| `cbm` | Volume en m³ |
| `fret` | Coût fret (maritime ou aérien) |
| `marge_xof` | Montant marge en XOF |
| `pvh` | Prix de vente HT avant remise |
| `remM` | Montant de la remise |
| `pnh` | Prix net HT après remise |
| `prix_ht` | Prix total HT (incl. fret + frais) |
| `cout` | Coût de revient total |
| `mn` | Marge nette en XOF |
| `ttc` | Prix TTC |

**Taux de conversion** (`toXOF`) :
- RMB → XOF : `× tauxChange` (défaut 95)
- USD → XOF : `× tauxChange × 6.5`
- EUR → XOF : `× 655.957` (taux fixe FCFA)
- XOF : inchangé

---

## 7. Architecture CSS

### Variables CSS (`:root`)

```css
--rouge:  #FF2244;   --orange: #FF6600;   --jaune:  #FFB300;
--vert:   #00CC77;   --bleu:   #0099FF;   --violet: #7C3AED;
--blanc:  #FFFFFF;   --nuit:   #1A1A2E;   --nuit2:  #16213E;
--nuit3:  #0F3460;   --gris:   #8892A4;   --border: #2A2D3E;
--text:   #E8EAF6;   --muted:  #6B7280;
--grad: linear-gradient(135deg, #0099FF, #00CC77);
```

### Sections CSS (par commentaires)

| Lignes | Section |
|--------|---------|
| 7–114 | Core layout (reset, header, tabs, grid, cards, table, modal, form, toast) |
| 115–122 | Supplier card (`.four-logo`, `.four-card-hdr`, `.four-info`) |
| 123–124 | Import Alibaba box (`.ali-import-box`) |
| 125–142 | Print media query (`@media print`) |
| 143–144 | Competitive price row (`.comp-row`) |
| 145–159 | Grouped view (`.grp-count-badge`, `.alt-panel`, `.alt-card`, `.winner-tag`) |
| 160–163 | Table accordion rows (`.tbl-alt-row`, `.expand-cell`) |
| 164–166 | Grouped toolbar (`.grp-btn`) |
| 167–179 | Column picker (`.col-picker-wrap`, `.col-picker-drop`, `.cp-grid`) |

---

## 8. Architecture JS — Fonctions

### Sections commentées dans le script

| Section | Fonctions clés |
|---------|---------------|
| Initialisation | `init()`, `buildProds()`, `save()`, `loadS()`, `saveSettings()`, `toggleSettings()` |
| Utilitaires calcul | `toXOF()`, `calc()`, `N()`, `Nd()` |
| Navigation | `tab()`, `setView()` |
| **Catalogue** | `renderCat()` |
| **Groupement** | `toggleGrouped()`, `setStratPrix()`, `groupList()`, `selectWinner()`, `setWinner()`, `toggleAccordion()`, `prodGroupCard()`, `prodGroupTable()`, `toggleGroupTblRow()` |
| Rendu produits | `fourLabel()`, `fourBadgeClass()`, `prodCard()`, `prodTable()` |
| **Modale produit** | `openProdModal()`, `genRef()`, `updateSLink()`, `calcPrev()`, `saveProd()`, `delProd()` |
| **Photos** | `addPics()`, `renderThumbs()`, `addLogo()` |
| **Import Alibaba** | `parseAlibabaUrl()`, `previewLogoUrl()` |
| **Fournisseurs** | `renderFour()`, `openFourModal()`, `saveFour()`, `delFour()` |
| **Transitaires** | `renderTrans()`, `openTransModal()`, `saveTrans()`, `delTrans()` |
| **Simulation** | `popSim()`, `setSimTrans()`, `simSelProd()`, `simCalc()`, `qsim()` |
| **Export CSV** | `exportCSV()` |
| **Utils** | `closeMod()`, `toast()` |
| Colonnes | `initCols()`, `toggleCol()`, `setAllCols()`, `toggleColPicker()` |

**Total : 47 fonctions** — toutes dans le scope global `window`.

---

## 9. Structure HTML — Onglets & Modales

### Onglets (navigation principale)

| ID | Onglet | Contenu |
|----|--------|---------|
| `t-catalogue` | Catalogue | Stats, filtres, vue grille/liste/groupée, sélecteur colonnes |
| `t-fournisseurs` | Fournisseurs | Grille des fournisseurs avec logos et évaluations |
| `t-transitaires` | Transitaires | Liste des transitaires avec tarifs fret |
| `t-simulation` | Simulateur | Calcul de commande multi-produit avec résultat détaillé |

### Modales

| ID | Modale | Champs principaux |
|----|--------|-------------------|
| `prod-modal` | Ajout/édition produit | 20+ champs : ref, nom, cat, fournisseur, prix, dimensions, marge, remise, photos, specs… |
| `four-modal` | Ajout/édition fournisseur | 18 champs : nom, contact, pays, email, WhatsApp, WeChat, Alibaba, logo, devis PDF… |
| `trans-modal` | Ajout/édition transitaire | 14 champs : nom, départ/arrivée, tarifs maritime/aérien, assurance, logo… |

### Panneau Paramètres (`#spanel`)

Accessible via bouton ⚙️ — overlay latéral contenant les paramètres globaux (taux change, marges, TVA, tarifs fret).

---

## 10. Couverture Fonctionnelle Actuelle

| Module | Fonctionnalité | Statut |
|--------|---------------|--------|
| **Catalogue** | Vue grille + liste des produits | ✅ Implémenté |
| | Vue groupée par famille (avec gagnant) | ✅ Implémenté |
| | Filtres : catégorie, fournisseur, recherche texte | ✅ Implémenté |
| | Sélecteur de colonnes optionnelles | ✅ Implémenté |
| | Stats globales (nb produits, valeur catalogue) | ✅ Implémenté |
| | Export CSV | ✅ Implémenté |
| | Impression catalogue | ✅ Implémenté (print CSS) |
| **Produit** | Fiche produit complète (CRUD) | ✅ Implémenté |
| | Calcul temps réel dans la fiche | ✅ Implémenté |
| | Photos (max 3, base64) | ✅ Implémenté |
| | Génération automatique de référence | ✅ Implémenté |
| | Lien recherche Google | ✅ Implémenté |
| | Quick Simulate (raccourci → onglet simulateur) | ✅ Implémenté |
| **Fournisseur** | Fiche fournisseur complète (CRUD) | ✅ Implémenté |
| | Import données depuis URL Alibaba | ✅ Implémenté |
| | Logo fournisseur (URL ou upload) | ✅ Implémenté |
| | Évaluation /5 | ✅ Implémenté |
| **Transitaire** | Fiche transitaire complète (CRUD) | ✅ Implémenté |
| | Tarifs maritime (XOF/CBM) et aérien (XOF/kg) | ✅ Implémenté |
| | Logo transitaire | ✅ Implémenté |
| **Simulateur** | Calcul commande (produit × fournisseur × transitaire) | ✅ Implémenté |
| | Bascule Maritime / Aérien | ✅ Implémenté |
| | Remise, TVA, assurance (champs) | ⚠️ Partiellement (assurance non calculée) |
| **Paramètres** | Taux de change, marge globale, TVA, tarifs fret | ✅ Implémenté |
| **Modèle calcul** | Marge sur coût de revient complet | ❌ Non — marge sur EXW seul |
| | Frais de transfert dans base marge | ❌ Non implémenté |
| | Forfait transitaire tout-compris | ❌ Non implémenté |
| **Devis/Commandes** | Génération de devis clients | ❌ Non implémenté |
| **Clients** | Fiche client (3 types) | ❌ Non implémenté |
| **Dashboard** | Tableau de bord global | ❌ Non implémenté |

---

*Document généré automatiquement — synchroniser lors de chaque évolution majeure de `index.html`.*
