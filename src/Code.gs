/** Service Tracking Hub — Router + API (Code.gs, HUB-names) 
 *  Exports uniquely named API functions to avoid collisions:
 *    hub_ping, hub_searchClient, hub_searchByFormId, hub_createClient, hub_mergeClient
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
   HUB-exported API (unique names)
   ========================= */

/** Connectivity probe */
function hub_ping() {
  return {
    status: 'ok',
    _marker: 'hub_ping_v1',
    from: 'Code.gs',
    at: new Date().toISOString()
  };
}

/** LIVE: call real api_searchClient (wrapped + never-null) */
function hub_searchClient(query) {
  var q = query || {};
  try {
    console.log('>>> hub_searchClient called with', JSON.stringify(q));
    var out = api_searchClient(q);

    // normalize result into an object
    var res = (out && typeof out === 'object') ? out : { status: 'empty', raw: out };
    res._marker = 'hub_searchClient_v1';
    res._diag   = { received: q, at: new Date().toISOString() };

    console.log('>>> hub_searchClient returning', JSON.stringify(res));
    return res;

  } catch (e) {
    console.error('>>> hub_searchClient error', e);
    return {
      status: 'error',
      where: 'hub_searchClient',
      message: String(e),
      stack: (e && e.stack) ? String(e.stack) : '',
      _marker: 'hub_searchClient_err_v1',
      _diag: { received: q, at: new Date().toISOString() }
    };
  }
}

/** DEBUG for now — we’ll wire live after search flow is solid */
function hub_searchByFormId(formId) {
  return {
    status: 'debug_searchByFormId',
    _marker: 'hub_searchByFormId_v1',
    received: formId == null ? null : String(formId),
    note: 'Debug stub — service not called yet.',
    at: new Date().toISOString()
  };
}

/** DEBUG for now — pretend to create and return a fake id */
function hub_createClient(data) {
  var d = data || {};
  return {
    status: 'debug_createClient',
    _marker: 'hub_createClient_v1',
    received: d,
    result: { success: true, clientId: 'C-DEBUG-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss') },
    note: 'Debug stub — service not called yet.',
    at: new Date().toISOString()
  };
}

/** DEBUG for now — shallow merge */
function hub_mergeClient(existing, candidate) {
  var ex = existing || {};
  var ca = candidate || {};
  var merged = {};
  Object.keys(ex).forEach(function(k){ merged[k] = ex[k]; });
  Object.keys(ca).forEach(function(k){ merged[k] = ca[k]; });

  return {
    status: 'debug_mergeClient',
    _marker: 'hub_mergeClient_v1',
    merged: merged,
    note: 'Debug stub — service not called yet.',
    at: new Date().toISOString()
  };
}