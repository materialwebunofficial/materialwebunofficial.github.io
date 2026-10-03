"""Vendor the pinned official MCU browser module; run from any directory."""
import base64
import hashlib
import io
import pathlib
import subprocess
import tarfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
VERSION = '0.4.0'
INTEGRITY = 'dlq6VExJReb8dhjj3a/yTigr3ncNwoFmL5Iy2ENtbDX03EmNeOEdZ+vsaGrj7RTuO+mB7L58II4LCsl4NpM8uw=='
URL = f'https://registry.npmjs.org/@material/material-color-utilities/-/material-color-utilities-{VERSION}.tgz'
data = urllib.request.urlopen(URL).read()
assert base64.b64encode(hashlib.sha512(data).digest()).decode() == INTEGRITY
cache = ROOT / 'research' / f'material-color-utilities-{VERSION}'
with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
    for member in archive.getmembers():
        target = (cache / member.name).resolve()
        if not target.is_relative_to(cache.resolve()):
            raise ValueError(member.name)
        if member.isfile():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.extractfile(member).read())
subprocess.run(['node', str(ROOT / 'tools/material-color-utilities/bundle.mjs')], cwd=ROOT, check=True)
