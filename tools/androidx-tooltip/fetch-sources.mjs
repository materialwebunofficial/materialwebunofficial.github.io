import fs from 'node:fs';
import crypto from 'node:crypto';
const revision = 'a095da93f8e98dea8748ceed79ea8427aade245f';
const directory = new URL('../../test/fixtures/androidx/tooltip/', import.meta.url);
const prefix = 'compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/';
const locations = {
  'Tooltip.kt': prefix + 'Tooltip.kt',
  'BasicTooltip.kt': prefix + 'internal/BasicTooltip.kt',
  'MutatorMutex.kt': 'compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/MutatorMutex.kt',
  'Transition.kt': 'compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/Transition.kt',
  'AndroidPopup.android.kt': 'compose/ui/ui/src/androidMain/kotlin/androidx/compose/ui/window/AndroidPopup.android.kt',
  'AccessibilityServiceStateProvider.android.kt': 'compose/material3/material3/src/androidMain/kotlin/androidx/compose/material3/internal/AccessibilityServiceStateProvider.android.kt',
  'Surface.kt': prefix + 'Surface.kt',
  'Box.kt': 'compose/foundation/foundation-layout/src/commonMain/kotlin/androidx/compose/foundation/layout/Box.kt',
  'PlainTooltipTokens.kt': prefix + 'tokens/PlainTooltipTokens.kt',
  'RichTooltipTokens.kt': prefix + 'tokens/RichTooltipTokens.kt',
  'strings.xml': 'compose/material3/material3/src/androidMain/res/values/strings.xml',
  'strings-tr.xml': 'compose/material3/material3/src/androidMain/res/values-tr/strings.xml',
};
fs.mkdirSync(directory, {recursive: true});
const sources = await Promise.all(Object.entries(locations).map(async ([file, location]) => {
  const url = `https://raw.githubusercontent.com/androidx/androidx/${revision}/${location}`;
  const response = await fetch(url); if (!response.ok) throw new Error(`${file}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer()); fs.writeFileSync(new URL(file, directory), bytes);
  return {file, url, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
}));
fs.writeFileSync(new URL('sources.json', directory), JSON.stringify({revision, sources}, null, 2) + '\n');
console.log(`Cached ${sources.length} unchanged native tooltip references.`);
