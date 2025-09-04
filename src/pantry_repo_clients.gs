/** CRUD & lookups for HUB Clients sheet */
function clients_readAll(){
  const sh = shGet(CFG.HUB_SHEET_ID, CFG.HUB_SHEET_CLIENTS_TAB);
  const {headers, rows} = readTable(sh);
  const data = rows.map(r => rowToObj(headers, r));
  return {headers, data};
}

function clients_findExact(query){
  // query: {clientId?, phone?, email?} already normalized for phone/email
  const {headers, data} = clients_readAll();
  const H = headerIndexMap(headers);

  const hit = data.find(r => (
    (query.clientId && String(r['ClientID']).trim() === String(query.clientId).trim()) ||
    (query.phone && normPhone(r['PhoneNormalized']) === normPhone(query.phone)) ||
    (query.email && normEmail(r['EmailNormalized']) === normEmail(query.email))
  ));
  return hit || null;
}

function clients_upsert(obj){
  const sh = shGet(CFG.HUB_SHEET_ID, CFG.HUB_SHEET_CLIENTS_TAB);
  const {headers, rows} = readTable(sh);
  const H = headerIndexMap(headers);

  // If ClientID present & exists, update; else append
  const id = normTrim(obj['ClientID']);
  let rowIndex = -1;
  if(id){
    for(let i=0;i<rows.length;i++){
      if(normTrim(rows[i][H['ClientID']]) === id){ rowIndex = i+2; break; }
    }
  }
  // build row
  const row = headers.map(h => obj[h] ?? '');
  if(rowIndex>0){
    sh.getRange(rowIndex,1,1,headers.length).setValues([row]);
    return {updated:true, clientId:id||obj['ClientID']};
  }else{
    sh.appendRow(row);
    const last = sh.getLastRow();
    const newId = id || sh.getRange(last, H['ClientID']+1).getValue();
    return {created:true, clientId:newId};
  }
}