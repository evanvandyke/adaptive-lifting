"""Draw Signal icon concepts; outline the genuine Overpass 900 with fontTools.

Run from any directory: python3 design/app-icon/tools/build.py
Dependencies already available: fontTools, uharfbuzz, rsvg-convert.
All writes are confined to the app-icon directory.
"""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import subprocess
import urllib.request

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'tools' / 'Overpass[wght].ttf'
SOURCE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/overpass/'
for filename in ['Overpass[wght].ttf', 'OFL.txt']:
    destination = ROOT / 'tools' / filename
    if not destination.exists():
        url = SOURCE + urllib.parse.quote(filename)
        destination.write_bytes(urllib.request.urlopen(url).read())

font = instantiateVariableFont(TTFont(FONT), {'wght': 900}, inplace=False)
assert font['OS/2'].usWeightClass == 900
data = BytesIO()
font.save(data)
shaper = hb.Font(hb.Face(data.getvalue()))
hb.ot_font_set_funcs(shaper)
glyphs = font.getGlyphSet()
order = font.getGlyphOrder()

def lettering(text, x, y, width=None, height=None):
    """Shape with real kerning; turn glyphs into paths, fitting visible bounds."""
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(shaper, buf, {'kern': True})
    entries = []
    cursor = 0
    bounds = BoundsPen(glyphs)
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tx, ty = cursor + pos.x_offset, pos.y_offset
        glyphs[name].draw(TransformPen(bounds, (1, 0, 0, 1, tx, ty)))
        entries.append((name, tx, ty))
        cursor += pos.x_advance
    left, bottom, right, top = bounds.bounds
    scale = width / (right-left) if width else height / (top-bottom)
    pen = SVGPathPen(glyphs, ntos=lambda n: format(n, '.3f').rstrip('0').rstrip('.') if n else '0')
    for name, tx, ty in entries:
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x+(tx-left)*scale, y+(top-ty)*scale)))
    return f'<path d="{pen.getCommands()}"/>', (right-left)*scale, (top-bottom)*scale

YELLOW, INK = '#ffc800', '#1c1a14'

# A: the app's front-view VICTORY character. Same disc head, rectangular
# trunk and rounded straight limbs. Widen the neck/shoulder gaps for 60 px.
A = '''<g stroke="currentColor" stroke-linecap="round" fill="none">
    <path d="M399 410 300 216 M625 410 724 216" stroke-width="64"/>
    <path d="M478 621 451 817 M546 621 573 817" stroke-width="64"/>
  </g>
  <rect x="446" y="390" width="132" height="252" rx="24"/>
  <circle cx="512" cy="300" r="58"/>'''

# B: pure Overpass 900 letterforms, with a short heavy bar grounding them.
b_letters, _, b_height = lettering('AL', 202, 302, width=620)
B = b_letters + '\n  <path d="M252 716H772V780H252Z"/>'

# C: the front-view plate drawing reduced to one shaft and two stepped
# plates each side. No numbers or hairline collars at home-screen size.
C = '''<path d="M152 480H872V544H152Z"/>
  <rect x="176" y="374" width="64" height="276" rx="12"/>
  <rect x="276" y="290" width="92" height="444" rx="12"/>
  <rect x="656" y="290" width="92" height="444" rx="12"/>
  <rect x="784" y="374" width="64" height="276" rx="12"/>'''

MARKS = {'a': A, 'b': B, 'c': C}
NAMES = {'a': 'The lifter', 'b': 'The lettermark', 'c': 'The loaded bar'}

def svg(content, width, height, title, background):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title">
  <title id="title">{title}</title>
  <rect width="{width}" height="{height}" fill="{background}"/>
  {content}
</svg>
'''

png = ROOT / 'png'
png.mkdir(exist_ok=True)
for key, mark in MARKS.items():
    for ground, bg, fg in [('yellow', YELLOW, INK), ('ink', INK, YELLOW)]:
        name = f'concept-{key}-{ground}'
        (ROOT / f'{name}.svg').write_text(svg(f'<g fill="{fg}" color="{fg}">{mark}</g>', 1024, 1024, f'{NAMES[key]} / {ground} ground', bg))
        for size in [1024, 180, 60]:
            subprocess.run(['/opt/homebrew/bin/rsvg-convert', '-w', str(size), '-h', str(size), '-o', str(png / f'{name}-{size}.png'), str(ROOT / f'{name}.svg')], check=True)

    words, _, word_height = lettering('Adaptive Lifting', 360, 0, width=1440)
    word_y = (360-word_height)/2
    content = f'<g fill="{YELLOW}" color="{YELLOW}"><g transform="translate(14 25) scale(.3)">{mark}</g><g transform="translate(0 {word_y:.3f})">{words}</g></g>'
    (ROOT / f'wordmark-{key}.svg').write_text(svg(content, 1880, 360, 'Adaptive Lifting / '+NAMES[key], INK))
    subprocess.run(['/opt/homebrew/bin/rsvg-convert', '-w', '940', '-h', '180', '-o', str(png / f'wordmark-{key}.png'), str(ROOT / f'wordmark-{key}.svg')], check=True)

provenance = {
    'font_url': SOURCE + 'Overpass%5Bwght%5D.ttf',
    'license_url': SOURCE + 'OFL.txt',
    'source_sha256': hashlib.sha256(FONT.read_bytes()).hexdigest(),
    'family': font['name'].getDebugName(1),
    'weight': 900,
    'method': 'fontTools variable-font instantiation at wght=900; HarfBuzz shaping/kerning; fontTools SVGPathPen outlines.',
    'concepts': {'a': 'Victory pose, simplified from rig.ts front/VICTORY.', 'b': 'Overpass 900 AL with a heavy supporting bar.', 'c': 'Front-view barbell, stepped plates and thick shaft.'},
    'recommended': 'A on yellow: the familiar character makes the icon personal, and the large yellow field is easy to find.',
    'variant_recommendations': {'a': 'yellow', 'b': 'yellow', 'c': 'ink'},
    'wordmarks': 'Yellow on ink, matching the default sign-in direction; all visible letters are paths.',
}
(ROOT / 'tools' / 'provenance.json').write_text(json.dumps(provenance, indent=2)+'\n')
print('Built six icons, three wordmarks, 21 PNG renders. AL height:', round(b_height, 2))
