/** ===================== Supplies API (Orders + Lines) ===================== **
 * Depends on:
 *  - CFG (config.gs): ORDERS_SHEET_NAME, LINES_SHEET_NAME, ORDER_ID_START, SHEET_ID
 *  - COL (config.gs): Clients headers (to read ClientID, ZIP)
 *  - getClientsSheet_, clientsGetHeaderMap_ (from clients_api.gs)
 *  - safeReturn_(obj) (global)
 */

/** ---------- Constants ---------- */
var FLEA_TICK_BRANDS_PROP = 'FLEA_TICK_BRANDS';

/** ---------- sheet helpers ---------- */
function getOrdersSheet_() {
  if (!CFG.SHEET_ID || CFG.SHEET_ID === 'PUT_YOUR_SHEET_ID_HERE') {
    throw new Error('TRACKING_SHEET_ID not set in Script Properties.');
  }
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  return ss.getSheetByName(CFG.ORDERS_SHEET_NAME) || ss.insertSheet(CFG.ORDERS_SHEET_NAME);
}
function getLinesSheet_() {
  if (!CFG.SHEET_ID || CFG.SHEET_ID === 'PUT_YOUR_SHEET_ID_HERE') {
    throw new Error('TRACKING_SHEET_ID not set in Script Properties.');
  }
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  return ss.getSheetByName(CFG.LINES_SHEET_NAME) || ss.insertSheet(CFG.LINES_SHEET_NAME);
}

function sheetGetHeaderMap_(sh) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const raw = sh.getRange(1,1,1,lastCol).getValues();
  const headers = (raw && raw[0] ? raw[0] : ['']).map(h => String(h == null ? '' : h).trim());
  const map = {};
  headers.forEach((h,i)=>{ if (h) map[h]=i; });
  return { headers, map };
}
function sheetEnsureColumns_(sh, required) {
  let { headers } = sheetGetHeaderMap_(sh);
  let changed = false;
  const has = (n) => headers.some(h => h.toLowerCase() === String(n).trim().toLowerCase());
  if (!headers || headers.length === 0) { headers=[]; changed=true; }
  required.forEach(c => { if (!has(c)) { headers.push(String(c).trim()); changed=true; }});
  if (changed) sh.getRange(1,1,1,headers.length).setValues([headers]);
  return sheetGetHeaderMap_(sh);
}

/** ---------- Helpers ---------- */
function num(n){ n = Number(n); return isNaN(n) ? 0 : n; }

/** ---------- OrderID generator: 12 digits, start at CFG.ORDER_ID_START ---------- */
function suppliesNextOrderId_(ordersSh, ordersMap) {
  const start = String(CFG.ORDER_ID_START || '200000000000');
  const col = (ordersMap['OrderID'] != null) ? ordersMap['OrderID'] : null;
  if (col == null) return start;
  const lastRow = ordersSh.getLastRow();
  let maxId = start;
  if (lastRow >= 2) {
    const vals = ordersSh.getRange(2, col+1, lastRow-1, 1).getValues();
    vals.forEach(r => {
      const v = String(r[0] || '');
      if (/^\d{12}$/.test(v) && v > maxId) maxId = v;
    });
  }
  // +1 (safe for 12-digit numeric strings)
  const next = String(Number(maxId) + 1).padStart(12, '0');
  return next;
}

/** ---------- Program by ZIP (from Clients row) ---------- */
function programFromZip_(zip) {
  const z = String(zip || '').trim();
  if (z.startsWith('14211') || z.startsWith('14215')) return 'PFL';
  if (z.startsWith('14208')) return 'PSCI';
  return 'Outreach Pantry';
}

/** ---------- Public: brand list from Script Property ---------- */
function apiGetFleaTickBrands() {
  const raw = PropertiesService.getScriptProperties().getProperty(FLEA_TICK_BRANDS_PROP) || '';
  const brands = raw.split(',').map(s => s.trim()).filter(Boolean);
  return safeReturn_({ ok:true, brands });
}

