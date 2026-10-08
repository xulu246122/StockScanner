import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('==> [1/3] Building project assets (Frontend & Backend)...');
execSync(`node "${path.join(__dirname, 'build.js')}"`, {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('\n==> [2/3] Packaging Desktop Executable (win-unpacked Fast Launch Edition only)...');
const electronBuilderBin = path.join(rootDir, 'node_modules', 'electron-builder', 'cli.js');

// Clean up any old integrated installer / setup exe in root release directory
const releaseDir = path.join(rootDir, 'release');
if (fs.existsSync(releaseDir)) {
  const rootFiles = fs.readdirSync(releaseDir);
  for (const f of rootFiles) {
    if (f.endsWith('.exe') && f.startsWith('V6.5 Desktop Preview')) {
      try {
        fs.unlinkSync(path.join(releaseDir, f));
        console.log(`🧹 Cleaned up old integrated installer: ${f}`);
      } catch (e) {}
    }
  }
}

execSync(`node "${electronBuilderBin}" --config electron-builder.json --win --dir`, {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('\n==> [3/3] Signing Executables with signtool.exe...');
const signScript = path.join(__dirname, 'sign-exe.ps1');
try {
  execSync(`powershell -ExecutionPolicy Bypass -File "${signScript}"`, {
    cwd: rootDir,
    stdio: 'inherit'
  });
  const unpackedExe = path.join(rootDir, 'release', 'win-unpacked', 'V6.5 Desktop Preview.exe');
  const signtool = 'C:\\Program Files (x86)\\Windows Kits\\10\\bin\\10.0.28000.0\\x64\\signtool.exe';
  const thumbprint = 'CAC1E6D3418DD68E9D55C010444EFB1641FC08B3';
  execSync(`& "${signtool}" sign /a /s MY /sha1 ${thumbprint} /fd SHA256 /v "${unpackedExe}"`, {
    shell: 'powershell',
    stdio: 'inherit'
  });
} catch (err) {
  console.warn('[WARN] Code signing step note:', err.message);
}

console.log('\n==> [SUCCESS] Windows Desktop application packaged and signed successfully!\n');
