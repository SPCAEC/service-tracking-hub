/** ---------- Web app entry points (frontend/backend layout) ---------- **/

function doGet(e) {
  const t = HtmlService.createTemplateFromFile('frontend/index');

  // Feature flags + routing hints (can later come from config.gs)
  t.buildVersion = new Date().toISOString();
  t.appMode = 'pantryOnly';                    // 'pantryOnly' | 'multi'
  t.enabledTiles = ['pantry'];                 // future: ['pantry','medical','expenses']
  t.view = (e && e.parameter && e.parameter.view) || 'shell'; // optional client-side router hint

  return t.evaluate()
    .setTitle('Service Tracking Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) {
  var candidates = [
    String(name || ''),
    'frontend/' + String(name || ''),
    String(name || '') + '.html',
    'frontend/' + String(name || '') + '.html'
  ];
  for (var i = 0; i < candidates.length; i++) {
    try { return HtmlService.createHtmlOutputFromFile(candidates[i]).getContent(); }
    catch (err) {}
  }
  return '<!-- include: "' + name + '" not found -->';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}