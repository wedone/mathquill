const fs = require('fs');
const path = require('path');

function extract(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const lines = txt.split('\n');
  const results = [];

  // naive state machine: find occurrences of bindVanillaSymbol( and capture until matching )
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let idx = line.indexOf('bindVanillaSymbol(');
    while (idx !== -1) {
      // start position in file
      let startLine = i;
      let startCol = idx + line.slice(idx).indexOf('(') + 1; // not precise but ok
      // capture whole call
      let depth = 0;
      let acc = '';
      let j = i;
      let k = idx + 'bindVanillaSymbol'.length;
      let found = false;
      for (; j < lines.length; j++) {
        const rest = lines[j] + '\n';
        for (let cpos = j === i ? k : 0; cpos < rest.length; cpos++) {
          const ch = rest[cpos];
          if (ch === '(') {
            depth++;
            if (!found) found = true;
          }
          if (found) acc += ch;
          if (ch === ')') {
            depth--;
            if (found && depth === 0) {
              j = j;
              found = false;
              break;
            }
          }
        }
        if (!found) break;
      }
      // now acc includes from first '(' to last ')'
      const raw = acc;
      // extract comma separated args at top level
      const args = [];
      let cur = '';
      let d = 0;
      for (let t = 0; t < raw.length; t++) {
        const ch = raw[t];
        if (ch === '(') {
          d++;
          if (d === 1) continue;
        }
        if (ch === ')') {
          d--;
          if (d === 0) break;
        }
        if (ch === ',' && d === 1) {
          args.push(cur.trim());
          cur = '';
          continue;
        }
        cur += ch;
      }
      if (cur.trim()) args.push(cur.trim());

      results.push({
        file: filePath,
        startLine: startLine + 1,
        raw: raw.trim(),
        args,
      });

      // look for next occurrence on same line
      idx = line.indexOf('bindVanillaSymbol(', idx + 1);
    }
  }
  return results;
}

const files = [
  'src/commands/math/advancedSymbols.ts',
  'src/commands/math/basicSymbols.ts',
];
let all = [];
for (const f of files) {
  const r = extract(path.join(process.cwd(), f));
  all = all.concat(r);
}
fs.mkdirSync('tools', { recursive: true });
fs.writeFileSync('tools/bindings_raw.json', JSON.stringify(all, null, 2));
console.log('wrote tools/bindings_raw.json with', all.length, 'entries');
