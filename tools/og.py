"""Images de partage (Open Graph 1200x630) pour WhatsApp, Facebook, X… — une par livre + une générale."""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/fontdl/ttf'
OUT = os.path.join(ROOT, 'og'); os.makedirs(OUT, exist_ok=True)
W, H = 1200, 630
DEEP, BX, GOLD, GOLD_L = (44, 6, 14), (107, 20, 36), (194, 155, 74), (217, 182, 108)

corm = lambda s: ImageFont.truetype(f'{FONTS}/cormorant-garamond-latin-600-normal.ttf', s)
inter = lambda s: ImageFont.truetype(f'{FONTS}/inter-latin-600-normal.ttf', s)
amiri = lambda s: ImageFont.truetype(f'{FONTS}/amiri-arabic-700-normal.ttf', s, layout_engine=ImageFont.Layout.RAQM)


def background():
    bg = Image.new('RGB', (W, H), DEEP)
    g = Image.new('L', (W, H), 0)
    ImageDraw.Draw(g).ellipse((-200, -300, 900, 900), fill=255)
    g = g.filter(ImageFilter.GaussianBlur(160))
    bg.paste(Image.new('RGB', (W, H), (122, 26, 44)), mask=g)
    d = ImageDraw.Draw(bg, 'RGBA')
    t = 56
    for row, y in enumerate(range(-t, H + t, t // 2)):
        for x in range(-t + (t // 2 if row % 2 else 0), W + t, t):
            pts = []
            for i in range(16):
                a = math.radians(-90 + i * 22.5)
                r = 13 if i % 2 == 0 else 9.6
                pts.append((x + r * math.cos(a), y + r * math.sin(a)))
            d.polygon(pts, outline=(226, 194, 122, 26))
    return bg


def fit(draw, text, font_fn, size, maxw, min_size=20):
    while size > min_size and draw.textlength(text, font=font_fn(size)) > maxw:
        size -= 2
    return font_fn(size)


def logo(bg):
    lg = Image.open(os.path.join(ROOT, 'assets/brand/kiraam-logo-blanc.png')).convert('RGBA')
    lg.thumbnail((300, 90))
    bg.paste(lg, (W - lg.width - 64, 52), lg)


def book_image(w):
    bg = background()
    cv = Image.open(os.path.join(ROOT, 'covers', f"{w['slug']}.webp")).convert('RGB')
    ch = 520; cw = round(cv.width * ch / cv.height); cv = cv.resize((cw, ch), Image.LANCZOS)
    sh = Image.new('RGBA', (cw + 80, ch + 80), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((40, 50, cw + 40, ch + 40), 10, fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    bg.paste(sh, (70 - 40, 55 - 40), sh)
    bg.paste(cv, (70, 55))
    logo(bg)
    d = ImageDraw.Draw(bg)
    x0, maxw = 70 + cw + 70, W - (70 + cw + 70) - 64
    fa = fit(d, w['titleAr'], amiri, 54, maxw)
    d.text((x0 + maxw, 236), w['titleAr'], font=fa, fill=GOLD_L, anchor='rs', direction='rtl')
    ff = fit(d, w['title'], corm, 56, maxw)
    d.text((x0, 330), w['title'], font=ff, fill=(255, 246, 230), anchor='ls')
    d.line((x0, 362, x0 + 70, 362), fill=GOLD, width=3)
    np = len(w['parts'])
    d.text((x0, 410), f"{np} PARTIES · {w['bayts']} VERS" if np > 1 else f"KHASSIDA · {w['bayts']} VERS", font=inter(20), fill=GOLD_L, anchor='ls')
    d.text((x0, 470), 'Cheikh Ahmadou Bamba', font=corm(34), fill=(255, 246, 230), anchor='ls')
    d.text((x0, 506), 'Serigne Touba · Khadimou Rassoul', font=corm(26), fill=(222, 200, 160), anchor='ls')
    d.text((x0, 572), 'PDF gratuit · arabe · translittération · traduction', font=inter(17), fill=(210, 180, 140), anchor='ls')
    bg.save(os.path.join(OUT, f"{w['slug']}.jpg"), quality=84, optimize=True, progressive=True)


def site_image(n_books, n_k):
    ph = Image.open(os.path.join(ROOT, 'assets/photos/mosquee-touba.webp')).convert('RGB')
    s = max(W / ph.width, H / ph.height); ph = ph.resize((round(ph.width * s), round(ph.height * s)), Image.LANCZOS)
    top = round((ph.height - H) * .3); ph = ph.crop((0, top, W, top + H))
    ov = Image.new('RGBA', (W, H), (44, 6, 14, 200))
    bg = Image.alpha_composite(ph.convert('RGBA'), ov).convert('RGB')
    lg = Image.open(os.path.join(ROOT, 'assets/brand/kiraam-logo-vertical-blanc.png')).convert('RGBA'); lg.thumbnail((360, 360))
    bg.paste(lg, ((W - lg.width) // 2, 60), lg)
    d = ImageDraw.Draw(bg)
    d.text((W // 2, 495), 'Les khassidas de Serigne Touba', font=corm(56), fill=(255, 246, 230), anchor='ms')
    d.text((W // 2, 548), f'{n_books} livres · {n_k} khassidas · PDF gratuits · arabe et traduction', font=inter(21), fill=GOLD_L, anchor='ms')
    bg.save(os.path.join(OUT, 'kiraam.jpg'), quality=85, optimize=True, progressive=True)


if __name__ == '__main__':
    lib = json.load(open(os.path.join(ROOT, 'data/library.json')))['works']
    for w in lib:
        book_image(w)
    site_image(len(lib), sum(len(w['parts']) for w in lib))
    print(len(lib) + 1, 'images')
