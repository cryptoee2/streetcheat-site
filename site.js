/*
 * streetcheat.com, every page (loaded with defer). The pages' Content-Security-Policy allows scripts from this
 * site only, so page code lives in files like this one, never inline.
 */

// Footer year: the pages say 2026; show the current year without editing every page each January.
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// Phone menu (<details class="menu"> in the top bar, shown under 860px): close it after a link is chosen,
// on a tap outside it, or on Escape.
document.querySelectorAll('details.menu').forEach(menu => {
  menu.addEventListener('click', e => { if (e.target.closest('a')) menu.open = false; });
  document.addEventListener('click', e => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
});

// "Get the app" in the top bar: straight to the phone's own store; on a computer, the download section,
// which shows both badges. iPads that ask for the desktop site call themselves Macintosh, with a touch screen.
const store = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  ? 'https://apps.apple.com/us/app/streetcheat-road-closures/id6816572317'
  : /Android/.test(navigator.userAgent) ? 'https://play.google.com/store/apps/details?id=com.streetcheat.app' : null;
if (store) document.querySelectorAll('[data-get-app]').forEach(a => { a.href = store; });

// Lower case, no accents or punctuation, single spaces: "St. Louis" and "st louis" are the same search.
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Home page, "Is your area covered?": searches /coverage.json, which make_sources_page.py writes from the same
// source list as the Data sources page. The list is fetched the first time the box is used. If it can't be
// fetched, the box says so and points at the full list; it never guesses.
const checker = document.querySelector('[data-coverage]');
if (checker) {
  const search = checker.querySelector('.checker-search');
  const input = search.querySelector('input');
  const results = search.querySelector('[data-results]');
  const KINDS = { city: 'City streets', county: 'County roads', citycounty: 'City and county roads', regional: 'Regional agency' };
  const MOST = 6;
  let coverage = null;
  let loading = null;
  search.hidden = false;

  const el = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; return node; };
  const line = (...parts) => {
    const p = el('p');
    parts.forEach(part => p.append(typeof part === 'string' ? part : part.node));
    return p;
  };
  const strong = text => ({ node: el('strong', text) });
  const list = names => names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

  const load = () => loading || (loading = fetch('/coverage.json')
    .then(response => { if (!response.ok) throw new Error(`coverage.json: ${response.status}`); return response.json(); })
    .then(data => {
      data.places.forEach(place => {
        // "City of Dallas" is searched as "dallas"; "Dallas County" as "dallas county"
        place.key = plain(place.n.replace(/^(city|town|village|township|borough|municipality|county) of /i, ''));
        place.full = plain(place.n);
      });
      Object.entries(data.states).forEach(([code, state]) => { state.code = code; state.key = plain(state.name); });
      coverage = data;
    }));

  // The state a search names, and what is left of the search without it: "dallas tx", "Dallas, Texas", "texas".
  const stateIn = q => {
    const states = Object.values(coverage.states);
    const whole = states.find(s => s.key === q || s.code.toLowerCase() === q);
    if (whole) return [whole, ''];
    for (const s of states) {
      for (const tail of [s.key, s.code.toLowerCase()]) {
        if (q.endsWith(' ' + tail)) return [s, q.slice(0, -tail.length).trim()];
      }
    }
    return [null, q];
  };

  const highways = state => state.feeds.length
    ? line('Highways in ', strong(state.name), `: ${list(state.feeds)}.`)
    : null;

  const show = () => {
    const q = plain(input.value);
    results.replaceChildren();
    if (q.length < 2) return;
    const [state, rest] = stateIn(q);

    // a state on its own: its highway sources, and how many of its cities and counties
    if (state && !rest) {
      const local = coverage.places.filter(p => p.st === state.code).sort((a, b) => a.key.localeCompare(b.key));
      const roads = highways(state);
      if (roads) results.append(roads);
      if (local.length) {
        results.append(local.length > MOST
          ? line(strong(`${local.length} local sources`), ` in ${state.name}, including:`)
          : line('Local sources in ', strong(state.name), ':'));
        const ul = el('ul');
        local.slice(0, MOST).forEach(p => { const li = el('li'); li.append(el('span', p.n), el('span', KINDS[p.t])); ul.append(li); });
        results.append(ul);
        if (local.length > MOST) results.append(line(`And ${local.length - MOST} more on the full list.`));
      } else if (!roads) {
        results.append(line(`No source for ${state.name} yet.`));
      } else {
        results.append(line(`No local sources in ${state.name} yet.`));
      }
      return;
    }

    // a place, with or without its state: names that start with the search first, then names that contain it
    const places = (name, within) => {
      const rank = p => p.key === name || p.full === name ? 0 : p.key.startsWith(name) ? 1 : (' ' + p.full).includes(' ' + name) ? 2 : 3;
      return coverage.places
        .filter(p => (!within || p.st === within.code) && p.full.includes(name))
        .sort((a, b) => rank(a) - rank(b) || a.n.localeCompare(b.n));
    };
    // a search can end in what only looks like a state ("... in", "... la"): if that state has no such place,
    // look for the whole search in every state
    let found = places(rest, state);
    if (!found.length && state) found = places(q, null);
    if (found.length) {
      const ul = el('ul');
      found.slice(0, MOST).forEach(p => {
        const li = el('li');
        li.append(el('span', p.n.endsWith(`, ${p.st}`) ? p.n : `${p.n}, ${coverage.states[p.st].name}`), el('span', KINDS[p.t]));
        ul.append(li);
      });
      results.append(ul);
      if (found.length > MOST) results.append(line(`And ${found.length - MOST} more. Add the state to narrow it down.`));
      // the highway sources too, when every match is in one state
      const codes = [...new Set(found.slice(0, MOST).map(p => p.st))];
      const roads = codes.length === 1 ? highways(coverage.states[codes[0]]) : null;
      if (roads) results.append(roads);
      return;
    }

    const typed = input.value.trim();
    results.append(line('No city or county source for ', strong(typed), ' yet. State highways are covered in all 50 states, so drives on them are still checked.'));
    const roads = state ? highways(state) : null;
    if (roads) results.append(roads);
    const ask = el('a', 'Ask us to add it');
    ask.href = `mailto:support@streetcheat.com?subject=${encodeURIComponent('Please add ' + typed)}`;
    results.append(line({ node: ask }, '.'));
  };

  const run = () => load().then(show).catch(error => {
    console.error(error);
    loading = null;
    results.replaceChildren(line("The list didn't load. Try again, or see every source below."));
  });
  input.addEventListener('focus', () => { load().catch(() => { loading = null; }); }, { once: true });
  input.addEventListener('input', run);
  search.querySelectorAll('[data-try]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.try; run(); }));
}

// Data sources page: the box at the top narrows the long lists as you type. Every row carries its name and its
// state's name and abbreviation in data-k (make_sources_page.py), so "Texas" finds "City of Austin".
const filter = document.querySelector('[data-filter]');
if (filter) {
  const input = filter.querySelector('input');
  const count = filter.querySelector('[data-count]');
  const rows = [...document.querySelectorAll('ul.sources li')];
  const sections = [...document.querySelectorAll('ul.sources')].map(ul => ul.closest('section'));
  filter.hidden = false;
  input.addEventListener('input', () => {
    const words = plain(input.value).split(' ').filter(Boolean);
    let shown = 0;
    rows.forEach(row => {
      const key = ' ' + row.dataset.k;
      // every word must start a word of the row: "new" finds New York, not Renew
      row.hidden = !words.every(word => key.includes(' ' + word));
      if (!row.hidden) shown += 1;
    });
    sections.forEach(section => { section.hidden = !section.querySelector('ul.sources li:not([hidden])'); });
    count.textContent = !words.length ? `${rows.length} sources`
      : shown ? `${shown} of ${rows.length} sources`
      : 'No source matches that yet. State highways are covered in all 50 states.';
  });
}
