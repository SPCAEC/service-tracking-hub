/** Lookups in Pantry Responses sheet (by FormID) */
function forms_getByFormId(formId){
  if(!formId) return null;
  const sh = ssOpen(CFG.PANTRY_RESPONSES_SHEET_ID).getSheets()[0]; // assume 1st tab is responses
  const {headers, rows} = readTable(sh);
  const H = headerIndexMap(headers);
  if(!H['FormID']) throw new Error('FormID column not found in Pantry Responses sheet');

  for(const r of rows){
    if(String(r[H['FormID']]).trim() === String(formId).trim()){
      const obj = rowToObj(headers, r);
      // NOTE: We’ll need a mapping from Pantry columns → HUB Clients columns later.
      return obj;
    }
  }
  return null;
}