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
  try {
    var out = api_searchClient(query || {});
    // Bypass HtmlService serialization quirks by stringifying ourselves.
    return {
      status: 'json_wrapped',
      _marker: 'hub_searchClient_json',
      resultJson: JSON.stringify(out)  // client parses this
    };
  } catch (e) {
    return { status: 'error', where: 'hub_searchClient', message: String(e) };
  }
}

/** Live form-id search (returns a normal object; UI handles either shape) */
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

/**
 * NEW: Provide dropdown option sets to the UI.
 * Reads Script Properties key "OPTIONS_JSON" (stringified JSON), falling back to defaults below.
 *
 * Example to override (in Apps Script editor):
 *   - Project Settings → Script properties → Add property:
 *       Name: OPTIONS_JSON
 *       Value: {"PreferredContact":["Text","Email","Phone"], "Language":["English","Spanish","Other"]}
 */
function hub_getOptions() {
  try {
    var options = readOptionsFromProps_();
    // Ensure it’s safe to serialize (plain object of arrays of strings)
    var clean = sanitizeOptions_(options);
    return clean;
  } catch (e) {
    console.error('>>> hub_getOptions error', e);
    // Never fail the UI; return defaults instead
    return getDefaultOptions_();
  }
}

/* =========================
   Options helpers (Script Properties + defaults)
   ========================= */

function readOptionsFromProps_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props && props.getProperty('OPTIONS_JSON');
  if (!raw) return getDefaultOptions_(); // no overrides set

  try {
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return getDefaultOptions_();
    return parsed;
  } catch (e) {
    console.error('Invalid OPTIONS_JSON in Script Properties:', e);
    return getDefaultOptions_();
  }
}

function sanitizeOptions_(o) {
  var clean = {};
  var defaults = getDefaultOptions_();

  // Only allow fields present in defaults to avoid huge/unsafe payloads.
  Object.keys(defaults).forEach(function (key) {
    var val = o && o[key];
    if (Array.isArray(val)) {
      // cast everything to strings
      clean[key] = val.map(function (x) { return String(x); });
    } else {
      clean[key] = defaults[key].slice();
    }
  });
  return clean;
}

function getDefaultOptions_() {
  return {
    PreferredContact: ['Text', 'Email'],
    'How did you hear about us?': [
      'Search engine','Website','Social Media','Flier','E-mail','Radio','TV','Newspaper',
      'Word of mouth','Walk-up','SPCA Staff','Other'
    ],
    Language: [
      'English','Spanish','Arabic','Chinese','French','German','Korean','Portuguese','Russian',
      'Vietnamese','Prefer not to answer','Other'
    ],
    'Military Status': ['Yes','No','Prefer not to answer'],
    Employment: ['Part-time','Full-time','Self-employed','Student','Retired','Unemployed','Prefer not to answer'],
    'Ethnic Background': [
      'White (Eg: German, Irish, English, Italian, Polish, French, etc)',
      'Hispanic, Latino or Spanish origin (Eg: Mexican..., Puerto Rican, etc)',
      'Black or African American (Eg: African American, Jamaican, Haitian, etc)',
      'Asian (Eg: Chinese, Filipino, Asian Indian, Vietnamese, Korean, Japanese, etc)',
      'American Indian or Alaska Native (...Navajo, Blackfeet, Mayan, Aztec, etc)',
      'Middle Eastern or North African (Eg: Lebanese, Iranian, Egyptian, etc)',
      'Native Hawaiian or Other Pacific Islander (Eg: Hawaiian, Samoan, etc)',
      'Some other race, ethnicity or origin',
      'Prefer not to answer'
    ],
    Transportation: [
      'Private vehicle (own/lease your own, friend or family member, etc)',
      'Public Transit','Bicycle','Walk','Prefer not to answer','Other'
    ],
    'Gender Identity': [
      'Male','Female','Transgender Male','Transgender Female',
      'Gender Variant/Non-Conforming','Non-binary','Not listed','Prefer not to answer'
    ],
    'Public Services': ['Yes','No','Prefer not to answer'],
    Income: ['$0-$30,000','$31,000-$60,000','$61,000-$90,000','$91,000-$120,000','$120,000 +','Prefer not to answer'],
    'Income Contribution': ['1','2','3','4','5+','Prefer not to answer'],
    'Household Size': ['1','2','3','4','5','6','7+','Prefer not to answer'],
    'Housing Status': [
      'I have stable, secure housing with my pet.',
      'My housing is in transition.',
      'I am currently unhoused with my pet.',
      'Prefer not to answer','Other'
    ]
  };
}