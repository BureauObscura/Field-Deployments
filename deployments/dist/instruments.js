const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const line=(x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
const text=(x,y,value)=>`<text x="${x}" y="${y}">${esc(value)}</text>`;
const frame=body=>`<svg viewBox="0 0 640 300" class="instrument-svg" aria-hidden="true"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#98e59812"/></pattern></defs><rect width="640" height="300" fill="url(#grid)"/>${body}</svg>`;
export function instrument(game,state) {
  const p=game.puzzle,controls=p.controls;
  const positions=controls.map((c,i)=>c.options.findIndex(o=>o.value===state.setup[c.id]));
  const selected=controls.map(c=>c.options.find(o=>o.value===state.setup[c.id]));
  let body='';
  if(p.type==='route') {
    const spots=[[205,85],[205,215],[435,215],[435,85]],directions={w:[-65,0],e:[65,0],n:[0,-55],s:[0,55]};
    spots.forEach(([x,y],i)=>{const c=controls[i],value=state.setup[c.id]||'';body+=`<rect x="${x-65}" y="${y-55}" width="130" height="110" rx="2" class="tile"/>`;
      for(const d of value){if(directions[d]){const[dx,dy]=directions[d];body+=line(x,y,x+dx,y+dy,'class="path"');}}
      body+=text(x-55,y-34,c?.label||'')+`<circle cx="${x}" cy="${y}" r="5"/>`;});
    body+=line(205,140,205,160)+line(270,215,370,215)+line(435,140,435,160)+line(40,85,140,85,'class="path"')+line(500,85,600,85,'class="path"')+text(42,65,'ENTRY')+text(518,65,'BASIN');
  } else if(p.type==='optics') {
    const mirrors=[{x:180,y:215},{x:180,y:75},{x:440,y:75}];
    body+=`<circle cx="45" cy="215" r="17" class="lamp"/>`+text(20,255,'LIGHT')+`<rect x="405" y="265" width="70" height="8" class="plate"/>`+text(400,292,'TEST PLATE');
    mirrors.forEach(({x,y},i)=>{const value=state.setup[controls[i].id];body+=`<circle cx="${x}" cy="${y}" r="31" class="tile"/>`;
      body+=value==='closed'?`<rect x="${x-22}" y="${y-22}" width="44" height="44" class="plate"/>`:value?line(x-22,value==='rise'?y+22:y-22,x+22,value==='rise'?y-22:y+22,'class="mirror"'):text(x-3,y+4,'?');
      body+=text(x+39,y+4,controls[i].label);});
    let point={x:62,y:215},direction='e';
    const reflection={rise:{e:'n',n:'e',w:'s',s:'w'},fall:{e:'s',s:'e',w:'n',n:'w'}};
    for(let bounce=0;bounce<7;bounce++){
      const targets=mirrors.map((m,i)=>({...m,i})).filter(m=>direction==='e'?m.y===point.y&&m.x>point.x:direction==='w'?m.y===point.y&&m.x<point.x:direction==='n'?m.x===point.x&&m.y<point.y:m.x===point.x&&m.y>point.y).sort((a,b)=>Math.abs(a.x-point.x)+Math.abs(a.y-point.y)-Math.abs(b.x-point.x)-Math.abs(b.y-point.y));
      const next=targets[0]||{x:direction==='e'?620:direction==='w'?20:point.x,y:direction==='n'?20:direction==='s'?(point.x===440?265:280):point.y};
      body+=line(point.x,point.y,next.x,next.y,'class="beam"');
      if(next.i===undefined)break;
      const value=state.setup[controls[next.i].id];if(!reflection[value])break;
      direction=reflection[value][direction];point=next;
    }
  } else if(p.type==='cycle') {
    body+=`<circle cx="160" cy="150" r="103" class="drum"/><circle cx="160" cy="150" r="86" class="tile"/>`;
    for(let i=0;i<12;i++){const a=(i*30+positions.filter(n=>n>=0).reduce((a,b)=>a+b,0)*12)*Math.PI/180;body+=`<circle cx="${160+Math.cos(a)*72}" cy="${150+Math.sin(a)*72}" r="3"/>`;}
    controls.forEach((c,i)=>{const y=55+i*65;body+=text(300,y,c.label)+`<rect x="300" y="${y+12}" width="270" height="12" class="tile"/><rect x="300" y="${y+12}" width="${positions[i]<0?0:270*(positions[i]+1)/c.options.length}" height="12" class="fill"/>`;});
    body+=text(132,156,state.puzzle?'SET':'DRUM');
  } else if(p.type==='channels') {
    body+=`<path d="M45 55H115V245H45Z" class="water"/>`;
    controls.forEach((c,i)=>{const y=65+i*68,x=235;body+=`<path d="M115 ${y}H${x}L${x+70} ${y+(positions[i]-1)*12}H560" class="channel"/>`+`<rect x="${x-9}" y="${y-20}" width="18" height="40" class="gate-piece" transform="rotate(${positions[i]<0?0:positions[i]*30} ${x} ${y})"/>`+text(340,y-22,c.label)+`<circle cx="574" cy="${y+(positions[i]-1)*12}" r="12" class="receiver"/>`;});
  } else {
    const w=560/controls.length;
    controls.forEach((c,i)=>{const x=40+i*w;body+=`<rect x="${x}" y="55" width="${w-10}" height="185" class="tile"/>`+text(x+10,80,c.label);
      if(positions[i]>=0){let points='';for(let j=0;j<18;j++){const height=15+(positions[i]+1)*9;points+=`${x+12+j*(w-32)/17},${155+Math.sin(j*(positions[i]+1)*.8)*height} `;}body+=`<polyline points="${points}" class="wave"/>`;} else body+=text(x+w/2-10,160,'?');});
  }
  return frame(body)+`<div class="instrument-controls">${controls.map((c,i)=>`<fieldset><legend>${esc(c.label)}</legend><div class="option-strip">${c.options.map(o=>`<button type="button" data-action="control" data-id="${esc(c.id)}" data-value="${esc(o.value)}" aria-pressed="${state.setup[c.id]===o.value}" ${state.puzzle?'disabled':''}>${esc(o.label)}</button>`).join('')}</div><p class="control-feedback">${esc(selected[i]?.feedback||'Choose a setting.')}</p></fieldset>`).join('')}</div>`;
}
