# Kiraam · كِرَام

**La bibliothèque des khassidas de Cheikh Ahmadou Bamba Khadimou Rassoul (Serigne Touba).**

- **111 livres**, **193 khassidas**, **6 774 vers**
- Texte arabe vocalisé, translittération, traduction française (anglaise et italienne pour 111 khassidas)
- Un **PDF par livre** (format A5, édition Kiraam) avec sa couverture
- Lecture en ligne : choix de la traduction, taille du texte, reprise de lecture, favoris
- Site 100 % statique, sans serveur ni base de données, hébergé sur GitHub Pages

## Structure

```
index.html            application (routes : #/, #/bibliotheque, #/lire/<livre>/<partie>, …)
assets/               style.css, app.js, polices (Amiri, Cormorant Garamond, Inter), images
data/library.json     catalogue des 111 livres
data/k/<n>.json       texte de chaque khassida (n = 1…193)
pdf/<livre>.pdf       PDF à télécharger
covers/<livre>.webp   couvertures
tools/build.py        générateur des PDF, couvertures et données
```

## Régénérer les PDF

```bash
pip install weasyprint
git clone https://github.com/DaurDiop/khassida_dataset
python3 tools/build.py          # tous les livres
python3 tools/build.py jazbu    # un seul livre
```

Les chemins en tête de `tools/build.py` (SRC, OUT, FONTS, PORTRAIT) sont à adapter.

## Sources et licence

Les textes proviennent du [Khassida Dataset](https://github.com/DaurDiop/khassida_dataset) de Daour (licence MIT),
qui inclut les traductions de l'application [Karamati Khatou Yadi](https://github.com/DaurDiop/karamati-khatou-yadi).
Voir `NOTICE.md`.

Polices : Amiri, Cormorant Garamond et Inter (SIL Open Font License).
