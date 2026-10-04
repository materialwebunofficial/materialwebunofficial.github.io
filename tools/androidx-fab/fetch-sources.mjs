// Cache licensed originals at the same revision as the existing FAB source.
import fs from 'node:fs';
import crypto from 'node:crypto';
const revision = 'a095da93f8e98dea8748ceed79ea8427aade245f';
const directory = new URL('../../test/fixtures/androidx/fab/', import.meta.url);
fs.mkdirSync(directory, {recursive: true});
const names = ['FabBaselineTokens', 'FabSmallTokens', 'FabMediumTokens', 'FabLargeTokens', 'ExtendedFabSmallTokens', 'ExtendedFabMediumTokens', 'ExtendedFabLargeTokens', 'ExtendedFabPrimaryTokens'];
const entries = await Promise.all([...names, 'FloatingActionButtonSamples', 'ExpressiveMotionTokens', 'StandardMotionTokens'].map(async name => {
  const file = name + '.kt';
  const location = name === 'FloatingActionButtonSamples' ? 'samples/src/main/java/androidx/compose/material3/samples' : 'src/commonMain/kotlin/androidx/compose/material3/tokens';
  const url = `https://raw.githubusercontent.com/androidx/androidx/${revision}/compose/material3/material3/${location}/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw Error(`${file}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(new URL(file, directory), bytes);
  return {file, url, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(new URL('sources.json', directory), JSON.stringify({revision, sources: entries}, null, 2) + '\n');
console.log(`Cached ${entries.length} unchanged native FAB token sources.`);
