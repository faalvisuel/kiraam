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
    o, b = 4.6, 4.4          # marge extérieure, largeur de la bande
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}mm" height="{H}mm">',
           f'<rect width="{W}" height="{H}" fill="{PARCH}"/>',
           f'<rect x="{o}" y="{o}" width="{W - 2 * o}" height="{H - 2 * o}" fill="none" stroke="{BX}" stroke-width="{b}"/>',
           f'<rect x="{o - b / 2 - .5}" y="{o - b / 2 - .5}" width="{W - 2 * o + b + 1}" height="{H - 2 * o + b + 1}" fill="none" stroke="{GOLD}" stroke-width=".3"/>',
           f'<rect x="{o + b / 2 + .5}" y="{o + b / 2 + .5}" width="{W - 2 * o - b - 1}" height="{H - 2 * o - b - 1}" fill="none" stroke="{GOLD}" stroke-width=".3"/>',
           f'<rect x="{o + b / 2 + 2}" y="{o + b / 2 + 2}" width="{W - 2 * o - b - 4}" height="{H - 2 * o - b - 4}" fill="none" stroke="{GOLD}" stroke-width=".15" stroke-dasharray=".6 .9"/>']
    # chaîne d'étoiles dans la bande
    step = 5.2
    def chain(x0, y0, x1, y1):
        n = max(1, round(math.hypot(x1 - x0, y1 - y0) / step))
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            if i % 2 == 0:
                out.append(f'<path d="{star(x, y, 1.05)}" fill="{GOLD_L}"/>')
            else:
                out.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r=".45" fill="{GOLD}"/>')
    pad = 9
    chain(o + pad, o, W - o - pad, o); chain(o + pad, H - o, W / 2 - 13, H - o); chain(W / 2 + 13, H - o, W - o - pad, H - o)
    chain(o, o + pad, o, H - o - pad); chain(W - o, o + pad, W - o, H - o - pad)
    # médaillons d'angle
    for x, y in [(o, o), (W - o, o), (o, H - o), (W - o, H - o)]:
        out.append(medallion(x, y, 4.2))
    # cartouche du numéro de page (bas) et du titre (haut)
    out.append(f'<rect x="{W / 2 - 11}" y="{H - o - 3.6}" width="22" height="7.2" rx="3.6" fill="{BX}" stroke="{GOLD}" stroke-width=".35"/>')
    out.append(f'<path d="M{W / 2 - 15} {o} H{W / 2 - 4} M{W / 2 + 4} {o} H{W / 2 + 15}" stroke="{GOLD}" stroke-width=".3"/>')
    out.append(medallion(W / 2, o, 3.2))
    out.append('</svg>')
    return '\n'.join(out)


def web_border():
    """Tuile 3x3 pour border-image (cases de 30 px) : médaillons aux angles, étoiles sur les côtés."""
    c = 30
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {3 * c} {3 * c}" width="{3 * c}" height="{3 * c}">']
    band = 14
    m = (c - band) / 2  # bande centrée dans la case
    for (x, y, w, h) in [(c, m, c, band), (c, 2 * c + m, c, band), (m, c, band, c), (2 * c + m, c, band, c)]:
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{BX}"/>')
    # liserés or
    for (x1, y1, x2, y2) in [(c, m - 1.5, 2 * c, m - 1.5), (c, m + band + 1.5, 2 * c, m + band + 1.5),
                             (c, 2 * c + m - 1.5, 2 * c, 2 * c + m - 1.5), (c, 2 * c + m + band + 1.5, 2 * c, 2 * c + m + band + 1.5),
                             (m - 1.5, c, m - 1.5, 2 * c), (m + band + 1.5, c, m + band + 1.5, 2 * c),
                             (2 * c + m - 1.5, c, 2 * c + m - 1.5, 2 * c), (2 * c + m + band + 1.5, c, 2 * c + m + band + 1.5, 2 * c)]:
        out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{GOLD}" stroke-width="1"/>')
    for (x, y) in [(1.5 * c, c / 2), (1.5 * c, 2.5 * c), (c / 2, 1.5 * c), (2.5 * c, 1.5 * c)]:
        out.append(f'<path d="{star(x, y, 4)}" fill="{GOLD_L}"/>')
    for (x, y) in [(c, c / 2), (2 * c, c / 2), (c, 2.5 * c), (2 * c, 2.5 * c), (c / 2, c), (c / 2, 2 * c), (2.5 * c, c), (2.5 * c, 2 * c)]:
        out.append(f'<circle cx="{x}" cy="{y}" r="1.6" fill="{GOLD}"/>')
    for (x, y) in [(c / 2, c / 2), (2.5 * c, c / 2), (c / 2, 2.5 * c), (2.5 * c, 2.5 * c)]:
        out.append(medallion(x, y, 11))
    out.append('</svg>')
    return ''.join(out)


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'assets/img'), exist_ok=True)
    open(os.path.join(ROOT, 'assets/img/frame-border.svg'), 'w').write(web_border())
    open('/home/claude/build/page-frame.svg', 'w').write(page_frame())
    open(os.path.join(ROOT, 'tools/page-frame.svg'), 'w').write(page_frame())
    print('ok')
