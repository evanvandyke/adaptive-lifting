import './render-env.mjs';
// Run captured rig geometry with Node's native TS stripping, as round-2/tools/extract.mjs does.
// Render the captured, unchanged Figure component itself; there is no duplicate SVG renderer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import * as rig from './source/rig.ts';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const read = p => fs.readFileSync(path.join(here, 'source', p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(out, p), s);
const json = (p, v) => write(p, JSON.stringify(v, null, 2)+'\n');
const hash = data => createHash('sha256').update(data).digest('hex');
const provenance = JSON.parse(fs.readFileSync(path.join(here, 'provenance.json')));
for (const [file, entry] of Object.entries(provenance.sources)) {
 if(hash(read(file)) !== entry.sha256) throw Error(`Snapshot changed: ${file}; recapture explicitly if intended.`);
}
export function compileFigure(source, rigModule) {
 const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2020}}).outputText;
 const module = {exports:{}};
 new Function('require', 'module', 'exports', compiled)(id => id === './rig' ? rigModule : require(id), module, module.exports);
 return module.exports.Figure;
}
const Figure = compileFigure(read('figure.tsx'), rig);
const parse = (file) => ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
let moveNames;
const walk = (node, fn) => { fn(node); node.forEachChild(c => walk(c, fn)); };
walk(parse('rig.ts'), n => {
 if(ts.isVariableDeclaration(n) && n.name.getText() === 'MOVES') {
  const obj = ts.isSatisfiesExpression(n.initializer) ? n.initializer.expression : n.initializer;
  moveNames = obj.properties.map(p => p.name.getText().replaceAll("'", ''));
 }
});
if (!moveNames?.length) throw Error('Missing MOVES object');
const labels = {};
walk(parse('visit-data.ts'), n => {
 if(!ts.isObjectLiteralExpression(n)) return;
 const values = Object.fromEntries(n.properties.filter(p => ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)).map(p => [p.name.getText(), p.initializer.text]));
 if(values.id && values.name) labels[values.id] = {name:values.name, shortName:values.shortName, source:'visit-data.ts'};
});
for(const move of ['stand','tall','cheer','victory']) labels[move] = {name:{stand:'Stand', tall:'Tall', cheer:'Cheer', victory:'Victory'}[move],source:'rig.ts; descriptive pose label, not an exercise menu name'};
const chosen = ['victory', 'deadbug', 'goblet'];
const frameTimes = Array.from({length:12}, (_,i)=>i/11);
const times = Object.fromEntries(moveNames.map(move => [move, [...new Set([0,.5,1,...(chosen.includes(move)?frameTimes:[])])].sort((a,b)=>a-b)]));
const palettes = {yellow:{near:'#ffc800',far:'#a88400'},ink:{near:'#1c1a14',far:'#8a6d00'}};
const flatShapes = scene => {
 let order=0;
 const annotate = (shape, layer, index) => ({...shape, layer, indexInLayer:index, order:order++, halo:!!shape.halo, eq:!!shape.eq, weight:!!shape.weight, furn:!!shape.furn});
 return [...scene.ground.map((s,i)=>annotate(s,-1,i)),...scene.layers.flatMap((layer,j)=>layer.map((s,i)=>annotate(s,j,i)))];
};
const exportSvg = (move,t,tone) => renderToStaticMarkup(React.createElement(Figure,{move,t,size:1024,tone,equipment:true,weights:true,fit:times[move],label:`${labels[move].name}, t=${t}`})).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
const raster = (svg, dest) => fs.writeFileSync(dest,execFileSync(process.env.RSVG_CONVERT || '/opt/homebrew/bin/rsvg-convert',['--height','1024','--format','png'],{input:svg,maxBuffer:32*1024*1024}));
const data = {
 schemaVersion:1,
 method:'Unmodified rig.ts executed by native Node TypeScript import; unmodified Figure transpiled in memory and rendered with ReactDOMServer.',
 coordinateSystem:{units:'abstract figure units, not metres or pixels',x:'right',y:'up',floorY:0,svgMapping:'svgX = origin.x + x; svgY = origin.y - y',rotation:'degrees counterclockwise from +x about shape center before SVG y flip',depth:'2D drawing order only; no physical depth supplied'},
 shapeSchema:{k:'line | disc | box',pts:'line vertices in rig coordinates',c:'disc or box center',w:'line stroke width or box width',h:'box height',r:'disc radius or box corner radius',rot:'box rotation in degrees; omitted means 0',tone:'near | far',halo:'cut expanded silhouette out of all EARLIER body layers only',eq:'equipment (includes furniture and floor)',weight:'held/carried weight',furn:'line uses furniture minimum width rule',layer:'-1 ground, 0+ body layers back to front',order:'global draw order; ground first',indexInLayer:'draw order within layer',id:'optional diagnostic limb name; not a unique bone ID'},
 renderer:{palettes,background:'transparent',height:1024,bold:1,gap:2.5,fitMargin:2,lineCap:'round',lineJoin:'round',roundSvgNumbersToDecimals:2,mask:'white keeps; black expanded cutters remove; ground bypasses every mask'},
 provenance,
 frameSequences:{moves:chosen,t:frameTimes,note:'12 equal geometry steps, not equal playback-time samples; outbound only'},
 moves:{}
};
for(const move of moveNames){
 const crop = rig.bounds(move,times[move],true,true,1);
 data.moves[move] = {...labels[move],exportViewBox:{x:crop.x-2,y:crop.y-2,w:crop.w+4,h:crop.h+4},framingTimes:times[move],samples:times[move].map(t=>{
  const scene=rig.scene(move,t);
  return {t,...scene,groundLine:{physicalY:0,drawnFloorCenterY:scene.ground.some(s=>s.k==='line'&&s.pts.every(p=>p.y===-1.5))?-1.5:null},shapes:flatShapes(scene)};
 })};
 for(const t of [0,.5,1])for(const tone of Object.keys(palettes)){
  const stem=`${move}-t${t}-${tone}`;
  const svg=exportSvg(move,t,tone);
  write(`poses/${stem}.svg`,svg+'\n');
  raster(svg,path.join(out,'png',`${stem}.png`));
 }
 if(chosen.includes(move))for(const [index,t] of frameTimes.entries()){
  raster(exportSvg(move,t,'yellow'),path.join(out,'frames',`${move}-${String(index).padStart(2,'0')}-yellow.png`));
 }
}
// The icon already contains exact geometry. Remove only the full-canvas background.
for(const tone of ['yellow','ink']){
 const source = tone === 'yellow' ? 'concept-e-ink.svg' : 'concept-e-yellow.svg';
 const svg = read(source).replace(/<rect width="1024" height="1024" fill="#[a-f0-9]+"\/>/,'').replace(/<title[^>]*>.*?<\/title>/,`<title id="title">Overhead press icon, ${tone} figure, transparent background</title>`);
 write(`poses/overhead-press-icon-${tone}.svg`,svg);
 raster(svg,path.join(out,'png',`overhead-press-icon-${tone}.png`));
}
// Parse icon shapes, preserving their already-bolded widths and the exact supplied decimals.
const iconSource=read('concept-e-ink.svg');
const groups=[...iconSource.matchAll(/<g transform="translate\(512 886\) scale\(3\.2 -3\.2\)">([\s\S]*?)(?=<g transform=|\n<\/svg>)/g)].map(m=>m[1]);
const iconLayers=[];
for(const [groupIndex,group] of groups.entries()){
 const shapes=[];
 for(const match of group.matchAll(/<(polyline|circle|rect)\s+([^>]+)\/>/g)){
  const attrs=Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  const base={tone:'near',...(groupIndex===1?{eq:true,weight:true}:{})};
  if(match[1]==='polyline')shapes.push({...base,k:'line',pts:attrs.points.split(' ').map(p=>{const[x,y]=p.split(',').map(Number);return{x,y};}),w:+attrs['stroke-width']});
  else if(match[1]==='circle')shapes.push({...base,k:'disc',c:{x:+attrs.cx,y:+attrs.cy},r:+attrs.r});
  else shapes.push({...base,k:'box',c:{x:+attrs.x+(+attrs.width)/2,y:+attrs.y+(+attrs.height)/2},w:+attrs.width,h:+attrs.height,r:+attrs.rx});
 }
 iconLayers.push(shapes);
}
if(iconLayers.flat().length!==13)throw Error(`Unexpected icon shape count ${iconLayers.flat().length}`);
const iconScene={box:320,origin:{x:160,y:276.875},ground:[],layers:iconLayers};
data.icon={name:'Overhead press (icon)',source:'concept-e-ink.svg / concept-e-yellow.svg',note:'Static icon composition, not a rig move. Body and arms share first layer (no halo cutters); bar and plates second. Line widths already include icon bolding.',originalSvg:{box:1024,translate:{x:512,y:886},scale:{x:3.2,y:-3.2}},...iconScene,groundLine:{physicalY:0,drawnFloorCenterY:null},shapes:flatShapes(iconScene)};
json('rig.json',data);
// Sheet uses actual librsvg PNGs, composed with sharp; labels use the bundled Overpass font via Pango.
const W=1920,cellW=450,cellH=322,margin=60,header=158,rows=7,stripY=header+rows*cellH+30,H=stripY+238;
const composites=[];
async function textLabel(text,x,y,width,size=22,weight='Semi-Bold',color='#ffc800'){
 const escaped=text.replaceAll('&','&amp;').replaceAll('<','&lt;');
 const input=await sharp({text:{text:`<span foreground="${color}">${escaped}</span>`,font:`Overpass ${weight} ${size}`,fontfile:path.join(here,'fonts','Overpass[wght].ttf'),width,align:'left',rgba:true,dpi:72}}).png().toBuffer();
 composites.push({input,left:x,top:y});
}
await textLabel('ADAPTIVE LIFTING / CHARACTER REFERENCE',margin,34,1800,43,'Heavy');
await textLabel('27 rig moves + the overhead-press icon  /  exact app geometry  /  yellow figure on ink',margin,99,1800,22);
const representative={bench:0,incline:0,pushup:0,kneepushup:0,onearmrow:1,row:1,pulldown:1,stand:0};
const entries=moveNames.map(move=>({move,name:labels[move].name,t:representative[move]??1,stem:`${move}-t${representative[move]??1}`}));
entries.push({move:'overhead-press-icon',name:'Overhead press (icon)',t:null,stem:'overhead-press-icon'});
for(const [i,e]of entries.entries()){
 const x=margin+(i%4)*cellW,y=header+Math.floor(i/4)*cellH;
 const {data:input,info}=await sharp(path.join(out,'png',`${e.stem}-yellow.png`)).resize({width:cellW-60,height:232,fit:'inside'}).png().toBuffer({resolveWithObject:true});
 composites.push({input,left:x+Math.round((cellW-info.width)/2),top:y+Math.round((232-info.height)/2)});
 await textLabel(e.name,x+12,y+250,cellW-24,22,'Extra-Bold');
 await textLabel(`${e.move}${e.t===null?' / static':` / t=${e.t}`}`,x+12,y+281,cellW-24,16);
}
composites.push({input:await sharp({create:{width:W,height:238,channels:4,background:'#ffc800'}}).png().toBuffer(),left:0,top:stripY});
await textLabel('ALTERNATE COLORWAY / INK ON YELLOW',margin,stripY+19,800,22,'Extra-Bold','#1c1a14');
for(const [i,stem]of ['goblet-t1','deadbug-t1','victory-t1','row-t1','overhead-press-icon'].entries()){
 const {data:input,info}=await sharp(path.join(out,'png',`${stem}-ink.png`)).resize({width:300,height:155,fit:'inside'}).png().toBuffer({resolveWithObject:true});
 composites.push({input,left:margin+40+i*354+Math.round((300-info.width)/2),top:stripY+64+Math.round((155-info.height)/2)});
}
await sharp({create:{width:W,height:H,channels:3,background:'#1c1a14'}}).composite(composites).png().toFile(path.join(out,'character-sheet.png'));
json('tools/build-summary.json',{moves:moveNames.length,poses:moveNames.length*6+2,png:moveNames.length*6+2,frames:36,rigSamples:Object.values(data.moves).reduce((n,m)=>n+m.samples.length,0),sheet:{width:W,height:H},representatives:entries,versions:{node:process.version,react:React.version,typescript:ts.version,sharp:sharp.versions.sharp,librsvg:execFileSync(process.env.RSVG_CONVERT||'/opt/homebrew/bin/rsvg-convert',['--version'],{encoding:'utf8'}).trim()}});
console.log('Built 164 SVGs, 164 pose PNGs, 36 frame PNGs, rig.json and character-sheet.png.');
