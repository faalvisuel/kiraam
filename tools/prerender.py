"""Kiraam — génère les pages statiques (SEO), le sitemap, robots.txt, 404 et les images de partage.

Usage :
    python3 tools/prerender.py --site https://faalvisuel.github.io/kiraam
    python3 tools/prerender.py --site https://kiraam.pages.dev        (après passage sur Cloudflare)
Toutes les pages utilisent des chemins relatifs : elles fonctionnent à la racine d'un domaine
comme dans un sous-dossier (/kiraam/). Seuls canonical, sitemap et Open Graph utilisent --site.
"""
import argparse, html, json, os, re
from datetime import date

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
e = html.escape

LANG_NAMES = {'fr': 'Français', 'en': 'English', 'it': 'Italiano'}


def rel_root(path):
    depth = len([p for p in path.split('/') if p])
    return '../' * depth if depth else './'


def head(site, path, title, desc, img, kind='website', jsonld=None, extra=''):
    url = site.rstrip('/') + '/' + path
    tags = [
        f'<title>{e(title)}</title>',
        f'<meta name="description" content="{e(desc)}">',
        f'<link rel="canonical" href="{e(url)}">',
        '<meta name="theme-color" content="#4A0B16">',
        f'<meta name="kiraam-root" content="{rel_root(path)}">',
        f'<meta property="og:type" content="{kind}">',
        '<meta property="og:site_name" content="Kiraam">',
        '<meta property="og:locale" content="fr_FR">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{e(url)}">',
        f'<meta property="og:image" content="{e(site.rstrip("/") + "/" + img)}">',
        '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<link rel="icon" href="{rel_root(path)}assets/brand/favicon.svg" type="image/svg+xml">',
        f'<link rel="apple-touch-icon" href="{rel_root(path)}assets/brand/kiraam-icone-512.png">',
        f'<link rel="preload" href="{rel_root(path)}assets/fonts/amiri-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>',
    ]
    if jsonld:
        tags.append('<script type="application/ld+json">' + json.dumps(jsonld, ensure_ascii=False) + '</script>')
    return '\n'.join(tags) + extra


def page(shell, site, path, title, desc, img, main, **kw):
    out = shell.replace('{{HEAD}}', head(site, path, title, desc, img, **kw)).replace('{{MAIN}}', main)
    out = out.replace('{{ROOT}}', rel_root(path))
    dest = os.path.join(ROOT_DIR, path, 'index.html') if path else os.path.join(ROOT_DIR, 'index.html')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    open(dest, 'w').write(out)
    return path


