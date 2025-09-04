/** String/identity normalizers used for matching */
function normTrim(v){ return (v==null?'':String(v)).trim(); }
function normName(v){ return normTrim(v).replace(/\s+/g,' '); }
function normEmail(v){ return normTrim(v).toLowerCase(); }
function normPhone(v){
  const digits = normTrim(v).replace(/\D/g,'');
  // keep last 10 by default (US style), but preserve full if you prefer:
  return digits.length >= 10 ? digits.slice(-10) : digits;
}