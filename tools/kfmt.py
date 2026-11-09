import re, html
MARKS = r'[ً-ٰٟۖ-ۭـ]'
GOD = ('الله', 'لله', 'اله', 'الاله', 'الاله', 'الإله', 'إله', 'اللهم')
PROPHET = ('محمد', 'احمد', 'أحمد', 'المصطفى', 'مصطفى', 'النبي', 'النبى', 'نبي', 'نبى', 'الرسول', 'رسول', 'المختار', 'مختار', 'طه', 'المنتقى')
PFX = ('و', 'ف', 'ب', 'ل', 'ك', 'لل', 'بال', 'وال', 'فال', 'كال', 'ولل', 'يا', 'يا ')
def kind(word):
    s = re.sub(MARKS, '', word).replace('ٱ', 'ا').replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا')
    s = re.sub(r'[^ء-ي]', '', s)
    cands = {s} | {s[len(p):] for p in PFX if s.startswith(p)}
    if any(c in ('الله', 'لله', 'اله', 'الاله', 'اللهم') or (c.startswith('الله') and len(c) <= 6) for c in cands): return 'g'
    if any(c in ('محمد', 'المصطفى', 'مصطفى', 'النبي', 'النبى', 'نبي', 'نبى', 'الرسول', 'رسول', 'المختار', 'مختار', 'طه', 'المنتقى', 'منتقى') for c in cands): return 'p'
    return ''
def kline(text):
    """Hémistiche → deux calques identiques (lettres / voyelles)."""
    words = text.split(' ')
    a = ' '.join(f'<span class="{kind(w)}">{html.escape(w)}</span>' if kind(w) else html.escape(w) for w in words)
    return f'<span class="k"><span class="kl">{a}</span><span class="km" aria-hidden="true">{a}</span></span>'
