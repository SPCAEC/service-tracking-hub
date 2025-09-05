/** Service Tracking Hub — Router + API (Code.gs, PARTIAL live)
 *  searchClient → calls real api_searchClient (with diagnostics)
 *  searchByFormId / createClient / mergeClient → debug stubs for now
 */

/** Entry */
function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) ? String(e.parameter.view) : 'hub';
  return serveView(view);
}

/** HTML shell renderer */
function serveView(view) {
  try {
    var tpl  = HtmlService.createTemplateFromFile(view);
    var frag = String(tpl.evaluate().getContent() || '');
    var len  = frag.length;

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
   ========================= */

/** Connectivity probe */
function ping() {
  return {
    status: 'ok',
    _marker: 'ping_v2',
    from: 'Code.gs',
    at: new Date().toISOString()
  };
}

/** LIVE: call real api_searchClient (with strong diagnostics) */
function searchClient(query) {
  var q = query || {};
  try {
    console.log('>>> searchClient called with', JSON.stringify(q));
    var out = api_searchClient(q);

    // Normalize result into an object
    var res = (out && typeof out === 'object') ? out : { status: 'empty', raw: out };
    res._marker = 'searchClient_live_v2';
    res._diag   = { received: q, at: new Date().toISOString() };

    console.log('>>> searchClient returning', JSON.stringify(res));
    return res;

  } catch (e) {
    console.error('>>> searchClient error', e);
    return {
      status: 'error',
      where: 'searchClient',
      message: String(e),
      stack: (e && e.stack) ? String(e.stack) : '',
      _marker: 'searchClient_live_v2_err',
      _diag: { received: q, at: new Date().toISOString() }
    };
  }
}

/** DEBUG: echo only (we’ll switch to live after searchClient is solid) */
function searchByFormId(formId) {
  return {
    status: 'debug_searchByFormId',
    _marker: 'searchByFormId_debug_v2',
    received: formId == null ? null : String(formId),
    note: 'Debug stub — service not called yet.',
    at: new Date().toISOString()
  };
}

/** DEBUG: pretend to create and return a fake id */
function createClient(data) {
  var d = data || {};
  return {
    status: 'debug_createClient',
    _marker: 'createClient_debug_v2',
    received: d,
    result: { success: true, clientId: 'C-DEBUG-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') },
    note: 'Debug stub — service not called yet.',
    at: new Date().toISOString()
  };
}

/** DEBUG: pretend to merge by shallow spread */
function mergeClient(existing, candidate) {
  var ex = existing || {};
  var ca = candidate || {};
  var merged = {};
  Object.keys(ex).forEach(function(k){ merged[k] = ex[k]; });
  Object.keys(ca).forEach(function(k){ merged[k] = ca[k]; });

  return {
    status: 'debug_mergeClient',
    _marker: 'mergeClient_debug_v2',
    merged: merged,
    note: 'Debug stub — service not called yet.',
    at: new Date().toISOString()
  };
}