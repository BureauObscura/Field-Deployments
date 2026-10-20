import test from 'node:test';
import assert from 'node:assert/strict';
import { scenes, evidence, deductions } from '../dist/story.js';
import {
  SAVE_VERSION, freshState, begin, travel, inspect, connect, decide,
  setProcedure, endingAvailability, finish, restoreState, epilogue,
} from '../dist/engine.js';

const copy = value => JSON.parse(JSON.stringify(value));
const firstEvidence = Object.keys(evidence)[0];
const safeOrder = ['vent', 'cool', 'door'];
const endingIds = ['cool', 'carry', 'stay', 'break'];

function collect(state, ids) {
  state = survey(state);
  for (const id of ids) {
    assert.ok(evidence[id], `Unknown story evidence: ${id}`);
    assert.ok(scenes[evidence[id].location], `Invalid evidence location: ${id}`);
    state = travel(state, evidence[id].location);
    state = inspect(state, id);
    assert.ok(state.evidence.includes(id), `Could not collect ${id}`);
  }
  return state;
}

function establish(state, id, pair = deductions[id].pairs[0]) {
  state = collect(state, pair);
  const result = connect(state, pair);
  assert.equal(result.success, true, `${id} must be deducible`);
  assert.equal(result.id, id);
  return result.state;
}

function survey(state = begin(freshState())) {
  return decide(travel(state, 'nave'), 'survey', 'done');
}

function understood() {
  let state = survey();
  state = establish(state, 'heat');
  return establish(state, 'boundary');
}

function chooseCutting(state, value) {
  state = collect(state, ['graft', 'carrier']);
  return decide(travel(state, 'potting'), 'cutting', value);
}

function readyFor(id, cutting) {
  let state = id === 'cool' || id === 'carry' ? understood() : survey();
  if (id === 'cool') state = setProcedure(state, safeOrder).state;
  if (id === 'break') state = collect(state, ['footprints', 'thermal']);
  if (cutting || id === 'carry') state = chooseCutting(state, cutting || 'living');
  return state;
}

function terminalState(id, cutting) {
  const state = readyFor(id, cutting);
  assert.equal(endingAvailability(state, id).available, true);
  return finish(state, id);
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

test('fresh sessions are independent and cannot act before beginning', () => {
  const state = freshState();
  const other = freshState();
  assert.equal(state.version, 2);
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.started, false);
  assert.deepEqual(state.visited, ['gate']);
  state.evidence.push('test-only');
  assert.deepEqual(other.evidence, []);
  assert.deepEqual(travel(other, evidence[firstEvidence].location), other);
  assert.deepEqual(inspect(other, firstEvidence), other);
  assert.deepEqual(decide(other, 'brief', 'read'), other);
  assert.deepEqual(decide(other, 'survey', 'done'), other);
  assert.deepEqual(decide(other, 'cutting', 'living'), other);
  assert.equal(connect(other, deductions.heat.pairs[0]).success, false);
  assert.equal(setProcedure(other, safeOrder).success, false);
  for (const id of endingIds) assert.deepEqual(finish(other, id), other);
});

test('evidence belongs to its room and can be recorded only once', () => {
  const [id, item] = Object.entries(evidence).find(([, item]) => item.location !== 'gate');
  let state = travel(survey(), 'gate');
  assert.strictEqual(inspect(state, id), state);
  state = travel(state, item.location);
  const recorded = inspect(state, id);
  assert.deepEqual(recorded.evidence, [id]);
  assert.equal(recorded.log.length, state.log.length + 1);
  assert.strictEqual(inspect(recorded, id), recorded);
  assert.strictEqual(inspect(recorded, 'missing-evidence'), recorded);
  assert.strictEqual(inspect(recorded, '__proto__'), recorded);
  assert.strictEqual(travel(recorded, 'missing-room'), recorded);
});

