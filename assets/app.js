/* Kiraam — bibliothèque des khassidas de Serigne Touba */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const view = $('#view');
  const rootMeta = document.querySelector('meta[name="kiraam-root"]');
  const R = new URL(rootMeta ? rootMeta.content : './', location.href).pathname;
  const segs = () => location.pathname.slice(R.length).split('/').filter(Boolean).map(decodeURIComponent);
  // les liens du gabarit sont relatifs à la page d'arrivée : on les fige en chemins absolus
  document.querySelectorAll('a[href], img[src], link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(el => {
    const attr = el.tagName === 'IMG' ? 'src' : 'href', v = el.getAttribute(attr);
    if (v && !/^(https?:|#|mailto:|\/|data:)/.test(v)) el.setAttribute(attr, new URL(v, location.href).pathname);
  });
  function navigate(path, replace) { history[replace ? 'replaceState' : 'pushState'](null, '', R + path); route(); }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const stripAr = s => s.replace(/[ً-ٰٟۖ-ۭ]/g, '');
  const norm = s => stripAr(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')).replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();
  const ic = (id, cls = '') => `<svg class="ic ${cls}"><use href="#i-${id}"/></svg>`;
  const fmt = n => n.toLocaleString('fr-FR');

  const store = {
    get(k, d) { try { const v = localStorage.getItem('kiraam:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('kiraam:' + k, JSON.stringify(v)); } catch {} }
  };
  const favs = new Set(store.get('favs', []));
  const progress = store.get('progress', {});
  const prefs = Object.assign({ lang: 'fr', tr: true, fs: 1 }, store.get('prefs', {}));
  const savePrefs = () => store.set('prefs', prefs);

  let LIB = [], BY = {}, AUDIO = {};
  // Numéro WhatsApp de Kiraam (format international sans + ni espaces), utilisé pour la précommande et le contact
  const WHATSAPP = '';
  const waLink = text => WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : '';
  const FORMATS = [
    ['complet', 'Complet', 'Arabe · translittération · français'],
    ['arabe', 'Arabe seul', 'Texte arabe vocalisé'],
    ['phonetique', 'Arabe + phonétique', 'Arabe et translittération latine'],
    ['francais', 'Français seul', 'Traduction française'],
    ['anglais', 'English only', 'English translation']];
  const pdfUrl = (w, f) => `${R}pdf/${w.slug}${f === 'complet' ? '' : '-' + f}.pdf`;
  const partCache = {};
  const PHOTOS = [
    ['mosquee-touba', 'La Grande Mosquée de Touba'], ['minaret-jour', 'Le minaret Lamp Fall'],
    ['minaret-dome', 'Coupoles et minaret'], ['vitrail', 'Vitraux étoilés'],
    ['minaret-nuit', 'Le minaret, la nuit'], ['facade-nuit', 'Arcades de nuit'], ['lanternes', 'Lanternes du parvis']
  ];
  const mb = b => (b / 1048576 < 1 ? Math.round(b / 1024) + ' Ko' : (b / 1048576).toFixed(1).replace('.', ',') + ' Mo');

  // ---------- Components ----------
  function card(w, opts = {}) {
    const p = progress[w.slug];
    const pct = p ? Math.min(100, Math.round(p.done / w.bayts * 100)) : 0;
    return `<article class="card">
      <a class="cv" href="${R}livre/${w.slug}/" aria-label="${esc(w.title)}">
        <img src="${R}covers/${w.slug}.webp" alt="" loading="lazy" width="641" height="910">
        ${w.parts.length > 1 ? `<span class="tag">${ic('layers')}${w.parts.length} parties</span>` : ''}
        ${AUDIO[w.slug] ? `<span class="aud">${ic('audio')}Audio</span>` : ''}
      </a>
      <button class="fav${favs.has(w.slug) ? ' on' : ''}" data-fav="${w.slug}" aria-label="Ajouter aux favoris">${ic('khatam')}</button>
      <div class="body">
        <div class="t-ar">${esc(w.titleAr)}</div>
        <a class="t-fr" href="${R}livre/${w.slug}/">${esc(w.title)}</a>
        <div class="meta"><span>${ic('verses')}${w.bayts} vers</span><span>${ic('lang')}${w.langs.map(l => l.toUpperCase()).join(' · ')}</span></div>
        ${opts.progress && p ? `<div class="progress" title="${pct}% lu"><i style="width:${pct}%"></i></div>` : ''}
        <div class="foot">
          <a class="btn btn-bx sm" href="${R}lire/${w.slug}/${p ? p.part : 1}/">${ic('read')}${p ? 'Reprendre' : 'Lire'}</a>
          <a class="pdf" href="${R}livre/${w.slug}/" title="Télécharger : complet, arabe, français…">${ic('download')}<span>PDF</span></a>
        </div>
      </div>
    </article>`;
  }

  function banner(title, ar, img, crumb) {
    return `<header class="banner"><img src="${R}assets/photos/${img}.webp" alt="">
      <div class="wrap banner-in">
        <div class="crumbs"><a href="${R}">Accueil</a>${ic('arrow')}<span>${crumb || title}</span></div>
        <h1>${title}</h1>${ar ? `<div class="ar">${ar}</div>` : ''}
      </div></header>`;
  }

  const sec = (eyebrowIcon, eyebrow, title, sub, right = '') => `
    <div class="sec-head"><div><span class="eyebrow">${ic(eyebrowIcon)}${eyebrow}</span><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${right}</div>`;

  // ---------- Home ----------
  function homeView() {
    const nK = LIB.reduce((a, w) => a + w.parts.length, 0);
    const nV = LIB.reduce((a, w) => a + w.bayts, 0);
    const feat = LIB.filter(w => w.featured);
    const daily = LIB[Math.floor(Date.now() / 864e5) % LIB.length];
    const reading = Object.entries(progress).sort((a, b) => b[1].at - a[1].at).map(([s]) => BY[s]).filter(Boolean).slice(0, 8);
    view.innerHTML = `
    <section class="hero">
      <img class="hero-img" src="${R}assets/photos/mosquee-touba.webp" alt="La Grande Mosquée de Touba">
      <div class="hero-in">
        <span class="pill">${ic('khatam')}Bienvenue sur Kiraam</span>
        <h1>Les écrits de Serigne Touba,<br><span class="highlight">à portée de cœur<span class="ar">قَصَائِدُ خَادِمِ الرَّسُول</span></span></h1>
        <p class="lead">${LIB.length} livres et ${nK} khassidas de Cheikh Ahmadou Bamba Khadimou Rassoul, en arabe vocalisé avec translittération et traduction. À lire en ligne ou à télécharger en PDF, librement.</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="${R}bibliotheque/">${ic('rehal')}Explorer la bibliothèque</a>
          <a class="btn btn-glass" href="${R}livre/${daily.slug}/">${ic('khatam')}Khassida du jour : ${esc(daily.title)}</a>
        </div>
      </div>
    </section>

    <form class="finder" id="finder" role="search">
      <div class="finder-tabs"><button type="button" class="on">${ic('search')}Trouver un khassida</button><button type="button" data-go="livre/${daily.slug}/">${ic('khatam')}Du jour</button></div>
      <div class="finder-row">
        <div class="field"><label for="fq">Nom du khassida ou premiers mots</label><div class="control">${ic('search')}<input id="fq" placeholder="Jazbu, Mawahibu, مَوَاهِب…" autocomplete="off"></div></div>
        <div class="field"><label for="fl">Longueur</label><div class="control">${ic('verses')}<select id="fl"><option value="all">Toutes</option><option value="short">Courts (≤ 25 vers)</option><option value="mid">Moyens</option><option value="long">Longs (100+ vers)</option></select></div></div>
        <div class="field"><label for="ft">Traduction</label><div class="control">${ic('lang')}<select id="ft"><option value="fr">Français</option><option value="en">Anglais</option><option value="it">Italien</option></select></div></div>
        <button class="btn btn-bx" type="submit">${ic('search')}Rechercher</button>
      </div>
    </form>

    <section class="block"><div class="wrap about">
      <div>
        <span class="eyebrow">${ic('mihrab')}Kiraam, la bibliothèque</span>
        <h2 class="h2">Les khassidas, <em>réunis</em> pour tous</h2>
        <p>Kiraam rassemble l'œuvre poétique de Serigne Touba dans une bibliothèque simple et belle. Chaque khassida se lit en ligne, vers par vers, ou se télécharge en livre PDF pour le daara, la dahira ou la maison.</p>
        <ul class="checks">
          <li>${ic('khatam')}Texte arabe entièrement vocalisé, fidèle à la récitation</li>
          <li>${ic('khatam')}Translittération latine pour accompagner la lecture</li>
          <li>${ic('khatam')}Traductions française, anglaise et italienne</li>
          <li>${ic('khatam')}${LIB.length} livres PDF gratuits, prêts à imprimer</li>
        </ul>
        <div class="hero-actions" style="justify-content:flex-start">
          <a class="btn btn-bx" href="${R}bibliotheque/">${ic('rehal')}Voir les livres</a>
          <a class="btn btn-line" href="${R}serigne-touba/">${ic('minaret')}Serigne Touba</a>
        </div>
      </div>
      <div class="collage">
        <div class="main"><img src="${R}assets/photos/minaret-jour.webp" alt="Le minaret de la Grande Mosquée de Touba" loading="lazy"></div>
        <div class="float f1"><img class="av" src="${R}assets/img/serigne-touba.webp" alt=""><span><b>${nK}</b>khassidas de Khadimou Rassoul</span></div>
        <div class="float f2">${ic('download')}<span><b>${LIB.length}</b>livres PDF gratuits</span></div>
      </div>
    </div></section>

    ${reading.length ? `<section class="block" style="padding-top:0"><div class="wrap">
      ${sec('fanous', 'Mes lectures', 'Reprendre <em>là où</em> vous étiez', '', `<a class="btn btn-line" href="${R}lectures/">Tout voir${ic('arrow')}</a>`)}
      <div class="track">${reading.map(w => card(w, { progress: true })).join('')}</div></div></section>` : ''}

    <section class="block" style="padding-top:${reading.length ? 0 : 20}px"><div class="wrap carousel">
      ${sec('rehal', 'Œuvres majeures', 'Les grands <em>khassidas</em>', 'Jazbul Qulūb, Mawāhibu Nāfiʿ, Matlabul Fawzayni… les œuvres les plus récitées.',
        `<div class="arrows"><button class="ibtn" data-scroll="-1" aria-label="Précédent">${ic('back')}</button><button class="ibtn" data-scroll="1" aria-label="Suivant">${ic('arrow')}</button></div>`)}
      <div class="track" id="featTrack">${feat.map(w => card(w)).join('')}</div>
    </div></section>

    <section class="band"><img class="band-img" src="${R}assets/photos/vitrail.webp" alt="" loading="lazy">
      <div class="wrap band-in">
        <div><span class="eyebrow">${ic('khatam')}Kiraam en chiffres</span><h2>Au service de l'œuvre de Khadimou Rassoul</h2><p>Une bibliothèque qui grandit avec la communauté : chaque correction profite à tous.</p></div>
        <div class="stats">
          <div class="stat"><div class="ico">${ic('rehal')}</div><b>${LIB.length}</b><span>livres</span></div>
          <div class="stat"><div class="ico">${ic('read')}</div><b>${nK}</b><span>khassidas</span></div>
          <div class="stat"><div class="ico">${ic('verses')}</div><b>${fmt(nV)}</b><span>vers</span></div>
          <div class="stat"><div class="ico">${ic('lang')}</div><b>4</b><span>langues</span></div>
        </div>
      </div>
    </section>

    <section class="block"><div class="wrap">
      ${sec('search', 'Toute la bibliothèque', 'Trouvez votre <em>khassida</em>', 'Filtrez par longueur ou par traduction, ou cherchez par nom.', `<a class="btn btn-line" href="${R}bibliotheque/">Les ${LIB.length} livres${ic('arrow')}</a>`)}
      <div class="grid">${LIB.slice(0, 8).map(w => card(w)).join('')}</div>
    </div></section>

    <section class="block" style="padding-top:0"><div class="wrap">
      <div class="center">${sec('minaret', 'Touba, la ville sainte', 'Souvenirs de la <em>Grande Mosquée</em>', 'Là où les khassidas résonnent jour et nuit.')}</div>
      ${galleryGrid(PHOTOS.slice(1, 6))}
    </div></section>

    <section class="block" style="padding-top:0"><div class="wrap"><div class="preorder" style="padding:34px 36px">
      <div><b style="font-size:30px">${ic('rehal')}Les khassidas en livres imprimés</b><span style="font-size:15px;max-width:560px">Kiraam prépare des éditions reliées, avec les mêmes couvertures. Précommandez votre livre depuis sa page : nous vous recontactons sur WhatsApp.</span></div>
      <a class="btn btn-gold" href="${R}livre/jazbu/">${ic('khatam')}Choisir un livre</a></div></div></section>

    <section class="wrap"><div class="quote">
      <div class="arch-portrait"><img src="${R}assets/img/serigne-touba.webp" alt="Serigne Touba" loading="lazy"></div>
      <div>
        <p class="ar-big">الشَّيْخُ أَحْمَدُ بَمْبَا</p>
        <h3>Khadimou Rassoul, le Serviteur du Prophète <span class="saw">ﷺ</span></h3>
        <p>Fondateur de Touba et de la Mouridiyya, Cheikh Ahmadou Bamba a consacré sa plume à la louange du Prophète et à l'éducation des âmes. Ses khassidas sont récités chaque jour, du Sénégal au monde entier.</p>
        <a class="btn btn-bx" href="${R}serigne-touba/">${ic('minaret')}Découvrir sa vie</a>
      </div>
    </div></section>`;

    $('#finder').addEventListener('submit', e => {
      e.preventDefault();
      libState.q = $('#fq').value; libState.len = $('#fl').value; libState.lang = $('#ft').value;
      navigate('bibliotheque/');
    });
  }

  function galleryGrid(list) {
    return `<div class="gallery">${list.map(([f, cap]) => `<figure data-photo="${f}"><img src="${R}assets/photos/${f}-sm.webp" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`).join('')}</div>`;
  }

  // ---------- Library ----------
  const libState = { q: '', f: 'all', len: 'all', lang: 'fr', sort: 'az' };
  const FILTERS = {
    all: ['Tous', 'rehal', () => true],
    major: ['Œuvres majeures', 'khatam', w => w.featured],
    multi: ['En plusieurs parties', 'layers', w => w.parts.length > 1],
    audio: ['Avec audio', 'audio', w => !!AUDIO[w.slug]],
    favs: ['Mes favoris', 'khatam', w => favs.has(w.slug)]
  };
  function filtered() {
    const nq = norm(libState.q);
    let l = LIB.filter(FILTERS[libState.f][2]);
    if (libState.len === 'short') l = l.filter(w => w.bayts <= 25);
    if (libState.len === 'mid') l = l.filter(w => w.bayts > 25 && w.bayts < 100);
    if (libState.len === 'long') l = l.filter(w => w.bayts >= 100);
    if (libState.lang !== 'fr') l = l.filter(w => w.langs.includes(libState.lang));
    if (nq) l = l.filter(w => w._s.includes(nq));
    const s = libState.sort;
    return [...l].sort((a, b) => s === 'za' ? b.title.localeCompare(a.title) : s === 'long' ? b.bayts - a.bayts : s === 'short' ? a.bayts - b.bayts : a.title.localeCompare(b.title));
  }
  function libraryView() {
    view.innerHTML = banner('La bibliothèque', 'مَكْتَبَةُ الْقَصَائِد', 'facade-nuit') + `
      <section class="block" style="padding-top:50px"><div class="wrap">
        <div class="toolbar">
          <div class="chips">${Object.entries(FILTERS).map(([k, [l, i]]) => `<button class="chip${libState.f === k ? ' on' : ''}" data-filter="${k}">${ic(i)}${l}</button>`).join('')}</div>
          <div class="lib-search">
            <div class="control">${ic('search')}<input id="lq" placeholder="Rechercher… (latin ou arabe)" value="${esc(libState.q)}" autocomplete="off"></div>
            <select class="select" id="lsort" aria-label="Trier"><option value="az">A → Z</option><option value="za">Z → A</option><option value="long">Plus longs</option><option value="short">Plus courts</option></select>
          </div>
        </div>
        <div id="libOut"></div>
      </div></section>`;
    $('#lsort').value = libState.sort;
    renderLib();
    const q = $('#lq'); let t;
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { libState.q = q.value; renderLib(); }, 120); });
  }
  function renderLib() {
    const l = filtered();
    const extra = [libState.len !== 'all' ? { short: 'courts', mid: 'moyens', long: 'longs' }[libState.len] : '', libState.lang !== 'fr' ? 'traduits en ' + { en: 'anglais', it: 'italien' }[libState.lang] : ''].filter(Boolean).join(', ');
    $('#libOut').innerHTML = `<p class="count">${l.length} livre${l.length > 1 ? 's' : ''}${libState.q ? ` pour « ${esc(libState.q)} »` : ''}${extra ? ` · ${extra} <button class="chip" style="height:28px;margin-left:6px" data-reset>Effacer</button>` : ''}</p>` +
      (l.length ? `<div class="grid">${l.map(w => card(w)).join('')}</div>` :
        `<div class="empty"><div class="ar">لَا شَيْء</div><h3>Aucun khassida trouvé</h3><p>Essayez une autre orthographe : « Jazbu », « Mawahibu », « Matlabul »…</p></div>`);
  }

  // ---------- Book page ----------
  async function bookView(slug) {
    const w = BY[slug]; if (!w) return notFound();
    const p = progress[w.slug];
    const related = LIB.filter(x => x !== w && (x.featured || x.parts.length > 1)).sort(() => .5 - Math.random()).slice(0, 4);
    view.innerHTML = banner(esc(w.title), esc(w.titleAr), 'minaret-dome', `<a href="${R}bibliotheque/">Bibliothèque</a>${ic('arrow')}${esc(w.title)}`) + `
    <div class="wrap book">
      <div class="book-cover"><div class="flip" data-flip role="button" tabindex="0" aria-label="Retourner le livre">
        <div class="face front" style="background-image:url('${R}covers/${w.slug}.webp')" role="img" aria-label="Couverture de ${esc(w.title)}"></div>
        <div class="face back" style="background-image:url('${R}covers/${w.slug}-verso.webp')" role="img" aria-label="Quatrième de couverture de ${esc(w.title)}"></div>
      </div><p class="flip-hint">${ic('khatam')}Survolez ou touchez le livre pour voir le verso</p></div>
      <div class="book-info">
        <span class="eyebrow">${ic('khatam')}${w.parts.length > 1 ? `Œuvre en ${w.parts.length} parties` : 'Khassida'}</span>
        <div class="t-ar">${esc(w.titleAr)}</div>
        <h1>${esc(w.title)}</h1>
        <p class="by">Cheikh Ahmadou Bamba Khadimou Rassoul · Serigne Touba${w.aka ? `<br><small>Aussi écrit : ${w.aka.map(esc).join(', ')}</small>` : ''}</p>
        <div class="kv"><div><b>${w.bayts}</b><span>vers</span></div><div><b>${w.parts.length}</b><span>${w.parts.length > 1 ? 'parties' : 'partie'}</span></div><div><b>${w.pages}</b><span>pages PDF</span></div><div><b>${w.langs.length + 1}</b><span>langues</span></div></div>
        <div class="langs"><span>العربية</span><span>Translittération</span>${w.langs.map(l => `<span>${{ fr: 'Français', en: 'English', it: 'Italiano' }[l]}</span>`).join('')}</div>
        <div class="actions">
          <a class="btn btn-gold" href="${R}lire/${w.slug}/${p ? p.part : 1}/">${ic('read')}${p ? 'Reprendre la lecture' : 'Lire en ligne'}</a>
          ${AUDIO[w.slug] ? `<button class="btn btn-bx" data-listen="${w.slug}" data-i="0">${ic('play')}Écouter</button>` : ''}
          <div class="dl"><button class="btn btn-line" data-dl aria-expanded="false">${ic('download')}Télécharger le PDF${ic('min', 'chev')}</button>
            <div class="dl-menu" role="menu">${FORMATS.filter(([f]) => !w.pdfs || w.pdfs[f]).map(([f, n, d]) => `<a role="menuitem" href="${pdfUrl(w, f)}" download><b>${n}</b><small>${d}${w.pdfs ? ' · ' + mb(w.pdfs[f]) : ''}</small></a>`).join('')}</div></div>
          <button class="ibtn${favs.has(w.slug) ? ' on' : ''}" data-fav="${w.slug}" aria-label="Favori">${ic('khatam')}</button>
          <button class="ibtn" data-share="${w.slug}" aria-label="Partager">${ic('share')}</button>
        </div>
        <div class="preorder"><div><b>${ic('rehal')}Bientôt en livre imprimé</b><span>Réservez votre exemplaire relié de ${esc(w.title)}. Nous vous recontactons sur WhatsApp.</span></div>
          <button class="btn btn-gold" data-preorder="${w.slug}">${ic('khatam')}Précommander</button></div>
        ${w.parts.length > 1 ? `<div class="parts">${w.partNames.map((n, i) => `<a href="${R}lire/${w.slug}/${i + 1}/"><span>${esc(n)}</span><small>${ic('arrow')}</small></a>`).join('')}</div>` : ''}
        ${AUDIO[w.slug] ? `<div class="listen"><h3>${ic('audio')}Écouter</h3><p class="sub">${AUDIO[w.slug].length} déclamation${AUDIO[w.slug].length > 1 ? 's' : ''} par les kourels · le lecteur continue pendant que vous lisez</p>
          <div class="recs">${AUDIO[w.slug].map((r, i) => recRow(w, r, i)).join('')}</div></div>` : ''}
        <div class="excerpt" id="excerpt"><h3>Premiers vers</h3><p class="count">Chargement…</p></div>
      </div>
    </div>
    <section class="block" style="padding-top:40px"><div class="wrap">${sec('rehal', 'À lire aussi', 'Dans la <em>même</em> bibliothèque', '')}<div class="grid">${related.map(x => card(x)).join('')}</div></div></section>`;
    try {
      const d = await getPart(w.parts[0]);
      const ex = $('#excerpt'); if (!ex) return;
      ex.innerHTML = `<h3>Premiers vers</h3>` + d.bayts.slice(0, 3).map(b => `<div class="v"><div class="ar">${b.ar.map(a => `<span>${esc(a)}</span>`).join('<span class="sep">۞</span>')}</div><div class="tr">${esc(b.tr.join(' · '))}</div><div class="tl">${esc(b.fr)}</div></div>`).join('') +
        `<div style="text-align:center;margin-top:16px"><a class="btn btn-line sm" href="${R}lire/${w.slug}/1/">Lire la suite${ic('arrow')}</a></div>`;
    } catch {}
  }

  // ---------- Reader ----------
  function getPart(n) {
    if (!partCache[n]) partCache[n] = fetch(`${R}data/k/${n}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    return partCache[n];
  }
  const numBadge = n => `<span class="num"><svg class="ic" viewBox="0 0 24 24"><path d="M12 1.5l3 4.3 5.2-.5-.5 5.2L24 12l-4.3 3 .5 5.2-5.2-.5L12 24l-3-4.3-5.2.5.5-5.2L0 12l4.3-3-.5-5.2 5.2.5z" transform="scale(.92) translate(1 0)"/></svg>${arNum(n)}</span>`;
  let readerObs = null;
  async function readerView(slug, partIdx, baytN) {
    const w = BY[slug]; if (!w) return notFound();
    partIdx = Math.min(Math.max(1, partIdx || 1), w.parts.length);
    view.innerHTML = `<div class="empty"><div class="ar">بِسْمِ اللَّهِ</div><p>Ouverture du livre…</p></div>`;
    let data;
    try { data = await getPart(w.parts[partIdx - 1]); }
    catch { view.innerHTML = `<div class="empty"><h3>Impossible de charger ce texte</h3><p>Vérifiez votre connexion et réessayez.</p></div>`; return; }
    if (segs()[1] !== slug) return;
    const has = l => data.bayts.some(b => b[l]);
    const langs = ['fr', 'en', 'it'].filter(has);
    const lang = prefs.lang === 'none' || langs.includes(prefs.lang) ? prefs.lang : 'fr';
    const prev = partIdx > 1 ? partIdx - 1 : null, next = partIdx < w.parts.length ? partIdx + 1 : null;
    view.innerHTML = `<div class="wrap"><div class="reader${prefs.tr ? '' : ' hide-tr'}${lang === 'none' ? ' hide-tl' : ''}" style="--fs:${prefs.fs}">
      <div class="rbar">
        <a class="ibtn" href="${R}livre/${w.slug}/" aria-label="Retour au livre">${ic('back')}</a>
        <div class="t"><b>${esc(w.title)}</b><small>${w.parts.length > 1 ? `Partie ${partIdx} / ${w.parts.length} · ` : ''}${data.bayts.length} vers</small></div>
        ${AUDIO[w.slug] ? `<button class="ibtn rb-au" data-listen="${w.slug}" data-i="0" aria-label="Écouter">${ic('audio')}</button>` : ''}
        <a class="ibtn rb-dl" href="${R}pdf/${w.slug}.pdf" download aria-label="Télécharger le PDF complet">${ic('download')}</a>
        <div class="tools">
        ${w.parts.length > 1 ? `<select class="select" id="partSel" aria-label="Partie">${w.partNames.map((n, i) => `<option value="${i + 1}"${i + 1 === partIdx ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
        <div class="seg" role="group" aria-label="Traduction">${langs.map(l => `<button data-lang="${l}" class="${lang === l ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}<button data-lang="none" class="${lang === 'none' ? 'on' : ''}" title="Arabe seul">ع</button></div>
        <div class="seg"><button data-tr class="${prefs.tr ? 'on' : ''}" title="Translittération">Aa</button></div>
        <div class="seg"><button data-fs="-1" aria-label="Réduire le texte">A−</button><button data-fs="1" aria-label="Agrandir le texte">A+</button></div>
        </div>
      </div>
      <header class="rhead">
        <div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <div class="t-ar">${esc(w.titleAr)}</div>
        <h1>${esc(data.name)}</h1>
        <div class="orn">${ic('khatam')}</div>
      </header>
      ${data.bayts.map(b => {
        const stack = b.ar.map(stripAr).some(x => x.length > 30) || b.ar.length === 1;
        return `<div class="verse" id="v${b.n}">${numBadge(b.n)}
          <div class="ar-lines${stack ? ' stack' : ''}">${b.ar.map(a => `<span>${esc(a)}</span>`).join('')}</div>
          <div class="tr">${esc(b.tr.filter(Boolean).join(' · '))}</div>
          <div class="tl">${esc(b[lang === 'none' ? 'fr' : lang] || b.fr || '')}</div></div>`;
      }).join('')}
      <nav class="rnav">
        ${prev ? `<a class="btn btn-line" href="${R}lire/${w.slug}/${prev}/">${ic('back')}${esc(w.partNames[prev - 1])}</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-bx" href="${R}lire/${w.slug}/${next}/">${esc(w.partNames[next - 1])}${ic('arrow')}</a>` : `<a class="btn btn-bx" href="${R}bibliotheque/">Fin · retour à la bibliothèque</a>`}
      </nav>
    </div></div>`;
    if (w.parts.length > 1) $('#partSel').onchange = e => navigate(`lire/${w.slug}/${e.target.value}/`);
    let offset = 0;
    for (let i = 0; i < partIdx - 1; i++) { try { offset += (await getPart(w.parts[i])).bayts.length; } catch {} }
    const mark = idx => {
      const prevDone = progress[w.slug] && progress[w.slug].part === partIdx ? progress[w.slug].done : 0;
      progress[w.slug] = { part: partIdx, done: Math.max(offset + idx, prevDone), at: Date.now() };
      store.set('progress', progress);
    };
    mark(0);
    readerObs && readerObs.disconnect();
    const verses = $$('.verse', view);
    readerObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) mark(verses.indexOf(e.target) + 1); }), { rootMargin: '-40% 0px -50% 0px' });
    verses.forEach(v => readerObs.observe(v));
    if (baytN) { const el = $('#v' + baytN); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); } }
  }

  // ---------- Other pages ----------
  function listPage(title, ar, img, items, emptyAr, emptyTitle, emptyText, prog) {
    view.innerHTML = banner(title, ar, img) + `<section class="block" style="padding-top:50px"><div class="wrap">${items.length
      ? `<div class="grid">${items.map(w => card(w, { progress: prog })).join('')}</div>`
      : `<div class="empty"><div class="ar">${emptyAr}</div><h3>${emptyTitle}</h3><p>${emptyText}</p><a class="btn btn-bx" href="${R}bibliotheque/">${ic('rehal')}Parcourir la bibliothèque</a></div>`}</div></section>`;
  }

  function bioView() {
    const T = [['mihrab', 'vers 1853', 'Naissance à Mbacké, dans le Baol.'], ['minaret', '1887', 'Fondation de Touba, la ville sainte.'],
      ['hilal', '1895 – 1902', 'Exil au Gabon. Le départ en exil, un 18 Safar, est commémoré chaque année par le Grand Magal.'],
      ['fanous', '1903 – 1907', 'Exil en Mauritanie.'], ['rehal', '1912 – 1927', 'Résidence surveillée à Diourbel, où il poursuit son œuvre.'],
      ['khatam', '1927', 'Rappel à Dieu à Diourbel ; il repose à Touba.']];
    view.innerHTML = banner('Serigne Touba', 'الشَّيْخُ أَحْمَدُ بَمْبَا خَادِمُ الرَّسُول', 'minaret-nuit') + `
    <div class="wrap bio">
      <div>
        <span class="eyebrow">${ic('minaret')}Cheikh Ahmadou Bamba Mbacké</span>
        <h2 class="h2">Khadimou Rassoul, <em>le Serviteur</em> du Prophète <span class="saw">ﷺ</span></h2>
        <p>Guide spirituel sénégalais, fondateur de la Mouridiyya et de la ville sainte de Touba, Cheikh Ahmadou Bamba a consacré sa vie à l'adoration de Dieu, au service du Prophète Muhammad <span class="saw">ﷺ</span> et à l'éducation de ses disciples par le savoir et le travail.</p>
        <p>Il a laissé une œuvre écrite immense en langue arabe : des poèmes de louange au Prophète, d'invocation, de jurisprudence, de soufisme et d'éducation de l'âme. Ces khassidas sont récités chaque jour dans les daaras, les dahiras et lors du Grand Magal de Touba.</p>
        <ol class="timeline">${T.map(([i, y, t]) => `<li><span class="k">${ic(i)}</span><b>${y}</b>${t}</li>`).join('')}</ol>
        <a class="btn btn-bx" href="${R}bibliotheque/">${ic('rehal')}Lire ses khassidas</a>
      </div>
      <aside><div class="arch-portrait"><img src="${R}assets/img/serigne-touba.webp" alt="Photographie de Serigne Touba"></div></aside>
    </div>`;
  }

  function galleryView() {
    view.innerHTML = banner('Touba en images', 'طُوبَى', 'mosquee-touba') + `<section class="block" style="padding-top:50px"><div class="wrap">
      ${sec('minaret', 'La Grande Mosquée', 'Souvenirs de <em>Touba</em>', 'Minarets, coupoles, vitraux étoilés : l\'architecture qui a inspiré l\'identité de Kiraam.')}
      ${galleryGrid(PHOTOS.slice(0, 5))}<div style="height:16px"></div>${galleryGrid([PHOTOS[5], PHOTOS[6], PHOTOS[3], PHOTOS[1], PHOTOS[2]])}
      <p class="count" style="margin-top:20px">Photographies : THIERLens.</p></div></section>`;
  }

  function aboutView() {
    const nK = LIB.reduce((a, w) => a + w.parts.length, 0);
    view.innerHTML = banner('À propos de Kiraam', 'كِرَام', 'lanternes') + `<div class="wrap"><article class="prose">
      <p><b>Kiraam</b> (كِرَام, « les nobles ») est une bibliothèque libre et gratuite consacrée aux écrits de Cheikh Ahmadou Bamba Khadimou Rassoul.</p>
      <h2>Le contenu</h2><ul>
        <li>${LIB.length} livres regroupant ${nK} khassidas et ${fmt(LIB.reduce((a, w) => a + w.bayts, 0))} vers.</li>
        <li>Texte arabe vocalisé, translittération latine, traduction française pour tous les textes ; anglaise et italienne pour une partie d'entre eux.</li>
        <li>Chaque livre est disponible en PDF (format A5) avec sa couverture.</li></ul>
      <h2>Sources</h2>
      <p>Les textes proviennent du <a href="https://github.com/DaurDiop/khassida_dataset" target="_blank" rel="noopener">Khassida Dataset</a> de Daour, publié sous licence MIT, qui intègre les traductions de l'application <a href="https://github.com/DaurDiop/karamati-khatou-yadi" target="_blank" rel="noopener">Karamati Khatou Yadi</a>. Qu'Allah les récompense. Les photographies de la Grande Mosquée de Touba sont de THIERLens.</p>
      <h2>Audio</h2>
      <p>Les déclamations sont celles des kourels (Hizbut Tarqiyyah, Nurud Darayni, Safinatoul Amane…), publiées sur Audiomack (audio seul, sans vidéo) et, en complément, sur YouTube. Kiraam les intègre avec les lecteurs officiels de ces plateformes, sans copier les fichiers ; les droits restent à leurs auteurs. Vous êtes un kourel et souhaitez voir vos enregistrements ici, ou les retirer ? Écrivez-nous.</p>
      <h2>Signaler une erreur</h2>
      <p>Une faute dans un vers, un titre ou une traduction ? Écrivez-nous ${WHATSAPP ? `sur <a href="${waLink('Assalamou aleykoum, je souhaite signaler une correction sur Kiraam : ')}" target="_blank" rel="noopener">WhatsApp</a>` : 'via la page de contact'} : chaque correction profite à tous.</p>
      <p><a href="${R}charte/">Voir la charte graphique de Kiraam →</a></p>
    </article></div>`;
  }

  function brandView() {
    const C = [['Bordeaux', '#6B1424', 'Couleur principale'], ['Grenat', '#2C060E', 'Fonds profonds'], ['Or', '#C29B4A', 'Accents, ornements'], ['Or clair', '#D9B66C', 'Sur fonds sombres'], ['Ivoire', '#F8F3EA', 'Fond de page']];
    const I = [['mihrab', 'Accueil · mihrab'], ['rehal', 'Bibliothèque · rehal'], ['fanous', 'Lectures · fanous'], ['khatam', 'Favoris · khatam'], ['minaret', 'Serigne Touba · minaret'], ['hilal', 'À propos · hilal'], ['read', 'Lire'], ['download', 'Télécharger'], ['search', 'Rechercher'], ['lang', 'Langues']];
    view.innerHTML = banner('Charte graphique', 'هُوِيَّةُ كِرَام', 'vitrail') + `<div class="wrap"><article class="prose" style="max-width:1000px">
      <h2>Le symbole</h2>
      <p>Il réunit trois éléments de la Grande Mosquée de Touba : l'<b>arche en fer à cheval</b> de ses portes et fenêtres, l'<b>étoile à huit branches</b> de ses vitraux, et le <b>finial à trois sphères</b> qui couronne ses coupoles. Une porte ouverte vers la lumière des khassidas.</p>
      <div class="brand-grid">
        <div class="brand-tile" style="background:#FBF8F2"><img src="${R}assets/brand/kiraam-logo.svg" alt="Logo horizontal"></div>
        <div class="brand-tile" style="background:#2C060E"><img src="${R}assets/brand/kiraam-logo-blanc.svg" alt="Logo horizontal blanc"></div>
        <div class="brand-tile" style="background:#FBF8F2"><img src="${R}assets/brand/kiraam-logo-vertical.svg" alt="Logo vertical" style="max-height:200px"></div>
        <div class="brand-tile" style="background:#6B1424"><img src="${R}assets/brand/kiraam-logo-vertical-blanc.svg" alt="Logo vertical blanc" style="max-height:200px"></div>
        <div class="brand-tile" style="background:#fff"><img src="${R}assets/brand/kiraam-icone.svg" alt="Icône d'application"></div>
        <div class="brand-tile" style="background:#fff"><img src="${R}assets/brand/kiraam-symbole-bordeaux.svg" alt="Symbole"></div>
      </div>
      <h2>Couleurs</h2>
      <div class="swatches">${C.map(([n, h, u]) => `<div class="sw"><i style="background:${h}"></i><div><b>${n}</b>${h}<br>${u}</div></div>`).join('')}</div>
      <h2>Typographies</h2>
      <p><span style="font-family:var(--serif);font-size:30px;font-weight:600">Cormorant Garamond</span> pour les titres · <span style="font-weight:600">Inter</span> pour le texte · <span class="ar" style="font-size:26px;color:var(--bx)">أَمِيرِي Amiri</span> pour l'arabe.</p>
      <h2>Icônes</h2>
      <p>Un jeu d'icônes tiré de l'architecture et des objets de la tradition islamique.</p>
      <div class="icons-row">${I.map(([i, n]) => `<div>${ic(i)}${n}</div>`).join('')}</div>
      <h2>Motif</h2>
      <p>Le treillis d'étoiles des vitraux de Touba, utilisé en filigrane sur les fonds et les couvertures.</p>
      <div style="height:160px;border-radius:22px;background:var(--bx-3) var(--pattern-gold);box-shadow:var(--sh)"></div>
    </article></div>`;
  }

  function notFound() {
    view.innerHTML = `<div class="empty" style="padding:140px 20px"><div class="ar">؟</div><h3>Page introuvable</h3><a class="btn btn-bx" href="${R}">Retour à l'accueil</a></div>`;
  }

  // ---------- Audio ----------
  const recSrc = r => r.type === 'youtube' ? `https://www.youtube.com/watch?v=${r.id}` : `https://audiomack.com/${r.artist}/song/${r.slug}`;
  const recThumb = r => r.type === 'youtube' ? `<img src="https://i.ytimg.com/vi/${r.id}/mqdefault.jpg" alt="" loading="lazy">` : ic('audio');
  function recRow(w, r, i) {
    return `<button class="rec" data-listen="${w.slug}" data-i="${i}"><span class="th">${recThumb(r)}</span>
      <span style="min-width:0"><b>${esc(r.by)}</b><small>${r.type === 'youtube' ? 'Vidéo YouTube' : 'Audio'}${r.at ? ' · ' + esc(r.at) : ''}</small></span>
      <span class="pl">${ic('play')}</span></button>`;
  }
  const dock = $('#dock');
  let dockState = null;
  function openDock(slug, i) {
    const w = BY[slug], list = AUDIO[slug]; if (!w || !list) return;
    const r = list[i] || list[0];
    dockState = { slug, i };
    const frame = r.type === 'youtube'
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${r.id}?autoplay=1&rel=0&playsinline=1" title="${esc(w.title)} — ${esc(r.by)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<iframe class="am" src="https://audiomack.com/embed/song/${r.artist}/${r.slug}?background=1" title="${esc(w.title)} — ${esc(r.by)}" allow="autoplay"></iframe>`;
    dock.innerHTML = `<div class="dock-head">${ic('audio', 'a')}<div class="t"><b>${esc(w.title)} · <span class="ar" style="font-size:.9em">${esc(w.titleAr)}</span></b><small>${esc(r.by)}${r.at ? ' · ' + esc(r.at) : ''}</small></div>
      <a class="dock-ext" href="${recSrc(r)}" target="_blank" rel="noopener" aria-label="Ouvrir sur ${r.type === 'youtube' ? 'YouTube' : 'Audiomack'}" title="Ouvrir sur ${r.type === 'youtube' ? 'YouTube' : 'Audiomack'}">${ic('share')}</a>
      <button data-dock-min aria-label="Réduire">${ic('min')}</button><button data-dock-close aria-label="Fermer">${ic('close')}</button></div>
      <div class="dock-body">${frame}</div>
      ${list.length > 1 ? `<div class="dock-foot">` : ''}${list.length > 1 ? list.map((x, k) => `<button class="${k === (list[i] ? i : 0) ? 'on' : ''}" data-listen="${slug}" data-i="${k}">${esc(x.by.length > 26 ? x.by.slice(0, 24) + '…' : x.by)}</button>`).join('') + '</div>' : ''}`;
    dock.hidden = false; dock.classList.remove('min');
    $$('.rec').forEach(x => x.classList.toggle('on', x.dataset.listen === slug && +x.dataset.i === +i));
  }

  function stagger() { $$('.grid, .track').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', i % 12))); }
  // inclinaison 3D qui suit la souris
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const cv = e.target.closest && e.target.closest('.card'); if (!cv) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    cv.style.setProperty('--ry', `${(x - .5) * 26 - 6}deg`); cv.style.setProperty('--rx', `${(.5 - y) * 14}deg`);
    cv.style.setProperty('--mx', `${x * 100}%`); cv.style.setProperty('--my', `${y * 100}%`);
  }, { passive: true });

  // ---------- Précommande ----------
  function openPreorder(slug) {
    const w = BY[slug];
    let m = $('#preorder');
    if (!m) { m = document.createElement('div'); m.id = 'preorder'; m.className = 'modal'; document.body.appendChild(m); }
    m.innerHTML = `<form class="modal-in" id="poForm">
      <button type="button" class="ibtn mclose" data-mclose aria-label="Fermer">${ic('close')}</button>
      <div class="po-head"><img src="${R}covers/${w.slug}.webp" alt=""><div><span class="eyebrow">${ic('rehal')}Précommande</span><h3>${esc(w.title)}</h3><p class="ar">${esc(w.titleAr)}</p></div></div>
      <p class="sub">Le livre imprimé est en préparation. Réservez le vôtre : nous vous recontactons sur WhatsApp pour confirmer le prix et la livraison. Aucun paiement maintenant.</p>
      <div class="po-grid">
        <label class="field"><span>Votre nom</span><div class="control"><input name="nom" required autocomplete="name" placeholder="Prénom et nom"></div></label>
        <label class="field"><span>Ville</span><div class="control"><input name="ville" required autocomplete="address-level2" placeholder="Dakar, Touba, Paris…"></div></label>
        <label class="field"><span>Édition</span><div class="control"><select name="ed">${FORMATS.slice(0, 4).map(([f, n, d]) => `<option value="${n}">${n} — ${d}</option>`).join('')}</select></div></label>
        <label class="field"><span>Quantité</span><div class="control"><input name="qte" type="number" min="1" max="500" value="1" required></div></label>
      </div>
      <button class="btn btn-gold po-send" type="submit">${ic('share')}Envoyer ma précommande sur WhatsApp</button>
      ${WHATSAPP ? '' : '<p class="count" style="margin:10px 0 0">La précommande ouvre bientôt.</p>'}
    </form>`;
    m.classList.add('open');
    $('#poForm').onsubmit = ev => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const msg = `Assalamou aleykoum Kiraam 🌙\nJe souhaite précommander le livre :\n📖 ${w.title} (${w.titleAr})\n• Édition : ${f.get('ed')}\n• Quantité : ${f.get('qte')}\n• Nom : ${f.get('nom')}\n• Ville : ${f.get('ville')}\n${location.origin}${R}livre/${w.slug}/`;
      const url = waLink(msg);
      if (url) window.open(url, '_blank', 'noopener'); else alert('La précommande ouvre très bientôt, inch Allah.');
    };
  }

  // ---------- Router ----------
  function setNav(key) { $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === key)); }
  function route() {
    closeDrawer();
    readerObs && readerObs.disconnect();
    const [page, a, b, c] = segs();
    const onHero = ['', 'bibliotheque', 'livre', 'serigne-touba', 'galerie', 'a-propos', 'charte', 'lectures', 'favoris'].includes(page || '');
    document.body.classList.toggle('on-hero', onHero);
    switch (page || '') {
      case '': setNav('home'); homeView(); break;
      case 'bibliotheque': setNav('library'); libraryView(); break;
      case 'livre': setNav('library'); bookView(a); break;
      case 'lire': setNav('library'); readerView(a, parseInt(b, 10), parseInt(c, 10)); break;
      case 'lectures': setNav('reading'); listPage('Mes lectures', 'قِرَاءَاتِي', 'lanternes', Object.entries(progress).sort((x, y) => y[1].at - x[1].at).map(([s]) => BY[s]).filter(Boolean), 'اِقْرَأْ', 'Aucune lecture en cours', 'Ouvrez un khassida : votre progression sera retenue sur cet appareil.', true); break;
      case 'favoris': setNav('favs'); listPage('Mes favoris', 'مُفَضَّلَاتِي', 'minaret-dome', LIB.filter(w => favs.has(w.slug)), '✦', 'Pas encore de favoris', "Touchez l'étoile d'un livre pour le retrouver ici."); break;
      case 'serigne-touba': setNav('bio'); bioView(); break;
      case 'galerie': setNav('gallery'); galleryView(); break;
      case 'a-propos': setNav('about'); aboutView(); break;
      case 'charte': setNav('about'); brandView(); break;
      default: notFound();
    }
    if (!(page === 'lire' && c)) window.scrollTo(0, 0);
    stagger();
    onScroll();
  }

  // ---------- Events ----------
  const header = $('#header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  const drawer = $('#drawer');
  const closeDrawer = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };
  $('#menuBtn').onclick = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
  drawer.addEventListener('click', e => { if (e.target === drawer || e.target.closest('[data-close-drawer]')) closeDrawer(); });

  function updateFavCount() { const d = $('#favCount'); d.hidden = !favs.size; d.textContent = favs.size; }

  document.addEventListener('click', e => {
    const po = e.target.closest('[data-preorder]'); if (po) { openPreorder(po.dataset.preorder); return; }
    if (e.target.closest('[data-mclose]') || e.target.classList.contains('modal')) { $('#preorder').classList.remove('open'); return; }
    const dlb = e.target.closest('[data-dl]');
    if (dlb) { const d = dlb.parentElement; d.classList.toggle('open'); dlb.setAttribute('aria-expanded', d.classList.contains('open')); return; }
    if (!e.target.closest('.dl-menu')) $$('.dl.open').forEach(d => d.classList.remove('open'));
    const fl = e.target.closest('[data-flip]'); if (fl) { fl.classList.toggle('flipped'); return; }
    const li = e.target.closest('[data-listen]');
    if (li) { openDock(li.dataset.listen, +li.dataset.i || 0); return; }
    if (e.target.closest('[data-dock-close]')) { dock.hidden = true; dock.innerHTML = ''; dockState = null; return; }
    if (e.target.closest('[data-dock-min]')) { dock.classList.toggle('min'); return; }
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const s = fav.dataset.fav; favs.has(s) ? favs.delete(s) : favs.add(s); store.set('favs', [...favs]);
      $$(`[data-fav="${s}"]`).forEach(x => x.classList.toggle('on', favs.has(s)));
      updateFavCount();
    $$('[data-wa]').forEach(a => { if (WHATSAPP) a.href = waLink('Assalamou aleykoum Kiraam, '); else a.remove(); }); return;
    }
    const sh = e.target.closest('[data-share]');
    if (sh) {
      const w = BY[sh.dataset.share]; const url = location.origin + R + 'livre/' + w.slug + '/';
      if (navigator.share) navigator.share({ title: `${w.title} · Kiraam`, text: `${w.title} — ${w.titleAr} · khassida de Serigne Touba`, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => { sh.title = 'Lien copié'; sh.classList.add('on'); setTimeout(() => sh.classList.remove('on'), 1200); });
      return;
    }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { const t = sc.closest('.carousel').querySelector('.track'); t.scrollBy({ left: sc.dataset.scroll * t.clientWidth * .8, behavior: 'smooth' }); return; }
    const go = e.target.closest('[data-go]'); if (go) { navigate(go.dataset.go); return; }
    const f = e.target.closest('[data-filter]');
    if (f) { libState.f = f.dataset.filter; $$('[data-filter]').forEach(x => x.classList.toggle('on', x === f)); renderLib(); return; }
    if (e.target.closest('[data-reset]')) { libState.len = 'all'; libState.lang = 'fr'; renderLib(); return; }
    const ph = e.target.closest('[data-photo]');
    if (ph) { openLightbox(ph.dataset.photo); return; }
    const lg = e.target.closest('[data-lang]');
    if (lg) {
      prefs.lang = lg.dataset.lang; savePrefs(); const r = $('.reader');
      r.classList.toggle('hide-tl', prefs.lang === 'none'); $$('[data-lang]', r).forEach(x => x.classList.toggle('on', x === lg));
      if (prefs.lang !== 'none') { const [, s, p] = segs(); getPart(BY[s].parts[(parseInt(p, 10) || 1) - 1]).then(d => $$('.verse', r).forEach((v, i) => { v.querySelector('.tl').textContent = d.bayts[i][prefs.lang] || d.bayts[i].fr || ''; })); }
      return;
    }
    if (e.target.closest('[data-tr]')) { prefs.tr = !prefs.tr; savePrefs(); $('.reader').classList.toggle('hide-tr', !prefs.tr); e.target.closest('[data-tr]').classList.toggle('on', prefs.tr); return; }
    const fs = e.target.closest('[data-fs]');
    if (fs) { prefs.fs = Math.min(1.6, Math.max(.8, +(prefs.fs + .1 * fs.dataset.fs).toFixed(2))); savePrefs(); $('.reader').style.setProperty('--fs', prefs.fs); }
  });
  document.addEventListener('change', e => { if (e.target.id === 'lsort') { libState.sort = e.target.value; renderLib(); } });

  let lb;
  function openLightbox(f) {
    if (!lb) { lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img alt=""><button class="ibtn" aria-label="Fermer">${ic('close')}</button>`; document.body.appendChild(lb); lb.onclick = () => lb.classList.remove('open'); }
    lb.querySelector('img').src = `${R}assets/photos/${f}.webp`; lb.classList.add('open');
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); $('#preorder')?.classList.remove('open'); $$('.dl.open').forEach(d => d.classList.remove('open')); lb && lb.classList.remove('open'); } });
  window.addEventListener('popstate', route);
  // liens internes : navigation sans rechargement
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || !u.pathname.startsWith(R) || /\.[a-z0-9]{2,4}$/i.test(u.pathname)) return;
    e.preventDefault();
    history.pushState(null, '', u.pathname + u.search);
    route();
  });

  // ---------- Boot ----------
  Promise.all([fetch(R + 'data/library.json').then(r => r.json()), fetch(R + 'data/audio.json').then(r => r.json()).catch(() => ({ audio: {} }))]).then(([d, a]) => {
    AUDIO = a.audio || {};
    if (location.hash.startsWith('#/')) { const h = location.hash.slice(2).replace(/\/?$/, '/'); history.replaceState(null, '', R + (h === '/' ? '' : h)); }
    const qp = new URLSearchParams(location.search).get('q'); if (qp) libState.q = qp;
    LIB = d.works.map(w => Object.assign(w, { _s: norm([w.title, w.titleAr, w.slug, w.incipit, ...w.partNames, ...(w.aka || [])].join(' ')) }));
    LIB.forEach(w => BY[w.slug] = w);
    const nK = LIB.reduce((a, w) => a + w.parts.length, 0);
    $('#tbCount').textContent = `${LIB.length} livres · ${nK} khassidas`;
    updateFavCount();
    route();
  }).catch(() => { view.innerHTML = '<div class="empty"><h3>Chargement impossible</h3><p>Rechargez la page.</p></div>'; });
})();
