import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { freshState, begin, travel, survey, inspect, connect, choose, choiceAvailability,
  setControl, testSetup, endingAvailability, finish, restoreState, epilogue, requirementsMet } from '../dist/engine.js';
const gameDirectory = new URL('../dist/games/', import.meta.url);
const games = await Promise.all((await fs.readdir(gameDirectory)).filter(name=>name.endsWith('.json')).map(async name=>JSON.parse(await fs.readFile(new URL(name,gameDirectory),'utf8'))));
const copy = value => structuredClone(value);
function recorded(game) {
  let state=begin(game,freshState(game));
  state=survey(game,travel(game,state,game.baseline.location));
  for(const clue of game.evidence) state=inspect(game,travel(game,state,clue.location),clue.id);
  for(const finding of game.deductions) state=connect(game,state,finding.pairs[0]).state;
  return state;
}
function solve(game,state) {
  state=travel(game,state,game.puzzle.location);
  for(const [id,value] of Object.entries(game.puzzle.solution))state=setControl(game,state,id,value);
  return testSetup(game,state).state;
}
function prepared(game) {
  let state=recorded(game);
  for(let pass=0;pass<=game.choices.length+1;pass++) {
    if(requirementsMet(state,game.puzzle.requires))state=solve(game,state);
    for(const choice of game.choices) {
      state=travel(game,state,choice.location);
      const option=choice.options.find(option=>choiceAvailability(game,state,choice.id,option.id).available);
      if(option)state=choose(game,state,choice.id,option.id);
    }
  }
  return state;
}
for(const game of games) {
  test(`${game.slug}: actions preserve an unstarted state and baseline precedes intervention`,()=>{
    const fresh=freshState(game), snapshot=copy(fresh), intervention=game.evidence.find(e=>e.intervention);
    assert.equal(begin(game,fresh).started,true);assert.deepEqual(fresh,snapshot);
    assert.equal(travel(game,fresh,game.scenes.at(-1).id),fresh);
    assert.equal(survey(game,fresh),fresh);assert.equal(inspect(game,fresh,game.evidence[0].id),fresh);
    assert.equal(choose(game,fresh,game.choices[0].id,game.choices[0].options[0].id),fresh);
    assert.equal(setControl(game,fresh,game.puzzle.controls[0].id,game.puzzle.controls[0].options[0].value),fresh);
    assert.equal(finish(game,fresh,game.endings[0].id),fresh);
    const atTest=travel(game,begin(game,fresh),intervention.location);
    assert.equal(inspect(game,atTest,intervention.id),atTest);
    assert.ok(game.endings.every(ending=>!endingAvailability(game,atTest,ending.id).available));
    const wrongRoom=game.scenes.find(scene=>scene.id!==game.baseline.location);
    const away=travel(game,atTest,wrongRoom.id);assert.equal(survey(game,away),away);
    const surveyed=survey(game,travel(game,atTest,game.baseline.location));assert.equal(surveyed.baseline,true);
    assert.equal(inspect(game,travel(game,surveyed,intervention.location),intervention.id).evidence.includes(intervention.id),true);
  });
  test(`${game.slug}: clues require their location, remain rereadable, and findings require both recorded clues`,()=>{
    let state=begin(game,freshState(game));
    const clue=game.evidence.find(e=>!e.intervention), wrong=game.scenes.find(scene=>scene.id!==clue.location);
    state=travel(game,state,wrong.id);assert.equal(inspect(game,state,clue.id),state);
    state=inspect(game,travel(game,state,clue.location),clue.id);assert.ok(state.evidence.includes(clue.id));
    assert.equal(inspect(game,state,clue.id),state);assert.equal(state.events.filter(e=>e.id===clue.id).length,1);
    for(const finding of game.deductions)assert.equal(connect(game,begin(game,freshState(game)),finding.pairs[0]).success,false);
    state=recorded(game);assert.equal(state.deductions.length,game.deductions.length);
    for(const finding of game.deductions) {const duplicate=connect(game,state,[...finding.pairs[0]].reverse());assert.equal(duplicate.state,state);assert.equal(duplicate.success,true);}
    assert.equal(connect(game,state,[clue.id,clue.id]).success,false);
  });
  test(`${game.slug}: preparations stay fixed and correct setup survives a serialized round trip`,()=>{
    const state=prepared(game), snapshot=copy(state);
    assert.equal(state.puzzle,true);assert.equal(Object.keys(state.choices).length,game.choices.length);
    for(const choice of game.choices) {
      const atChoice=travel(game,state,choice.location), alternative=choice.options.find(option=>option.id!==state.choices[choice.id]);
      assert.equal(choose(game,atChoice,choice.id,alternative.id),atChoice);
    }
    assert.deepEqual(restoreState(game,JSON.parse(JSON.stringify(state))),state);assert.deepEqual(state,snapshot);
  });
  test(`${game.slug}: wrong instrument tests are reversible and cannot create a completion`,()=>{
    let state=recorded(game);
    // These authored instruments have evidence/finding requirements, not an irreversible prerequisite choice.
    assert.equal(requirementsMet(state,game.puzzle.requires),true);
    state=travel(game,state,game.puzzle.location);
    const first=game.puzzle.controls[0], wrong=first.options.find(option=>option.value!==game.puzzle.solution[first.id]).value;
    for(const [id,value] of Object.entries(game.puzzle.solution))state=setControl(game,state,id,id===first.id?wrong:value);
    const snapshot=copy(state), failed=testSetup(game,state);
    assert.equal(failed.success,false);assert.equal(failed.state,state);assert.deepEqual(state,snapshot);assert.equal(state.puzzle,false);
    state=setControl(game,state,first.id,game.puzzle.solution[first.id]);const passed=testSetup(game,state);
    assert.equal(passed.success,true);assert.equal(passed.state.puzzle,true);assert.equal(state.puzzle,false);
  });
  test(`${game.slug}: a filed ending is immutable and preserves only the chosen epilogues`,()=>{
    const ready=prepared(game), ending=game.endings.find(ending=>endingAvailability(game,ready,ending.id).available);
    assert.ok(ending);const state=finish(game,ready,ending.id);assert.equal(state.ending,ending.id);assert.equal(ready.ending,null);
    assert.deepEqual(restoreState(game,JSON.parse(JSON.stringify(state))),state);
    assert.equal(begin(game,state),state);assert.equal(travel(game,state,game.start),state);assert.equal(survey(game,state),state);
    assert.equal(inspect(game,state,game.evidence[0].id),state);assert.equal(connect(game,state,game.deductions[0].pairs[0]).state,state);
    assert.equal(choose(game,state,game.choices[0].id,game.choices[0].options[0].id),state);
    assert.equal(setControl(game,state,game.puzzle.controls[0].id,game.puzzle.controls[0].options[0].value),state);
    assert.equal(testSetup(game,state).state,state);assert.equal(finish(game,state,game.endings.find(e=>e.id!==ending.id).id),state);
    const expected=game.choices.flatMap(choice=>choice.options.find(option=>option.id===state.choices[choice.id])?.epilogues?.[ending.id]||[]);
    assert.deepEqual(epilogue(game,state),expected);
  });
  test(`${game.slug}: save restoration rejects cross-game/version data and removes unsupported progress`,()=>{
    const valid=prepared(game);
    for(const raw of [null,{}, {...valid,game:'other-game'},{...valid,version:999},{...valid,contentVersion:999},{...valid,scene:'missing-room'}])assert.equal(restoreState(game,raw),null);
    const unstarted={...copy(valid),started:false};assert.deepEqual(restoreState(game,unstarted),freshState(game));
    const broken={...copy(valid),evidence:[],deductions:[...valid.deductions,'made-up'],ending:game.endings[0].id};
    const restored=restoreState(game,broken);assert.deepEqual(restored.deductions,[]);assert.equal(restored.puzzle,false);assert.deepEqual(restored.setup,{});
    assert.equal(restored.events.some(event=>event.type==='deduction'||event.type==='puzzle'),false);
    for(const choice of game.choices)if(restored.choices[choice.id]) {
      assert.equal(requirementsMet(restored,choice.requires),true);assert.equal(requirementsMet(restored,choice.options.find(o=>o.id===restored.choices[choice.id]).requires),true);
    }
    assert.deepEqual(broken.evidence,[]); // Restoration does not mutate the input save.
  });
  test(`${game.slug}: restore repairs visited rooms and excludes fake/missing event identities`,()=>{
    const state=recorded(game), raw={...copy(state),visited:[],events:[
      {type:'choice',id:'unknown'}, {type:'choice'}, {type:'ending',id:null}, {type:'baseline',id:'unknown'},
      {type:'evidence',id:'unknown'}, {type:'unknown',id:'baseline'}, {type:'baseline',id:'baseline',unsafe:'discard'},
      {type:'evidence',id:state.evidence[0],unsafe:'discard'},
    ]};
    const restored=restoreState(game,raw);assert.ok(restored.visited.includes(game.start));assert.ok(restored.visited.includes(state.scene));
    assert.deepEqual(restored.events,[{type:'baseline',id:'baseline'},{type:'evidence',id:state.evidence[0]}]);
    const noBaseline=restoreState(game,{...copy(state),baseline:false,setup:copy(game.puzzle.solution),puzzle:true});
    assert.equal(noBaseline.puzzle,false);assert.deepEqual(noBaseline.setup,{});assert.equal(noBaseline.evidence.some(id=>game.evidence.find(e=>e.id===id).intervention),false);
  });
}
