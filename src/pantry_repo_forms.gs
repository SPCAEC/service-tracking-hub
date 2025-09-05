function forms_getByFormId(formId){
  if(!formId) return null;

  const ss = ssOpen(CFG.PANTRY_RESPONSES_SHEET_ID);
  const sh = ss.getSheetByName(CFG.PANTRY_RESPONSES_TAB) || ss.getSheets()[0];

  const {headers, rows} = readTable(sh);
  const H = headerIndexMap(headers);

  // IMPORTANT: check for null/undefined, not falsy (index 0 is valid)
  if (H['FormID'] == null) {
    throw new Error('FormID column not found in Pantry Responses sheet');
  }

  for (const r of rows) {
    if (String(r[H['FormID']]).trim() === String(formId).trim()){
      return rowToObj(headers, r); // raw row; mapping happens in service
    }
  }
  return null;
}
/**
 * Map a Pantry Responses row (Form Responses 1) to a HUB Clients object.
 * Nathan provided explicit mapping of columns.
 */
function mapFormRowToHubClient(formRow){
  const client = {};

  // Direct mappings + normalize
  client.Email = formRow['Email Address'] || '';
  client.EmailNormalized = normEmail(client.Email);

  client.FirstName = formRow['First Name'] || '';
  client.LastName  = formRow['Last Name'] || '';

  client.Address1 = formRow['Address Line 1'] || '';
  client.Address2 = formRow['Address Line 2'] || '';
  client.City     = formRow['Town/City'] || '';
  client.State    = formRow['State'] || '';
  client.ZIP      = formRow['Zip Code'] || '';

  client.Phone = formRow['Phone Number'] || '';
  client.PhoneNormalized = normPhone(client.Phone);

  // Preferred Contact + Consent
  const pcm = formRow['Preferred Contact Method'] || '';
  if (/text/i.test(pcm)) {
    client.PreferredContact = 'Text';
    client.ConsentSMS = true;
  } else if (/email/i.test(pcm)) {
    client.PreferredContact = 'Email';
    client.ConsentEmail = true;
  } else {
    client.PreferredContact = '';
  }

  // Returning Client
  client['Returning Client'] = (/yes/i.test(formRow['Returning Client'] || '')) ? true : false;

  // First seen tracking
  client.FirstSeenAt = formRow['Timestamp'] || '';
  client.FirstSeenSource = 'Online Pantry Form';

  // 1-to-1 passthroughs
  [
    'How did you hear about us?','Language','Military Status','Employment','Ethnic Background',
    'Transportation','Gender Identity','Public Services','Income','Income Contribution',
    'Household Size','Housing Status'
  ].forEach(k => { client[k] = formRow[k] || ''; });

  return client;
}