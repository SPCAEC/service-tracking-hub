function doGet(e) {
  const view = e && e.parameter.view ? e.parameter.view : 'hub';
  return serveView(view);
}

function serveView(view){
  const page = HtmlService.createTemplateFromFile(view);
  const content = page.evaluate().getContent();
  const shell = HtmlService.createTemplateFromFile('shared_shell');
  shell.content = content;
  return shell.evaluate().setTitle('Service Tracking Hub');
}
function include(name){ return HtmlService.createHtmlOutputFromFile(name).getContent(); }

// API (exposed to UI)
function searchClient(query){ return api_searchClient(query||{}); }
function searchByFormId(formId){ return api_searchByFormId(formId); }
function createClient(data){ return clients_upsert(data||{}); } // simple for now

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