const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync('tools/bindings_raw.json', 'utf8'));
const out = [];

for (const e of raw) {
  const args = e.args.map((a) => a.replace(/\n/g, ' ').trim());
  // normalize up to 3 args: ch, htmlEntity?, mathspeak?
  const ch = args[0] ? args[0].replace(/^['"]|['"]$/g, '') : null;
  const htmlEntity = args[1] ? args[1].replace(/^['"]|['"]$/g, '') : null;
  const mathspeak = args[2] ? args[2].replace(/^['"]|['"]$/g, '') : null;
  out.push({
    file: e.file,
    line: e.startLine,
    controlSeq: ch,
    htmlEntity: htmlEntity,
    mathspeak: mathspeak,
    rawArgs: args,
  });
}
fs.writeFileSync('tools/bindings.json', JSON.stringify(out, null, 2));
console.log('wrote tools/bindings.json with', out.length, 'entries');
