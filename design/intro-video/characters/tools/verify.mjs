import './render-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(here,'..'),repo=path.resolve(here,'../../../..');
const require=createRequire(import.meta.url),live=process.argv.includes('--live');
const data=JSON.parse(fs.readFileSync(path.join(out,'rig.json')));
const summary=JSON.parse(fs.readFileSync(path.join(here,'build-summary.json')));
const report={sourceMode:live?'originating app source':'bundled app source snapshot',counts:{},pngChecks:[],figureComparison:null};
for(const [folder,ext,count]of [['poses','.svg',164],['png','.png',164],['frames','.png',36]]){
 const files=fs.readdirSync(path.join(out,folder));
 assert.equal(files.length,count);assert(files.every(f=>f.endsWith(ext)));
 report.counts[folder]=files.length;
 if(ext!=='.png')continue;
 for(const file of files){
  const {data:p,info}=await sharp(path.join(out,folder,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.height,1024,`${file} height`);
  let minX=info.width,minY=info.height,maxX=-1,maxY=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const a=p[(y*info.width+x)*4+3];
   if(a===0)transparent++;
   if(a>0){minX=Math.min(x,minX);minY=Math.min(y,minY);maxX=Math.max(x,maxX);maxY=Math.max(y,maxY);}
  }
  assert(transparent>0 && maxX>=0,`${file} transparency/content`);
  assert(minX>0 && minY>0 && maxX<info.width-1 && maxY<info.height-1,`${file} reaches edge: ${[minX,minY,maxX,maxY]}`);
  report.pngChecks.push({file:`${folder}/${file}`,width:info.width,height:info.height,alphaBounds:[minX,minY,maxX,maxY],clearCanvasEdges:true});
 }
}
for(const move of data.frameSequences.moves){
 assert.equal(fs.readdirSync(path.join(out,'frames')).filter(f=>f.startsWith(move+'-')).length,12);
 for(const [i,t]of data.frameSequences.t.entries()){
  assert.equal(t,i/11);assert(data.moves[move].samples.some(s=>s.t===t));
 }
}
assert.equal(Object.keys(data.moves).length,27);
assert.equal(summary.rigSamples,111);
// Independent reference: compile the app's real Figure TSX in memory and execute its real rig.
const rigPath=live?path.join(repo,'src/app/lift/signal/lifter/rig.ts'):path.join(here,'source/rig.ts');
const figPath=live?path.join(repo,'src/app/lift/signal/lifter/figure.tsx'):path.join(here,'source/figure.tsx');
const rig=await import(pathToFileURL(rigPath));
const source=fs.readFileSync(figPath,'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
const module={exports:{}};
new Function('require','module','exports',js)(id=>id==='./rig'?rig:require(id),module,module.exports);
const svg=renderToStaticMarkup(React.createElement(module.exports.Figure,{move:'deadbug',t:1,size:1024,tone:'yellow',equipment:true,weights:true,fit:data.moves.deadbug.framingTimes})).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
fs.writeFileSync(path.join(here,'figure-check.svg'),svg);
const png=execFileSync(process.env.RSVG_CONVERT||'/opt/homebrew/bin/rsvg-convert',['--height','1024','--format','png'],{input:svg,maxBuffer:32*1024*1024});
fs.writeFileSync(path.join(here,'figure-check.png'),png);
const expected=await sharp(png).ensureAlpha().raw().toBuffer();
const actual=await sharp(path.join(out,'png/deadbug-t1-yellow.png')).ensureAlpha().raw().toBuffer();
assert.equal(actual.length,expected.length);
let differingChannels=0;for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])differingChannels++;
assert.equal(differingChannels,0,'App Figure pixel comparison');
const digest=b=>createHash('sha256').update(b).digest('hex');
report.figureComparison={move:'deadbug',t:1,tone:'yellow',equipment:true,weights:true,height:1024,reference:live?'src/app/lift/signal/lifter/figure.tsx':'tools/source/figure.tsx',rigSha256:digest(fs.readFileSync(rigPath)),figureSha256:digest(source),referenceRaster:'tools/figure-check.png',differingRgbaChannels:differingChannels,rawRgbaSha256:digest(actual),coverage:'Whole disc head, near/far limbs, floor, and transparent head halo; identical full raster.'};
report.sheet=await sharp(path.join(out,'character-sheet.png')).metadata().then(({width,height})=>({width,height}));
fs.writeFileSync(path.join(here,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(`PASS: 200 transparent 1024px PNGs have clear edges; 27 moves / 111 rig samples; deadbug t=1 matches ${report.sourceMode} Figure with zero differing RGBA channels.`);
