/** ===================== Pantry API (thin, hardened shims) ===================== **
 * Surfaces a stable UI API and delegates to existing backends.
 * Keeps all current endpoints, adds normalization + guards.
 *
 * Depends on:
 *  - Clients API: apiSearchClient, apiSaveClient
 *  - Supplies API: apiSaveSuppliesOrder, apiGetFleaTickBrands
 *  - Pets API: apiGetPetsByClientRow, apiSavePets, apiGetPetsForClient
 *  - safeReturn_ (from clients_api.js)
 */

// ---------- helpers ----------
function _digits_(s){ return String(s || '').replace(/\D+/g, ''); }
function _email_(s){ return String(s || '').trim().toLowerCase(); }
function _json_(obj){ return safeReturn_(obj); } // Dates → ISO; strips undefined

// ---------- RECORD SUPPLIES ----------
/**
 * Frontend body shape:
 * {
 *   ClientRowId: "123",
 *   ServiceDate: "YYYY-MM-DD" | "DD/MM/YYYY" | "",
 *   DeliveryType: "Pickup" | "Delivery" | "",
 *   Notes: "...",
 *   Items: { DryDogLbs, WetDogCans, DogTreats, ... },
 *   // Optional later: FleaTick: { Qty, Species, Brand, Size }
 * }
 */
function pantry_recordSupplies(body) {
  try {
    body = body || {};
    if (!String(body.ClientRowId || '').trim()) {
      return _json_({ ok:false, error:'ClientRowId required' });
    }

    // Defensive: ensure Items is an object and coerce numeric entries
    var items = body.Items && typeof body.Items === 'object' ? body.Items : {};
    Object.keys(items).forEach(function(k){
      var v = Number(items[k]);
      items[k] = isNaN(v) ? 0 : v;
    });
    body.Items = items;

    var res = apiSaveSuppliesOrder(body); // { ok, orderId, lineCount }
    return _json_(res);
  } catch (e) {
    Logger.log('pantry_recordSupplies error: %s', e);
    return _json_({ ok:false, error:String(e) });
  }
}

// ---------- FLEA/TICK BRANDS ----------
function pantry_getFleaTickBrands() {
  try {
    var res = apiGetFleaTickBrands(); // {ok, brands}
    return _json_(res);
  } catch (e) {
    Logger.log('pantry_getFleaTickBrands error: %s', e);
    return _json_({ ok:false, brands:[], error:String(e) });
  }
}

// ---------- SEARCH CLIENT ----------
/** Accepts flexible query: { clientId?, phoneRaw?, emailRaw? } */
function pantry_searchClient(query) {
  try {
    query = query || {};
    var q = {
      ClientID: String(query.clientId || query.ClientID || '').trim(),
      PhoneNormalized: _digits_(query.phoneRaw || query.PhoneNormalized),
      EmailNormalized: _email_(query.emailRaw || query.EmailNormalized)
    };
    if (!q.ClientID && !q.PhoneNormalized && !q.EmailNormalized) {
      return _json_({ found:false });
    }
    var res = apiSearchClient(q); // { found, client? }
    return _json_(res);
  } catch (e) {
    Logger.log('pantry_searchClient error: %s', e);
    return _json_({ found:false, error:String(e) });
  }
}

// ---------- SAVE CLIENT (UPSERT) ----------
/**
 * Accepts either:
 *  - flat client fields (FirstName/LastName... or camelCase), or
 *  - nested { client: {...}, clientId?: string } (we flatten)
 */
function pantry_saveClient(payload) {
  try {
    payload = payload || {};
    var flat = payload.client ? Object.assign({}, payload.client) : Object.assign({}, payload);
    if (payload.clientId != null && flat.clientId == null) {
      flat.clientId = payload.clientId;
    }
    var res = apiSaveClient(flat); // { ok, action, rowId, ClientID } or {ok:false,error}
    if (res && res.ok) {
      return _json_({
        ok: true,
        action: res.action || 'updated',
        rowId: String(res.rowId || ''),
        ClientID: String(res.ClientID || '')
      });
    }
    return _json_({ ok:false, error: res && res.error ? String(res.error) : 'Client save failed' });
  } catch (e) {
    Logger.log('pantry_saveClient error: %s', e);
    return _json_({ ok:false, error:String(e) });
  }
}

// ---------- PETS PASSTHROUGHS (kept as-is for future use) ----------
function pantry_getPetsByClientRow(body){
  try { return _json_(apiGetPetsByClientRow(body)); }
  catch (e){ Logger.log('pantry_getPetsByClientRow error: %s', e); return _json_({ ok:false, pets:[], error:String(e) }); }
}
function pantry_savePets(body){
  try { return _json_(apiSavePets(body)); }
  catch (e){ Logger.log('pantry_savePets error: %s', e); return _json_({ ok:false, error:String(e) }); }
}
function pantry_getPetsForClient(body){
  try { return _json_(apiGetPetsForClient(body)); }
  catch (e){ Logger.log('pantry_getPetsForClient error: %s', e); return _json_({ ok:false, pets:[], error:String(e) }); }
}