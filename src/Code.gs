/** Service Tracking Hub — Router + API (Code.gs) */

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

    // Debug banner (remove once stable)
    var debug =
      '<div style="position:sticky;top:0;z-index:9999;' +
      'background:#fef3c7;border-bottom:1px solid #f59e0b;padding:8px 12px;' +
      'font:12px/1.4 ui-monospace,monospace;color:#92400e;">' +
      'DEBUG: view="<b>' + esc(view) + '</b>", contentLength=' + len +
      (len ? '' : ' — (empty fragment)') +
      '</div>';

    if (!len) {
      pageHtml =
        '<div style="padding:16px;background:#fee2e2;border:1px solid #ef4444;border-radius:8px;">' +
        'View "<b>' + esc(view) + '</b>" evaluated to empty content. ' +
        'Check the contents of <b>' + esc(view) + '.html</b>.' +
        '</div>';
    }

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
   (delegates to service layer, with diagnostics)
   ========================= */

function searchClient(query) {
  console.log('>>> searchClient wrapper called with', JSON.stringify(query));
  try {
    var out = api_searchClient(query || {});
    console.log('>>> searchClient result', JSON.stringify(out));
    if (out && typeof out === 'object') out._marker = 'searchClient_wrapper_v1';
    return out;
  } catch (e) {
    console.error('>>> searchClient error', e);
    return { status: 'error', where: 'searchClient', message: String(e) };
  }
}

function searchByFormId(formId) {
  console.log('>>> searchByFormId wrapper called with', JSON.stringify(formId));
  try {
    var out = api_searchByFormId(formId);
    console.log('>>> searchByFormId result', JSON.stringify(out));
    if (out && typeof out === 'object') out._marker = 'searchByFormId_wrapper_v1';
    return out;
  } catch (e) {
    console.error('>>> searchByFormId error', e);
    return { status: 'error', where: 'searchByFormId', message: String(e) };
  }
}

function createClient(data) {
  try {
    return api_createOrUpdateClient(data || {});
  } catch (e) {
    return { status: 'error', where: 'createClient', message: String(e), stack: (e && e.stack) ? String(e.stack) : '' };
  }
}

function mergeClient(existing, candidate) {
  try {
    return api_mergeClientWithForm(existing || {}, candidate || {});
  } catch (e) {
    return { status: 'error', where: 'mergeClient', message: String(e), stack: (e && e.stack) ? String(e.stack) : '' };
  }
}