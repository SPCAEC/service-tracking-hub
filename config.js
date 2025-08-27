/** ---------- Global config & column map ---------- **/

// Prefer Script Properties for IDs so you don’t hardcode them
// (File → Project properties → Script properties)
// Set TRACKING_SHEET_ID there. Fallback is here if not set.
/** ---------- Core config ---------- **/
const CFG = {
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('TRACKING_SHEET_ID')
    || 'PUT_YOUR_SHEET_ID_HERE',
  SHEET_NAME: 'Clients',       // GID=0 → Clients
  PETS_SHEET_NAME: 'Pets',     // Pets tab

  /** ---------- Supplies config ---------- **/
  ORDERS_SHEET_NAME: 'Supplies_Orders',   // Orders tab (GID=111470771)
  LINES_SHEET_NAME:  'Supplies_Lines',    // Lines tab (GID=1999022810)
  ORDER_ID_START:    '200000000000',      // 12-digit starting point
  FLEA_TICK_BRANDS_PROP: 'FLEA_TICK_BRANDS' // Script Property (comma-delimited brands)
};

// Column names EXACTLY as they appear in your sheet
const COL = {
  RowId:               'RowId',  // virtual (not an actual header, used in code)
  ClientID:            'ClientID',
  PrimaryContactName:  'PrimaryContactName',
  FirstName:           'FirstName',
  LastName:            'LastName',
  Address1:            'Address1',
  Address2:            'Address2',
  City:                'City',
  State:               'State',
  ZIP:                 'ZIP',
  Phone:               'Phone',
  PhoneNormalized:     'PhoneNormalized',
  Email:               'Email',
  EmailNormalized:     'EmailNormalized',
  PreferredContact:    'PreferredContact',
  ConsentEmail:        'ConsentEmail',
  ConsentSMS:          'ConsentSMS',
  ConsentNote:         'ConsentNote',
  ConsentTimestamp:    'ConsentTimestamp',
  ReturningClient:     'Returning Client',
  HowHeard:            'How did you hear about us?',
  Language:            'Language',
  MilitaryStatus:      'Military Status',
  Employment:          'Employment',
  EthnicBackground:    'Ethnic Background',
  Transportation:      'Transportation',
  GenderIdentity:      'Gender Identity',
  PublicServices:      'Public Services',
  Income:              'Income',
  IncomeContribution:  'Income Contribution',
  HouseholdSize:       'Household Size',
  HousingStatus:       'Housing Status',
  DemographicNotes:    'DemographicNotes',
  FirstSeenSource:     'FirstSeenSource',
  FirstSeenAt:         'FirstSeenAt',
  LastSeenAt:          'LastSeenAt',
  Notes:               'Notes',
  UniqueKey:           'UniqueKey',
  CreatedAt:           'CreatedAt',
  CreatedBy:           'CreatedBy',
  UpdatedAt:           'UpdatedAt',
  UpdatedBy:           'UpdatedBy'
};