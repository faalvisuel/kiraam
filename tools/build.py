"""Kiraam build: data JSON + book PDFs (cover + text) + cover images.
Source text: DaurDiop/khassida_dataset (MIT)."""
import json, re, os, sys, html, subprocess, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kfmt import kline
from collections import OrderedDict
from multiprocessing import Pool

SRC = '/home/claude/daurdiop/khassida_dataset/v1'
OUT = '/home/claude/kiraam'
FONTS = '/home/claude/fontdl/ttf'
PORTRAIT = '/home/claude/build/portrait-cover.jpg'

FEATURED = ['Jazbu', 'Mawahibu', 'Matlabul Fawzayni', 'Nuuru Daarayni', 'Jalibatul Maraghibi',
            'Mafatihul Jinan', 'Asma Ul Husna', 'Khatimatu Munajati', 'Mafatihul Bishri',
            'Tawbatun Nasuuh', 'Matlabushiffa', 'Yaa Rakhmanu']

PALETTES = [
    dict(name='bordeaux', bg1='#701626', bg2='#3D0711', ink='#EBD08F', soft='#D8BB80', line='#C9A24D', pat='#E2C27A'),
    dict(name='ivoire', bg1='#F8F2E6', bg2='#ECDFC6', ink='#6B1424', soft='#8A5A3B', line='#B48A3A', pat='#9C7A35'),
    dict(name='grenat', bg1='#58101D', bg2='#25050B', ink='#E7C784', soft='#CDB07A', line='#BE963F', pat='#D9B66C'),
    dict(name='vin', bg1='#842033', bg2='#4C0C19', ink='#F1D89C', soft='#E0C48C', line='#D1AB55', pat='#EBCB82'),
]

AR_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
e = html.escape


def slugify(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def load(n):
    return json.load(open(f'{SRC}/khassida/{n}.json'))['data']


def compact(k):
    """Bayt-level compact record for site + PDF."""
    verses = {v['number']: v for v in k['verses']}
    bayts = []
    for b in k['bayts']:
        segs = [verses[i] for i in range(b['verseFrom'], b['verseTo'] + 1) if i in verses]
        t = b.get('translations', {})
        fr_v = ' '.join(s['translations'].get('fr', '') for s in segs).strip()
        en_v = ' '.join(s['translations'].get('en', '') for s in segs).strip()
        bayts.append({
            'n': b.get('appNumber', b['number']),
            'ar': [re.sub(r'^ل(?=بِسْمِ)', '', s['text']) for s in segs],
            'tr': [s.get('transcription', '') for s in segs],
            'fr': t.get('fr.karamati') or fr_v,
            'en': t.get('en.karamati') or en_v,
            'it': t.get('it.karamati', ''),
        })
    return bayts


def font_faces():
    f = FONTS
    return f"""
@font-face{{font-family:Amiri;src:url(file://{f}/ruwudu-full-600.ttf);font-weight:400}}
@font-face{{font-family:KL;src:url(file://{f}/ruwudu-letters-600.ttf)}}
@font-face{{font-family:KM;src:url(file://{f}/ruwudu-marks-600.ttf)}}
@font-face{{font-family:Amiri;src:url(file://{f}/ruwudu-full-700.ttf);font-weight:700}}
@font-face{{font-family:AmiriL;src:url(file://{f}/amiri-latin-400-normal.ttf);font-weight:400}}
@font-face{{font-family:Corm;src:url(file://{f}/cormorant-garamond-latin-400-normal.ttf);font-weight:400}}
@font-face{{font-family:Corm;src:url(file://{f}/cormorant-garamond-latin-600-normal.ttf);font-weight:600}}
@font-face{{font-family:Corm;src:url(file://{f}/cormorant-garamond-latin-700-normal.ttf);font-weight:700}}
@font-face{{font-family:Inter;src:url(file://{f}/inter-latin-400-normal.ttf);font-weight:400}}
@font-face{{font-family:Inter;src:url(file://{f}/inter-latin-600-normal.ttf);font-weight:600}}
"""


def star_pattern(color):
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'>"
           f"<g fill='none' stroke='{color}' stroke-width='0.7' opacity='0.16'>"
           "<path d='M24 6l5.3 12.7L42 24l-12.7 5.3L24 42l-5.3-12.7L6 24l12.7-5.3z'/>"
           "<rect x='14' y='14' width='20' height='20' transform='rotate(45 24 24)'/>"
           "<rect x='14' y='14' width='20' height='20'/></g></svg>")
    from urllib.parse import quote
    return "url(\"data:image/svg+xml;utf8," + quote(svg) + "\")"


