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
  bleu-canal: "#006ACC"
  vert-marge: "#007A47"
  orange-terre: "#C2500A"
  rouge-alerte: "#D6103A"
  nuit-lome: "#1A1A2E"
  nuit-2: "#252540"
  nuit-3: "#2E2E50"
  gris-atelier: "#f5f5f7"
  bordure: "#e0e0e8"
  encre: "#1a1a2e"
  sourdine: "#6b7280"
  ok: "#065F46"
  ok-bg: "#d1fae5"
  err: "#B91C1C"
  err-bg: "#fee2e2"
  warn: "#856404"
  warn-bg: "#fff3cd"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "22px"
    fontWeight: 900
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "15px"
    fontWeight: 700
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Poppins, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Poppins, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.5px"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  modal: "16px"
  pill: "20px"
spacing:
  xs: "5px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.bleu-canal}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "9px 16px"
  button-primary-hover:
    backgroundColor: "#005CB3"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "9px 16px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.xl}"
  badge-fournisseur:
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
---

# Design System: Go.Flow

## 1. Overview

**Creative North Star: « Le Comptoir Lomé–Shenzhen »**

Go.Flow est un comptoir de négoce moderne : un outil de travail dense et sûr de lui, où l'on compare, calcule et tranche. La personnalité vient d'en haut — la bande spectrale six couleurs, le logo Montserrat 900, l'en-tête nuit — puis l'interface se tait et laisse parler les chiffres sur des surfaces blanches posées sur un gris d'atelier. La densité est assumée (c'est un outil professionnel utilisé des heures durées), la voix est française, les montants sont en XOF au format `fr-FR`.

Le système rejette explicitement le gabarit d'admin générique et le SaaS délavé (voir PRODUCT.md) : ici aucun texte porteur d'information ne descend sous 4,5:1 de contraste, et aucune décoration ne passe devant une donnée. Le spectre Go est une signature, pas un papier peint : il apparaît en bande de 4 px, en encadré de CTA et en logo — nulle part ailleurs.

**Key Characteristics:**
- Console produit dense, claire, à onglets — light theme sur gris d'atelier
- Identité portée par le spectre six couleurs et Montserrat 900, dosée par touches
- Chaque teinte de marque a une jumelle « text-safe » pour le texte sur fond clair
- Le vert signifie marge/gagnant, le bleu signifie action/prix de vente — jamais l'inverse
- L'impression (devis PDF) est une surface de premier rang avec ses propres styles

## 2. Colors: Le Spectre Go

Une palette à deux étages : six teintes de marque vives pour la signature et les fonds sombres, et leurs jumelles profondes pour tout texte posé sur fond clair.

