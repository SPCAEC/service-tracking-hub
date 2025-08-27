/** ===================== Pets API (Service Tracking Hub) ===================== **
 * Depends on:
 *  - CFG (config.gs)  -> PETS_SHEET_NAME, SHEET_ID
 *  - safeReturn_(obj) defined globally (e.g., in clients_api.gs)
 * Notes:
 *  - Associates pets to a client via ClientRowId (row number in Clients sheet)
 *  - Upserts pets by PetID; does NOT purge the client's rows.
 */

function getPetsSheet_() {
  if (!CFG.SHEET_ID || CFG.SHEET_ID === 'PUT_YOUR_SHEET_ID_HERE') {
    throw new Error('TRACKING_SHEET_ID not set in Script Properties.');
  }
  const ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  const sh = ss.getSheetByName(CFG.PETS_SHEET_NAME) || ss.insertSheet(CFG.PETS_SHEET_NAME);
  return sh;
}

function petsGetHeaderMap_(sh) {
  const lastCol = Math.max(1, sh.getLastColumn());
  const row = sh.getRange(1, 1, 1, lastCol).getValues()[0] || [];
  const headers = row.map(h => String(h == null ? '' : h).trim());
  const map = {};
  headers.forEach((h, i) => { if (h) map[h] = i; });
  return { headers, map };
}

function petsEnsureColumns_(sh, required) {
  let { headers } = petsGetHeaderMap_(sh);
  const has = (name) => headers.some(h => h.toLowerCase() === String(name).trim().toLowerCase());
  let changed = false;
  if (!headers || headers.length === 0) { headers = []; changed = true; }
  required.forEach(c => { if (!has(c)) { headers.push(String(c).trim()); changed = true; }});
  if (changed) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  return petsGetHeaderMap_(sh);
}

/** Canonical headers for Pets */
const PETCOL = {
  PetID:       'PetID',        // auto id (e.g., P-20250825-001, or any scheme)
  ClientRowId: 'ClientRowId',  // FK to Clients row
  Name:        'PetName',      // <- write name to PetName (not "Name")
  Species:     'Species',
  Breed:       'Breed',
  Sex:         'Sex',
  AgeYrs:      'AgeYears',
  WeightLbs:   'WeightLb',
  Fixed:       'SpayNeuterStatus',
  Color:       'Color',
  Allergies:   'Allergies',
  Notes:       'Notes',
  Deceased:    'Deceased',     // TRUE/FALSE
  Rehomed:     'Re-homed',     // TRUE/FALSE
  CreatedAt:   'CreatedAt',
  CreatedBy:   'CreatedBy',
  UpdatedAt:   'UpdatedAt',
  UpdatedBy:   'UpdatedBy'
};

function truthy_(v) {
  return (v === true || v === 'TRUE' || v === 'true' || v === 'Yes' || v === 'yes' || v === 1 || v === '1');
}

/** Generate PetID: P-YYYYMMDD-### (per day) */
function petsGeneratePetId_(sh, map) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  const dayKey = `${y}${m}${d}`;
  const { headers } = petsGetHeaderMap_(sh);
  const lastRow = sh.getLastRow();
  let seq = 1;

  if (lastRow >= 2) {
    const ci = map[PETCOL.PetID];
    const rng = sh.getRange(2, 1, lastRow-1, headers.length).getValues();
    rng.forEach(r => {
      const v = String(r[ci] || '');
      const m = v.match(/^P-(\d{8})-(\d{3})$/);
      if (m && m[1] === dayKey) seq = Math.max(seq, Number(m[2]) + 1);
    });
  }
  return `P-${dayKey}-${String(seq).padStart(3,'0')}`;
}

