/******************************
 * DATA HYGIENE POLISH (re-runnable)
 ******************************/

// Use the existing project-wide ZONE if present; otherwise default:
const HYGIENE_TZ = (typeof ZONE !== 'undefined' && ZONE) ? ZONE : 'America/New_York';

// Unified way to get your workbook (works for standalone projects)
function getSS_(){
  try {
    if (typeof getSpreadsheet_ === 'function') return getSpreadsheet_(); // from code.gs
    const p = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (p) return SpreadsheetApp.openById(p);
  } catch(e){}
  return SpreadsheetApp.getActive(); // last resort (may be null in standalone)
}

function runDataHygienePolish(){
  const ss = getSS_();
  if (!ss) throw new Error('Could not open spreadsheet. Ensure SPREADSHEET_ID is set in Script Properties.');
  ss.setSpreadsheetTimeZone(HYGIENE_TZ);

  const SHEETS = [
    'Clients','Pets','Cases','Interactions','Appointments',
    'MedicalServices','Vaccinations','Supplies_Orders','Supplies_Lines',
    'Expenses','Invoices','Grants','Allocations','ExternalIDs',
    'PantryRequests_Staging','MergeQueue','_sys_Lookups'
  ];
  SHEETS.forEach(name => { const sh = ss.getSheetByName(name); if (sh) sh.setFrozenRows(1); });

  polishClients_();
  polishPets_();
  polishCases_();
  polishInteractions_();
  polishAppointments_();
  polishMedical_();
  polishVaccinations_();
  polishSupplies_();
  polishExpenses_();
  polishInvoices_();
}

//////////////////// Helpers ////////////////////
function getHeaderMap_(sh){
  const lastCol = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1,1,1,lastCol).getValues()[0].map(String);
  const map = {};
  headers.forEach((h,i)=>{ if (h) map[h] = i+1; });
  return map;
}
function colLetter_(i){ let s='',n=i; while(n>0){let m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-m)/26);} return s; }
function rngCol_(sh, col, startRow=2){ return sh.getRange(startRow, col, Math.max(0, sh.getMaxRows()-startRow+1), 1); }
function protectColumnWarning_(sh, col, note){
  if (!col) return;
  const r = rngCol_(sh, col);
  const p = r.protect();
  p.setDescription(note || ('Protected: '+sh.getName()+' col '+col));
  p.setWarningOnly(true);
}
function setCheckbox_(sh, col){ if (!col) return;
  const rule = SpreadsheetApp.newDataValidation().requireCheckbox().setAllowInvalid(true).build();
  rngCol_(sh, col).setDataValidation(rule);
}
function setList_(sh, col, items){ if (!col) return;
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(items, true).setAllowInvalid(true).build();
  rngCol_(sh, col).setDataValidation(rule);
}
function setDateFormat_(sh, col, pattern){ if (!col) return; rngCol_(sh,col).setNumberFormat(pattern||'yyyy-mm-dd hh:mm'); }
function setDateOnlyFormat_(sh, col){ setDateFormat_(sh, col, 'yyyy-mm-dd'); }
function setCurrencyFormat_(sh, col){ if (!col) return; rngCol_(sh,col).setNumberFormat('$#,##0.00'); }
function addRules_(sh, rules){ const cur = sh.getConditionalFormatRules() || []; sh.setConditionalFormatRules(cur.concat(rules)); }

//////////////////// Sheet-specific ////////////////////
function polishClients_(){
  const sh = getSS_().getSheetByName('Clients'); if (!sh) return;
  const H = getHeaderMap_(sh);

  protectColumnWarning_(sh, H['ClientID'], 'Do not edit ClientID');
  setCheckbox_(sh, H['ConsentEmail']);
  setCheckbox_(sh, H['ConsentSMS']);
  if (H['Returning Client']) setCheckbox_(sh, H['Returning Client']);
  if (H['PreferredContact']) setList_(sh, H['PreferredContact'], ['Email','SMS','Phone']);

  ['ConsentTimestamp','FirstSeenAt','LastSeenAt','CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
  if (H['ZIP']) rngCol_(sh, H['ZIP']).setNumberFormat('@'); // keep leading zeros

  // Conditional formatting: missing criticals (First/Last/ZIP and (Phone or Email))
  const need = ['FirstName','LastName','ZIP','Phone','Email'].every(k => !!H[k]);
  if (need){
    const A = colLetter_(H['FirstName']);
    const B = colLetter_(H['LastName']);
    const Z = colLetter_(H['ZIP']);
    const P = colLetter_(H['Phone']);
    const E = colLetter_(H['Email']);
    const rangeAll = sh.getRange(2,1,Math.max(0,sh.getMaxRows()-1), sh.getLastColumn());
    const ruleMissing = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(ROW()>1, OR($${A}2="", $${B}2="", $${Z}2="", AND($${P}2="", $${E}2="")))`)
      .setBackground('#fde2e1')
      .setRanges([rangeAll])
      .build();
    addRules_(sh, [ruleMissing]);
  }

  // Conditional formatting: duplicate UniqueKey
  if (H['UniqueKey']){
    const U = colLetter_(H['UniqueKey']);
    const rangeAll = sh.getRange(2,1,Math.max(0,sh.getMaxRows()-1), sh.getLastColumn());
    const ruleDup = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(ROW()>1,$${U}2<>"",COUNTIF($${U}:$${U},$${U}2)>1)`)
      .setBackground('#fff4cc')
      .setRanges([rangeAll])
      .build();
    addRules_(sh, [ruleDup]);
  }
}