### Primary
- **Bleu Canal** (#006ACC) : la couleur d'action et d'argent-client — boutons primaires, prix TTC, liens, sélection active. C'est la version « text-safe » (5,34:1 sur blanc) du bleu de marque.
- **Bleu de marque** (#0099FF) : réservé aux emplois non textuels — soulignement de l'onglet actif, bordures d'état actif, accent-color des cases.

### Secondary
- **Vert Marge** (#007A47) : marge, profit, fournisseur gagnant — sur fonds clairs (5,42:1). Sa version vive **#00CC77** ne s'emploie que sur la nuit (panneau simulation, barre de totaux) où elle atteint 8:1.
- **Or Total** (#FFD700) : les totaux sur fond nuit uniquement (12,2:1 sur #1A1A2E). Jamais de jaune sur fond clair.

### Tertiary
- **Rouge Alerte** (#D6103A), **Orange Terre** (#C2500A), **Violet** (#7733FF) : compteur panier, badges fournisseurs « autres », badge Oman. Les six teintes vives (#FF2244, #FF6600, #FFD700, #00CC77, #0099FF, #7733FF) ne cohabitent toutes que dans le dégradé `--grad`.

### Neutral
- **Nuit Lomé** (#1A1A2E) : encre du texte, en-tête, en-têtes de tableaux, panneaux récapitulatifs sombres.
- **Gris Atelier** (#f5f5f7) : fond de page et surfaces secondaires.
- **Bordure** (#e0e0e8) : filets 1px de toutes les surfaces.
- **Sourdine** (#6b7280) : libellés secondaires sur blanc uniquement (4,83:1).
- **Sémantiques** : `--ok` #065F46 / `--err` #B91C1C / `--warn` #856404, chacun avec son fond pastel dédié — succès, danger, devis en attente. Toujours par paires token, jamais en hexadécimal inline.

### Named Rules
**La Règle du Spectre.** Le dégradé six couleurs apparaît uniquement en intégralité et dans l'ordre rouge → violet (bande de marque, bordure du CTA, logo). Jamais tronqué, jamais inversé, jamais en fond de section.

**La Règle de la Jumelle.** Toute teinte de marque posée en texte sur fond clair passe par sa jumelle « -t » (#006ACC, #007A47, #C2500A, #D6103A). La version vive est décorative ou réservée aux fonds nuit. Test : si un chiffre est sous 4,5:1, c'est la mauvaise jumelle.

**La Règle du Vert.** Le vert veut dire marge, profit, gagnant — rien d'autre. Un vert décoratif est interdit.

## 3. Typography

**Display Font:** Montserrat (sans-serif, graisses 700–900)
**Body Font:** Poppins (sans-serif, graisses 300–600)

**Character:** Montserrat compte, Poppins parle. Les titres, le logo et surtout les montants sont en Montserrat lourd — les chiffres sont l'interface ; Poppins porte les libellés, formulaires et textes courants avec rondeur et lisibilité.

### Hierarchy
- **Display** (900, 22px) : le logo Go.Flow et l'en-tête d'impression (26–28px).
- **Headline** (700, 15px) : titres de sections et de panneaux (`sec-hdr`), h2.
- **Title** (700, 13–17px, lh 1.3) : titres de cartes produit, titres de modales, valeurs de stats (800, 22px).
- **Body** (400–500, 13px) : formulaires, boutons, tableaux (12px en cellules denses — densité légitime pour un outil).
- **Label** (600, 11px, +0.5px, MAJUSCULES) : libellés de champs (`flbl`) et titres de colonnes du sélecteur. C'est le seul emploi de majuscules espacées du système — pas d'« eyebrow » de section.

### Named Rules
**La Règle du Montant.** Un montant important est toujours en Montserrat 700+ et jamais plus petit que le texte qui le décrit. Prix TTC en Bleu Canal, marge en Vert Marge.

## 4. Elevation

Système plat tenu par les filets : chaque surface blanche porte une bordure 1px (#e0e0e8) et une ombre ambiante douce (`0 1px 3px rgba(0,0,0,.07)`). La profondeur est une réponse à l'état, pas un décor : au survol, les cartes passent à `0 4px 16px rgba(0,0,0,.11)` avec un lift de −2px ; les surfaces flottantes (menus de colonnes, modales) montent d'un cran d'ombre. L'en-tête nuit porte l'ombre la plus marquée (`0 2px 20px rgba(0,0,0,.3)`) pour asseoir la barre de marque.

### Shadow Vocabulary
- **Repos** (`0 1px 3px rgba(0,0,0,.07)`) : cartes et surfaces posées.
- **Survol** (`0 4px 16px rgba(0,0,0,.11)`) : cartes interactives, avec `translateY(-2px)`.
- **Flottant** (`0 8px 24px rgba(0,0,0,.12)`) : dropdowns et sélecteurs de colonnes.
- **Modal** (`0 20px 60px rgba(0,0,0,.3)`) : boîtes de dialogue sur voile `rgba(0,0,0,.5)`.

### Named Rules
**La Règle de l'Échelle Z.** Les z-index suivent l'échelle sémantique 10 (badge) < 99 (onglets) < 100 (en-tête) < 150 (dropdown) < 200 (modale) < 300 (toast) < 400 (skip-link). Toute valeur hors échelle est interdite.

## 5. Components

### Buttons
- **Shape:** coins arrondis moyens (8px ; 6px en `btn-sm`)
- **Primary:** Bleu Canal (#006ACC) texte blanc, padding 9px 16px ; hover #005CB3
- **Secondary:** blanc, filet bordure, texte encre ; hover gris atelier
- **Danger / Succès:** fonds pastel `--err-bg` / `--ok-bg` avec texte `--err` / `--ok`
- **CTA signature (`btn-grad`):** surface Nuit Lomé encadrée du spectre complet (`border: 2px` en dégradé via double background) — réservé aux actions de livraison (« Générer le PDF »)
- **Focus:** anneau global `:focus-visible` 2px Bleu de marque, décalé de 2px
- **Tactile:** ≥ 43px de hauteur sous `pointer: coarse`, densité souris intacte

### Cards / Containers
- **Corner Style:** 12px (cartes), 16px (modales), 10px (panneaux)
- **Background:** blanc sur Gris Atelier ; panneaux récapitulatifs en Nuit Lomé texte blanc
- **Shadow Strategy:** repos → survol avec lift (voir Elevation)
- **Border:** toujours 1px #e0e0e8 — jamais de bande latérale colorée
- **Internal Padding:** 14px (corps de carte), 20px (panneaux)

### Inputs / Fields
- **Style:** blanc, filet 1px bordure, 8px de rayon, Poppins 13px, padding 9px 12px
- **Label:** `flbl` 11px MAJUSCULES sourdine, toujours associé (`for=`)
- **Focus:** bordure Bleu de marque + anneau `:focus-visible`
- **Requis:** `required` + astérisque dans le libellé ; erreurs signalées par toast `role="status"`

### Navigation
- **Onglets** (`role="tablist"`) : boutons Poppins 13px, sourdine au repos, encre + soulignement 3px Bleu de marque à l'actif ; hover Bleu Canal ; flèches ←/→ au clavier, tabindex tournant. En-tête sticky nuit au-dessus, libellés repliés en icônes sous 640px.

### Badge fournisseur (composant signature)
Pastille pill (20px) posée sur la photo produit : fond de marque assombri à 92% d'opacité (`rgba(0,106,204,.92)` Yateli, violet Oman, orange terre autres), texte blanc 10px 700, backdrop-blur 4px. C'est le repère d'origine fournisseur dans toute la grille.

### Toast
Bande Nuit Lomé en bas-droite, pastille d'état (verte/rouge) en tête, filet blanc 18%, `role="status" aria-live="polite"`, z-index 300, respecte la safe-area.

## 6. Do's and Don'ts

### Do:
- **Do** passer tout texte coloré sur fond clair par les jumelles text-safe (#006ACC, #007A47, #C2500A, #D6103A) — 4,5:1 minimum, sans exception.
- **Do** réserver le spectre complet aux trois emplois signés : bande 4px, bordure du CTA, logo.
- **Do** garder les montants en Montserrat lourd, Prix TTC en Bleu Canal, marge en Vert Marge, totaux en Or sur nuit.
- **Do** donner à chaque contrôle ses états (hover, focus visible, actif, désactivé) et ≥ 43px au tactile.
- **Do** soigner l'impression : tout nouvel élément d'interface déclare son comportement `@media print`.

### Don't:
- **Don't** ressembler au « gabarit d'admin générique Bootstrap/AdminLTE » ni au « SaaS délavé » nommés dans PRODUCT.md — pas de gris clair « élégant » sur les chiffres.
- **Don't** poser de bande latérale colorée (`border-left` > 1px) sur cartes, alertes ou toasts — filet complet, fond teinté ou pastille à la place.
- **Don't** utiliser de jaune ou de vert vif (#FFD700, #00CC77) en texte sur fond clair.
- **Don't** écrire un hexadécimal d'état inline — les paires `--ok/--err/--warn` + fonds existent pour ça.
- **Don't** animer une propriété de layout (`max-height`, `width`) ni oublier l'alternative `prefers-reduced-motion`.
- **Don't** sortir de l'échelle z sémantique ou inventer un 999.
