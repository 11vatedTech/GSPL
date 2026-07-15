import { main } from './check-determinism.js';
main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => { process.stderr.write(String(err) + '\n'); process.exit(1); });
//# sourceMappingURL=check-determinism-bin.js.map