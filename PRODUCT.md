# Product

<!-- Généré par /impeccable init à partir du code et de CLAUDE.md (l'interview n'a pas pu aboutir dans cette session).
     Corrigez librement : chaque commande impeccable relit ce fichier avant de travailler. -->

## Register

product

## Users

Le décideur de Go Group à Lomé (Togo) — et son équipe restreinte achat/prix — qui importe de l'équipement esthétique professionnel depuis la Chine. Contexte d'usage : de longues sessions de comparaison de devis fournisseurs (Yateli, Oman Beauty…), sur ordinateur au bureau et sur téléphone en déplacement ou en visite client. Le travail à faire : comparer les prix EXW de produits identiques entre fournisseurs, calculer le coût rendu Lomé en XOF (fret maritime/aérien, douane, marge, TVA), désigner un fournisseur « gagnant » par groupe de produits, et produire un devis client propre en PDF.

Le devis imprimé et l'écran lui-même sont parfois montrés à des clients, fournisseurs ou partenaires : la finition compte vers l'extérieur, pas seulement en interne.

## Product Purpose

Go.Flow est la console d'import de Go Group : catalogue produits multi-fournisseurs, fiches fournisseurs et transitaires, simulateur de coût de revient, et générateur de devis clients. Une seule page HTML, aucune dépendance, données en localStorage — l'outil doit marcher au bureau comme sur une connexion togolaise capricieuse. Le succès : une décision d'achat ou un devis client produit en minutes, avec des chiffres auxquels on peut se fier, et zéro perte de données.

## Brand Personality

Confiant, énergique, précis. La signature Go Group est le dégradé six couleurs (rouge → orange → jaune → vert → bleu → violet, l'ordre ne s'inverse jamais) porté par la barre de marque, le logo et le CTA principal — jamais en papier peint. Les chiffres sont nets et typographiés fort (Montserrat 700–900) ; le ton est professionnel et direct, en français. Devise : **« Promis. Livré. »**

## Anti-references

- Le gabarit d'admin générique (Bootstrap/AdminLTE, tableaux gris sans voix) — Go.Flow doit rester reconnaissable en une seconde.
- Le SaaS délavé : texte gris clair « élégant » illisible, chiffres timides. Ici les montants sont l'interface.
- La décoration qui cache les données : pas de dashboard-spectacle, pas d'effets qui ralentissent une machine modeste.

## Design Principles

1. **Les chiffres d'abord.** Chaque écran répond à « combien ça coûte, combien je gagne ». Le prix TTC et la marge sont toujours les éléments les plus lisibles de leur carte ou ligne.
2. **Un regard, une décision.** La vue groupée désigne un gagnant par groupe de produits ; l'interface doit rendre le choix (et sa raison) visible d'un coup d'œil, avec dérogation manuelle possible.
3. **L'impression est une surface de premier rang.** Le devis PDF et l'export catalogue sont des livrables clients : ils ont leurs propres feuilles de style et méritent le même soin que l'écran.
4. **Résilient par défaut.** localStorage corrompu, quota plein, API de taux de change injoignable, connexion lente : l'outil dégrade proprement et le dit à l'utilisateur, sans jamais perdre une saisie.
5. **L'identité comme signature, pas comme bruit.** Le spectre Go apparaît en bande, en bordure ou en logo — par touches ; le reste de l'interface reste sobre pour laisser parler les données.

## Accessibility & Inclusion

WCAG AA : contrastes texte ≥ 4,5:1 (variantes « text-safe » des couleurs de marque), navigation clavier complète (onglets, modales avec focus piégé et Échap), libellés associés sur tous les champs, `prefers-reduced-motion` respecté, cibles tactiles ≥ 43 px sur pointeur grossier. Interface en français ; montants au format `fr-FR`.
