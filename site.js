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
