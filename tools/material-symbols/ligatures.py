import sys
from fontTools.ttLib import TTFont
def ligatures(path):
    f = TTFont(path)
    cmap = f.getBestCmap()
    rev = {g: chr(c) for c, g in cmap.items()}
    out = {}
    for lookup in f['GSUB'].table.LookupList.Lookup:
        for st in lookup.SubTable:
            if st.LookupType == 7: st = st.ExtSubTable
            if getattr(st, 'LookupType', None) != 4: continue
            for first, ligs in st.ligatures.items():
                for lig in ligs:
                    comps = [first] + list(lig.Component)
                    name = ''.join(rev.get(g, '?') for g in comps)
                    out[name] = lig.LigGlyph
    return f, out
if __name__ == '__main__':
    f, out = ligatures(sys.argv[1])
    print(len(out), 'ligatures;', 'axes:', [a.axisTag for a in f['fvar'].axes] if 'fvar' in f else None)
    if len(out) < 400: print(','.join(sorted(out)))
