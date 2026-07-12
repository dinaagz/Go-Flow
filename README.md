# Go.Flow — Console Import Go Group

> Application web de gestion des importations pour **Go Group** (Lomé, Togo).
> Catalogue produits, fournisseurs, transitaires, simulation de coûts, devis PDF, import en masse et export d'images — tout en un seul fichier HTML.

🔗 **Live** : [go-flow-phi.vercel.app](https://go-flow-phi.vercel.app)

---

## Présentation

Go.Flow est une console d'import statique (single-page HTML, ~4 400 lignes, sans framework ni build) conçue pour Go Group, entreprise togolaise spécialisée dans l'import d'équipements esthétiques et médicaux professionnels depuis la Chine. Elle centralise :

- Le **catalogue produit** avec galeries photos, prix et calculs automatiques
- La gestion des **fournisseurs** (Alibaba, contacts, devis PDF)
- La gestion des **transitaires** (tarifs tout-compris maritime/aérien)
- Un **simulateur de commande** complet (transport, remise, TVA interne)
- Un **générateur de devis client** avec export PDF configurable
- L'**import en masse** (CSV, Excel, PDF, HTML) et l'**export d'images produit** design

Aucun serveur, aucune base de données — tout fonctionne en `localStorage` et s'exporte en PDF, CSV, PNG ou ZIP.

---

## Sections de l'application

L'interface adopte un layout SaaS : sidebar fixe sur desktop (nav horizontale sur mobile), topbar en verre, icônes SVG inline (style Lucide). Cinq sections :

**Catalogue · Fournisseurs · Transitaires · Simulation · Devis**

---

## Fonctionnalités

### 📦 Catalogue
- **37 produits pré-chargés** dans 8 catégories : Hydrafacial, Picolaser/Tatouage, Analyse de peau, RF Microneedling, HIFU, Photothérapie LED, Équipement & Accessoires, Dentaire
- Galeries photos (jusqu'à 3 images cliquables par produit, servies depuis le CDN raw GitHub)
- Vue **grille** et vue **tableau**, filtres texte / catégorie / fournisseur
- **Sélecteur de colonnes universel** (voir plus bas) + bouton « Voir détails » (œil) ouvrant une fiche complète — pratique sur mobile où les colonnes secondaires sont masquées par défaut
- **Mode Groupé** : les 37 produits se regroupent en **13 groupes** (clé `grp`) pour comparer les fournisseurs d'un même équipement
- **Import** en masse et **Export image** directement depuis la toolbar

### ⊞ Mode Groupé (comparaison fournisseurs)
- Un seul produit « gagnant » affiché par groupe selon la **stratégie prix** choisie :
  - 🏷️ **Prix bas** — fournisseur le moins cher (défaut)
  - ⭐ **Meilleure qualité** — meilleure évaluation fournisseur
  - ⚖️ **Meilleur rapport** — meilleur ratio marge/prix
- Vue grille : badge `+N fournisseurs` → accordéon des alternatives avec bouton **Choisir**
- Vue tableau : bouton ▶/▼ pour déplier les lignes alternatives
- Le choix manuel est persisté en `localStorage` (`gf_win`)

### 💰 Moteur de calcul (`calcEngine`)
Tous les prix passent par un moteur unique en 3 étapes :

```
ÉTAPE 1 — Coût de revient HT (devise source)
  Coût d'achat HT     = Prix EXW × Qté + Fret local
  + Frais de transfert de fonds (% ou montant fixe)
  + Trade Assurance   (optionnelle, % ou fixe)
  = Coût de revient HT (unitaire = / Qté)

ÉTAPE 2 — Prix de Vente HT (XOF) — conversion AVANT marge
  Coût revient U (XOF) = Coût revient unitaire × taux de change
  Marge U              = Coût revient U (XOF) × taux de marge %
  Prix de Vente U HT   = Coût revient U (XOF) + Marge U (− remise éventuelle)

ÉTAPE 3 — Prix de Vente TTC (estimation)
  Frais logistiques    = Aérien : kg × Qté × tarif/kg | Maritime : CBM × Qté × tarif/CBM
                         (tarifs TOUT-COMPRIS : fret + douane + taxes)
  Prix de Vente TTC    = Prix de Vente HT + Frais logistiques
```

**Règle TVA** : la TVA n'est **jamais** ajoutée par-dessus les frais logistiques (déjà tout-compris). La TVA interne n'apparaît en ligne séparée que pour les clients professionnels assujettis, calculée sur la marchandise HT.

### 🏭 Fournisseurs
- 2 fournisseurs par défaut avec données réelles :
  - **Shaanxi Yateli Technology Limited** — Bailey · bailey@hkyateli.com · +86 187 9265 6926
  - **Oman Medical Beauty Manufacture** — Clara Xiang · clara@omancn.com · +86 173 9193 0659
- Logo, email cliquable, WhatsApp, WeChat, badge Alibaba vérifié, lien vers le store Alibaba
- Bouton **Devis PDF** (devis fournisseurs dans `assets/Quotes/`)
- Import d'une fiche fournisseur depuis une page HTML (voir Import en masse)

### 🚢 Transitaires
- 1 transitaire par défaut : **E & C Logistics** (groupage.cn, Chine → Afrique de l'Ouest)
- Tarifs **tout-compris** : 230 000 XOF/CBM maritime · 11 000 XOF/kg aérien
- Délais de livraison, routes, logo ; les tarifs par transitaire priment sur les tarifs globaux

### 🧮 Simulation
- Sélection produit + fournisseur + transitaire + quantité + mode de transport (Maritime/Aérien)
- Remise, Trade Assurance, TVA interne pour clients assujettis
- Récapitulatif détaillé suivant les 3 étapes du moteur de calcul

### 📄 Devis client
- Panier multi-produits avec stratégie de prix par devis
- **Export PDF configurable** : colonnes au choix (préférence séparée `pdf`), bloc prix toujours inclus (Prix unitaire HT · Qté · Prix total HT · Frais logistiques · Prix total TTC)
- Les colonnes internes (coût de revient, marge, EXW) ne sont **jamais** exportables sur le PDF client
- Case « client assujetti » pour afficher la ligne TVA interne

### 🗂️ Sélecteur de colonnes universel
Un composant unique gère la visibilité des colonnes pour **Catalogue / Simulation / Devis / PDF** :
- Dropdown avec compteur `visibles/total`, « Tout afficher », « Réinitialiser »
- Sur mobile (<768 px), les colonnes non essentielles sont auto-masquées tant que l'utilisateur n'a pas personnalisé la vue
- Préférences persistées en `localStorage` (`gf_cols`), robustes aux ajouts/suppressions de colonnes dans le code

### 📥 Import en masse
Boutons « Importer » dans Catalogue / Fournisseurs / Transitaires :
- **CSV** (parseur natif, délimiteur auto), **Excel** (SheetJS chargé à la demande), **PDF** (pdf.js + heuristique nom/prix), **HTML** (parse riche : titres, paragraphes, images, contacts)
- Interface de **mapping de colonnes** avec auto-détection des entêtes (dernier mapping mémorisé) et aperçu éditable
- **Images produit** : colonne URL d'image, upload en masse (redimensionnées en JPEG 700 px) avec auto-affectation par nom de fichier, ZIP des images extraites
- HTML fournisseur/transitaire → **fiche pré-remplie** (nom, logo, description, contacts, routes) avec aperçu en direct
- Validation (doublons, emails, prix), traitement par lots avec barre de progression, résumé ok/avertissements

### 🖼️ Export d'images produit
Mode sélection dans le Catalogue → modal de personnalisation :
- **6 templates** de rendu 1080×1080 (classique, gradient, nuit, minimal, badge, catalogue), couleurs fond/texte, position du wordmark Go.Group
- **Lignes d'infos** configurables (les 13 infos du catalogue, cochables et réordonnables par drag & drop ; par défaut synchronisées avec les colonnes visibles du catalogue)
- Téléchargement en PNG individuels ou en **ZIP** (writer ZIP intégré, sans dépendance)

### 📤 Autres exports
- **CSV** : catalogue complet avec toutes les colonnes de calcul
- **PDF** : impression de la vue active (colonne Actions masquée à l'impression)
- **Audit** : journal des calculs et actions (changements de paramètres, devis générés, imports, exports) exportable en JSON depuis le panneau Paramètres

---

## Structure du dépôt

```
Go-Flow/
├── index.html                  # Application complète (single-file : CSS + HTML + JS)
├── assets/
│   ├── Products images/        # Photos produits (séries 1 et 2, JPEG)
│   ├── Quotes/                 # Devis PDF des fournisseurs
│   └── supplier/               # Logos fournisseurs (Yateli, Oman Beauty)
├── CLAUDE.md                   # Guide technique du projet
└── README.md
```

---

## Paramètres globaux (modifiables in-app)

| Paramètre | Valeur par défaut |
|-----------|------------------|
| Taux de change XOF/RMB | 95 |
| Frais logistiques aérien (tout-compris) | 11 000 XOF/kg |
| Frais logistiques maritime (tout-compris) | 230 000 XOF/CBM |
| Taux de marge cible | 35 % |
| Frais de transfert de fonds | 0 % (taux ou montant fixe) |
| Trade Assurance | désactivée (1,5 % si activée) |
| TVA interne (clients assujettis) | 18 % |

---

## Technologies

- HTML5 / CSS3 / JavaScript vanilla — aucune dépendance au chargement (SheetJS et pdf.js chargés à la demande pour l'import Excel/PDF uniquement)
- Polices : Montserrat (titres/chiffres) + Poppins (texte) via Google Fonts
- Persistance : `localStorage` (clés `gf_s`, `gf_p`, `gf_f`, `gf_t`, `gf_cols`, `gf_win`, `gf_audit`, `gf_imp`, `gf_exp`)
- Images : URLs raw GitHub CDN (CORS ok pour l'export canvas)
- Déploiement : [Vercel](https://vercel.com)

---

## Développement & déploiement

L'application est statique — aucun build, n'importe quel hébergeur suffit.

```bash
# Cloner et ouvrir directement
git clone https://github.com/dinaagz/Go-Flow.git
open Go-Flow/index.html

# Ou servir localement (évite les soucis CORS sur les images)
python3 -m http.server 8080
```

Vérifier la syntaxe JS avant de committer :

```bash
sed -n '/<script>/,/<\/script>/p' index.html | grep -v '<script>' | grep -v '</script>' > /tmp/test.js && node --check /tmp/test.js
```

---

## Identité visuelle

- **Dégradé de marque** : Rouge `#FF2244` → Orange `#FF6600` → Jaune `#FFD700` → Vert `#00CC77` → Bleu `#0099FF` → Violet `#7733FF`
- Badges fournisseurs : Yateli = bleu · Oman = violet

---

## À propos de Go Group

Go Group rend le commerce international et le marketing digital accessibles à tout entrepreneur africain — en centralisant l'import, la distribution et la visibilité en un seul partenaire fiable et réactif.

📧 globalgo.tg@gmail.com · 📞 +228 96 02 39 03 · 📍 Lomé, Togo · *Promis. Livré.*
