/* Kiraam — bibliothèque des khassidas de Serigne Touba */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const view = $('#view');
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

  let LIB = [], BY = {};
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
      <a class="cv" href="#/livre/${w.slug}" aria-label="${esc(w.title)}">
        <img src="covers/${w.slug}.webp" alt="" loading="lazy" width="641" height="910">
        ${w.parts.length > 1 ? `<span class="tag">${ic('layers')}${w.parts.length} parties</span>` : ''}
      </a>
      <button class="fav${favs.has(w.slug) ? ' on' : ''}" data-fav="${w.slug}" aria-label="Ajouter aux favoris">${ic('khatam')}</button>
      <div class="body">
        <div class="t-ar">${esc(w.titleAr)}</div>
        <a class="t-fr" href="#/livre/${w.slug}">${esc(w.title)}</a>
        <div class="meta"><span>${ic('verses')}${w.bayts} vers</span><span>${ic('lang')}${w.langs.map(l => l.toUpperCase()).join(' · ')}</span></div>
        ${opts.progress && p ? `<div class="progress" title="${pct}% lu"><i style="width:${pct}%"></i></div>` : ''}
        <div class="foot">
          <a class="btn btn-bx sm" href="#/lire/${w.slug}/${p ? p.part : 1}">${ic('read')}${p ? 'Reprendre' : 'Lire'}</a>
          <a class="pdf" href="pdf/${w.slug}.pdf" download>${ic('download')}<span>PDF · ${mb(w.pdfSize)}</span></a>
        </div>
      </div>
    </article>`;
  }

  function banner(title, ar, img, crumb) {
    return `<header class="banner"><img src="assets/photos/${img}.webp" alt="">
      <div class="wrap banner-in">
        <div class="crumbs"><a href="#/">Accueil</a>${ic('arrow')}<span>${crumb || title}</span></div>
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
      <img class="hero-img" src="assets/photos/mosquee-touba.webp" alt="La Grande Mosquée de Touba">
      <div class="hero-in">
        <span class="pill">${ic('khatam')}Bienvenue sur Kiraam</span>
        <h1>Les écrits de Serigne Touba,<br><span class="highlight">à portée de cœur<span class="ar">قَصَائِدُ خَادِمِ الرَّسُول</span></span></h1>
        <p class="lead">${LIB.length} livres et ${nK} khassidas de Cheikh Ahmadou Bamba Khadimou Rassoul, en arabe vocalisé avec translittération et traduction. À lire en ligne ou à télécharger en PDF, librement.</p>
        <div class="hero-actions">
          <a class="btn btn-gold" href="#/bibliotheque">${ic('rehal')}Explorer la bibliothèque</a>
          <a class="btn btn-glass" href="#/livre/${daily.slug}">${ic('khatam')}Khassida du jour : ${esc(daily.title)}</a>
        </div>
      </div>
    </section>

    <form class="finder" id="finder" role="search">
      <div class="finder-tabs"><button type="button" class="on">${ic('search')}Trouver un khassida</button><button type="button" data-go="#/livre/${daily.slug}">${ic('khatam')}Du jour</button></div>
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
          <a class="btn btn-bx" href="#/bibliotheque">${ic('rehal')}Voir les livres</a>
          <a class="btn btn-line" href="#/serigne-touba">${ic('minaret')}Serigne Touba</a>
        </div>
      </div>
      <div class="collage">
        <div class="main"><img src="assets/photos/minaret-jour.webp" alt="Le minaret de la Grande Mosquée de Touba" loading="lazy"></div>
        <div class="float f1"><img class="av" src="assets/img/serigne-touba.webp" alt=""><span><b>${nK}</b>khassidas de Khadimou Rassoul</span></div>
        <div class="float f2">${ic('download')}<span><b>${LIB.length}</b>livres PDF gratuits</span></div>
      </div>
    </div></section>

    ${reading.length ? `<section class="block" style="padding-top:0"><div class="wrap">
      ${sec('fanous', 'Mes lectures', 'Reprendre <em>là où</em> vous étiez', '', `<a class="btn btn-line" href="#/lectures">Tout voir${ic('arrow')}</a>`)}
      <div class="track">${reading.map(w => card(w, { progress: true })).join('')}</div></div></section>` : ''}

    <section class="block" style="padding-top:${reading.length ? 0 : 20}px"><div class="wrap carousel">
      ${sec('rehal', 'Œuvres majeures', 'Les grands <em>khassidas</em>', 'Jazbul Qulūb, Mawāhibu Nāfiʿ, Matlabul Fawzayni… les œuvres les plus récitées.',
        `<div class="arrows"><button class="ibtn" data-scroll="-1" aria-label="Précédent">${ic('back')}</button><button class="ibtn" data-scroll="1" aria-label="Suivant">${ic('arrow')}</button></div>`)}
      <div class="track" id="featTrack">${feat.map(w => card(w)).join('')}</div>
    </div></section>

    <section class="band"><img class="band-img" src="assets/photos/vitrail.webp" alt="" loading="lazy">
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
      ${sec('search', 'Toute la bibliothèque', 'Trouvez votre <em>khassida</em>', 'Filtrez par longueur ou par traduction, ou cherchez par nom.', `<a class="btn btn-line" href="#/bibliotheque">Les ${LIB.length} livres${ic('arrow')}</a>`)}
      <div class="grid">${LIB.slice(0, 8).map(w => card(w)).join('')}</div>
    </div></section>

    <section class="block" style="padding-top:0"><div class="wrap">
      <div class="center">${sec('minaret', 'Touba, la ville sainte', 'Souvenirs de la <em>Grande Mosquée</em>', 'Là où les khassidas résonnent jour et nuit.')}</div>
      ${galleryGrid(PHOTOS.slice(1, 6))}
    </div></section>

    <section class="wrap"><div class="quote">
      <div class="arch-portrait"><img src="assets/img/serigne-touba.webp" alt="Serigne Touba" loading="lazy"></div>
      <div>
        <p class="ar-big">الشَّيْخُ أَحْمَدُ بَمْبَا</p>
        <h3>Khadimou Rassoul, le Serviteur du Prophète <span class="saw">ﷺ</span></h3>
        <p>Fondateur de Touba et de la Mouridiyya, Cheikh Ahmadou Bamba a consacré sa plume à la louange du Prophète et à l'éducation des âmes. Ses khassidas sont récités chaque jour, du Sénégal au monde entier.</p>
        <a class="btn btn-bx" href="#/serigne-touba">${ic('minaret')}Découvrir sa vie</a>
      </div>
    </div></section>`;

    $('#finder').addEventListener('submit', e => {
      e.preventDefault();
      libState.q = $('#fq').value; libState.len = $('#fl').value; libState.lang = $('#ft').value;
      location.hash = '#/bibliotheque';
    });
  }

  function galleryGrid(list) {
    return `<div class="gallery">${list.map(([f, cap]) => `<figure data-photo="${f}"><img src="assets/photos/${f}-sm.webp" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`).join('')}</div>`;
  }

  // ---------- Library ----------
  const libState = { q: '', f: 'all', len: 'all', lang: 'fr', sort: 'az' };
  const FILTERS = {
    all: ['Tous', 'rehal', () => true],
    major: ['Œuvres majeures', 'khatam', w => w.featured],
    multi: ['En plusieurs parties', 'layers', w => w.parts.length > 1],
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
    view.innerHTML = banner(esc(w.title), esc(w.titleAr), 'minaret-dome', `<a href="#/bibliotheque">Bibliothèque</a>${ic('arrow')}${esc(w.title)}`) + `
    <div class="wrap book">
      <div class="book-cover"><div class="cv"><img src="covers/${w.slug}.webp" alt="Couverture de ${esc(w.title)}"></div></div>
      <div class="book-info">
        <span class="eyebrow">${ic('khatam')}${w.parts.length > 1 ? `Œuvre en ${w.parts.length} parties` : 'Khassida'}</span>
        <div class="t-ar">${esc(w.titleAr)}</div>
        <h1>${esc(w.title)}</h1>
        <p class="by">Cheikh Ahmadou Bamba Khadimou Rassoul · Serigne Touba</p>
        <div class="kv"><div><b>${w.bayts}</b><span>vers</span></div><div><b>${w.parts.length}</b><span>${w.parts.length > 1 ? 'parties' : 'partie'}</span></div><div><b>${w.pages}</b><span>pages PDF</span></div><div><b>${w.langs.length + 1}</b><span>langues</span></div></div>
        <div class="langs"><span>العربية</span><span>Translittération</span>${w.langs.map(l => `<span>${{ fr: 'Français', en: 'English', it: 'Italiano' }[l]}</span>`).join('')}</div>
        <div class="actions">
          <a class="btn btn-gold" href="#/lire/${w.slug}/${p ? p.part : 1}">${ic('read')}${p ? 'Reprendre la lecture' : 'Lire en ligne'}</a>
          <a class="btn btn-bx" href="pdf/${w.slug}.pdf" download>${ic('download')}Télécharger le PDF · ${mb(w.pdfSize)}</a>
          <button class="ibtn${favs.has(w.slug) ? ' on' : ''}" data-fav="${w.slug}" aria-label="Favori">${ic('khatam')}</button>
          <button class="ibtn" data-share="${w.slug}" aria-label="Partager">${ic('share')}</button>
        </div>
        ${w.parts.length > 1 ? `<div class="parts">${w.partNames.map((n, i) => `<a href="#/lire/${w.slug}/${i + 1}"><span>${esc(n)}</span><small>${ic('arrow')}</small></a>`).join('')}</div>` : ''}
        <div class="excerpt" id="excerpt"><h3>Premiers vers</h3><p class="count">Chargement…</p></div>
      </div>
    </div>
    <section class="block" style="padding-top:40px"><div class="wrap">${sec('rehal', 'À lire aussi', 'Dans la <em>même</em> bibliothèque', '')}<div class="grid">${related.map(x => card(x)).join('')}</div></div></section>`;
    try {
      const d = await getPart(w.parts[0]);
      const ex = $('#excerpt'); if (!ex) return;
      ex.innerHTML = `<h3>Premiers vers</h3>` + d.bayts.slice(0, 3).map(b => `<div class="v"><div class="ar">${b.ar.map(esc).join(' &nbsp;۞&nbsp; ')}</div><div class="tr">${esc(b.tr.join(' · '))}</div><div class="tl">${esc(b.fr)}</div></div>`).join('') +
        `<div style="text-align:center;margin-top:16px"><a class="btn btn-line sm" href="#/lire/${w.slug}/1">Lire la suite${ic('arrow')}</a></div>`;
    } catch {}
  }

  // ---------- Reader ----------
  function getPart(n) {
    if (!partCache[n]) partCache[n] = fetch(`data/k/${n}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
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
    if (location.hash.split('/')[2] !== slug) return;
    const has = l => data.bayts.some(b => b[l]);
    const langs = ['fr', 'en', 'it'].filter(has);
    const lang = prefs.lang === 'none' || langs.includes(prefs.lang) ? prefs.lang : 'fr';
    const prev = partIdx > 1 ? partIdx - 1 : null, next = partIdx < w.parts.length ? partIdx + 1 : null;
    view.innerHTML = `<div class="wrap"><div class="reader${prefs.tr ? '' : ' hide-tr'}${lang === 'none' ? ' hide-tl' : ''}" style="--fs:${prefs.fs}">
      <div class="rbar">
        <a class="ibtn" href="#/livre/${w.slug}" aria-label="Retour au livre">${ic('back')}</a>
        <div class="t"><b>${esc(w.title)}</b><small>${w.parts.length > 1 ? `Partie ${partIdx} / ${w.parts.length} · ` : ''}${data.bayts.length} vers</small></div>
        ${w.parts.length > 1 ? `<select class="select" id="partSel" aria-label="Partie">${w.partNames.map((n, i) => `<option value="${i + 1}"${i + 1 === partIdx ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
        <div class="seg" role="group" aria-label="Traduction">${langs.map(l => `<button data-lang="${l}" class="${lang === l ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}<button data-lang="none" class="${lang === 'none' ? 'on' : ''}" title="Arabe seul">ع</button></div>
        <div class="seg"><button data-tr class="${prefs.tr ? 'on' : ''}" title="Translittération">Aa</button></div>
        <div class="seg"><button data-fs="-1" aria-label="Réduire le texte">A−</button><button data-fs="1" aria-label="Agrandir le texte">A+</button></div>
        <a class="ibtn" href="pdf/${w.slug}.pdf" download aria-label="Télécharger le PDF">${ic('download')}</a>
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
        ${prev ? `<a class="btn btn-line" href="#/lire/${w.slug}/${prev}">${ic('back')}${esc(w.partNames[prev - 1])}</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-bx" href="#/lire/${w.slug}/${next}">${esc(w.partNames[next - 1])}${ic('arrow')}</a>` : `<a class="btn btn-bx" href="#/bibliotheque">Fin · retour à la bibliothèque</a>`}
      </nav>
    </div></div>`;
    if (w.parts.length > 1) $('#partSel').onchange = e => location.hash = `#/lire/${w.slug}/${e.target.value}`;
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
      : `<div class="empty"><div class="ar">${emptyAr}</div><h3>${emptyTitle}</h3><p>${emptyText}</p><a class="btn btn-bx" href="#/bibliotheque">${ic('rehal')}Parcourir la bibliothèque</a></div>`}</div></section>`;
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
        <a class="btn btn-bx" href="#/bibliotheque">${ic('rehal')}Lire ses khassidas</a>
      </div>
      <aside><div class="arch-portrait"><img src="assets/img/serigne-touba.webp" alt="Photographie de Serigne Touba"></div></aside>
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
      <h2>Signaler une erreur</h2>
      <p>Une faute dans un vers, un titre ou une traduction ? Ouvrez une « issue » sur le <a href="https://github.com/faalvisuel/kiraam" target="_blank" rel="noopener">dépôt GitHub</a> : chaque correction profite à tous.</p>
      <p><a href="#/charte">Voir la charte graphique de Kiraam →</a></p>
    </article></div>`;
  }

  function brandView() {
    const C = [['Bordeaux', '#6B1424', 'Couleur principale'], ['Grenat', '#2C060E', 'Fonds profonds'], ['Or', '#C29B4A', 'Accents, ornements'], ['Or clair', '#D9B66C', 'Sur fonds sombres'], ['Ivoire', '#F8F3EA', 'Fond de page']];
    const I = [['mihrab', 'Accueil · mihrab'], ['rehal', 'Bibliothèque · rehal'], ['fanous', 'Lectures · fanous'], ['khatam', 'Favoris · khatam'], ['minaret', 'Serigne Touba · minaret'], ['hilal', 'À propos · hilal'], ['read', 'Lire'], ['download', 'Télécharger'], ['search', 'Rechercher'], ['lang', 'Langues']];
    view.innerHTML = banner('Charte graphique', 'هُوِيَّةُ كِرَام', 'vitrail') + `<div class="wrap"><article class="prose" style="max-width:1000px">
      <h2>Le symbole</h2>
      <p>Il réunit trois éléments de la Grande Mosquée de Touba : l'<b>arche en fer à cheval</b> de ses portes et fenêtres, l'<b>étoile à huit branches</b> de ses vitraux, et le <b>finial à trois sphères</b> qui couronne ses coupoles. Une porte ouverte vers la lumière des khassidas.</p>
      <div class="brand-grid">
        <div class="brand-tile" style="background:#FBF8F2"><img src="assets/brand/kiraam-logo.svg" alt="Logo horizontal"></div>
        <div class="brand-tile" style="background:#2C060E"><img src="assets/brand/kiraam-logo-blanc.svg" alt="Logo horizontal blanc"></div>
        <div class="brand-tile" style="background:#FBF8F2"><img src="assets/brand/kiraam-logo-vertical.svg" alt="Logo vertical" style="max-height:200px"></div>
        <div class="brand-tile" style="background:#6B1424"><img src="assets/brand/kiraam-logo-vertical-blanc.svg" alt="Logo vertical blanc" style="max-height:200px"></div>
        <div class="brand-tile" style="background:#fff"><img src="assets/brand/kiraam-icone.svg" alt="Icône d'application"></div>
        <div class="brand-tile" style="background:#fff"><img src="assets/brand/kiraam-symbole-bordeaux.svg" alt="Symbole"></div>
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
      <p style="margin-top:24px"><a href="https://github.com/faalvisuel/kiraam/tree/main/assets/brand" target="_blank" rel="noopener">Télécharger les fichiers du logo (SVG et PNG) →</a></p>
    </article></div>`;
  }

  function notFound() {
    view.innerHTML = `<div class="empty" style="padding:140px 20px"><div class="ar">؟</div><h3>Page introuvable</h3><a class="btn btn-bx" href="#/">Retour à l'accueil</a></div>`;
  }

  // ---------- Router ----------
  function setNav(key) { $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === key)); }
  function route() {
    closeDrawer();
    readerObs && readerObs.disconnect();
    const [, page, a, b, c] = location.hash.split('/');
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
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const s = fav.dataset.fav; favs.has(s) ? favs.delete(s) : favs.add(s); store.set('favs', [...favs]);
      $$(`[data-fav="${s}"]`).forEach(x => x.classList.toggle('on', favs.has(s)));
      updateFavCount(); return;
    }
    const sh = e.target.closest('[data-share]');
    if (sh) {
      const w = BY[sh.dataset.share]; const url = location.href.split('#')[0] + '#/livre/' + w.slug;
      if (navigator.share) navigator.share({ title: `${w.title} · Kiraam`, text: `${w.title} — ${w.titleAr} · khassida de Serigne Touba`, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => { sh.title = 'Lien copié'; sh.classList.add('on'); setTimeout(() => sh.classList.remove('on'), 1200); });
      return;
    }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { const t = sc.closest('.carousel').querySelector('.track'); t.scrollBy({ left: sc.dataset.scroll * t.clientWidth * .8, behavior: 'smooth' }); return; }
    const go = e.target.closest('[data-go]'); if (go) { location.hash = go.dataset.go; return; }
    const f = e.target.closest('[data-filter]');
    if (f) { libState.f = f.dataset.filter; $$('[data-filter]').forEach(x => x.classList.toggle('on', x === f)); renderLib(); return; }
    if (e.target.closest('[data-reset]')) { libState.len = 'all'; libState.lang = 'fr'; renderLib(); return; }
    const ph = e.target.closest('[data-photo]');
    if (ph) { openLightbox(ph.dataset.photo); return; }
    const lg = e.target.closest('[data-lang]');
    if (lg) {
      prefs.lang = lg.dataset.lang; savePrefs(); const r = $('.reader');
      r.classList.toggle('hide-tl', prefs.lang === 'none'); $$('[data-lang]', r).forEach(x => x.classList.toggle('on', x === lg));
      if (prefs.lang !== 'none') { const [, , s, p] = location.hash.split('/'); getPart(BY[s].parts[(parseInt(p, 10) || 1) - 1]).then(d => $$('.verse', r).forEach((v, i) => { v.querySelector('.tl').textContent = d.bayts[i][prefs.lang] || d.bayts[i].fr || ''; })); }
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
    lb.querySelector('img').src = `assets/photos/${f}.webp`; lb.classList.add('open');
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); lb && lb.classList.remove('open'); } });
  window.addEventListener('hashchange', route);

  // ---------- Boot ----------
  fetch('data/library.json').then(r => r.json()).then(d => {
    LIB = d.works.map(w => Object.assign(w, { _s: norm([w.title, w.titleAr, w.slug, w.incipit, ...w.partNames].join(' ')) }));
    LIB.forEach(w => BY[w.slug] = w);
    const nK = LIB.reduce((a, w) => a + w.parts.length, 0);
    $('#tbCount').textContent = `${LIB.length} livres · ${nK} khassidas`;
    updateFavCount();
    route();
  }).catch(() => { view.innerHTML = '<div class="empty"><h3>Chargement impossible</h3><p>Rechargez la page.</p></div>'; });
})();
