const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const compiled = path.join(root, 'build', 'contracts', 'product.json');
const destination = path.join(root, 'src', 'product.json');
if (!fs.existsSync(compiled)) {
  console.error('Contract artifact not found. Run truffle compile and truffle migrate first.');
  process.exit(1);
}
fs.copyFileSync(compiled, destination);
console.log('Contract artifact copied to src/product.json');
