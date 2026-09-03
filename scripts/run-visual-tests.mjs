import { spawnSync } from 'node:child_process';
import process from 'node:process';

const image = 'mcr.microsoft.com/playwright:v1.62.1-noble';
const updateSnapshots = process.argv.includes('--update-snapshots');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VISUAL_TEST_IN_CONTAINER === 'true') {
  run('npm', ['run', 'db:migrate']);
  run('npx', [
    'playwright',
    'test',
    '--project=visual',
    ...(updateSnapshots ? ['--update-snapshots'] : []),
  ]);
  process.exit(0);
}

run('docker', ['compose', 'up', '-d', 'postgres']);

const workspace = process.cwd();
const databaseUrl =
  process.env.VISUAL_DATABASE_URL ??
  'postgresql://releaseguard:releaseguard_dev@host.docker.internal:5433/releaseguard';
const containerCommand = [
  'npm ci',
  `node scripts/run-visual-tests.mjs${updateSnapshots ? ' --update-snapshots' : ''}`,
].join(' && ');

run('docker', [
  'run',
  '--rm',
  '--ipc=host',
  '--add-host',
  'host.docker.internal:host-gateway',
  '--volume',
  `${workspace}:/work`,
  '--volume',
  'releaseguard-visual-node-modules:/work/node_modules',
  '--workdir',
  '/work',
  '--env',
  `DATABASE_URL=${databaseUrl}`,
  '--env',
  'ENABLE_TEST_CONTROLS=true',
  '--env',
  'JWT_SECRET=releaseguard-visual-container-only-secret',
  '--env',
  'VISUAL_TEST_IN_CONTAINER=true',
  image,
  'bash',
  '-lc',
  containerCommand,
]);
