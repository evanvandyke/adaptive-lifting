"""Run with PYTHONDONTWRITEBYTECODE=1 python3 design/app-icon/round-3/tools/build.py."""
from pathlib import Path
import json, subprocess, re, hashlib
from vector import ROOT, YELLOW, INK, rect, line, lettering
PREVIOUS=ROOT.parent/'round-2'

def e_parts(ground):
    source=(PREVIOUS/f'concept-e-{ground}.svg').read_text()
    # Copy the complete exact character subtree, byte for byte; the last group is equipment.
    figure=source[source.index('<defs>'):source.rindex('<g transform=')]
    equipment=source[source.rindex('<g transform='):source.rindex('</svg>')].strip()
    return figure,equipment

def h(fg,far,bg):
    # Level shaft, thicker sleeves, inner collars: same front-view anatomy as drawings.tsx.
    out=rect(132,495,760,34,10,fg)
    out+=rect(132,485,250,54,9,fg)+rect(642,485,250,54,9,fg)
    for x in [386,614]: out+=rect(x,458,24,108,6,fg)
    # Four deliberately monotonic steps, including across the central grip.
    for x,height in [(174,156),(278,260),(674,364),(778,468)]:
        out+=rect(x,512-height/2,72,height,10,fg)
    return out

def i(fg,far,bg):
    ground='yellow' if bg==YELLOW else 'ink'
    figure,_=e_parts(ground)
    bar_y=212.926
    equipment=line([(-110,bar_y),(110,bar_y)],7,fg)
    for side in [-1,1]:
        equipment+=rect(side*65-3,bar_y-12,6,24,2,fg)
        equipment+=rect(-113 if side<0 else 72,bar_y-4.5,41,9,2,fg)
    for x,height in [(-101,24),(-81,37),(81,50),(101,63)]:
        equipment+=rect(x-6.5,bar_y-height/2,13,height,2.5,fg)
    return figure+f'<g transform="translate(512 886) scale(3.2 -3.2)">{equipment}</g>'

def j(fg,far,bg):
    # Solid, balanced loaded bar. One detached outline at the right sleeve is the next step.
    out=rect(126,495,666,34,10,fg)
    out+=rect(126,485,230,54,9,fg)+rect(616,485,176,54,9,fg)
    for x in [358,590]: out+=rect(x,458,24,108,6,fg)
    for x,height in [(168,252),(264,420),(638,420),(734,252)]:
        out+=rect(x,512-height/2,58,height,9,fg)
    # 26 / 1024 * 60 = 1.52 px stroke; 44-unit interior = 2.58 px.
    out+=f'<rect x="837" y="386" width="70" height="252" rx="9" fill="none" stroke="{fg}" stroke-width="26"/>'
    return out

marks={'h':h,'i':i,'j':j}
names={'h':'The rising bar','i':'E plus the climb','j':'The next plate'}
colors=[('yellow',YELLOW,INK,'#8a6d00'),('ink',INK,YELLOW,'#a88400')]

def svg(content,bg,width=1024,height=1024,title='Adaptive Lifting'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{title}">\n<rect width="{width}" height="{height}" fill="{bg}"/>\n{content}\n</svg>\n'

def render(stem,width,height):
    subprocess.run(['/opt/homebrew/bin/rsvg-convert','-w',str(width),'-h',str(height),'-o',str(ROOT/'png'/f'{stem}.png'),str(ROOT/f'{stem.rsplit("-",1)[0] if stem.rsplit("-",1)[-1].isdigit() else stem}.svg')],check=True)

for key,make in marks.items():
    for ground,bg,fg,far in colors:
        stem=f'concept-{key}-{ground}'
        (ROOT/f'{stem}.svg').write_text(svg(make(fg,far,bg),bg,title=names[key]))
        for size in [1024,180,60]: render(f'{stem}-{size}',size,size)

# Horizontal signatures: original E and the recommended H; real Overpass 900 outlines.
for key in ['e','h']:
    for ground,bg,fg,far in colors:
        stem=f'wordmark-{key}'+('-yellow' if ground=='yellow' else '')
        mark=''.join(e_parts(ground)) if key=='e' else h(fg,far,bg)
        content=f'<g transform="translate(44 44) scale(.375)">{mark}</g>'
        content+=f'<g fill="{fg}">'+lettering('Adaptive Lifting',478,174,width=1160)+'</g>'
        (ROOT/f'{stem}.svg').write_text(svg(content,bg,1728,472,f'Adaptive Lifting / {key.upper()} wordmark'))
        render(stem,1728,472)

provenance={
 'concepts':{'h':'Four monotonically increasing plate heights on a level front-view bar with shaft, collars, and thicker sleeves.','i':'Exact E figure subtree copied byte-for-byte, same position and scale; equipment replaced with four ascending plates.','j':'Balanced loaded bar with one detached outlined plate at the right end; 26-unit stroke = 1.52 pixels at 60 px.'},
 'figure':'No joints, strokes, proportions, or figure transforms changed from round 2 E. Its front-view pose uses only near tone, matching the source. No second tone added to imply state.',
 'font':{'family':'Overpass','weight':900,'method':'Copied round-2 font; instantiated at wght=900, shaped with HarfBuzz, converted to SVG paths by fontTools.','sha256':hashlib.sha256((ROOT/'tools/Overpass[wght].ttf').read_bytes()).hexdigest()},
 'renderer':'/opt/homebrew/bin/rsvg-convert','composition':'sharp from project node_modules; no browser',
 'scope':'Only design/app-icon/round-3/ written. No providers, subagents, app changes, shared-file changes, agenda or memory writes, or commits.',
 'recommendation':'H on yellow is the strongest challenger to E: the plate heights convey progression at 60 px. E remains the more personal mark because of the app character.',
 'omissions':'H2 and K are optional and omitted: the three required concepts supply distinct comparisons without adding weaker variants.',
 'wrap':'Read wrap skill. Artifact checks and handoff completed here; project-note, agenda, memory and commit writes skipped under the explicit user boundary.'
}
(ROOT/'tools/provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
print('Built 6 icons, 18 icon PNGs, 4 outlined wordmarks and 4 wordmark PNGs.')
