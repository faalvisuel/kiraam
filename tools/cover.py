"""Couverture Kiraam v2 : le titre au centre d'une arche de Touba, motif d'étoiles des vitraux."""
import math, re, html

e = html.escape
LOGO = '/home/claude/kiraam/assets/brand'

PALETTES = [
    dict(name='bordeaux', bg='#4A0B16', glow='#7A1A2C', arch='#3A0811', ink='#F2DCA4', text='#FFF6E6', soft='#D9BC84', line='#C9A24D', pat='#D9B66C', pat_op=.16),
    dict(name='ivoire', bg='#EFE3CD', glow='#FBF5EA', arch='#FBF7F0', ink='#6B1424', text='#3A0B14', soft='#8A6A3E', line='#B48A3A', pat='#9E7B3A', pat_op=.20),
    dict(name='grenat', bg='#2E0710', glow='#5C1222', arch='#24050C', ink='#E9CA86', text='#FBF0DC', soft='#CDB07A', line='#BE963F', pat='#D2AF68', pat_op=.15),
    dict(name='vin', bg='#64142A', glow='#93263F', arch='#53101F', ink='#F6E0A8', text='#FFF7EA', soft='#E3C78E', line='#D6B05A', pat='#EBCB82', pat_op=.15),
]


def _star(cx, cy, s):
    R, r = s * math.sqrt(2), s / math.cos(math.radians(22.5))
    pts = []
    for i in range(16):
        a = math.radians(-90 + i * 22.5)
        rad = R if i % 2 == 0 else r
        pts.append(f'{cx + rad * math.cos(a):.2f},{cy + rad * math.sin(a):.2f}')
    return 'M' + ' L'.join(pts) + 'Z'


def lattice(color, op):
    """Treillis d'étoiles à 8 branches reliées, comme les vitraux de la Grande Mosquée."""
    t = 16.0
    out = []
    y = 4.0
    row = 0
    while y < 222:
        x = -4.0 + (t / 2 if row % 2 else 0)
        while x < 156:
            out.append(_star(x, y, 3.6))
            # losange de liaison
            out.append(f'M{x + t / 2:.1f},{y - 2.2:.1f} L{x + t / 2 + 2.2:.1f},{y:.1f} L{x + t / 2:.1f},{y + 2.2:.1f} L{x + t / 2 - 2.2:.1f},{y:.1f}Z')
            x += t
        y += t / 2
        row += 1
    return f'<path d="{" ".join(out)}" fill="none" stroke="{color}" stroke-opacity="{op}" stroke-width=".35"/>'


def arch_svg(p):
    # arche en fer à cheval : centre (74,92), r=54, jambes à x=27 / 121
    r, cx, cy = 54, 74, 92
    lx = 27
    dy = math.sqrt(r * r - (cx - lx) ** 2)
    r2, lx2 = 50.5, 30.5
    dy2 = math.sqrt(r2 * r2 - (cx - lx2) ** 2)
    finial = (f'<g fill="{p["line"]}"><circle cx="74" cy="{cy - r - 3.2:.1f}" r="2.6"/>'
              f'<circle cx="74" cy="{cy - r - 8.6:.1f}" r="2.1"/><circle cx="74" cy="{cy - r - 13.2:.1f}" r="1.6"/>'
              f'<rect x="73.5" y="{cy - r - 19.4:.1f}" width="1" height="3.6" rx=".5"/></g>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 148 210" width="148mm" height="210mm" style="position:absolute;left:0;top:0">
<defs><radialGradient id="g" cx="50%" cy="44%" r="70%"><stop offset="0" stop-color="{p['glow']}"/><stop offset="1" stop-color="{p['bg']}"/></radialGradient></defs>
<rect width="148" height="210" fill="url(#g)"/>
{lattice(p['pat'], p['pat_op'])}
<rect x="6" y="6" width="136" height="198" fill="none" stroke="{p['line']}" stroke-width=".45"/>
<path d="M{lx} 190 V{cy + dy:.2f} A{r} {r} 0 1 1 {2 * cx - lx} {cy + dy:.2f} V190 Z" fill="{p['arch']}" stroke="{p['line']}" stroke-width=".9"/>
<path d="M{lx2} 186.5 V{cy + dy2:.2f} A{r2} {r2} 0 1 1 {2 * cx - lx2} {cy + dy2:.2f} V186.5 Z" fill="none" stroke="{p['line']}" stroke-width=".3"/>
<path d="M16 190.6 H132" stroke="{p['line']}" stroke-width="1" stroke-linecap="round"/>
{finial}
<path d="{_star(74, 74, 3.0)}" fill="{p['line']}"/>
</svg>'''


def ar_size(t):
    n = len(re.sub(r'[ً-ٰٟ\s]', '', t))
    return 58 if n <= 6 else 50 if n <= 10 else 41 if n <= 15 else 35 if n <= 21 else 29


def fr_size(t):
    n = len(t)
    return 30 if n <= 10 else 26 if n <= 16 else 23 if n <= 22 else 20


def cover_html(w, p):
    parts = len(w['parts'])
    sub = f"{parts} parties · {w['bayts']} vers" if parts > 1 else f"Khassida · {w['bayts']} vers"
    return f"""
<section class="kc" style="background:{p['bg']}">
  {arch_svg(p)}
  <div class="kc-brand" style="color:{p['soft']}">K I R A A M</div>
  <div class="kc-mid"><div class="kc-cell">
    <div class="kc-ar" dir="rtl" style="color:{p['ink']};font-size:{ar_size(w['titleAr'])}pt">{e(w['titleAr'])}</div>
    <div class="kc-orn" style="color:{p['line']}">— ✦ —</div>
    <div class="kc-fr" style="color:{p['text']};font-size:{fr_size(w['title'])}pt">{e(w['title'])}</div>
    <div class="kc-sub" style="color:{p['soft']}">{sub}</div>
  </div></div>
  <div class="kc-author" style="color:{p['soft']}"><b style="color:{p['text']}">Cheikh Ahmadou Bamba</b><br/>Khadimou Rassoul · Serigne Touba</div>
</section>"""


COVER_CSS = """
.kc { page: cover; position: relative; width: 148mm; height: 210mm; overflow: hidden; text-align: center; }
.kc-brand { position: absolute; top: 9.6mm; left: 0; right: 0; font-family: Corm; font-weight: 600; font-size: 8pt; letter-spacing: .12em; }
.kc-mid { position: absolute; top: 84mm; left: 31mm; width: 86mm; }
.kc-cell { }
.kc-ar { font-family: Amiri; font-weight: 700; line-height: 1.55; }
.kc-orn { font-size: 9pt; margin: 3mm 0 2.5mm; letter-spacing: .1em; }
.kc-fr { font-family: Corm; font-weight: 600; line-height: 1.05; }
.kc-sub { font-family: Corm; font-size: 9.5pt; letter-spacing: .14em; text-transform: uppercase; margin-top: 3.5mm; }
.kc-author { position: absolute; top: 166mm; left: 32mm; width: 84mm; font-family: Corm; font-size: 9pt; line-height: 1.4; letter-spacing: .03em; }
.kc-author b { font-weight: 600; font-size: 10.5pt; }
"""
