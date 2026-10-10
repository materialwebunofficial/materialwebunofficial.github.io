# Builds the icon font every component uses: Material Symbols Rounded, limited to
# the symbols in icons.txt, with FILL (selected icons) and wght kept variable.
# Usage: python -I tools/material-symbols/subset.py [full.woff2] [out.woff2] [names...]
import sys, pathlib, string
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from fontTools import subset
from fontTools.varLib import instancer
from ligatures import ligatures
root = pathlib.Path(__file__).resolve().parents[2]
src = sys.argv[1] if len(sys.argv) > 1 else str(root / "src/icons/fonts/material-symbols-rounded.full.woff2")
out = sys.argv[2] if len(sys.argv) > 2 else str(root / "src/icons/fonts/material-symbols-rounded.woff2")
names = set()
for f in sys.argv[3:] or [pathlib.Path(__file__).parent / "icons.txt"]:
    names |= {n.strip() for n in pathlib.Path(f).read_text().replace('\n', ',').split(',') if n.strip()}
font, ligs = ligatures(src)
missing = sorted(n for n in names if n not in ligs)
names = sorted(n for n in names if n in ligs)
print('icons', len(names), 'missing', missing)
cmap = font.getBestCmap()
chars = string.ascii_lowercase + string.digits + '_ '
glyphs = {'.notdef'} | {ligs[n] for n in names} | {cmap[ord(c)] for c in chars if ord(c) in cmap}
# Keep each icon's own codepoint too, so it can be used without ligatures.
rev = {}
for cp, g in cmap.items(): rev.setdefault(g, []).append(cp)
unicodes = [ord(c) for c in chars] + [cp for n in names for cp in rev.get(ligs[n], [])]
opts = subset.Options()
opts.layout_closure = False
opts.layout_features = ['liga', 'rlig', 'ccmp', 'calt']
opts.notdef_outline = True
opts.name_IDs = ['*']
opts.drop_tables += ['DSIG']
sub = subset.Subsetter(opts)
sub.populate(glyphs=sorted(glyphs), unicodes=unicodes)
sub.subset(font)
# Compose icons are 24dp designs with no grade: pin opsz 24 and GRAD 0, keep FILL and wght.
font = instancer.instantiateVariableFont(font, {'GRAD': 0, 'opsz': 24})
font.flavor = 'woff2'
font.save(out)
_, kept = ligatures(out)
print('saved', out, pathlib.Path(out).stat().st_size, 'bytes;', len(kept), 'ligatures; axes', [a.axisTag for a in font['fvar'].axes])
lost = [n for n in names if n not in kept]
print('lost', lost)
