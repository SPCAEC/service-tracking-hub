/** CRUD & lookups for HUB Clients sheet */

function clients_readAll(){
  const sh = shGet(CFG.HUB_SHEET_ID, CFG.HUB_SHEET_CLIENTS_TAB);
  const {headers, rows} = readTable(sh);
  const data = rows.map(r => rowToObj(headers, r));
  return {headers, data};
}

function clients_findExact(query){
  // query: {clientId?, phone?, email?} — phone/email should already be normalized by caller
  const {headers, data} = clients_readAll();
  const H = headerIndexMap(headers);

  // Guard: if these headers are missing, we can’t match safely
  if (H['ClientID'] == null && H['PhoneNormalized'] == null && H['EmailNormalized'] == null) {
    return null;
  }

  const hit = data.find(r => (
    (query.clientId && String(r['ClientID'] || '').trim() === String(query.clientId).trim()) ||
    (query.phone    && normPhone(r['PhoneNormalized'] || '') === normPhone(query.phone)) ||
    (query.email    && normEmail(r['EmailNormalized'] || '') === normEmail(query.email))
  ));
  return hit || null;
}

function clients_upsert(obj){
  const sh = shGet(CFG.HUB_SHEET_ID, CFG.HUB_SHEET_CLIENTS_TAB);
  const {headers, rows} = readTable(sh);
  const H = headerIndexMap(headers);

  if (H['ClientID'] == null) {
    throw new Error('Clients sheet is missing "ClientID" column.');
  }

  // Ensure normalized fields if raw present
  if (obj.Email && !obj.EmailNormalized) obj.EmailNormalized = normEmail(obj.Email);
  if (obj.Phone && !obj.PhoneNormalized) obj.PhoneNormalized = normPhone(obj.Phone);

  // If ClientID present & exists, update; else assign and append
  const id = normTrim(obj['ClientID']);
  let rowIndex = -1; // 1-based row index in sheet
  if (id) {
    for (let i = 0; i < rows.length; i++){
      const currentId = String(rows[i][H['ClientID']] || '').trim();
      if (currentId === id) { rowIndex = i + 2; break; } // +2 to account for header row
    }
  }

  if (rowIndex > 0) {
    // Update existing
    const row = headers.map(h => obj[h] ?? '');
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
    return { updated: true, clientId: id || obj['ClientID'] || '' };
  } else {
    // Create new (assign ID if missing)
    const assignedId = id || nextClientId(sh, H);
    const rowWithId = headers.map(h => (h === 'ClientID' ? assignedId : (obj[h] ?? '')));
    sh.appendRow(rowWithId);
    return { created: true, clientId: assignedId };
  }
}

// Simple ID generator: C-000001, C-000002, ...
function nextClientId(sh, H){
  const col = H['ClientID'] + 1; // 1-based column index
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 'C-000001';

  const vals = sh.getRange(2, col, lastRow - 1, 1).getValues().flat();
  let max = 0;
  for (const v of vals) {
    const m = String(v || '').match(/^C-(\d{6})$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
  }
  return 'C-' + String(max + 1).padStart(6, '0');
}