---
name: Go.Flow
description: Console d'import Go Group — catalogue multi-fournisseurs, coût de revient et devis clients
colors:
  rouge: "#FF2244"
  orange: "#FF6600"
  jaune: "#FFD700"
  vert: "#00CC77"
  bleu: "#0099FF"
  violet: "#7733FF"
  nuit: "#1A1A2E"
  nuit-2: "#252540"
  nuit-3: "#2E2E50"
  gris-atelier: "#F4F6FA"
  surface: "#FFFFFF"
  bordure: "#E5E8F1"
  bordure-2: "#D5DBE8"
  encre: "#1A1D33"
  sourdine: "#66708A"
  bleu-canal: "#006ACC"
  vert-marge: "#00794A"
  orange-terre: "#C2500A"
  rouge-alerte: "#D6103A"
  ok: "#065F46"
  ok-bg: "#E3F7EE"
  ok-brd: "#A9E8CC"
  err: "#B91C1C"
  err-bg: "#FDEBED"
  err-bg2: "#FAD4D9"
  err-solid: "#DC2626"
  warn: "#7A5905"
  warn-bg: "#FFF6DC"
  warn-brd: "#F0C838"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "21px"
    fontWeight: 900
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "13.5px"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Poppins, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Poppins, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    letterSpacing: "0.6px"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "10px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.bleu-canal}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "9px 15px"
  button-primary-hover:
    backgroundColor: "#005CB3"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.encre}"
    rounded: "{rounded.sm}"
    padding: "9px 15px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.encre}"
    rounded: "{rounded.sm}"
    padding: "10px 13px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "14px"
  badge-fournisseur:
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: Go.Flow

## 1. Overview

**Creative North Star: « Le Cockpit Go Group »**

Go.Flow s'est refait le visage : d'un comptoir de négoce dense en cartes plates, l'interface est devenue un cockpit professionnel — sidebar de navigation persistante, icônes SVG fines remplaçant les emoji, ombres douces à plusieurs paliers, verre dépoli fonctionnel sur les surfaces qui flottent au-dessus du contenu (en-tête, modales, sidebar mobile). L'esprit reste le même : les chiffres pilotent, la décoration s'efface. Mais la texture a gagné en maturité — c'est l'écran d'un outil qu'on utilise huit heures par jour, pas une brochure.

Le système continue de rejeter le gabarit d'admin générique et le SaaS délavé (voir PRODUCT.md) : chaque texte porteur d'information reste ≥ 4,5:1, chaque couleur garde un rôle unique. Le spectre Go, lui, s'autorise un quatrième emplacement — la devise sous le logo — sans perdre sa rareté ailleurs.

