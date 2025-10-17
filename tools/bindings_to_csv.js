const fs = require('fs');
const path = require('path');
const bindings = JSON.parse(fs.readFileSync('tools/bindings.json', 'utf8'));

function findAliases(binding) {
  // open the source file and search nearby lines for "LatexCmds.<NAME> =" that precede this binding.line
  const txt = fs.readFileSync(binding.file, 'utf8');
  const lines = txt.split('\n');
  const lineIndex = binding.line - 1;
  const aliases = new Set();

  // search upward for contiguous assignment block (up to 20 lines back)
  for (let i = lineIndex; i >= Math.max(0, lineIndex - 40); i--) {
    const l = lines[i];
    // match patterns like: LatexCmds.NAME =\n  LatexCmds.ALT =\n    bindVanillaSymbol(...);
    const m = l.match(/LatexCmds\.([\w'"\u0080-\uFFFF]+)/g);
    if (m) {
      m.forEach((token) => {
        const name = token.replace(/^LatexCmds\./, '');
        // filter out numbers, whitespace
        aliases.add(name);
      });
    }
    // stop if we hit a blank line or a comment start
    if (/^\s*$/.test(l) || /^\s*\/\//.test(l)) break;
  }

  return Array.from(aliases).map((a) => a.replace(/^["']|["']$/g, ''));
}

const outRows = [];
const diffRows = [];

for (const b of bindings) {
  const aliases = findAliases(b);
  const aliasStr = aliases.join('|');
  const control = b.controlSeq || '';
  const html = b.htmlEntity || '';
  const ms = b.mathspeak || '';
  outRows.push(
    [b.file, b.line, aliasStr, control, html, ms]
      .map((s) => `"${(s + '').replace(/"/g, '""')}"`)
      .join(',')
  );

  // Determine if alias differs from controlSeq in a meaningful way.
  // Heuristic: if any alias is a single letter (A-Z or a-z) and control contains "mathbb" or contains '{' or backslash plus letters longer than 1
  let differs = false;
  for (const a of aliases) {
    if (/^[A-Za-z]$/.test(a) && /mathbb|\{|\\[a-zA-Z]{2,}/.test(control))
      differs = true;
    if (a && a !== control && control && !control.includes(a)) differs = true;
  }
  if (differs) {
    diffRows.push(
      [b.file, b.line, aliasStr, control, html, ms]
        .map((s) => `"${(s + '').replace(/"/g, '""')}"`)
        .join(',')
    );
  }
}

fs.writeFileSync(
  'tools/bindings_full.csv',
  'file,line,aliases,controlSeq,htmlEntity,mathspeak\n' + outRows.join('\n')
);
fs.writeFileSync(
  'tools/bindings_aliases_diff.csv',
  'file,line,aliases,controlSeq,htmlEntity,mathspeak\n' + diffRows.join('\n')
);
console.log(
  'wrote tools/bindings_full.csv and tools/bindings_aliases_diff.csv'
);
