"""Cadres ornementaux Kiraam : page PDF (148x210 mm) et bordure web (border-image)."""
import math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BX, DEEP, GOLD, GOLD_L, PARCH = '#6B1424', '#4A0B16', '#C29B4A', '#E2C27A', '#FBF2D8'


def star(cx, cy, s):
    R, r = s * math.sqrt(2), s / math.cos(math.radians(22.5))
    pts = []
    for i in range(16):
        a = math.radians(-90 + i * 22.5)
        rad = R if i % 2 == 0 else r
        pts.append(f'{cx + rad * math.cos(a):.2f},{cy + rad * math.sin(a):.2f}')
    return 'M' + ' L'.join(pts) + 'Z'


def medallion(cx, cy, r):
    return (f'<g><rect x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}" fill="{BX}" stroke="{GOLD}" stroke-width="{r * .08:.2f}" transform="rotate(45 {cx} {cy})"/>'
            f'<rect x="{cx - r}" y="{cy - r}" width="{2 * r}" height="{2 * r}" fill="{BX}" stroke="{GOLD}" stroke-width="{r * .08:.2f}"/>'
            f'<path d="{star(cx, cy, r * .48)}" fill="{GOLD_L}"/><circle cx="{cx}" cy="{cy}" r="{r * .16:.2f}" fill="{BX}"/></g>')


def page_frame():
    W, H = 148, 210
    a, b = 4.2, 7.4               # bord extérieur de la bande, largeur de la bande
    c = a + b                     # bord intérieur
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">',
           f'<rect width="{W}" height="{H}" fill="{PARCH}"/>']
    R = lambda x, sw, col, extra='': out.append(f'<rect x="{x}" y="{x}" width="{W - 2 * x}" height="{H - 2 * x}" fill="none" stroke="{col}" stroke-width="{sw}" {extra}/>')
    # bande bordeaux + double filet or
    out.append(f'<path fill-rule="evenodd" fill="{BX}" d="M{a} {a}H{W - a}V{H - a}H{a}Z M{c} {c}V{H - c}H{W - c}V{c}Z"/>')
    R(a - .9, .5, GOLD); R(a + .7, .25, GOLD_L); R(c - .7, .25, GOLD_L); R(c + .9, .5, GOLD)
    # festons (arcs) vers l'intérieur, comme les arcs de la mosquée
    r = 2.0; step = 5.2; y0 = c + .9
    def arcs(x0, x1, y, horiz=True, inward=1):
        n = int((x1 - x0) / step)
        off = ((x1 - x0) - n * step) / 2
        for i in range(n):
            u = x0 + off + i * step + step / 2
            if horiz:
                out.append(f'<path d="M{u - r:.2f} {y:.2f} A{r} {r} 0 0 {1 if inward > 0 else 0} {u + r:.2f} {y:.2f}" fill="none" stroke="{GOLD}" stroke-width=".5"/>')
                out.append(f'<circle cx="{u:.2f}" cy="{y + inward * (r + 1.1):.2f}" r=".5" fill="{BX}"/>')
            else:
                out.append(f'<path d="M{y:.2f} {u - r:.2f} A{r} {r} 0 0 {0 if inward > 0 else 1} {y:.2f} {u + r:.2f}" fill="none" stroke="{GOLD}" stroke-width=".5"/>')
                out.append(f'<circle cx="{y + inward * (r + 1.1):.2f}" cy="{u:.2f}" r=".5" fill="{BX}"/>')
    arcs(c + 8, W - c - 8, y0, True, 1); arcs(c + 8, W / 2 - 15, H - y0, True, -1); arcs(W / 2 + 15, W - c - 8, H - y0, True, -1)
    arcs(c + 8, H - c - 8, y0, False, 1); arcs(c + 8, H - c - 8, W - y0, False, -1)
    # chaîne d'étoiles et de losanges dans la bande
    m = a + b / 2; st = 6.2
    def chain(x0, y0_, x1, y1):
        L = math.hypot(x1 - x0, y1 - y0_); n = max(1, round(L / st))
        for i in range(n + 1):
            t = i / n; x, y = x0 + (x1 - x0) * t, y0_ + (y1 - y0_) * t
            if i % 2 == 0:
                out.append(f'<path d="{star(x, y, 1.55)}" fill="{GOLD_L}"/><circle cx="{x:.2f}" cy="{y:.2f}" r=".45" fill="{BX}"/>')
            else:
                out.append(f'<path d="M{x:.2f} {y - 1.1:.2f} L{x + 1.1:.2f} {y:.2f} L{x:.2f} {y + 1.1:.2f} L{x - 1.1:.2f} {y:.2f}Z" fill="{GOLD}"/>')
    pad = 12
    chain(a + pad, m, W / 2 - 9, m); chain(W / 2 + 9, m, W - a - pad, m)
    chain(a + pad, H - m, W / 2 - 16, H - m); chain(W / 2 + 16, H - m, W - a - pad, H - m)
    chain(m, a + pad, m, H - a - pad); chain(W - m, a + pad, W - m, H - a - pad)
    for x, y in [(m, m), (W - m, m), (m, H - m), (W - m, H - m)]:
        out.append(medallion(x, y, 5.3))
        out.append(f'<circle cx="{x}" cy="{y}" r="6.6" fill="none" stroke="{GOLD}" stroke-width=".3"/>')
    out.append(medallion(W / 2, m, 4.6))
    # cartouche du numéro de page
    out.append(f'<rect x="{W / 2 - 13}" y="{H - m - 4.4}" width="26" height="8.8" rx="4.4" fill="{BX}" stroke="{GOLD}" stroke-width=".5"/>')
    out.append(f'<rect x="{W / 2 - 11.8}" y="{H - m - 3.2}" width="23.6" height="6.4" rx="3.2" fill="none" stroke="{GOLD_L}" stroke-width=".2"/>')
    out.append('</svg>')
    return '\n'.join(out)