def cover_html(w, pal):
    parts = len(w['parts'])
    sub = f"{parts} parties" if parts > 1 else "Khassida"
    return f"""
<section class="cover" style="background-color:{pal['bg2']};background-image:{star_pattern(pal['pat'])},radial-gradient(circle at 50% 38%, {pal['bg1']} 0%, {pal['bg2']} 78%);">
  <div class="spine" style="background:linear-gradient(90deg, rgba(0,0,0,.28), rgba(0,0,0,0) 70%)"></div>
  <div class="frame" style="border-color:{pal['line']}"><div class="frame2" style="border-color:{pal['line']}"></div></div>
  <div class="corner tl" style="color:{pal['line']}">✦</div><div class="corner tr" style="color:{pal['line']}">✦</div>
  <div class="corner bl" style="color:{pal['line']}">✦</div><div class="corner br" style="color:{pal['line']}">✦</div>
  <div class="brand" style="color:{pal['soft']}">K I R A A M <span class="dot">·</span> <span class="brand-ar">كِرَام</span></div>
  <div class="arch" style="border-color:{pal['line']};background-image:url(file://{PORTRAIT})"></div>
  <div class="tblock">
  <div class="incipit" style="color:{pal['ink']}" dir="rtl">{e(w['incipit'])}</div>
  <div class="title" style="color:{pal['ink']}">{e(w['title'])}</div>
  <div class="rule" style="background:{pal['line']}"></div>
  <div class="sub" style="color:{pal['soft']}">{sub} · {w['bayts']} vers</div></div>
  <div class="author" style="color:{pal['soft']}">Cheikh Ahmadou Bamba<br/><span>Khadimou Rassoul · Serigne Touba</span></div>
</section>"""


