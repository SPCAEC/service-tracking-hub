/** ===================== Clients API (Service Tracking Hub) ===================== **
 * Depends on:
 *  - CFG, COL (config.gs)
 *  - normPhone_, normEmail_, truthy_, toClientObject_ (utils_normalize.gs)
 */

/** ---------- Sheet access (Clients) ---------- */
function getClientsSheet_() {
  if (!CFG.SHEET_ID || CFG.SHEET_ID === "PUT_YOUR_SHEET_ID_HERE") {
    throw new Error("TRACKING_SHEET_ID not set in Script Properties.");
  }
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  const sh = ss.getSheetByName(CFG.SHEET_NAME) || ss.getSheets()[0];
  return sh;
}

/** Return a JSON‑safe deep clone (Dates → ISO strings, no undefined/functions). */
function safeReturn_(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function _hasMinimumClientFields_(p) {
  // Require either (First+Last) OR a contact (PhoneNormalized/EmailNormalized)
  const hasName = p[COL.FirstName] && p[COL.LastName];
  const hasContact = p[COL.PhoneNormalized] || p[COL.EmailNormalized];
  return !!(hasName || hasContact);
}

/** ---------- Collision-proof, resilient header helpers ---------- */
function clientsGetHeaderMap_(sh) {
  const lastCol = Math.max(1, sh.getLastColumn()); // never 0
  const raw = sh.getRange(1, 1, 1, lastCol).getValues();
  const firstRow = raw && raw[0] ? raw[0] : [""];
  let headers = firstRow.map(String);
  if (headers.length === 1 && headers[0] === "") headers = []; // empty sheet
  const map = {};
  headers.forEach((h, i) => {
    map[String(h).trim()] = i;
  });
  return { headers, map };
}

function clientsEnsureColumns_(sh, required) {
  let { headers } = clientsGetHeaderMap_(sh);
  let changed = false;

  if (!headers || headers.length === 0) {
    headers = [];
    changed = true;
  }

  required.forEach((col) => {
    if (!headers.includes(col)) {
      headers.push(col);
      changed = true;
    }
  });

  if (changed) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return clientsGetHeaderMap_(sh); // fresh map
}

/** ---------- Map possible camelCase keys to sheet header keys (non-destructive) ---------- */
function coerceToHeaderKeys_(p) {
  if (!p) return {};
  const out = Object.assign({}, p);
  const map = {
    rowId: "RowId",
    firstName: "FirstName",
    lastName: "LastName",
    addr1: "Address1",
    addr2: "Address2",
    city: "City",
    state: "State",
    zip: "ZIP",
    phone: "Phone",
    phoneRaw: "PhoneNormalized",
    email: "Email",
    emailRaw: "EmailNormalized",
    preferredContact: "PreferredContact",
    consentEmail: "ConsentEmail",
    consentSMS: "ConsentSMS",
    clientId: "ClientID",
  };
  Object.keys(map).forEach((k) => {
    if (p[k] != null && out[map[k]] == null) out[map[k]] = p[k];
  });

  // normalize known fields
  if (out.State) out.State = String(out.State).toUpperCase();

  if (out.PhoneNormalized == null && out.Phone != null) {
    out.PhoneNormalized = String(out.Phone).replace(/\D/g, "");
  } else if (out.PhoneNormalized != null) {
    out.PhoneNormalized = String(out.PhoneNormalized).replace(/\D/g, "");
  }

  if (out.EmailNormalized == null && out.Email != null) {
    out.EmailNormalized = String(out.Email).trim().toLowerCase();
  } else if (out.EmailNormalized != null) {
    out.EmailNormalized = String(out.EmailNormalized).trim().toLowerCase();
  }

  return out;
}

/** ---------- SEARCH: by PhoneNormalized or EmailNormalized ---------- */
function apiSearchClient(q) {
  // ---- normalize query
  const clientId = q && String(q.ClientID || "").trim();
  const phoneN = normPhone_(q && (q.PhoneNormalized || q.phoneRaw));
  const emailN = normEmail_(q && (q.EmailNormalized || q.emailRaw));

  if (!clientId && !phoneN && !emailN) return { found: false };

  const sh = getClientsSheet_();
  // make sure our key columns exist
  clientsEnsureColumns_(sh, [
    COL.ClientID,
    COL.Phone,
    COL.PhoneNormalized,
    COL.Email,
    COL.EmailNormalized,
  ]);

  const { headers, map } = clientsGetHeaderMap_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { found: false };

  // resolve header index robustly
  const idx = (name) => {
    if (map[name] != null) return map[name];
    const needle = String(name).trim().toLowerCase();
    const i = headers.findIndex(
      (h) => String(h).trim().toLowerCase() === needle
    );
    return i >= 0 ? i : null;
  };

  const ciClientID = idx(COL.ClientID);
  const ciPhone = idx(COL.Phone);
  const ciPhoneNormalized = idx(COL.PhoneNormalized);
  const ciEmail = idx(COL.Email);
  const ciEmailNormalized = idx(COL.EmailNormalized);

  Logger.log(
    "🔎 query → clientId=%s phoneN=%s emailN=%s",
    clientId || "",
    phoneN || "",
    emailN || ""
  );
  Logger.log(
    "🔎 idx → ClientID=%s Phone=%s PhoneNorm=%s Email=%s EmailNorm=%s",
    ciClientID,
    ciPhone,
    ciPhoneNormalized,
    ciEmail,
    ciEmailNormalized
  );

  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];

    const cellId = ciClientID != null ? row[ciClientID] : "";
    const cellPhone =
      ciPhoneNormalized != null
        ? row[ciPhoneNormalized]
        : ciPhone != null
        ? row[ciPhone]
        : "";
    const cellEmail =
      ciEmailNormalized != null
        ? row[ciEmailNormalized]
        : ciEmail != null
        ? row[ciEmail]
        : "";

    const idHit =
      clientId &&
      String(cellId || "")
        .trim()
        .toLowerCase() === clientId.toLowerCase();
    const phoneHit = phoneN && normPhone_(cellPhone) === phoneN;
    const emailHit = emailN && normEmail_(cellEmail) === emailN;

    if (idHit || phoneHit || emailHit) {
      Logger.log(
        "✅ MATCH at row %s → ID=%s  phoneRaw=%s  emailRaw=%s",
        i + 2,
        cellId,
        cellPhone,
        cellEmail
      );
      return safeReturn_({
        found: true,
        client: toClientObject_(row, map, i + 2),
      });
    }
  }

  Logger.log("∅ no match found after scanning %s rows", values.length);
  return safeReturn_({ found: false });
}

