// Write the approved facts into spoodex.html between the GENUS_LIT markers.
// Usage: node tools/lit_bake.mjs tools/lit-facts.json <verdictsDir|--all> spoodex.html [--print]
//   verdictsDir: ArtifactData list output (out_dir), i.e. <dir>/verdicts/<id>.json files (may be missing or empty); --all bakes every fact (testing only)
//   A fact goes in when its verdict is keep or edit, or when it has no verdict and carries ok (the date the owner approved it outside the page).
//   A drop verdict always wins.
import fs from 'node:fs';
import path from 'node:path';
const [factsFile, vsrc, app, flag] = process.argv.slice(2);
const { facts } = JSON.parse(fs.readFileSync(factsFile, 'utf8'));
const V = {};
if (vsrc !== '--all') {
  const d = path.join(vsrc, 'verdicts');
  for (const f of fs.existsSync(d) ? fs.readdirSync(d) : []) { const j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); const x = j.data || j; V[path.basename(f, '.json')] = x; }
}
const by = new Map();
let kept = 0, edited = 0;
for (const f of facts) {
  const v = vsrc === '--all' ? { v:'keep' } : V[f.id] || (f.ok ? { v:'keep' } : null);
  if (!v || (v.v !== 'keep' && v.v !== 'edit')) continue;
  const t = v.v === 'edit' && v.t ? v.t : f.t; v.v === 'edit' ? edited++ : kept++;
  const sp = f.sp ? (String(f.sp).includes(',') ? String(f.sp).split(/\s*,\s*/) : f.sp) : null;
  const e = { t, s:f.short, d:f.doi || f.href || '' }; if (sp) e.sp = sp;
  if (!by.has(f.g)) by.set(f.g, []); by.get(f.g).push(e);
}
const q = s => JSON.stringify(s);
const ent = e => `{ t:${q(e.t)}, s:${q(e.s)}, d:${q(e.d)}${e.sp ? `, sp:${q(e.sp)}` : ''} }`;
const block = `const GENUS_LIT = {\n${[...by.keys()].sort().map(g => `  ${q(g)}: [\n${by.get(g).map(e => `    ${ent(e)},`).join('\n')}\n  ],`).join('\n')}\n};`;
const body = by.size ? block : 'const GENUS_LIT = {};';
if (flag === '--print') { console.log(body); process.exit(0); }
const src = fs.readFileSync(app, 'utf8'), eol = src.includes('\r\n') ? '\r\n' : '\n';
const a = src.indexOf('// GENUS_LIT:begin' + eol), b = src.indexOf('// GENUS_LIT:end');
if (a < 0 || b < a) throw new Error('markers not found');
fs.writeFileSync(app, src.slice(0, a) + '// GENUS_LIT:begin' + eol + body.replace(/\n/g, eol) + eol + src.slice(b));
console.log(`baked ${kept + edited} lines (${kept} kept, ${edited} reworded) for ${by.size} genera`);
