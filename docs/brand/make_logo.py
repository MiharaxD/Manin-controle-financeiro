"""Gera o logotipo do Manin em SVG a partir das fontes de public/fonts.

Requer: pip install fonttools brotli. Uso: python docs/brand/make_logo.py
"""
import math, os, shutil, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
FONTS = os.path.join(ROOT, "public", "fonts")
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE
os.makedirs(OUT, exist_ok=True)

RED, INK, WHITE = "#e60012", "#0d0d0d", "#ffffff"

fonts = {
    "anton": TTFont(os.path.join(FONTS, "Anton-Regular.ttf")),
    "abril": TTFont(os.path.join(FONTS, "AbrilFatface-Regular.woff2")),
    "archivo": instantiateVariableFont(
        TTFont(os.path.join(FONTS, "Archivo-Variable.woff2")), {"wght": 900, "wdth": 125}
    ),
}


def glyph(font_key, char, height):
    """Path for `char` scaled so its ink height == height, ink box at (0,0)-(w,height)."""
    f = fonts[font_key]
    gs = f.getGlyphSet()
    name = f.getBestCmap()[ord(char)]
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    s = height / (y1 - y0)
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    # flip y, move ink box to origin
    gs[name].draw(TransformPen(pen, (s, 0, 0, -s, -x0 * s, y1 * s)))
    return pen.getCommands(), (x1 - x0) * s


def quad(w, h, j):
    """Scissor-cut tile: rectangle with each corner nudged by j (fractions of h)."""
    (a, b), (c, d), (e, f), (g, k) = j
    pts = [(a * h, b * h), (w + c * h, d * h), (w + e * h, h + f * h), (g * h, h + k * h)]
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


# letter spec: char, font, ink height, tile, letter colour, rotation, y(bottom), corner jitter
WORD = [
    ("M", "abril", 150, INK, WHITE, -6, 0, ((-0.02, -0.03), (0.03, 0.0), (0.0, 0.03), (-0.03, 0.01))),
    ("A", "anton", 112, RED, WHITE, 4, 8, ((0.0, 0.02), (0.02, -0.03), (0.03, 0.0), (-0.02, 0.02))),
    ("N", "anton", 98, WHITE, INK, -4, -8, ((-0.03, 0.0), (0.01, 0.03), (0.02, 0.01), (0.0, -0.02))),
    ("I", "abril", 86, INK, WHITE, 7, 10, ((0.0, -0.02), (0.04, 0.02), (0.0, 0.0), (-0.03, 0.03))),
    ("N", "archivo", 104, WHITE, RED, -3, -2, ((-0.02, 0.03), (0.02, 0.0), (0.0, 0.03), (0.02, -0.01))),
]
GAP = -4  # tiles just kiss, like pasted cut-outs


def rot(pt, deg, c=(0, 0)):
    a = math.radians(deg)
    x, y = pt[0] - c[0], pt[1] - c[1]
    return (c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a))


HAT_CROWN = [(0.2, 0.8), (0.23, 0.06), (0.79, 0.0), (0.82, 0.78)]
HAT_BAND = [(0.205, 0.62), (0.815, 0.58), (0.82, 0.76), (0.2, 0.79)]


def hat(x, y, w, h, deg, body=INK, band=RED, halo=WHITE, edge=4, halo_w=10):
    """Gentleman thief's top hat; x,y = middle of the brim's underside."""
    ox, oy = x - w / 2, y - h

    def poly(pts):
        return " ".join(f"{ox + px * w:.1f},{oy + py * h:.1f}" for px, py in pts)

    brim = _brim(ox, oy, w, h)
    shapes = (f'<polygon points="{poly(HAT_CROWN)}"/>', f'<path d="{brim}"/>')
    out = f'<g transform="rotate({deg} {x:.1f} {y:.1f})">'
    if halo:
        out += f'<g fill="{halo}" stroke="{halo}" stroke-width="{halo_w}" stroke-linejoin="round">{"".join(shapes)}</g>'
    out += f'<g fill="{body}">{"".join(shapes)}</g>'
    out += f'<polygon points="{poly(HAT_BAND)}" fill="{band}"/>'
    return out + "</g>"