/** Get active pets for a client, sorted by PetID (exclude Deceased/Re-homed) */
function apiGetPetsByClientRow(body) {
  const clientRowId = String(body && body.ClientRowId || '').trim();
  if (!clientRowId) return safeReturn_({ ok:false, error:'ClientRowId required', pets: [] });

  const sh = getPetsSheet_();
  const { headers, map } = petsEnsureColumns_(sh, Object.values(PETCOL));

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return safeReturn_({ ok:true, pets: [] });

  const vals = sh.getRange(2, 1, lastRow-1, headers.length).getValues();
  const pets = [];
  for (let i=0;i<vals.length;i++){
    const r = vals[i];
    if (String(r[map[PETCOL.ClientRowId]] || '') !== clientRowId) continue;
    const deceased = truthy_(r[map[PETCOL.Deceased]]);
    const rehomed  = truthy_(r[map[PETCOL.Rehomed]]);
    if (deceased || rehomed) continue;

    pets.push({
      PetID:     r[map[PETCOL.PetID]] || '',
      Name:      r[map[PETCOL.Name]] || '',
      Species:   r[map[PETCOL.Species]] || '',
      Breed:     r[map[PETCOL.Breed]] || '',
      Sex:       r[map[PETCOL.Sex]] || '',
      AgeYrs:    r[map[PETCOL.AgeYrs]] || '',
      WeightLbs: r[map[PETCOL.WeightLbs]] || '',
      Fixed:     truthy_(r[map[PETCOL.Fixed]]),
      Color:     r[map[PETCOL.Color]] || '',
      Allergies: r[map[PETCOL.Allergies]] || '',
      Notes:     r[map[PETCOL.Notes]] || '',
      Deceased:  deceased,
      Rehomed:   rehomed
    });
  }

  // sort by PetID asc (stable)
  pets.sort((a,b)=> String(a.PetID).localeCompare(String(b.PetID)));
  return safeReturn_({ ok:true, pets });
}

/** Upsert pets for a client (by PetID). No purge. */
function apiSavePets(body) {
  Logger.log('⚡ apiSavePets body=%s', JSON.stringify(body));
  const clientRowId = String(body && body.ClientRowId || '').trim();
  const pets = Array.isArray(body && body.pets) ? body.pets : [];
  if (!clientRowId) return safeReturn_({ ok:false, error:'ClientRowId required' });

  const sh = getPetsSheet_();
  const { headers, map } = petsEnsureColumns_(sh, Object.values(PETCOL));
  const now = new Date();
  const user = (function(){ try { return Session.getActiveUser().getEmail() || 'system'; } catch(e){ return 'system'; }})();

  // index existing rows by PetID (for this client only)
  const existingIdx = {};
  const lastRow = sh.getLastRow();
  if (lastRow >= 2) {
    const vals = sh.getRange(2, 1, lastRow-1, headers.length).getValues();
    for (let i=0;i<vals.length;i++){
      const r = vals[i];
      if (String(r[map[PETCOL.ClientRowId]] || '') !== clientRowId) continue;
      const pid = String(r[map[PETCOL.PetID]] || '');
      if (pid) existingIdx[pid] = { row: i+2, r }; // store sheet row & array
    }
  }

  let inserts = 0, updates = 0;

  pets.forEach((pRaw, i) => {
    // normalize inbound
    const p = Object.assign({
      PetID:'', Name:'', Species:'', Breed:'', Sex:'',
      AgeYrs:'', WeightLbs:'', Fixed:false, Color:'', Allergies:'', Notes:'',
      Deceased:false, Rehomed:false
    }, pRaw || {});

    let petId = String(p.PetID || '').trim();
    if (petId && existingIdx[petId]) {
      // UPDATE existing row
      const rowNum = existingIdx[petId].row;
      const rowArr = sh.getRange(rowNum, 1, 1, headers.length).getValues()[0];

      const set = (col, val) => { const i = map[col]; if (i != null) rowArr[i] = val; };
      set(PETCOL.ClientRowId, clientRowId);
      set(PETCOL.PetID, petId);
      set(PETCOL.Name, p.Name);
      set(PETCOL.Species, p.Species);
      set(PETCOL.Breed, p.Breed);
      set(PETCOL.Sex, p.Sex);
      set(PETCOL.AgeYrs, p.AgeYrs === '' ? '' : Number(p.AgeYrs));
      set(PETCOL.WeightLbs, p.WeightLbs === '' ? '' : Number(p.WeightLbs));
      set(PETCOL.Fixed, !!p.Fixed);
      set(PETCOL.Color, p.Color || '');
      set(PETCOL.Allergies, p.Allergies || '');
      set(PETCOL.Notes, p.Notes || '');
      set(PETCOL.Deceased, !!p.Deceased);
      set(PETCOL.Rehomed, !!p.Rehomed);
      set(PETCOL.UpdatedAt, now);
      set(PETCOL.UpdatedBy, user);

      sh.getRange(rowNum, 1, 1, headers.length).setValues([rowArr]);
      updates++;
    } else {
      // INSERT new row with generated PetID (unless caller provided)
      if (!petId) petId = petsGeneratePetId_(sh, map);
      const newRow = new Array(headers.length).fill('');
      const set = (col, val) => { const i = map[col]; if (i != null) newRow[i] = val; };

      set(PETCOL.ClientRowId, clientRowId);
      set(PETCOL.PetID, petId);
      set(PETCOL.Name, p.Name);
      set(PETCOL.Species, p.Species);
      set(PETCOL.Breed, p.Breed);
      set(PETCOL.Sex, p.Sex);
      set(PETCOL.AgeYrs, p.AgeYrs === '' ? '' : Number(p.AgeYrs));
      set(PETCOL.WeightLbs, p.WeightLbs === '' ? '' : Number(p.WeightLbs));
      set(PETCOL.Fixed, !!p.Fixed);
      set(PETCOL.Color, p.Color || '');
      set(PETCOL.Allergies, p.Allergies || '');
      set(PETCOL.Notes, p.Notes || '');
      set(PETCOL.Deceased, !!p.Deceased);
      set(PETCOL.Rehomed, !!p.Rehomed);
      set(PETCOL.CreatedAt, now);
      set(PETCOL.CreatedBy, user);
      set(PETCOL.UpdatedAt, now);
      set(PETCOL.UpdatedBy, user);

      const writeRow = sh.getLastRow() < 2 ? 2 : sh.getLastRow() + 1;
      sh.getRange(writeRow, 1, 1, headers.length).setValues([newRow]);
      inserts++;
    }
  });

  Logger.log('✅ Pets upsert for client %s → %s updates, %s inserts', clientRowId, updates, inserts);
  return safeReturn_({ ok:true, updates, inserts });
}
/**
 * Read pets for a client (excluding Deceased/Rehomed).
 * @param {{ClientRowId:string}} body
 * @return {{ok:true, pets:Array}} pets sorted by PetID then PetIndex
 */
