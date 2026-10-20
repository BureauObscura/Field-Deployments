import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import * as engine from '../dist/engine.js';
import {readGames, validateGame} from '../scripts/check.mjs';

const games = await readGames();
const source = (await fs.readFile(new URL('../dist/app.js', import.meta.url), 'utf8'))
  .replace(/^import .+;\n/gm, '').replace(/\nrefresh\(\);\s*$/, '');
const decode = text => text.replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function viewer(game, clue, {baseline = true, recorded = false, inRoom = true} = {}) {
  const listeners = new Map();
  const body = {innerHTML: '', querySelector: () => ({focus() {}})};
  const dialog = {addEventListener() {}, open: true};
  const context = vm.createContext({
    engine, targetGame: game, targetClue: clue, baseline, recorded, inRoom, localPreview: false,
    document: {querySelector: id => id === '#dialog-body' ? body : dialog,
      addEventListener: (type, fn) => listeners.set(type, fn)},
    window: {addEventListener() {}},
    Atmosphere: class {}, console,
  });
  vm.runInContext(`${source}\n
    game=targetGame; ready=true;
    state=engine.begin(game,engine.freshState(game));
    if(baseline){state=engine.travel(game,state,game.baseline.location);state=engine.survey(game,state);}
    state=engine.travel(game,state,targetClue.location);
    if(recorded)state=engine.inspect(game,state,targetClue.id);
    if(!inRoom)state=engine.travel(game,state,game.scenes.find(s=>s.id!==targetClue.location).id);
    modal={kind:'evidence',id:targetClue.id}; renderModal();
    globalThis.currentState=()=>JSON.stringify(state);
  `, context);
  return {html: () => decode(body.innerHTML), state: context.currentState,
    enlarge: () => listeners.get('click')({target: {closest: () => ({dataset: {action: 'enlarge-evidence'}})}})};
}

test('all 60 examinations show their own photograph and specific action before recording', () => {
  const paths = new Set(), actions = new Set();
  for (const game of games) for (const clue of game.evidence) {
    const view = viewer(game, clue), html = view.html();
    assert.ok(html.includes(`src="${clue.visual.image}"`), `${game.slug}/${clue.id}: wrong photograph`);
    assert.ok(html.includes(clue.examination.lead));
    assert.ok(html.includes(clue.examination.action));
    assert.ok(!html.includes(clue.body[0]), 'Unperformed observations cannot appear as completed findings');
    assert.ok(!html.includes('<svg'), 'Evidence cannot fall back to a decorative diagram');
    assert.match(html, /data-action="inspect"/);
    paths.add(clue.visual.image); actions.add(`${game.slug}/${clue.examination.action}`);
  }
  assert.equal(paths.size, 60);
  assert.equal(actions.size, 60);
});

test('recorded observations retain their photograph and show the actual finding', () => {
  for (const game of games) for (const clue of game.evidence) {
    const html = viewer(game, clue, {recorded: true}).html();
    assert.ok(html.includes(clue.visual.image));
    assert.ok(html.includes(clue.body[0]));
    assert.ok(html.includes(clue.excerpt));
    assert.ok(!html.includes('data-action="inspect"'), 'A finding must not be recorded twice');
  }
});

test('test images do not bypass baseline or location requirements', () => {
  for (const game of games) {
    const clue = game.evidence.find(e => e.intervention);
    const blocked = viewer(game, clue, {baseline: false}).html();
    assert.ok(blocked.includes(clue.visual.image));
    assert.ok(blocked.includes('Take your baseline'));
    assert.ok(!blocked.includes('data-action="inspect"'));
    const elsewhere = viewer(game, clue, {inRoom: false}).html();
    assert.ok(elsewhere.includes('Return to '));
    assert.ok(!elsewhere.includes('data-action="inspect"'));
  }
});

test('enlarging a photograph preserves progress and returns to the same observation', async () => {
  const game = games[0], clue = game.evidence[0], view = viewer(game, clue);
  const before = view.state();
  await view.enlarge();
  assert.match(view.html(), /is-enlarged/);
  assert.match(view.html(), /aria-expanded="true"/);
  assert.equal(view.state(), before);
  await view.enlarge();
  assert.match(view.html(), /aria-expanded="false"/);
  assert.equal(view.state(), before);
  assert.ok(view.html().includes(clue.examination.action));
});

test('the schema rejects shared art, missing descriptions and generic inspection controls', () => {
  const game = structuredClone(games[0]);
  game.evidence[1].visual.image = game.evidence[0].visual.image;
  game.evidence[0].visual.alt = '';
  game.evidence[0].examination.action = 'Inspect and record';
  const errors = validateGame(game);
  for (const pattern of [/photograph must match/, /photograph reused/, /visual.alt/, /generic examination/]) {
    assert.ok(errors.some(error => pattern.test(error)), String(pattern));
  }
});
