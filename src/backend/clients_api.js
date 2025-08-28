/** ===================== Clients API (Service Tracking Hub) ===================== **
 * Depends on:
 *  - CFG, COL (config.gs)
 *  - normPhone_, normEmail_, truthy_, toClientObject_ (utils_normalize.gs)
 */

/** ---------- Sheet access (Clients) ---------- */
function getClientsSheet_() {
  if (!CFG.SHEET_ID || CFG.SHEET_ID === 'PUT_YOUR_SHEET_ID_HERE') {
    throw new Error('TRACKING_SHEET_ID not set in Script Properties.');
  }
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  const sh = ss.getSheetByName(CFG.SHEET_NAME) || ss.getSheets()[0];
  return sh;
}

/** JSON-safe return (Dates → ISO; strips undefined) */
function safeReturn_(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Minimal fields needed to allow INSERT (prevents accidental blank rows) */
function _hasMinimumClientFields_(p) {
  const hasName = !!(p[COL.FirstName] && String(p[COL.FirstName]).trim());
  const hasLast = !!(p[COL.LastName] && String(p[COL.LastName]).trim());
  const hasContact = !!(p[COL.PhoneNormalized] || p[COL.EmailNormalized]);
  return (hasName && hasLast) || hasContact;
}

/** ---------- Header helpers ---------- */
function clientsGetHeaderMap_(sh) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const raw = sh.getRange(1, 1, 1, lastCol).getValues();
  const firstRow = (raw && raw[0]) ? raw[0] : [''];
  let headers = firstRow.map(String);
  if (headers.length === 1 && headers[0] === '') headers = [];
  const map = {};
  headers.forEach((h, i) => { map[String(h).trim()] = i; });
  return { headers, map };
}

function clientsEnsureColumns_(sh, required) {
  let { headers } = clientsGetHeaderMap_(sh);
  let changed = false;
  if (!headers || headers.length === 0) { headers = []; changed = true; }
  required.forEach(col => {
    if (!headers.includes(col)) { headers.push(col); changed = true; }
  });
  if (changed) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return clientsGetHeaderMap_(sh); // fresh map + headers
}

/** ---------- Coerce camelCase to sheet headers (non-destructive) ---------- */
function coerceToHeaderKeys_(p) {
  if (!p) return {};
  const out = Object.assign({}, p);
  const map = {
    rowId: 'RowId',
    firstName: 'FirstName',
    lastName: 'LastName',
    addr1: 'Address1',
    addr2: 'Address2',
    city: 'City',
    state: 'State',
    zip: 'ZIP',
    phone: 'Phone',
    phoneRaw: 'PhoneNormalized',
    email: 'Email',
    emailRaw: 'EmailNormalized',
    preferredContact: 'PreferredContact',
    consentEmail: 'ConsentEmail',
    consentSMS: 'ConsentSMS',
    clientId: 'ClientID',
  };
  Object.keys(map).forEach(k => {
    if (p[k] != null && out[map[k]] == null) out[map[k]] = p[k];
  });

  // normalize
  if (out.State) out.State = String(out.State).toUpperCase();

  if (out.PhoneNormalized == null && out.Phone != null) {
    out.PhoneNormalized = String(out.Phone).replace(/\D/g, '');
  } else if (out.PhoneNormalized != null) {
    out.PhoneNormalized = String(out.PhoneNormalized).replace(/\D/g, '');
  }

  if (out.EmailNormalized == null && out.Email != null) {
    out.EmailNormalized = String(out.Email).trim().toLowerCase();
  } else if (out.EmailNormalized != null) {
    out.EmailNormalized = String(out.EmailNormalized).trim().toLowerCase();
  }

  return out;
}

/** ---------- SEARCH: by ClientID or PhoneNormalized or EmailNormalized ---------- */
function apiSearchClient(q) {
  const clientId = q && String(q.ClientID || '').trim();
  const phoneN = normPhone_(q && (q.PhoneNormalized || q.phoneRaw));
  const emailN = normEmail_(q && (q.EmailNormalized || q.emailRaw));

  if (!clientId && !phoneN && !emailN) return { found: false };

  const sh = getClientsSheet_();
  clientsEnsureColumns_(sh, [COL.ClientID, COL.Phone, COL.PhoneNormalized, COL.Email, COL.EmailNormalized]);

  const { headers, map } = clientsGetHeaderMap_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { found: false };

  const idx = (name) => {
    if (map[name] != null) return map[name];
    const needle = String(name).trim().toLowerCase();
    const i = headers.findIndex(h => String(h).trim().toLowerCase() === needle);
    return i >= 0 ? i : null;
  };

  const ciClientID = idx(COL.ClientID);
  const ciPhone = idx(COL.Phone);
  const ciPhoneN = idx(COL.PhoneNormalized);
  const ciEmail = idx(COL.Email);
  const ciEmailN = idx(COL.EmailNormalized);

  Logger.log('🔎 query → id=%s phoneN=%s emailN=%s', clientId || '', phoneN || '', emailN || '');

  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const vId = ciClientID != null ? row[ciClientID] : '';
    const vPhone = ciPhoneN != null ? row[ciPhoneN] : (ciPhone != null ? row[ciPhone] : '');
    const vEmail = ciEmailN != null ? row[ciEmailN] : (ciEmail != null ? row[ciEmail] : '');

    const idHit    = clientId && String(vId || '').trim().toLowerCase() === clientId.toLowerCase();
    const phoneHit = phoneN && normPhone_(vPhone) === phoneN;
    const emailHit = emailN && normEmail_(vEmail) === emailN;

    if (idHit || phoneHit || emailHit) {
      Logger.log('✅ MATCH @ row %s → id=%s', i + 2, vId || '');
      return safeReturn_({ found: true, client: toClientObject_(row, map, i + 2) });
    }
  }
  return safeReturn_({ found: false });
}

