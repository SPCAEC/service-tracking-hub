/** Service Tracking Hub — config */
const CFG = {
  // Sheets
  HUB_SHEET_ID: '1MXRcejHkJvsNwdU99tUMbRXYV3z_cR5qWOrdfTgneZc',
  HUB_SHEET_CLIENTS_TAB: 'Clients',             // gid 0

  PANTRY_RESPONSES_SHEET_ID: '1JrfUHDAPMCIvOSknKoN3vVR6KQZTKUaNLpsRru7cekU',
  PANTRY_RESPONSES_TAB: 'Form Responses 1',     // explicit tab name

  // Canonical columns we expect in HUB → used by mapping/merge logic
  // (Matches what your UI shows and your earlier mapping list)
  COL_CLIENTS: [
    'ClientID',
    'FirstName','LastName',
    'Address1','Address2','City','State','ZIP',

    'Phone','PhoneNormalized',
    'Email','EmailNormalized',

    'PreferredContact','ConsentEmail','ConsentSMS',
    'Returning Client',

    'FirstSeenAt','FirstSeenSource',

    // 1-to-1 fields you said exist with identical names
    'How did you hear about us?','Language','Military Status','Employment','Ethnic Background',
    'Transportation','Gender Identity','Public Services','Income','Income Contribution',
    'Household Size','Housing Status'
  ]
};