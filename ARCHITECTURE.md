# Go.Flow — État actuel de l'architecture

> Mis à jour le 2026-07-27 · Version du schéma de données : `DATA_VER = 4`
> Toutes les métriques de ce document proviennent d'une mesure directe sur le code.

---

## 1. Vue d'ensemble

Go.Flow est une application web monopage statique développée pour **Go Group** (Lomé, Togo), qui importe et distribue du matériel esthétique professionnel depuis la Chine. Elle couvre le référencement des produits et fournisseurs, le calcul du prix de revient réel, la simulation de marge et la production de devis clients au format PDF.

L'application a été migrée d'un fichier unique vers une **architecture modulaire multi-fichiers** (PR #60). Elle reste néanmoins **statique et sans étape de construction** : les fichiers sources sont les fichiers livrés.

| Caractéristique | Valeur |
|---|---|
| Modèle | SPA statique modulaire, sans serveur applicatif |
| Stack | HTML5 / CSS3 / JavaScript ES6+ (async/await) |
| Fichiers de code | **13 fichiers · 6 060 lignes** |
| Chargement | 11 balises `<script src>` classiques, ordre de dépendance explicite |
| Étape de construction | Aucune — pas de bundler, pas de transpilation |
| Gestionnaire de paquets | Aucun — pas de `package.json` |
| Déploiement | Vercel statique — `go-flow-phi.vercel.app` |
| Persistance principale | IndexedDB (`gf_store` / `kv`) |
| Persistance légère | localStorage (réglages + version de schéma) |
| Dépendances au démarrage | Google Fonts uniquement (Montserrat + Poppins) |
| Images produits | CDN brut GitHub (`RAWBASE`) |
| Fonctions JavaScript | **287** |
| Tests automatisés | Aucun |

---

## 2. Structure du dépôt

```
Go-Flow/
├── index.html              824 l.  — Shell : sprite d'icônes, onglets, 10 modales
├── css/
│   └── styles.css          576 l.  — Feuille de style unique (31 sections)
├── js/
│   ├── data-store.js       102 l.  — Couche de stockage (localStorage + IndexedDB)
│   ├── seed-data.js        130 l.  — Constantes et jeux de données par défaut
│   ├── column-manager.js   202 l.  — Gestionnaire universel de colonnes
│   ├── app-shell.js        170 l.  — Navigation, onglets, réglages
│   ├── calc-engine.js       68 l.  — Moteur de calcul (source unique de vérité)
│   ├── catalogue.js      1 180 l.  — Catalogue, CRUD produits/fournisseurs/transitaires
│   ├── devis.js          1 040 l.  — Panier devis, tarification, génération PDF
│   ├── import-module.js    870 l.  — Import CSV / Excel / PDF / HTML
│   ├── export-module.js    471 l.  — Export d'images canvas + archive ZIP
│   ├── modals-backup.js    396 l.  — Modales, sauvegarde, restauration
│   └── app-main.js          31 l.  — Amorçage, notifications, raccourcis
│
├── ARCHITECTURE.md          — Ce document
├── CLAUDE.md                — Conventions à respecter lors des modifications
├── README.md                — Présentation du projet
├── PRODUCT.md               — Cadrage produit
├── DESIGN.md                — Système de design
├── graphify.html            — Utilitaire annexe, hors périmètre applicatif
├── BackUp/                  — Sauvegardes JSON horodatées
└── assets/                  — 385 fichiers : photos produits, devis, logos, sites archivés
```

### Ordre de chargement

L'ordre des balises `<script>` dans `index.html` (lignes 812 à 822) **est** le graphe de dépendances : il n'y a ni imports ni exports, les modules communiquent par la portée globale.

```
data-store  →  seed-data  →  column-manager  →  app-shell  →  calc-engine
            →  catalogue  →  devis  →  import-module  →  export-module
            →  modals-backup  →  app-main   (déclenche init())
```

> **Conséquence :** ce ne sont pas des modules ES. Les 287 fonctions partagent une portée globale unique. Réorganiser l'ordre des balises peut casser l'application silencieusement.

---

## 3. Répartition du code

| Fichier | Lignes | Fonctions | Responsabilité |
|---|---:|---:|---|
| `js/catalogue.js` | 1 180 | 67 | Rendu grille/tableau, vue groupée, CRUD des trois entités |
| `js/devis.js` | 1 040 | 54 | Panier, stratégies tarifaires, client, PDF trilingue |
| `js/import-module.js` | 870 | 52 | Quatre formats sources, mappage, validation, images |
| `index.html` | 824 | — | Shell, 46 icônes SVG, 5 onglets, 10 modales |
| `css/styles.css` | 576 | — | 31 sections, 19 requêtes média |
| `js/export-module.js` | 471 | 39 | 6 gabarits canvas 1080 px, écriture ZIP native |
| `js/modals-backup.js` | 396 | 29 | Modales, instantané, restauration, panneau stockage |
| `js/column-manager.js` | 202 | 13 | 54 colonnes sur 3 vues |
| `js/app-shell.js` | 170 | 12 | Onglets, vues, réglages, menu utilisateur |
| `js/seed-data.js` | 130 | 1 | `DATA_VER`, `DS`, `CATS`, `DF`, `DP`, `DT` |
| `js/data-store.js` | 102 | 12 | Contrat d'accès au stockage, migration |
| `js/calc-engine.js` | 68 | 6 | Moteur de calcul et son adaptateur |
| `js/app-main.js` | 31 | 2 | Notifications, adaptation clavier Mac, amorçage |
| **Total** | **6 060** | **287** | |

---

## 4. Couche de données

Le stockage est réparti selon le **volume** : les réglages, légers et stables, restent en localStorage pour un accès synchrone ; tout ce qui peut croître va en IndexedDB.

### localStorage — 3 clés

| Clé | Contenu |
|---|---|
| `gf_s` | Paramètres globaux (taux de change, tarifs, marge, TVA, transfert, assurance) |
| `gf_v` | Marqueur `DATA_VER`, déclencheur de migration de schéma |
| `gf_warn` | Horodatage du dernier rappel de sauvegarde |

### IndexedDB — base `gf_store`, magasin `kv`, 13 clés

| Clé | Contenu |
|---|---|
| `gf_p` | Produits (photos base64 incluses) |
| `gf_f` | Fournisseurs (logos) |
| `gf_t` | Transitaires |
| `gf_cols` | Préférences de colonnes par vue |
| `gf_win` | Gagnants promus manuellement en vue groupée |
| `gf_audit` | Journal d'audit — 100 dernières entrées |
| `gf_d` | Panier du devis |
| `gf_dc` | Client du devis |
| `gf_dp` | Préférences d'affichage du devis |
| `gf_dvfilt` | Filtres de la vue Devis |
| `gf_devref` | Compteur de référence des devis |
| `gf_imp` | Préférences d'import + dernier HTML ré-analysable |
| `gf_exp` | Préférences d'export d'images |

### IndexedDB — base `gf_fs`, magasin `handles`

Base **distincte**, dédiée au `FileSystemDirectoryHandle` du dossier de sauvegarde automatique. Ce type d'objet ne peut pas être sérialisé en localStorage, d'où la base séparée (`js/modals-backup.js`).

### Contrat d'accès

| Fonction | Nature | Comportement |
|---|---|---|
| `LS_GET(k, fb)` | synchrone | Repli sur `fb` si le contenu est corrompu, avec avertissement console |
| `LS_SET(k, v)` | synchrone | Notification si le quota est dépassé |
| `IDB_GET(k, fb)` | asynchrone | Repli sur localStorage si IndexedDB est indisponible |
| `IDB_SET(k, v)` | asynchrone | Même repli automatique |
| `IDB_DELETE(k)` | asynchrone | Suppression d'une clé |
| `idbDb()` | asynchrone | Connexion unique mémorisée à `gf_store` |
| `idbAvailable()` | asynchrone | Détection mémorisée de la disponibilité d'IndexedDB |

**Migration** — `IDB_MIGRATE_KEYS` liste les 12 clés déplacées de localStorage vers IndexedDB en une passe unique, protégée par l'indicateur `__migrated_v1`. Idempotente, transparente, sans perte.

**Cycle de vie** — tout est chargé une seule fois pendant `init()` puis reflété en variables globales. Les lectures ultérieures n'atteignent plus le stockage ; seules les mutations déclenchent une écriture asynchrone.

**Migration de schéma** — un écart entre `DATA_VER` et `gf_v` supprime `gf_p` et `gf_f`, puis réinjecte les données par défaut. Incrémenter `DATA_VER` est donc une opération destructrice pour le catalogue de l'utilisateur.

---

## 5. Moteur de calcul

`js/calc-engine.js`, délimité par les marqueurs `MOTEUR DE CALCUL` / `FIN MOTEUR` (lignes 9 à 52).

`calcEngine(i)` est une **fonction pure** : aucun accès au DOM, aux variables globales ni au stockage. Elle est directement testable hors navigateur. La dépendance aux paramètres globaux est portée par l'adaptateur `calc()`, situé hors des bornes du moteur.

### Les trois étapes

```
ÉTAPE 1 — Coût de revient HT (devise source)
  Coût d'achat HT     = EXW × Qté + Fret local      (fret local : par commande)
  Frais de transfert  = S.trf   → % du coût d'achat OU montant fixe
  Trade Assurance     = S.assu  → optionnelle, désactivée par défaut
  Coût de revient HT  = Coût d'achat + Transfert + Assurance
  Coût de revient U   = Coût de revient HT ÷ Qté

ÉTAPE 2 — Prix de vente HT (devise cible) — conversion AVANT la marge
  Coût revient U (XOF) = Coût de revient unitaire × taux de change
  Marge unitaire       = Coût revient U (XOF) × taux de marge %
  PV unitaire HT       = Coût revient U (XOF) + Marge − remise éventuelle

ÉTAPE 3 — Prix de vente TTC (estimation)
  CBM               = L × l × h ÷ 1e6 (cm) ou L × l × h (m)
  Frais logistiques = Aérien   : kg  × Qté × tarifAerien
                      Maritime : CBM × Qté × tarifMaritime
                      (le tarif du transitaire prime sur le tarif global)
  PV TTC            = PV HT + Frais logistiques
```

**Règle de TVA** — aucune TVA n'est jamais ajoutée aux frais logistiques : le tarif transitaire est un forfait tout compris (fret + douane + taxes). `S.tvaInterne` n'apparaît qu'en ligne distincte, pour les clients assujettis, assise sur le montant HT de la marchandise.

`calcEngine` renvoie **29 champs**, ce qui évite tout recalcul en aval. Les montants sont arrondis à deux décimales par `r2()`.

### Conversion de devises

`xofRate(dev)` fournit le taux de conversion :

| Devise | Taux |
|---|---|
| RMB | `S.tauxChange` (paramétrable, 95 par défaut) |
| USD | **600 — codé en dur** |
| EUR | **655 — codé en dur** |
| Autre | 1 |

> Seul le taux RMB est configurable. Les taux USD et EUR sont figés dans le code.

### Consommateurs

Catalogue · Simulateur · Devis · Export PDF · Export d'images · Aperçu du formulaire produit. Aucune formule tarifaire n'est réimplémentée ailleurs.

---

## 6. Gestionnaire universel de colonnes

`js/column-manager.js` — un magasin unique et un composant réutilisable pilotent **54 colonnes sur 3 vues**.

| Vue | Colonnes | Colonnes fixes |
|---|---:|---:|
| `catalogue` | 19 | 0 |
| `simulation` | 16 | 2 |
| `devis` | 19 | 0 |

- `CM_DEFS` — définition d'une colonne : `{k, lbl, def, mob, g}`
- `cmMount(vue, hôte, {inline})` — injecte le composant (bouton, compteur, menu déroulant)
- `cmVisible(vue)` — ensemble effectif, avec masquage automatique des colonnes `mob:false` sous 768 px **jusqu'à** personnalisation par l'utilisateur
- `cmToggle` / `cmShowAll` / `cmReset` → `cmSave()` vers `gf_cols` + re-rendu via `CM_RENDER[vue]`
- Robustesse : les clés obsolètes sont ignorées ; les colonnes ajoutées après une sauvegarde reprennent leur `def`
- **L'export PDF partage la sélection de la vue `devis`** — pas de configuration séparée. Ce qui est coché à l'écran est ce qui s'imprime.
- Les colonnes internes (coût de revient, marge, EXW) sont désactivées par défaut ; la modale PDF avertit qu'elles deviendraient visibles par le client.

---

## 7. Interface

### Shell (`index.html`)

- **≥ 1024 px** — barre latérale fixe à gauche, barre supérieure translucide, barre dégradée de 4 px collée en haut
- **< 1024 px** — la barre latérale se replie en bande de navigation horizontale défilante
- **46 symboles SVG** déclarés une fois, référencés par `<use href="#i-nom"/>`. Helpers : `ICO(nom)`, `TRI(mode)`, `PH_LG` / `PH_SM`
- Aucun emoji employé comme icône structurelle

### Onglets — 5

`catalogue` · `fournisseurs` · `transitaires` · `simulation` · `devis`

Attributs `role="tab"`, `aria-selected`, `aria-controls`. Navigation par flèches gauche/droite.

### Modales — 10

`prod-modal` · `four-modal` · `trans-modal` · `pdf-modal` · `detail-modal` · `import-modal` · `export-modal` · `confirm-modal` · `shortcuts-modal` · panneau de réglages

Contrat commun : `role="dialog"`, `aria-modal`, libellé associé, piège de focus clavier, fermeture par Échap.

### Motifs d'interaction

- `toast(msg, err)` — notification éphémère, 3 secondes
- `toastUndo(msg, undoFn, ms)` — délai de grâce avant qu'une action destructive devienne définitive
- `confirm-modal` — confirmation générique en remplacement de `window.confirm`
- `shortcuts-modal` — aide aux raccourcis clavier, libellés adaptés sur Mac (`Ctrl` → `⌘`)
- `#cm-live` — région live ARIA annonçant les changements de colonnes

---

## 8. Données par défaut

| Constante | Volume | Contenu |
|---|---|---|
| `DP` | **34 produits** | Répartis sur 8 catégories. La clé `grp` regroupe les produits identiques de fournisseurs différents. Galerie `imgs` jusqu'à 3 photos. |
| `DF` | **3 fournisseurs** | Shaanxi Yateli (F001, fabricant) · Oman Medical Beauty (F002, fabricant) · Paine Agent Sourcing (F003, agent de sourcing) |
| `DT` | **1 transitaire** | E & C Logistics — 230 000 XOF/CBM maritime, 11 000 XOF/kg aérien, tout compris |

### Paramètres par défaut (`DS`)

```js
{ tauxChange:95, tarifAerien:11000, tarifMaritime:230000,
  tauxMarge:35, tvaInterne:18,
  trf:{mode:'pct',val:0}, assu:{on:false,mode:'pct',val:1.5} }
```

### Catégories (`CATS`) — 8

Hydrafacial `HYD` · Picolaser/Tatouage `PCL` · Analyse de peau `ADP` · RF Microneedling `RFM` · HIFU `HIF` · Dentaire `DEN` · Photothérapie LED `PDT` · Équipement & Accessoires `EQP`

> Ces catégories sont **écrites en dur** dans `seed-data.js` : leur modification requiert une intervention sur le code.

### Images produits

```js
const RAWBASE = 'https://raw.githubusercontent.com/dinaagz/Go-Flow/main/';
const IMG  = n => RAWBASE + 'assets/Products%20images/1%20(' + n + ').jpeg';
const IMG2 = n => RAWBASE + 'assets/Products%20images/2%20(' + n + ').jpeg';
```

---

## 9. Modules fonctionnels

### Catalogue (`catalogue.js`)

Vue grille ou tableau · **vue groupée** (`groupList` sur la clé `grp`) avec sélection du gagnant par stratégie (`prix_bas` / `meilleure_qualite` / `meilleur_rapport`), surchargeable manuellement (`setWinner` → `gf_win`) · galerie de miniatures · détail du coût dépliable · recherche, filtres, tri · export CSV · mode sélection pour l'export d'images. Porte également le CRUD des produits, fournisseurs et transitaires.

### Devis (`devis.js`)

Panier persistant · 4 stratégies tarifaires · 10 modes de tri · édition en ligne avec bascule catalogue/négocié · fiche client avec case « assujetti TVA » · référence auto-incrémentée (`gf_devref`) · taux de change en direct · affichage multi-devises · génération PDF via impression native en **FR / EN / ZH** (`PDF_I18N`), CGV incluses.

### Import en masse (`import-module.js`)

**CSV** — analyseur natif (séparateur auto `;`/`,`/tab, guillemets, BOM).
**Excel** — SheetJS chargé à la demande.
**PDF** — pdf.js chargé à la demande, texte regroupé en lignes visuelles puis heuristique nom + prix.
**HTML** — analyse riche : titres, paragraphes, listes, images absolutisées, liens, e-mails, téléphones.

Sources tabulaires → mappage de colonnes avec proposition automatique insensible aux accents, dernier mappage mémorisé par type. Sources extraites → aperçu entièrement modifiable. Traitement par lots de 25 avec barre de progression, validation et détection de doublons. Import de fiche fournisseur/transitaire depuis une page web avec pré-remplissage. Archive ZIP des images extraites.

### Export d'images (`export-module.js`)

6 gabarits canvas 1080 × 1080 (`classique`, `gradient`, `nuit`, `minimal`, `badge`, `catalogue`) · couleurs personnalisables · signature positionnable · **22 lignes d'information** synchronisées par défaut avec les colonnes visibles du catalogue, sélectionnables et réordonnables par glisser-déposer · téléchargement PNG unitaire ou archive ZIP via un écrivain natif sans compression (`zipStore`). Images chargées en `crossOrigin='anonymous'` : le canvas n'est jamais contaminé.

### Sauvegarde (`modals-backup.js`)

`bkpSnapshot()` construit l'instantané depuis les variables en mémoire, pas par copie brute du stockage. `exportBackup()` écrit dans un dossier local via l'API File System Access (Chrome/Edge), sinon déclenche un téléchargement. `handleBackupFile()` restaure chaque clé dans le magasin approprié. Rappel hebdomadaire via `gf_warn`. Panneau de suivi de l'occupation avec `navigator.storage.estimate()` et actions de nettoyage.

---

## 10. Identité visuelle

**Dégradé de marque** (`--grad`) — Rouge `#FF2244` → Orange `#FF6600` → Jaune `#FFD700` → Vert `#00CC77` → Bleu `#0099FF` → Violet `#7733FF`. L'ordre ne s'inverse jamais.

**Typographie** — Montserrat (titres et chiffres, 700–900) · Poppins (texte courant, 300–700).

**Couleurs fournisseurs** — Yateli `rgba(0,153,255,.85)` (bleu) · Oman `rgba(119,51,255,.85)` (violet).

**Impression** — `.no-print { display: none !important }` retire la colonne Actions des documents imprimés.

---

## 11. Déploiement et développement

```bash
# Ouverture directe
open index.html

# Service local — recommandé depuis le passage en multi-fichiers
python3 -m http.server 8080

# Contrôle de syntaxe avant commit — désormais fichier par fichier
for f in js/*.js; do node --check "$f" || echo "ÉCHEC : $f"; done
```

> Depuis le passage en multi-fichiers, le contrôle de syntaxe porte directement sur les fichiers `js/*.js` — il n'est plus nécessaire d'extraire le bloc `<script>` de `index.html`.

### Dépendances externes

| Ressource | Chargement | Criticité |
|---|---|---|
| Google Fonts | Au démarrage | Non bloquante — polices de repli |
| CDN images GitHub | Au rendu du catalogue | Non bloquante — icône de remplacement |
| SheetJS | À l'import Excel | Requise pour cette fonctionnalité seule |
| pdf.js | À l'import PDF | Requise pour cette fonctionnalité seule |
| `open.er-api.com` | Sur action explicite | Requise pour l'actualisation des taux |

### Workflow

Branche dédiée puis pull request. Les envois directs sur `main` sont bloqués.

```bash
git checkout -b feat/ma-fonctionnalite
git push -u origin feat/ma-fonctionnalite
```

---

## 12. Points de vigilance connus

| Sujet | État |
|---|---|
| **Portée globale** | Les 287 fonctions partagent le même espace de noms — le découpage en fichiers n'a pas introduit d'imports/exports ES |
| **Ordre de chargement** | Le graphe de dépendances est implicite, porté par l'ordre des balises `<script>` dans `index.html` |
| **Échappement HTML** | Les données utilisateur sont majoritairement interpolées sans échappement dans les gabarits — un correctif a été proposé (PR #61) puis annulé (PR #62) |
| **Tests** | Aucun, alors que `calcEngine` est purement fonctionnel et directement testable |
| **Intégration continue** | Aucune — le contrôle de syntaxe repose sur la discipline du contributeur |
| **Intégrité des CDN** | Les bibliothèques distantes sont chargées sans empreinte de contrôle ni politique de sécurité de contenu |
| **Taux USD et EUR** | Codés en dur dans `xofRate()` — seul le taux RMB est paramétrable |
| **Catégories** | Écrites en dur dans `seed-data.js`, non configurables par l'utilisateur |
| **Rendu** | Régénération complète du balisage de la vue à chaque mutation, sans DOM virtuel |
| **Sauvegarde** | Les images base64 sont incluses dans l'instantané JSON — les sauvegardes observées pèsent 1,1 à 1,4 Mo |

---

*Document établi à partir d'une analyse directe du code — 13 fichiers, 6 060 lignes, `DATA_VER = 4`.*