/** ---------- INSERT helper: first empty row under header (reuses gaps) ---------- */
function clientsFirstEmptyDataRow_(sh, map) {
  const keys = [
    COL.FirstName,
    COL.LastName,
    COL.PhoneNormalized,
    COL.EmailNormalized,
  ];
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 2;

  const width = sh.getLastColumn();
  const values = sh.getRange(2, 1, lastRow - 1, width).getValues(); // rows 2..lastRow
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const empty = keys.every((k) => {
      const ci = map[k];
      return ci == null || row[ci] === "" || row[ci] == null;
    });
    if (empty) return i + 2; // sheet row number
  }
  return lastRow + 1; // no gap; next new row
}

/** ---------- SAVE (UPSERT): update by RowId; else match by normalized phone/email; else insert ---------- */
function apiSaveClient(payload) {
  Logger.log("⚡ apiSaveClient (raw) %s", JSON.stringify(payload));

  // Accept camelCase or header-keyed
  payload = coerceToHeaderKeys_(payload);
  Logger.log("⚡ apiSaveClient (coerced) %s", JSON.stringify(payload));

  const sh = getClientsSheet_();
  const ss = sh.getParent();
  Logger.log(
    "Target → Spreadsheet: %s (%s)  Tab: %s",
    ss.getName(),
    ss.getId(),
    sh.getName()
  );

  // Ensure all columns we touch exist; initializes headers if blank
  const { headers, map } = clientsEnsureColumns_(sh, [
    COL.ClientID,
    COL.PrimaryContactName,
    COL.FirstName,
    COL.LastName,
    COL.Address1,
    COL.Address2,
    COL.City,
    COL.State,
    COL.ZIP,
    COL.Phone,
    COL.PhoneNormalized,
    COL.Email,
    COL.EmailNormalized,
    COL.PreferredContact,
    COL.ConsentEmail,
    COL.ConsentSMS,
    COL.ConsentNote,
    COL.ConsentTimestamp,
    COL.ReturningClient,
    COL.HowHeard,
    COL.Language,
    COL.MilitaryStatus,
    COL.Employment,
    COL.EthnicBackground,
    COL.Transportation,
    COL.GenderIdentity,
    COL.PublicServices,
    COL.Income,
    COL.IncomeContribution,
    COL.HouseholdSize,
    COL.HousingStatus,
    COL.DemographicNotes,
    COL.FirstSeenSource,
    COL.FirstSeenAt,
    COL.LastSeenAt,
    COL.Notes,
    COL.UniqueKey,
    COL.CreatedAt,
    COL.CreatedBy,
    COL.UpdatedAt,
    COL.UpdatedBy,
  ]);
  Logger.log("Headers (%s): %s", headers.length, JSON.stringify(headers));

  const phoneN = normPhone_(
    payload[COL.PhoneNormalized] || payload[COL.Phone] || ""
  );
  const emailN = normEmail_(
    payload[COL.EmailNormalized] || payload[COL.Email] || ""
  );
  Logger.log("Normalized → phone: %s  email: %s", phoneN, emailN);
  // After computing phoneN, emailN, targetRow, and before deciding to INSERT:
  var minimalDataPresent =
    (payload[COL.FirstName] && String(payload[COL.FirstName]).trim() !== "") ||
    (payload[COL.LastName] && String(payload[COL.LastName]).trim() !== "") ||
    (phoneN && phoneN !== "") ||
    (emailN && emailN !== "");

  if (!targetRow && !minimalDataPresent) {
    Logger.log(
      "⛔ Prevented empty insert: no RowId and no minimal client data."
    );
    return {
      ok: false,
      error:
        "Insufficient data to create client (provide name or phone/email).",
    };
  }
  // ---- Acquire a short lock to prevent double insert races
  const lock = LockService.getScriptLock();
  try {
    lock.tryLock(5000);
  } catch (e) {}

  // Row targeting (do this after acquiring lock)
  let targetRow = Number(payload.RowId || payload[COL.RowId]) || 0;
  if (!targetRow) {
    const res = apiSearchClient({
      PhoneNormalized: phoneN,
      EmailNormalized: emailN,
    });
    if (res?.found && res.client?.RowId) targetRow = Number(res.client.RowId);
  }

  // ensure we have a candidate ClientID for writing
  let clientId = (payload[COL.ClientID] || "").trim();
  Logger.log("Upsert decision → targetRow: %s", targetRow || "(new)");

  const now = new Date();
  const writeObj = {};
  writeObj[COL.FirstName] = payload[COL.FirstName] || "";
  writeObj[COL.LastName] = payload[COL.LastName] || "";
  writeObj[COL.Address1] = payload[COL.Address1] || "";
  writeObj[COL.Address2] = payload[COL.Address2] || "";
  writeObj[COL.City] = payload[COL.City] || "";
  writeObj[COL.State] = (payload[COL.State] || "").toUpperCase();
  writeObj[COL.ZIP] = payload[COL.ZIP] || "";
  writeObj[COL.Phone] = payload[COL.Phone] || (phoneN ? phoneN : "");
  writeObj[COL.PhoneNormalized] = phoneN;
  writeObj[COL.Email] = payload[COL.Email] || (emailN ? emailN : "");
  writeObj[COL.EmailNormalized] = emailN;
  writeObj[COL.PreferredContact] = payload[COL.PreferredContact] || "";
  writeObj[COL.ConsentEmail] = !!payload[COL.ConsentEmail];
  writeObj[COL.ConsentSMS] = !!payload[COL.ConsentSMS];
  writeObj[COL.LastSeenAt] = now;
  writeObj[COL.UpdatedAt] = now;
  try {
    writeObj[COL.UpdatedBy] = Session.getActiveUser().getEmail() || "system";
  } catch (err) {
    writeObj[COL.UpdatedBy] = "system";
  }

  if (targetRow >= 2) {
    // UPDATE
    const rowArr = sh.getRange(targetRow, 1, 1, headers.length).getValues()[0];

    // Keep existing ClientID unless a new one was provided
    writeObj[COL.ClientID] = clientId || rowArr[map[COL.ClientID]] || "";

    Object.keys(writeObj).forEach((key) => {
      const colIndex = map[key];
      if (colIndex != null) rowArr[colIndex] = writeObj[key];
    });
    sh.getRange(targetRow, 1, 1, headers.length).setValues([rowArr]);
    try {
      lock.releaseLock();
    } catch (err) {}
    Logger.log(
      "✅ Updated row %s with ClientID=%s",
      targetRow,
      writeObj[COL.ClientID]
    );
    return {
      ok: true,
      action: "updated",
      rowId: String(targetRow),
      ClientID: writeObj[COL.ClientID],
    };

    // ... after we decide targetRow is not set (i.e., insert path)
    if (!_hasMinimumClientFields_(writeObj)) {
      Logger.log("🚫 Insert refused: insufficient client fields");
      try {
        lock.releaseLock();
      } catch (e) {}
      return {
        ok: false,
        error: "Refusing to insert client without name or contact",
      };
    }

    // If a caller passed a bogus ClientID like "dummy", ignore it
    if (clientId && /^dummy$/i.test(clientId)) clientId = "";
  } else {
    // INSERT (recheck for race; someone else might have inserted after we locked decision)
    const res2 = apiSearchClient({
      PhoneNormalized: phoneN,
      EmailNormalized: emailN,
    });
    if (res2 && res2.found && res2.client && res2.client.RowId) {
      const r = Number(res2.client.RowId);
      const rowArr = sh.getRange(r, 1, 1, headers.length).getValues()[0];

      // Keep existing ClientID unless a new one was provided
      writeObj[COL.ClientID] = clientId || rowArr[map[COL.ClientID]] || "";

      Object.keys(writeObj).forEach((k) => {
        const i = map[k];
        if (i != null) rowArr[i] = writeObj[k];
      });
      sh.getRange(r, 1, 1, headers.length).setValues([rowArr]);
      try {
        lock.releaseLock();
      } catch (err) {}
      Logger.log(
        "✅ Updated row %s (post-race) with ClientID=%s",
        r,
        writeObj[COL.ClientID]
      );
      return safeReturn_({
        ok: true,
        action: "updated",
        rowId: String(targetRow),
        ClientID: writeObj[COL.ClientID],
      });
    }

    // Generate ClientID if missing (new client)
    if (!clientId) clientId = clientsGenerateClientId_(sh, map);
    writeObj[COL.ClientID] = clientId;

    const insertRow = clientsFirstEmptyDataRow_(sh, map);
    const newRow = new Array(headers.length).fill("");
    Object.keys(writeObj).forEach((key) => {
      const colIndex = map[key];
      if (colIndex != null) newRow[colIndex] = writeObj[key];
    });
    sh.getRange(insertRow, 1, 1, headers.length).setValues([newRow]);
    try {
      lock.releaseLock();
    } catch (err) {}
    Logger.log("✅ Inserted at row %s with ClientID=%s", insertRow, clientId);
    return safeReturn_({
      ok: true,
      action: "inserted",
      rowId: String(insertRow),
      ClientID: clientId,
    });
  }
}

function clientsGenerateClientId_(sh, map) {
  // Format: C-YYYYMMDD-### (001..999 per day)
  const tz = Session.getScriptTimeZone
    ? Session.getScriptTimeZone()
    : "America/New_York";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dayKey = `${yyyy}${mm}${dd}`;
  const { headers } = clientsGetHeaderMap_(sh);
  const lastRow = sh.getLastRow();
  let seq = 1;

  if (lastRow >= 2) {
    const rng = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
    const ci = map[COL.ClientID];
    // find existing today’s IDs
    rng.forEach((r) => {
      const v = String(r[ci] || "");
      const m = v.match(/^C-(\d{8})-(\d{3})$/);
      if (m && m[1] === dayKey) {
        const n = Number(m[2]);
        if (n >= seq) seq = n + 1;
      }
    });
  }
  return `C-${dayKey}-${String(seq).padStart(3, "0")}`;
}
