"""Generate the type-role catalog/CSS and vendor the pinned Roboto font.
Requires Python fontTools with WOFF2 (brotli) support for font regeneration.
--offline reuses the pinned sources already downloaded into the repository.
"""
import hashlib
import io
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parents[2]
ANDROIDX = 'a095da93f8e98dea8748ceed79ea8427aade245f'
FONTS = '1c627bfa375fc51cf86fabeca4f6e08a95f0aa5c'
manifest = {}
OFFLINE = '--offline' in sys.argv
def fetch(url, destination):
    data = destination.read_bytes() if OFFLINE and destination.exists() else urllib.request.urlopen(url).read()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    manifest[destination.relative_to(ROOT).as_posix()] = {'url': url, 'sha256': hashlib.sha256(data).hexdigest()}
    return data

fixture = ROOT / 'test/fixtures/androidx'
base = f'https://raw.githubusercontent.com/androidx/androidx/{ANDROIDX}/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/'
source = fetch(base + 'TypeScaleTokens.kt', fixture / 'TypeScaleTokens.kt').decode()
fetch(base + 'TypefaceTokens.kt', fixture / 'TypefaceTokens.kt')
weights = {'Regular': 400, 'Medium': 500, 'Bold': 700}
roles = {}
for name, expr in re.findall(r'inline val (\w+):[^\n]+\n\s*get\(\) = ([^\n]+)', source):
    match = re.fullmatch(r'(.+?)(LineHeight|Tracking|Size|Weight|Font)', name)
    if not match:
        continue
    role, field = match.groups()
    role = re.sub(r'(?<!^)([A-Z])', r'-\1', role).lower()
    field = {'LineHeight': 'lineHeight', 'Tracking': 'tracking', 'Size': 'size', 'Weight': 'weight', 'Font': 'family'}[field]
    value = expr.removeprefix('TypefaceTokens.').lower() if field == 'family' else weights[expr.removeprefix('TypefaceTokens.Weight')] if field == 'weight' else float(expr.removesuffix('.sp'))
    roles.setdefault(role, {})[field] = value
assert len(roles) == 30 and all(len(value) == 5 for value in roles.values())
catalog = '// Generated from AndroidX TypeScaleTokens.kt; Apache-2.0. See tools/androidx-typography.\n'
catalog += 'export const TYPE_SCALE = ' + json.dumps(roles, indent=2) + ';\n'
(ROOT / 'src/tokens/typography.js').write_text(catalog, encoding='utf-8')

# Roboto is split by script as web font services do: basic Latin with common
# punctuation, Latin Extended with symbols, and Greek/Cyrillic. Each @font-face
# declares the ranges its file covers, so a page downloads only what it uses.
LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
LATIN_EXT = 'U+0100-0130, U+0132-0151, U+0154-02BA, U+02BD-02C5, U+02C7-02D9, U+02DB, U+02DD-0303, U+0305-0307, U+0309-0328, U+032A-036F, U+1D00-1EFF, U+2070-20AB, U+20AD-2121, U+2123-2190, U+2192, U+2194-2211, U+2213-2214, U+2216-2BFF, U+2C60-2C7F, U+A720-A7FF, U+FB00-FB06'
GREEK_CYRILLIC = 'U+0370-052F, U+1C80-1C8F, U+1F00-1FFF, U+2DE0-2DFF, U+A640-A69F'
css = '''/* Generated from AndroidX TypeScaleTokens.kt / TypefaceTokens.kt.
   Copyright 2021 The Android Open Source Project. Apache-2.0.
   Regenerate: python tools/androidx-typography/generate.py */
@font-face {
  font-family: 'Roboto';
  src: url('../fonts/roboto-latin.woff2') format('woff2');
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  unicode-range: {LATIN};
}
@font-face {
  font-family: 'Roboto';
  src: url('../fonts/roboto-latin-ext.woff2') format('woff2');
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  unicode-range: {LATIN_EXT};
}
@font-face {
  font-family: 'Roboto';
  src: url('../fonts/roboto-greek-cyrillic.woff2') format('woff2');
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  unicode-range: {GREEK_CYRILLIC};
}
:root {
  --md-sys-typescale-font-family: 'Roboto', sans-serif;
  --md-sys-typescale-font-family-brand: var(--md-sys-typescale-font-family);
  --md-sys-typescale-font-family-plain: var(--md-sys-typescale-font-family);
'''
css = css.replace('{LATIN_EXT}', LATIN_EXT).replace('{LATIN}', LATIN).replace('{GREEK_CYRILLIC}', GREEK_CYRILLIC)
for role, values in roles.items():
    prefix = '--md-sys-typescale-' + role
    css += f'  {prefix}-font: var(--md-sys-typescale-font-family-{values["family"]});\n'
    for field, suffix in [('size','size'),('weight','weight'),('lineHeight','line-height'),('tracking','tracking')]:
        css += f'  {prefix}-{suffix}: {values[field]:g}{"" if field == "weight" else "px"};\n'
    css += f'  {prefix}: var({prefix}-weight) var({prefix}-size)/var({prefix}-line-height) var({prefix}-font);\n'
css += '}\n'
for role in roles:
    prefix = '--md-sys-typescale-' + role
    css += f'.md-typescale-{role}, .md-{role} {{\n'
    for prop, suffix in [('font-family','font'),('font-size','size'),('font-weight','weight'),('line-height','line-height'),('letter-spacing','tracking')]:
        css += f'  {prop}: var({prefix}-{suffix});\n'
    css += '}\n'
(ROOT / 'src/tokens/typography.css').write_text(css, encoding='utf-8')

fontbase = f'https://raw.githubusercontent.com/google/fonts/{FONTS}/ofl/roboto/'
ttf = fetch(fontbase + urllib.parse.quote('Roboto[wdth,wght].ttf'), ROOT / 'research/typography/Roboto.ttf')
font = TTFont(io.BytesIO(ttf), recalcTimestamp=False)
font.flavor = 'woff2'
fontdir = ROOT / 'src/fonts'
fontdir.mkdir(parents=True, exist_ok=True)
font.save(fontdir / 'roboto-variable.woff2')
# Material type roles vary weight only: the width axis is pinned to its 100%
# default. Each part keeps the weight axis and all layout features.
for name, ranges in [('latin', LATIN), ('latin-ext', LATIN_EXT), ('greek-cyrillic', GREEK_CYRILLIC)]:
    part = TTFont(io.BytesIO(ttf), recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(ranges.replace(' ', '')))
    subsetter.subset(part)
    part = instancer.instantiateVariableFont(part, {'wdth': 100})
    part.flavor = 'woff2'
    part.save(fontdir / f'roboto-{name}.woff2')
fetch(fontbase + 'OFL.txt', fontdir / 'Roboto-OFL.txt')
(ROOT / 'tools/androidx-typography/sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
