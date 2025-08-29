function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Service Tracking Hub');
}

function ping() {
  return 'ok';
}
