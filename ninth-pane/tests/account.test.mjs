import test from 'node:test';
import assert from 'node:assert/strict';

let sequence = 0;
async function identityAt(hostname, packet, status = 200) {
  globalThis.location = { hostname };
  let calls = 0;
  globalThis.fetch = async (path, options) => {
    calls++;
    assert.equal(path, '/api/customer/session');
    assert.equal(options.credentials, 'include');
    assert.equal(options.cache, 'no-store');
    if (packet instanceof Error) throw packet;
    return { ok: status === 200, json: async () => packet };
  };
  const module = await import(`../dist/account.js?test=${++sequence}`);
  return { result: await module.missionIdentity(), calls, module };
}

test('deployed game requires a verified account, assignment and account-specific storage key', async () => {
  const packet = { authenticated: true, account: { agent_designator: 'Agent Eldris' },
    missions: { ninth_pane: true, storage_key: 'a'.repeat(64) } };
  const staging = await identityAt('bureau-obscura-staging.bureauobscura.workers.dev', packet);
  assert.equal(staging.result.allowed, true);
  assert.equal(new URL(staging.module.accountLinks.signIn).hostname, 'bureau-obscura-staging.bureauobscura.workers.dev');
  const allowed = await identityAt('api.bureauobscura.com', packet);
  assert.equal(allowed.result.allowed, true);
  assert.equal(allowed.module.accountLinks.signIn, 'https://bureauobscura.com/the-ninth-pane');
  assert.equal(allowed.result.storageKey, packet.missions.storage_key);
  assert.equal(allowed.module.displayAgent(allowed.result), 'Agent Eldris');
  for (const data of [
    { ...packet, authenticated: false },
    { ...packet, authenticated: 'true' },
    { ...packet, missions: { ninth_pane: 'true', storage_key: 'a'.repeat(64) } },
    { ...packet, missions: { ninth_pane: true } },
    { ...packet, missions: { ninth_pane: true, storage_key: 'Agent Eldris' } },
    {},
  ]) assert.equal((await identityAt('api.bureauobscura.com', data)).result.allowed, false);
});

test('hosted failures and unexpected hosts deny access', async () => {
  assert.equal((await identityAt('api.bureauobscura.com', {}, 401)).result.allowed, false);
  const failed = await identityAt('api.bureauobscura.com', new Error('offline'));
  assert.deepEqual(failed.result, { allowed: false, unavailable: true });
  for (const hostname of ['bureau-the-ninth-pane.eldris.chatgpt.site', 'api.bureauobscura.com.attacker.test', 'example.com']) {
    const denied = await identityAt(hostname, {});
    assert.equal(denied.result.allowed, false);
    assert.equal(denied.calls, 0);
  }
});

test('only loopback previews use the development identity', async () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    const local = await identityAt(hostname, {});
    assert.equal(local.result.allowed, true);
    assert.equal(local.result.local, true);
    assert.equal(local.calls, 0);
  }
});
