/** Business logic for client search/dedupe/creation */

function api_searchClient(query){
  // query: { clientId?, phone?, email? }
  const q = {
    clientId: normTrim(query.clientId),
    phone: normPhone(query.phone),
    email: normEmail(query.email)
  };

  // 1) Exact by any of the three
  const exact = clients_findExact(q);
  if(exact){
    return {
      status:'exact',
      client: exact
    };
  }
  // 2) Not found → signal new
  return { status:'not_found' };
}

function api_searchByFormId(formId){
  const formRow = forms_getByFormId(formId);
  if(!formRow) return { status:'form_not_found' };

  // Build “candidate” identity from form row (we’ll refine with your mapping)
  const candidate = {
    FirstName: normName(formRow['First Name'] || formRow['FirstName'] || ''),
    LastName:  normName(formRow['Last Name']  || formRow['LastName']  || ''),
    PhoneNormalized: normPhone(formRow['Phone'] || formRow['Phone Number'] || ''),
    EmailNormalized: normEmail(formRow['Email'] || formRow['Email Address'] || '')
  };

  // Compare against HUB clients for 3-point or 2-point match
  const {data} = clients_readAll();

  function score(row){
    let pts = 0, reasons=[];
    if(candidate.FirstName && candidate.LastName){
      const fullEq = (normName(row['FirstName'])===candidate.FirstName) &&
                     (normName(row['LastName'])===candidate.LastName);
      if(fullEq){ pts+=1; reasons.push('Name'); }
    }
    if(candidate.PhoneNormalized){
      if(normPhone(row['PhoneNormalized'])===candidate.PhoneNormalized){ pts+=1; reasons.push('Phone'); }
    }
    if(candidate.EmailNormalized){
      if(normEmail(row['EmailNormalized'])===candidate.EmailNormalized){ pts+=1; reasons.push('Email'); }
    }
    return {pts, reasons};
  }

  let best = null;
  for(const r of data){
    const s = score(r);
    if(s.pts>=2){
      best = {row:r, score:s};
      if(s.pts===3) break; // exact tri-match
    }
  }

  if(best){
    return {
      status: best.score.pts===3 ? 'exact' : 'possible_duplicate',
      matchReasons: best.score.reasons,
      client: best.row,
      candidateFromForm: candidate,
      formRow
    };
  }

  // No match → propose creating a new client prefilled from form
  // (We will need a definitive column mapping you’ll provide)
  return {
    status:'new_from_form',
    candidateFromForm: candidate,
    formRow
  };
}
