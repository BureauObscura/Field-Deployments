export const SAVE_VERSION = 1;
const clone = value => structuredClone(value);
const find = (items, id) => items.find(item => item.id === id);
const uniqueKnown = (values, items) => [...new Set(Array.isArray(values) ? values.filter(id => items.some(item => item.id === id)) : [])];
export function freshState(game) {
  return {version:SAVE_VERSION, contentVersion:game.version, game:game.slug, started:false, scene:game.start, baseline:false,
    evidence:[], deductions:[], choices:{}, setup:{}, puzzle:false, ending:null, visited:[game.start], events:[]};
}
export function requirementsMet(state, requirements = {}) {
  return (requirements.evidence || []).every(id => state.evidence.includes(id)) &&
    (requirements.deductions || []).every(id => state.deductions.includes(id)) &&
    (!requirements.puzzle || state.puzzle) &&
    Object.entries(requirements.choices || {}).every(([id,values]) => values.includes(state.choices[id]));
}
export function requirementLabels(game, state, requirements = {}) {
  const missing = [];
  for (const id of requirements.evidence || []) if (!state.evidence.includes(id)) missing.push(find(game.evidence,id)?.title || id);
  for (const id of requirements.deductions || []) if (!state.deductions.includes(id)) missing.push(find(game.deductions,id)?.title || id);
  if (requirements.puzzle && !state.puzzle) missing.push(game.puzzle.title);
  for (const [id,values] of Object.entries(requirements.choices || {})) if (!values.includes(state.choices[id])) {
    const choice=find(game.choices,id);
    missing.push(values.map(value=>find(choice?.options||[],value)?.label||value).join(' or '));
  }
  return missing;
}
function event(state,type,id,value) { state.events.push({type,id,...(value?{value}:{})}); state.events=state.events.slice(-80); }
export function begin(game,state) {
  if (state.started || state.ending) return state;
  return {...clone(state),started:true};
}
export function travel(game,state,id) {
  if (!state.started || state.ending || !find(game.scenes,id)) return state;
  const next=clone(state);next.scene=id;
  if(!next.visited.includes(id))next.visited.push(id);
  return next;
}
export function survey(game,state) {
  if (!state.started || state.ending || state.baseline || state.scene!==game.baseline.location) return state;
  const next=clone(state);next.baseline=true;event(next,'baseline','baseline');return next;
}
export function inspect(game,state,id) {
  const evidence=find(game.evidence,id);
  if(!state.started || state.ending || !evidence || state.evidence.includes(id) || state.scene!==evidence.location || (evidence.intervention&&!state.baseline))return state;
  const next=clone(state);next.evidence.push(id);event(next,'evidence',id);return next;
}
export function connect(game,state,ids) {
  if(!state.started || state.ending || !Array.isArray(ids) || ids.length!==2 || ids[0]===ids[1] || !ids.every(id=>state.evidence.includes(id))) {
    return {state,success:false,message:'Choose two different recorded clues.'};
  }
  const deduction=game.deductions.find(item=>item.pairs.some(pair=>pair.every(id=>ids.includes(id))));
  if(!deduction)return {state,success:false,message:'These clues do not establish a connection together. Check the questions beside your notebook, or use a hint.'};
  if(state.deductions.includes(deduction.id))return {state,success:true,message:'This finding is already in your record.',id:deduction.id};
  const next=clone(state);next.deductions.push(deduction.id);event(next,'deduction',deduction.id);
  return {state:next,success:true,message:deduction.success,id:deduction.id};
}
export function choiceAvailability(game,state,id,optionId) {
  const choice=find(game.choices,id),option=find(choice?.options||[],optionId);
  if(!state.started || state.ending || !choice || !option)return {available:false,reason:'This preparation is unavailable.'};
  if(!state.baseline)return {available:false,reason:'Take the baseline sample first.'};
  if(state.choices[id])return {available:false,reason:'This preparation is already recorded. Revisit the decision to change it.'};
  if(state.scene!==choice.location)return {available:false,reason:`Make this preparation at ${find(game.scenes,choice.location).title}.`};
  const missing=[...requirementLabels(game,state,choice.requires),...requirementLabels(game,state,option.requires)];
  return missing.length?{available:false,reason:`First record or complete: ${missing.join('; ')}.`}:{available:true,reason:option.cost};
}
export function choose(game,state,id,optionId) {
  if(!choiceAvailability(game,state,id,optionId).available)return state;
  const next=clone(state);next.choices[id]=optionId;event(next,'choice',id,optionId);return next;
}
export function setControl(game,state,id,value) {
  const control=find(game.puzzle.controls,id);
  if(!state.started || state.ending || !state.baseline || state.puzzle || state.scene!==game.puzzle.location ||
    !requirementsMet(state,game.puzzle.requires) || !control?.options.some(option=>option.value===value))return state;
  return {...clone(state),setup:{...state.setup,[id]:value}};
}
export function testSetup(game,state) {
  if(!state.started || state.ending || !state.baseline || state.scene!==game.puzzle.location || !requirementsMet(state,game.puzzle.requires)) {
    return {state,success:false,message:'Complete the baseline survey and the required observations first.'};
  }
  if(state.puzzle)return {state,success:true,message:'The tested setup is already recorded.'};
  if(!game.puzzle.controls.every(control=>Object.hasOwn(state.setup,control.id)))return {state,success:false,message:'Set every control before testing the arrangement.'};
  if(!Object.entries(game.puzzle.solution).every(([id,value])=>state.setup[id]===value))return {state,success:false,message:game.puzzle.failure};
  const next=clone(state);next.puzzle=true;event(next,'puzzle',game.puzzle.id);
  return {state:next,success:true,message:game.puzzle.success.join(' ')};
}
export function endingAvailability(game,state,id) {
  const ending=find(game.endings,id);
  if(!state.started || !ending)return {available:false,reason:'Begin the assignment first.'};
  if(state.ending)return {available:false,reason:'This recovery is already filed.'};
  if(!state.baseline)return {available:false,reason:'Take the baseline sample first.'};
  const missing=requirementLabels(game,state,ending.requires);
  return missing.length?{available:false,reason:ending.locked,missing}:{available:true,reason:ending.consequence,missing:[]};
}
export function finish(game,state,id) {
  if(!endingAvailability(game,state,id).available)return state;
  const next=clone(state);next.ending=id;event(next,'ending',id);return next;
}
export function epilogue(game,state) {
  if(!state.ending)return [];
  return game.choices.flatMap(choice=>find(choice.options,state.choices[choice.id])?.epilogues?.[state.ending] || []);
}
export function eventText(game,entry) {
  if(entry.type==='baseline')return game.baseline.result;
  if(entry.type==='evidence')return `Recorded: ${find(game.evidence,entry.id)?.title || ''}.`;
  if(entry.type==='deduction')return find(game.deductions,entry.id)?.success || '';
  if(entry.type==='choice')return find(find(game.choices,entry.id)?.options||[],entry.value)?.result.join(' ') || '';
  if(entry.type==='puzzle')return game.puzzle.success.join(' ');
  if(entry.type==='ending')return `Recovery filed: ${find(game.endings,entry.id)?.title || ''}.`;
  return '';
}
export function restoreState(game,raw) {
  if(!raw || raw.version!==SAVE_VERSION || raw.contentVersion!==game.version || raw.game!==game.slug || !find(game.scenes,raw.scene))return null;
  if(raw.started!==true)return freshState(game);
  const state=freshState(game);state.started=true;state.scene=raw.scene;state.baseline=raw.baseline===true;
  state.evidence=uniqueKnown(raw.evidence,game.evidence).filter(id=>!find(game.evidence,id).intervention||state.baseline);
  state.visited=uniqueKnown([game.start,...(Array.isArray(raw.visited)?raw.visited:[]),state.scene],game.scenes);
  state.deductions=uniqueKnown(raw.deductions,game.deductions).filter(id=>find(game.deductions,id).pairs.some(pair=>pair.every(e=>state.evidence.includes(e))));
  for(const control of game.puzzle.controls)if(control.options.some(option=>option.value===raw.setup?.[control.id]))state.setup[control.id]=raw.setup[control.id];
  // Choices can legitimately precede or follow the instrument. Restore valid IDs,
  // then prune unmet dependencies to a fixed point before restoring an ending.
  if(state.baseline)for(const choice of game.choices)if(find(choice.options,raw.choices?.[choice.id]))state.choices[choice.id]=raw.choices[choice.id];
  state.puzzle=state.baseline&&raw.puzzle===true&&Object.entries(game.puzzle.solution).every(([id,value])=>state.setup[id]===value);
  for(let pass=0;pass<=game.choices.length;pass++) {
    if(!requirementsMet(state,game.puzzle.requires))state.puzzle=false;
    for(const choice of game.choices)if(state.choices[choice.id]) {
      const option=find(choice.options,state.choices[choice.id]);
      if(!requirementsMet(state,choice.requires)||!requirementsMet(state,option.requires))delete state.choices[choice.id];
    }
  }
  if(!state.baseline || !requirementsMet(state,game.puzzle.requires))state.setup={};
  if(raw.ending && endingAvailability(game,state,raw.ending).available)state.ending=raw.ending;
  const recorded=entry=>entry && (
    entry.type==='baseline'&&entry.id==='baseline'&&state.baseline || entry.type==='evidence'&&state.evidence.includes(entry.id) ||
    entry.type==='deduction'&&state.deductions.includes(entry.id) || entry.type==='choice'&&Object.hasOwn(state.choices,entry.id)&&state.choices[entry.id]===entry.value ||
    entry.type==='puzzle'&&state.puzzle&&entry.id===game.puzzle.id || entry.type==='ending'&&state.ending!==null&&entry.id===state.ending);
  state.events=Array.isArray(raw.events)?raw.events.filter(recorded).slice(-80).map(({type,id,value})=>({type,id,...(value?{value}:{})})):[];
  return state;
}