test('free exploration and evidence collection never spend or change decisions', () => {
  let state = chooseCutting(understood(), 'living');
  state = decide(state, 'brief', 'read');
  state = setProcedure(state, safeOrder).state;
  const choices = copy(state.choices);
  const procedure = copy(state.procedure);
  const established = copy(state.deductions);
  for (const id of Object.keys(scenes)) state = travel(state, id);
  state = collect(state, Object.keys(evidence));
  for (const id of Object.keys(scenes).reverse()) state = travel(state, id);
  assert.deepEqual(state.choices, choices);
  assert.deepEqual(state.procedure, procedure);
  assert.deepEqual(state.deductions, established);
  assert.equal(state.evidence.length, Object.keys(evidence).length);
  assert.equal(new Set(state.visited).size, state.visited.length);
  assert.equal(state.ending, null);
});

test('invalid, unrecorded, and duplicate evidence combinations establish nothing', () => {
  let state = begin(freshState());
  assert.equal(connect(state, deductions.heat.pairs[0]).success, false);
  state = collect(state, Object.keys(evidence));
  const ids = Object.keys(evidence);
  const validPairs = Object.values(deductions).flatMap(d => d.pairs);
  const invalidPair = ids.flatMap((a, i) => ids.slice(i + 1).map(b => [a, b]))
    .find(pair => !validPairs.some(valid => valid.every(id => pair.includes(id))));
  assert.ok(invalidPair, 'Story should contain observations without an automatic connection');
  for (const pair of [null, undefined, [], [firstEvidence], [firstEvidence, firstEvidence], [firstEvidence, 'unknown'], invalidPair]) {
    const result = connect(state, pair);
    assert.equal(result.success, false);
    assert.strictEqual(result.state, state);
    assert.deepEqual(result.state.deductions, []);
  }
});

test('every authored evidence pair works in either order and is idempotent', () => {
  assert.ok(Object.values(deductions).some(d => d.pairs.length > 1), 'Alternate evidence paths must exist');
  for (const [id, deduction] of Object.entries(deductions)) {
    for (const authoredPair of deduction.pairs) {
      assert.equal(authoredPair.length, 2);
      assert.notEqual(authoredPair[0], authoredPair[1]);
      for (const pair of [authoredPair, [...authoredPair].reverse()]) {
        const state = establish(begin(freshState()), id, pair);
        assert.deepEqual(state.deductions, [id]);
        const duplicate = connect(state, pair);
        assert.equal(duplicate.success, true);
        assert.strictEqual(duplicate.state, state);
        assert.equal(duplicate.state.deductions.length, 1);
      }
    }
  }
});

test('the baseline survey requires the main hall and records the return evidence once', () => {
  const state = begin(freshState());
  assert.strictEqual(decide(state, 'survey', 'done'), state);
  for (const room of Object.keys(scenes).filter(id => id !== 'nave')) {
    const elsewhere = travel(state, room);
    assert.strictEqual(decide(elsewhere, 'survey', 'done'), elsewhere);
  }
  const surveyed = survey(state);
  assert.deepEqual(surveyed.choices, {survey:'done'});
  assert.match(surveyed.log.at(-1), /blotter/);
  assert.match(surveyed.log.at(-1), /measurements/);
  assert.match(surveyed.log.at(-1), /photograph/);
  assert.deepEqual(surveyed.evidence, []);
  assert.strictEqual(decide(surveyed, 'survey', 'done'), surveyed);
});

test('every recovery method requires the baseline survey', () => {
  for (const id of endingIds) {
    const ready = readyFor(id);
    delete ready.choices.survey;
    assert.equal(endingAvailability(ready, id).available, false);
    assert.match(endingAvailability(ready, id).reason, /survey/);
    assert.strictEqual(finish(ready, id), ready);
    const restored = restoreState({...ready, ending:id});
    assert.equal(restored.ending, null);
  }
});

