import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const expectedSlugs=['sand-map','third-exposure','seventh-rinse','the-dry-tide','the-rain-register'];
const array=value=>Array.isArray(value)?value:[];
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function readGames(){return Promise.all(expectedSlugs.map(async slug=>JSON.parse(await fs.readFile(path.join(projectRoot,'dist/games',slug+'.json'),'utf8'))));}
export function validateGame(game){
  const errors=[];const check=(ok,message)=>{if(!ok)errors.push(message);};
  const fields=(value,required,optional,label)=>{check(object(value),`${label}: expected object`);if(!object(value))return false;for(const key of required)check(Object.hasOwn(value,key),`${label}: missing ${key}`);for(const key of Object.keys(value))check([...required,...optional].includes(key),`${label}: unknown field ${key}`);return true;};
  const text=(value,label)=>check(typeof value==='string'&&value.trim().length>0&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>—]/.test(value),`${label}: expected nonempty plain text without markup or em dash`);
  const texts=(value,label,min=1,max=Infinity)=>{check(Array.isArray(value)&&value.length>=min&&value.length<=max,`${label}: expected ${min}–${max===Infinity?'many':max} text entries`);array(value).forEach((v,i)=>text(v,`${label}[${i}]`));};
  const id=(value,label)=>check(typeof value==='string'&&/^[a-z][a-z0-9_-]*$/.test(value)&&!['constructor','prototype','tostring','valueof'].includes(value.toLowerCase()),`${label}: invalid or reserved ID`);
  const unique=(items,key,label)=>{const seen=new Set();for(const item of array(items)){id(item?.[key],`${label}.${key}`);check(!seen.has(item?.[key]),`${label}: duplicate ${item?.[key]}`);seen.add(item?.[key]);}};
  const sensory=(value,label)=>{if(fields(value,['air','contact','residue'],[],label))for(const key of ['air','contact','residue'])text(value[key],label+'.'+key);};
  if(!fields(game,['version','slug','title','number','coordinate','duration','summary','motif','start','intro','brief','baseline','scenes','evidence','deductions','choices','puzzle','endings'],[],'game'))return errors;
  check(Number.isSafeInteger(game.version)&&game.version>0,'game.version: positive integer required');
  check(expectedSlugs.includes(game.slug),'game.slug: not a registered game');
  check(game.number===String(expectedSlugs.indexOf(game.slug)+2).padStart(2,'0'),'game.number: wrong library position');
  for(const key of ['title','coordinate','duration','summary'])text(game[key],'game.'+key);
  check(['sand','light','water','machine','storm'].includes(game.motif),'game.motif: unknown motif');texts(game.intro,'intro',2,2);texts(game.brief,'brief',3,3);
  for(const [key,count]of[['scenes',6],['evidence',12],['choices',2],['endings',4]]){check(Array.isArray(game[key])&&game[key].length===count,`${key}: expected ${count} entries`);unique(game[key],'id',key);}
  check(Array.isArray(game.deductions)&&game.deductions.length>=2&&game.deductions.length<=3,'deductions: expected two or three');unique(game.deductions,'id','deductions');
  const sceneIds=new Set(array(game.scenes).map(s=>s.id)),evidenceIds=new Set(array(game.evidence).map(e=>e.id)),deductionIds=new Set(array(game.deductions).map(d=>d.id)),endingIds=new Set(array(game.endings).map(e=>e.id));
  const scene=(value,label)=>check(sceneIds.has(value),`${label}: unknown scene ${value}`);
  scene(game.start,'start');
  const requirements=(value,label)=>{if(value===undefined)return;if(!fields(value,[],['evidence','deductions','puzzle','choices'],label))return;
    for(const[key,ids]of[['evidence',evidenceIds],['deductions',deductionIds]])if(Object.hasOwn(value,key)){check(Array.isArray(value[key])&&value[key].length>0,`${label}.${key}: nonempty list required`);check(new Set(array(value[key])).size===array(value[key]).length,`${label}.${key}: duplicates`);for(const entry of array(value[key]))check(ids.has(entry),`${label}.${key}: unknown ${entry}`);}
    if(Object.hasOwn(value,'puzzle'))check(value.puzzle===true,`${label}.puzzle: only true is supported`);
    if(Object.hasOwn(value,'choices')){check(object(value.choices),`${label}.choices: expected object`);for(const[key,values]of Object.entries(object(value.choices)?value.choices:{})){const choice=array(game.choices).find(c=>c.id===key);check(Boolean(choice),`${label}.choices: unknown ${key}`);check(Array.isArray(values)&&values.length>0,`${label}.choices.${key}: nonempty option list required`);check(new Set(array(values)).size===array(values).length,`${label}.choices.${key}: duplicate options`);for(const v of array(values))check(array(choice?.options).some(o=>o.id===v),`${label}.choices.${key}: unknown option ${v}`);}}
  };
  if(fields(game.baseline,['location','title','body','result','inventory'],[],'baseline')){scene(game.baseline.location,'baseline.location');text(game.baseline.title,'baseline.title');texts(game.baseline.body,'baseline.body',3,3);text(game.baseline.result,'baseline.result');texts(game.baseline.inventory,'baseline.inventory');}
  const seenHotspots=new Map();
  for(const s of array(game.scenes)){const label='scene.'+s.id;if(!fields(s,['id','title','subtitle','image','description','sensory','weather','weatherLabel','hotspots'],[],label))continue;for(const key of ['title','subtitle'])text(s[key],label+'.'+key);texts(s.description,label+'.description',2,3);sensory(s.sensory,label+'.sensory');
    check(s.image===`assets/scenes/${game.slug}/${s.id}.jpg`,label+': image must match slug/scene');check(['none','rain','snow','dust'].includes(s.weather),label+': unsupported weather');check(typeof s.weatherLabel==='string'&&(s.weather==='none'||s.weatherLabel.trim()),label+': weather label required outdoors');
    check(Array.isArray(s.hotspots)&&s.hotspots.length===2,label+': two hotspots required');for(const h of array(s.hotspots)){if(!fields(h,['evidence','x','y','label'],[],label+'.hotspot'))continue;check(evidenceIds.has(h.evidence),label+': unknown hotspot clue '+h.evidence);check(array(game.evidence).find(e=>e.id===h.evidence)?.location===s.id,label+': hotspot clue belongs in another scene');for(const key of ['x','y'])check(Number.isFinite(h[key])&&h[key]>=15&&h[key]<=85,label+': hotspot outside safe bounds');text(h.label,label+'.hotspot.label');seenHotspots.set(h.evidence,(seenHotspots.get(h.evidence)||0)+1);}}
  const clueImages=new Set();
  for(const e of array(game.evidence)){const label='evidence.'+e.id;
    if(!fields(e,['id','title','location','kind','body','excerpt','visual','examination','intervention'],[],label))continue;
    scene(e.location,label+'.location');for(const key of ['title','kind','excerpt'])text(e[key],label+'.'+key);texts(e.body,label+'.body',2,3);
    if(fields(e.visual,['image','alt','caption'],[],label+'.visual')){
      check(e.visual.image===`assets/evidence/${game.slug}/${e.id}.jpg`,label+': photograph must match its own game and clue');
      check(!clueImages.has(e.visual.image),label+': evidence photograph reused');clueImages.add(e.visual.image);
      text(e.visual.alt,label+'.visual.alt');text(e.visual.caption,label+'.visual.caption');
    }
    if(fields(e.examination,['lead','action'],[],label+'.examination')){
      text(e.examination.lead,label+'.examination.lead');text(e.examination.action,label+'.examination.action');
      check(!/^(inspect and record|perform and record the test|examine this detail)/i.test(e.examination.action),label+': generic examination action');
    }
    check(typeof e.intervention==='boolean',label+': intervention boolean required');check(seenHotspots.get(e.id)===1,label+': must appear at exactly one hotspot');
  }
  const pairOwners=new Map();
  for(const d of array(game.deductions)){const label='deduction.'+d.id;if(!fields(d,['id','title','question','pairs','success','hints'],[],label))continue;check(d.id!=='puzzle',label+': ID conflicts with instrument hints');for(const key of ['title','question','success'])text(d[key],label+'.'+key);texts(d.hints,label+'.hints',3,3);check(Array.isArray(d.pairs)&&d.pairs.length>=2,label+': two supported pairs required');for(const pair of array(d.pairs)){check(Array.isArray(pair)&&pair.length===2&&pair[0]!==pair[1],label+': each pair needs two different clues');for(const e of array(pair))check(evidenceIds.has(e),label+': unknown pair clue '+e);const key=array(pair).slice().sort().join('|');check(!pairOwners.has(key),label+': duplicate or ambiguous clue pair '+key);pairOwners.set(key,d.id);}}
  for(const c of array(game.choices)){const label='choice.'+c.id;if(!fields(c,['id','title','location','intro','options'],['requires'],label))continue;scene(c.location,label+'.location');text(c.title,label+'.title');texts(c.intro,label+'.intro',1,2);requirements(c.requires,label+'.requires');check(Array.isArray(c.options)&&c.options.length>=2&&c.options.length<=3,label+': two or three options required');unique(c.options,'id',label+'.options');for(const o of array(c.options)){const ol=label+'.'+o.id;if(!fields(o,['id','label','description','cost','result','sceneNote','epilogues'],['requires'],ol))continue;for(const key of ['label','description','cost','sceneNote'])text(o[key],ol+'.'+key);texts(o.result,ol+'.result',1,2);requirements(o.requires,ol+'.requires');check(object(o.epilogues),ol+': epilogues must be a map');for(const[key,paragraphs]of Object.entries(object(o.epilogues)?o.epilogues:{})){check(endingIds.has(key),ol+': unknown epilogue ending '+key);texts(paragraphs,ol+'.epilogues.'+key,1,1);}}}
  const p=game.puzzle;
  if(fields(p,['id','title','location','type','intro','controls','solution','hints','success','failure'],['requires'],'puzzle')){id(p.id,'puzzle.id');scene(p.location,'puzzle.location');text(p.title,'puzzle.title');text(p.failure,'puzzle.failure');texts(p.intro,'puzzle.intro',2,2);texts(p.hints,'puzzle.hints',3,3);texts(p.success,'puzzle.success',2,2);requirements(p.requires,'puzzle.requires');check(['route','optics','cycle','channels','sequence'].includes(p.type),'puzzle.type: unknown instrument');check(Array.isArray(p.controls)&&p.controls.length>=3&&p.controls.length<=4,'puzzle.controls: three or four required');if(p.type==='route')check(p.controls?.length===4,'route instrument: four controls required');unique(p.controls,'id','puzzle.controls');check(object(p.solution),'puzzle.solution: expected map');check(Object.keys(p.solution||{}).sort().join('|')===array(p.controls).map(c=>c.id).sort().join('|'),'puzzle.solution: keys must match every control');for(const c of array(p.controls)){if(!fields(c,['id','label','options'],[],'control.'+c.id))continue;text(c.label,'control.label');check(Array.isArray(c.options)&&c.options.length>=3&&c.options.length<=5,'control.'+c.id+': three to five options required');const values=new Set();for(const o of array(c.options)){if(!fields(o,['value','label','feedback'],[],'control.option'))continue;for(const key of ['value','label','feedback'])text(o[key],'control.option.'+key);check(!values.has(o.value),'control.'+c.id+': duplicate value');values.add(o.value);}check(values.has(p.solution?.[c.id]),'control.'+c.id+': solution is not an option');}if(p.type==='sequence')check(new Set(Object.values(p.solution||{})).size===array(p.controls).length,'sequence solution must use distinct values');}
  for(const e of array(game.endings)){const label='ending.'+e.id;if(!fields(e,['id','title','subtitle','locked','action','consequence','body','recovered','siteStatus','sensory'],['requires'],label))continue;for(const key of ['title','subtitle','locked','action','consequence','siteStatus'])text(e[key],label+'.'+key);requirements(e.requires,label+'.requires');texts(e.body,label+'.body',4,4);texts(e.recovered,label+'.recovered',2,3);sensory(e.sensory,label+'.sensory');}
  return errors;
}
export function imageDimensions(bytes){
  if(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),format:'png'};
  if(bytes[0]!==255||bytes[1]!==216)throw Error('Expected native PNG or web JPEG');
  let at=2;while(at<bytes.length){if(bytes[at++]!==255)continue;while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===0xd9||marker===0xda)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;if(at+2>bytes.length)break;const length=bytes.readUInt16BE(at);if(length<2||at+length>bytes.length)throw Error('Malformed JPEG segment');if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){if(length<8)throw Error('Malformed JPEG dimensions');return{height:bytes.readUInt16BE(at+3),width:bytes.readUInt16BE(at+5),format:'jpeg'};}at+=length;}throw Error('JPEG dimensions not found');
}
async function filesUnder(directory){const result=[];for(const entry of await fs.readdir(directory,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const name=path.join(directory,entry.name);if(entry.isDirectory())result.push(...await filesUnder(name));else result.push(name);}return result;}
export async function checkBrowserReferences({assets=false}={}){
  const dist=path.join(projectRoot,'dist'),errors=[];
  for(const filename of await filesUnder(dist)){if(!/\.(?:html|css|js)$/.test(filename))continue;const source=await fs.readFile(filename,'utf8'),refs=[];
    if(filename.endsWith('.html'))for(const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g))refs.push(match[1]);
    if(filename.endsWith('.css'))for(const match of source.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g))refs.push(match[1]);
    if(filename.endsWith('.js')){for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)["'](\.[^"']+)["']/g))refs.push(match[1]);for(const match of source.matchAll(/["'`](assets\/[a-zA-Z0-9_.\/-]+)["'`]/g))refs.push(match[1]);}
    for(const ref of refs){if(/^(?:https?:|data:|blob:|#|\/)/.test(ref))continue;const clean=ref.split(/[?#]/)[0],resolved=path.resolve(path.dirname(filename),clean);if(!resolved.startsWith(dist+path.sep)){errors.push(`${path.relative(projectRoot,filename)}: reference escapes dist: ${ref}`);continue;}if(!assets&&clean.startsWith('assets/scenes/'))continue;try{if(!(await fs.stat(resolved)).isFile())throw Error();}catch{errors.push(`${path.relative(projectRoot,filename)}: missing ${ref}`);}}
  }return errors;
}
export async function checkAssets(games){
  const errors=[],expected=[...games.flatMap(g=>[...g.scenes.map(s=>s.image),...g.evidence.map(e=>e.visual?.image)]),'assets/scenes/ninth-pane.jpg'];
  let manifest;try{manifest=JSON.parse(await fs.readFile(path.join(projectRoot,'docs/image-provenance.json'),'utf8'));}catch{return['docs/image-provenance.json: required asset manifest is missing or invalid'];}
  const rows=Array.isArray(manifest)?manifest:manifest.images;
  if(!Array.isArray(rows))return['image manifest: expected an array or {images:[]}'];
  const seen=new Set(),imageHashes=new Set();let totalBytes=0;
  for(const row of rows){const label=String(row?.webPath||'(missing webPath)');if(!object(row)){errors.push('image manifest: invalid row');continue;}
    if(!expected.includes(row.webPath)||seen.has(row.webPath)){errors.push(label+': unknown or duplicate web path');continue;}seen.add(row.webPath);
    if(row.generated!==true)errors.push(label+': generated provenance must be explicit');
    if(imageHashes.has(row.sourceSha256))errors.push(label+': another asset uses the same native image');imageHashes.add(row.sourceSha256);
    try{const web=await fs.readFile(path.join(projectRoot,'dist',row.webPath)),dimensions=imageDimensions(web);totalBytes+=web.length;if(dimensions.format!=='jpeg'||dimensions.width!==dimensions.height||dimensions.width!==row.width||dimensions.height!==row.height)errors.push(label+': web image must be JPEG with matching square dimensions');if(dimensions.width<512)errors.push(label+': web image is smaller than 512 square');if(digest(web)!==row.sha256)errors.push(label+': web hash mismatch');
      if(typeof row.sourcePath!=='string')throw Error('missing native sourcePath');const sourcePath=path.resolve(projectRoot,row.sourcePath);if(!sourcePath.startsWith(projectRoot+path.sep)||sourcePath.startsWith(path.join(projectRoot,'dist')+path.sep))throw Error('native source must be preserved inside the project, outside dist');const source=await fs.readFile(sourcePath),native=imageDimensions(source);if(native.width!==native.height||native.width!==row.sourceWidth||native.height!==row.sourceHeight)errors.push(label+': native source is not square or dimensions differ');if(digest(source)!==row.sourceSha256)errors.push(label+': native source hash mismatch');if(native.width<dimensions.width)errors.push(label+': web file is larger than its native source');
    }catch(error){errors.push(label+': '+error.message);}}
  for(const image of expected)if(!seen.has(image))errors.push(image+': missing manifest row');
  return errors.length?errors:{images:expected.length,totalBytes};
}
export async function runChecks({assets=false}={}){
  const games=await readGames();const errors=games.flatMap(game=>validateGame(game).map(error=>game.slug+': '+error));
  const gameFiles=(await fs.readdir(path.join(projectRoot,'dist/games'))).filter(name=>name.endsWith('.json')).sort();if(gameFiles.join('|')!==expectedSlugs.map(slug=>slug+'.json').sort().join('|'))errors.push('dist/games must contain exactly the five registered JSON files');
  errors.push(...await checkBrowserReferences({assets}));let assetResult=null;if(assets){assetResult=await checkAssets(games);if(Array.isArray(assetResult))errors.push(...assetResult);}
  if(errors.length)throw Error(errors.join('\n'));return{games:games.length,endings:games.reduce((n,g)=>n+g.endings.length,0),browserReferences:'PASS',assets:assets?assetResult:'not requested'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.some(arg=>arg!=='--assets')){console.error('Usage: node scripts/check.mjs [--assets]');process.exitCode=2;}else try{console.log(JSON.stringify(await runChecks({assets:args.includes('--assets')}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