/** ---------- Find first empty row (reuses gaps) ---------- */
function clientsFirstEmptyDataRow_(sh, map) {
  const keys = [COL.FirstName, COL.LastName, COL.PhoneNormalized, COL.EmailNormalized];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 2;

  const width = sh.getLastColumn();
  const values = sh.getRange(2, 1, lastRow - 1, width).getValues();
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const empty = keys.every(k => {
      const ci = map[k];
      return ci == null || row[ci] == null || row[ci] === '';
    });
    if (empty) return i + 2;
  }
  return lastRow + 1;
}

/** ---------- SAVE (UPSERT) ---------- */
function apiSaveClient(payload) {
  Logger.log('⚡ apiSaveClient (raw) %s', JSON.stringify(payload));
  payload = coerceToHeaderKeys_(payload);
  Logger.log('⚡ apiSaveClient (coerced) %s', JSON.stringify(payload));

  const sh = getClientsSheet_();
  const { headers, map } = clientsEnsureColumns_(sh, [
    COL.ClientID, COL.PrimaryContactName,
    COL.FirstName, COL.LastName,
    COL.Address1, COL.Address2, COL.City, COL.State, COL.ZIP,
    COL.Phone, COL.PhoneNormalized, COL.Email, COL.EmailNormalized,
    COL.PreferredContact, COL.ConsentEmail, COL.ConsentSMS,
    COL.ConsentNote, COL.ConsentTimestamp,
    COL.ReturningClient, COL.HowHeard, COL.Language, COL.MilitaryStatus,
    COL.Employment, COL.EthnicBackground, COL.Transportation, COL.GenderIdentity,
    COL.PublicServices, COL.Income, COL.IncomeContribution, COL.HouseholdSize,
    COL.HousingStatus, COL.DemographicNotes, COL.FirstSeenSource, COL.FirstSeenAt,
    COL.LastSeenAt, COL.Notes, COL.UniqueKey, COL.CreatedAt, COL.CreatedBy,
    COL.UpdatedAt, COL.UpdatedBy
  ]);

  const phoneN = normPhone_(payload[COL.PhoneNormalized] || payload[COL.Phone] || '');
  const emailN = normEmail_(payload[COL.EmailNormalized] || payload[COL.Email] || '');
  const now = new Date();

  // Build write object
  const writeObj = {};
  writeObj[COL.FirstName]        = payload[COL.FirstName] || '';
  writeObj[COL.LastName]         = payload[COL.LastName] || '';
  writeObj[COL.Address1]         = payload[COL.Address1] || '';
  writeObj[COL.Address2]         = payload[COL.Address2] || '';
  writeObj[COL.City]             = payload[COL.City] || '';
  writeObj[COL.State]            = (payload[COL.State] || '').toUpperCase();
  writeObj[COL.ZIP]              = payload[COL.ZIP] || '';
  writeObj[COL.Phone]            = payload[COL.Phone] || (phoneN ? phoneN : '');
  writeObj[COL.PhoneNormalized]  = phoneN;
  writeObj[COL.Email]            = payload[COL.Email] || (emailN ? emailN : '');
  writeObj[COL.EmailNormalized]  = emailN;
  writeObj[COL.PreferredContact] = payload[COL.PreferredContact] || '';
  writeObj[COL.ConsentEmail]     = !!payload[COL.ConsentEmail];
  writeObj[COL.ConsentSMS]       = !!payload[COL.ConsentSMS];
  writeObj[COL.LastSeenAt]       = now;
  writeObj[COL.UpdatedAt]        = now;
  try { writeObj[COL.UpdatedBy]  = Session.getActiveUser().getEmail() || 'system'; }
  catch (e) { writeObj[COL.UpdatedBy] = 'system'; }

  // ---- Lock (short)
  const lock = LockService.getScriptLock();
  try { lock.tryLock(5000); } catch (e) {}

  // Decide target row (declare BEFORE any access/logging)
  let targetRow = Number(payload.RowId || payload[COL.RowId] || 0);
  if (!targetRow) {
    const byId = payload[COL.ClientID] && apiSearchClient({ ClientID: payload[COL.ClientID] });
    if (byId && byId.found && byId.client && byId.client.RowId) {
      targetRow = Number(byId.client.RowId);
    }
  }
  if (!targetRow) {
    const res = apiSearchClient({ PhoneNormalized: phoneN, EmailNormalized: emailN });
    if (res && res.found && res.client && res.client.RowId) {
      targetRow = Number(res.client.RowId);
    }
  }
  Logger.log('Upsert → targetRow=%s', targetRow || '(new)');

  // Prevent accidental INSERTs when there is no meaningful data
  if (!targetRow) {
    // ensure writeObj also has normalized contact
    if (!_hasMinimumClientFields_(Object.assign({}, writeObj))) {
      try { lock.releaseLock(); } catch (e) {}
      Logger.log('🚫 Insert refused: insufficient client fields');
      return safeReturn_({ ok: false, error: 'Insufficient data to create client (need First+Last or phone/email).' });
    }
  }

  // Provided ClientID (ignore "dummy")
  let clientId = String(payload[COL.ClientID] || '').trim();
  if (clientId && /^dummy$/i.test(clientId)) clientId = '';

  if (targetRow >= 2) {
    // UPDATE
    const rowArr = sh.getRange(targetRow, 1, 1, headers.length).getValues()[0];
    // Keep existing ClientID unless a new one was provided
    writeObj[COL.ClientID] = clientId || (rowArr[map[COL.ClientID]] || '');
    Object.keys(writeObj).forEach(k => { const i = map[k]; if (i != null) rowArr[i] = writeObj[k]; });
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowArr]);
    try { lock.releaseLock(); } catch (e) {}
    Logger.log('✅ Updated row %s (ClientID=%s)', targetRow, writeObj[COL.ClientID]);
    return safeReturn_({ ok: true, action: 'updated', rowId: String(targetRow), ClientID: writeObj[COL.ClientID] });

  } else {
    // INSERT (race check)
    const res2 = apiSearchClient({ PhoneNormalized: phoneN, EmailNormalized: emailN });
    if (res2 && res2.found && res2.client && res2.client.RowId) {
      const r = Number(res2.client.RowId);
      const rowArr = sh.getRange(r, 1, 1, headers.length).getValues()[0];
      writeObj[COL.ClientID] = clientId || (rowArr[map[COL.ClientID]] || '');
      Object.keys(writeObj).forEach(k => { const i = map[k]; if (i != null) rowArr[i] = writeObj[k]; });
      sh.getRange(r, 1, 1, headers.length).setValues([rowArr]);
      try { lock.releaseLock(); } catch (e) {}
      Logger.log('✅ Updated row %s (post-race, ClientID=%s)', r, writeObj[COL.ClientID]);
      return safeReturn_({ ok: true, action: 'updated', rowId: String(r), ClientID: writeObj[COL.ClientID] });
    }

    // New row
    if (!clientId) clientId = clientsGenerateClientId_(sh, map);
    writeObj[COL.ClientID] = clientId;
    writeObj[COL.CreatedAt] = now;
    try { writeObj[COL.CreatedBy] = Session.getActiveUser().getEmail() || 'system'; }
    catch (e) { writeObj[COL.CreatedBy] = 'system'; }

    const insertRow = clientsFirstEmptyDataRow_(sh, map);
    const newRow = new Array(headers.length).fill('');
    Object.keys(writeObj).forEach(k => { const i = map[k]; if (i != null) newRow[i] = writeObj[k]; });
    sh.getRange(insertRow, 1, 1, headers.length).setValues([newRow]);
    try { lock.releaseLock(); } catch (e) {}
    Logger.log('✅ Inserted at row %s (ClientID=%s)', insertRow, clientId);
    return safeReturn_({ ok: true, action: 'inserted', rowId: String(insertRow), ClientID: clientId });
  }
}

/** ---------- ClientID generator: C-YYYYMMDD-### ---------- */
function clientsGenerateClientId_(sh, map) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dayKey = `${yyyy}${mm}${dd}`;
  const { headers } = clientsGetHeaderMap_(sh);
  const lastRow = sh.getLastRow();
  let seq = 1;

  if (lastRow >= 2) {
    const rng = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const ci = map[COL.ClientID];
    rng.forEach(r => {
      const v = String(r[ci] || '');
      const m = v.match(/^C-(\d{8})-(\d{3})$/);
      if (m && m[1] === dayKey) {
        const n = Number(m[2]);
        if (n >= seq) seq = n + 1;
      }
    });
  }
  return `C-${dayKey}-${String(seq).padStart(3, '0')}`;
}