test('doorway, heat, and shoot experiments cannot precede the baseline survey', () => {
  for (const id of ['footprints','thermal','cutting']) {
    const state = travel(begin(freshState()), evidence[id].location);
    assert.strictEqual(inspect(state, id), state);
    assert.deepEqual(state.evidence, []);
    assert.deepEqual(state.log, []);
    const surveyed = travel(survey(state), evidence[id].location);
    assert.ok(inspect(surveyed, id).evidence.includes(id));
  }
  let prepared = begin(freshState());
  for (const id of ['graft','carrier']) prepared = inspect(travel(prepared, evidence[id].location), id);
  prepared = travel(prepared, 'potting');
  assert.deepEqual(prepared.evidence, ['graft','carrier'], 'Passive clues remain available before the survey');
  for (const choice of ['living','pressed']) assert.strictEqual(decide(prepared, 'cutting', choice), prepared);
  const surveyed = travel(survey(prepared), 'potting');
  for (const choice of ['living','pressed']) assert.equal(decide(surveyed, 'cutting', choice).choices.cutting, choice);
});

test('securing the site is available after the survey with no other clues or choices', () => {
  const state = survey();
  assert.deepEqual(state.evidence, []);
  assert.deepEqual(state.deductions, []);
  assert.deepEqual(state.procedure, []);
  assert.deepEqual(state.choices, {survey:'done'});
  assert.equal(endingAvailability(state, 'stay').available, true);
  assert.equal(finish(state, 'stay').ending, 'stay');
  for (const cutting of ['living', 'pressed']) {
    const prepared = chooseCutting(state, cutting);
    assert.equal(finish(prepared, 'stay').ending, 'stay', 'Preparing either specimen must leave a route home');
  }
});

test('reading the assignment is optional and does not gate any method', () => {
  const begun = begin(freshState());
  const read = decide(begun, 'brief', 'read');
  assert.equal(read.choices.brief, 'read');
  assert.strictEqual(decide(read, 'brief', 'read'), read);
  for (const id of endingIds) {
    const ready = readyFor(id);
    assert.equal(ready.choices.brief, undefined);
    assert.equal(finish(ready, id).ending, id);
    assert.equal(finish(decide(ready, 'brief', 'read'), id).ending, id);
  }
});

test('controlled cooling requires both deductions and the exact safe sequence', () => {
  let state = survey();
  assert.equal(endingAvailability(state, 'cool').available, false);
  assert.equal(setProcedure(state, safeOrder).success, false);
  state = establish(state, 'heat');
  assert.equal(endingAvailability(state, 'cool').available, false);
  assert.equal(setProcedure(state, safeOrder).success, false);
  state = establish(state, 'boundary');
  assert.equal(endingAvailability(state, 'cool').available, false);
  for (const order of [null, ['cool','vent','door'], ['door','cool','vent'], ['vent','cool'], ['vent','cool','door','door']]) {
    const wrong = setProcedure(state, order);
    assert.equal(wrong.success, false);
    assert.strictEqual(wrong.state, state);
  }
  const ready = setProcedure(state, safeOrder);
  assert.equal(ready.success, true);
  assert.equal(ready.state.ending, null, 'Planning does not perform a shutdown');
  assert.equal(endingAvailability(ready.state, 'cool').available, true);
  assert.equal(endingAvailability({...ready.state,procedure:['door','cool','vent']}, 'cool').available, false);
  const boundaryOnly = establish(survey(), 'boundary');
  assert.equal(setProcedure(boundaryOnly, safeOrder).success, false);
});

test('carrying the room needs both deductions and a living shoot; pressing closes that route', () => {
  const state = understood();
  assert.equal(endingAvailability(state, 'carry').available, false);
  const living = chooseCutting(state, 'living');
  assert.equal(endingAvailability(living, 'carry').available, true);
  assert.equal(finish(living, 'carry').ending, 'carry');
  assert.match(living.log.at(-1), /inside the extra room until transfer/);
  const pressed = chooseCutting(state, 'pressed');
  assert.equal(endingAvailability(pressed, 'carry').available, false);
  assert.match(endingAvailability(pressed, 'carry').reason, /living|dry|pressed/i);
  assert.strictEqual(decide(pressed, 'cutting', 'living'), pressed);
  assert.strictEqual(decide(living, 'cutting', 'pressed'), living);
  assert.strictEqual(finish(pressed, 'carry'), pressed);
  const insufficient = chooseCutting(survey(), 'living');
  assert.equal(endingAvailability(insufficient, 'carry').available, false);
});

