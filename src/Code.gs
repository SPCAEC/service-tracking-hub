/** Service Tracking Hub — Router + API (Code.gs) */

/** Entry */
function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) ? String(e.parameter.view) : 'hub';
  return serveView(view);
}

/** HTML shell renderer */
function serveView(view) {
  try {
    var pageTpl = HtmlService.createTemplateFromFile(view);
    var pageHtml = String(pageTpl.evaluate().getContent() || '');
    var len = pageHtml.length;

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
    shellTpl.content = debug + pageHtml;
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

/** Connectivity probe (used by UI) */
function hub_ping() {
  return {
    status: 'ok',
    _marker: 'hub_ping_v1',
    from: 'Code.gs',
    at: new Date().toISOString()
  };
}

/** LIVE: call real api_searchClient; ALWAYS return a visible object */
function hub_searchClient(query) {
  var q = query || {};
  try {
    console.log('>>> hub_searchClient input', JSON.stringify(q));
    var out = api_searchClient(q);
    console.log('>>> hub_searchClient output', JSON.stringify(out));

    return {
      note: 'OK from hub_searchClient',
      received: q,
      at: new Date().toISOString(),
      result: out, // pass service-layer result through
      _marker: 'hub_searchClient_v3',
      status: (out && out.status) ? out.status : (out == null ? 'null_result' : 'no_status')
    };

  } catch (e) {
    console.error('>>> hub_searchClient error', e);
    return {
      status: 'error',
      where: 'hub_searchClient',
      message: String(e),
      stack: (e && e.stack) ? String(e.stack) : ''
    };
  }
}

/** (Optional) wire live once search flow is confirmed */
function hub_searchByFormId(formId) {
  console.log('>>> hub_searchByFormId input', formId);
  try {
    var out = api_searchByFormId(formId);
    console.log('>>> hub_searchByFormId output', JSON.stringify(out));
    return {
      note: 'OK from hub_searchByFormId',
      received: formId,
      at: new Date().toISOString(),
      result: out,
      _marker: 'hub_searchByFormId_v3',
      status: (out && out.status) ? out.status : (out == null ? 'null_result' : 'no_status')
    };
  } catch (e) {
    console.error('>>> hub_searchByFormId error', e);
    return { status: 'error', where: 'hub_searchByFormId', message: String(e) };
  }
}

function hub_createClient(data) {
  console.log('>>> hub_createClient input', JSON.stringify(data));
  try {
    var out = api_createOrUpdateClient(data || {});
    console.log('>>> hub_createClient output', JSON.stringify(out));
    return { status: 'ok', result: out, _marker: 'hub_createClient_v3' };
  } catch (e) {
    console.error('>>> hub_createClient error', e);
    return { status: 'error', where: 'hub_createClient', message: String(e) };
  }
}

function hub_mergeClient(existing, candidate) {
  console.log('>>> hub_mergeClient input', JSON.stringify({ existing: existing, candidate: candidate }));
  try {
    var out = api_mergeClientWithForm(existing || {}, candidate || {});
    console.log('>>> hub_mergeClient output', JSON.stringify(out));
    return { status: 'ok', result: out, _marker: 'hub_mergeClient_v3' };
  } catch (e) {
    console.error('>>> hub_mergeClient error', e);
    return { status: 'error', where: 'hub_mergeClient', message: String(e) };
  }
}