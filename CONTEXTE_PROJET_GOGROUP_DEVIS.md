# GO GROUP — Document de transfert de projet

Document de contexte complet, à coller en début de nouvelle conversation Claude (ou nouveau projet) pour reprendre le travail sans rien perdre. Rédigé pour quelqu'un qui n'a aucun élément préalable.

---

## 1. Contexte général de l'entreprise

**Go Group** est une entreprise africaine basée à **Lomé, Togo**, spécialisée dans le commerce international et le marketing digital pour les entrepreneurs africains. Elle opère via trois sous-marques :

- **Go Ship** — import de produits depuis la Chine, logistique, sourcing, dédouanement
- **Go Shop** — distribution / vente en gros et au détail des produits importés
- **Go Digital** — marketing digital, community management, branding pour les clients

**Coordonnées officielles** : globalgo.tg@gmail.com · +228 96 02 39 03 · Lomé, Togo

**Contrainte budgétaire** : projet bootstrap, budget < 500 000 FCFA.

**Stratégie de marque** : construire la marque mère Go Group d'abord, puis décliner sur les sous-marques.

### Identité de marque déjà validée

- **Mission** : "Go Group rend le commerce international et le marketing digital accessibles à tout entrepreneur africain — en centralisant l'import, la distribution et la visibilité en un seul partenaire fiable et réactif."
- **Vision** : devenir le groupe panafricain de référence que les entrepreneurs choisissent en premier.
- **Valeurs** : Accessibilité, Fiabilité, Réactivité, Ancrage africain.
- **Système de 4 taglines** :
  - Principale : *"Accessible. Reliable. Always moving."* / *"Accessible. Fiable. En mouvement."*
  - Réseaux sociaux : *"Moving forward. Together."*
  - Devis/documents : *"Promis. Livré."*
  - Pitch/vision : *"Africa moves now." / "L'Afrique n'attend plus."*
- **Palette Spectre Go** (8 couleurs, dégradé arc-en-ciel fixe) :
  - Rouge `#FF2244` → Orange `#FF6600` → Jaune `#FFD700` → Vert `#00CC77` → Bleu `#0099FF` → Violet `#7733FF`
  - Neutres : Blanc `#FFFFFF`, Nuit `#1A1A2E`
  - Règle absolue : l'ordre du dégradé ne s'inverse jamais.
- **Typographie** : Montserrat Bold (titres) + Poppins Regular/Light (corps de texte), toutes deux gratuites sur Google Fonts/Canva.
- **Livrables brand déjà produits** : Brand Book v1.1 à v1.3, Guide Palette Spectre Go, mockups Instagram/stories/devis/signature email. Logo final pas encore arrêté (direction validée : lettrage fluide, dégradé multicolore, effet glossy façon TotalEnergies).

Ces éléments sont dans des fichiers projet séparés (Brand Book, Guide Palette) — ce document-ci couvre uniquement le **chantier outil de devis import / catalogue produits**, qui est un sujet distinct du branding.

---

## 2. Objectif du chantier "Outil de devis import Chine"

Le client de Go Ship envoie des photos de produits (matériel esthétique/cosmétique professionnel : hydrafacial, picolaser, HIFU, skin analyzer, RF microneedling). Go Group sollicite plusieurs fournisseurs chinois, reçoit leurs propositions, et doit produire un **devis complet et chiffré en FCFA (XOF)** incluant achat, fret, marge, et comparaison concurrentielle.

### Besoins exprimés par l'utilisatrice (cahier des charges initial)

1. Répertorier le retour de chaque fournisseur par produit (image, nom, specs, taille, poids, prix...)
2. Calculer le prix d'achat HT en XOF avec un taux de change du jour (défaut **95 XOF/RMB**, modifiable)
3. Analyse concurrentielle (meilleurs prix de vente du marché, rapport qualité-prix)
4. Calculer le meilleur prix de vente HT en XOF selon la concurrence + un taux de marge modifiable
5. Pouvoir appliquer une remise (montant ou %)
6. Calculer la marge en XOF par produit
7. Calculer CBM (taille), poids, et le fret selon le mode choisi (aérien/maritime, **maritime par défaut**), par produit individuellement, avec tarifs par défaut modifiables :
   - Aérien : **11 000 XOF/kg**
   - Maritime : **230 000 XOF/CBM**
