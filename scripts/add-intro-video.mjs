// Puts the intro video on the sign-in screens:  npm run intro:add -- /path/to/video.mov
// Shrinks it for phones (H.264, at most 720 px on the short side, starts playing before it finishes loading),
// saves a poster frame, and records both in src/app/(auth)/intro-video.ts. `npm run intro:remove` takes it off.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = join(root, 'src/app/(auth)/intro-video.ts');
const header = '// Written by `npm run intro:add -- <video file>` (scripts/add-intro-video.mjs). Null means no video is shown.\n';
const type = '{ src: string; poster: string; width: number; height: number } | null';

const arg = process.argv[2];
if (arg === '--remove') {
  writeFileSync(config, `${header}export const INTRO_VIDEO: ${type} = null;\n`);
  console.log('Intro video switched off. The files in public/intro/ are left in place.');
  process.exit(0);
}
if (!arg || !existsSync(arg)) {
  console.error('Give the path to the video:  npm run intro:add -- /path/to/video.mov');
  process.exit(1);
}

const outDir = join(root, 'public/intro');
mkdirSync(outDir, { recursive: true });
// A new name each time, so a phone never shows an older cut from its cache.
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 12);
const video = join(outDir, `intro-${stamp}.mp4`);
const poster = join(outDir, `intro-${stamp}.jpg`);
const quiet = ['-hide_banner', '-loglevel', 'error', '-y'];
// Short side at most 720, never enlarged, even dimensions.
const scale = "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'";

execFileSync('ffmpeg', [...quiet, '-i', arg, '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', video], { stdio: 'inherit' });
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
  'stream=width,height:format=duration', '-of', 'json', video], { encoding: 'utf8' }));
const { width, height } = probe.streams[0];
const duration = Number(probe.format.duration);
execFileSync('ffmpeg', [...quiet, '-ss', String(Math.min(1, duration / 2)), '-i', video, '-frames:v', '1', '-q:v', '4', poster], { stdio: 'inherit' });

writeFileSync(config, `${header}export const INTRO_VIDEO: ${type} = { src: '/intro/intro-${stamp}.mp4', poster: '/intro/intro-${stamp}.jpg', width: ${width}, height: ${height} };\n`);
const mb = n => (n / 1_048_576).toFixed(1);
console.log(`Intro video ready: ${width}x${height}, ${duration.toFixed(0)} s, ${mb(statSync(video).size)} MB (from ${mb(statSync(arg).size)} MB).`);
console.log('Check it with `npm run dev` at /login, then commit public/intro/ and src/app/(auth)/intro-video.ts and push.');
