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

    if (!pageHtml.trim()) {
      // Guard: never render a blank page — show a helpful message instead
      pageHtml =
        '<div style="padding:16px;background:#fee2e2;border:1px solid #ef4444;border-radius:8px;">' +
        'View "<b>' + esc(view) + '</b>" evaluated to empty content. ' +
        'Check the contents of <b>' + esc(view) + '.html</b>.' +
        '</div>';
    }

    // Wrap inside the shared shell template
    var shellTpl = HtmlService.createTemplateFromFile('shared_shell');
    shellTpl.content = pageHtml;
    return shellTpl.evaluate().setTitle('Service Tracking Hub');

  } catch (err) {
    // If the view file doesn't exist or another error occurs, show it in-page
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
  return api_searchClient(query || {});
}
function searchByFormId(formId) {
  return api_searchByFormId(formId);
}
function createClient(data) {
  return api_createOrUpdateClient(data || {});
}
function mergeClient(existing, candidate) {
  return api_mergeClientWithForm(existing || {}, candidate || {});
}