def ar_lines(b):
    return ''.join(f'<span>{e(a)}</span>' for a in b['ar'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', required=True)
    args = ap.parse_args()
    site = args.site.rstrip('/')
    shell = open(os.path.join(ROOT_DIR, 'tools', 'shell.html')).read()
    lib = json.load(open(os.path.join(ROOT_DIR, 'data', 'library.json')))['works']
    audio = json.load(open(os.path.join(ROOT_DIR, 'data', 'audio.json')))['audio']
    aliases = {k.strip(): v for k, v in json.load(open(os.path.join(ROOT_DIR, 'tools', 'aliases.json'))).items() if v}
    # alias dans library.json pour la recherche du site
    libfile = os.path.join(ROOT_DIR, 'data', 'library.json'); libdata = json.load(open(libfile))
    for w in libdata['works']:
        if aliases.get(w['slug']): w['aka'] = aliases[w['slug']]
        else: w.pop('aka', None)
    json.dump(libdata, open(libfile, 'w'), ensure_ascii=False, indent=0)
    lib = libdata['works']
    parts = {}
    for w in lib:
        for n in w['parts']:
            parts[n] = json.load(open(os.path.join(ROOT_DIR, 'data', 'k', f'{n}.json')))
    nK = sum(len(w['parts']) for w in lib)
    nV = sum(w['bayts'] for w in lib)
    author = {'@type': 'Person', 'name': 'Cheikh Ahmadou Bamba', 'alternateName': ['Serigne Touba', 'Khadimou Rassoul', 'الشيخ أحمد بمبا'],
              'birthPlace': 'Mbacké, Sénégal'}
    urls = []

    # --- Accueil
    desc = (f"Kiraam : les khassidas de Serigne Touba (Cheikh Ahmadou Bamba) en PDF gratuit. {len(lib)} livres, {nK} khassidas "
            "en arabe vocalisé avec translittération et traduction française, à lire ou écouter en ligne.")
    links = ''.join(f'<li><a href="livre/{w["slug"]}/">{e(w["title"])} — <span class="ar">{e(w["titleAr"])}</span></a></li>' for w in lib)
    home_main = f'''<section class="wrap prose"><h1>Kiraam — les khassidas de Serigne Touba</h1>
<p>{e(desc)}</p><h2>Tous les livres</h2><ul>{links}</ul></section>'''
    urls.append(page(shell, site, '', 'Kiraam — Khassidas de Serigne Touba en PDF, arabe et traduction', desc, 'og/kiraam.jpg', home_main,
                     jsonld=[{'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'Kiraam', 'alternateName': 'كرام',
                              'url': site + '/', 'inLanguage': ['fr', 'ar'],
                              'potentialAction': {'@type': 'SearchAction', 'target': site + '/bibliotheque/?q={search_term_string}',
                                                  'query-input': 'required name=search_term_string'}},
                             {'@context': 'https://schema.org', '@type': 'Organization', 'name': 'Kiraam', 'url': site + '/',
                              'logo': site + '/assets/brand/kiraam-icone-512.png'}],
                     extra=f'\n<link rel="preload" href="./assets/photos/mosquee-touba.webp" as="image">'))

    # --- Bibliothèque
    desc = f"Les {len(lib)} livres de khassidas de Cheikh Ahmadou Bamba : Jazbul Qulub, Mawahibu Nafih, Matlabul Fawzayni, Nuuru Daarayni… Téléchargement PDF gratuit."
    cards = ''.join(f'<li><a href="../livre/{w["slug"]}/">{e(w["title"])}</a> · <span class="ar">{e(w["titleAr"])}</span> · {w["bayts"]} vers</li>' for w in lib)
    urls.append(page(shell, site, 'bibliotheque/', 'Bibliothèque des khassidas de Serigne Touba (PDF) | Kiraam', desc, 'og/kiraam.jpg',
                     f'<section class="wrap prose"><h1>La bibliothèque des khassidas</h1><p>{e(desc)}</p><ul>{cards}</ul></section>'))

    # --- Livres
    for w in lib:
        first = parts[w['parts'][0]]['bayts'][:3]
        np = len(w['parts'])
        langs = ', '.join(['arabe', 'translittération'] + [LANG_NAMES[l].lower() if l != 'fr' else 'français' for l in w['langs']])
        has_audio = w['slug'] in audio
        desc = (f"{w['title']} ({w['titleAr']}), khassida de Cheikh Ahmadou Bamba (Serigne Touba) : {w['bayts']} vers"
                f"{f' en {np} parties' if np > 1 else ''}. Texte arabe, translittération et traduction, PDF gratuit"
                f"{', déclamation audio' if has_audio else ''}. Versions arabe seul, phonétique, français ou anglais.")
        aka = w.get('aka', [])
        if aka:
            desc += ' Aussi écrit : ' + ', '.join(aka) + '.'
        title = f"{w['title']} ({w['titleAr']}) — Khassida de Serigne Touba en PDF | Kiraam"
        verses = ''.join(f'<div class="v"><div class="ar">{ar_lines(b)}</div><div class="tr">{e(" · ".join(b["tr"]))}</div><div class="tl">{e(b["fr"])}</div></div>' for b in first)
        partlinks = ''.join(f'<li><a href="../../lire/{w["slug"]}/{i + 1}/">{e(n)}</a></li>' for i, n in enumerate(w['partNames']))
        main_html = f'''<div class="wrap book"><div class="book-cover"><div class="cv"><img src="../../covers/{w["slug"]}.webp" alt="Couverture de {e(w["title"])}" width="641" height="910"></div></div>
<div class="book-info"><div class="t-ar">{e(w["titleAr"])}</div><h1>{e(w["title"])}</h1><p class="by">Cheikh Ahmadou Bamba Khadimou Rassoul · Serigne Touba</p>
<p>{e(desc)}</p><p>Langues : {e(langs)}.</p>
<div class="actions"><a class="btn btn-gold" href="../../lire/{w["slug"]}/1/">Lire en ligne</a> <a class="btn btn-bx" href="../../pdf/{w["slug"]}.pdf">Télécharger le PDF complet</a></div>
<p>Autres versions PDF : <a href="../../pdf/{w["slug"]}-arabe.pdf">{e(w["title"])} en arabe seul</a> · <a href="../../pdf/{w["slug"]}-phonetique.pdf">arabe et phonétique</a> · <a href="../../pdf/{w["slug"]}-francais.pdf">traduction française</a> · <a href="../../pdf/{w["slug"]}-anglais.pdf">English translation</a>.</p>
{f'<ul>{partlinks}</ul>' if np > 1 else ''}
<div class="excerpt"><h2>Premiers vers</h2>{verses}</div></div></div>'''
        ld = {'@context': 'https://schema.org', '@type': 'Book', 'name': w['title'], 'alternateName': [w['titleAr']] + aka,
              'author': author, 'inLanguage': ['ar'] + w['langs'], 'bookFormat': 'https://schema.org/EBook',
              'numberOfPages': w['pages'], 'url': f'{site}/livre/{w["slug"]}/', 'image': f'{site}/og/{w["slug"]}.jpg',
              'isAccessibleForFree': True, 'genre': 'Poésie soufie', 'description': desc,
              'publisher': {'@type': 'Organization', 'name': 'Kiraam'},
              'associatedMedia': {'@type': 'MediaObject', 'encodingFormat': 'application/pdf', 'contentUrl': f'{site}/pdf/{w["slug"]}.pdf'}}
        crumbs = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Kiraam', 'item': site + '/'},
            {'@type': 'ListItem', 'position': 2, 'name': 'Bibliothèque', 'item': site + '/bibliotheque/'},
            {'@type': 'ListItem', 'position': 3, 'name': w['title'], 'item': f'{site}/livre/{w["slug"]}/'}]}
        urls.append(page(shell, site, f'livre/{w["slug"]}/', title, desc, f'og/{w["slug"]}.jpg', main_html, kind='book', jsonld=[ld, crumbs]))

        # --- Textes intégraux (une page par partie)
        for i, n in enumerate(w['parts']):
            d = parts[n]
            pname = d['name']
            t = f"{pname} ({w['titleAr']}) — texte arabe, translittération et traduction | Kiraam"
            ds = (f"Lire {pname} de Serigne Touba en ligne : {len(d['bayts'])} vers en arabe vocalisé avec translittération "
                  f"et traduction française. « {d['bayts'][0]['fr'][:110]}… »")
            body = ''.join(f'<div class="verse" id="v{b["n"]}"><span class="num">{b["n"]}</span><div class="ar-lines">{ar_lines(b)}</div>'
                           f'<div class="tr">{e(" · ".join(x for x in b["tr"] if x))}</div><div class="tl">{e(b["fr"])}</div></div>' for b in d['bayts'])
            nav = ''
            if i > 0:
                nav += f'<a class="btn btn-line" href="../{i}/">← {e(w["partNames"][i - 1])}</a> '
            if i < np - 1:
                nav += f'<a class="btn btn-bx" href="../{i + 2}/">{e(w["partNames"][i + 1])} →</a>'
            mh = f'''<div class="wrap"><div class="reader"><header class="rhead"><div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
<div class="t-ar">{e(w["titleAr"])}</div><h1>{e(pname)}</h1></header>{body}
<nav class="rnav"><a class="btn btn-line" href="../../../livre/{w["slug"]}/">{e(w["title"])} : PDF et présentation</a> {nav}</nav></div></div>'''
            ld = {'@context': 'https://schema.org', '@type': 'CreativeWork', 'name': pname, 'alternateName': w['titleAr'],
                  'author': author, 'inLanguage': ['ar', 'fr'], 'isPartOf': {'@type': 'Book', 'name': w['title'], 'url': f'{site}/livre/{w["slug"]}/'},
                  'url': f'{site}/lire/{w["slug"]}/{i + 1}/', 'isAccessibleForFree': True}
            urls.append(page(shell, site, f'lire/{w["slug"]}/{i + 1}/', t, ds, f'og/{w["slug"]}.jpg', mh, kind='article', jsonld=ld))

    # --- Pages fixes
    fixed = [
        ('serigne-touba/', 'Serigne Touba — Cheikh Ahmadou Bamba Khadimou Rassoul | Kiraam',
         "Vie de Cheikh Ahmadou Bamba (Serigne Touba), fondateur de Touba et de la Mouridiyya : naissance, exils, œuvre écrite et khassidas.",
         '<section class="wrap prose"><h1>Serigne Touba, Cheikh Ahmadou Bamba</h1><p>Guide spirituel sénégalais, fondateur de la Mouridiyya et de la ville sainte de Touba, Khadimou Rassoul a laissé une œuvre immense de poèmes en arabe : les khassidas.</p></section>'),
        ('galerie/', 'Touba en images — la Grande Mosquée | Kiraam',
         "Photographies de la Grande Mosquée de Touba : minarets, coupoles et vitraux étoilés qui ont inspiré l'identité de Kiraam.",
         '<section class="wrap prose"><h1>Touba en images</h1></section>'),
        ('a-propos/', 'À propos de Kiraam — sources et licence | Kiraam',
         "Kiraam est une bibliothèque libre et gratuite des khassidas de Serigne Touba. Sources des textes, traductions, audio et licence.",
         '<section class="wrap prose"><h1>À propos de Kiraam</h1></section>'),
        ('charte/', 'Charte graphique de Kiraam | Kiraam', "Logo, couleurs, typographies et icônes de Kiraam.", '<section class="wrap prose"><h1>Charte graphique</h1></section>'),
        ('lectures/', 'Mes lectures | Kiraam', 'Reprenez la lecture de vos khassidas là où vous vous étiez arrêté.', ''),
        ('favoris/', 'Mes favoris | Kiraam', 'Vos khassidas favoris.', ''),
    ]
    for p, t, d, m in fixed:
        r = page(shell, site, p, t, d, 'og/kiraam.jpg', m)
        if p not in ('lectures/', 'favoris/'):
            urls.append(r)

    # --- 404 (chemin racine absolu car servie depuis n'importe quelle adresse)
    from urllib.parse import urlparse
    base = urlparse(site).path.rstrip('/') + '/'
    four = shell.replace('{{HEAD}}', head(site, '', 'Page introuvable | Kiraam', 'Cette page n’existe pas.', 'og/kiraam.jpg')
                         .replace('content="./"', f'content="{base}"', 1)).replace('{{MAIN}}', '').replace('{{ROOT}}', base)
    four = four.replace('href="./', f'href="{base}')
    four = four.replace('<link rel="canonical"', '<meta name="robots" content="noindex"><link rel="x-canonical"')
    open(os.path.join(ROOT_DIR, '404.html'), 'w').write(four)

    # --- sitemap + robots
    today = date.today().isoformat()
    def prio(u):
        return '1.0' if u == '' else '0.9' if u.startswith('livre/') or u == 'bibliotheque/' else '0.7' if u.startswith('lire/') else '0.5'
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sm.append(f'<url><loc>{site}/{u}</loc><lastmod>{today}</lastmod><priority>{prio(u)}</priority></url>')
    sm.append('</urlset>')
    open(os.path.join(ROOT_DIR, 'sitemap.xml'), 'w').write('\n'.join(sm))
    open(os.path.join(ROOT_DIR, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\n\nSitemap: {site}/sitemap.xml\n')
    print(len(urls), 'pages indexables ·', site)


if __name__ == '__main__':
    main()
