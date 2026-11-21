// Compose actual librsvg PNGs with local sharp. Run: node design/app-icon/round-3/tools/sheet.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(root,'../../..');
const keys=['h','i','j'];
const width=1040,height=1530,gray='#a0a0a0',ink='#1c1a14',layers=[];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function label(s,x,y,size=15,w=960,color=ink){
 layers.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.ceil(size*1.6)}"><text x="0" y="${size}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${esc(s)}</text></svg>`),left:x,top:y});
}
async function icon(file,size,left,top){
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size*.22}" fill="white"/></svg>`);
 layers.push({input:await sharp(file).composite([{input:mask,blend:'dest-in'}]).png().toBuffer(),left,top});
}
const png=(stem,size,prior=false)=>path.join(prior?path.resolve(root,'../round-2/png'):path.join(root,'png'),`${stem}-${size}.png`);
label('Adaptive Lifting / round 3',40,25,34);
label('Weights that tell you what comes next. E / H rising bar / I E + climb / J next plate.',40,78,17);
for(const [row,ground] of ['yellow','ink'].entries()){
 const y=row===0?116:526;
 label(`${ground.toUpperCase()} GROUND / 180 px`,40,y,17);
 const entries=[row===0?'comparison':null,...keys.map(k=>`concept-${k}-${ground}`)];
 for(const [col,name] of entries.entries()){
  if(!name)continue;
  const prior=name==='comparison',stem=prior?'concept-e-yellow':name,x=40+col*240;
  await icon(png(stem,180,prior),180,x+30,y+34);
  label(prior?'round 2 E (front-runner)':`${stem}.svg`,x,y+226,13,232);
  await icon(png(stem,60,prior),60,x+90,y+284);
  label(`${stem}.svg`,x,y+358,13,232);
 }
 label('60 px',40,y+260,13);
}
label('HOME-SCREEN CHECK / yellow icons at actual 60 px',40,1286,17);
for(const [col,bg] of ['#000000','#ffffff'].entries()){
 const x=40+col*490,top=1324;
 layers.push({input:await sharp({create:{width:470,height:118,channels:3,background:bg}}).png().toBuffer(),left:x,top});
 for(const [index,key] of keys.entries()){
  await icon(png(`concept-${key}-yellow`,60),60,x+48+index*154,top+14);
  label(`concept-${key}-yellow.svg`,x+10+index*154,top+87,12,150,col===0?'#ffffff':ink);
 }
}
label('Black background',40,1450,13);label('White background',530,1450,13);
label('WORDMARKS / real Overpass 900 outlines',40,936,17);
for(const [row,key] of ['e','h'].entries())for(const [col,ground] of ['ink','yellow'].entries()){
 const stem=`wordmark-${key}${ground==='yellow'?'-yellow':''}`,x=40+col*490,y=974+row*148;
 layers.push({input:await sharp(path.join(root,'png',`${stem}.png`)).resize(470).png().toBuffer(),left:x,top:y});
 label(`${stem}.svg`,x,y+130,12,470);
}
label('Recommendation: H on yellow. E keeps the character; H makes the progression cue larger.',40,1484,15);
await sharp({create:{width,height,channels:3,background:gray}}).composite(layers).png().toFile(path.join(root,'sheet.png'));
const rows=['yellow','ink'].map((ground,row)=>{
 const entries=[row===0?'comparison':null,...keys.map(k=>`concept-${k}-${ground}`)];
 const tiles=size=>entries.map(name=>{
  if(!name)return '<figure></figure>';
  const prior=name==='comparison',stem=prior?'concept-e-yellow':name,dir=prior?'../round-2/png':'png';
  return `<figure><img src="${dir}/${stem}-${size}.png" width="${size}" height="${size}" alt="${stem}, ${size} pixels"><figcaption>${prior&&size===180?'round 2 E (front-runner)':`${stem}.svg`}</figcaption></figure>`;
 }).join('');
 return `<section><h2>${ground.toUpperCase()} GROUND / 180 px</h2><div class="grid large">${tiles(180)}</div><h3>60 px</h3><div class="grid small">${tiles(60)}</div></section>`;
}).join('');
const strips=['black','white'].map(bg=>`<div><div class="strip ${bg}">${keys.map(key=>`<figure><img src="png/concept-${key}-yellow-60.png" width="60" height="60" alt="${key.toUpperCase()} on ${bg}"><figcaption>concept-${key}-yellow.svg</figcaption></figure>`).join('')}</div><p>${bg} background</p></div>`).join('');
const signatures=['e','h'].flatMap(key=>['ink','yellow'].map(ground=>{
 const stem=`wordmark-${key}${ground==='yellow'?'-yellow':''}`;
 return `<figure><img class="wordmark" src="png/${stem}.png" width="470" alt="Adaptive Lifting, ${key.toUpperCase()}, ${ground} ground"><figcaption><a href="${stem}.svg">${stem}.svg</a></figcaption></figure>`;
})).join('');
await fs.writeFile(path.join(root,'sheet.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Adaptive Lifting / round 3</title><style>*{box-sizing:border-box}body{margin:0;background:${gray};color:${ink};font:16px/1.5 Arial,sans-serif}main{width:1040px;padding:25px 40px}h1{font-size:34px;margin:0}header p{font-size:17px;margin:20px 0 28px}h2{font-size:17px;font-weight:400;margin:0 0 25px}h3{font-size:13px;font-weight:400;margin:22px 0 10px}.grid{display:grid;grid-template-columns:repeat(4,230px);gap:10px}figure{margin:0}img{display:block;border-radius:22%;margin:auto}.large img{margin-bottom:12px}.small img{margin-bottom:12px}figcaption{font-size:13px}section{margin-bottom:38px}.pair{display:grid;grid-template-columns:470px 470px;gap:20px}.strip{display:flex;justify-content:space-around;padding:14px 4px 10px}.strip figure{width:150px;text-align:center}.strip figcaption{font-size:12px;margin-top:10px}.black{background:#000;color:#fff}.white{background:#fff;color:${ink}}.pair p{font-size:13px;margin-top:5px}.wordmark{border-radius:0;width:470px;height:auto}.signatures{row-gap:14px}a{color:inherit}footer{font-size:15px;margin-top:25px}</style></head><body><main><header><h1>Adaptive Lifting / round 3</h1><p>Weights that tell you what comes next. E / H rising bar / I E + climb / J next plate.</p></header>${rows}<section><h2>WORDMARKS / real Overpass 900 outlines</h2><div class="pair signatures">${signatures}</div></section><section><h2>HOME-SCREEN CHECK / yellow icons at actual 60 px</h2><div class="pair">${strips}</div></section><footer>Recommendation: H on yellow. E keeps the character; H makes the progression cue larger.<br>22% corner radius is preview-only. All icon sources are full-bleed squares.</footer></main></body></html>\n`);
// Validate raster dimensions, full opacity, palette and centered 80% safe area.
const checks=[];
for(const key of keys)for(const ground of ['yellow','ink']){
 const stem=`concept-${key}-${ground}`,source=await fs.readFile(path.join(root,`${stem}.svg`),'utf8');
 if(/<(?:text|image|linearGradient|radialGradient|filter|mask)\b/.test(source))throw Error(`Unexpected artwork element in ${stem}`);
 const palette=[...new Set(source.match(/#[0-9a-fA-F]{6}/g))];
 if(palette.some(c=>!['#ffc800','#1c1a14',ground==='yellow'?'#8a6d00':'#a88400'].includes(c)))throw Error('Palette');
 let bounds=[1024,1024,0,0];
 for(const size of [1024,180,60]){
  const {data,info}=await sharp(png(stem,size)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(info.width!==size||info.height!==size)throw Error('Dimensions');
  const bg=ground==='yellow'?[255,200,0]:[28,26,20];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   const offset=(y*size+x)*4;if(data[offset+3]!==255)throw Error('Transparency');
   if(size===1024&&bg.some((v,j)=>Math.abs(data[offset+j]-v)>12))bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];
  }
 }
 if(bounds[0]<102.4||bounds[1]<102.4||bounds[2]>921.6||bounds[3]>921.6)throw Error(`Safe area ${stem}: ${bounds}`);
 checks.push({file:`${stem}.svg`,bounds,palette,sizes:[1024,180,60],opaque:true});
}
for(const ground of ['yellow','ink']){
 const original=await fs.readFile(path.resolve(root,`../round-2/concept-e-${ground}.svg`),'utf8');
 const current=await fs.readFile(path.join(root,`concept-i-${ground}.svg`),'utf8');
 const body=original.slice(original.indexOf('<defs>'),original.lastIndexOf('<g transform='));
 if(!current.includes(body))throw Error('E character geometry changed');
}
const wordmarks=[];
for(const key of ['e','h'])for(const suffix of ['','-yellow']){
 const stem=`wordmark-${key}${suffix}`,source=await fs.readFile(path.join(root,`${stem}.svg`),'utf8');
 if(/<(?:text|image|filter|linearGradient|radialGradient)\b/.test(source)||!source.includes('<path d='))throw Error('Wordmark outlines');
 const {data,info}=await sharp(path.join(root,'png',`${stem}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(info.width!==1728||info.height!==472)throw Error('Wordmark size');
 for(let n=3;n<data.length;n+=4)if(data[n]!==255)throw Error('Wordmark alpha');
 wordmarks.push({file:`${stem}.svg`,dimensions:[1728,472],opaque:true,outlined:true});
}
const baseline=JSON.parse(await fs.readFile(path.join(root,'tools/baseline.json'),'utf8'));
const concurrentChanges=[];
for(const [file,hash] of Object.entries(baseline)){
 const current=createHash('sha256').update(await fs.readFile(path.join(repo,file))).digest('hex');
 if(current!==hash){
  if(file.startsWith('design/app-icon/')||file.startsWith('src/app/lift/signal/'))throw Error(`Artwork dependency changed: ${file}`);
  concurrentChanges.push(file);
 }
}
// Check HTML image and SVG links resolve, without a browser.
const html=await fs.readFile(path.join(root,'sheet.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))await fs.access(path.resolve(root,match[1]));
await fs.writeFile(path.join(root,'tools/validation.json'),JSON.stringify({icons:checks,wordmarks,figure:'I includes exact round-2 E character subtree in both palettes',outsideScope:{checked:Object.keys(baseline).length,earlierRounds:'All round-1 and round-2 hashes match',rigAndDrawings:'All source hashes match',concurrentChanges,note:'These unrelated files changed during the task. No command in this task wrote outside round-3; concurrent changes were left untouched.'},html:'All local image and artwork links resolve; not browser-rendered.',visualReview:'Opened all six actual 60 px icon renders and the composed sheet; the outlined next plate remains open. Reviewed all wordmarks.',renderer:'/opt/homebrew/bin/rsvg-convert',sheet:'sharp from project node_modules',optionalConcepts:'H2 and K omitted'},null,2)+'\n');
console.log('Sheet and HTML built; all icon, wordmark, link, figure-identity and preservation checks passed.');
