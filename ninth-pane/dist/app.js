import {intro,scenes,evidence,deductions,endings,survey} from './story.js';
import {freshState,restoreState,begin,travel,inspect,connect,decide,setProcedure,endingAvailability,finish,epilogue,clone} from './engine.js';
import {Atmosphere} from './audio.js';
import {missionIdentity,displayAgent,localPreview,accountLinks} from './account.js';
let identity=await missionIdentity();
const loadedStorageKey=identity.storageKey;
let identityRevision=0;

const $ = selector => document.querySelector(selector);
const app=$('#app'), dialog=$('#overlay');
let KEY=`bureau-ninth-pane-v3:${identity.storageKey||'locked'}`;
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs=items=>(items??[]).map(p=>`<p>${e(p)}</p>`).join('');
const ids=Object.keys(scenes), evidenceIds=Object.keys(evidence), endingIds=['cool','carry','stay','break'];
const shortNames={gate:'Service gate',nave:'Main hall',potting:'Potting room',boiler:'Boiler room',passage:'Side passage',office:'Office'};
const audio=new Atmosphere();
let state=freshState(), meta={endings:[],checkpoints:[],motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,markers:true}, saved=false, storageAvailable=true;
let selected=[], boardMessage='', procedure=[], hintLevels={}, cover=true, toastTimer, pendingEnding=null;
try {
  const data=JSON.parse(localStorage.getItem(KEY)||'null');
  const restored=restoreState(data?.state);
  if(restored){state=restored;saved=state.started;}
  if(data?.meta){meta.endings=endingIds.filter(id=>data.meta.endings?.includes(id));meta.checkpoints=(Array.isArray(data.meta.checkpoints)?data.meta.checkpoints:[]).slice(-12).map(restoreState).filter(Boolean);meta.motion=typeof data.meta.motion==='boolean'?data.meta.motion:meta.motion;meta.markers=data.meta.markers!==false;}
}catch{try{localStorage.getItem(KEY);}catch{storageAvailable=false;}}

