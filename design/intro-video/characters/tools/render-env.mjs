// Resolve absolute paths at runtime: fontconfig does not honor prefix=relative on cachedir.
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
fs.mkdirSync(path.join(here,'font-cache'),{recursive:true});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const config=path.join(here,'fontconfig.xml');
fs.writeFileSync(config,`<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">\n<fontconfig>\n  <dir>${escape(path.join(here,'fonts'))}</dir>\n  <cachedir>${escape(path.join(here,'font-cache'))}</cachedir>\n</fontconfig>\n`);
process.env.FONTCONFIG_FILE=config;
