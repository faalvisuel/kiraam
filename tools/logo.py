"""Kiraam brand: mark + wordmarks, text converted to paths (no font dependency)."""
import math, os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

F = '/home/claude/fontdl/ttf'
OUT = '/home/claude/kiraam/assets/brand'
os.makedirs(OUT, exist_ok=True)

BORDEAUX, DEEP, GOLD, GOLD_L, IVORY = '#6B1424', '#2C060E', '#C29B4A', '#D9B66C', '#FBF7F0'


def text_path(s, font, size, x, y, track=0.0, rtl=False):
    path = f'{F}/{font}'
    blob = hb.Blob.from_file_path(path)
    face = hb.Face(blob); hfont = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(s); buf.guess_segment_properties()
    hb.shape(hfont, buf, {'kern': True, 'liga': True})
    tt = TTFont(path); gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    upm = tt['head'].unitsPerEm; sc = size / upm
    pen = SVGPathPen(gs)
    cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        t = TransformPen(pen, (sc, 0, 0, -sc, x + (cx + pos.x_offset) * sc, y - pos.y_offset * sc))
        gs[name].draw(t)
        cx += pos.x_advance + track * upm
    width = (cx - track * upm) * sc
    return pen.getCommands(), width


def shifted(s, font, size, y, track=0.0, anchor='start', x=0):
    _, w = text_path(s, font, size, 0, y, track)
    x0 = x if anchor == 'start' else x - w / 2 if anchor == 'middle' else x - w
    d, _ = text_path(s, font, size, x0, y, track)
    return d, w


def star(cx, cy, s):
    """8-point khatam (two overlapping squares), half-side s."""
    R, r = s * math.sqrt(2), s / math.cos(math.radians(22.5))
    pts = []
    for i in range(16):
        a = math.radians(-90 + i * 22.5)
        rad = R if i % 2 == 0 else r
        pts.append(f'{cx + rad * math.cos(a):.2f},{cy + rad * math.sin(a):.2f}')
    return 'M' + ' L'.join(pts) + 'Z'


def mark(c1=GOLD, hole=None):
    """Arche en fer à cheval + étoile à 8 branches + finial à 3 sphères. viewBox 0 0 64 84."""
    sw = 2.6
    hole_el = f'<circle cx="32" cy="50" r="2.3" fill="{hole}"/>' if hole else ''
    star_d = star(32, 50, 7.4)
    if not hole:  # cut the centre with even-odd
        star_d += ' M34.3,50 A2.3,2.3 0 1 0 29.7,50 A2.3,2.3 0 1 0 34.3,50Z'
    return f'''<g fill="none" stroke="{c1}" stroke-width="{sw}" stroke-linejoin="round">
  <path d="M13 79 V54.7 A20 20 0 1 1 51 54.7 V79"/>
  <path d="M18.4 79 V53.4 A15.4 15.4 0 1 1 45.6 53.4 V79" stroke-width="1.3"/>
  <path d="M7 80.2 H57" stroke-width="2.4" stroke-linecap="round"/>
</g>
<g fill="{c1}">
  <circle cx="32" cy="18.6" r="3.4"/><circle cx="32" cy="11.4" r="2.7"/><circle cx="32" cy="5.4" r="2.1"/>
  <rect x="31.2" y="0" width="1.6" height="3.6" rx=".8"/>
  <path fill-rule="evenodd" d="{star_d}"/>
</g>{hole_el}'''


def svg(w, h, body, bg=None, rx=0):
    b = f'<rect width="{w}" height="{h}" rx="{rx}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">{b}{body}</svg>'


def save(name, s):
    open(f'{OUT}/{name}.svg', 'w').write(s)


# 1. Marks
save('kiraam-symbole', svg(64, 84, mark(GOLD)))
save('kiraam-symbole-bordeaux', svg(64, 84, mark(BORDEAUX)))
save('kiraam-symbole-blanc', svg(64, 84, mark('#FFFFFF')))
# App icon
icon = f'<g transform="translate(26 18) scale(1.15)">{mark(GOLD_L)}</g>'
save('kiraam-icone', svg(126, 126, icon, bg=BORDEAUX, rx=28))
save('favicon', svg(126, 126, icon, bg=BORDEAUX, rx=28))


# 2. Horizontal lockup
def horizontal(word_c, tag_c, mark_c):
    wd, ww = shifted('Kiraam', 'cormorant-garamond-latin-700-normal.ttf', 62, 52, track=0.01, x=82)
    td, tw = shifted('BIBLIOTHÈQUE DES KHASSIDAS', 'inter-latin-600-normal.ttf', 9.6, 75, track=0.22, x=84)
    W = 84 + max(ww, tw) + 4
    body = mark(mark_c) + f'<path fill="{word_c}" d="{wd}"/><path fill="{tag_c}" d="{td}"/>'
    return W, body


for name, wc, tc, mc, bg in [('kiraam-logo', BORDEAUX, GOLD, GOLD, None),
                              ('kiraam-logo-blanc', '#FFFFFF', GOLD_L, GOLD_L, None),
                              ('kiraam-logo-mono', BORDEAUX, BORDEAUX, BORDEAUX, None)]:
    W, body = horizontal(wc, tc, mc)
    save(name, svg(W, 86, body))


# 3. Stacked lockup with Arabic
def stacked(word_c, ar_c, mark_c):
    W = 220
    ad, aw = shifted('كِرَام', 'amiri-arabic-700-normal.ttf', 46, 136, x=W / 2, anchor='middle')
    wd, ww = shifted('KIRAAM', 'cormorant-garamond-latin-700-normal.ttf', 30, 200, track=0.32, x=W / 2, anchor='middle')
    td, tw = shifted('KHASSIDAS DE SERIGNE TOUBA', 'inter-latin-600-normal.ttf', 8.2, 222, track=0.2, x=W / 2, anchor='middle')
    body = (f'<g transform="translate({W / 2 - 32} 0)">{mark(mark_c)}</g>'
            f'<path fill="{ar_c}" d="{ad}"/><path fill="{word_c}" d="{wd}"/><path fill="{ar_c}" d="{td}"/>')
    return W, body


for name, wc, ac, mc in [('kiraam-logo-vertical', BORDEAUX, GOLD, GOLD),
                         ('kiraam-logo-vertical-blanc', '#FFFFFF', GOLD_L, GOLD_L)]:
    W, body = stacked(wc, ac, mc)
    save(name, svg(W, 230, body))

# Inline snippets for site/PDF (mark only)
open('/home/claude/build/mark_snippet.svg', 'w').write(mark('currentColor'))
print(sorted(os.listdir(OUT)))
