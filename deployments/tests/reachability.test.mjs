import test from 'node:test';
import assert from 'node:assert/strict';
import { readGames, validateGame } from '../scripts/check.mjs';
import * as engine from '../dist/engine.js';
const games=await readGames();
const signature=state=>JSON.stringify([state.puzzle,Object.entries(state.choices).sort()]);
const combination=choices=>JSON.stringify(Object.entries(choices).sort());
function completeObservations(game){
  let state=engine.begin(game,engine.freshState(game));state=engine.survey(game,engine.travel(game,state,game.baseline.location));
  for(const e of game.evidence)state=engine.inspect(game,engine.travel(game,state,e.location),e.id);
  for(const d of game.deductions){const result=engine.connect(game,state,d.pairs[0]);assert.equal(result.success,true,`${game.slug}: finding ${d.id} must come from recorded clues`);state=result.state;}
  return state;
}
function explore(game){
  // Evidence and findings are monotone and never exclude a choice in this contract.
  // Collect them through normal actions, then enumerate every irreversible choice/puzzle order.
  const queue=[completeObservations(game)],seen=new Set(),endings=new Map(),combinations=new Map(),options=new Set();
  for(let cursor=0;cursor<queue.length;cursor++){
    const state=queue[cursor],key=signature(state);if(seen.has(key))continue;seen.add(key);
    assert.ok(seen.size<1000,'unexpected state explosion');
    const reachable=[];
    for(const ending of game.endings)if(engine.endingAvailability(game,state,ending.id).available){
      const filed=engine.finish(game,state,ending.id);assert.equal(filed.ending,ending.id);assert.deepEqual(engine.restoreState(game,JSON.parse(JSON.stringify(filed))),filed);
      endings.set(ending.id,filed);reachable.push(ending.id);
    }
    if(Object.keys(state.choices).length===game.choices.length){const combo=combination(state.choices);combinations.set(combo,new Set([...(combinations.get(combo)||[]),...reachable]));}
    for(const choice of game.choices)for(const option of choice.options){const here=engine.travel(game,state,choice.location);if(!engine.choiceAvailability(game,here,choice.id,option.id).available)continue;const next=engine.choose(game,here,choice.id,option.id);assert.notEqual(next,here);options.add(choice.id+':'+option.id);queue.push(next);}
    if(!state.puzzle){let here=engine.travel(game,state,game.puzzle.location);for(const[id,value]of Object.entries(game.puzzle.solution))here=engine.setControl(game,here,id,value);const tested=engine.testSetup(game,here);if(tested.success)queue.push(tested.state);}
  }
  return{endings,combinations,options,states:seen.size};
}
function declaredLegalCombinations(game){
  let candidates=[{}];for(const choice of game.choices)candidates=candidates.flatMap(candidate=>choice.options.map(option=>({...candidate,[choice.id]:option.id})));
  return candidates.filter(choices=>game.choices.every(choice=>{
    const option=choice.options.find(option=>option.id===choices[choice.id]);
    return [choice.requires,option.requires].every(requirements=>Object.entries(requirements?.choices||{}).every(([id,values])=>values.includes(choices[id])));
  }));
}
let endingCount=0;
for(const game of games){
  test(`${game.slug}: complete schema and every reference are valid`,()=>assert.deepEqual(validateGame(game),[]));
  test(`${game.slug}: all four endings and every legal preparation combination are reachable`,()=>{
    const result=explore(game);assert.equal(result.endings.size,4,`${game.slug}: missing endings ${game.endings.filter(e=>!result.endings.has(e.id)).map(e=>e.id)}`);
    for(const choice of game.choices)for(const option of choice.options)assert.ok(result.options.has(choice.id+':'+option.id),`unreachable option ${choice.id}:${option.id}`);
    for(const choices of declaredLegalCombinations(game)){const key=combination(choices);assert.ok(result.combinations.has(key),`no legal action sequence reaches ${key}`);assert.ok(result.combinations.get(key).size>0,`preparation combination has no ending: ${key}`);}
    endingCount+=result.endings.size;
  });
}
test('the five registered games supply 20 reachable endings',()=>assert.equal(endingCount,20));
test('schema rejects unknown requirements, ambiguous pairs and impossible control values',()=>{
  const g=structuredClone(games[0]);g.endings[0].requires.anyOf=['unknown'];g.endings[0].requires.evidence=['not-a-clue'];g.choices[0].options[0].requires={choices:{missing:['bad']}};g.deductions[1].pairs.push([...g.deductions[0].pairs[0]].reverse());g.puzzle.solution[g.puzzle.controls[0].id]='not-an-option';
  const errors=validateGame(g);for(const pattern of [/unknown field anyOf/,/unknown not-a-clue/,/unknown missing/,/ambiguous clue pair/,/solution is not an option/])assert.ok(errors.some(error=>pattern.test(error)),String(pattern));
});
