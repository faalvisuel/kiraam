"""Mesure la largeur réelle (en em) de chaque hémistiche avec la police Ruwudu.
Écrit dans data/k/<n>.json : "em" (largeur de référence de la partie, 92e centile) et "w" par bayit (hémistiche le plus large).
Le site et les PDF en déduisent une taille de texte homogène qui ne déborde jamais."""
import glob, json, os, sys
import uharfbuzz as hb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/fontdl/ttf/ruwudu-full-600.ttf'
blob = hb.Blob.from_file_path(FONT)
face = hb.Face(blob)
font = hb.Font(face)
UPM = face.upem


def em(text):
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, {})
    return sum(p.x_advance for p in buf.glyph_positions) / UPM


def main():
    for f in glob.glob(os.path.join(ROOT, 'data', 'k', '*.json')):
        d = json.load(open(f))
        ws = []
        for b in d['bayts']:
            b['w'] = round(max(em(a) for a in b['ar']), 3) if b['ar'] else 0
            ws.append(b['w'])
        s = sorted(ws)
        d['em'] = round(s[min(len(s) - 1, int(len(s) * .92))], 3) if s else 6
        json.dump(d, open(f, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('ok')


if __name__ == '__main__':
    main()
