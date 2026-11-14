const fs = require('fs');
let s = fs.readFileSync('game.js', 'utf8');
const APO = String.fromCharCode(39);
const DQ = String.fromCharCode(34);
function lit(f, t, label) {
  if (!s.includes(f)) { console.error('FALTA ' + (label || f)); process.exit(1); }
  s = s.split(f).join(t);
}
lit("<p>'++t(" + APO + "clearText" + APO + ")+", "<p>'+t(" + APO + "clearText" + APO + ")+", 'clearText');
lit("<p>'++t(" + APO + "saveSlotsQ" + APO + ")+", "<p>'+t(" + APO + "saveSlotsQ" + APO + ")+", 'saveSlotsQ');
lit("<p>'++t(" + APO + "loadSlotsQ" + APO + ")+", "<p>'+t(" + APO + "loadSlotsQ" + APO + ")+", 'loadSlotsQ');
const broken = '+ "' + DQ + '<div class=' + DQ + 'buttonGrid' + DQ + '">' + DQ + '";';
const good = "+ '" + '<div class=' + DQ + 'buttonGrid' + DQ + '>' + APO + ';';
let c = 0;
while (s.includes(broken)) { s = s.replace(broken, good); c++; }
fs.writeFileSync('game.js', s);
console.log('fixes OK, div=' + c);
