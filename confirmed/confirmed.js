/* /confirmed: show "confirmed" or the reason the link failed. Loaded at the end of the page (not deferred), where it used to be inline. */
// Supabase appends the result as a fragment: #access_token=... when the
// email was confirmed, #error=...&error_description=... when it wasn't.
// Nothing here signs in; the app does that. Drop the fragment so the
// token isn't left in the address bar or history.
(function () {
  var params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  if (location.hash) history.replaceState(null, '', location.pathname);
  if (!params.get('error') && !params.get('error_code')) return;
  document.getElementById('ok').hidden = true;
  document.getElementById('failed').hidden = false;
  var description = params.get('error_description');
  if (description) {
    document.getElementById('reason').textContent =
      description.replace(/\+/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }).replace(/\.?$/, '.');
  }
})();