function apiGetPetsForClient(body) {
  const clientRowId = String(body && body.ClientRowId || '').trim();
  if (!clientRowId) return safeReturn_({ ok:false, pets:[], error:'ClientRowId required' });

  const sh = getPetsSheet_();
  const { headers, map } = petsEnsureColumns_(sh, Object.values(PETCOL));

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return safeReturn_({ ok:true, pets:[] });

  const rows = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();

  const pets = rows
    .map(r => {
      const v = (col) => (map[col] != null ? r[map[col]] : '');
      return {
        PetID:     String(v('PetID') || ''),              // optional if you have it
        PetIndex:  v(PETCOL.PetIndex) ?? '',
        Name:      String(v(PETCOL.Name) || ''),
        Species:   String(v(PETCOL.Species) || ''),
        Breed:     String(v(PETCOL.Breed) || ''),
        Sex:       String(v(PETCOL.Sex) || ''),
        AgeYrs:    v(PETCOL.AgeYrs) === '' ? '' : Number(v(PETCOL.AgeYrs)),
        WeightLbs: v(PETCOL.WeightLbs) === '' ? '' : Number(v(PETCOL.WeightLbs)),
        Fixed:     v(PETCOL.Fixed) === true || String(v(PETCOL.Fixed)).toLowerCase() === 'true',
        Notes:     String(v(PETCOL.Notes) || ''),
        Deceased:  (String(v('Deceased')).toLowerCase() === 'true'),
        Rehomed:   (String(v('Re-homed')).toLowerCase() === 'true'),
        _rowId:    '', // not needed on FE
        _client:   String(v(PETCOL.ClientRowId) || '')
      };
    })
    .filter(p => p._client === clientRowId)
    .filter(p => !p.Deceased && !p.Rehomed)
    .sort((a,b) => {
      // stable: PetID (if present) then PetIndex
      if (a.PetID && b.PetID && a.PetID !== b.PetID) return a.PetID.localeCompare(b.PetID);
      return (a.PetIndex||0) - (b.PetIndex||0);
    });

  return safeReturn_({ ok:true, pets });
}