import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('==> [1/2] Building frontend (Vite)...');
execSync(`node "${path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')}" build`, {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('\n==> [2/2] Building backend (esbuild CommonJS)...');
execSync(`node "${path.join(rootDir, 'node_modules', 'esbuild', 'bin', 'esbuild')}" server.ts --bundle --platform=node --target=node18 --outfile=dist/server.cjs --external:sqlite3 --external:sql.js --external:vite --external:@vitejs/* --format=cjs`, {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('\n==> [SUCCESS] Full project build completed successfully!\n');
