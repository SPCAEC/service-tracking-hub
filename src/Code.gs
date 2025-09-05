/** Service Tracking Hub — Router + API (Code.js) */

function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) ? String(e.parameter.view) : 'hub';
  return serveView(view);
}

function serveView(view) {
  try {
    // Render the requested view to raw HTML (as a fragment)
    var pageTpl = HtmlService.createTemplateFromFile(view);
    var pageHtml = String(pageTpl.evaluate().getContent() || '');
    var len = pageHtml.length;

    // Build a small debug banner (remove after we fix things)
    var debug =
      '<div style="position:sticky;top:0;z-index:9999;' +
      'background:#fef3c7;border-bottom:1px solid #f59e0b;padding:8px 12px;' +
      'font:12px/1.4 ui-monospace,monospace;color:#92400e;">' +
      'DEBUG: view="<b>' + esc(view) + '</b>", contentLength=' + len +
      (len ? '' : ' — (empty fragment)') +
      '</div>';

    if (!len) {
      // Safety fallback: show why it's empty
      pageHtml =
        '<div style="padding:16px;background:#fee2e2;border:1px solid #ef4444;border-radius:8px;">' +
        'View "<b>' + esc(view) + '</b>" evaluated to empty content. ' +
        'Check the contents of <b>' + esc(view) + '.html</b>.' +
        '</div>';
    }

    // Wrap inside the shared shell template
    var shellTpl = HtmlService.createTemplateFromFile('shared_shell');
    shellTpl.content = debug + pageHtml; // inject debug + page
    return shellTpl.evaluate().setTitle('Service Tracking Hub');

  } catch (err) {
    var msg =
      '<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;' +
      'background:#fef3c7;border:1px solid #f59e0b;padding:12px;border-radius:8px;">' +
      'Router error for view "' + esc(view) + '":\n' + esc(String(err)) + '</pre>';

    var shellTpl2 = HtmlService.createTemplateFromFile('shared_shell');
    shellTpl2.content = msg;
    return shellTpl2.evaluate().setTitle('Service Tracking Hub');
  }
}

// Safe HTML escape (for inline diagnostics)
function esc(s) {
  return String(s).replace(/[&<>"']/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}

// Include helper for HTML partials
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* =========================
   API exposed to the client
   (delegates to service layer)
   ========================= */
function searchClient(query) {
  // TEMP STUB to prove round-trip
  return { status: 'ok', source: 'searchClient stub', echo: query || null };
}
function searchByFormId(formId) {
  // TEMP STUB to prove round-trip
  return { status: 'ok', source: 'searchByFormId stub', echo: formId || null };
}
function createClient(data) {
  // TEMP STUB to prove round-trip
  return { status: 'ok', source: 'createClient stub', echo: data || null };
}
function mergeClient(existing, candidate) {
  // TEMP STUB to prove round-trip
  return { status: 'ok', source: 'mergeClient stub', echo: { existing, candidate } };
}