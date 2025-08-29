function doGet(e) {
  const view = e && e.parameter.view ? e.parameter.view : 'hub';
  return serveView(view);
}

function serveView(view) {
  const template = HtmlService.createTemplateFromFile(view);
  return template.evaluate().setTitle('Service Tracking Hub');
}

// Helper: include HTML partials
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * --- Pantry: stub functions for now ---
 */
function searchClient(query) {
  // TODO: implement sheet lookup
  return { found: false, client: null };
}

function searchByFormId(formId) {
  // TODO: implement form-based lookup
  return { found: false, client: null };
}

function createClient(data) {
  // TODO: implement client creation
  return { success: true, clientId: 'TEMP123' };
}