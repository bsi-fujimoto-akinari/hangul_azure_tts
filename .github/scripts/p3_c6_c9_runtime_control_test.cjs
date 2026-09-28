const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('WebAppCloudflareRuntime.js', 'utf8');
const expectedUrl = 'https://hangul-runtime-prod.akinari-fujimoto.workers.dev';
const secret = 'test-secret-must-never-escape';

function runtime(initial = {}) {
  const values = {
    H3_RUNTIME_AUTHORITY_MODE: 'QUIESCED',
    H3_RUNTIME_CUTOVER_LOCKED: '0',
    H3_RUNTIME_BACKEND_BASE_URL: expectedUrl,
    H3_RUNTIME_BEARER_TOKEN: secret,
    ...initial
  };
  const properties = {
    getProperty: key => values[key] || null,
    setProperties: next => Object.assign(values, next)
  };
  const context = {
    PropertiesService: {getScriptProperties: () => properties},
    LockService: {getScriptLock: () => ({waitLock() {}, releaseLock() {}})},
    Utilities: {getUuid: () => 'trace-test'},
    UrlFetchApp: {fetch: () => ({
      getResponseCode: () => 200,
      getContentText: () => JSON.stringify({
        schema: 'H3_RUNTIME_RPC_RESPONSE_V1', operation: 'HEALTH',
        ok: true, data: {status: 'PASS', database: 'AVAILABLE'}
      })
    })}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return {context, values};
}
const normalized = x => JSON.parse(JSON.stringify(x));

{
  const {context, values} = runtime();
  const before = JSON.stringify(values);
  const result = context.h3RuntimePreC6Readback();
  assert.deepEqual(normalized(result), {
    status: 'PASS', authority_mode: 'QUIESCED',
    cutover_locked: false, mutation_count: 0
  });
  assert.equal(JSON.stringify(values), before);
  assert.equal(JSON.stringify(result).includes(secret), false);
}

{
  const {context} = runtime({H3_RUNTIME_AUTHORITY_MODE: 'LEGACY'});
  assert.deepEqual(normalized(context.h3RuntimePreC6Readback()), {
    status: 'FAIL', authority_mode: 'LEGACY',
    cutover_locked: false, mutation_count: 0
  });
}

{
  const {context} = runtime({
    H3_RUNTIME_AUTHORITY_MODE: 'D1',
    H3_RUNTIME_CUTOVER_LOCKED: '1'
  });
  assert.deepEqual(normalized(context.h3RuntimePreC6Readback()), {
    status: 'FAIL', authority_mode: 'D1',
    cutover_locked: true, mutation_count: 0
  });
}

{
  const {context, values} = runtime();
  assert.deepEqual(normalized(context.h3RuntimeC6Activate()),
    {mode: 'D1', cutover_locked: '1'});
  assert.equal(values.H3_RUNTIME_AUTHORITY_MODE, 'D1');
  assert.equal(values.H3_RUNTIME_CUTOVER_LOCKED, '1');
  const result = context.h3RuntimeC9Readback();
  assert.deepEqual(normalized(result), {
    status: 'PASS', authority_mode: 'D1', cutover_locked: true,
    expected_backend_url: true, bearer_present: true,
    health_status: 'PASS', database_status: 'AVAILABLE',
    worker_d1_route_verified: true, mutation_count: 0
  });
  assert.equal(JSON.stringify(result).includes(secret), false);
}

{
  const {context} = runtime({H3_RUNTIME_AUTHORITY_MODE: 'LEGACY'});
  assert.throws(() => context.h3RuntimeC6Activate(),
    /H3_RUNTIME_AUTHORITY_TRANSITION_CONFLICT/);
}

{
  const {context} = runtime({H3_RUNTIME_BACKEND_BASE_URL: 'https://wrong.invalid'});
  assert.throws(() => context.h3RuntimeC6Activate(),
    /H3_RUNTIME_D1_PREREQUISITE_INVALID/);
}

{
  const {context} = runtime({H3_RUNTIME_AUTHORITY_MODE: 'QUIESCED'});
  const result = context.h3RuntimeC9Readback();
  assert.equal(result.status, 'FAIL');
  assert.equal(result.worker_d1_route_verified, false);
  assert.equal(JSON.stringify(result).includes(secret), false);
}
console.log('P3 pre-C6/C6/C9 runtime wrapper tests: PASS');