CSS = """
@page { size: 148mm 210mm; margin: 18mm 15mm 17mm 15mm; background: #FBF2D8; border: .6mm double #1A7A42; padding: 3mm 3mm;
  @bottom-center { content: counter(page); font-family: Corm; font-size: 10pt; color: #8B6A3E; }
  @top-center { content: string(booktitle); font-family: Corm; font-size: 8.5pt; letter-spacing: .18em; text-transform: uppercase; color: #A88A5A; }
}
@page cover { margin: 0; border: 0; padding: 0; @bottom-center { content: none } @top-center { content: none } }
@page front { border: 0; padding: 0; @bottom-center { content: none } @top-center { content: none } }
html { font-family: Inter; color: #2A1A16; }
.cover { page: cover; position: relative; width: 148mm; height: 210mm; overflow: hidden; text-align: center; }
.spine { position: absolute; left: 0; top: 0; bottom: 0; width: 9mm; }
.frame { position: absolute; left: 8mm; right: 8mm; top: 8mm; bottom: 8mm; border: .5mm solid; }
.frame2 { position: absolute; left: 1.4mm; right: 1.4mm; top: 1.4mm; bottom: 1.4mm; border: .2mm solid; }
.corner { position: absolute; font-size: 11pt; line-height: 1; }
.corner.tl { left: 6.3mm; top: 6mm } .corner.tr { right: 6.3mm; top: 6mm }
.corner.bl { left: 6.3mm; bottom: 6mm } .corner.br { right: 6.3mm; bottom: 6mm }
.brand { position: absolute; top: 15mm; left: 0; right: 0; font-family: Corm; font-weight: 600; font-size: 9pt; letter-spacing: .1em; }
.brand-ar { font-family: Amiri; font-size: 10pt; letter-spacing: 0 }
.arch { position: absolute; left: 39mm; width: 70mm; top: 25mm; height: 88mm; border: .6mm solid; border-radius: 35mm 35mm 1.5mm 1.5mm;
  background-color: #F4ECDC; background-size: cover; background-position: center 12%; }
.tblock { position: absolute; top: 119mm; left: 15mm; right: 15mm; }
.incipit { font-family: Amiri; font-size: 15pt; line-height: 1.5; }
.title { font-family: Corm; font-weight: 600; font-size: 26pt; line-height: 1.05; letter-spacing: .02em; margin-top: 4mm; }
.rule { width: 16mm; height: .4mm; margin: 5mm auto 4mm; }
.sub { font-family: Corm; font-size: 10.5pt; letter-spacing: .12em; text-transform: uppercase; }
.author { position: absolute; bottom: 15mm; left: 0; right: 0; font-family: Corm; font-weight: 600; font-size: 11pt; line-height: 1.35; }
.author span { font-weight: 400; font-size: 9.5pt; letter-spacing: .06em }

.front { page: front; text-align: center; padding-top: 30mm; }
.front .tar { font-family: Amiri; font-weight: 700; font-size: 30pt; color: #6B1424; margin-top: 12mm; line-height: 1.5 }
.front .basmala { font-family: Amiri; font-size: 20pt; color: #6B1424; }
.front h1 { font-family: Corm; font-weight: 600; font-size: 28pt; color: #6B1424; margin: 2mm 0 4mm; string-set: booktitle content(); }
.front .ar { font-family: Amiri; font-size: 14pt; color: #8B6A3E; }
.front .meta { font-family: Corm; font-size: 11pt; color: #6E5A4A; margin-top: 10mm; line-height: 1.6 }
.front .orn { color: #B48A3A; font-size: 12pt; margin: 8mm 0; letter-spacing: .6em }
.front .credit { position: absolute; bottom: 0; left: 0; right: 0; font-size: 7pt; color: #9A8676; line-height: 1.5 }

h2.part { font-family: Corm; font-weight: 600; font-size: 17pt; color: #1A7A42; text-align: center; margin: 2mm 0 6mm; break-after: avoid; }
h2.part small { display: block; font-size: 9pt; letter-spacing: .2em; text-transform: uppercase; color: #A88A5A; font-weight: 400 }
h2.part.newpage { break-before: page; }
.bayt { break-inside: avoid; padding: 2.2mm 1mm 2.6mm; margin: 0; background: none; border: 0; border-bottom: .15mm solid #E6CF9C; }
.bayt.alt { background: none; }
.medal { display: inline-block; min-width: 5mm; height: 5mm; line-height: 5mm; border-radius: 2.5mm; background: none; color: #D41F3F; border: .25mm solid #E08A2E; font-family: Inter; font-size: 6.5pt; text-align: center; }
.medal.ar { font-family: Amiri; font-size: 8.5pt; line-height: 4.8mm; }
.tlonly { display: table; width: 100%; }
.tlonly .mc { display: table-cell; width: 7mm; vertical-align: top; padding-top: .6mm; }
.tlonly .tlx { display: table-cell; padding-left: 3mm; font-family: Corm; font-size: 12pt; line-height: 1.45; color: #2A1A16; }
.bayt table { width: 100%; border-collapse: collapse; direction: rtl; }
.k { position: relative; display: inline-block; white-space: nowrap; }
.kl { font-family: KL; color: #1A1210; }
.km { font-family: KM; color: #D41F3F; position: absolute; left: 0; top: 0; right: 0; white-space: nowrap; }
.kl .g { color: #1A7A42; } .kl .p { color: #1C4F9C; }
.bayt td { font-family: KL; font-size: 15pt; line-height: 2; color: #1A1210; width: 47%; vertical-align: top; padding: 0 1.5mm; }
.bayt td:nth-child(2) { text-align: right; }
.bayt td:nth-child(3) { text-align: left; }
.bayt td.wide { text-align: center; }

.bayt td.n { width: 6%; font-size: 9.5pt; color: #B48A3A; text-align: center; padding: 1.6mm 0 0; }
.tr { font-family: Corm; font-style: italic; font-size: 10pt; color: #B5512A; text-align: center; margin-top: .6mm; }
.fr { font-family: Inter; font-size: 8pt; line-height: 1.55; color: #3A2A24; text-align: center; margin: .8mm 6mm 0; }
"""


MODES = {
    'complet': ('Arabe, translittération et traduction française', True, True, 'fr'),
    'arabe': ('Texte arabe seul', True, False, None),
    'phonetique': ('Arabe et translittération', True, True, None),
    'francais': ('Traduction française seule', False, False, 'fr'),
    'anglais': ('English translation only', False, False, 'en'),
}


