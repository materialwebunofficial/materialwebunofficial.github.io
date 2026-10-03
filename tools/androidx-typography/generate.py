"""Generate the type-role catalog/CSS and vendor the pinned Roboto font.
Requires Python fontTools with WOFF2 (brotli) support for font regeneration.
"""
import hashlib
import io
import json
import pathlib
import re
import urllib.parse
import urllib.request
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
ANDROIDX = 'a095da93f8e98dea8748ceed79ea8427aade245f'
FONTS = '1c627bfa375fc51cf86fabeca4f6e08a95f0aa5c'
manifest = {}
def fetch(url, destination):
    data = urllib.request.urlopen(url).read()
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

css = '''/* Generated from AndroidX TypeScaleTokens.kt / TypefaceTokens.kt.
   Copyright 2021 The Android Open Source Project. Apache-2.0.
   Regenerate: python tools/androidx-typography/generate.py */
@font-face {
  font-family: 'Roboto';
  src: url('../fonts/roboto-variable.woff2') format('woff2');
  font-style: normal;
  font-weight: 100 900;
  font-stretch: 75% 100%;
  font-display: swap;
}
:root {
  --md-sys-typescale-font-family: 'Roboto', sans-serif;
  --md-sys-typescale-font-family-brand: var(--md-sys-typescale-font-family);
  --md-sys-typescale-font-family-plain: var(--md-sys-typescale-font-family);
'''
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
fetch(fontbase + 'OFL.txt', fontdir / 'Roboto-OFL.txt')
(ROOT / 'tools/androidx-typography/sources.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
