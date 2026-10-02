(() => {
  const { config, products, families, featured } = window.HNA;
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const NNBSP = String.fromCharCode(0x202f); // espace fine insécable
  const NBSP = String.fromCharCode(0xa0);
  const nf = new Intl.NumberFormat('fr-FR');
  const price = (n) => nf.format(n).replace(/\s/g, NNBSP) + NBSP + 'Ar';
  const plainPrice = (n) => nf.format(n).replace(/\s/g, ' ') + ' Ar';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const wa = (text) => `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(text)}`;
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const label = (p) => `${p.brand} ${p.name}${p.size ? ` (${p.size})` : ''}`;

  const transition = (fn) => {
    if (reduced || !document.startViewTransition) { fn(); return null; }
    const vt = document.startViewTransition(fn);
    // Onglet en arrière-plan ou transition interrompue : le DOM est déjà à jour.
    vt.ready.catch(() => {});
    vt.finished.catch(() => {});
    return vt;
  };

  /* Suit le pointeur avec un amorti (pas de saut sec : la valeur rattrape sa cible). */
  function follow(el, strength, area = el) {
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) { raf = requestAnimationFrame(tick); return; }
      raf = 0;
      if (!tx && !ty) el.style.translate = '';
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    area.addEventListener('pointermove', (e) => {
      const r = area.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      kick();
    });
    area.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  }

  /* ───────────── Liens de contact ───────────── */
  $$('.js-wa').forEach((a) => { a.href = wa(a.dataset.msg || 'Bonjour HNA Parfumerie !'); });
  $$('.js-logo').forEach((img) => { img.src = config.logo; });
  $$('.js-phone').forEach((el) => { el.textContent = config.phoneDisplay; });
  $$('.js-email').forEach((el) => { el.textContent = config.email; });
  const link = (sel, href) => $$(sel).forEach((a) => { a.href = href; });
  link('.js-maps', config.maps);
  link('.js-tel', `tel:+${config.whatsapp}`);
  link('.js-mail', `mailto:${config.email}`);
  link('.js-group', config.whatsappGroup);
  link('.js-ig', config.instagram);
  link('.js-tt', config.tiktok);
  link('.js-fb', config.facebook);
  $('#year').textContent = new Date().getFullYear();

  /* ───────────── Marques défilantes ───────────── */
  const brands = [...new Set(products.map((p) => p.brand))];
  const brandRow = (hidden) => brands.map((b) => `<span${hidden ? ' aria-hidden="true"' : ''}>${esc(b)}</span>`).join('');
  $('#marquee').innerHTML = brandRow(false) + brandRow(true);

  /* ───────────── Éventail du hero ───────────── */
  const hero = $('.hero');
  const deck = $('#deck');
  const deckItems = featured.map((sku) => bySku.get(sku)).filter(Boolean);
  deck.innerHTML = deckItems.map((p, i) => `
    <a class="blot" href="#p-${p.sku}" data-sku="${p.sku}" data-pos="${i}"${i ? ' tabindex="-1" aria-hidden="true"' : ''}>
      <span class="blot__img"><img src="${p.img}" alt="${esc(label(p))}" referrerpolicy="no-referrer" decoding="async"></span>
      <span class="blot__brand">${esc(p.brand)}</span>
      <span class="blot__name">${esc(p.name)}</span>
      <span class="blot__row"><b>${price(p.price)}</b><span>Voir ${icon('arrow')}</span></span>
    </a>`).join('');
  const blots = $$('.blot', deck);
  const deckCount = $('#deck-count');
  let deckIndex = 0;
  let deckBusy = false;
  const paintCount = () => { deckCount.textContent = `${deckIndex + 1} / ${blots.length}`; };
  paintCount();

  function advance() {
    if (blots.length < 2 || deckBusy) return;
    const n = blots.length;
    blots.forEach((b) => {
      const pos = Number(b.dataset.pos);
      if (pos === 0 && !reduced) {
        deckBusy = true;
        b.classList.add('is-leaving');
        setTimeout(() => { b.classList.remove('is-leaving'); deckBusy = false; }, 800);
      }
      const next = (pos - 1 + n) % n;
      b.dataset.pos = next;
      b.tabIndex = next === 0 ? 0 : -1;
      b.setAttribute('aria-hidden', next === 0 ? 'false' : 'true');
    });
    deckIndex = (deckIndex + 1) % n;
    paintCount();
  }

  let deckTimer = null;
  let deckPaused = false;
  const startDeck = () => {
    if (reduced || deckTimer) return;
    deckTimer = setInterval(() => { if (!deckPaused && !document.hidden) advance(); }, 4200);
  };
  const stopDeck = () => { clearInterval(deckTimer); deckTimer = null; };
  const deckWrap = $('.hero__deck');
  ['pointerenter', 'focusin'].forEach((e) => deckWrap.addEventListener(e, () => { deckPaused = true; }));
  ['pointerleave', 'focusout'].forEach((e) => deckWrap.addEventListener(e, () => { deckPaused = false; }));
  $('#deck-next').addEventListener('click', () => { advance(); stopDeck(); startDeck(); });
  deck.addEventListener('click', (e) => {
    const b = e.target.closest('.blot');
    if (!b) return;
    e.preventDefault();
    openFromOutside(b.dataset.sku);
  });

  if (finePointer && !reduced) {
    follow(deck, 0.018, hero);
    $$('[data-magnetic]').forEach((el) => follow(el, 0.2));
  }

  /* ───────────── Catalogue ───────────── */
  const grid = $('#grid');
  const state = { gender: 'all', family: 'all', q: '', sort: 'featured' };

  $('#family-chips').innerHTML = families
    .map((f) => `<button class="chip" type="button" data-family="${f.key}" aria-pressed="false">${f.label}</button>`).join('');

  const notesRow = (title, list) => (list && list.length
    ? `<div class="notes__row"><dt>${title}</dt><dd>${list.map(esc).join(', ')}</dd></div>` : '');

  function cardHTML(p) {
    const meta = [p.type, p.gender, p.size].filter(Boolean).join(' · ');
    const facts = [p.accord && `Famille${NBSP}: ${p.accord}`, p.origin && `Provenance${NBSP}: ${p.origin}`, `Réf.${NBSP}${p.sku}`].filter(Boolean).join(' · ');
    const notes = p.notes ? `<dl class="notes" style="--i:1">${notesRow('Tête', p.notes.tete)}${notesRow('Cœur', p.notes.coeur)}${notesRow('Fond', p.notes.fond)}</dl>` : '';
    const msg = `Bonjour HNA Parfumerie, je souhaite commander : ${label(p)}, ${plainPrice(p.price)} (réf. ${p.sku}).`;
    return `
    <article class="card reveal" id="p-${p.sku}" data-sku="${p.sku}" style="view-transition-name: card-${p.sku}">
      <button class="card__close" type="button" aria-label="Fermer la fiche">${icon('close')}</button>
      <div class="card__media" data-brand="${esc(p.brand)}"><img src="${p.img}" alt="${esc(label(p))}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>
      <div class="card__info">
        <p class="card__brand">${esc(p.brand)}</p>
        <h3 class="card__name"><button class="card__open" type="button" aria-expanded="false" aria-controls="d-${p.sku}">${esc(p.name)}</button></h3>
        <p class="card__meta">${esc(meta)}</p>
      </div>
      <div class="card__buy">
        <span class="card__price">${price(p.price)}</span>
        <button class="add" type="button" data-add="${p.sku}" aria-pressed="false" aria-label="Ajouter ${esc(label(p))} à ma sélection">${icon('plus')}<span>Ajouter</span></button>
      </div>
      <div class="card__detail" id="d-${p.sku}">
        <p class="card__desc" style="--i:0">${esc(p.desc)}</p>
        ${notes}
        <p class="card__facts" style="--i:2">${esc(facts)}</p>
        <div class="card__actions" style="--i:3">
          <a class="btn btn--dark" href="${esc(wa(msg))}" target="_blank" rel="noopener">${icon('wa')}<span>Commander sur WhatsApp</span></a>
        </div>
      </div>
    </article>`;
  }

  // Les événements load / error ne remontent pas : on les capte à la descente.
  grid.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded'); }, true);
  grid.addEventListener('error', (e) => {
    if (e.target.tagName !== 'IMG') return;
    e.target.classList.add('is-loaded');
    e.target.closest('.card__media')?.classList.add('is-missing');
  }, true);
  grid.innerHTML = products.map(cardHTML).join('');
  $$('img', grid).forEach((img) => { if (img.complete && img.naturalWidth) img.classList.add('is-loaded'); });

  const cards = new Map($$('.card', grid).map((c) => [c.dataset.sku, c]));
  const haystack = new Map(products.map((p) => [p.sku, fold([
    p.brand, p.name, p.type, p.gender, p.accord || '', p.origin || '',
    ...(p.notes ? [...p.notes.tete, ...p.notes.coeur, ...p.notes.fond] : []),
  ].join(' '))]));

  const sorters = {
    featured: () => 0,
    asc: (a, b) => a.price - b.price,
    desc: (a, b) => b.price - a.price,
    brand: (a, b) => a.brand.localeCompare(b.brand, 'fr') || a.name.localeCompare(b.name, 'fr'),
  };

  function apply() {
    const terms = fold(state.q.trim()).split(/\s+/).filter(Boolean);
    let shown = 0;
    [...products].sort(sorters[state.sort]).forEach((p) => {
      const card = cards.get(p.sku);
      grid.append(card);
      const ok = (state.gender === 'all' || p.gender === state.gender)
        && (state.family === 'all' || p.families.includes(state.family))
        && terms.every((t) => haystack.get(p.sku).includes(t));
      card.hidden = !ok;
      if (!ok && card.classList.contains('is-open')) setOpen(card, false);
      if (ok) shown += 1;
    });
    $('#count').textContent = shown === 0 ? '' : shown === 1 ? '1 parfum' : `${shown} parfums`;
    $('#empty').hidden = shown !== 0;
    grid.hidden = shown === 0;
  }

  const setPressed = (attr, value) => $$(`.chip[data-${attr}]`).forEach((c) => {
    c.setAttribute('aria-pressed', String(c.dataset[attr] === value));
  });

  $('#filters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.gender) {
      state.gender = chip.dataset.gender;
      setPressed('gender', state.gender);
    } else {
      state.family = state.family === chip.dataset.family ? 'all' : chip.dataset.family;
      setPressed('family', state.family);
    }
    transition(apply);
  });
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; apply(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; transition(apply); });
  function resetFilters() {
    Object.assign(state, { gender: 'all', family: 'all', q: '' });
    $('#search').value = '';
    setPressed('gender', 'all');
    setPressed('family', 'all');
  }
  $('#reset').addEventListener('click', () => { resetFilters(); transition(apply); });

  /* Fiche dépliée */
  function setOpen(card, open) {
    card.classList.toggle('is-open', open);
    $('.card__open', card).setAttribute('aria-expanded', String(open));
    if (open) card.classList.add('is-in');
  }
  function toggleCard(card, open) {
    const current = $('.card.is-open', grid);
    const vt = transition(() => {
      if (current && current !== card) setOpen(current, false);
      setOpen(card, open);
    });
    const after = () => {
      if (open) card.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    };
    if (vt) vt.finished.then(after, after); else after();
    if (open) history.replaceState(null, '', `#p-${card.dataset.sku}`);
    else if (location.hash.startsWith('#p-')) history.replaceState(null, '', location.pathname + location.search);
  }
  function openFromOutside(sku) {
    const card = cards.get(sku);
    if (!card) return;
    if (card.hidden) { resetFilters(); apply(); }
    toggleCard(card, true);
  }

  grid.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { toggleItem(add.dataset.add); return; }
    const card = e.target.closest('.card');
    if (!card) return;
    if (e.target.closest('.card__close')) { toggleCard(card, false); $('.card__open', card).focus({ preventScroll: true }); return; }
    if (e.target.closest('.card__open') && !card.classList.contains('is-open')) toggleCard(card, true);
  });

  /* ───────────── Sélection → WhatsApp ───────────── */
  const tray = $('#tray');
  const KEY = 'hna-selection';
  let selection = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    selection = new Map(saved.filter(([sku, n]) => bySku.has(sku) && n > 0));
  } catch { /* stockage indisponible : la sélection reste en mémoire */ }
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify([...selection])); } catch { /* idem */ } };

  const total = () => [...selection].reduce((sum, [sku, n]) => sum + bySku.get(sku).price * n, 0);
  const count = () => [...selection.values()].reduce((a, b) => a + b, 0);
  function orderMessage() {
    const lines = [...selection].map(([sku, n]) => {
      const p = bySku.get(sku);
      return `• ${n} × ${label(p)}, ${plainPrice(p.price)} (réf. ${sku})`;
    });
    return `Bonjour HNA Parfumerie, je souhaite commander :\n${lines.join('\n')}\n\nTotal : ${plainPrice(total())}\nMerci !`;
  }

  function paintTray(fromUser) {
    const n = count();
    const filled = n > 0;
    tray.dataset.state = filled ? 'filled' : 'idle';
    if (!filled) setTrayOpen(false);
    const badge = $('#tray-badge');
    badge.textContent = n;
    if (fromUser && !reduced) {
      badge.classList.add('is-bump');
      setTimeout(() => badge.classList.remove('is-bump'), 90);
    }
    $('#tray-summary').textContent = price(total());
    $('#tray-total').textContent = price(total());
    $('#tray-send-label').textContent = filled ? 'Commander' : 'Écrire sur WhatsApp';
    $('#tray-send').href = filled ? wa(orderMessage()) : wa('Bonjour HNA Parfumerie, j’ai une question.');
    $('#tray-list').innerHTML = [...selection].map(([sku, qty]) => {
      const p = bySku.get(sku);
      return `
      <li class="tray__item">
        <span class="tray__thumb"><img src="${p.img}" alt="" referrerpolicy="no-referrer"></span>
        <p>${esc(p.brand)} ${esc(p.name)}<small>${price(p.price)}${p.size ? ` · ${esc(p.size)}` : ''}</small></p>
        <span class="qty">
          <button type="button" data-qty="-1" data-sku="${sku}" aria-label="Retirer un ${esc(label(p))}">${icon('minus')}</button>
          <output>${qty}</output>
          <button type="button" data-qty="1" data-sku="${sku}" aria-label="Ajouter un ${esc(label(p))}">${icon('plus')}</button>
        </span>
      </li>`;
    }).join('');
    $$('[data-add]', grid).forEach((b) => {
      const on = selection.has(b.dataset.add);
      if (b.getAttribute('aria-pressed') === String(on)) return;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-fresh', Boolean(fromUser));
      b.innerHTML = `${icon(on ? 'check' : 'plus')}<span>${on ? 'Ajouté' : 'Ajouter'}</span>`;
    });
  }
  function toggleItem(sku) {
    if (selection.has(sku)) selection.delete(sku); else selection.set(sku, 1);
    persist();
    paintTray(true);
  }
  function setTrayOpen(open) {
    tray.classList.toggle('is-open', open);
    $('#tray-toggle').setAttribute('aria-expanded', String(open));
  }
  $('#tray-toggle').addEventListener('click', () => setTrayOpen(!tray.classList.contains('is-open')));
  $('#tray-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-qty]');
    if (!b) return;
    const next = (selection.get(b.dataset.sku) || 0) + Number(b.dataset.qty);
    if (next <= 0) selection.delete(b.dataset.sku); else selection.set(b.dataset.sku, Math.min(next, 9));
    persist();
    paintTray(true);
  });
  document.addEventListener('click', (e) => {
    // e.target peut avoir été retiré du DOM par un rafraîchissement de la liste.
    if (!tray.classList.contains('is-open') || !e.target.isConnected) return;
    if (!tray.contains(e.target) && !e.target.closest('[data-add]')) setTrayOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (tray.classList.contains('is-open')) { setTrayOpen(false); $('#tray-toggle').focus(); return; }
    const open = $('.card.is-open', grid);
    if (open) { toggleCard(open, false); $('.card__open', open).focus({ preventScroll: true }); }
  });

  /* ───────────── Défilement (observateurs, aucun écouteur de scroll) ───────────── */
  const header = $('.site-header');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([en]) => header.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);

  new IntersectionObserver(([en]) => {
    const past = !en.isIntersecting;
    header.classList.toggle('is-solid', past);
    document.body.classList.toggle('past-hero', past);
    if (past) stopDeck(); else startDeck();
  }, { rootMargin: '-64px 0px 0px 0px' }).observe(hero);

  const revealer = new IntersectionObserver((entries) => {
    entries.filter((en) => en.isIntersecting).forEach((en, i) => {
      if (en.target.classList.contains('card')) en.target.style.setProperty('--s', i % 4);
      en.target.classList.add('is-in');
      revealer.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealer.observe(el));

  /* ───────────── Départ ───────────── */
  apply();
  paintTray(false);
  if (location.hash.startsWith('#p-')) {
    const card = cards.get(decodeURIComponent(location.hash.slice(3)));
    if (card) { setOpen(card, true); requestAnimationFrame(() => card.scrollIntoView({ block: 'start' })); }
  }
})();