def pdf_html(w, parts_data, pal, mode='complet'):
    label, show_ar, show_tr, tl = MODES[mode]
    body = [cover_html(w, pal)]
    nparts = len(w['parts'])
    body.append(f"""<section class="front">
<div class="basmala" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
<div class="tar" dir="rtl">{e(w['titleAr'])}</div>
<h1>{e(w['title'])}</h1>
<div class="ar" dir="rtl">{e(w['incipit'])}</div>
<div class="orn">✦ ✦ ✦</div>
<div class="meta">Œuvre de Cheikh Ahmadou Bamba Khadimou Rassoul<br/>{nparts} {'parties' if nparts > 1 else 'partie'} · {w['bayts']} vers · mètre {e(w['meter'])}<br/>{label}</div>
<div class="credit">Édition Kiraam · Textes issus du « Khassida Dataset » de Daour (github.com/DaurDiop/khassida_dataset, licence MIT).<br/>Diffusion libre et gratuite. Toute erreur de saisie peut être signalée à Kiraam.</div>
</section>""")
    for i, (num, pname, bayts) in enumerate(parts_data):
        if nparts > 1:
            body.append(f'<h2 class="part{" newpage" if True else ""}"><small>Partie {i + 1}</small>{e(pname)}</h2>')
        else:
            body.append(f'<h2 class="part newpage">{e(pname)}</h2>')
        for k, b in enumerate(bayts):
            num = str(b['n']).translate(AR_DIGITS)
            band = ' alt' if k % 2 else ''
            if not show_ar:
                txt = b.get(tl) or b.get('fr') or ''
                body.append(f'<div class="bayt tlonly{band}"><div class="mc"><span class="medal">{b["n"]}</span></div><div class="tlx">{e(txt)}</div></div>')
                continue
            ar = b['ar']
            plain = [re.sub(r'[\u064B-\u0652\u0670\u06E1-\u06ED]', '', x) for x in ar]
            long_ = any(len(x) > 26 for x in plain)
            rows = ([[x] for x in ar] if long_ else [ar[j:j + 2] for j in range(0, len(ar), 2)]) or [['']]
            tr_txt = '  ·  '.join(t for t in b['tr'] if t)
            tbl = ''
            for ri, r in enumerate(rows):
                numcell = f'<td class="n"><span class="medal ar">{num}</span></td>' if ri == 0 else '<td class="n"></td>'
                cells = (f'<td colspan="2" class="wide">{kline(r[0])}</td>' if long_ else ''.join(f'<td>{kline(x)}</td>' for x in r) + ('<td></td>' if len(r) == 1 else ''))
                tbl += f'<tr>{numcell}{cells}</tr>'
            body.append(f'<div class="bayt{band}"><table>{tbl}</table>'
                        + (f'<div class="tr">{e(tr_txt)}</div>' if show_tr and tr_txt else '')
                        + (f'<div class="fr">{e(b.get(tl) or "")}</div>' if tl and b.get(tl) else '') + '</div>')
    langs_txt = {'complet': 'Arabe · Translittération · Français', 'arabe': 'Arabe', 'phonetique': 'Arabe · Translittération',
                 'francais': 'Français', 'anglais': 'English'}[mode]
    body.append(verso_html(w, pal, parts_data[0][2][0], langs_txt))
    return f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>{font_faces()}{CSS}</style></head><body>{"".join(body)}</body></html>'


def cover_only_html(w, pal):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{font_faces()}{CSS}</style></head><body>{cover_html(w, pal)}</body></html>'


from cover import cover_html, COVER_CSS, PALETTES, verso_html, VERSO_CSS
from ar_titles import AR_TITLES
CSS = CSS + COVER_CSS + VERSO_CSS