/** ---------- Save an order + its line items ---------- */
/**
 * @param {Object} body
 *   {
 *     ClientRowId: "2", ServiceDate: "2025-08-25" (or "25/08/2025"),
 *     DeliveryType: "Pickup"|"Delivery"|... (optional; will default later),
 *     Notes: "...", // optional
 *     Items: { ... }  // quantites; see mapping below
 *     FleaTick: { Qty:number, Species:"Dog"|"Cat", Brand:"...", Size:"Small-Medium"|... }
 *   }
 * @return {Object} { ok:true, orderId:"200000000001", lineCount:n, program, clientId }
 */
function apiSaveSuppliesOrder(body) {
  Logger.log('⚡ apiSaveSuppliesOrder body=%s', JSON.stringify(body));
  const clientRowId = String(body && body.ClientRowId || '').trim();
  if (!clientRowId) return safeReturn_({ ok:false, error:'ClientRowId required' });

  // Resolve ClientID + ZIP from Clients sheet
  let clientId = '', zip = '';
  try {
    const csh = getClientsSheet_();
    const { headers: ch, map: cm } = clientsGetHeaderMap_(csh);
    const r = Number(clientRowId);
    if (r >= 2) {
      const row = csh.getRange(r, 1, 1, ch.length).getValues()[0];
      const ciClient = (cm[COL.ClientID] != null) ? cm[COL.ClientID] :
        ch.findIndex(h => String(h).trim().toLowerCase() === String(COL.ClientID).trim().toLowerCase());
      const ciZip    = (cm[COL.ZIP] != null) ? cm[COL.ZIP] :
        ch.findIndex(h => String(h).trim().toLowerCase() === String(COL.ZIP).trim().toLowerCase());
      if (ciClient >= 0) clientId = String(row[ciClient] || '');
      if (ciZip >= 0)    zip = String(row[ciZip] || '');
    }
  } catch (e) {
    Logger.log('ℹ️ Could not resolve ClientID/ZIP: %s', e);
  }

  const ordersSh = getOrdersSheet_();
  const linesSh  = getLinesSheet_();
  const { headers: oh, map: om } = sheetEnsureColumns_(ordersSh, [
    'OrderID','ClientID','CaseID','ServiceDate','Program','DeliveryType','OrderStatus','Notes','EnteredBy','CreatedAt','UpdatedAt'
  ]);
  const { headers: lh, map: lm } = sheetEnsureColumns_(linesSh, [
    'LineID','OrderID','ItemName','Qty','Unit','Notes','CreatedAt','CreatedBy'
  ]);

  // Lock to avoid ID races
  const lock = LockService.getScriptLock();
  try { lock.waitLock(5000); } catch(e) {}

  // Generate next OrderID
  const orderId = suppliesNextOrderId_(ordersSh, om);

  // Parse/format service date (accept yyyy-mm-dd or dd/mm/yyyy)
  const sdRaw = String(body.ServiceDate || '').trim();
  let svcDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(sdRaw)) { // html date input
    svcDate = new Date(sdRaw + 'T00:00:00');
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(sdRaw)) {
    const [dd,mm,yyyy] = sdRaw.split('/');
    svcDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  } else {
    svcDate = new Date(); // fallback
  }

  const program     = programFromZip_(zip);
  const delivery    = String(body.DeliveryType || '').trim(); // may be blank for now
  const orderStatus = 'Completed';
  const now = new Date();
  const enteredBy = (function(){ try { return Session.getActiveUser().getEmail() || 'system'; } catch(e){ return 'system'; }})();

  // Insert Order row
  const oRow = new Array(oh.length).fill('');
  const setO = (col, val) => { const i = om[col]; if (i != null) oRow[i] = val; };
  setO('OrderID',     orderId);
  setO('ClientID',    clientId);
  setO('CaseID',      '');           // not used yet
  setO('ServiceDate', svcDate);
  setO('Program',     program);
  setO('DeliveryType',delivery);
  setO('OrderStatus', orderStatus);
  setO('Notes',       String(body.Notes || ''));
  setO('EnteredBy',   enteredBy);
  setO('CreatedAt',   now);
  setO('UpdatedAt',   now);
  ordersSh.getRange(ordersSh.getLastRow() < 2 ? 2 : ordersSh.getLastRow()+1, 1, 1, oh.length).setValues([oRow]);

  // Build Lines
  const lines = [];
  let lineId = 1;
  const addLine = (name, qty, unit, note) => {
    const q = num(qty);
    if (!name || q <= 0) return;
    const row = new Array(lh.length).fill('');
    const set = (col, val) => { const i = lm[col]; if (i != null) row[i] = val; };
    set('LineID',   lineId++);
    set('OrderID',  orderId);
    set('ItemName', name);
    set('Qty',      q);
    set('Unit',     unit);
    set('Notes',    note || '');
    set('CreatedAt',now);
    set('CreatedBy',enteredBy);
    lines.push(row);
  };

  // Map of front-end item fields → lines
  const items = body.Items || {};
  addLine('Dry Dog Food',            num(items.DryDogLbs),     'lbs');
  addLine('Wet Dog Food (cans)',     num(items.WetDogCans),    'each');
  addLine('Dog Treat(s)',            num(items.DogTreats),     'each');
  addLine('Dog Toy(s)',              num(items.DogToys),       'each');
  addLine('Dog Leash(es)',           num(items.DogLeashes),    'each');
  addLine('Dog Collar(s)',           num(items.DogCollars),    'each');

  addLine('Dry Cat Food',            num(items.DryCatLbs),     'lbs');
  addLine('Wet Cat Food (cans)',     num(items.WetCatCans),    'each');
  addLine('Cat Litter',              num(items.CatLitterLbs),  'lbs');
  addLine('Cat Treat(s)',            num(items.CatTreats),     'each');
  addLine('Cat Toy(s)',              num(items.CatToys),       'each');
  addLine('Cat Collar(s)',           num(items.CatCollars),    'each');

  // Flea/Tick Meds: require Qty>0 and Brand/Species/Size strings to compose item name
  const ft = body.FleaTick || {};
  const ftQty = num(ft.Qty);
  if (ftQty > 0) {
    const ftSpecies = String(ft.Species || '').trim();
    const ftBrand   = String(ft.Brand || '').trim();
    const ftSize    = String(ft.Size || '').trim();
    const composed  = ['Flea/Tick Meds', ftSpecies, ftBrand, ftSize].filter(Boolean).join(' - ');
    addLine(composed, ftQty, 'each');
  }

  // Straw (bales), Pet Bed (each)
  addLine('Straw (bales)',           num(items.StrawBales),    'bale');
  addLine('Pet Bed',                 num(items.PetBeds),       'each');

  // Optional: Other (free text item name) with optional qty/unit
  if (body.Other && typeof body.Other === 'object') {
    const oname = String(body.Other.ItemName || '').trim();
    const oqty  = num(body.Other.Qty);
    const ounit = String(body.Other.Unit || '').trim() || 'each';
    addLine(oname, oqty, ounit, String(body.Other.Notes || ''));
  } else if (typeof body.Other === 'string' && body.Other.trim()) {
    // If "Other" is just text (no qty), save as a note-only line with Qty=1 each
    addLine(String(body.Other).trim(), 1, 'each');
  }

  if (lines.length) {
    linesSh.getRange(linesSh.getLastRow() < 2 ? 2 : linesSh.getLastRow()+1, 1, lines.length, lh.length).setValues(lines);
  }

  try { lock.releaseLock(); } catch(e) {}
  Logger.log('✅ Saved order %s with %s line(s)', orderId, lines.length);

  return safeReturn_({
    ok: true,
    orderId,
    lineCount: lines.length,
    program,
    clientId
  });
}