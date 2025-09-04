/** Cached open & helpers */
const _cacheSs = {};
function ssOpen(id){ if(!_cacheSs[id]) _cacheSs[id]=SpreadsheetApp.openById(id); return _cacheSs[id]; }

function shGet(id, name){
  const ss = ssOpen(id);
  const sh = ss.getSheetByName(name);
  if(!sh) throw new Error(`Sheet "${name}" not found in ${id}`);
  return sh;
}

function readTable(sh){
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if(lastRow < 2) return { headers: [], rows: [] };
  const values = sh.getRange(1,1,lastRow,lastCol).getValues();
  const headers = values[0].map(String);
  const rows = values.slice(1);
  return {headers, rows};
}

function headerIndexMap(headers){
  const map = {};
  headers.forEach((h,i)=> map[String(h).trim()] = i);
  return map;
}

function rowToObj(headers,row){
  const o={};
  headers.forEach((h,i)=>o[String(h).trim()]=row[i]);
  return o;
}