def render(job):
    from weasyprint import HTML
    w, idx = job
    pal = PALETTES[idx % len(PALETTES)]
    parts_data = [(n, json.load(open(f'{OUT}/data/k/{n}.json'))['name'], json.load(open(f'{OUT}/data/k/{n}.json'))['bayts']) for n in w['parts']]
    pdf_path = f"{OUT}/pdf/{w['slug']}.pdf"
    sizes = {}
    for mode in MODES:
        pth = pdf_path if mode == 'complet' else f"{OUT}/pdf/{w['slug']}-{mode}.pdf"
        HTML(string=pdf_html(w, parts_data, pal, mode)).write_pdf(pth)
        sizes[mode] = os.path.getsize(pth)
    # verso image
    vtmp = f"/home/claude/build/tmpv-{w['slug']}"
    HTML(string=f'<!doctype html><html><head><meta charset="utf-8"><style>{font_faces()}{CSS}</style></head><body>{verso_html(w, pal, parts_data[0][2][0], "Arabe · Translittération · Français")}</body></html>').write_pdf(vtmp + '.pdf')
    subprocess.run(['pdftoppm', '-r', '110', '-jpeg', '-jpegopt', 'quality=86', '-singlefile', vtmp + '.pdf', vtmp], check=True)
    subprocess.run(['python3', '-c', f"from PIL import Image;Image.open('{vtmp}.jpg').save('{OUT}/covers/{w['slug']}-verso.webp',quality=84,method=6)"], check=True)
    os.remove(vtmp + '.pdf'); os.remove(vtmp + '.jpg')
    # cover image: render page 1 only
    tmp = f"/home/claude/build/tmp-{w['slug']}.pdf"
    HTML(string=cover_only_html(w, pal)).write_pdf(tmp)
    base = f"/home/claude/build/tmp-{w['slug']}"
    subprocess.run(['pdftoppm', '-r', '110', '-jpeg', '-jpegopt', 'quality=86', '-singlefile', tmp, base], check=True)
    subprocess.run(['python3', '-c', f"from PIL import Image;Image.open('{base}.jpg').save('{OUT}/covers/{w['slug']}.webp',quality=84,method=6)"], check=True)
    os.remove(tmp); os.remove(base + '.jpg')
    pages = int(subprocess.run(['qpdf', '--show-npages', pdf_path], capture_output=True, text=True).stdout.strip())
    return w['slug'], sizes, pages, pal['name']


def main(only=None):
    meta = json.load(open(f'{SRC}/khassidas.json'))['data']
    works = OrderedDict()
    for m in meta:
        base = re.sub(r'\s+\d+$', '', m['name'])
        works.setdefault(base, []).append(m)
    lib = []
    for title, ms in works.items():
        ms = sorted(ms, key=lambda m: int(re.search(r'(\d+)$', m['name']).group(1)) if re.search(r'\s\d+$', m['name']) else 0)
        nb = 0
        langs = set()
        for m in ms:
            k = load(m['number'])
            bayts = compact(k)
            nb += len(bayts)
            for L in ('fr', 'en', 'it'):
                if any(b[L] for b in bayts):
                    langs.add(L)
            json.dump({'number': m['number'], 'name': m['name'], 'meter': k.get('meter', ''), 'bayts': bayts},
                      open(f"{OUT}/data/k/{m['number']}.json", 'w'), ensure_ascii=False, separators=(',', ':'))
        first = compact(load(ms[0]['number']))[0]
        first['ar'][0] = re.sub(r'^ل(?=بِسْمِ)', '', first['ar'][0])
        lib.append({
            'slug': slugify(title), 'title': title, 'titleAr': AR_TITLES[title], 'incipit': first['ar'][0],
            'parts': [m['number'] for m in ms], 'partNames': [m['name'] for m in ms],
            'bayts': nb, 'meter': ms[0]['meter'], 'langs': sorted(langs),
            'featured': title in FEATURED,
        })
    if only:
        lib_r = [w for w in lib if w['slug'] in only]
    else:
        lib_r = lib
    jobs = [(w, lib.index(w)) for w in lib_r]
    with Pool(max(2, os.cpu_count() or 2)) as p:
        res = p.map(render, jobs)
    info = {s: (sz, pg, pal) for s, sz, pg, pal in res}
    for w in lib:
        if w['slug'] in info:
            sz, w['pages'], w['palette'] = info[w['slug']]
            w['pdfs'] = sz; w['pdfSize'] = sz['complet']
    if only:
        cur = json.load(open(f'{OUT}/data/library.json'))
        for cw in cur['works']:
            if cw['slug'] in info:
                sz, cw['pages'], cw['palette'] = info[cw['slug']]; cw['pdfs'] = sz; cw['pdfSize'] = sz['complet']
        json.dump(cur, open(f'{OUT}/data/library.json', 'w'), ensure_ascii=False, indent=0)
    if not only:
        json.dump({'source': 'https://github.com/DaurDiop/khassida_dataset', 'license': 'MIT', 'works': lib},
                  open(f'{OUT}/data/library.json', 'w'), ensure_ascii=False, indent=0)
    for r in res:
        print(r)


if __name__ == '__main__':
    main(sys.argv[1:] or None)
