function doGet(e) {
  const t = HtmlService.createTemplateFromFile('index'); // root HTML (templated)
  t.buildVersion = new Date().toISOString();            // optional version stamp
  return t.evaluate()
    .setTitle('Service Tracking Hub')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Allows <?!= include('partial'); ?> in HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  let body = {};
  try { body = e?.postData?.contents ? JSON.parse(e.postData.contents) : {}; }
  catch { return json_({ ok:false, error:'Invalid JSON body' }, 400); }

  const action = String(body.action || '').trim();

  if (action === 'searchClient') {
    const phoneN = String(body.PhoneNormalized || body.phoneRaw || '').replace(/\D/g,'');
    const emailN = String(body.EmailNormalized || body.emailRaw || '').trim().toLowerCase();
    return json_(apiSearchClient({ PhoneNormalized: phoneN, EmailNormalized: emailN }));
  }

  if (action === 'saveClient') {
    return json_(apiSaveClient(body));
  }

  if (action === 'savePets') {
  return json_(apiSavePets(body));
}

  Logger.log('Unknown action in doPost: %s  body=%s', action, JSON.stringify(body));
  return json_({ ok:false, error:`Unknown action "${action}"` }, 400);
}
