/* Kiraam — bibliothèque des khassidas de Serigne Touba */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const view = $('#view'), panel = $('#panel'), backdrop = $('#backdrop'), q = $('#q');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const arNum = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const stripAr = s => s.replace(/[ً-ٰٟۖ-ۭ]/g, '');
  const norm = s => stripAr(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')).replace(/[^a-z0-9؀-ۿ]+/g, ' ').trim();

  // Storage (safe)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('kiraam:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('kiraam:' + k, JSON.stringify(v)); } catch {} }
  };
  let favs = new Set(store.get('favs', []));
  let progress = store.get('progress', {}); // slug -> {part, bayt, total, at}
  const prefs = Object.assign({ lang: 'fr', tr: true, fs: 1 }, store.get('prefs', {}));
  const savePrefs = () => store.set('prefs', prefs);

  let LIB = [], BY = {}, selected = null;
  const partCache = {};
  const LANG_NAMES = { fr: 'Français', en: 'English', it: 'Italiano' };

  const ICON = {
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z M12 6v14"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>'
  };

  const mb = b => (b / 1048576 < 1 ? Math.round(b / 1024) + ' Ko' : (b / 1048576).toFixed(1).replace('.', ',') + ' Mo');
  const partsLabel = w => w.parts.length > 1 ? `${w.parts.length} parties · ${w.bayts} vers` : `${w.bayts} vers`;

  function bookCard(w, opts = {}) {
    const p = progress[w.slug];
    const pct = p ? Math.min(100, Math.round(p.done / w.bayts * 100)) : 0;
    return `<button class="book${selected === w.slug ? ' selected' : ''}" data-slug="${w.slug}" aria-label="${esc(w.title)}">
      <div class="cover-wrap">
        ${favs.has(w.slug) ? `<span class="fav-dot">${ICON.heart}</span>` : ''}
        ${w.parts.length > 1 ? `<span class="badge">${w.parts.length} parties</span>` : ''}
        <img src="covers/${w.slug}.webp" alt="" loading="lazy" width="641" height="910">
      </div>
      <h3>${esc(w.title)}</h3>
      <div class="sub">${opts.progress && p ? `${pct}% lu` : partsLabel(w)}</div>
      ${opts.progress && p ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ''}
    </button>`;
  }

  // ---------- Panel ----------
  function renderPanel(slug, open) {
    const w = BY[slug] || LIB.find(x => x.featured) || LIB[0];
    selected = w.slug;
    document.querySelectorAll('.book').forEach(b => b.classList.toggle('selected', b.dataset.slug === selected));
    const p = progress[w.slug];
    panel.innerHTML = `
      <button class="icon-btn close" data-close aria-label="Fermer">${ICON.x}</button>
      <div class="p-cover"><img src="covers/${w.slug}.webp" alt="Couverture ${esc(w.title)}"></div>
      <p class="p-ar">${esc(w.incipit)}</p>
      <h2>${esc(w.title)}</h2>
      <p class="p-author">Cheikh Ahmadou Bamba · Serigne Touba</p>
      <div class="stats">
        <div><b>${w.bayts}</b><span>Vers</span></div>
        <div><b>${w.parts.length}</b><span>${w.parts.length > 1 ? 'Parties' : 'Partie'}</span></div>
        <div><b>${w.pages}</b><span>Pages PDF</span></div>
      </div>
      <div class="langs"><span>العربية</span><span>TRANSLIT.</span>${w.langs.map(l => `<span>${l.toUpperCase()}</span>`).join('')}</div>
      ${w.parts.length > 1 ? `<details class="parts"><summary>Les ${w.parts.length} parties <span>▾</span></summary><ol>${w.partNames.map((n, i) => `<li><a href="#/lire/${w.slug}/${i + 1}">${esc(n)}<span>→</span></a></li>`).join('')}</ol></details>` : ''}
      <div class="actions">
        <a class="btn btn-gold" href="#/lire/${w.slug}/${p ? p.part : 1}">${ICON.book}${p ? 'Reprendre la lecture' : 'Lire maintenant'}</a>
        <div class="row-actions">
          <a class="btn btn-ghost" href="pdf/${w.slug}.pdf" download>${ICON.dl}PDF · ${mb(w.pdfSize)}</a>
          <button class="icon-btn${favs.has(w.slug) ? ' on' : ''}" data-fav="${w.slug}" aria-label="Favori" style="background:rgba(255,255,255,.06);border-color:rgba(226,194,122,.3);color:var(--gold-2)">${ICON.heart}</button>
          <button class="icon-btn" data-share="${w.slug}" aria-label="Partager" style="background:rgba(255,255,255,.06);border-color:rgba(226,194,122,.3);color:var(--gold-2)">${ICON.share}</button>
        </div>
      </div>`;
    panel.scrollTop = 0;
    if (open) { panel.classList.add('open'); backdrop.classList.add('open'); }
  }
  const closePanel = () => { panel.classList.remove('open'); backdrop.classList.remove('open'); };
  const isOverlay = () => matchMedia('(max-width:1180px)').matches;

  // ---------- Views ----------
  function greet() {
    const h = new Date().getHours();
    return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  }

  function homeView() {
    const feat = LIB.filter(w => w.featured);
    const reading = Object.entries(progress).sort((a, b) => b[1].at - a[1].at).map(([s]) => BY[s]).filter(Boolean).slice(0, 8);
    const daily = LIB[(Math.floor(Date.now() / 864e5)) % LIB.length];
    view.innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <p class="eyebrow">السَّلَامُ عَلَيْكُمْ</p>
          <h1>${greet()}, bienvenue sur Kiraam</h1>
          <p>La bibliothèque des écrits de Cheikh Ahmadou Bamba Khadimou Rassoul : ${LIB.length} livres, ${LIB.reduce((a, w) => a + w.parts.length, 0)} khassidas, à lire en arabe avec translittération et traduction, ou à télécharger en PDF.</p>
          <div class="actions">
            <a class="btn btn-gold" href="#/bibliotheque">${ICON.book}Explorer la bibliothèque</a>
            <a class="btn btn-ghost" href="#/lire/${daily.slug}/1">Khassida du jour · ${esc(daily.title)}</a>
          </div>
        </div>
        <div class="hero-arch"></div>
        <img class="hero-portrait" src="assets/img/serigne-touba-gold.webp" alt="Serigne Touba, Cheikh Ahmadou Bamba">
      </section>
      ${reading.length ? `<section class="section"><div class="section-head"><h2>Continuer la lecture</h2><a href="#/lectures">Tout voir →</a></div><div class="row">${reading.map(w => bookCard(w, { progress: true })).join('')}</div></section>` : ''}
      <section class="section"><div class="section-head"><h2>Recommandés</h2><a href="#/bibliotheque">Tout voir →</a></div>
        <div class="row">${feat.map(w => bookCard(w)).join('')}</div></section>
      <section class="section"><div class="section-head"><h2>Toute la bibliothèque</h2><a href="#/bibliotheque">Filtrer →</a></div>
        <div class="grid">${LIB.slice(0, 18).map(w => bookCard(w)).join('')}</div>
        <div style="text-align:center;margin-top:26px"><a class="btn btn-primary" href="#/bibliotheque">Voir les ${LIB.length} livres</a></div></section>`;
  }

  const FILTERS = {
    all: ['Tous', () => true],
    multi: ['En plusieurs parties', w => w.parts.length > 1],
    short: ['Courts (≤ 25 vers)', w => w.bayts <= 25],
    long: ['Longs (100+ vers)', w => w.bayts >= 100],
    en: ['Traduits en anglais', w => w.langs.includes('en')],
    favs: ['Mes favoris', w => favs.has(w.slug)]
  };
  let libState = { f: 'all', sort: 'az' };

  function filtered(query) {
    const nq = norm(query || '');
    let list = LIB.filter(FILTERS[libState.f][1]);
    if (nq) list = list.filter(w => w._s.includes(nq));
    const s = libState.sort;
    list = [...list].sort((a, b) => s === 'za' ? b.title.localeCompare(a.title) : s === 'long' ? b.bayts - a.bayts : s === 'short' ? a.bayts - b.bayts : a.title.localeCompare(b.title));
    return list;
  }

  function libraryView(title = 'Bibliothèque') {
    const list = filtered(q.value);
    view.innerHTML = `
      <div class="section-head"><h2 style="font-size:34px">${title}</h2></div>
      <div class="toolbar">
        <div class="chips">${Object.entries(FILTERS).map(([k, [l]]) => `<button class="chip${libState.f === k ? ' on' : ''}" data-filter="${k}">${l}</button>`).join('')}</div>
        <select class="select" id="sort" aria-label="Trier">
          <option value="az">A → Z</option><option value="za">Z → A</option><option value="long">Plus longs</option><option value="short">Plus courts</option>
        </select>
      </div>
      <p style="color:var(--muted);font-size:13px;margin:0 0 16px">${list.length} livre${list.length > 1 ? 's' : ''}${q.value ? ` pour « ${esc(q.value)} »` : ''}</p>
      ${list.length ? `<div class="grid">${list.map(w => bookCard(w)).join('')}</div>` :
        `<div class="empty"><div class="ar">لَا شَيْء</div><h3>Aucun khassida trouvé</h3><p>Essaie une autre orthographe : « Jazbu », « Mawahibu », « Matlabul »…</p></div>`}`;
    $('#sort').value = libState.sort;
  }

  function readingView() {
    const items = Object.entries(progress).sort((a, b) => b[1].at - a[1].at).map(([s]) => BY[s]).filter(Boolean);
    view.innerHTML = `<div class="section-head"><h2 style="font-size:34px">Mes lectures</h2></div>` + (items.length
      ? `<div class="grid">${items.map(w => bookCard(w, { progress: true })).join('')}</div>`
      : `<div class="empty"><div class="ar">اِقْرَأْ</div><h3>Aucune lecture en cours</h3><p>Ouvre un khassida : ta progression sera retenue sur cet appareil.</p><a class="btn btn-primary" href="#/bibliotheque">Choisir un livre</a></div>`);
  }

  function favsView() {
    const items = LIB.filter(w => favs.has(w.slug));
    view.innerHTML = `<div class="section-head"><h2 style="font-size:34px">Favoris</h2></div>` + (items.length
      ? `<div class="grid">${items.map(w => bookCard(w)).join('')}</div>`
      : `<div class="empty"><div class="ar">♡</div><h3>Pas encore de favoris</h3><p>Touche le cœur d’un livre pour le retrouver ici.</p><a class="btn btn-primary" href="#/bibliotheque">Parcourir</a></div>`);
  }

  function bioView() {
    view.innerHTML = `<article class="bio">
      <div>
        <p class="ar">الشَّيْخ أَحْمَدُ بَمْبَا خَادِمُ الرَّسُول</p>
        <h1>Serigne Touba</h1>
        <p style="color:var(--muted);margin-top:0">Cheikh Ahmadou Bamba Mbacké, Khadimou Rassoul — « le Serviteur du Prophète »</p>
        <p>Guide spirituel sénégalais, fondateur de la Mouridiyya et de la ville sainte de Touba, Cheikh Ahmadou Bamba a consacré sa vie à l’adoration de Dieu, au service du Prophète Muhammad ﷺ et à l’éducation de ses disciples par le savoir et le travail.</p>
        <p>Il a laissé une œuvre écrite immense en langue arabe : des poèmes (khassaïdes) de louange au Prophète, d’invocation, de jurisprudence, de soufisme et d’éducation de l’âme. Ces textes sont récités chaque jour dans les daaras, les dahiras et lors du Grand Magal de Touba.</p>
        <ol class="timeline">
          <li><b>vers 1853</b>Naissance à Mbacké, dans le Baol.</li>
          <li><b>1887</b>Fondation de Touba.</li>
          <li><b>1895 – 1902</b>Exil au Gabon. Le départ en exil, un 18 Safar, est commémoré chaque année par le Grand Magal.</li>
          <li><b>1903 – 1907</b>Exil en Mauritanie.</li>
          <li><b>1912 – 1927</b>Résidence surveillée à Diourbel, où il poursuit son œuvre.</li>
          <li><b>1927</b>Rappel à Dieu à Diourbel ; il repose à Touba.</li>
        </ol>
        <a class="btn btn-primary" href="#/bibliotheque">${ICON.book}Lire ses khassidas</a>
      </div>
      <figure><img src="assets/img/serigne-touba.webp" alt="Photographie de Serigne Touba"></figure>
    </article>`;
  }

  function aboutView() {
    view.innerHTML = `<article class="prose">
      <h1>À propos de Kiraam</h1>
      <p><b>Kiraam</b> (كِرَام, « les nobles ») est une bibliothèque libre et gratuite consacrée aux écrits de Cheikh Ahmadou Bamba Khadimou Rassoul.</p>
      <h2>Le contenu</h2>
      <ul>
        <li>${LIB.length} livres regroupant ${LIB.reduce((a, w) => a + w.parts.length, 0)} khassidas et ${LIB.reduce((a, w) => a + w.bayts, 0).toLocaleString('fr-FR')} vers.</li>
        <li>Texte arabe vocalisé, translittération latine, traduction française pour tous les textes ; anglaise et italienne pour une partie d’entre eux.</li>
        <li>Chaque livre est disponible en PDF (édition Kiraam, format A5) avec sa couverture.</li>
      </ul>
      <h2>Sources et licence</h2>
      <p>Les textes proviennent du <a href="https://github.com/DaurDiop/khassida_dataset" target="_blank" rel="noopener">Khassida Dataset</a> de Daour, publié sous licence MIT, qui intègre les traductions de l’application <a href="https://github.com/DaurDiop/karamati-khatou-yadi" target="_blank" rel="noopener">Karamati Khatou Yadi</a>. Qu’Allah les récompense.</p>
      <p>Les textes de Serigne Touba appartiennent à toute la communauté. Les PDF Kiraam peuvent être partagés librement.</p>
      <h2>Signaler une erreur</h2>
      <p>Une faute dans un vers ou une traduction ? Ouvre une « issue » sur le dépôt GitHub du projet : chaque correction profite à tous.</p>
    </article>`;
  }

  // ---------- Reader ----------
  async function getPart(n) {
    if (!partCache[n]) partCache[n] = fetch(`data/k/${n}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    return partCache[n];
  }

  let readerObs = null;
  async function readerView(slug, partIdx, baytN) {
    const w = BY[slug];
    if (!w) return notFound();
    partIdx = Math.min(Math.max(1, partIdx || 1), w.parts.length);
    view.innerHTML = `<div class="empty"><div class="ar">بِسْمِ اللَّهِ</div><p>Ouverture du livre…</p></div>`;
    let data;
    try { data = await getPart(w.parts[partIdx - 1]); }
    catch { view.innerHTML = `<div class="empty"><h3>Impossible de charger ce texte</h3><p>Vérifie ta connexion et réessaie.</p></div>`; return; }
    if (location.hash.split('/')[2] !== slug) return; // navigated away
    const lang = w.langs.includes(prefs.lang) ? prefs.lang : 'fr';
    const has = l => data.bayts.some(b => b[l]);
    const langBtns = ['fr', 'en', 'it'].filter(has);
    const prev = partIdx > 1 ? partIdx - 1 : null, next = partIdx < w.parts.length ? partIdx + 1 : null;
    const verses = data.bayts.map(b => {
      const plain = b.ar.map(stripAr);
      const stack = plain.some(x => x.length > 30) || b.ar.length === 1;
      return `<div class="verse" id="v${b.n}" data-n="${b.n}">
        <div class="num">${arNum(b.n)}</div>
        <div class="ar-lines${stack ? ' stack' : ''}">${b.ar.map(a => `<span>${esc(a)}</span>`).join('')}</div>
        <div class="tr">${esc(b.tr.filter(Boolean).join(' · '))}</div>
        <div class="tl" lang="${lang}">${esc(b[lang] || b.fr || '')}</div>
      </div>`;
    }).join('');
    view.innerHTML = `<div class="reader${prefs.tr ? '' : ' hide-tr'}${prefs.lang === 'none' ? ' hide-tl' : ''}" style="--fs:${prefs.fs}">
      <div class="reader-bar">
        <a class="icon-btn" href="#/" data-back aria-label="Retour">${ICON.back}</a>
        <div class="t"><b>${esc(w.title)}</b><small>${w.parts.length > 1 ? `Partie ${partIdx} / ${w.parts.length} · ` : ''}${data.bayts.length} vers</small></div>
        ${w.parts.length > 1 ? `<select class="select" id="partSel" aria-label="Partie">${w.partNames.map((n, i) => `<option value="${i + 1}"${i + 1 === partIdx ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
        <div class="seg" role="group" aria-label="Traduction">${langBtns.map(l => `<button data-lang="${l}" class="${prefs.lang === l ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}<button data-lang="none" class="${prefs.lang === 'none' ? 'on' : ''}" title="Arabe seul">ع</button></div>
        <div class="seg"><button data-tr class="${prefs.tr ? 'on' : ''}" title="Translittération">Aa</button></div>
        <div class="seg"><button data-fs="-1" aria-label="Réduire">A−</button><button data-fs="1" aria-label="Agrandir">A+</button></div>
        <a class="icon-btn" href="pdf/${w.slug}.pdf" download aria-label="Télécharger le PDF">${ICON.dl}</a>
      </div>
      <header class="reader-head">
        <div class="basmala">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        <h1>${esc(data.name)}</h1>
        <div class="orn">✦ ✦ ✦</div>
      </header>
      ${verses}
      <nav class="reader-nav">
        ${prev ? `<a class="btn btn-ghost" href="#/lire/${w.slug}/${prev}">${ICON.back}${esc(w.partNames[prev - 1])}</a>` : '<span></span>'}
        ${next ? `<a class="btn btn-primary" href="#/lire/${w.slug}/${next}">${esc(w.partNames[next - 1])}${ICON.next}</a>` : `<a class="btn btn-primary" href="#/bibliotheque">Fin · retour à la bibliothèque</a>`}
      </nav>
    </div>`;
    if (w.parts.length > 1) $('#partSel').onchange = e => location.hash = `#/lire/${w.slug}/${e.target.value}`;

    // progress tracking
    let offset = 0;
    for (let i = 0; i < partIdx - 1; i++) { try { offset += (await getPart(w.parts[i])).bayts.length; } catch {} }
    const mark = idx => {
      progress[w.slug] = { part: partIdx, done: Math.max(offset + idx, (progress[w.slug] && progress[w.slug].part === partIdx ? progress[w.slug].done : 0)), at: Date.now() };
      store.set('progress', progress);
    };
    mark(0);
    renderPanel(w.slug);
    readerObs && readerObs.disconnect();
    readerObs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { const i = [...view.querySelectorAll('.verse')].indexOf(e.target) + 1; mark(i); }
    }), { rootMargin: '-40% 0px -50% 0px' });
    view.querySelectorAll('.verse').forEach(v => readerObs.observe(v));
    if (baytN) { const el = $('#v' + baytN); if (el) { el.classList.add('hl'); el.scrollIntoView({ block: 'center' }); } }
    else window.scrollTo(0, 0);
  }

  function notFound() {
    view.innerHTML = `<div class="empty"><div class="ar">؟</div><h3>Page introuvable</h3><a class="btn btn-primary" href="#/">Retour à l’accueil</a></div>`;
  }

  // ---------- Router ----------
  function setNav(key) {
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === key));
  }
  function route() {
    closePanel();
    readerObs && readerObs.disconnect();
    const [, page, a, b, c] = location.hash.split('/');
    switch (page || '') {
      case '': setNav('home'); homeView(); break;
      case 'bibliotheque': setNav('library'); libraryView(); break;
      case 'lectures': setNav('reading'); readingView(); break;
      case 'favoris': setNav('favs'); favsView(); break;
      case 'serigne-touba': setNav('bio'); bioView(); break;
      case 'a-propos': setNav('about'); aboutView(); break;
      case 'livre': setNav('library'); libraryView(); renderPanel(a, true); return;
      case 'lire': setNav(''); readerView(a, parseInt(b, 10), parseInt(c, 10)); return;
      default: notFound();
    }
    if (!selected || !BY[selected]) selected = (LIB.find(w => w.featured) || LIB[0]).slug;
    renderPanel(selected);
    if (page !== 'lire') window.scrollTo(0, 0);
  }

  // ---------- Events ----------
  document.addEventListener('click', e => {
    const book = e.target.closest('.book');
    if (book) { renderPanel(book.dataset.slug, isOverlay()); return; }
    const f = e.target.closest('[data-filter]');
    if (f) { libState.f = f.dataset.filter; libraryView(); return; }
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      const s = fav.dataset.fav; favs.has(s) ? favs.delete(s) : favs.add(s); store.set('favs', [...favs]);
      fav.classList.toggle('on', favs.has(s));
      const card = document.querySelector(`.book[data-slug="${s}"] .cover-wrap`);
      if (card) { const d = card.querySelector('.fav-dot'); if (favs.has(s) && !d) card.insertAdjacentHTML('afterbegin', `<span class="fav-dot">${ICON.heart}</span>`); if (!favs.has(s) && d) d.remove(); }
      return;
    }
    const sh = e.target.closest('[data-share]');
    if (sh) {
      const w = BY[sh.dataset.share]; const url = location.href.split('#')[0] + '#/livre/' + w.slug;
      if (navigator.share) navigator.share({ title: w.title + ' · Kiraam', text: `${w.title} — khassida de Serigne Touba`, url }).catch(() => {});
      else navigator.clipboard?.writeText(url).then(() => { sh.title = 'Lien copié'; sh.style.color = '#fff'; });
      return;
    }
    if (e.target.closest('[data-close]') || e.target === backdrop) { closePanel(); return; }
    const lg = e.target.closest('[data-lang]');
    if (lg) { prefs.lang = lg.dataset.lang; savePrefs(); const r = $('.reader'); r.classList.toggle('hide-tl', prefs.lang === 'none');
      r.querySelectorAll('[data-lang]').forEach(x => x.classList.toggle('on', x === lg));
      if (prefs.lang !== 'none') { const [, , s, p] = location.hash.split('/'); getPart(BY[s].parts[(parseInt(p, 10) || 1) - 1]).then(d => { r.querySelectorAll('.verse').forEach((v, i) => { const t = v.querySelector('.tl'); t.textContent = d.bayts[i][prefs.lang] || d.bayts[i].fr || ''; t.lang = prefs.lang; }); }); }
      return; }
    if (e.target.closest('[data-tr]')) { prefs.tr = !prefs.tr; savePrefs(); $('.reader').classList.toggle('hide-tr', !prefs.tr); e.target.closest('[data-tr]').classList.toggle('on', prefs.tr); return; }
    const fs = e.target.closest('[data-fs]');
    if (fs) { prefs.fs = Math.min(1.6, Math.max(.8, +(prefs.fs + .1 * fs.dataset.fs).toFixed(2))); savePrefs(); $('.reader').style.setProperty('--fs', prefs.fs); return; }
    if (e.target.closest('[data-back]')) { e.preventDefault(); history.length > 1 ? history.back() : location.hash = '#/'; }
  });
  document.addEventListener('change', e => { if (e.target.id === 'sort') { libState.sort = e.target.value; libraryView(); } });
  let qt;
  q.addEventListener('input', () => {
    clearTimeout(qt);
    qt = setTimeout(() => { if (!location.hash.startsWith('#/bibliotheque')) { location.hash = '#/bibliotheque'; } else libraryView(); }, 120);
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== q && !/input|select|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
    if (e.key === 'Escape') closePanel();
  });
  window.addEventListener('hashchange', route);

  // ---------- Boot ----------
  fetch('data/library.json').then(r => r.json()).then(d => {
    LIB = d.works.map(w => Object.assign(w, { _s: norm([w.title, w.slug, w.incipit, ...w.partNames].join(' ')) }));
    LIB.forEach(w => BY[w.slug] = w);
    const nK = LIB.reduce((a, w) => a + w.parts.length, 0);
    $('#countPill').innerHTML = `<b>${LIB.length}</b> livres · <b>${nK}</b> khassidas`;
    route();
  }).catch(() => { view.innerHTML = '<div class="empty"><h3>Chargement impossible</h3><p>Recharge la page.</p></div>'; });
})();
