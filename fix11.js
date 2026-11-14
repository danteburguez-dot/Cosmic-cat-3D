const fs = require('fs');
let s = fs.readFileSync('game.js', 'utf8');
const APO = String.fromCharCode(39);
const DQ = String.fromCharCode(34);
const broken = '+ "' + '<div class=' + DQ + 'buttonGrid' + DQ + '>' + DQ + '";';
const good = "+ '" + '<div class=' + DQ + 'buttonGrid' + DQ + '>' + APO + ';';
let c = 0;
while (s.includes(broken)) { s = s.replace(broken, good); c++; }
fs.writeFileSync('game.js', s);
console.log('div corregidos: ' + c);
