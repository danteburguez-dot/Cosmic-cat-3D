const fs = require('fs');
const s = fs.readFileSync('game.js', 'utf8').replace(/\r\n/g, '\n');
let bal = 0, inStr = null, esc = false, inLine = false, inBlock = false;
const tplStack = [];
let line = 1, events = 0;
for (let i = 0; i < s.length && events < 40; i++) {
  const c = s[i];
  if (c === '\n') { line++; continue; }
  if (inLine) continue;
  if (inBlock) { if (c === '*' && s[i + 1] === '/') { inBlock = false; i++; } continue; }
  if (inStr) {
    if (esc) { esc = false; i++; continue; }
    if (c === '\\') { esc = true; i++; continue; }
    if (inStr === '`' && c === '$' && s[i + 1] === '{') { tplStack.push(1); inStr = null; bal++; i++; events++; console.log('L' + line + ' ${ abierto (bal=' + bal + ') ctx: ' + JSON.stringify(s.slice(Math.max(0, i - 40), i + 5))); continue; }
    if (c === inStr) { inStr = null; i++; events++; console.log('L' + line + ' cadena cerrada (bal=' + bal + ') ctx: ' + JSON.stringify(s.slice(Math.max(0, i - 40), i + 5))); continue; }
    continue;
  }
  if (c === '/' && s[i + 1] === '/') { inLine = true; i++; continue; }
  if (c === '/' && s[i + 1] === '*') { inBlock = true; i++; continue; }
  if (c === "'" || c === '"' || c === '`') { inStr = c; i++; events++; console.log('L' + line + ' cadena abierta (' + c + ') ctx: ' + JSON.stringify(s.slice(Math.max(0, i - 40), i + 5))); continue; }
  if (c === '{') { bal++; i++; continue; }
  if (c === '}') { if (tplStack.length) { tplStack.pop(); inStr = '`'; } bal--; i++; continue; }
}