**Key Characteristics:**
- Cockpit produit à sidebar persistante — light theme sur gris atelier, icônes SVG fines (pas d'emoji)
- Identité portée par le spectre six couleurs, dosée à quatre emplacements précis, jamais en fond de section
- Verre dépoli fonctionnel (blur) réservé aux surfaces sticky/flottantes — jamais décoratif sur du contenu statique
- Chaque teinte de marque a une jumelle « text-safe » pour le texte sur fond clair
- Le vert signifie marge/gagnant, le bleu signifie action/prix de vente — jamais l'inverse
- L'impression (devis PDF) reste une surface de premier rang avec ses propres styles

## 2. Colors: Le Spectre Go

Une palette à deux étages : six teintes de marque vives pour la signature et les fonds sombres, leurs jumelles profondes pour tout texte posé sur fond clair, et un jeu de neutres légèrement bleutés (nouveau depuis la refonte : `--gris-atelier` #F4F6FA, `--encre` #1A1D33) plus froids que l'ancienne version.

### Primary
- **Bleu Canal** (#006ACC) : action et argent-client — boutons primaires, prix TTC, liens, sélection active. Jumelle « text-safe » du bleu de marque (5,3:1 sur blanc).
- **Bleu de marque** (#0099FF) : emplois non textuels — soulignement d'onglet actif, anneau de focus, bordures d'état actif, accent-color des cases à cocher.

### Secondary
- **Vert Marge** (#00794A) : marge, profit, fournisseur gagnant, sur fonds clairs. Sa version vive **#00CC77** reste réservée aux fonds nuit (panneau simulation, barre de totaux) où elle atteint un contraste élevé.
- **Or Total** (#FFD700) : totaux sur fond nuit uniquement. Jamais de jaune sur fond clair.

### Tertiary
- **Rouge Alerte** (#D6103A), **Orange Terre** (#C2500A), **Violet** (#7733FF) : compteur panier, badges fournisseurs, icône stat « Catégories ». Les six teintes vives ne cohabitent toutes que dans le dégradé `--grad`.

### Neutral
- **Nuit** (#1A1A2E) : encre de marque, panneaux sombres, footer d'impression.
- **Encre** (#1A1D33) : texte courant — plus froid que le nuit de marque, réservé au corps de texte (contraste 16,6:1 sur blanc).
- **Gris Atelier** (#F4F6FA) : fond de page.
- **Surface** (#FFFFFF) : cartes, panneaux, modales.
- **Bordure / Bordure 2** (#E5E8F1 / #D5DBE8) : filets 1px au repos / au survol.
- **Sourdine** (#66708A) : libellés secondaires (4,9:1 sur blanc).
- **Sémantiques** : `--ok` / `--err` / `--warn`, chacun avec sa paire de fonds pastel — jamais de couleur d'état inline.

### Named Rules
**La Règle du Spectre (v2 — quatre emplacements).** Le dégradé six couleurs apparaît en intégralité et dans l'ordre rouge → violet, à quatre emplacements signés et pas un de plus : la bande de marque, la bordure du CTA de livraison, le logo, et la devise « Promis. Livré. » sous le logo — son extension naturelle. Jamais tronqué, jamais inversé, jamais en fond de section, jamais sur un cinquième élément sans mise à jour de cette règle.

**La Règle de la Jumelle.** Toute teinte de marque posée en texte sur fond clair passe par sa jumelle « -t » (#006ACC, #00794A, #C2500A, #D6103A). La version vive est décorative ou réservée aux fonds nuit. Test : si un chiffre est sous 4,5:1, c'est la mauvaise jumelle.

**La Règle du Vert.** Le vert veut dire marge, profit, gagnant — rien d'autre.

## 3. Typography

**Display Font:** Montserrat (sans-serif, graisses 700–900)
**Body Font:** Poppins (sans-serif, graisses 400–700)
**Label/Mono Font:** ui-monospace / SFMono-Regular (références produit uniquement)

**Character:** Montserrat compte, Poppins parle, le mono identifie. Les montants, titres et logo restent en Montserrat lourd ; Poppins porte formulaires et texte courant ; la police mono, nouvelle depuis la refonte, isole visuellement les références produit (`HYD-001-001`) du reste du texte — un signal de donnée technique, pas une décoration.

### Hierarchy
- **Display** (900, 21px, -0.02em) : logo Go.Flow, en-tête d'impression (26–28px).
- **Headline** (700, 15px) : titres de sections (`sec-hdr`), h2.
- **Title** (700, 13,5px, lh 1,35) : titres de cartes produit, titres de modales (800, 17px), valeurs de stats (800, 21px).
- **Body** (400–500, 13px) : formulaires, boutons ; 11,5–12,5px en tableaux et cellules denses — densité légitime pour un outil professionnel.
- **Label** (600, 10,5px, +0,6px, MAJUSCULES) : libellés de champs, en-têtes de colonnes de tableau, titres de section de sidebar.
- **Mono** (400, 10px) : références produit uniquement (`.card-ref`, `td code`).

### Named Rules
**La Règle du Montant.** Un montant important est toujours en Montserrat 700+, jamais plus petit que le texte qui le décrit, en `font-variant-numeric: tabular-nums`. Prix TTC en Bleu Canal, marge en Vert Marge.

## 4. Elevation

Système à double langage depuis la refonte : l'ancien modèle plat-par-défaut-avec-filets coexiste avec un vrai jeu de cinq ombres (`--sh-xs` à `--sh-xl`) et un verre dépoli fonctionnel sur les surfaces qui se superposent au contenu en défilant (en-tête sticky, en-têtes de modale, sidebar mobile). Le blur n'est jamais appliqué à une carte ou un panneau statique — uniquement à ce qui reste visible par-dessus du contenu qui défile en dessous. Chaque surface garde son filet 1px ; l'ombre répond à l'état (repos → survol → flottant → modal).

### Shadow Vocabulary
- **xs** (`0 1px 2px rgba(18,22,48,.05)`) : boutons et contrôles au repos.
- **sm** (`0 1px 3px rgba(18,22,48,.07), 0 1px 2px rgba(18,22,48,.04)`) : cartes et panneaux posés.
- **md** (`0 8px 20px -6px rgba(18,22,48,.12), 0 2px 6px -2px rgba(18,22,48,.06)`) : survol des cartes (avec `translateY(-3px)`), boutons primaires au survol.
- **lg** (`0 16px 44px -10px rgba(18,22,48,.18)`) : dropdowns, toast, barre d'export flottante.
- **xl** (`0 24px 70px -14px rgba(18,22,48,.3)`) : modales.

### Named Rules
**La Règle du Verre Fonctionnel.** `backdrop-filter: blur()` est réservé aux surfaces `position: sticky` ou `fixed` qui se superposent à du contenu défilant (en-tête, en-tête de modale, sidebar mobile, badges sur photo). Jamais de glassmorphism sur une carte ou un panneau statique — ce serait la dérive décorative interdite par le socle du skill.

**La Règle de l'Échelle Z.** Les z-index suivent une échelle ascendante sans valeur arbitraire : 2 (en-tête de tableau) < 5 (en-tête de modale, coche d'export) < 10 (badge panier) < 99 (sidebar mobile) < 100 (sidebar) < 120 (en-tête) < 130 (bande de marque) < 150 (dropdown) < 180 (barre d'export) < 200 (voile modal) < 300 (menu utilisateur, toast) < 400 (skip-link). Un 999 est toujours une erreur.

## 5. Components

### Buttons
- **Shape:** coins arrondis (10px ; 8px en `btn-sm`)
- **Primary:** Bleu Canal (#006ACC) texte blanc, ombre xs au repos, `#005CB3` + ombre md au survol
- **Secondary / Ghost:** blanc ou transparent, filet `bordure-2`, texte encre
- **Danger / Succès:** fonds pastel `--err-bg` / `--ok-bg`
- **CTA signature (`btn-grad`):** surface Nuit encadrée du spectre complet — réservé à « Générer le PDF »
- **Focus:** anneau `:focus-visible` 2px Bleu de marque + `--ring` (halo `rgba(0,153,255,.2)`) sur les champs
- **Tactile:** ≥ 44px sous `pointer: coarse`, densité souris intacte

### Navigation (sidebar — nouveau composant signature)
Sidebar persistante à gauche (228px), sections en majuscules espacées (`.sb-sec`), items avec icône + libellé, fond dégradé subtil `rgba(bleu,.1)→rgba(violet,.05)` et **liseré de 3px en dégradé Go** à gauche de l'item actif — l'affordance de navigation active standard (façon Linear/Notion), distincte des « bandes latérales colorées » interdites sur cartes et alertes : ici elle indique une position, pas un statut décoratif. Se réduit en barre horizontale sous 1024px, avec verre dépoli fonctionnel.

### Cards / Containers
- **Corner Style:** 14px (cartes), 16px (panneaux devis/simulation), 20px (modales)
- **Background:** blanc sur Gris Atelier ; panneaux récapitulatifs en dégradé nuit (`--nuit-2` → `--nuit`)
- **Shadow Strategy:** xs au repos → md au survol avec lift −3px (voir Elevation)
- **Border:** toujours 1px `--border` — jamais de bande latérale colorée

### Inputs / Fields
- **Style:** blanc, filet `--border-2`, 10px de rayon, padding 10px 13px
- **Label:** `flbl` 10,5px MAJUSCULES sourdine, toujours associé (`for=`)
- **Focus:** bordure Bleu de marque + halo `--ring` (glow doux, pas juste un contour)
- **Requis:** `required` + astérisque ; erreurs via toast `role="status"`

### Badge fournisseur
Pastille pill posée sur la photo produit : fond de marque assombri à 92 % d'opacité, texte blanc 10px 700, verre dépoli 6px. Repère d'origine fournisseur dans toute la grille.

### Toast
Carte blanche (pas nuit, depuis la refonte) en bas-droite, pastille d'état en tête avec halo `color-mix`, filet `--border`, ombre `lg`, `role="status" aria-live="polite"`, z-index 300, respecte la safe-area.

## 6. Do's and Don'ts

### Do:
- **Do** passer tout texte coloré sur fond clair par les jumelles text-safe (#006ACC, #00794A, #C2500A, #D6103A) — 4,5:1 minimum, sans exception.
- **Do** réserver le spectre complet aux quatre emplacements signés : bande 4px, bordure du CTA, logo, devise « Promis. Livré. » — jamais un cinquième sans mettre à jour cette règle.
- **Do** réserver `backdrop-filter: blur()` aux surfaces sticky/fixed superposées à du contenu défilant — jamais sur une carte ou un panneau statique.
- **Do** garder les montants en Montserrat lourd et `tabular-nums`, Prix TTC en Bleu Canal, marge en Vert Marge, totaux en Or sur nuit.
- **Do** donner à chaque contrôle ses états (hover, focus visible, actif, désactivé) et ≥ 44px au tactile.
- **Do** soigner l'impression : tout nouvel élément d'interface déclare son comportement `@media print`.

### Don't:
- **Don't** ressembler au « gabarit d'admin générique Bootstrap/AdminLTE » ni au « SaaS délavé » nommés dans PRODUCT.md — pas de gris clair « élégant » sur les chiffres.
- **Don't** poser de bande latérale colorée (`border-left` > 1px) sur cartes, alertes ou toasts — le liseré actif de la sidebar est la seule exception documentée (affordance de position, pas de statut).
- **Don't** utiliser de jaune ou de vert vif (#FFD700, #00CC77) en texte sur fond clair.
- **Don't** écrire un hexadécimal d'état inline — les paires `--ok/--err/--warn` + fonds existent pour ça.
- **Don't** ajouter du verre dépoli décoratif sur une surface statique — seules les surfaces flottantes/sticky y ont droit.
- **Don't** animer une propriété de layout (`max-height`, `width`) sans alternative `prefers-reduced-motion`.
- **Don't** sortir de l'échelle z ascendante ou inventer un 999.
