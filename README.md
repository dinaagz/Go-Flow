# Go.Flow — Console Import Go Group

> Application web de gestion des importations pour **Go Group** (Lomé, Togo).
> Catalogue produits, suivi fournisseurs, simulation de coûts et export PDF/CSV — tout en un seul fichier HTML.

🔗 **Live** : [go-flow-phi.vercel.app](https://go-flow-phi.vercel.app)

---

## Présentation

Go.Flow est une console d'import statique (single-page HTML) conçue pour Go Group, entreprise togolaise spécialisée dans l'import d'équipements esthétiques et médicaux depuis la Chine. Elle centralise :

- Le **catalogue produit** avec photos, prix et calculs automatiques
- La gestion des **fournisseurs** (Alibaba, contacts, devis PDF)
- La gestion des **transitaires** (tarifs maritime/aérien)
- Un **simulateur de commande** complet avec TVA, marge et remise

Aucun serveur, aucune base de données — tout fonctionne en localStorage et s'exporte en PDF ou CSV.

---

## Fonctionnalités

### 📦 Catalogue
- 19 produits pré-chargés (Hydrafacial, Picolaser, Analyse de peau, RF Microneedling, HIFU)
- Photos des produits depuis les assets GitHub
- Vue **grille** et vue **tableau** avec sélecteur de colonnes personnalisable
- Colonnes obligatoires : Photo · Réf · Désignation · Actions
- Colonnes optionnelles (à cocher) : Catégorie · Fournisseur · CBM · Poids · Achat EXW · Préacheminement · Fret/Douane · Marge · Vente HT · Prix total HT · TTC · Prix marché
- Filtres : recherche texte, catégorie, fournisseur
- La colonne **Actions est masquée à l'impression** (PDF propre)

### 💰 Calcul des prix
La marge est calculée **uniquement sur le prix EXW** :

```
Marge (XOF)      = Prix EXW × taux de marge %
Vente HT         = Prix EXW + Marge  (avant remise)
Prix net HT      = Vente HT − Remise
Prix total HT    = Prix net HT + Préacheminement + Fret/Douane
TTC              = Prix total HT × (1 + TVA %)
```

Deux frais distincts :
- **Préacheminement** : transport du fournisseur vers le transitaire dans le pays d'achat (saisi par produit, donné par le fournisseur)
- **Fret/Douane** : frais de transport international et douane, calculés au CBM (maritime) ou au poids (aérien) — à la charge du client

### 🏭 Fournisseurs
- Fournisseurs par défaut intégrés avec données réelles :
  - **Shaanxi Yateli Technology Limited** — Bailey · bailey@hkyateli.com · +86 187 9265 6926
  - **Oman Medical Beauty Manufacture** — Clara Xiang · clara@omancn.com · +86 173 9193 0659
- Logo, email cliquable, WhatsApp cliquable, WeChat, badge Alibaba vérifié
- Lien direct vers le store Alibaba du fournisseur
- Bouton **Devis PDF** (lien vers les devis dans `assets/Quotes/`)
- **Import Alibaba** : coller une URL `.en.alibaba.com` pour pré-remplir automatiquement la fiche fournisseur

### 🚢 Transitaires
- Ajout de transitaires avec tarifs maritime (XOF/CBM) et aérien (XOF/kg)
- Délais de livraison, assurance, logo

### 🧮 Simulation
- Sélection produit + fournisseur + transitaire + quantité
- Choix du mode de transport (Maritime / Aérien)
- Remise, assurance, TVA (18 % par défaut, modifiable)
- Récapitulatif détaillé : EXW · Préacheminement · Fret/Douane · Marge · Vente HT · Prix total HT · TTC
- Export PDF du récapitulatif via impression

### 📥 Export
- **CSV** : catalogue complet avec toutes les colonnes de calcul
- **PDF** : impression de la vue active (colonnes Actions masquées)

---

## Structure du dépôt

```
Go-Flow/
├── index.html                  # Application complète (single-file)
├── assets/
│   ├── Products images/        # Photos des 11 équipements (JPEG)
│   ├── Quotes/                 # Devis PDF des fournisseurs
│   └── supplier/               # Logos fournisseurs (Yateli, Oman Beauty)
└── README.md
```

---

## Paramètres globaux (modifiables in-app)

| Paramètre | Valeur par défaut |
|-----------|------------------|
| Taux de change XOF/RMB | 95 |
| Fret aérien | 11 000 XOF/kg |
| Fret maritime | 230 000 XOF/CBM |
| Taux de marge cible | 35 % |
| TVA | 18 % |

---

## Technologies

- HTML5 / CSS3 / JavaScript vanilla (aucune dépendance)
- Polices : Montserrat + Poppins (Google Fonts)
- Persistance : `localStorage` (clés `gf_s`, `gf_p`, `gf_f`, `gf_t`)
- Images : URLs raw GitHub CDN
- Déploiement : [Vercel](https://vercel.com)

---

## Déploiement

L'application est statique — n'importe quel hébergeur suffit.

```bash
# Cloner et ouvrir directement
git clone https://github.com/dinaagz/Go-Flow.git
open Go-Flow/index.html
```

Ou déployer sur Vercel en pointant sur `index.html` à la racine.

---

## À propos de Go Group

Go Group rend le commerce international et le marketing digital accessibles à tout entrepreneur africain — en centralisant l'import, la distribution et la visibilité en un seul partenaire fiable et réactif.

📧 globalgo.tg@gmail.com · 📍 Lomé, Togo · *Promis. Livré.*
