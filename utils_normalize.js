/** ===================== Utility: normalization & formatting ===================== **/

/**
 * Normalize a phone number:
 * - Accept strings or numbers
 * - Strip non-digits
 * - Cap length to 15 (intl safety)
 * Example: "(716) 555-1234" -> "7165551234"
 */
function normPhone_(v) {
  if (v === null || v === undefined || v === '') return '';
  return String(v).replace(/\D/g, '').slice(0, 15);
}

/**
 * Normalize an email to lowercase, trimmed.
 * Example: "  Test@Example.org " -> "test@example.org"
 */
function normEmail_(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

/**
 * Convert common truthy-ish spreadsheet values to boolean.
 * Handles TRUE, 'TRUE', 'true', 'Yes', 'Y', 1, '1', 'on', etc.
 */
function truthy_(val) {
  if (val === true || val === 1) return true;
  if (val === false || val === 0) return false;
  if (val === null || val === undefined) return false;
  var s = String(val).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1' || s === 'on';
}

/**
 * Format a Date to ISO-like string (yyyy-MM-dd HH:mm:ss) in the script TZ.
 */
function formatDateTime_(d) {
  if (!d) return '';
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Robust header lookup:
 * - Exact key if present in map
 * - Else fallback to case/whitespace-insensitive match over map keys
 */
function headerIndex_(map, name) {
  if (!map) return null;
  if (map[name] != null) return map[name];
  var needle = String(name).trim().toLowerCase();
  for (var k in map) {
    if (Object.prototype.hasOwnProperty.call(map, k)) {
      if (String(k).trim().toLowerCase() === needle) return map[k];
    }
  }
  return null;
}

/**
 * Safe cell getter using header name with robust lookup.
 */
function valFromRow_(row, map, headerName) {
  var i = headerIndex_(map, headerName);
  return (i == null) ? '' : row[i];
}

/**
 * Map a raw sheet row array → normalized client object aligned to COL headers.
 *
 * @param {Array}  row     The row array values from getValues()[i]
 * @param {Object} map     Header map {headerName: colIndex}
 * @param {number} rowNum  The actual sheet row number (2+)
 * @return {Object}        Client object keyed to COL names
 */
function toClientObject_(row, map, rowNum) {
  var v = function(col) { return valFromRow_(row, map, col); };

  return {
    RowId:              String(rowNum || ''),
    ClientID:           v(COL.ClientID),
    PrimaryContactName: v(COL.PrimaryContactName),
    FirstName:          v(COL.FirstName),
    LastName:           v(COL.LastName),
    Address1:           v(COL.Address1),
    Address2:           v(COL.Address2),
    City:               v(COL.City),
    State:              v(COL.State),
    ZIP:                v(COL.ZIP),
    Phone:              v(COL.Phone),
    PhoneNormalized:    normPhone_(v(COL.PhoneNormalized) || v(COL.Phone)),
    Email:              v(COL.Email),
    EmailNormalized:    normEmail_(v(COL.EmailNormalized) || v(COL.Email)),
    PreferredContact:   v(COL.PreferredContact),
    ConsentEmail:       truthy_(v(COL.ConsentEmail)),
    ConsentSMS:         truthy_(v(COL.ConsentSMS)),
    ConsentNote:        v(COL.ConsentNote),
    ConsentTimestamp:   v(COL.ConsentTimestamp),
    ReturningClient:    v(COL.ReturningClient),
    HowHeard:           v(COL.HowHeard),
    Language:           v(COL.Language),
    MilitaryStatus:     v(COL.MilitaryStatus),
    Employment:         v(COL.Employment),
    EthnicBackground:   v(COL.EthnicBackground),
    Transportation:     v(COL.Transportation),
    GenderIdentity:     v(COL.GenderIdentity),
    PublicServices:     v(COL.PublicServices),
    Income:             v(COL.Income),
    IncomeContribution: v(COL.IncomeContribution),
    HouseholdSize:      v(COL.HouseholdSize),
    HousingStatus:      v(COL.HousingStatus),
    DemographicNotes:   v(COL.DemographicNotes),
    FirstSeenSource:    v(COL.FirstSeenSource),
    FirstSeenAt:        v(COL.FirstSeenAt),
    LastSeenAt:         v(COL.LastSeenAt),
    Notes:              v(COL.Notes),
    UniqueKey:          v(COL.UniqueKey),
    CreatedAt:          v(COL.CreatedAt),
    CreatedBy:          v(COL.CreatedBy),
    UpdatedAt:          v(COL.UpdatedAt),
    UpdatedBy:          v(COL.UpdatedBy)
  };
}