test('cutting preparation requires both clues and the potting bench', () => {
  const state = begin(freshState());
  assert.strictEqual(decide(state, 'cutting', 'living'), state);
  const atBench = travel(state, 'potting');
  assert.strictEqual(decide(atBench, 'cutting', 'living'), atBench);
  for (const id of ['graft', 'carrier']) {
    const oneClue = travel(collect(state, [id]), 'potting');
    assert.strictEqual(decide(oneClue, 'cutting', 'living'), oneClue);
  }
  const readyElsewhere = travel(collect(state, ['graft','carrier']), 'gate');
  assert.strictEqual(decide(readyElsewhere, 'cutting', 'living'), readyElsewhere);
  const readyBench = travel(readyElsewhere, 'potting');
  for (const cutting of ['living','pressed']) assert.equal(decide(readyBench, 'cutting', cutting).choices.cutting, cutting);
});

test('breaking the pane requires both direct observations, without requiring deductions', () => {
  const state = survey();
  assert.equal(endingAvailability(state, 'break').available, false);
  for (const id of ['footprints','thermal']) assert.equal(endingAvailability(collect(state, [id]), 'break').available, false);
  const observed = collect(state, ['footprints','thermal']);
  assert.deepEqual(observed.deductions, []);
  assert.equal(finish(observed, 'break').ending, 'break');
});

test('unrecognized and removed decision keys and invalid values are safely ignored', () => {
  const state = understood();
  for (const [key,value] of [['missing','read'], ['constructor','read'], ['__proto__','read'], ['toString','read'], ['attribution','named'], ['intention','return'], ['ada','heard'], ['tomas','heard'], ['cutting','magic'], ['survey','read'], ['brief','done']]) {
    assert.doesNotThrow(() => decide(state, key, value));
    assert.strictEqual(decide(state, key, value), state);
  }
});

test('all four endings are reachable through public state transitions', () => {
  for (const id of endingIds) {
    const state = terminalState(id);
    assert.equal(state.ending, id);
    assert.ok(Array.isArray(epilogue(state)));
  }
  const state = understood();
  assert.strictEqual(finish(state, 'unknown'), state);
});

test('specimen epilogues match where preparation leaves the shoot', () => {
  const prepared = chooseCutting(survey(), 'living');
  assert.deepEqual(epilogue(prepared), [], 'Preparation alone does not describe a completed return');
  assert.match(epilogue(terminalState('cool', 'living')).join(' '), /lost with the tree/);
  assert.match(epilogue(terminalState('stay', 'living')).join(' '), /remains on the warm ledge inside the secured glasshouse/);
  assert.match(epilogue(terminalState('break', 'living')).join(' '), /retrieve.*warm ledge.*returns to the Bureau/);
  for (const id of ['cool','stay','break']) {
    const notes = epilogue(terminalState(id, 'pressed')).join(' ');
    assert.match(notes, /dry shoot returns to the Bureau/);
    assert.match(notes, /packed separately/);
  }
});

test('save restoration rejects old rescue saves and sanitizes corrupt fields', () => {
  for (const raw of [null, undefined, false, '', [], {}, {version:1,location:'gate'}, {version:999,location:'gate'}, {version:SAVE_VERSION,location:'missing'}, {version:SAVE_VERSION,location:'__proto__'}]) {
    assert.equal(restoreState(raw), null);
  }
  const raw = {...freshState(), started:'yes', evidence:[firstEvidence,firstEvidence,'missing',null,5], visited:['gate','gate','missing'], deductions:['heat','missing'], choices:{cutting:'magic',survey:'invalid',brief:'read',intention:'return',tomas:'heard',attribution:'named',ada:'heard',injected:'value'}, procedure:['door','cool','vent'], ending:'carry', log:[1,null,'retained']};
  const restored = restoreState(raw);
  assert.equal(restored.started, false);
  assert.deepEqual(restored.evidence, [firstEvidence]);
  assert.deepEqual(restored.visited, ['gate']);
  assert.deepEqual(restored.deductions, []);
  assert.deepEqual(restored.choices, {brief:'read'});
  assert.deepEqual(restored.procedure, []);
  assert.equal(restored.ending, null);
  assert.deepEqual(restored.log, ['retained']);
  const wrongTypes = restoreState({...freshState(), evidence:'heat',visited:{gate:true},deductions:1,choices:7,procedure:'vent,cool,door',log:{}});
  assert.deepEqual(wrongTypes.evidence, []);
  assert.deepEqual(wrongTypes.deductions, []);
  assert.deepEqual(wrongTypes.procedure, []);
  assert.deepEqual(wrongTypes.log, []);
});