def web_border():
    """Tuile 3x3 pour border-image (cases de 40 px)."""
    c = 40; band = 30; m = 4
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {3 * c} {3 * c}" width="{3 * c}" height="{3 * c}">']
    for (x, y, w, h) in [(c, m, c, band), (c, 3 * c - m - band, c, band), (m, c, band, c), (3 * c - m - band, c, band, c)]:
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{BX}"/>')
    for k in (m - 1.6, m + 1.2, m + band - 1.2, m + band + 1.6):
        sw = 1.4 if k in (m - 1.6, m + band + 1.6) else .7
        col = GOLD if sw > 1 else GOLD_L
        out.append(f'<line x1="{c}" y1="{k}" x2="{2 * c}" y2="{k}" stroke="{col}" stroke-width="{sw}"/>')
        out.append(f'<line x1="{c}" y1="{3 * c - k}" x2="{2 * c}" y2="{3 * c - k}" stroke="{col}" stroke-width="{sw}"/>')
        out.append(f'<line x1="{k}" y1="{c}" x2="{k}" y2="{2 * c}" stroke="{col}" stroke-width="{sw}"/>')
        out.append(f'<line x1="{3 * c - k}" y1="{c}" x2="{3 * c - k}" y2="{2 * c}" stroke="{col}" stroke-width="{sw}"/>')
    mid = m + band / 2
    for (x, y) in [(1.5 * c, mid), (1.5 * c, 3 * c - mid), (mid, 1.5 * c), (3 * c - mid, 1.5 * c)]:
        out.append(f'<path d="{star(x, y, 5.2)}" fill="{GOLD_L}"/><circle cx="{x}" cy="{y}" r="1.5" fill="{BX}"/>')
    for (x, y) in [(c, mid), (2 * c, mid), (c, 3 * c - mid), (2 * c, 3 * c - mid), (mid, c), (mid, 2 * c), (3 * c - mid, c), (3 * c - mid, 2 * c)]:
        out.append(f'<path d="M{x} {y - 3.4} L{x + 3.4} {y} L{x} {y + 3.4} L{x - 3.4} {y}Z" fill="{GOLD}"/>')
    # festons
    e = m + band + 1.6
    for (cx, cy, sweep, rot) in [(1.5 * c, e, 1, 'h'), (1.5 * c, 3 * c - e, 0, 'h'), (e, 1.5 * c, 0, 'v'), (3 * c - e, 1.5 * c, 1, 'v')]:
        for d in (-10, 10):
            if rot == 'h':
                out.append(f'<path d="M{cx + d - 6} {cy} A6 6 0 0 {sweep} {cx + d + 6} {cy}" fill="none" stroke="{GOLD}" stroke-width=".9"/>')
            else:
                out.append(f'<path d="M{cx} {cy + d - 6} A6 6 0 0 {sweep} {cx} {cy + d + 6}" fill="none" stroke="{GOLD}" stroke-width=".9"/>')
    for (x, y) in [(c / 2, c / 2), (2.5 * c, c / 2), (c / 2, 2.5 * c), (2.5 * c, 2.5 * c)]:
        out.append(medallion(x, y, 15))
    out.append('</svg>')
    return ''.join(out)


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'assets/img'), exist_ok=True)
    open(os.path.join(ROOT, 'assets/img/frame-border.svg'), 'w').write(web_border())
    open('/home/claude/build/page-frame.svg', 'w').write(page_frame())
    open(os.path.join(ROOT, 'tools/page-frame.svg'), 'w').write(page_frame())
    print('ok')
