/** ---------- Web app entry points (frontend/backend layout) ---------- **/

/**
 * Entry: load frontend/index.html (since we organized files under /frontend)
 */
function doGet(e) {
  const t = HtmlService.createTemplateFromFile('frontend/index'); // <- key change
  t.buildVersion = new Date().toISOString(); // optional cache-buster
  return t.evaluate()
    .setTitle('Service Tracking Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Smart include for HTML partials used inside index.html like:
 *   <?!= include('home'); ?>
 * We’ll try these names in order:
 *   1) the name as given (e.g., 'home')
 *   2) 'frontend/' + name (e.g., 'frontend/home')
 *   3) name with .html appended (e.g., 'home.html')  [Apps Script ignores ext in createHtmlOutputFromFile, but kept here for resiliency]
 */
function include(name) {
  var candidates = [
    String(name || ''),
    'frontend/' + String(name || ''),
    String(name || '') + '.html',
    'frontend/' + String(name || '') + '.html'
  ];

  for (var i = 0; i < candidates.length; i++) {
    var id = candidates[i];
    try {
      // Will throw if no file by that name exists
      return HtmlService.createHtmlOutputFromFile(id).getContent();
    } catch (err) {
      // keep trying next candidate
    }
  }
  // Last resort: visible marker to help debugging in UI
  return '<!-- include: "' + name + '" not found in [' + candidates.join(', ') + '] -->';
}

/** (Optional) JSON response helper for doPost-style APIs if you add them later */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}