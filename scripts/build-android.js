import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const releaseDir = path.join(rootDir, 'release');

console.log('================================================================');
console.log('🚀 [Android Build Pipeline] Starting Release APK Packaging');
console.log('================================================================');

// 1. Build Frontend with Vite
console.log('\n==> [1/4] Building frontend assets with Vite...');
execSync(`node "${path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')}" build`, {
  cwd: rootDir,
  stdio: 'inherit'
});

// 2. Sync Capacitor Android
console.log('\n==> [2/4] Syncing Capacitor Android assets & native bridges...');
execSync(`node "${path.join(rootDir, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor')}" sync android`, {
  cwd: rootDir,
  stdio: 'inherit'
});

// 3. Compile Android Release APK with Gradle
console.log('\n==> [3/4] Compiling signed Android Release APK with Gradle...');
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'cmd /c "gradlew.bat assembleRelease"' : './gradlew assembleRelease';

execSync(gradlewCmd, {
  cwd: androidDir,
  stdio: 'inherit'
});

// 4. Publish Release APK directly to release/ directory (Strict Versioning & Single File Rule)
console.log('\n==> [4/4] Publishing Release APK to root release/ directory...');
const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(generatedApk)) {
  throw new Error(`Release APK not found at: ${generatedApk}`);
}

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Version management: StcokScanner / StockScanner V6.01, increment by 0.01 on each build
const versionFile = path.join(releaseDir, 'version.json');
let targetVersion = '6.01';

// Check if version was specified via CLI args (e.g. node scripts/build-android.js --version=6.01)
const cliVersionArg = process.argv.find(arg => arg.startsWith('--version=') || /^\d+\.\d+$/.test(arg));
if (cliVersionArg) {
  targetVersion = cliVersionArg.replace('--version=', '');
} else if (fs.existsSync(versionFile)) {
  try {
    const vMeta = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    if (vMeta.version) {
      const nextNum = parseFloat(vMeta.version) + 0.01;
      targetVersion = nextNum.toFixed(2);
    }
  } catch (err) {
    console.warn('⚠️ Failed to parse version.json, defaulting to 6.01');
  }
} else {
  // Check if existing APK in release directory has a version number
  const existingApks = fs.readdirSync(releaseDir).filter(f => f.endsWith('.apk'));
  for (const apk of existingApks) {
    const match = apk.match(/V(\d+\.\d+)/i);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (parsed >= 6.01) {
        targetVersion = (parsed + 0.01).toFixed(2);
      }
    }
  }
}

// Single-file policy: Clean up ANY older / duplicate APKs in release/ directory
const oldApks = fs.readdirSync(releaseDir).filter(f => f.endsWith('.apk'));
for (const oldApk of oldApks) {
  try {
    fs.unlinkSync(path.join(releaseDir, oldApk));
    console.log(`🧹 Cleaned up old/duplicate APK: ${oldApk}`);
  } catch (e) {
    console.warn(`Could not remove ${oldApk}:`, e);
  }
}

// Publish single target APK: StockScanner V[Version].apk
const apkFileName = `StockScanner V${targetVersion}.apk`;
const targetApk = path.join(releaseDir, apkFileName);
fs.copyFileSync(generatedApk, targetApk);

// Update version metadata file
fs.writeFileSync(versionFile, JSON.stringify({
  version: targetVersion,
  fileName: apkFileName,
  updatedAt: new Date().toISOString()
}, null, 2), 'utf8');

const stats = fs.statSync(targetApk);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n================================================================');
console.log('✅ [SUCCESS] Android Release APK Packaged to release/ Successfully!');
console.log(`📦 Release File: ${apkFileName}`);
console.log(`📁 Absolute Path: ${targetApk}`);
console.log(`📊 File Size   : ${stats.size.toLocaleString()} bytes (~${sizeMB} MB)`);
console.log(`🏷️ Version     : V${targetVersion} (Next build will be V${(parseFloat(targetVersion) + 0.01).toFixed(2)})`);
console.log(`⏰ Updated At  : ${stats.mtime.toLocaleString()}`);
console.log('================================================================\n');