test('save restoration preserves valid endings and rejects unsupported deductions or sequence', () => {
  for (const id of endingIds) {
    const state = terminalState(id);
    assert.deepEqual(restoreState(copy(state)), state);
  }
  const complete = terminalState('cool');
  const noEvidence = restoreState({...complete,evidence:[]});
  assert.deepEqual(noEvidence.deductions, []);
  assert.deepEqual(noEvidence.procedure, []);
  assert.equal(noEvidence.ending, null);
  const wrongOrder = restoreState({...complete,procedure:['door','vent','cool']});
  assert.deepEqual(wrongOrder.procedure, []);
  assert.equal(wrongOrder.ending, null);
  const oneConnection = restoreState({...complete,deductions:['heat']});
  assert.deepEqual(oneConnection.procedure, []);
  assert.equal(oneConnection.ending, null);
  const unstarted = restoreState({...complete,started:false});
  assert.equal(unstarted.ending, null);
  assert.equal(endingAvailability(unstarted,'cool').available, false);
  assert.strictEqual(finish(unstarted,'cool'), unstarted);
  const longLog = restoreState({...complete,log:Array.from({length:80},(_,i)=>String(i))});
  assert.equal(longLog.log.length, 60);
  assert.equal(longLog.log[0], '20');
});

test('state transitions leave input state and caller arrays untouched', () => {
  const base = freezeDeep(freshState());
  const begun = begin(base);
  assert.equal(base.started, false);
  assert.equal(begun.started, true);
  const atRoom = freezeDeep(travel(begun,evidence[firstEvidence].location));
  const recorded = inspect(atRoom,firstEvidence);
  assert.equal(atRoom.evidence.length, 0);
  assert.equal(recorded.evidence.length, 1);
  const pair = freezeDeep([...deductions.heat.pairs[0]]);
  const collected = freezeDeep(collect(begin(freshState()), pair));
  const connected = connect(collected, pair).state;
  assert.deepEqual(collected.deductions, []);
  assert.deepEqual(connected.deductions, ['heat']);
  const ready = freezeDeep(travel(collect(understood(), ['graft','carrier']), 'potting'));
  const chosen = decide(ready,'cutting','living');
  assert.equal(ready.choices.cutting, undefined);
  assert.equal(chosen.choices.cutting, 'living');
  const order = freezeDeep([...safeOrder]);
  const planned = freezeDeep(setProcedure(ready,order).state);
  assert.deepEqual(ready.procedure, []);
  const ended = finish(planned,'cool');
  assert.equal(planned.ending, null);
  assert.equal(ended.ending, 'cool');
  assert.deepEqual(order, safeOrder);
});

test('a completed case prevents exploration, decisions, deductions and alternate endings', () => {
  const state = freezeDeep(terminalState('cool'));
  const snapshot = copy(state);
  const otherRoom = Object.keys(scenes).find(id=>id!==state.location);
  assert.deepEqual(begin(state), snapshot);
  assert.strictEqual(travel(state,otherRoom), state);
  assert.strictEqual(inspect(state,firstEvidence), state);
  assert.strictEqual(decide(state,'brief','read'), state);
  assert.strictEqual(connect(state,deductions.heat.pairs[0]).state, state);
  assert.equal(connect(state,deductions.heat.pairs[0]).success, false);
  assert.strictEqual(setProcedure(state,safeOrder).state, state);
  assert.equal(setProcedure(state,safeOrder).success, false);
  for (const id of endingIds) assert.strictEqual(finish(state,id), state);
  assert.deepEqual(state, snapshot);
});
