/** Service Tracking Hub — Router + API (Code.gs, DEBUG build)
 *  This version does NOT call any service-layer functions.
 *  Every API returns a clear debug object so the UI always gets a response.
 */

/** Entry */
function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) ? String(e.parameter.view) : 'hub';
  return serveView(view);
}

/** HTML shell renderer */
function serveView(view) {
  try {
    // Render requested view fragment
    var tpl  = HtmlService.createTemplateFromFile(view);
    var frag = String(tpl.evaluate().getContent() || '');
    var len  = frag.length;

    // Debug banner (remove when stable)
    var debug =
      '<div style="position:sticky;top:0;z-index:9999;' +
      'background:#fef3c7;border-bottom:1px solid #f59e0b;padding:8px 12px;' +
      'font:12px/1.4 ui-monospace,monospace;color:#92400e;">' +
      'DEBUG: view="<b>' + esc(view) + '</b>", contentLength=' + len +
      (len ? '' : ' — (empty fragment)') +
      '</div>';

    if (!len) {
      frag =
        '<div style="padding:16px;background:#fee2e2;border:1px solid #ef4444;border-radius:8px;">' +
        'View "<b>' + esc(view) + '</b>" evaluated to empty content. ' +
        'Check the contents of <b>' + esc(view) + '.html</b>.' +
        '</div>';
    }

    // Wrap inside the shared shell
    var shell = HtmlService.createTemplateFromFile('shared_shell');
    shell.content = debug + frag;
    return shell.evaluate().setTitle('Service Tracking Hub');

  } catch (err) {
    var msg =
      '<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;' +
      'background:#fef3c7;border:1px solid #f59e0b;padding:12px;border-radius:8px;">' +
      'Router error for view "' + esc(view) + '":\n' + esc(String(err)) + '</pre>';

    var shell2 = HtmlService.createTemplateFromFile('shared_shell');
    shell2.content = msg;
    return shell2.evaluate().setTitle('Service Tracking Hub');
  }
}

/** Safe escape for inline diagnostics */
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
  });
}

/** Include helper for HTML partials */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/* =========================
   API exposed to the client
   (DEBUG: returns deterministic objects)
   ========================= */

/** Simple connectivity probe */
function ping() {
  return {
    status: 'ok',
    _marker: 'ping_debug_v1',
    from: 'Code.gs',
    at: new Date().toISOString()
  };
}

/** DEBUG: do not call service; just echo input */
function searchClient(query) {
  var q = query || {};
  return {
    status: 'debug_searchClient',
    _marker: 'searchClient_debug_v1',
    received: q,
    note: 'This is a debug response from Code.gs (no service calls).',
    at: new Date().toISOString()
  };
}

/** DEBUG: do not call service; just echo input */
function searchByFormId(formId) {
  return {
    status: 'debug_searchByFormId',
    _marker: 'searchByFormId_debug_v1',
    received: formId == null ? null : String(formId),
    note: 'This is a debug response from Code.gs (no service calls).',
    at: new Date().toISOString()
  };
}

/** DEBUG: pretend we created/updated and return a fake clientId */
function createClient(data) {
  var d = data || {};
  return {
    status: 'debug_createClient',
    _marker: 'createClient_debug_v1',
    received: d,
    result: { success: true, clientId: 'C-DEBUG-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') },
    note: 'This is a debug response from Code.gs (no service calls).',
    at: new Date().toISOString()
  };
}

/** DEBUG: pretend we merged and return a shallow spread */
function mergeClient(existing, candidate) {
  var ex = existing || {};
  var ca = candidate || {};
  var merged = {};
  Object.keys(ex).forEach(function(k){ merged[k] = ex[k]; });
  Object.keys(ca).forEach(function(k){ merged[k] = ca[k]; });

  return {
    status: 'debug_mergeClient',
    _marker: 'mergeClient_debug_v1',
    merged: merged,
    note: 'This is a debug merge from Code.gs (no service calls).',
    at: new Date().toISOString()
  };
}