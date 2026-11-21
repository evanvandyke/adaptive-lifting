"""Build hand-clean vector studies from executed rig geometry; all writes stay in round-2.
Run: node design/app-icon/round-2/tools/extract.mjs
     python3 design/app-icon/round-2/tools/build.py
     node design/app-icon/round-2/tools/sheet.mjs
"""
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

def d(fg,far,bg):
    # Real bench lockout: every joint, head, weight and angle unchanged.
    # Keep bench furniture; omit only the floor. Source small-size bold=1.2.
    scene=json.loads(json.dumps(POSES['bench-0']))
    scene['ground']=scene['ground'][1:]
    # Keep the unchanged head disc whole, with Figure's foreground-gap treatment.
    head=next(s for s in scene['layers'][0] if s['k']=='disc')
    scene['layers'][0].remove(head)
    scene['layers'].append([{**head,'halo':True}])
    return render_scene(scene,fg,far,'translate(328 814) scale(4.65 -4.65)')

def e(fg,far,bg):
    # Preserve TALL's exact trunk/head/legs. Rotate arms about the actual shoulder,
    # at lockout with lengths UPPER=32 and FORE=30. No joint is shortened.
    scene=json.loads(json.dumps(POSES['tall-1']))
    body=[s for s in scene['layers'][0] if s.get('id')!='arm']
    sy=next(s for s in POSES['tall-1']['layers'][0] if s.get('id')=='arm')['pts'][0]['y']
    a=math.radians(74); hands=[]; arms=[]
    for side in [-1,1]:
        pts=[{'x':side*(26+math.cos(a)*length),'y':sy+math.sin(a)*length} for length in [0,32,62]]
        hands.append(pts[-1]); arms.append({'k':'line','pts':pts,'w':13,'tone':'near','id':'arm'})
    scene['layers']=[body,arms]; scene['ground']=[]
    barY=hands[0]['y']
    # Stepped plates: drawings.tsx 45:1,25:.72. Sleeve + collar + shaft.
    bar=line([(-110,barY),(110,barY)],7,fg)
    for side in [-1,1]:
        bar+=rect(side*65-3,barY-12,6,24,2,fg)
        for x,h in [(81,58),(101,58*.72)]:bar+=rect(side*x-6.5,barY-h/2,13,h,2.5,fg)
    content=render_scene(scene,fg,far,'translate(512 886) scale(3.2 -3.2)',False)
    return content+f'<g transform="translate(512 886) scale(3.2 -3.2)">{bar}</g>'

def db(cx,cy,fg):
    # Rig dumbbell: handle -9..9 width5, ends +/-12 with 10x20 rx2.5.
    return line([(cx-54,cy),(cx+54,cy)],30,fg)+rect(cx-102,cy-60,60,120,15,fg)+rect(cx+42,cy-60,60,120,15,fg)

def f(fg,far,bg,plain=False):
    # Head-height end-on projection: the nearer disc hides the torso.
    # 13-unit round strokes and head disc, depth enlarged toward the camera.
    out=rect(367,700,290,61,24,far)
    out+=line([(455,664),(365,501),(286,332)],13*5.4,far)
    out+=line([(569,664),(659,501),(738,332)],13*5.4,fg)
    if plain:
        out+=db(286,307,fg)+db(738,307,fg)
    else:
        # Literal Overpass 900 silhouettes, their crossbar/foot becomes the grip.
        # Additional outer endcaps preserve a paired weight cue.
        out+=f'<g fill="{fg}">'+lettering('A',198,221,height=172)+lettering('L',677,221,height=172)+'</g>'
        out+=rect(186,294,47,100,12,fg)+rect(791,294,47,100,12,fg)
        out+=line([(242,344),(322,344)],27,fg)+line([(696,344),(790,344)],27,fg)
    # The app's head halo: expanded background disc followed by intact head.
    out+=circle(512,640,13*9+20,bg)+circle(512,640,13*9,fg)
    return out

def g(fg,far,bg):
    # Round-1 C retained; one added motif: the rig's disc head and rounded grips.
    out=line([(152,512),(872,512)],64,fg)
    for x,w,h in [(176,64,276),(276,92,444),(656,92,444),(784,64,276)]:out+=rect(x,512-h/2,w,h,12,fg)
    out+=circle(512,397,13*5,fg)
    for x in [423,601]:out+=rect(x-35,470,70,84,32,bg)+rect(x-24,479,48,66,24,fg)
    return out

marks={'d':d,'e':e,'f':lambda *args:f(*args),'f2':lambda *args:f(*args,plain=True),'g':g}
titles={'d':'The real dumbbell bench press','e':'The loaded lockout','f':'Head-on press, A and L weights','f2':'Head-on press, plain dumbbells','g':'The lifter behind the loaded bar'}
for key,make in marks.items():
    for ground,bg,fg,far in [('yellow',YELLOW,INK,'#8a6d00'),('ink',INK,YELLOW,'#a88400')]:
        name=f'concept-{key}-{ground}'
        content=make(fg,far,bg)
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-labelledby="title">\n<title id="title">{titles[key]} / {ground} ground</title>\n<rect width="1024" height="1024" fill="{bg}"/>\n{content}\n</svg>\n'
        (ROOT/f'{name}.svg').write_text(svg)
        for size in [1024,180,60]:
            subprocess.run(['/opt/homebrew/bin/rsvg-convert','-w',str(size),'-h',str(size),'-o',str(ROOT/f'png/{name}-{size}.png'),str(ROOT/f'{name}.svg')],check=True)
print('Built ten SVG icons and thirty rsvg-convert PNGs.')
