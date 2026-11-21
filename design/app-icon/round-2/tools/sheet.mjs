// Actual librsvg outputs, composed with the project's sharp. No browser.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const concepts=['d','e','f','f2','g'];
const names=concepts.flatMap(c=>['yellow','ink'].map(g=>`concept-${c}-${g}`));
const width=1480,height=1060,gray='#a0a0a0',ink='#1c1a14',layers=[];
function label(s,x,y,size=15,w=1380){
 const escaped=s.replaceAll('&','&amp;').replaceAll('<','&lt;');
 layers.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size*1.6}"><text x="0" y="${size}" font-family="Arial,sans-serif" font-size="${size}" fill="${ink}">${escaped}</text></svg>`),left:x,top:y});
}
async function icon(file,size,left,top){
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size*.22}" fill="white"/></svg>`);
 layers.push({input:await sharp(file).composite([{input:mask,blend:'dest-in'}]).png().toBuffer(),left,top});
}
label('Adaptive Lifting / round 2',40,25,34);
label('The actual Signal character. Yellow / ink. Each icon shown at 180 px, then 60 px.',40,77,18);
for(const [row,ground] of ['yellow','ink'].entries()){
 const y=136+row*412;
 label(`${ground==='yellow'?'YELLOW':'INK'} GROUND / 180 px`,40,y,17);
 const entries=(row===0?['comparison']:['empty']).concat(concepts.map(c=>`concept-${c}-${ground}`));
 for(const [i,name] of entries.entries()){
  const x=40+i*240;
  if(name==='empty')continue;
  const comparison=name==='comparison';
  const base=comparison?path.resolve(root,'../png'):path.join(root,'png');
  const stem=comparison?'concept-c-yellow':name;
  await icon(path.join(base,`${stem}-180.png`),180,x+20,y+37);
  label(comparison?'round 1 C (current favorite)':`${name}.svg`,x,y+230,14,235);
  await icon(path.join(base,`${stem}-60.png`),60,x+80,y+278);
  label(comparison?'concept-c-yellow.svg':`${name}.svg`,x,y+350,14,235);
 }
}
label('D: rig bench press   /   E: loaded lockout   /   F: A/L experiment   /   F2: plain weights   /   G: C + lifter',40,970,17);
label('Full-bleed square sources. The 22% corner radius is preview-only. F2 reads more clearly than F at 60 px.',40,1005,16);
await sharp({create:{width,height,channels:3,background:gray}}).composite(layers).png().toFile(path.join(root,'sheet.png'));
const rows=['yellow','ink'].map((ground,row)=>{
 const entries=(row===0?['comparison']:['empty']).concat(concepts.map(c=>`concept-${c}-${ground}`));
 return `<section><h2>${ground.toUpperCase()} GROUND / 180 px, then 60 px</h2><div class="grid">${entries.map(name=>{
  if(name==='empty')return '<div></div>';
  const cmp=name==='comparison',stem=cmp?'concept-c-yellow':name,dir=cmp?'../png':'png';
  return `<figure><img class="large" src="${dir}/${stem}-180.png" width="180" height="180" alt="${stem}"><figcaption>${cmp?'round 1 C (current favorite)':`${name}.svg`}</figcaption><img class="small" src="${dir}/${stem}-60.png" width="60" height="60" alt="${stem}, actual 60 pixels"><figcaption>${stem}.svg</figcaption></figure>`;
 }).join('')}</div></section>`;
}).join('');
await fs.writeFile(path.join(root,'sheet.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Adaptive Lifting / round 2</title><style>*{box-sizing:border-box}body{margin:0;background:${gray};color:${ink};font:16px/1.5 Arial,sans-serif}main{width:1480px;padding:25px 40px}h1{font-size:34px;margin:0}header p{font-size:18px;margin:14px 0 34px}h2{font-size:17px;font-weight:400;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(6,220px);gap:20px}section{margin-bottom:40px}figure{margin:0}img{display:block;border-radius:22%}.large{margin:0 20px}.small{margin:24px 80px 0}figcaption{font-size:14px;margin-top:12px}footer{margin-top:30px}</style></head><body><main><header><h1>Adaptive Lifting / round 2</h1><p>The actual Signal character. Yellow / ink. Each icon shown at 180 px, then 60 px.</p></header>${rows}<footer><p>D: rig bench press / E: loaded lockout / F: A/L experiment / F2: plain weights / G: C + lifter</p><p>Full-bleed square sources. The 22% corner radius is preview-only. F2 reads more clearly than F at 60 px.</p></footer></main></body></html>\n`);
// Inspect actual pixels for size, opacity and centered 80% square safe area.
const validation=[];
for(const name of names){
 const svg=await fs.readFile(path.join(root,`${name}.svg`),'utf8');
 if(/<(?:text|image|linearGradient|radialGradient|filter)\b/.test(svg))throw Error(`${name}: non-vector or effect`);
 let box=[1024,1024,0,0];
 for(const size of [1024,180,60]){
  const {data,info}=await sharp(path.join(root,'png',`${name}-${size}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==size||info.height!==size)throw Error(`${name}: size`);
  const bg=name.endsWith('yellow')?[255,200,0]:[28,26,20];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const i=(y*size+x)*4;if(data[i+3]!==255)throw Error(`${name}: alpha`);
   if(size===1024&&Math.max(...bg.map((c,j)=>Math.abs(data[i+j]-c)))>12)box=[Math.min(box[0],x),Math.min(box[1],y),Math.max(box[2],x),Math.max(box[3],y)];
  }
 }
 if(box[0]<102.4||box[1]<102.4||box[2]>921.6||box[3]>921.6)throw Error(`${name}: outside centered 80% square ${box}`);
 validation.push({file:`${name}.svg`,bounds:box,opaque:true,sizes:[1024,180,60],safe_area:'centered 80% square'});
}
const baseline=JSON.parse(await fs.readFile(path.join(root,'tools/round-1-baseline.json'),'utf8'));
for(const [file,hash] of Object.entries(baseline)){
 const current=createHash('sha256').update(await fs.readFile(path.resolve(root,'..',file))).digest('hex');
 if(current!==hash)throw Error(`Round 1 changed: ${file}`);
}
await fs.writeFile(path.join(root,'tools/validation.json'),JSON.stringify({icons:validation,round1:'All baseline hashes match',renderer:'/opt/homebrew/bin/rsvg-convert',composition:'sharp from project node_modules; no browser',lettering:'F uses actual Overpass variable font instantiated at 900 and outlined by fontTools/HarfBuzz.'},null,2)+'\n');
console.log('Sheet built; 10 vectors and 30 rasters validated; round 1 unchanged.');