function persist(){
  saved=state.started;
  try{localStorage.setItem(KEY,JSON.stringify({state,meta}));}catch{if(storageAvailable)toast('Device storage is unavailable. Keep this tab open to retain this investigation.');storageAvailable=false;}
}
function commit(next,checkpoint=false){
  if(next===state)return false;
  if(checkpoint){meta.checkpoints.push(clone(state));meta.checkpoints=meta.checkpoints.slice(-12);}
  state=next;persist();return true;
}
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
function announce(message){$('#live').textContent=message;}
const icons={sound:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14"/></svg>',notes:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14v18H5zM9 3v18M12 8h4M12 12h4M12 16h3"/></svg>',settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/></svg>'};
function header(inGame=false){return `<header class="masthead"><button class="masthead-brand" data-action="home" aria-label="Bureau Obscura, return to title"><img class="brand-lockup" src="assets/brand/bo-lockup-stacked-no-division-paper.svg" alt="Bureau Obscura"><div class="division">Olfactory Recovery Division</div></button>${inGame?'<div class="case-label label">Field assignment<br><span class="signal">The Ninth Pane</span></div>':'<div class="case-label label">Field assignments<br>The Ninth Pane</div>'}<nav class="top-controls" aria-label="Investigation controls"><a class="icon-btn" href="${localPreview?'http://127.0.0.1:4188/':'https://bureauobscura.com/deployments'}" ${localPreview?'':'target="_top"'}>Games</a>${!localPreview?`<button class="agent-chip" data-action="account">${e(displayAgent(identity))}</button>`:''}<button class="icon-btn" data-action="sound" aria-label="${audio.enabled?'Mute':'Enable'} ambient sound" aria-pressed="${audio.enabled}">${icons.sound}<span class="sound-label">Sound ${audio.enabled?'on':'off'}</span></button>${inGame?`<button class="icon-btn" data-action="notebook">${icons.notes}<span>Field notes</span><span class="count">${state.evidence.length}</span></button>`:''}<button class="icon-btn" data-action="settings" aria-label="Settings">${icons.settings}<span class="settings-label">Settings</span></button></nav></header>`;}
function sensory(items){return `<dl class="sensory">${['air','contact','residue'].map(key=>`<div><dt>${({air:"Scent",contact:"Touch",residue:"Traces"})[key]}</dt><dd>${e(items[key])}</dd></div>`).join('')}</dl>`;}
function render(){
  if(identity.checking){
    app.innerHTML='<main id="main" class="access-message" role="status"><p>Checking your account…</p></main>';
    return;
  }
  if(!identity.allowed){
    document.title='Bureau account';
    app.innerHTML=`<main id="main" class="access-message"><h1>${identity.unavailable?'Connection interrupted':'Sign in to continue'}</h1><p>${identity.unavailable?'Your progress is saved. Try again in a moment.':'Open your Bureau account to return to this mission.'}</p><a class="btn primary" href="${accountLinks.signIn}" target="_top">Return to Bureau Obscura ↗</a></main>`;
    return;
  }
  document.body.classList.toggle('no-motion',!meta.motion);
  if(cover)renderCover();else if(state.ending)renderEnding();else renderGame();
  if(!storageAvailable)app.insertAdjacentHTML('afterbegin','<div class="save-warning" role="status">Device storage is unavailable. Progress lasts while this tab stays open.</div>');
  document.title=cover?'The Ninth Pane | Bureau Obscura':state.ending?`${endings[state.ending].title} | The Ninth Pane`:`${scenes[state.location].title} | The Ninth Pane`;
  audio.setScene(cover?'gate':state.location);
}
function renderCover(){
  app.innerHTML=`<div class="cover"><img class="cover-photo" src="assets/scenes/exterior.jpg" alt="A glasshouse in cold rain, with a warm light beside the entrance">${header()}<main id="main" class="cover-content"><div class="eyebrow"><span class="rule"></span>${e(intro.coordinate)}</div><h1><span>THE NINTH</span><span>PANE</span></h1><div class="cover-deck">${paragraphs(intro.deck)}</div><div class="cover-actions"><button class="btn primary" data-action="start">${saved?'Continue mission':'Deploy on this mission'}<span class="arrow" aria-hidden="true">↗</span></button><button class="text-btn" data-action="brief">Your assignment</button>${saved?'<button class="text-btn" data-action="new">Begin again</button>':''}</div><div class="cover-meta"><span>About 15–25 minutes</span><span>Progress saves automatically</span></div></main><div class="cover-coordinate"><span>EXTERIOR SURVEY</span><strong>08 / 09</strong>Roof sections: outside / inside</div><div class="grain" aria-hidden="true"></div></div>`;
}
function objective(){
  if(!state.choices.survey)return 'Go to the main hall and take a baseline scent sample.';
  if(!state.deductions.length&&!['footprints','thermal'].every(id=>state.evidence.includes(id)))return 'Test the doorway and the temperature in the main hall.';
  if(!state.deductions.includes('heat'))return 'Trace the heat in the boiler room, then compare two clues in Field notes.';
  if(!state.deductions.includes('boundary'))return 'Compare the leaf tests with the specimen guide to find what moves the doorway.';
  if(!state.choices.cutting&&!state.procedure.length)return 'Prepare a shoot in the potting room, or plan a shutdown in the boiler room.';
  return 'Choose a recovery method in the main hall. Your field record will return with the samples.';
}
function roomActions(){
  const actions=[];
  if(state.location==='gate')actions.push(['brief','Review your brief']);
  if(state.location==='nave'){actions.push(['survey',state.choices.survey?'Review your baseline survey':'Take a baseline scent sample']);if(state.choices.survey)actions.push(['resolutions','Choose a recovery method']);}
  if(state.location==='potting')actions.push(['cutting',state.choices.cutting?`View your ${state.choices.cutting==='living'?'living cutting':'dried shoot'}`:'Prepare a shoot from the tree']);
  if(state.location==='boiler')actions.push(['procedure',state.procedure.length?'Review the shutdown plan':'Plan a controlled shutdown']);
  if(state.location==='office')actions.push(['report','Review your field record']);
  actions.push(['notebook',state.evidence.length>=2?'Compare clues':'Open field notes']);
  return `<div class="scene-actions">${actions.map(([action,label],i)=>`<button class="btn ${i===0?'primary':''}" data-action="${action}">${e(label)}<span aria-hidden="true">↗</span></button>`).join('')}</div>`;
}
function renderGame(){
  const scene=scenes[state.location];const found=scene.hotspots.filter(h=>state.evidence.includes(h.id)).length;
  app.innerHTML=`<div class="game-shell">${header(true)}<main class="game-layout" id="main"><section class="scene-stage ${meta.markers?'':'markers-off'}" aria-label="${e(scene.title)}"><img class="scene-photo" src="assets/scenes/${scene.image}.jpg" alt="${e(scene.subtitle)}" ${state.location==='passage'?'style="object-position:78% center;transform:scale(1.08)"':''}>${state.location==='gate'?'<div class="rain" aria-hidden="true"></div>':''}<div class="scene-header"><div class="label"><span class="scene-index">${String(ids.indexOf(state.location)+1).padStart(2,'0')}</span>${e(scene.subtitle)}</div><h1>${e(scene.title)}</h1></div><div class="hotspots">${scene.hotspots.map((h,i)=>`<button class="hotspot ${state.evidence.includes(h.id)?'found':''}" style="left:${h.x}%;top:${h.y}%" data-action="inspect" data-id="${h.id}" aria-label="${e(h.label)}${state.evidence.includes(h.id)?', recorded':''}"><span class="hotspot-dot">${state.evidence.includes(h.id)?'✓':String(i+1).padStart(2,'0')}</span><span class="hotspot-name">${e(h.label)}</span></button>`).join('')}</div><div class="scene-bottom"><div><div class="label muted">${found} / ${scene.hotspots.length} clues recorded</div><div class="scene-weather label"><span class="weather-dot"></span>${e(scene.weather)}</div></div><button class="text-btn" data-action="markers">Labels ${meta.markers?'on':'off'}</button></div></section><aside class="note-panel" aria-label="Scene narrative"><div class="note-heading"><span class="label">${state.deductions.length===2?'Both questions answered':'Investigation'}</span><span class="dot" aria-hidden="true"></span></div><h2>${state.location==='gate'?'Your first task':e(scene.title)}</h2><div class="narrative">${paragraphs(scene.description)}${state.location==='potting'&&state.choices.cutting?`<p class="signal">${state.choices.cutting==='living'?'The wrapped shoot rests on the warm inner ledge. It stays inside the extra room until the final transfer.':'The dry shoot is packed in a labelled sleeve. It can no longer move the doorway.'}</p>`:''}</div>${sensory(scene.sensory)}${roomActions()}<div class="objective"><span class="label">Next step</span>${e(objective())}</div><div class="scene-observations"><div class="label">Objects in this room</div>${scene.hotspots.map(h=>`<button class="object-link" data-action="inspect" data-id="${h.id}"><span>${e(evidence[h.id].title)}</span><span>${state.evidence.includes(h.id)?'✓':'↗'}</span></button>`).join('')}</div></aside></main><nav class="location-bar" aria-label="Glasshouse locations"><div class="location-heading"><svg viewBox="0 0 30 30" aria-hidden="true"><path d="M2 8 10 4l10 4 8-4v20l-8 4-10-4-8 4Z M10 4v20M20 8v20"/></svg><span class="label">Site<br>plan</span></div><div class="locations">${ids.map((id,i)=>`<button class="location ${id===state.location?'active':''}" data-action="travel" data-id="${id}" ${id===state.location?'aria-current="location"':''}><span class="location-number">${String(i+1).padStart(2,'0')}</span><span><span class="location-title">${shortNames[id]}</span><span class="location-meta">${scenes[id].hotspots.filter(h=>state.evidence.includes(h.id)).length}/${scenes[id].hotspots.length} recorded</span></span></button>`).join('')}</div></nav><div class="grain" aria-hidden="true"></div></div>`;
}
function showDialog(title,body,{eyebrow='Field notebook',footer='',wide=false}={}){
  const wasOpen=dialog.open;const scroll=dialog.scrollTop;
  const focused=dialog.contains(document.activeElement)?document.activeElement:null;
  const focusData=focused?.dataset?{...focused.dataset}:null;
  dialog.style.width=wide?'min(970px, calc(100% - 24px))':'';
  dialog.innerHTML=`<header class="dialog-top"><div><div class="label">${e(eyebrow)}</div><h2 id="dialog-title">${e(title)}</h2></div><button class="close-dialog" data-action="close" aria-label="Close dialog">×</button></header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-footer">${footer}</footer>`:''}`;
  if(!wasOpen){dialog.showModal();dialog.scrollTop=0;}else{
    dialog.scrollTop=scroll;
    const selector=focusData?.action?'button'+Object.entries(focusData).map(([k,v])=>`[data-${k}="${CSS.escape(v)}"]`).join(''):'';
    const replacement=selector?dialog.querySelector(selector):null;
    if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});
    else{const title=dialog.querySelector('#dialog-title');title.tabIndex=-1;title.focus({preventScroll:true});}
  }
}
function closeDialog(){dialog.close();pendingEnding=null;}
function documentArt(id){
  const item=evidence[id];
  const drawings={plan:'<svg viewBox="0 0 260 120" aria-hidden="true"><path d="M15 20h230v80H15zM15 60h230M43 20v80M72 20v80M101 20v80M130 20v80M159 20v80M188 20v80M217 20v80"/><path stroke-dasharray="3 4" d="M245 20h12v80h-12"/><path stroke="#a03d2e" stroke-width="2" d="M28 90H230V35"/><circle cx="230" cy="35" r="4"/></svg>',survey:'<svg viewBox="0 0 260 120" aria-hidden="true"><path d="M15 80h230M15 85h230"/><path d="M90 55h30v25H90zM105 55V22h40"/><circle cx="105" cy="50" r="5"/><path stroke-dasharray="3 4" d="M140 45c70-40 70 65 0 30"/><path d="m145 66-7 9 12 3"/></svg>',thermal:'<svg viewBox="0 0 260 120" aria-hidden="true"><path d="M22 100h220M22 15v85M24 85h60l30-50h85l20 35h24"/><path stroke-dasharray="4 5" d="M22 35h220M114 15v85"/><circle cx="114" cy="35" r="4"/><path d="M85 100v6M200 100v6"/></svg>',cutting:'<svg viewBox="0 0 260 120" aria-hidden="true"><path d="M115 108q15-35 20-80M128 64q-48 5-52-35 44 1 52 35ZM135 45q35 0 43-30-37 0-43 30ZM122 88q34 5 50-20-35-6-50 20Z"/><path stroke-dasharray="4 4" d="M105 100h26"/></svg>'};
  let art=drawings[item.detail];if(!art)art=`<blockquote>${e(item.excerpt)}</blockquote>`;
  return `<div class="document-art" aria-hidden="true"><div><div class="label">Glasshouse / Field survey</div><div class="doc-title">${e(item.title)}</div></div>${art}<div><div class="doc-line">${e(item.kind).toUpperCase()} / ${String(evidenceIds.indexOf(id)+1).padStart(2,'0')}</div><div class="doc-mark">FIELD COPY</div></div></div>`;
}
function inspectEvidence(id){
  if(!Object.hasOwn(evidence,id))return;
  if(!state.evidence.includes(id)&&evidence[id].location!==state.location)return;
  if(['footprints','thermal','cutting'].includes(id)&&!state.choices.survey){showDialog('Take a baseline sample first',paragraphs(['Record the scent and condition of the room before testing it. Your sampling kit is in the main hall.']),{footer:'<span></span><button class="btn" data-action="go" data-id="nave">Go to the main hall ↗</button>'});return;}
  const isNew=!state.evidence.includes(id);commit(inspect(state,id));if(isNew){audio.cue('inspect');render();}
  const item=evidence[id];
  showDialog(item.title,`<div class="document-layout">${documentArt(id)}<article class="evidence-copy"><div class="label">${e(item.kind)} / ${e(shortNames[item.location])}</div>${paragraphs(item.body)}<div class="clue-excerpt">${e(item.excerpt)}</div></article></div>`,{eyebrow:`Observation ${String(evidenceIds.indexOf(id)+1).padStart(2,'0')} / ${isNew?'Added to field notes':'Recorded'}`,footer:`<span class="label">✓ Kept in your field notes</span><button class="btn" data-action="notebook">Compare clues <span aria-hidden="true">↗</span></button>`});
}
function notebook(){
  selected=selected.filter(id=>state.evidence.includes(id));
  const guidance=state.deductions.length===2?'Both questions are answered. Prepare a specimen or plan the shutdown, then choose a recovery method in the main hall.':!state.deductions.includes('heat')?'Choose two clues, then select Compare clues. Compare the boiler survey with what you observed in the main hall.':'Compare the leaf test with the specimen guide to work out how a cutting could move the door.';
  showDialog('Field notes',`<p class="notebook-intro">${e(guidance)}</p><div class="notebook-layout"><div><div class="evidence-grid">${evidenceIds.map((id,i)=>state.evidence.includes(id)?`<button class="evidence-card" data-action="select-evidence" data-id="${id}" aria-pressed="${selected.includes(id)}"><span class="label">${String(i+1).padStart(2,'0')} / ${e(evidence[id].kind)}</span><strong>${e(evidence[id].title)}</strong><small>${e(shortNames[evidence[id].location])}</small>${selected.includes(id)?'<span class="check">✓</span>':''}</button>`:`<div class="evidence-card empty"><span class="label">${String(i+1).padStart(2,'0')} / Unrecorded</span><small>${e(shortNames[evidence[id].location])}</small></div>`).join('')}</div>${selected.length?`<div class="dialog-actions">${selected.map(id=>`<button class="text-btn" data-action="inspect" data-id="${id}">Reread ${e(evidence[id].title)} ↗</button>`).join('')}</div>`:''}</div><div class="connection-panel"><h3>Compare two clues</h3><div class="selected-slots">${[0,1].map(i=>`<div class="selected-slot ${selected[i]?'filled':''}">${selected[i]?e(evidence[selected[i]].title):`Choose clue ${i+1}`}<span aria-hidden="true">${selected[i]?'✓':'+'}</span></div>`).join('')}</div><button class="btn ${selected.length===2?'green':''}" data-action="connect" ${selected.length!==2?'disabled':''}>Compare clues <span aria-hidden="true">↗</span></button>${boardMessage?`<div class="connection-result" role="status">${e(boardMessage)}</div>`:''}${Object.entries(deductions).map(([id,d])=>`<section class="deduction ${state.deductions.includes(id)?'solved':''}"><div class="label">${state.deductions.includes(id)?'✓ Solved':'Question'}</div><p>${e(state.deductions.includes(id)?d.success:d.question)}</p>${!state.deductions.includes(id)?`<button class="text-btn" data-action="hint" data-id="${id}">Show a hint ${hintLevels[id]?`(${Math.min(hintLevels[id],d.hint.length)}/${d.hint.length})`:'↗'}</button>${hintLevels[id]?`<div class="hint-box">${e(d.hint[Math.min(hintLevels[id],d.hint.length)-1])}</div>`:''}`:''}</section>`).join('')}<div class="journal-log"><div class="label">What you know</div>${state.log.slice(-4).map(item=>`<p>${e(item)}</p>`).join('')||'<p>No clues recorded yet.</p>'}</div></div></div>`,{eyebrow:`${state.evidence.length} ${state.evidence.length===1?'clue':'clues'} / ${state.deductions.length} ${state.deductions.length===1?'answer':'answers'}`,wide:true,footer:`<span class="label">Take your time</span><button class="btn" data-action="close">Return to the house</button>`});
}
function baselineSurvey(){
  if(state.location!=='nave'){commit(travel(state,'nave'));render();}
  commit(decide(state,'survey','done'));render();
  showDialog('The room as you found it',paragraphs(survey),{eyebrow:'Baseline survey / Sample sealed',footer:'<span class="label">Blotter, photograph, measurements</span><button class="btn" data-action="close">Examine the room ↗</button>'});
}
function cuttingChoice(){
  if(!state.choices.survey){showDialog('Record the room first',paragraphs(['Take your baseline scent sample in the main hall before cutting any plant material.']),{footer:'<span></span><button class="btn" data-action="go" data-id="nave">Go to the main hall ↗</button>'});return;}
  if(state.choices.cutting){showDialog('The shoot',paragraphs([state.choices.cutting==='living'?'The shoot is wrapped in damp cloth on the warm inner ledge. You will bring it through the hatch only if you choose the living transfer.':'The dried shoot is packed between labelled sheets. You have a specimen for the Bureau. It can no longer move the doorway.']),{footer:'<span></span><button class="btn" data-action="close">Back to the bench</button>'});return;}
  if(!['graft','carrier'].every(id=>state.evidence.includes(id))){showDialog('Check the tools first',paragraphs(['Read the specimen guide and examine the jar and press before cutting the shoot.']),{footer:'<span></span><button class="btn" data-action="close">Back to the bench</button>'});return;}
  showDialog('Prepare the shoot',`<p>Using the long shears through the hatch, you can cut the one young shoot within reach. Choose how to preserve it before making the cut.</p><p>A living shoot may let you move the doorway. Drying it gives you an inactive specimen and closes that transfer option.</p><button class="dialog-choice" data-action="choose" data-key="cutting" data-value="living"><span class="choice-number">01</span><span><strong>Keep it alive.</strong><small>Wrap it in damp cloth on the warm inner ledge. Leave it inside until the final transfer.</small></span><span class="arrow">↗</span></button><button class="dialog-choice" data-action="choose" data-key="cutting" data-value="pressed"><span class="choice-number">02</span><span><strong>Dry it in the press.</strong><small>Work through the hatch, then retrieve the dry specimen. It will no longer move the doorway.</small></span><span class="arrow">↗</span></button>`,{eyebrow:'Potting room'});
}
function fieldRecord(){
  const findings=state.deductions.map(id=>deductions[id].success);
  showDialog('Your field record',`${paragraphs([state.choices.survey?'Your baseline blotter is sealed. The first photograph and doorway measurements are labelled with the assigned coordinate.':'Take the baseline scent sample in the main hall before choosing a recovery method.'])}<div class="clue-excerpt">${state.evidence.length} of ${evidenceIds.length} observations recorded. ${state.deductions.length} of 2 questions answered.</div>${paragraphs(findings)}${state.choices.cutting?paragraphs([state.choices.cutting==='pressed'?'A dry shoot is packed with your samples.':'The living shoot remains on the warm inner ledge. It has not been recovered yet.']):''}`,{eyebrow:'Bureau Obscura / Field Recovery',footer:'<span></span><button class="btn" data-action="notebook">Compare the evidence ↗</button>'});
}
function procedureDialog(message=''){
  if(state.deductions.length<2){showDialog('Answer the two questions first',paragraphs(['Before switching anything off, work out what keeps the room warm and what moves its doorway. Compare the clues in your field notes.']),{footer:'<span></span><button class="btn" data-action="notebook">Open field notes ↗</button>'});return;}
  if(state.procedure.length){showDialog('Your shutdown plan',`<div class="order-slots">${['Open vent','Turn off heat','Open door'].map((v,i)=>`<div class="order-slot filled"><span class="label">Step ${i+1}</span>${v}</div>`).join('')}</div><p>Open the vent, turn off the heat, then open the door. The boiler is still running. You will carry out this plan when you choose the cooling option.</p><p>Return to the main hall when you are ready.</p>`,{eyebrow:'Shutdown planned',footer:'<span class="label">Ready when you are</span><button class="btn" data-action="go" data-id="nave">Return to the main hall ↗</button>'});return;}
  const labels={vent:'Open the upper vent',cool:'Close the heat supply',door:'Open the inner door'};
  showDialog('Plan the shutdown',`<p>Put the three steps in order. The service plan has the instructions. Select a filled step to remove it. Nothing will switch off yet.</p><div class="order-slots">${[0,1,2].map(i=>`<button class="order-slot ${procedure[i]?'filled':''}" data-action="remove-step" data-index="${i}" ${!procedure[i]?'disabled':''}><span class="label">Step ${i+1}</span>${procedure[i]?e(labels[procedure[i]]):'Choose below'}</button>`).join('')}</div><div class="order-options">${['door','cool','vent'].map(id=>`<button class="btn" data-action="step" data-id="${id}" ${procedure.includes(id)?'disabled':''}>${id==='door'?'Open door':id==='cool'?'Turn off heat':'Open vent'}</button>`).join('')}</div>${message?`<div class="connection-result" role="status">${e(message)}</div>`:''}<div class="dialog-actions"><button class="btn primary" data-action="check-procedure" ${procedure.length!==3?'disabled':''}>Check the sequence ↗</button><button class="text-btn" data-action="inspect" data-id="pipe">Reread the service plan</button></div>`,{eyebrow:'Deduction / Safe shutdown'});
}
const resolutionNames={cool:'Cool the room',carry:'Use the living cutting',stay:'Seal the site and return',break:'Break the fixed pane'};
function resolutions(){
  showDialog('Choose a recovery method',`<p>Choose a method below. You can check its consequences before committing.</p>${endingIds.map(id=>{const availability=endingAvailability(state,id);return `<button class="dialog-choice ${availability.available?'':'locked'}" data-action="${availability.available?'confirm-ending':'locked-ending'}" data-id="${id}" ${availability.available?'':'aria-disabled="true"'}><span class="choice-number">${endings[id].number}</span><span><span class="label">${availability.available?'Ready':'Needs preparation'}</span><strong>${resolutionNames[id]}</strong><small>${e(availability.reason)}</small></span><span class="arrow" aria-hidden="true">${availability.available?'↗':'○'}</span></button>`;}).join('')}<div class="dialog-actions"><button class="text-btn" data-action="close">Keep investigating</button></div>`,{eyebrow:'Main hall'});
}
function confirmEnding(id){
  const available=endingAvailability(state,id);if(!available.available)return;
  pendingEnding=id;
  const cost={cool:'Collect the vent condensate, then cool the room until it closes. You will return with a scent sample and your record. The tree and the extra space will be lost.',carry:'Draw the wrapped shoot into the jar. The doorway will follow it, and the active room may come with it. You will have to transport whatever the carrier contains.',stay:'Leave the heat running and seal the site. Return with the baseline scent blotter, photographs, and measurements. The room will remain active at the assigned coordinate.',break:'Break the fixed pane to reach the flowers and soil beneath the trunk. A root is already pressed against its crack. Opening that boundary could let the growth spread. You will return with samples even if containment fails.'};
  showDialog(resolutionNames[id],`<div class="warning-note">${e(cost[id])}</div><p>This ends the mission. Afterward, you can go back and try another choice.</p><div class="dialog-actions"><button class="btn primary" data-action="finish" data-id="${id}">Do it ↗</button><button class="text-btn" data-action="resolutions">Go back</button></div>`,{eyebrow:'Final decision'});
}
function renderEnding(){
  const ending=endings[state.ending];const notes=epilogue(state);
  app.innerHTML=`<div class="ending"><img class="ending-backdrop" src="assets/scenes/${state.ending==='cool'||state.ending==='stay'?'exterior':'nave'}.jpg" alt="">${header(true)}<main class="ending-wrap" id="main"><article><div class="eyebrow"><span class="rule"></span>Field report / Outcome ${ending.number}</div><h1>${e(ending.title)}</h1><p class="ending-subtitle">${e(ending.subtitle)}</p><div class="ending-prose">${paragraphs(ending.body)}</div>${notes.length?`<div class="ending-epilogue"><div class="label">Your other choices</div>${paragraphs(notes)}</div>`:''}</article><aside class="ending-side" aria-label="Investigation report"><span class="report-stamp">RECOVERY FILED</span><h2>The Ninth Pane</h2><div class="record-row"><span>Clues recorded</span><span>${state.evidence.length} / ${evidenceIds.length}</span></div><div class="record-row"><span>Questions answered</span><span>${state.deductions.length} / 2</span></div><div class="record-row"><span>Recovered</span><span>${e(ending.recovered)}</span></div><div class="record-row"><span>Site status</span><span>${e(ending.site)}</span></div>${sensory(ending.sensory)}<div class="label muted">${meta.endings.length} of 4 outcomes discovered</div><div class="ending-collection">${endingIds.map(id=>`<div class="ending-token ${meta.endings.includes(id)?'unlocked':''} ${id===state.ending?'current':''}" aria-label="Outcome ${endings[id].number}: ${meta.endings.includes(id)?e(endings[id].title):'Undiscovered'}">${meta.endings.includes(id)?'✓ ':''}${endings[id].number}</div>`).join('')}</div><p class="next-thread">${e(replayLead())}</p><button class="btn primary" data-action="rewind">Revisit the last decision <span aria-hidden="true">↗</span></button><button class="btn" data-action="new">Begin a new investigation <span aria-hidden="true">↗</span></button><button class="btn" data-action="download">Save your field report <span aria-hidden="true">↓</span></button></aside></main><div class="grain" aria-hidden="true"></div></div>`;
}
function replayLead(){
  if(!meta.endings.includes('carry'))return 'Try keeping the shoot alive in the potting room.';
  if(!meta.endings.includes('cool'))return 'Try planning a shutdown in the boiler room.';
  if(!meta.endings.includes('stay'))return 'Try sealing the site and returning with your baseline survey.';
  if(!meta.endings.includes('break'))return 'You can also try breaking the glass.';
  return 'You have found all four endings.';
}
function settings(){
  showDialog('Settings',`<div class="settings-row"><div><strong>Ambient sound</strong><small>Rain and the boiler.</small></div><button class="btn" data-action="sound" aria-pressed="${audio.enabled}">${audio.enabled?'On':'Off'}</button></div><div class="settings-row"><div><strong>Motion</strong><small>Rain and scene transitions.</small></div><button class="btn" data-action="motion" aria-pressed="${meta.motion}">${meta.motion?'On':'Off'}</button></div><div class="settings-row"><div><strong>Observation labels</strong><small>Show the names of objects in each room.</small></div><button class="btn" data-action="markers" aria-pressed="${meta.markers}">${meta.markers?'On':'Off'}</button></div><div class="settings-row"><div><strong>Saved on this device</strong><small>${storageAvailable?'Saved after each clue and choice.':'Storage is unavailable. Keep this tab open to retain progress.'}</small></div><span class="label ${storageAvailable?'signal':''}">${storageAvailable?'Active':'Unavailable'}</span></div>${meta.checkpoints.length&&!cover?'<div class="settings-row"><div><strong>Revisit your last decision</strong><small>Go back one choice. Keep the endings you have found.</small></div><button class="btn" data-action="rewind">Revisit ↗</button></div>':''}<div class="dialog-actions"><button class="text-btn" data-action="brief">Your assignment</button>${saved?'<button class="text-btn" data-action="new">Begin again</button>':''}</div>`,{eyebrow:''});
}
function newInvestigation(){showDialog('Begin another investigation?',`<p>Start at the gate with an empty notebook. Keep the endings you have found.</p><div class="dialog-actions"><button class="btn primary" data-action="restart">Begin again ↗</button><button class="text-btn" data-action="close">Keep this investigation</button></div>`,{eyebrow:'New run'});}
function downloadReport(){
  const ending=endings[state.ending];if(!ending)return;
  const contents=['BUREAU OBSCURA','THE NINTH PANE','FIELD REPORT','',`OUTCOME ${ending.number}: ${ending.title}`,ending.subtitle,'',...ending.body,'','DECISIONS ON FILE',...epilogue(state),'','RECORDED OBSERVATIONS',...state.evidence.map(id=>`${evidence[id].title}\n${evidence[id].body.join('\n')}`),'','CONNECTIONS',...state.deductions.map(id=>deductions[id].success)].join('\n\n');
  const url=URL.createObjectURL(new Blob([contents],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`the-ninth-pane-outcome-${ending.number}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your field report is ready to save.');
}
async function handle(action,button){
  if(!identity.allowed)return;
  const id=button?.dataset.id;
  switch(action){
    case 'account':showDialog(displayAgent(identity),`<div class="dialog-actions"><a class="btn" href="${accountLinks.fieldRecovery}" target="_top">Field Recovery ↗</a><a class="btn" href="${accountLinks.home}" target="_top">Return to the Bureau ↗</a></div>`,{eyebrow:'Your account'});break;
    case 'home':closeDialog();cover=true;render();window.scrollTo(0,0);break;
    case 'start':if(!saved){await handle('brief');break;}cover=false;render();window.scrollTo(0,0);break;
    case 'brief':showDialog('The assignment',paragraphs(intro.brief),{eyebrow:intro.coordinate,footer:`<span class="label">Explore at your own pace</span><button class="btn primary" data-action="enter-from-brief">${saved?'Continue mission':'Enter the glasshouse'} ↗</button>`});break;
    case 'enter-from-brief':closeDialog();cover=false;commit(decide(begin(state),'brief','read'));render();window.scrollTo(0,0);break;
    case 'travel':case 'go':if(!Object.hasOwn(scenes,id))return;closeDialog();commit(travel(state,id));cover=false;render();audio.cue('travel');announce(scenes[id].title);if(innerWidth<801)window.scrollTo({top:0,behavior:meta.motion?'smooth':'instant'});break;
    case 'inspect':inspectEvidence(id);break;
    case 'notebook':selected=[];boardMessage='';notebook();break;
    case 'select-evidence':if(selected.includes(id))selected=selected.filter(x=>x!==id);else if(selected.length<2)selected.push(id);else selected=[selected[1],id];boardMessage='';notebook();break;
    case 'connect':{const result=connect(state,selected);commit(result.state);boardMessage=result.message;if(result.success){selected=[];audio.cue('deduction');render();}notebook();break;}
    case 'hint':hintLevels[id]=(hintLevels[id]||0)+1;notebook();break;
    case 'survey':baselineSurvey();break;
    case 'cutting':cuttingChoice();break;
    case 'report':fieldRecord();break;
    case 'choose':{const {key,value}=button.dataset;const changed=commit(decide(state,key,value),true);closeDialog();render();if(changed){audio.cue('choice');toast(state.log.at(-1)||'Decision recorded.');}break;}
    case 'procedure':procedure=[];procedureDialog();break;
    case 'step':if(procedure.length<3&&!procedure.includes(id))procedure.push(id);procedureDialog();break;
    case 'remove-step':procedure.splice(Number(button.dataset.index),1);procedureDialog();break;
    case 'check-procedure':{const result=setProcedure(state,procedure);commit(result.state);if(result.success){audio.cue('deduction');render();}procedureDialog(result.message);break;}
    case 'resolutions':resolutions();break;
    case 'confirm-ending':confirmEnding(id);break;
    case 'locked-ending':announce(endingAvailability(state,id).reason);break;
    case 'finish':if(pendingEnding!==id)return;if(commit(finish(state,id),true)){if(!meta.endings.includes(id))meta.endings.push(id);persist();closeDialog();cover=false;render();audio.cue('ending');window.scrollTo(0,0);}break;
    case 'rewind':{const previous=meta.checkpoints.pop();if(previous){state=previous;selected=[];procedure=[];persist();closeDialog();cover=false;render();window.scrollTo(0,0);toast('You are back at your last choice.');}else toast('There is no earlier decision in this investigation.');break;}
    case 'settings':settings();break;
    case 'sound':{const revision=identityRevision;const wasSettings=dialog.open&&$('#dialog-title')?.textContent==='Settings';await audio.toggle();if(!identity.allowed||revision!==identityRevision){if(audio.enabled)await audio.toggle();break;}render();if(wasSettings)settings();if(!audio.enabled)announce('Ambient sound off.');break;}
    case 'motion':meta.motion=!meta.motion;persist();render();settings();break;
    case 'markers':{const wasSettings=dialog.open&&$('#dialog-title')?.textContent==='Settings';meta.markers=!meta.markers;persist();render();if(wasSettings)settings();break;}
    case 'new':newInvestigation();break;
    case 'restart':state=begin(freshState());meta.checkpoints=[];selected=[];hintLevels={};procedure=[];cover=false;persist();closeDialog();render();window.scrollTo(0,0);break;
    case 'download':downloadReport();break;
    case 'close':closeDialog();break;
  }
}
document.addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(button&&!button.disabled)handle(button.dataset.action,button).catch(()=>toast('That did not work. Your progress is saved.'));});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
dialog.addEventListener('cancel',()=>{pendingEnding=null;});
document.addEventListener('keydown',event=>{if(event.repeat||event.altKey||event.ctrlKey||event.metaKey||dialog.open||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;if(event.key.toLowerCase()==='n'&&!cover){event.preventDefault();handle('notebook');}if(event.key.toLowerCase()==='m'){event.preventDefault();handle('sound');}});
function suspendIdentity(){
  if(localPreview)return;
  identityRevision++;
  identity={allowed:false,checking:true};
  if(dialog.open)closeDialog();
  render();
}
window.addEventListener('pagehide',event=>{
  suspendIdentity();
  if(!event.persisted)audio.destroy();
});
async function refreshIdentity(){
  if(localPreview)return;
  suspendIdentity();
  const revision=identityRevision;
  if(audio.enabled)await audio.toggle();
  const next=await missionIdentity();
  if(revision!==identityRevision)return;
  // Reload after an account switch so another agent never inherits this state.
  if(next.allowed&&next.storageKey!==loadedStorageKey){location.reload();return;}
  identity=next;
  render();
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)suspendIdentity();else void refreshIdentity();
});
window.addEventListener('pageshow',event=>{if(event.persisted)void refreshIdentity();});
window.addEventListener('focus',()=>{void refreshIdentity();});
render();
// Preload the two rooms most players visit first without delaying the title screen.
for(const name of identity.allowed?['nave','potting']:[]){const image=new Image();image.src=`assets/scenes/${name}.jpg`;}