def _brim(ox, oy, w, h):
    X = lambda v: f"{ox + v * w:.1f}"
    Y = lambda v: f"{oy + v * h:.1f}"
    return (f"M{X(0)},{Y(0.8)} Q{X(0.5)},{Y(0.68)} {X(1)},{Y(0.77)} "
            f"L{X(0.97)},{Y(0.95)} Q{X(0.5)},{Y(0.86)} {X(0.03)},{Y(0.98)} Z")


def tile(char, font, h, bg, fg, r, x, y, jit, edge=6, hatted=False):
    path, w = glyph(font, char, h)
    px, pt, pb = h * 0.16, h * 0.14, h * 0.1
    tw, th = w + 2 * px, h + pt + pb
    poly = quad(tw, th, jit)
    # outline in the opposite neutral so every tile survives red, black or white grounds
    stroke = WHITE if bg == INK else INK
    cx, cy = tw / 2, th / 2
    corners = [rot((px_ + x, py_ + y - th), r, (cx + x, cy + y - th))
               for px_, py_ in ((0, 0), (tw + edge, 0), (tw + edge, th + edge), (0, th + edge))
               + (((tw * 0.15, -h * 0.75), (tw * 0.95, -h * 0.65)) if hatted else ())]
    return (
        f'<g transform="translate({x:.1f} {y - th:.1f}) rotate({r} {cx:.1f} {cy:.1f})">'
        f'<polygon points="{poly}" transform="translate({edge} {edge})" fill="{INK}"/>'
        f'<polygon points="{poly}" fill="{bg}" stroke="{stroke}" stroke-width="4" stroke-linejoin="miter"/>'
        f'<path d="{path}" transform="translate({px:.1f} {pt:.1f})" fill="{fg}"/>'
        + (hat(cx + tw * 0.04, pt * 0.9, tw * 0.62, h * 0.62, 12) if hatted else "")
        + "</g>"
    ), tw, th, corners


def trend(points, width=20, head=46):
    """Rising chart line: ink stroke with a white cut edge, arrowhead on the last point."""
    (ax, ay), (bx, by) = points[-2], points[-1]
    a = math.atan2(by - ay, bx - ax)
    base = (bx - math.cos(a) * head * 0.7, by - math.sin(a) * head * 0.7)
    tip = (bx + math.cos(a) * head * 0.5, by + math.sin(a) * head * 0.5)
    l = (base[0] - math.sin(a) * head * 0.62, base[1] + math.cos(a) * head * 0.62)
    r = (base[0] + math.sin(a) * head * 0.62, base[1] - math.cos(a) * head * 0.62)
    line = " ".join(f"{x:.1f},{y:.1f}" for x, y in points[:-1] + [base])
    tri = " ".join(f"{x:.1f},{y:.1f}" for x, y in (l, tip, r))
    common = 'fill="none" stroke-linejoin="miter" stroke-miterlimit="8"'
    return (
        f'<polyline points="{line}" {common} stroke="{WHITE}" stroke-width="{width + 9}"/>'
        f'<polygon points="{tri}" fill="{WHITE}" stroke="{WHITE}" stroke-width="9" stroke-linejoin="miter"/>'
        f'<polyline points="{line}" {common} stroke="{INK}" stroke-width="{width}"/>'
        f'<polygon points="{tri}" fill="{INK}"/>'
    ), [l, tip, r] + points


def wordmark(tilt):
    parts, pts, x = [], [], 0
    for i, (ch, font, h, bg, fg, r, y, jit) in enumerate(WORD):
        g, tw, th, corners = tile(ch, font, h, bg, fg, r, x, y, jit, hatted=i == 0)
        parts.append(g)
        pts += [rot(p, tilt) for p in corners]
        x += tw + GAP
    X = x
    arrow, apts = trend([(-28, 30), (X * 0.18, 68), (X * 0.34, 24), (X * 0.52, 62), (X * 0.84, -40), (X + 36, -150)])
    parts.insert(0, arrow)
    pts += [rot(p, tilt) for p in apts]
    x0 = min(p[0] for p in pts) - 20; y0 = min(p[1] for p in pts) - 20
    x1 = max(p[0] for p in pts) + 20; y1 = max(p[1] for p in pts) + 20
    return f'<g transform="rotate({tilt})">{"".join(parts)}</g>', (x0, y0, x1, y1)