8. Calculer le prix de vente TTC par produit

Puis l'utilisatrice a fourni un **cahier des charges étendu** pour transformer ça en véritable site web avec gestion de catalogue, fournisseurs, transitaires et simulateur de commande (voir section 5).

---

## 3. Données fournisseurs collectées (état brut, base de travail)

Deux fournisseurs ont répondu sur les mêmes familles de produits, ce qui permet une comparaison directe.

| # | Catégorie | Fournisseur | Désignation | Dimensions (L×l×H cm) | Poids | Prix (RMB) |
|---|---|---|---|---|---|---|
| 1 | Hydrafacial | Bailey | Hydrafacial 14-en-1 | 49×54×92 | 48kg | 2 999 |
| 2 | Hydrafacial | Bailey | Hydrafacial 17-en-1 | 54×122×60 | 55kg | 5 200 |
| 3 | Hydrafacial | Clara | Hydrafacial 17-en-1 (équiv. format) | 54×122×60 | 55kg | 6 372 |
| 4 | Hydrafacial | Bailey | Hydrafacial dôme LED + masque | 65×62×122 (+masque 55×48×46) | 50kg+5kg | 6 200 |
| 5 | Hydrafacial | Clara | Hydrafacial dôme LED + masque (équiv.) | 65×62×122 (+masque) | 50kg+5kg | 7 390 |
| 6 | Hydrafacial | Clara | Hydrafacial compact écran tactile | 54×51×101 | 48kg | 4 198 |
| 7 | Picolaser/Tatouage | Bailey | Picolaser grand modèle (écran 15.6") | 57×52×55 | 35kg | 8 999 |
| 8 | Picolaser/Tatouage | Clara | PICO (équiv. format) | 57×52×55 | 35kg | 10 109 |
| 9 | Picolaser/Tatouage | Bailey | Picolaser compact écran tactile | 43×57×56 | 24.5kg | 3 000 |
| 10 | Analyse de peau | Bailey | Skin Analysis compact 13.3" | 56×65×57 | 11kg | 4 500 |
| 11 | Analyse de peau | Clara | Skin Analysis compact 13.3" (équiv.) | 68×62×55 (colis) | 10kg | 5 558 |
| 12 | Analyse de peau | Bailey | Skin Analysis grand écran 15.6" | 68×59×44 | 18kg | 5 500 |
| 13 | Analyse de peau | Clara | Skin Analysis grand écran 15.6" (équiv.) | 67×59×44 (colis) | 20kg | 5 829 |
| 14 | RF Microneedling | Bailey | RF Microneedle stylo portable | 24×38×43 | 4kg | 1 500 |
| 15 | RF Microneedling | Clara | RF Microneedle stylo portable (équiv.) | 18×7×4 | 0.16kg | 2 025 |
| 16 | RF Microneedling | Bailey | RF Microneedle sur chariot | 50×50×103 | 28kg | **3 300** (voir note) |
| 17 | RF Microneedling | Clara | RF Microneedle sur chariot (équiv.) | 50×50×103 | 28kg | 3 730 |
| 18 | HIFU | Bailey | HIFU liftant visage/corps | 66×59×55 | 22kg | 3 900 |
| 19 | HIFU | Clara | HIFU liftant visage/corps (équiv.) | 62×55×56 | 27kg | 6 726 |

**Note ligne 16** : le tableau fournisseur Bailey affichait une incohérence (prix unitaire ¥3 300 vs total affiché ¥3 200). **Décision validée par l'utilisatrice : retenir 3 300 RMB** (le prix unitaire affiché).

### Images de référence client → produits fournisseurs associés (décision validée)

Le client a envoyé des photos de produits "modèles" (catalogues web, pas forcément les exacts modèles fournisseurs). Décision validée : **associer chaque image de référence au produit fournisseur le plus proche**, pas les ignorer ni les traiter comme produits à sourcer séparément.

| Référence client (image) | Catégorie associée |
|---|---|
| Hydra Beauty trolley / Mihoji (chariots avec flacons A/B/C/D, dôme LED) | Hydrafacial (lignes 1-6) |
| Sano ND-YAG laser / Sano tattoo removal / SL Super Laser | Picolaser / Tatouage (lignes 7-9) |
| Skin Analyzer capsule blanche / écran tablette | Analyse de peau (lignes 10-13) |
| Pylai Pen 4 (stylo portable) | RF Microneedling portable (lignes 14-15) |
| Morpheus8 by InMode (chariot avec écran) | RF Microneedling sur chariot (lignes 16-17) |
| HIFU 2-en-1 portable | HIFU (lignes 18-19) |

### Décisions méthodologiques validées par l'utilisatrice

- Les paires de produits au même format mais prix différents (Bailey vs Clara) sont **gardées comme produits distincts** dans le devis, pas fusionnées — pour permettre la comparaison.
- Fret calculé **par produit individuel**, pas sur le total de la commande groupée.
- Formats de livraison souhaités : **Excel (avec formules)** ET **outil interactif** — les deux ont été livrés (voir section 4).

---

## 4. Livrable 1 — Calculateur Excel (terminé)

**Fichier** : `GoGroup_Devis_Calculateur_Import.xlsx`
**Construit avec** : openpyxl, formules natives Excel (pas de valeurs codées en dur), vérifié avec le script `recalc.py` → **0 erreur de formule**, 216 formules au total.

### Structure du fichier

**Onglet "Hypothèses"** (paramètres globaux modifiables, fond jaune = à éditer) :
- Taux de change RMB → XOF : 95 (cellule B4)
- Tarif fret aérien : 11 000 XOF/kg (B5)
- Tarif fret maritime : 230 000 XOF/CBM (B6)
- Taux de marge cible (markup sur coût) : 35% (B7)
- TVA Togo : 18% (B8)

**Onglet "Devis Fournisseurs"** — 19 lignes produits (voir tableau section 3), avec 24 colonnes :
N°, Catégorie, Référence client associée, Fournisseur, Désignation/Modèle, Fonction, Dimensions, Poids (kg, **éditable en bleu**), CBM (calculé), Prix achat unitaire RMB (**éditable en bleu**), Prix achat HT XOF (=Prix RMB × Taux), Mode transport (**liste déroulante Maritime/Aérien**), Tarif fret unitaire (auto selon mode), Coût fret XOF, Coût total revient XOF, Prix marché concurrent XOF (**à remplir manuellement — actuellement vide, voir section 6**), Taux marge % (**éditable**, hérite de l'hypothèse par défaut), Prix vente HT calculé (= Coût total × (1+marge)), Remise % (**éditable**), Remise montant XOF (**éditable**), Prix vente net HT, Marge nette XOF, TVA % (**éditable**), Prix vente TTC XOF.

Ligne de totaux en bas (sommes automatiques).

### Logique de calcul (formules)
```
CBM = (Longueur × Largeur × Hauteur en cm) / 1 000 000
Prix achat HT (XOF) = Prix RMB × Taux de change
Coût fret = SI mode="Aérien" : Poids × Tarif aérien ; SINON : CBM × Tarif maritime
Coût total revient = Prix achat HT + Coût fret
Prix vente HT = Coût total revient × (1 + Taux de marge)
Prix vente net HT = Prix vente HT − Remise (% ou montant)
Marge nette = Prix vente net HT − Coût total revient
Prix vente TTC = Prix vente net HT × (1 + TVA%)
```

---

## 5. Livrable 2 — Calculateur interactif (widget de conversation, non persistant)

Un widget interactif a été généré dans la conversation (via l'outil visualizer de Claude) reprenant la même logique que l'Excel, avec curseurs/champs ajustables en direct (taux, fret, marge, remise, mode transport par produit) et cartes produits avec totaux en temps réel.

**⚠️ Important pour la suite du projet** : ce widget n'est **pas un fichier téléchargeable** — il vit dans l'historique de la conversation Claude.ai. S'il faut le reproduire dans une nouvelle conversation, il faudra redemander sa génération (le code source n'est pas repris ici car non réutilisable tel quel hors de l'outil Visualizer).

---

## 6. Livrable 3 — Site web "Console Import" (terminé, fichier HTML autonome)

**Fichier** : `GoGroup_Console_Import.html`
**Stack technique** : HTML + CSS + JavaScript vanilla, un seul fichier autonome (pas de build, pas de dépendances externes sauf police système). Persistance des données via l'API `window.storage` (stockage clé-valeur propre à Claude.ai Artifacts — données liées au navigateur/compte de l'utilisatrice, non partagées entre plusieurs utilisateurs).

### Cahier des charges qui a guidé la construction (fourni par l'utilisatrice, à reprendre tel quel si on doit re-spécifier)

Le site devait répertorier **4 bases** : Catalogue produits, Fournisseurs, Transitaires, + un module **Simulation de commande**. Détail des champs demandés par section :

**Nouveau Produit**
- Référence unique auto-générée format `XXX-XXX-XXX` : 3 lettres typologie (1ère, milieu, dernière lettre) + n° d'ordre dans la typologie + n° d'ordre global. Exemple : `EME-001-001`.
- Nom, Typologie, Fournisseur (liste), Description, Spécificités
- Prix EXW (devise RMB/USD/EUR/XOF au choix), Fret pré-acheminement (devise au choix)
- Unité (pièce/kg/carton...), MOQ
- Taille (L×l×H avec unité mm/cm/m), Poids (kg/g)
- Photos produit (max 3, formats png/jpeg/webp/jpg)

**Nouveau Fournisseur**
- Nom entreprise, Logo, Contact (nom/prénom), WhatsApp, WeChat, Pays, Domaine d'activité, Description activités, Année de fondation, Marchés principaux, Vérification Alibaba (Vérifié/Non vérifié/Non disponible), Lien profil Alibaba, Langues acceptées, Évaluation /5, Commentaire

**Nouveau Transitaire**
- Nom entreprise, Logo, Contact, WhatsApp, WeChat, Téléphone, Pays de départ/arrivée, Type de logistique (Maritime/Aérien/Routier/Multimodale), Entreposage (jours), Assurance transport (oui/non + % si oui), Tarifs maritime (XOF/CBM + délai) et aérien (XOF/kg + délai)

**Catalogue**
- Liste tous les produits, base pour calculs ultérieurs
- Calcul prix d'achat HT en XOF (taux 95 par défaut, modifiable)
- Analyse concurrentielle web — **non automatisée actuellement, voir limites ci-dessous**
- Calcul meilleur prix de vente HT selon concurrence + marge modifiable
- Calcul marge XOF par produit
- Calcul CBM, poids
- Import Excel/PDF/image, modification produit, export Excel/PDF

**Simulation Commandes**
- Sélection produit (réf/nom), affichage image + récap (nom, specs, unité)
- Sélection fournisseur, sélection transitaire, Assurance oui/non, Quantité
- Prix de vente unitaire HT (selon fournisseur), Mode livraison (Maritime/Aérien)
- TVA oui/non (18% par défaut, modifiable)
- Calculs auto : CBM/poids selon mode, taxe unitaire selon transitaire, prix assurance, prix TTC unitaire, montant total achat HT, taxes totales, montant TTC total, marge brute totale et gain net
- Export PDF / image

**Fonctionnalités transverses demandées**
- Barre de recherche par base (texte ou image)
- Filtres par base
- Modifier/Supprimer/Vider formulaire
- Import/Export Excel-PDF-image pour chaque base
- Séparateur de milliers sur tous les chiffres
- Vue grille (cartes responsives, 4/3/2/1 colonnes selon largeur écran : >1280px / 860-1280px / 520-860px / <520px) et vue liste (tableau) pour chaque base

### Ce qui a été implémenté dans le fichier livré

✅ Les 4 onglets (Catalogue, Fournisseurs, Transitaires, Simulation Commandes) avec navigation
✅ Formulaires complets pour Produit / Fournisseur / Transitaire avec tous les champs listés ci-dessus, en modale
✅ Génération automatique de la référence produit (logique XXX-XXX-XXX)
✅ Upload photos (max 3 pour produits, 1 logo pour fournisseur/transitaire) en base64, avec aperçus et suppression individuelle
✅ Vue grille responsive (4/3/2/1 colonnes selon les seuils demandés) et vue liste (tableau) basculables, pour les 3 bases
✅ Recherche texte (nom/référence/pays) et filtres (typologie, fournisseur) sur le catalogue
✅ Modifier / Supprimer sur chaque fiche
✅ Import CSV et Export CSV (équivalent Excel) pour les 3 bases
✅ Export PDF via impression navigateur (`window.print()`, CSS `@media print` qui masque la navigation/boutons)
✅ Module Simulation de commande complet : sélection produit avec image + récap, sélection fournisseur/transitaire, quantité, prix vente unitaire HT, mode transport, assurance, TVA, calcul automatique CBM/poids unitaire et total, taxe (fret) unitaire selon le transitaire choisi (ou valeurs par défaut 11 000/230 000 si aucun transitaire sélectionné), prix TTC unitaire, montant total HT/TTC, marge brute totale
✅ Séparateurs de milliers (format `fr-FR`) sur tous les montants affichés
✅ Persistance des données entre sessions via `window.storage` (3 clés : `produits`, `fournisseurs`, `transitaires`, stockage JSON)
✅ Habillage visuel aligné sur le Brand Book Go Group (dégradé Spectre Go en header, couleurs validées, Poppins/Montserrat)

### Limites connues / non implémenté (à reprendre dans la suite du projet)

- ❌ **Analyse concurrentielle automatisée par recherche web** : non câblée. Le champ existe dans la logique de devis Excel (colonne "Prix marché concurrent") mais aucune recherche web automatique n'alimente le catalogue du site. Décision en attente de l'utilisatrice (voir section 7).
- ❌ **Import Excel/PDF/image natif** : seul l'import **CSV** est implémenté (pas de parsing .xlsx ou .pdf direct dans le navigateur — complexité technique plus élevée, nécessiterait une librairie comme SheetJS).
- ❌ **Recherche par image** (reconnaissance visuelle) : non implémentée, seule la recherche texte existe.
- ❌ **Export PDF soigné** : utilise l'impression navigateur basique, pas de mise en page PDF dédiée avec en-tête/logo/pagination.
- ❌ **Multi-utilisateur / backend partagé** : le fichier est autonome, les données sont stockées localement à l'utilisatrice connectée (`window.storage`, `shared: false`). Si plusieurs personnes de Go Group doivent voir/éditer le même catalogue en simultané, il faut une vraie base de données partagée + backend (hors périmètre d'un simple artifact HTML).
- ⚠️ Le catalogue est **vide au premier lancement** — les 19 produits du devis (section 3) n'ont pas encore été préchargés dans le site ; proposé à l'utilisatrice mais pas encore confirmé.

---

## 7. Questions ouvertes en attente de réponse de l'utilisatrice

Ces points ont été soulevés en fin de conversation précédente, sans réponse encore :

1. **Précharger le catalogue ?** Veut-elle que les 19 produits Bailey/Clara (avec les fiches fournisseurs correspondantes) soient injectés dans le site dès l'ouverture, plutôt que de partir d'un catalogue vide ?
2. **Soigner l'export PDF ?** L'export actuel utilise l'impression navigateur brute — faut-il une mise en page PDF dédiée (en-tête Go Group, logo, pagination propre) ?
3. **Besoin multi-utilisateur ?** Si plusieurs personnes de l'équipe doivent accéder aux mêmes données en simultané, il faut migrer vers une vraie architecture backend (hors artifact HTML autonome) — à anticiper ou non ?
4. **Recherche concurrentielle web** : veut-elle que Claude lance des recherches web maintenant pour remplir les prix de marché (Excel + futur catalogue du site), catégorie par catégorie (hydrafacial, picolaser, HIFU, skin analyzer, RF microneedling) ?
5. **Taux de TVA à 18%** : confirmé comme taux standard Togo par défaut dans les deux outils — à valider si c'est bien le régime fiscal applicable aux ventes de Go Shop/Go Ship.

---

## 8. Comment reprendre ce projet dans une nouvelle conversation

1. Coller ce document en début de conversation.
2. Préciser si on reprend le **fichier Excel**, le **site web HTML**, ou les deux — et joindre le fichier correspondant en pièce jointe si on veut que Claude l'édite directement plutôt que de le reconstruire.
3. Indiquer lesquelles des 5 questions ouvertes (section 7) ont une réponse, pour que Claude priorise les bons chantiers.
4. Si de nouveaux retours fournisseurs arrivent entre-temps, les joindre (images/PDF) pour mise à jour de la base produits.

---

*Document généré le 30 juin 2026 — Go Group, Lomé, Togo.*
