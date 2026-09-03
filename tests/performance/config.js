const runId = __ENV.PERF_RUN_ID;

if (!runId) {
  throw new Error('PERF_RUN_ID is required; use the npm performance commands');
}

export const performanceConfig = Object.freeze({
  apiBaseUrl: __ENV.API_BASE_URL || 'http://api:4000',
  password: __ENV.PERF_USER_PASSWORD || 'PerfPass123!',
  runId: runId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 32),
  starterPlanId: '00000000-0000-4000-8000-000000000001',
});
