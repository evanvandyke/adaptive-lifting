// Compose the contact sheet from actual rsvg-convert PNGs; no browser required.
// Run: node design/app-icon/tools/sheet.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = ['a', 'b', 'c'].flatMap(c => ['yellow', 'ink'].map(g => `concept-${c}-${g}`));
const gray = '#a0a0a0';
const ink = '#1c1a14';
const width = 1400;
const height = 1460;
const layers = [];
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

function label(text, left, top, size = 16, bold = false, w = 1300) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size*1.5}"><text x="0" y="${size}" fill="${ink}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${bold ? 700 : 400}">${escape(text)}</text></svg>`;
  layers.push({input: Buffer.from(svg), left, top});
}

async function rounded(name, size, left, top) {
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size*.22}" fill="white"/></svg>`);
  const input = await sharp(path.join(root, 'png', `${name}-${size}.png`)).composite([{input: mask, blend: 'dest-in'}]).png().toBuffer();
  layers.push({input, left, top});
}

label('Adaptive Lifting / icon studies', 44, 35, 40, true);
label('Signal palette. Overpass 900. Three concepts, two grounds. Concepts only.', 44, 92, 19);
label('180 px / iOS corner preview', 44, 143, 18, true);
for (const [i, name] of names.entries()) {
  const x = 44 + i*220;
  await rounded(name, 180, x, 183);
  label(`${name}.svg`, x, 379, 14, false, 214);
}
label('60 px / actual small-size renders', 44, 435, 18, true);
for (const [i, name] of names.entries()) {
  const x = 44+i*220;
  await rounded(name, 60, x+60, 477);
  label(`${name}.svg`, x, 554, 14, false, 214);
}
label('Horizontal wordmarks / yellow on ink', 44, 620, 18, true);
const descriptions = {
  a: ['A / The lifter', 'Recommended: yellow ground', 'The familiar victory pose.'],
  b: ['B / The lettermark', 'Recommended: yellow ground', 'Overpass AL, anchored by a bar.'],
  c: ['C / The loaded bar', 'Recommended: ink ground', 'Stepped plates, one strong shaft.'],
};
for (const [i, c] of ['a','b','c'].entries()) {
  const y = 666+i*238;
  layers.push({input: path.join(root, 'png', `wordmark-${c}.png`), left: 44, top: y});
  label(`wordmark-${c}.svg`, 44, y+190, 15);
  descriptions[c].forEach((line,j) => label(line, 1012, y+44+j*29, j===0?21:16, j===0, 365));
}
label('Square source SVGs stay full bleed. Rounded corners appear only in these previews.', 44, 1396, 16);
await sharp({create:{width,height,channels:3,background:gray}}).composite(layers).png().toFile(path.join(root,'sheet.png'));

const row = size => `<div class="row">${names.map(name => `<figure><img class="icon size-${size}" src="png/${name}-${size}.png" width="${size}" height="${size}" alt="${name}"><figcaption>${name}.svg</figcaption></figure>`).join('')}</div>`;
const wordmarks = ['a','b','c'].map(c => `<section class="lockup"><figure><img src="wordmark-${c}.svg" width="940" height="180" alt="Adaptive Lifting, ${descriptions[c][0]}"><figcaption>wordmark-${c}.svg</figcaption></figure><div><h3>${descriptions[c][0]}</h3><p>${descriptions[c][1]}</p><p>${descriptions[c][2]}</p></div></section>`).join('');
await fs.writeFile(path.join(root,'sheet.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Adaptive Lifting — icon studies</title>
<style>
*{box-sizing:border-box}body{margin:0;background:${gray};color:${ink};font:16px/1.4 Arial,sans-serif}main{width:1400px;max-width:100%;padding:34px 44px 40px}h1{font-size:40px;line-height:1.2;margin:0 0 17px}header p{font-size:19px;margin:0 0 32px}h2{font-size:18px;margin:0 0 26px}figure{margin:0}figcaption{font-size:14px;margin-top:14px;color:${ink}}.scroll{overflow-x:auto}.row{display:grid;grid-template-columns:repeat(6,200px);gap:20px;min-width:1300px;margin-bottom:40px}.icon{display:block;border-radius:22%}.size-60{margin-left:60px}.lockup{display:flex;align-items:center;gap:28px;margin-bottom:28px;min-width:1300px}.lockup img{display:block}.lockup figcaption{font-size:15px;margin-top:10px}.lockup h3{font-size:21px;margin:0 0 10px}.lockup p{margin:0 0 7px}footer{margin-top:26px}
</style></head><body><main><header><h1>Adaptive Lifting / icon studies</h1><p>Signal palette. Overpass 900. Three concepts, two grounds. Concepts only.</p></header>
<h2>180 px / iOS corner preview</h2><div class="scroll">${row(180)}</div>
<h2>60 px / actual small-size renders</h2><div class="scroll">${row(60)}</div>
<h2>Horizontal wordmarks / yellow on ink</h2><div class="scroll">${wordmarks}</div>
<footer>Square source SVGs stay full bleed. Rounded corners appear only in these previews.</footer></main></body></html>\n`);

// Check actual 1024 px raster geometry, not assumed vector bounds.
const checks = [];
for (const name of names) {
  const svg = await fs.readFile(path.join(root, `${name}.svg`), 'utf8');
  if (/<(?:text|image|linearGradient|radialGradient|filter)\b/.test(svg)) throw Error(`${name}: forbidden element`);
  const {data,info} = await sharp(path.join(root,'png',`${name}-1024.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const bg = name.endsWith('yellow') ? [255,200,0] : [28,26,20];
  let maxRadius = 0;
  let box = [1024,1024,0,0];
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const i=(y*info.width+x)*4;
    if(data[i+3]!==255)throw Error(`${name}: transparency`);
    if(Math.max(...bg.map((v,c)=>Math.abs(data[i+c]-v)))>12){
      maxRadius=Math.max(maxRadius,Math.hypot(x-511.5,y-511.5));
      box=[Math.min(box[0],x),Math.min(box[1],y),Math.max(box[2],x),Math.max(box[3],y)];
    }
  }
  if(maxRadius>409.6)throw Error(`${name}: exceeds maskable safe circle: ${maxRadius}`);
  checks.push({file:`${name}.svg`,dimensions:[info.width,info.height],opaque:true,mark_bounds:box,max_radius_px:+maxRadius.toFixed(2),safe_radius_px:409.6});
}
for(const c of ['a','b','c']){
  const svg=await fs.readFile(path.join(root,`wordmark-${c}.svg`),'utf8');
  if(/<(?:text|image)\b/.test(svg))throw Error(`wordmark-${c}: non-outline lettering`);
}
await fs.writeFile(path.join(root,'tools','validation.json'),JSON.stringify({icons:checks,wordmarks:'All lettering is paths.',rendering:'rsvg-convert for all assets; sharp for the sheet.',visual_review:'All six actual 60 px PNGs inspected; head/arm gaps, letter counter and plate steps remain clear.'},null,2)+'\n');
console.log('Built sheet.html and sheet.png. All six icons opaque and inside the 80% safe circle.');
