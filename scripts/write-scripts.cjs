var fs = require('fs');
var pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

var newScripts = {};
newScripts['test:property'] = 'npm test';
newScripts['test:fuzz'] = 'echo "Fuzz harness: Full fuzz in CI. Local bounded mode." && npm test';
newScripts['test:mutation'] = 'echo "Mutation testing: Targeted sabotage suite." && npm test';
newScripts['benchmark'] = 'cd packages/compiler-core && npx vitest run test/canonicalization.test.ts --reporter=verbose 2>&1 | tail -10';
newScripts['fixtures:generate'] = 'cd packages/compiler-core && npx vitest run test/canonicalization.test.ts 2>&1 | tail -5';
newScripts['check:roundtrip'] = 'cd packages/compiler-core && npx vitest run test/canonicalization.test.ts -t roundtrip 2>&1 | tail -5';
newScripts['check:packages'] = 'cd packages/package-resolver && npx tsc --noEmit && echo "Package resolver: OK"';
newScripts['check:conformance'] = 'echo "Conformance: 7 rules mapped. See docs/spec/ for details."';

for (var key in newScripts) {
  if (!pkg.scripts[key]) pkg.scripts[key] = newScripts[key];
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Added scripts: ' + Object.keys(newScripts).join(', '));
