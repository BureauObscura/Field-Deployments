import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';

const appSource = (await fs.readFile(new URL('../dist/app.js', import.meta.url), 'utf8'))
  .replace(/^import .+;\n/gm, '');
const gameFiles = await fs.readdir(new URL('../dist/games/', import.meta.url));
const gameData = new Map(await Promise.all(gameFiles.filter(name => name.endsWith('.json')).map(async name =>
  [name, JSON.parse(await fs.readFile(new URL(`../dist/games/${name}`, import.meta.url), 'utf8'))])));
const example = gameData.get('sand-map.json');
const allowed = name => ({allowed: true, agentDesignator: name, storageKey: name.toLowerCase().repeat(64).slice(0, 64)});
const accountA = allowed('A'), accountB = allowed('B');
const keyFor = account => `bureau-deployments-v1:${account.storageKey}`;
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}
function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    async dispatch(type, event = {}) {
      await Promise.all((listeners.get(type) || []).map(callback => callback(event)));
      await flush();
    },
  };
}
function element() {
  const attributes = new Map(), classes = new Set();
  return {
    ...eventTarget(), attributes, innerHTML: '', textContent: '', open: false, scrollTop: 0,
    classList: {add: value => classes.add(value), remove: value => classes.delete(value)},
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
    close() { this.open = false; }, showModal() { this.open = true; }, focus() {},
  };
}
function savedBook(state) {
  return JSON.stringify({[example.slug]: {state, checkpoints: [], endings: []}});
}
function harness({storage = new Map(), deferGames = false} = {}) {
  const nodes = new Map(['#app', '#dialog', '#dialog-body', '#notice'].map(id => [id, element()]));
  const document = {...eventTarget(), hidden: false, title: '', activeElement: null, querySelector: id => nodes.get(id) || null};
  const window = {...eventTarget(), scrollTo() {}};
  const identityRequests = [], gameRequests = [], reads = [], writes = [], reloads = [];
  const location = {href: 'https://api.bureauobscura.com/missions/deployments/?game=sand-map', reload: () => reloads.push(true)};
  const context = vm.createContext({
    engine, document, window, location, URL, structuredClone, console, setTimeout, clearTimeout,
    localPreview: false, accountLinks: {home: '/', fieldRecovery: '/field-recovery', signIn: '/deployments'},
    displayAgent: identity => `Agent ${identity.agentDesignator}`, instrument: () => '',
    Atmosphere: class { enabled = false; pause() {} setScene() {} cue() {} },
    localStorage: {
      getItem(key) { reads.push(key); return storage.get(key) ?? null; },
      setItem(key, value) { writes.push({key, value}); storage.set(key, value); },
    },
    missionIdentity() {
      const request = deferred(); identityRequests.push(request); return request.promise;
    },
    fetch(url) {
      const name = String(url).replace(/^games\//, '');
      assert.ok(gameData.has(name), `Unexpected fetch: ${url}`);
      const request = {...deferred(), name}; gameRequests.push(request);
      const response = {ok: true, json: async () => structuredClone(gameData.get(name))};
      if (!deferGames) request.resolve(response);
      request.respond = () => request.resolve(response);
      return request.promise;
    },
  });
  vm.runInContext(`${appSource}\n;globalThis.testApp = {
    refresh,
    snapshot: () => ({identity, ready, storageKey, gameCount: games.length, gameSlug: game?.slug, state, book})
  };`, context, {filename: 'dist/app.js'});
  return {
    ...context.testApp, document, window, nodes, identityRequests, gameRequests, reads, writes, reloads,
    async identity(index, result) { identityRequests[index].resolve(result); await flush(); },
    async action(action, id) {
      const node = {disabled: false, dataset: {action, id}};
      await document.dispatch('click', {target: {closest: () => node}});
    },
    async resolveGames(start = 0) { gameRequests.slice(start).forEach(request => request.respond()); await flush(); },
  };
}

test('account A, denial, then account B reloads before reusing A progress', async () => {
  const clue = example.evidence.find(item => !item.intervention);
  const progressA = engine.inspect(example, engine.travel(example, engine.begin(example, engine.freshState(example)), clue.location), clue.id);
  const progressB = engine.freshState(example);
  const storage = new Map([[keyFor(accountA), savedBook(progressA)], [keyFor(accountB), savedBook(progressB)]]);
  const app = harness({storage});
  await app.identity(0, accountA);
  assert.equal(app.snapshot().ready, true);
  assert.equal(app.snapshot().state.evidence.includes(clue.id), true);

  const denied = app.refresh();
  await app.identity(1, {allowed: false}); await denied;
  assert.equal(app.snapshot().ready, false);
  assert.match(app.nodes.get('#app').innerHTML, /Sign in to deploy/);
  await app.action('travel', example.start);
  assert.equal(app.writes.length, 0, 'Denied sessions cannot save actions');

  const switched = app.refresh();
  await app.identity(2, accountB); await switched;
  assert.equal(app.reloads.length, 1, 'A different verified account must trigger a full reload');
  assert.equal(app.snapshot().ready, false);
  assert.equal(app.reads.includes(keyFor(accountB)), false, 'The old app must not partially load B into A state');
  assert.equal(app.writes.length, 0);

  const reloaded = harness({storage});
  await reloaded.identity(0, accountB);
  assert.equal(reloaded.snapshot().storageKey, keyFor(accountB));
  assert.equal(reloaded.snapshot().state.started, false);
  assert.equal(reloaded.snapshot().state.evidence.length, 0);
  assert.equal(reloaded.reads.includes(keyFor(accountA)), false);
});

test('hiding during the initial game fetch cannot leave a half-initialized app on resume', async () => {
  const progress = engine.begin(example, engine.freshState(example));
  const app = harness({deferGames: true, storage: new Map([[keyFor(accountA), savedBook(progress)]])});
  await app.identity(0, accountA);
  assert.equal(app.gameRequests.length, 5);
  app.document.hidden = true;
  await app.document.dispatch('visibilitychange');
  await app.resolveGames();
  assert.equal(app.snapshot().ready, false);
  assert.equal(app.snapshot().gameCount, 0, 'A stale load must not publish its games before initialization');
  assert.equal(app.snapshot().storageKey, '');
  assert.equal(app.reads.length, 0);

  app.document.hidden = false;
  const resumed = app.document.dispatch('visibilitychange');
  await app.identity(1, accountA);
  assert.equal(app.gameRequests.length, 10);
  await app.resolveGames(5); await resumed;
  const actual = app.snapshot();
  assert.equal(actual.ready, true);
  assert.equal(actual.gameCount, 5);
  assert.equal(actual.storageKey, keyFor(accountA));
  assert.equal(actual.gameSlug, example.slug);
  assert.equal(actual.state.started, true);
  assert.equal(app.nodes.get('#app').attributes.has('inert'), false);
  assert.match(app.nodes.get('#app').innerHTML, /scene-stage/);
});

test('focus rechecks even a ready visible app and blocks actions while identity is pending', async () => {
  const app = harness();
  await app.identity(0, accountA);
  assert.equal(app.snapshot().ready, true);
  const focused = app.window.dispatch('focus');
  assert.equal(app.identityRequests.length, 2);
  assert.equal(app.snapshot().ready, false);
  assert.equal(app.nodes.get('#app').attributes.has('inert'), true);
  await app.action('deploy');
  assert.equal(app.snapshot().state.started, false);
  assert.equal(app.writes.length, 0);
  await app.identity(1, accountA); await focused;
  assert.equal(app.snapshot().ready, true);
  assert.equal(app.nodes.get('#app').attributes.has('inert'), false);
  assert.equal(app.gameRequests.length, 5, 'Verified same-account focus preserves the initialized game');

  const switchedFocus = app.window.dispatch('focus');
  await app.identity(2, accountB); await switchedFocus;
  assert.equal(app.reloads.length, 1);
  assert.equal(app.snapshot().ready, false);
  assert.equal(app.nodes.get('#app').attributes.has('inert'), true);
  assert.equal(app.writes.length, 0);
});
