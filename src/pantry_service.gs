/** Business logic for client search / dedupe / creation **/

function api_searchClient(query){
  const q = {
    clientId: normTrim((query && query.clientId) || ''),
    phone:    normPhone((query && query.phone) || ''),
    email:    normEmail((query && query.email) || '')
  };

  // Minimal, explicit diagnostics so it can NEVER be undefined
  const all = clients_readAll();
  const exact = clients_findExact(q);

  if (exact) {
    return { status: 'exact', client: exact, diag: { q, rows: all.data.length } };
  }
  return { status: 'not_found', diag: { q, rows: all.data.length } };
}

function api_searchByFormId(formId){
  const id = String(formId || '').trim();
  const formRow = forms_getByFormId(id);

  if (!formRow) return { status: 'form_not_found', diag: { id } };

  const candidate = mapFormRowToHubClient(formRow);
  const all = clients_readAll();

  function score(row){
    let pts = 0, reasons = [];
    const nameMatch =
      normName(row['FirstName']) === normName(candidate['FirstName']) &&
      normName(row['LastName'])  === normName(candidate['LastName']);
    if (nameMatch) { pts++; reasons.push('Name'); }

    const candPhone = normPhone(candidate['PhoneNormalized'] || candidate['Phone'] || '');
    if (candPhone && normPhone(row['PhoneNormalized']) === candPhone) { pts++; reasons.push('Phone'); }

    const candEmail = normEmail(candidate['EmailNormalized'] || candidate['Email'] || '');
    if (candEmail && normEmail(row['EmailNormalized']) === candEmail) { pts++; reasons.push('Email'); }

    return { pts, reasons };
  }

  let best = null;
  for (const r of all.data) {
    const s = score(r);
    if (s.pts >= 2) { best = { row: r, score: s }; if (s.pts === 3) break; }
  }

  if (best) {
    return {
      status: best.score.pts === 3 ? 'exact' : 'possible_duplicate',
      matchReasons: best.score.reasons,
      client: best.row,
      candidateFromForm: candidate,
      formRow,
      diag: { id }
    };
  }

  return { status: 'new_from_form', candidateFromForm: candidate, formRow, diag: { id } };
}

/**
 * Merge helper: prefer form values when provided; preserve existing elsewhere.
 * Uses actual sheet headers so we never drop columns unintentionally.
 */
function api_mergeClientWithForm(existing, formCandidate){
  const sh = shGet(CFG.HUB_SHEET_ID, CFG.HUB_SHEET_CLIENTS_TAB);
  const { headers } = readTable(sh);

  const merged = {};

  // Walk real headers first (ensures we keep all existing columns)
  headers.forEach(h => {
    if (h === 'ClientID') {
      merged[h] = existing['ClientID'] || '';  // never overwrite ClientID
      return;
    }
    const formVal  = formCandidate[h];
    const existVal = existing[h];
    merged[h] = (formVal != null && String(formVal) !== '') ? formVal
              : (existVal != null ? existVal : '');
  });

  // Also copy any extra keys present in formCandidate but not in headers (future-proof)
  Object.keys(formCandidate || {}).forEach(k => {
    if (!(k in merged)) merged[k] = formCandidate[k];
  });

  // Ensure normalized fields if raw values present
  if (merged.Email && !merged.EmailNormalized) merged.EmailNormalized = normEmail(merged.Email);
  if (merged.Phone && !merged.PhoneNormalized) merged.PhoneNormalized = normPhone(merged.Phone);

  return merged;
}

/** Upsert wrapper used by UI actions */
function api_createOrUpdateClient(data){
  // Ensure normalizations before save
  if (data.Email && !data.EmailNormalized) data.EmailNormalized = normEmail(data.Email);
  if (data.Phone && !data.PhoneNormalized) data.PhoneNormalized = normPhone(data.Phone);

  const res = clients_upsert(data || {});
  return { status: 'saved', result: res };
}