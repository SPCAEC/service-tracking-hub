/*************************************************
 * CENTRAL LOOKUPS: build named ranges + apply
 * Safe to re-run after you edit _sys_Lookups
 *************************************************/

// Open your workbook (reuses your project's getSS_ if present)
function lk_getSS_(){
  try {
    if (typeof getSS_ === 'function') return getSS_();
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (id) return SpreadsheetApp.openById(id);
  } catch(e){}
  return SpreadsheetApp.getActive();
}

function syncLookupsAndApply(){
  var ss = lk_getSS_();
  if (!ss) throw new Error('Could not open spreadsheet.');
  var map = lk_buildLookupRanges_(ss);   // { listName -> {rangeName, range} }
  lk_applyValidations_(ss, map);
}

/** Build/refresh _sys_Lists from _sys_Lookups and create named ranges "lk_<ListName>" */
function lk_buildLookupRanges_(ss){
  var src = ss.getSheetByName('_sys_Lookups');
  if (!src) throw new Error('Missing "_sys_Lookups" sheet.');

  var last = src.getLastRow();
  if (last < 2) throw new Error('_sys_Lookups has no data rows.');
  var headers = src.getRange(1,1,1,src.getLastColumn()).getValues()[0].map(String);
  function idx(name){ return headers.indexOf(name); }

  var rows = src.getRange(2,1,last-1,src.getLastColumn()).getValues();

  // group by ListName (active only)
  var groups = {}; // listName -> [{value,label,sort}]
  for (var i=0; i<rows.length; i++){
    var row = rows[i];
    var listName = String(row[idx('ListName')] || '').trim();
    if (!listName) continue;

    var isActiveRaw = row[idx('IsActive')];
    var isActive = false;
    if (typeof isActiveRaw === 'boolean') {
      isActive = isActiveRaw;
    } else {
      var s = String(isActiveRaw || '').toLowerCase();
      isActive = (s === 'true' || s === '1' || s === 'yes' || s === 'y');
    }
    if (!isActive) continue;

    var value = String(row[idx('Value')] || '').trim();
    var label = String(row[idx('Label')] || value).trim();
    var sort  = Number(row[idx('SortOrder')] || 9999);

    if (!groups[listName]) groups[listName] = [];
    groups[listName].push({value:value, label:label, sort:sort});
  }

  // ensure helper sheet
  var helper = ss.getSheetByName('_sys_Lists');
  if (!helper) {
    helper = ss.insertSheet('_sys_Lists');
    helper.hideSheet();
  }
  helper.clear();

  // write each list in its own column and create named range
  var map = {};
  var col = 1;
  var names = Object.keys(groups).sort();
  for (var n=0; n<names.length; n++){
    var list = names[n];
    var arr = groups[list].sort(function(a,b){
      if (a.sort !== b.sort) return a.sort - b.sort;
      return a.label.localeCompare(b.label);
    }).map(function(x){ return [x.value]; });

    helper.getRange(1, col).setValue(list);
    if (arr.length){
      helper.getRange(2, col, arr.length, 1).setValues(arr);
    }

    // Build range (non-blank values below header)
    var lastRow = Math.max(2, helper.getLastRow());
    var range = helper.getRange(2, col, lastRow - 1, 1);

    var rangeName = 'lk_' + list.replace(/[^A-Za-z0-9_]/g, '_');

    // remove any existing named range with same name
    var nrs = ss.getNamedRanges();
    for (var j=0; j<nrs.length; j++){
      if (nrs[j].getName() === rangeName) { nrs[j].remove(); }
    }
    ss.setNamedRange(rangeName, range);

    map[list] = { rangeName: rangeName, range: range };
    col++;
  }

  return map;
}

/** Where to apply which list.  headerName -> listName */
var LOOKUP_BINDINGS = {
  'Clients': {
    'PreferredContact': 'PreferredContact'
  },
  'Cases': {
    'Status': 'CaseStatus',
    'OwnerTeam': 'OwnerTeam',
    'CaseType': 'CaseType'
  },
  'Interactions': {
    'Channel': 'InteractionChannel'
    // FollowUps stays free-text (multi-select concept).
  },
  'Appointments': {
    'Purpose': 'AppointmentPurpose',
    'LocationType': 'AppointmentLocationType',
    'Status': 'AppointmentStatus'
  },
  'MedicalServices': {
    'Status': 'MedicalServiceStatus'
  },
  'Vaccinations': {
    'VaccineType': 'VaccineType'
  },
  'Supplies_Orders': {
    'Program': 'SuppliesProgram',
    'DeliveryType': 'SuppliesDeliveryType',
    'OrderStatus': 'SuppliesOrderStatus'
  },
  'Expenses': {
    'Category': 'ExpenseCategory'
  },
  'Invoices': {
    'Status': 'InvoiceStatus'
  }
};

function lk_applyValidations_(ss, rangeMap){
  var sheets = Object.keys(LOOKUP_BINDINGS);
  for (var s=0; s<sheets.length; s++){
    var sheetName = sheets[s];
    var sh = ss.getSheetByName(sheetName);
    if (!sh) continue;

    var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0].map(String);
    function colIdx(name){ return headers.indexOf(name) + 1; }

    var bindings = LOOKUP_BINDINGS[sheetName];
    var headerNames = Object.keys(bindings);
    for (var k=0; k<headerNames.length; k++){
      var headerName = headerNames[k];
      var listName = bindings[headerName];
      var col = colIdx(headerName);
      var info = rangeMap[listName];
      if (!col || !info) continue;

      var rng = sh.getRange(2, col, Math.max(0, sh.getMaxRows() - 1), 1);
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(ss.getRangeByName(info.rangeName), true)
        .setAllowInvalid(true)
        .setHelpText('Edit options in _sys_Lookups → ListName = ' + listName)
        .build();
      rng.setDataValidation(rule);
    }
  }
}

/************ OPTIONAL: seed headers if _sys_Lookups missing ************/
function seedDefaultLookupsIfEmpty(){
  var ss = lk_getSS_();
  var sh = ss.getSheetByName('_sys_Lookups');
  if (!sh) {
    sh = ss.insertSheet('_sys_Lookups');
    sh.getRange(1,1,1,6).setValues([['ListName','Value','Label','SortOrder','IsActive','Notes']]);
    SpreadsheetApp.getUi().alert('Created _sys_Lookups. Paste the CSV values, then run syncLookupsAndApply().');
    return;
  }
  if (sh.getLastRow() > 1) {
    SpreadsheetApp.getUi().alert('_sys_Lookups already has data; not seeding.');
  } else {
    SpreadsheetApp.getUi().alert('Paste the CSV values into _sys_Lookups, then run syncLookupsAndApply().');
  }
}
