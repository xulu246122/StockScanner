import path from 'path';
import fs from 'fs';

/**
 * Resolves the persistent application data directory.
 * Priority:
 * 1. process.env.V65_DATA_DIR (passed by Electron main process)
 * 2. process.env.PORTABLE_EXECUTABLE_DIR / data (electron-builder portable exe)
 * 3. process.env.ELECTRON_USER_DATA / data (OS %APPDATA% directory)
 * 4. process.cwd() / data (Local development fallback)
 */
export function getDataDir(): string {
  if (process.env.V65_DATA_DIR) {
    const dir = path.resolve(process.env.V65_DATA_DIR);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    }
    return dir;
  }

  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    const dir = path.resolve(process.env.PORTABLE_EXECUTABLE_DIR, 'data');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    }
    return dir;
  }

  if (process.env.ELECTRON_USER_DATA) {
    const dir = path.resolve(process.env.ELECTRON_USER_DATA, 'data');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    }
    return dir;
  }

  const dir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
  return dir;
}

export function getDataFilePath(filename: string): string {
  return path.join(getDataDir(), filename);
}
