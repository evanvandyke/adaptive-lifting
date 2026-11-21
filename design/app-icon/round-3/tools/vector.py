"""Font shaping and rig-vector helpers copied from round 2. No build side effects."""
from pathlib import Path
from io import BytesIO
import json, math, subprocess
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
ROOT = Path(__file__).resolve().parents[1]
POSES = json.loads((ROOT/'tools/rig-poses.json').read_text())['poses']
YELLOW, INK = '#ffc800', '#1c1a14'
font = instantiateVariableFont(TTFont(ROOT/'tools/Overpass[wght].ttf'), {'wght':900}, inplace=False)
assert font['OS/2'].usWeightClass == 900
buf = BytesIO(); font.save(buf)
hbf = hb.Font(hb.Face(buf.getvalue())); hb.ot_font_set_funcs(hbf)
glyphs, order = font.getGlyphSet(), font.getGlyphOrder()
def lettering(text,x,y,width=None,height=None):
    b=hb.Buffer(); b.add_str(text); b.guess_segment_properties(); hb.shape(hbf,b,{'kern':True})
    entries=[]; cursor=0; bounds=BoundsPen(glyphs)
    for info,pos in zip(b.glyph_infos,b.glyph_positions):
        name=order[info.codepoint]; tx,ty=cursor+pos.x_offset,pos.y_offset
        glyphs[name].draw(TransformPen(bounds,(1,0,0,1,tx,ty)))
        entries.append((name,tx,ty)); cursor+=pos.x_advance
    left,bottom,right,top=bounds.bounds
    scale=width/(right-left) if width else height/(top-bottom)
    pen=SVGPathPen(glyphs,ntos=lambda v:f'{v:.3f}'.rstrip('0').rstrip('.') if v else '0')
    for name,tx,ty in entries:glyphs[name].draw(TransformPen(pen,(scale,0,0,-scale,x+(tx-left)*scale,y+(top-ty)*scale)))
    return f'<path d="{pen.getCommands()}"/>'
def n(v):return f'{v:.3f}'.rstrip('0').rstrip('.') if v else '0'
def line(pts,w,color):
    return f'<polyline points="{" ".join(n(x)+","+n(y) for x,y in pts)}" fill="none" stroke="{color}" stroke-width="{n(w)}" stroke-linecap="round" stroke-linejoin="round"/>'
def rect(x,y,w,h,r,c):return f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" rx="{n(r)}" fill="{c}"/>'
def circle(x,y,r,c):return f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" fill="{c}"/>'
def draw(s,c,grow=0,bold=1.2):
    if s['k']=='line':return line([(p['x'],p['y']) for p in s['pts']],s['w']*(1 if s.get('furn') else bold)+2*grow,c)
    if s['k']=='disc':return circle(s['c']['x'],s['c']['y'],s['r']+grow,c)
    x,y=s['c']['x'],s['c']['y']
    result=rect(x-s['w']/2-grow,y-s['h']/2-grow,s['w']+2*grow,s['h']+2*grow,s['r']+grow,c)
    return f'<g transform="rotate({n(s["rot"])} {n(x)} {n(y)})">{result}</g>' if s.get('rot') else result

def render_scene(scene,fg,far,transform,ground=True):
    # Same back-to-front masks as Figure. Ground/furniture is never cut.
    defs=[]; painted=''
    for i,layer in enumerate(scene['layers']):
        cutters=[s for s in layer if s.get('halo')]
        if i and cutters:
            defs.append(f'<mask id="gap{i}" maskUnits="userSpaceOnUse" x="-300" y="-300" width="600" height="600"><rect x="-300" y="-300" width="600" height="600" fill="white"/>'+''.join(draw(s,'black',3.5) for s in cutters)+'</mask>')
            painted=f'<g mask="url(#gap{i})">{painted}</g>'
        painted+='<g>'+''.join(draw(s,fg if s['tone']=='near' else far) for s in layer)+'</g>'
    base=''.join(draw(s,far) for s in scene['ground']) if ground else ''
    return '<defs>'+''.join(defs)+f'</defs><g transform="{transform}">'+base+painted+'</g>'