function polishPets_(){
  const sh = getSS_().getSheetByName('Pets'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['PetID'], 'Do not edit PetID');
  ['CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));

  if (H['ClientID']){
    const rangeAll = sh.getRange(2,1,Math.max(0,sh.getMaxRows()-1), sh.getLastColumn());
    const C = colLetter_(H['ClientID']);
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND(ROW()>1,$${C}2="")`).setBackground('#fde2e1').setRanges([rangeAll]).build();
    addRules_(sh, [rule]);
  }
}

function polishCases_(){
  const sh = getSS_().getSheetByName('Cases'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['CaseID'], 'Do not edit CaseID');
  ['OpenedAt','ClosedAt','CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
  if (H['Status']) setList_(sh, H['Status'], ['Open','Monitoring','Closed']);
  if (H['OwnerTeam']) setList_(sh, H['OwnerTeam'], ['Outreach','Investigations']);
  if (H['CaseType']) setList_(sh, H['CaseType'], ['Hoarding','Supportive Service','Referral','Other']);
}

function polishInteractions_(){
  const sh = getSS_().getSheetByName('Interactions'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['InteractionID'], 'Do not edit InteractionID');
  if (H['Channel']) setList_(sh, H['Channel'], ['Call','SMS','Email','In-Person','Home Visit','Other']);
  ['OccurredAt','CreatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
}

function polishAppointments_(){
  const sh = getSS_().getSheetByName('Appointments'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['AppointmentID'], 'Do not edit AppointmentID');
  if (H['Purpose']) setList_(sh, H['Purpose'], ['Spay/Neuter','Vaccinations','Exam','Home Visit','Supply Dropoff','Other']);
  if (H['LocationType']) setList_(sh, H['LocationType'], ['Clinic','Home','Phone','Other']);
  if (H['Status']) setList_(sh, H['Status'], ['Requested','Scheduled','Completed','No-Show','Canceled']);
  ['RequestedAt','ScheduledFor','CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
}

function polishMedical_(){
  const sh = getSS_().getSheetByName('MedicalServices'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['ServiceID'], 'Do not edit ServiceID');
  if (H['Status']) setList_(sh, H['Status'], ['Planned','Completed','Billed']);
  if (H['ServiceDate']) setDateOnlyFormat_(sh, H['ServiceDate']);
  ['CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
}

function polishVaccinations_(){
  const sh = getSS_().getSheetByName('Vaccinations'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['VaccinationID'], 'Do not edit VaccinationID');
  if (H['VaccineType']) setList_(sh, H['VaccineType'], ['Rabies','FVRCP','FeLV','DHPP','Lepto','Bordetella','Other']);
  ['VaccinationDate','ExpiryDate','CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
}

function polishSupplies_(){
  const shH = getSS_().getSheetByName('Supplies_Orders');
  if (shH){
    const H = getHeaderMap_(shH);
    protectColumnWarning_(shH, H['OrderID'], 'Do not edit OrderID');
    if (H['Program']) setList_(shH, H['Program'], ['PFL','PSCI','Outreach Pantry']);
    if (H['DeliveryType']) setList_(shH, H['DeliveryType'], ['Pickup','Delivery','Other']);
    if (H['OrderStatus']) setList_(shH, H['OrderStatus'], ['New','Packed','Delivered','Canceled']);
    ['ServiceDate','CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(shH, H[h]));
  }
  const shL = getSS_().getSheetByName('Supplies_Lines');
  if (shL){
    const L = getHeaderMap_(shL);
    protectColumnWarning_(shL, L['LineID'], 'Do not edit LineID');
    if (L['Qty']) rngCol_(shL, L['Qty']).setNumberFormat('0.##');
    if (L['CreatedAt']) setDateFormat_(shL, L['CreatedAt']);
  }
}

function polishExpenses_(){
  const sh = getSS_().getSheetByName('Expenses'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['ExpenseID'], 'Do not edit ExpenseID');
  if (H['Category']) setList_(sh, H['Category'], ['Fans','Screens','Materials','Transport','Other']);
  if (H['ExpenseDate']) setDateOnlyFormat_(sh, H['ExpenseDate']);
  if (H['Amount']) setCurrencyFormat_(sh, H['Amount']);
  if (H['CreatedAt']) setDateFormat_(sh, H['CreatedAt']);
}

function polishInvoices_(){
  const sh = getSS_().getSheetByName('Invoices'); if (!sh) return;
  const H = getHeaderMap_(sh);
  protectColumnWarning_(sh, H['InvoiceID'], 'Do not edit InvoiceID');
  if (H['ServiceDate']) setDateOnlyFormat_(sh, H['ServiceDate']);
  if (H['Amount']) setCurrencyFormat_(sh, H['Amount']);
  if (H['Status']) setList_(sh, H['Status'], ['Pending','Received','Paid']);
  ['CreatedAt','UpdatedAt'].forEach(h => H[h] && setDateFormat_(sh, H[h]));
}
