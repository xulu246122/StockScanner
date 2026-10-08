import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverFile = path.join(projectRoot, 'server.ts');
const tsxCli = path.join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const port = 3000;
const url = `http://127.0.0.1:${port}`;

function assertPortAvailable() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => {
      probe.close(error => error ? reject(error) : resolve());
    });
  });
}

async function isServerReady() {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (!existsSync(tsxCli) || !existsSync(serverFile)) {
    throw new Error('Local tsx dependencies are missing. Run npm.cmd ci from the project directory first.');
  }

  try {
    await assertPortAvailable();
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      throw new Error(`Port ${port} is already in use. Close the other local server and try again.`);
    }
    throw error;
  }

  console.log('Starting the V6.5 browser test preview...');
  const server = spawn(process.execPath, [tsxCli, serverFile], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: String(port) },
    stdio: 'inherit'
  });

  const exitResultPromise = new Promise(resolve => {
    server.once('error', error => resolve({ error }));
    server.once('exit', (code, signal) => resolve({ code, signal }));
  });
  let stopping = false;
  const stopServer = () => {
    if (!stopping) {
      stopping = true;
      server.kill();
    }
  };
  process.once('SIGINT', stopServer);
  process.once('SIGTERM', stopServer);

  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline) {
    const exitResult = await Promise.race([exitResultPromise, delay(500).then(() => null)]);
    if (exitResult) {
      if (exitResult.error) throw exitResult.error;
      throw new Error(`The server exited before becoming ready (code ${exitResult.code ?? 'unknown'}).`);
    }
    if (await isServerReady()) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    stopServer();
    await exitResultPromise;
    throw new Error('The server did not respond within 60 seconds. Check the server output above.');
  }

  console.log(`\nTest preview is ready: ${url}`);
  console.log('Keep this window open while using the preview. Press Ctrl+C here to stop it.');
  const exitResult = await exitResultPromise;
  if (exitResult.error) throw exitResult.error;
  if (exitResult.code !== 0 && !stopping) {
    throw new Error(`The server stopped with exit code ${exitResult.code ?? 'unknown'}.`);
  }
}

main().catch(error => {
  console.error(`\nPreview startup failed: ${error.message}`);
  process.exitCode = 1;
});
