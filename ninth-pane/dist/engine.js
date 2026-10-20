import { scenes, evidence, deductions } from './story.js';

export const SAVE_VERSION = 2;
export const freshState = () => ({version:SAVE_VERSION, started:false, location:'gate', evidence:[], deductions:[], visited:['gate'], choices:{}, procedure:[], ending:null, log:[]});
export const clone = value => JSON.parse(JSON.stringify(value));
const known = (items, dictionary) => [...new Set(Array.isArray(items) ? items.filter(id => typeof id === 'string' && Object.hasOwn(dictionary,id)) : [])];
const allowedChoices = {brief:['read'], survey:['done'], cutting:['living','pressed']};
const safeOrder = ['vent','cool','door'];
const understood = state => state.deductions.includes('heat') && state.deductions.includes('boundary');

export function restoreState(raw) {
  if (!raw || raw.version !== SAVE_VERSION || !Object.hasOwn(scenes,raw.location)) return null;
  const state = freshState();
  state.started = raw.started === true;
  state.location = raw.location;
  state.evidence = known(raw.evidence,evidence);
  state.visited = known(raw.visited,scenes);
  state.deductions = known(raw.deductions,deductions).filter(id => deductions[id].pairs.some(pair => pair.every(e => state.evidence.includes(e))));
  for (const [key,values] of Object.entries(allowedChoices)) if (values.includes(raw.choices?.[key])) state.choices[key]=raw.choices[key];
  if (Array.isArray(raw.procedure) && raw.procedure.join(',') === safeOrder.join(',') && understood(state)) state.procedure=[...safeOrder];
  state.log = Array.isArray(raw.log) ? raw.log.filter(x=>typeof x === 'string').slice(-60) : [];
  if (['cool','carry','stay','break'].includes(raw.ending) && endingAvailability(state,raw.ending).available) state.ending=raw.ending;
  return state;
}

export function begin(state) {return {...clone(state),started:true};}
export function travel(state,id) {
  if (!state.started || state.ending || !Object.hasOwn(scenes,id)) return state;
  const next=clone(state); next.location=id;
  if(!next.visited.includes(id))next.visited.push(id);
  return next;
}
export function inspect(state,id) {
  if (!state.started || state.ending || !Object.hasOwn(evidence,id)) return state;
  if (['footprints','thermal','cutting'].includes(id) && state.choices.survey!=='done') return state;
  if (evidence[id].location!==state.location && !state.evidence.includes(id)) return state;
  if(state.evidence.includes(id))return state;
  const next=clone(state);next.evidence.push(id);next.log.push(`Recorded: ${evidence[id].title.replace(/[.!?]$/, '')}.`);return next;
}
export function connect(state,ids) {
  if(!state.started || state.ending || !Array.isArray(ids) || ids.length!==2 || ids[0]===ids[1] || !ids.every(id=>state.evidence.includes(id))) return {state,success:false,message:'Choose two different clues from your field notes.'};
  for(const [id,deduction] of Object.entries(deductions)) {
    if(deduction.pairs.some(pair=>pair.length===2 && pair.every(e=>ids.includes(e)))) {
      if(state.deductions.includes(id))return {state,success:true,id,message:'You have already recorded this answer.'};
      const next=clone(state);next.deductions.push(id);next.log.push(deduction.success);
      return {state:next,success:true,id,message:deduction.success};
    }
  }
  return {state,success:false,message:'These clues do not answer either question together. Compare clues about the boiler, or about the shoot and the moving doorway.'};
}
export function decide(state,key,value) {
  if(!state.started || state.ending)return state;
  if(!Object.hasOwn(allowedChoices,key) || !allowedChoices[key].includes(value) || state.choices[key])return state;
  if(key==='survey' && state.location!=='nave')return state;
  if(key==='cutting' && (state.choices.survey!=='done' || state.location!=='potting' || !['graft','carrier'].every(id=>state.evidence.includes(id))))return state;
  const next=clone(state);next.choices[key]=value;
  const labels={read:'Assignment read: investigate the extra room and return to the Bureau with scent samples and evidence.',done:'Baseline survey complete: scent blotter sealed, measurements recorded, and photograph taken.',living:'You wrap the shoot in damp cloth and leave it on the warm ledge inside the extra room until transfer.',pressed:'You dry the shoot in the press and pack it as a specimen. It can no longer move the doorway.'};
  next.log.push(labels[value]);return next;
}
export function setProcedure(state,steps) {
  if(!state.started || state.ending || !understood(state))return {state,success:false,message:'First work out what keeps the room warm and what moves its doorway. Connect the clues in your field notes.'};
  if(!Array.isArray(steps) || steps.join(',')!==safeOrder.join(','))return {state,success:false,message:'Check the service instructions. Open the vent before turning off the heat. Keep the door shut until the room has cooled. Nothing has been switched off yet.'};
  const next=clone(state);next.procedure=[...safeOrder];next.log.push('Shutdown planned: open the vent, turn off the heat, then open the door.');return {state:next,success:true,message:'The shutdown plan is ready. Return to the main hall to choose a recovery method.'};
}
export function endingAvailability(state,id) {
  if(!state.started)return {available:false,reason:'Begin the investigation first.'};
  if(!['cool','carry','stay','break'].includes(id))return {available:false,reason:'This method is unavailable.'};
  if(state.choices.survey!=='done')return {available:false,reason:'Complete the baseline survey in the main hall first.'};
  if(id==='stay')return {available:true,reason:'Secure the glasshouse and return with your scent blotter, measurements, and photograph. The extra room remains open for another survey.'};
  if(id==='break')return ['footprints','thermal'].every(e=>state.evidence.includes(e)) ? {available:true,reason:'Break the pane to reach the tree directly. The heat and growth could spread through the glasshouse.'} : {available:false,reason:'Test the doorway and measure the temperature in the main hall first.'};
  if(!understood(state))return {available:false,reason:'Solve both questions in your field notes first.'};
  if(id==='cool')return state.procedure.join(',')===safeOrder.join(',') ? {available:true,reason:'Cool the room and collect its scent as it closes. The tree and any living shoot left inside will be lost.'} : {available:false,reason:'Plan the shutdown order in the boiler room.'};
  return state.choices.cutting==='living' ? {available:true,reason:'Try drawing the doorway into a jar with the living shoot. The extra room may come with it.'} : {available:false,reason:state.choices.cutting==='pressed' ? 'The pressed shoot is dry. This method needs a living cutting. Revisit your preparation choice to try it.' : 'Prepare a living cutting at the potting bench.'};
}
export function finish(state,id) {if(state.ending || !endingAvailability(state,id).available)return state;return {...clone(state),ending:id};}

export function epilogue(state) {
  if(!state.ending)return [];
  const notes=[];
  if(state.choices.cutting==='living' && state.ending==='stay')notes.push('The wrapped shoot remains on the warm ledge inside the secured glasshouse. Its position is marked in your report for the next survey.');
  if(state.choices.cutting==='living' && state.ending==='cool')notes.push('The prepared living shoot stayed on the warm ledge. It was lost with the tree when the extra room closed.');
  if(state.choices.cutting==='living' && state.ending==='break')notes.push('Before retreating, you retrieve the wrapped shoot from the warm ledge. It returns to the Bureau with your other samples.');
  if(state.choices.cutting==='pressed')notes.push('The dry shoot returns to the Bureau between labelled sheets, packed separately from your scent samples.');
  return notes;
}
