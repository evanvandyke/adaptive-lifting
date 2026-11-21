// Node's native TypeScript stripping executes the real rig; no reimplementation.
import { scene } from '../../../../src/app/lift/signal/lifter/rig.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const sources = ['rig.ts','figure.tsx','lifter.tsx'].map(f => `src/app/lift/signal/lifter/${f}`).concat('src/app/lift/signal/drawings.tsx');
const digest = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const poses = Object.fromEntries([['goblet',1],['bench',0],['bench',1],['tall',1],['victory',1],['lateralraise',1]].map(([move,t])=>[`${move}-${t}`,scene(move,t)]));
fs.writeFileSync(path.join(here,'rig-poses.json'),JSON.stringify({method:'Node native TypeScript import; scene(move,t) executed directly from source.',sources:Object.fromEntries(sources.map(p=>[p,digest(path.join(root,p))])),poses},null,2)+'\n');
const old = path.resolve(here,'../..');
const files = fs.readdirSync(old,{recursive:true}).filter(f=>!f.startsWith('round-2')&&fs.statSync(path.join(old,f)).isFile());
const baseline = path.join(here,'round-1-baseline.json');
if(!fs.existsSync(baseline))fs.writeFileSync(baseline,JSON.stringify(Object.fromEntries(files.map(f=>[f,digest(path.join(old,f))])),null,2)+'\n');
console.log('Executed six rig poses; recorded source and round-1 hashes.');
