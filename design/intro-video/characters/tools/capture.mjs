// Optional: refresh this kit's read-only source snapshots from the originating repository.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const sources = {
 'rig.ts': 'src/app/lift/signal/lifter/rig.ts',
 'figure.tsx': 'src/app/lift/signal/lifter/figure.tsx',
 'lifter.tsx': 'src/app/lift/signal/lifter/lifter.tsx',
 'drawings.tsx': 'src/app/lift/signal/drawings.tsx',
 'visit-data.ts': 'src/app/lift/visit/visit-data.ts',
 'signal.module.css': 'src/app/lift/signal/signal.module.css',
 'layout.tsx': 'src/app/lift/layout.tsx',
 'concept-e-ink.svg': 'design/app-icon/round-2/concept-e-ink.svg',
 'concept-e-yellow.svg': 'design/app-icon/round-2/concept-e-yellow.svg',
 'extract.mjs': 'design/app-icon/round-2/tools/extract.mjs',
};
const digest = b => createHash('sha256').update(b).digest('hex');
const provenance = {};
for (const [name, source] of Object.entries(sources)) {
 const data = fs.readFileSync(path.join(root, source));
 fs.writeFileSync(path.join(here, 'source', name), data);
 provenance[name] = {source, sha256: digest(data)};
}
for (const name of ['Overpass[wght].ttf', 'OFL.txt']) {
 fs.copyFileSync(path.join(root, 'design/app-icon/round-2/tools', name), path.join(here, 'fonts', name));
}
fs.writeFileSync(path.join(here, 'provenance.json'), JSON.stringify({capturedAt: new Date().toISOString(), sources: provenance}, null, 2)+'\n');
console.log('Captured 10 source files and the Overpass font/license inside this kit.');
