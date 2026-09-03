import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import process from 'node:process';

const supportedProfiles = new Set(['load', 'smoke']);
const profile = process.argv[2] ?? 'smoke';
const execution = process.env.K6_EXECUTION ?? 'docker';

if (!supportedProfiles.has(profile)) {
  console.error(`Unknown performance profile: ${profile}`);
  process.exit(2);
}

if (!['docker', 'local'].includes(execution)) {
  console.error(`Unknown k6 execution strategy: ${execution}`);
  process.exit(2);
}

function processError(command, status) {
  const error = new Error(`${command} exited with status ${status}`);
  error.exitCode = status ?? 1;
  return error;
}

function run(command, args, { allowFailure = false, ...options } = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure)
    throw processError(command, result.status);
  return result;
}

function sanitizeSummary(path) {
  const summary = JSON.parse(readFileSync(path, 'utf8'));
  delete summary.setup_data;
  writeFileSync(path, `${JSON.stringify(summary, null, 2)}\n`);
}

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
const requestedRunId = process.env.PERF_RUN_ID ?? `local-${timestamp}`;
const runId = requestedRunId
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 64);

if (!runId) {
  console.error('PERF_RUN_ID must contain at least one letter or number');
  process.exit(2);
}
const resultFile = `${profile}-${runId}.json`;
const environment = {
  ...process.env,
  API_NODE_ENV: 'production',
  PERF_RUN_ID: runId,
};

mkdirSync('performance-results', { recursive: true });
if (execution === 'docker' && process.platform !== 'win32') {
  chmodSync('performance-results', 0o777);
}

let failure;

try {
  run('docker', ['compose', 'up', '--build', '--detach', '--wait', 'api'], {
    env: environment,
  });
  const k6Result =
    execution === 'docker'
      ? run(
          'docker',
          [
            'compose',
            '--profile',
            'performance',
            'run',
            '--rm',
            '--no-deps',
            'k6',
            'run',
            '--summary-export',
            `/results/${resultFile}`,
            `/performance/${profile}.js`,
          ],
          { allowFailure: true, env: environment },
        )
      : run(
          process.env.K6_BINARY ?? 'k6',
          [
            'run',
            '--summary-export',
            `performance-results/${resultFile}`,
            `tests/performance/${profile}.js`,
          ],
          {
            allowFailure: true,
            env: {
              ...environment,
              API_BASE_URL: 'http://localhost:4000',
            },
          },
        );
  const summaryPath = `performance-results/${resultFile}`;
  if (existsSync(summaryPath)) sanitizeSummary(summaryPath);
  if (k6Result.status !== 0) throw processError('k6', k6Result.status);
} catch (error) {
  failure = error;
} finally {
  if (process.env.CI !== 'true') {
    try {
      run(
        'docker',
        ['compose', 'up', '--detach', '--wait', '--force-recreate', 'api'],
        { env: process.env },
      );
    } catch (restoreError) {
      console.error(`Could not restore the local API stack: ${restoreError}`);
      failure ??= restoreError;
    }
  }
}

if (failure) {
  console.error(failure.message);
  process.exit(failure.exitCode ?? 1);
}

console.log(`k6 summary: performance-results/${resultFile}`);
