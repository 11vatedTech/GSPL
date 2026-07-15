import { main } from './clean.js';
main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => { process.stderr.write(String(err) + '\n'); process.exit(1); });