def svg(vb, body, title="Manin"):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="{title}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


def write(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(content)


def text_path(font, text, h, track=0.08):
    out, x = [], 0
    for ch in text:
        if ch == " ":
            x += h * 0.45
            continue
        p, w = glyph(font, ch, h)
        out.append(f'<path d="{p}" transform="translate({x:.1f} 0)"/>')
        x += w + h * track
    return "".join(out), x - h * track


# 1. Wordmark, tilted as a whole like the sidebar logo
mark, (x0, y0, x1, y1) = wordmark(-4)
W, H = x1 - x0, y1 - y0
write("manin-logo.svg", svg(f"{x0:.0f} {y0:.0f} {W:.0f} {H:.0f}", mark))

# 2. Wordmark + tagline tarja hanging under the right half
tag, tw = text_path("anton", "CONTROLE FINANCEIRO", 26, 0.14)
tarja_w = tw + 44
tx, ty = x0 + 40, y1 + 6
tagline = (
    f'<g transform="translate({tx:.1f} {ty:.1f}) rotate(-4)">'
    f'<polygon points="0,4 {tarja_w:.0f},0 {tarja_w - 10:.0f},46 8,48" fill="{INK}" stroke="{WHITE}" stroke-width="4"/>'
    f'<g transform="translate(22 11)" fill="{WHITE}">{tag}</g></g>'
)
write("manin-logo-assinatura.svg", svg(f"{x0:.0f} {y0:.0f} {W:.0f} {H + 76:.0f}", mark + tagline, "Manin, controle financeiro"))

# 3. Symbol: the first cut-out letter pasted over a red slab turned the other way
m_tile, mw, mh, _ = tile("M", "abril", 80, INK, WHITE, 0, 0, 0, WORD[0][7], hatted=True)
def slab(cx, cy, w, h, deg, dx=0, dy=0):
    pts = [rot((cx + x + dx, cy + y + dy), deg, (cx + dx, cy + dy)) for x, y in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
sym_arrow, _ = trend([(20, 214), (70, 190), (100, 206), (226, 40)], width=16, head=40)
symbol = (
    f'<polygon points="{slab(132, 122, 176, 176, 10, 7, 7)}" fill="{INK}"/>'
    f'<polygon points="{slab(132, 122, 176, 176, 10)}" fill="{RED}" stroke="{INK}" stroke-width="5"/>'
    + sym_arrow +
    f'<g transform="translate({124 - mw / 2:.1f} {150 + mh / 2:.1f}) rotate(-7 {mw / 2:.1f} {-mh / 2:.1f})">{m_tile}</g>'
)
# viewBox hugs the art so the symbol fills small slots (mobile top bar, favicon)
write("manin-simbolo.svg", svg("13 15 232 217", symbol))

# 4. App icon: full-bleed black, art inside the maskable safe zone (80%)
icon = (
    f'<rect width="512" height="512" fill="{INK}"/>'
    f'<g transform="translate(38 38) scale(1.7)">{symbol}</g>'
)
write("manin-icone.svg", svg("0 0 512 512", icon))

# 5. Copies the app serves: logo + symbol, and the symbol as favicon
PUBLIC = os.path.join(ROOT, "public")
os.makedirs(os.path.join(PUBLIC, "brand"), exist_ok=True)
for name in ("manin-logo.svg", "manin-simbolo.svg"):
    shutil.copyfile(os.path.join(OUT, name), os.path.join(PUBLIC, "brand", name))
shutil.copyfile(os.path.join(OUT, "manin-simbolo.svg"), os.path.join(PUBLIC, "favicon.svg"))
print("ok", sorted(f for f in os.listdir(OUT) if f.endswith(".svg")))
